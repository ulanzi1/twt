// My Pool home-card read handlers — Story 8.2 (Task 2; AC1/AC2/AC4/AC6).
//
// ONE route: GET /api/v1/member/active-contribution — the read seam that drives the topmost
// home-screen <ActiveContributionCard>. The FIRST Epic-8 SURFACE and the first live consumer of
// Story 8.1's `alerts.current_state='live'` projection. A thin server-authoritative compound read
// over data that ALREADY EXISTS (member state × live alert × assigned-pool snapshot × claim
// deceased-member name × schedule) — NO write path, NO new event, NO schema change.
//
// ── Module naming (D1) ──────────────────────────────────────────────────────────────────────────────
// A SIBLING `member-pool/` module (not folded into `member-home/`): `member-home` was explicitly
// built to "avoid premature coupling with the Epic-8 My Pool surface that eventually replaces this
// widget" — a sibling is the ratified intent. Mirrors member-home's thin no-`repo.ts` shape.
//
// ── Presentation, not lifecycle (D2) — the card resolves nothing client-side ──────────────────────────
// Eligibility (active + live + assigned), days-remaining, letter-code-vs-name, confirmed count,
// upcoming amount — ALL computed HERE and returned as a flat card model. The client just renders +
// self-suppresses on `{ assigned:false }`. It reads `alerts.current_state`; it never transitions it.
//
// ── Fail-soft (AC1) — every degrade is `{ assigned:false }`, never a 500 ──────────────────────────────
// Not `active`, no live alert, unassigned, an unresolvable/absent deceased name, or ANY thrown error
// in the pipeline → `{ assigned:false }` (the widget renders null, home content below untouched). The
// only propagating error is the 401 (no member session) — resolved BEFORE the tx opens.
//
// ── Days-remaining is a 15-day SEAM Story 8.9 refines (D5) ────────────────────────────────────────────
// There is NO canonical cycle deadline in the substrate (`cycle.frozen` carries only `committed_at`).
// 8.2 computes a BOUNDED placeholder window: `committed_at + CYCLE_WINDOW_DAYS` (leap-safe `setDate`,
// the member-home clock precedent), clamped ≥0. Story 8.9 (calendar-aware close-of-cycle, Bihar
// holiday windows) REPLACES this with the authoritative close date. NO holiday/close-of-cycle policy here.
//
// ── Deceased-member name (D11) — member-session decrypt, NOT the admin path ───────────────────────────
// The name lives ONLY as `member_kyc_profiles.nameCiphertext` (Tier-1). It is decrypted HERE at the
// member-session-gated read layer (NOT behind the admin `member.view_validity` path), split to
// `firstName + lastInitial` (PII shield), and only those two parts cross the wire — never full names,
// never ciphertext. DPDPA consent-gating does NOT apply (working assumption, Dev Agent Record): 6.9's
// consent primitive gates claim-processing/disbursement on the deceased's data, not a contributor's
// own home read of the family they are already assigned to support.

import {
  alert as alertDomain,
  contribution as contributionDomain,
  ids,
  kyc as kycDomain,
  member as memberDomain,
  pool as poolDomain,
  type Db,
} from '@twt/domain';
import type {
  ActiveContributionCardResponse,
  ConfirmedContributorRow,
  ContributionHistoryResponse,
  ContributionHistoryRow,
  ContributionNoteFacts,
  PoolContributorListResponse,
} from '@twt/contracts';
// Story 8.8 (Task 6; D5) — the cycle-window arithmetic now lives beside the tone gradient in
// @twt/contracts so the card and the deadline-reminder sweep cannot drift. Re-exported below.
import { computeDaysRemaining as contributionLoopComputeDaysRemaining } from '@twt/contracts';
import { t } from '@twt/i18n';
import type { FastifyReply, FastifyRequest } from 'fastify';

import type { AppDeps } from '../../context.js';
import { NotFoundError, UnauthorizedError } from '../../http-errors.js';
import { decryptKycField } from '../kyc/kyc-crypto.js';
import { closeScopeTx, openScopeTx } from '../multi-tenant/scope-tx.js';
import { contributionNoteFilename, resolveContributionNoteFacts } from './contribution-note.js';
import { splitFirstNameLastInitial } from './name.js';
import { NOTE_I18N_NAMESPACE, renderContributionNoteHtml } from './note-template.js';
import {
  cycleRefFromCommittedAt,
  resolveCuratedPoolName,
  resolvePoolIdentity,
  type ResolvedPoolIdentity,
} from './pool-identity.js';

const UNASSIGNED: ActiveContributionCardResponse = { assigned: false };

/**
 * Days-remaining in the bounded contribution window (D5 SEAM) — PURE + unit-testable. `committedAt +
 * CYCLE_WINDOW_DAYS` using LEAP-SAFE `setDate` arithmetic (handles month/year rollover — the
 * member-home clock precedent; a fixed-ms add does NOT), then `ceil((windowEnd − now)/day)`, clamped
 * ≥0. Story 8.9 (calendar-aware close-of-cycle) replaces this fixed window with the authoritative close.
 *
 * ── RELOCATED to @twt/contracts by Story 8.8 (Task 6; D5) — this is now a re-export ────────────────
 * The deadline-reminder sweep must compute the member's position in the cycle from the SAME arithmetic
 * this card uses, or the push a member gets on day D could disagree with the card they open on day D
 * (the coherence invariant). `apps/jobs` cannot import `apps/api`, so `CYCLE_WINDOW_DAYS` +
 * `computeDaysRemaining` moved to `packages/contracts/src/alerts/contribution-loop-templates.ts`
 * alongside `selectToneGradientKey`. Behaviour is identical and this name is unchanged, so the existing
 * handler tests still bind to it. Story 8.9 replaces the window for BOTH consumers at once.
 */
export const computeDaysRemaining = contributionLoopComputeDaysRemaining;

export function createMemberPoolHandlers(deps: AppDeps) {
  /** Read the authenticated member's (memberId, pariwarId) or fail 401. */
  function memberCtx(request: FastifyRequest): { memberIdStr: string; pariwarIdStr: string } {
    const memberIdStr = request.requestContext.actorId;
    const pariwarIdStr = request.requestContext.pariwarId;
    if (!memberIdStr || !pariwarIdStr) {
      throw new UnauthorizedError('Authentication required', 'auth.session_required');
    }
    return { memberIdStr, pariwarIdStr };
  }

  return {
    /**
     * GET /api/v1/member/active-contribution — the My Pool card's server-authoritative read. Returns
     * the fully-resolved assigned card ONLY for an `active` member assigned to a pool whose cycle
     * alert is `live`; `{ assigned:false }` (self-suppression) for every other case, incl. any error.
     */
    async activeContribution(request: FastifyRequest): Promise<ActiveContributionCardResponse> {
      const { memberIdStr, pariwarIdStr } = memberCtx(request);
      const memberId = ids.memberId(memberIdStr);
      const pariwarId = ids.pariwarId(pariwarIdStr);
      const now = deps.clock();

      const scopeTx = await openScopeTx(deps, pariwarIdStr);
      let ok = false;
      try {
        const result = await resolveCard(deps, scopeTx.tx, request, {
          memberId,
          pariwarId,
          now,
        });
        ok = true;
        return result;
      } catch (err) {
        // Fail-soft (AC1): the widget self-suppresses on ANY error rather than showing an error wall.
        // Log it (an integrity error / decrypt failure is worth investigating) but return absence.
        request.log.error({ err, memberId: memberIdStr }, 'active-contribution: fail-soft to unassigned');
        ok = true; // the scope tx did no writes — a clean close is correct
        return UNASSIGNED;
      } finally {
        await closeScopeTx(scopeTx, ok);
      }
    },

    /**
     * GET /api/v1/member/pool-contributors — the Live Contributor List's server-authoritative read (Story
     * 8.3). Returns the pool identity + the RECONCILIATION-CONFIRMED contributor rows (first-name +
     * last-initial, PII-shielded; legitimately EMPTY until Epic 9's `contribution.confirmed` producer
     * lands) + the AGGREGATE pending signal (count + percentage, NO member identity — D3) ONLY for an
     * `active` member assigned to a pool whose cycle alert is `live`; `{ assigned:false }` (self-suppress)
     * for every other case, incl. any error (fail-soft — never a 500, the 8.2 posture).
     */
    async poolContributors(request: FastifyRequest): Promise<PoolContributorListResponse> {
      const { memberIdStr, pariwarIdStr } = memberCtx(request);
      const memberId = ids.memberId(memberIdStr);
      const pariwarId = ids.pariwarId(pariwarIdStr);
      const now = deps.clock();

      const scopeTx = await openScopeTx(deps, pariwarIdStr);
      let ok = false;
      try {
        const result = await resolveContributorList(deps, scopeTx.tx, request, {
          memberId,
          pariwarId,
          now,
        });
        ok = true;
        return result;
      } catch (err) {
        // Fail-soft (AC1): the view self-suppresses on ANY error rather than showing an error wall.
        request.log.error({ err, memberId: memberIdStr }, 'pool-contributors: fail-soft to unassigned');
        ok = true; // the scope tx did no writes — a clean close is correct
        return CONTRIBUTOR_LIST_UNASSIGNED;
      } finally {
        await closeScopeTx(scopeTx, ok);
      }
    },

    /**
     * GET /api/v1/member/contribution-history — the Yogdaan Bahi's server-authoritative read (Story 8.6).
     * A member's OWN self-view (FR-12A): the member's attested contributions, newest-first, each fully
     * resolved server-side (date, deceased-family identity, pool letter/name/canonical, cycle ref,
     * snapshotted amount, the honestly-derived four-state status, the Contribution-Note seam) + the
     * running-tally `totalInr`. Member-session-gated + PII-shielded. Fail-soft: an unresolvable row is
     * OMITTED (never a blank), and a whole-read failure degrades to `{ rows: [], totalInr: 0 }` (the empty
     * passbook — the `active-contribution` fail-soft posture; never a 500).
     */
    async contributionHistory(request: FastifyRequest): Promise<ContributionHistoryResponse> {
      const { memberIdStr, pariwarIdStr } = memberCtx(request);
      const memberId = ids.memberId(memberIdStr);
      const pariwarId = ids.pariwarId(pariwarIdStr);

      const scopeTx = await openScopeTx(deps, pariwarIdStr);
      let ok = false;
      try {
        const result = await resolveHistory(deps, scopeTx.tx, request, { memberId, pariwarId });
        ok = true;
        return result;
      } catch (err) {
        request.log.error({ err, memberId: memberIdStr }, 'contribution-history: fail-soft to empty passbook');
        ok = true; // the scope tx did no writes — a clean close is correct
        return HISTORY_EMPTY;
      } finally {
        await closeScopeTx(scopeTx, ok);
      }
    },

    /**
     * GET /api/v1/member/contribution-note/:contributionId — the Yogdaan Pratigya PDF (Story 8.7).
     * Renders the member's OWN Contribution Note for ONE contribution, server-authoritatively, and
     * returns the PDF BYTES. Generated on demand and persisted NOWHERE (D2/AC7): every input is
     * event-derived, so there is no stale artifact, no object-key lifecycle, and no divergence between
     * a stored copy and the truth.
     *
     * DELIBERATELY NOT FAIL-SOFT (unlike every sibling read in this module). An unresolvable Note is a
     * 404 (unknown contribution / not the caller's / unresolvable pool identity) and a render failure
     * propagates as a 5xx — never a blank or partially-rendered PDF. A defective artifact is worse than
     * no artifact: the member would forward it believing it says something.
     */
    async contributionNote(request: FastifyRequest, reply: FastifyReply): Promise<void> {
      const { memberIdStr, pariwarIdStr } = memberCtx(request);
      const memberId = ids.memberId(memberIdStr);
      const pariwarId = ids.pariwarId(pariwarIdStr);
      const { contributionId } = request.params as { contributionId: string };

      const scopeTx = await openScopeTx(deps, pariwarIdStr);
      let facts: ContributionNoteFacts | null;
      let ok = false;
      try {
        facts = await resolveContributionNoteFacts(deps, scopeTx.tx, request, {
          memberId,
          pariwarId,
          contributionId,
          now: deps.clock(),
        });
        ok = true;
      } finally {
        await closeScopeTx(scopeTx, ok);
      }

      // 404 covers BOTH "no such contribution" and "not yours" — indistinguishable to the caller by
      // design (D9): a distinguishable response would confirm the existence of another member's
      // contribution id. Note that STATUS is not part of this decision (D3(a)) — a yellow/red/grey Note
      // is just as generatable as a green one; what varies is what the artifact SAYS, never whether it
      // exists.
      if (facts === null) {
        throw new NotFoundError('Contribution Note not found', 'contribution_note.not_found');
      }

      // The render is OUTSIDE the scope tx: it is the expensive step and holds no DB resources.
      const html = renderContributionNoteHtml(facts);
      // The SAME `note.title` i18n key the template's own <title> tag and <h1> render (AC1) — not a
      // second, hardcoded copy of the string, which would (a) drift out of sync with the real title and
      // (b) sit outside microcopy.yaml's `code_globs` vocabulary-gate coverage of the template source.
      const bytes = await deps.contributionNotePdfRenderer.render(html, {
        title: `${t('note.title', undefined, { namespace: NOTE_I18N_NAMESPACE, locale: 'hi' })} — ${t('note.title', undefined, { namespace: NOTE_I18N_NAMESPACE, locale: 'en' })}`,
      });

      // The filename carries no prohibited transactional term (AC1 — the vocabulary register binds the
      // `Content-Disposition` too, not only the visible copy).
      await reply
        .type('application/pdf')
        .header('content-disposition', `attachment; filename="${contributionNoteFilename(facts.contributionId)}"`)
        // A Note reflects live reconciliation state and must never be served from an intermediary cache.
        .header('cache-control', 'no-store')
        .send(Buffer.from(bytes));
    },
  };
}

const CONTRIBUTOR_LIST_UNASSIGNED: PoolContributorListResponse = { assigned: false };

/**
 * The Live Contributor List pipeline (Story 8.3; AC1/AC2/AC5/AC6). Reuses steps (1)-(5) via
 * {@link resolveMemberLivePool} (shared with the 8.2 card), then:
 *   (6) `listConfirmedContributorsForPool` → the CONFIRMED member IDs (confirmed-only; empty today — D2),
 *   (7) decrypt each confirmed member's OWN KYC name (member-session layer, D4) → first+last-initial,
 *   (8) `computePendingAggregate` (roster − confirmed — the AGGREGATE signal, D3),
 *   (9) pool identity (letter code + curated name fallback, reused from the 8.2 card).
 * Throws on any malformed/absent input — the caller fail-softs to `{ assigned:false }`.
 */
async function resolveContributorList(
  deps: AppDeps,
  tx: Db,
  request: FastifyRequest,
  ctx: ResolveCtx,
): Promise<PoolContributorListResponse> {
  const { pariwarId } = ctx;

  // Steps (1)-(5): the shared assigned-live-pool resolution.
  const chosen = await resolveMemberLivePool(tx, request, ctx);
  if (chosen === null) return CONTRIBUTOR_LIST_UNASSIGNED;
  const { pool, poolCount, cycleId } = chosen;

  // (6) The CONFIRMED contributors — sources EXCLUSIVELY from `contribution.confirmed` (AC1/AC4). The
  //     confirmed-only guard is in the domain read (no status/state param). Legitimately `[]` today (D2).
  const confirmed = await contributionDomain.listConfirmedContributorsForPool(tx, {
    pariwarId,
    cycleId,
    poolId: pool.poolId,
  });

  // (7) Decrypt each confirmed member's OWN KYC name (member-session layer, D4 — NOT the admin path) →
  //     PII-shielded first+last-initial. DECRYPT-COST SEAM (D5): today 0 confirmed → 0 decrypts; once Epic 9
  //     populates this is up to the confirmed-subset size (≪ roster early in a cycle) Tier-1 KMS decrypts
  //     per read. When confirmation volume grows (the Epic-11b public Sahyog Vivran render is where it bites,
  //     not member-session-gated), introduce a BATCH-decrypt + short-TTL read-model cache — NEVER a plaintext
  //     cache at rest ([[project_validity_cache_failopen_pattern]]). Do NOT build the cache here.
  const rows: ConfirmedContributorRow[] = [];
  for (const contributor of confirmed) {
    const kycProfile = await kycDomain.getMemberKycProfile(tx, pariwarId, contributor.memberId);
    if (!kycProfile || kycProfile.nameCiphertext === null) {
      // A confirmed contributor whose name is unresolvable is SKIPPED from the visible rows (an integrity
      // anomaly worth logging), but still counts toward `confirmedCount` for the pending math below (they
      // ARE confirmed — the aggregate must never understate confirmation). Skip, don't blank the whole list.
      request.log.warn({ memberId: contributor.memberId }, 'pool-contributors: confirmed contributor name unresolvable — omitting row');
      continue;
    }
    // A decrypt failure (bad ciphertext, transient KMS error) must degrade the SAME way as an unresolvable
    // profile — skip this one row (Review fix) — not propagate out and fail-soft the WHOLE response, which
    // would hide every already-resolved row and understate the pending aggregate far worse than one omission.
    let fullName: string;
    try {
      fullName = await decryptKycField(kycProfile.nameCiphertext, pariwarId, deps.encryption);
    } catch (err) {
      request.log.warn({ err, memberId: contributor.memberId }, 'pool-contributors: confirmed contributor name decrypt failed — omitting row');
      continue;
    }
    const { firstName, lastInitial } = splitFirstNameLastInitial(fullName);
    if (firstName === '') {
      request.log.warn({ memberId: contributor.memberId }, 'pool-contributors: confirmed contributor name empty after split — omitting row');
      continue;
    }
    rows.push({ firstName, lastInitial });
  }

  // (8) AGGREGATE pending (D3) — `rosterSize − confirmedCount`, NOT attested-derived. `confirmedCount` is
  //     the CONFIRMED-SET size (the truth), independent of how many rows we could decrypt, so the aggregate
  //     never misstates confirmation. Today: 0 confirmed ⇒ pendingCount == rosterSize, pendingPercentage 100%.
  const pending = contributionDomain.computePendingAggregate({
    rosterSize: pool.rosterSize,
    confirmedCount: confirmed.length,
  });

  // (9) Pool identity — the member-facing letter code always; the curated Mahabharata name when configured
  //     (else null → letter-code fallback). Reuses the 8.2 card's `resolveCuratedPoolName`.
  const letterCode = poolDomain.poolLetterCode(pool.poolIndex);
  const name = await resolveCuratedPoolName(tx, pariwarId, poolCount, pool.poolIndex, request);

  return {
    assigned: true,
    pool: { letterCode, name, canonicalIdentifier: pool.poolCanonicalIdentifier },
    confirmed: rows,
    pending: { count: pending.pendingCount, percentage: pending.pendingPercentage },
  };
}

export interface ResolveCtx {
  readonly memberId: ReturnType<typeof ids.memberId>;
  readonly pariwarId: ReturnType<typeof ids.pariwarId>;
  readonly now: Date;
}

/** The member's assigned pool in the soonest-closing live cycle (D7) + the window anchor + N. */
export interface ChosenLivePool {
  readonly committedAt: Date;
  readonly poolCount: number;
  readonly cycleId: Awaited<ReturnType<typeof alertDomain.listLiveAlertsForPariwar>>[number]['cycleId'];
  /**
   * The alert stream id for the chosen live cycle (Story 8.4). The alert is 1:1 with the cycle
   * (`deriveAlertId(cycle_id)`), and `listLiveAlertsForPariwar` already carries it, so it is surfaced here
   * rather than re-derived — the UPI-intent path needs it to compute `deriveContributionReference({ memberId,
   * alertId })` and to append the `contribution.utr-attested` claim on the alert stream.
   */
  readonly alertId: Awaited<ReturnType<typeof alertDomain.listLiveAlertsForPariwar>>[number]['alertId'];
  readonly pool: Extract<
    Awaited<ReturnType<typeof poolDomain.resolveAssignedPoolWithRosterForMember>>,
    { assigned: true }
  >;
}

/**
 * Steps (1)-(5) shared by BOTH member-pool reads (the 8.2 card + the 8.3 contributor list): find the
 * `active` member's assigned pool in the SOONEST-CLOSING (`D7`) live cycle they are assigned in, with its
 * roster size. Returns `null` (⇒ the caller returns its own `{ assigned:false }`) when the member is not
 * `active`, no cycle is `live`, or the member is unassigned in every live cycle. Per-candidate fail-soft:
 * a bad freeze commit / one cycle's binding-integrity error is SKIPPED so it cannot hide a legitimate
 * assignment in another live cycle. Throws only on an unexpected DB error — the caller fail-softs.
 */
export async function resolveMemberLivePool(
  tx: Db,
  request: FastifyRequest,
  ctx: ResolveCtx,
): Promise<ChosenLivePool | null> {
  const { memberId, pariwarId, now } = ctx;

  // (1) The member must be `active` (Epic 3 lifecycle) — else the surface does not apply.
  const state = await memberDomain.getMemberStateAt(tx, memberId, now);
  if (state !== 'active') return null;

  // (2) The Pariwar's OPEN contribution cycles — alerts whose cached current_state is `live`.
  const liveAlerts = await alertDomain.listLiveAlertsForPariwar(tx, pariwarId);
  if (liveAlerts.length === 0) return null;

  // (3) Resolve each live cycle's committed_at (the window anchor + the D7 tie-break key), dropping
  //     any cycle whose freeze commit is unreadable (fail-soft, not a throw for the whole surface).
  const candidates: Array<{ readonly alert: (typeof liveAlerts)[number]; readonly committedAt: Date }> = [];
  for (const alert of liveAlerts) {
    const committedAt = await poolDomain.getCycleFreezeCommittedAt(tx, alert.cycleId);
    if (committedAt !== null) candidates.push({ alert, committedAt });
  }
  if (candidates.length === 0) return null;

  // (4) D7 tie-break: prefer the SOONEST-CLOSING cycle. The window length is constant, so earliest
  //     `committed_at` = earliest close; ties by cycle_id ascending. Single-pool is the default.
  candidates.sort((a, b) => {
    const byClose = a.committedAt.getTime() - b.committedAt.getTime();
    if (byClose !== 0) return byClose;
    return a.alert.cycleId < b.alert.cycleId ? -1 : a.alert.cycleId > b.alert.cycleId ? 1 : 0;
  });

  // (5) The member's assigned pool in the soonest-closing cycle they are assigned in. Iterate in
  //     tie-break order and take the FIRST assignment.
  for (const candidate of candidates) {
    let resolution: Awaited<ReturnType<typeof poolDomain.resolveAssignedPoolWithRosterForMember>>;
    try {
      resolution = await poolDomain.resolveAssignedPoolWithRosterForMember(
        tx,
        pariwarId,
        candidate.alert.cycleId,
        memberId,
      );
    } catch (err) {
      // A binding-integrity error on ONE cycle must not hide a legitimate assignment in another
      // live cycle (the same per-candidate fail-soft discipline step 3 applies to a bad freeze commit).
      request.log.warn({ err, cycleId: candidate.alert.cycleId }, 'member-pool: cycle binding unresolved — skipping candidate');
      continue;
    }
    if (resolution.assigned) {
      return {
        committedAt: candidate.committedAt,
        poolCount: candidate.alert.poolCount,
        cycleId: candidate.alert.cycleId,
        alertId: candidate.alert.alertId,
        pool: resolution,
      };
    }
  }
  return null;
}

/** The pipeline body (AC1-AC6). Throws on any malformed/absent input — the caller fail-softs to absence. */
async function resolveCard(
  deps: AppDeps,
  tx: Db,
  request: FastifyRequest,
  ctx: ResolveCtx,
): Promise<ActiveContributionCardResponse> {
  const { pariwarId, now } = ctx;

  // Steps (1)-(5): the shared assigned-live-pool resolution (member active × live cycle × assigned pool).
  const chosen = await resolveMemberLivePool(tx, request, ctx);
  if (chosen === null) return UNASSIGNED;

  const { pool, committedAt, poolCount } = chosen;

  // (6) Days-remaining — the D5 SEAM (pure, leap-safe; see computeDaysRemaining). Server-authoritative
  //     — the client never re-derives the window.
  const daysRemaining = computeDaysRemaining(committedAt, now);

  // (7)-(8) The per-pool IDENTITY — the deceased family name (PII-shielded first-name+last-initial, AC2 —
  //     NOT the nominee) + the letter code + the curated Mahabharata name (else null → letter-code fallback).
  //     Resolved by the SHARED resolver reused by the Yogdaan Bahi history handler (D6), so a pool renders
  //     card-identical family/letter/name in the card and the passbook. `null` (unresolvable claim/KYC/name)
  //     → fail-soft to `{ assigned:false }` (no undignified blank card).
  const identity = await resolvePoolIdentity(deps, tx, request, pariwarId, {
    claimCaseId: pool.claimCaseId,
    poolIndex: pool.poolIndex,
    poolCanonicalIdentifier: pool.poolCanonicalIdentifier,
    fixedAmount: pool.fixedAmount,
    poolCount,
  });
  if (identity === null) return UNASSIGNED;

  // (9) AC6 — the NEXT scheduled fixed-amount change, surfaced gently. The card's CURRENT amount stays
  //     the SNAPSHOTTED pool.fixedAmount (D3); this is additive future context.
  const upcoming = await poolDomain.resolveUpcomingFixedAmountChange(tx, pariwarId, now);

  // (10) The MEMBER'S OWN yellow-pill state (Story 8.4, AC4) — has THIS member self-attested a UTR for this
  //      cycle? A per-member self-state (via the member's deterministic tr on the alert stream), NOT an
  //      aggregate: it is DELIBERATELY separate from `progress` (which stays confirmed-only). Yellow never
  //      pollutes the meter (epics.md:2939-2941).
  const memberTr = poolDomain.deriveContributionReference({ memberId: ctx.memberId, alertId: chosen.alertId });
  const attested = await contributionDomain.hasAttestedContribution(tx, {
    pariwarId,
    alertId: chosen.alertId,
    tr: memberTr,
  });

  return {
    assigned: true,
    poolLetterCode: identity.poolLetterCode,
    poolName: identity.poolName,
    poolCanonicalIdentifier: identity.poolCanonicalIdentifier,
    deceasedFirstName: identity.deceasedFirstName,
    deceasedLastInitial: identity.deceasedLastInitial,
    fixedAmount: identity.fixedAmount,
    daysRemaining,
    // (AC4) confirmed-only meter: numerator is `contribution.confirmed`-derived — legitimately 0 until
    // Epic 9's producer lands (render `0 of N`). There is NO attested/pending field: yellow (Story 8.4)
    // is intent, not confirmed money, and is STRUCTURALLY unable to reach the meter (epics.md:2912,2939-2941).
    progress: { confirmedCount: 0, rosterSize: pool.rosterSize },
    upcomingAmountChange:
      upcoming === null ? null : { effectiveFrom: upcoming.effectiveFrom.toISOString(), newAmount: upcoming.fixedAmount },
    // (AC4) The member's OWN yellow-pill state — separate from the confirmed-only meter above.
    myContribution: attested ? 'attested' : 'none',
  };
}

// ── Yogdaan Bahi contribution-history pipeline (Story 8.6) ──────────────────────────────────────────────
//
// The shared per-pool identity resolver (D6) + the cycle-ref helper moved to `pool-identity.ts` when
// Story 8.7 added the Contribution Note as their THIRD consumer — same implementation, one home, no
// circular import between the handler and the Note resolver.

/** The empty passbook — a member who has attested nothing, or a whole-read fail-soft (AC5-adjacent). */
const HISTORY_EMPTY: ContributionHistoryResponse = { rows: [], totalInr: 0 };

/**
 * The Yogdaan Bahi pipeline (Story 8.6; AC1/AC2/AC3/AC6). Lists the member's OWN attested contributions
 * (domain read, with the derived status), then resolves each row's identity IDENTICALLY to the My Pool
 * card (D6 shared resolver) + the cycle ref, per-pool memoized (ONE deceased-name decrypt per DISTINCT
 * pool — the D5 decrypt-cost note; NO cache built). An unresolvable row (missing pool/claim/KYC/name) is
 * OMITTED (never a blank/error row); `totalInr` sums the rendered rows. Throws only on an unexpected DB
 * error — the caller fail-softs to the empty passbook.
 */
async function resolveHistory(
  deps: AppDeps,
  tx: Db,
  request: FastifyRequest,
  ctx: { readonly memberId: ReturnType<typeof ids.memberId>; readonly pariwarId: ReturnType<typeof ids.pariwarId> },
): Promise<ContributionHistoryResponse> {
  const { memberId, pariwarId } = ctx;

  const entries = await contributionDomain.listMemberContributionHistory(tx, { pariwarId, memberId });
  if (entries.length === 0) return HISTORY_EMPTY;

  // Per-DISTINCT-pool memo: one identity decrypt + one pool-context load per pool (D5/D6). `null` marks a
  // pool whose identity is unresolvable (its rows are omitted) — cached so we do not re-attempt per row.
  const identityByPool = new Map<string, (ResolvedPoolIdentity & { cycleRef: string }) | null>();

  async function resolveRowIdentity(poolId: ReturnType<typeof ids.poolId>): Promise<(ResolvedPoolIdentity & { cycleRef: string }) | null> {
    const cached = identityByPool.get(poolId);
    if (cached !== undefined) return cached;

    const poolCtx = await poolDomain.getPoolContributionContext(tx, pariwarId, poolId);
    if (poolCtx === null) {
      identityByPool.set(poolId, null);
      return null;
    }
    const identity = await resolvePoolIdentity(deps, tx, request, pariwarId, {
      claimCaseId: poolCtx.claimCaseId,
      poolIndex: poolCtx.poolIndex,
      poolCanonicalIdentifier: poolCtx.poolCanonicalIdentifier,
      fixedAmount: poolCtx.fixedAmount,
      poolCount: poolCtx.poolCount,
    });
    if (identity === null) {
      identityByPool.set(poolId, null);
      return null;
    }
    // The cycle ref (freeze month) — its own point read, memoized under the pool (pools in one cycle share it).
    const committedAt = await poolDomain.getCycleFreezeCommittedAt(tx, poolCtx.cycleId);
    const cycleRef = committedAt === null ? poolCtx.poolCanonicalIdentifier : cycleRefFromCommittedAt(committedAt);
    const resolved = { ...identity, cycleRef };
    identityByPool.set(poolId, resolved);
    return resolved;
  }

  const rows: ContributionHistoryRow[] = [];
  let totalInr = 0;
  for (const entry of entries) {
    const identity = await resolveRowIdentity(entry.poolId);
    if (identity === null) {
      // An unresolvable pool/claim/KYC/name — OMIT the row (never an undignified blank), log the anomaly.
      request.log.warn({ poolId: entry.poolId, contributionId: entry.contributionId }, 'contribution-history: row identity unresolvable — omitting');
      continue;
    }
    rows.push({
      contributionId: entry.contributionId,
      date: entry.attestedAt.toISOString(),
      deceasedFirstName: identity.deceasedFirstName,
      deceasedLastInitial: identity.deceasedLastInitial,
      poolLetterCode: identity.poolLetterCode,
      poolName: identity.poolName,
      poolCanonicalIdentifier: identity.poolCanonicalIdentifier,
      cycleRef: identity.cycleRef,
      amountInr: identity.fixedAmount,
      status: entry.status,
      // (Story 8.7 D3(a), RATIFIED) `noteAvailable` is a RESOLVABILITY predicate, NOT a status
      // predicate. A Note exists iff the row resolves to a real artifact — the contribution is the
      // caller's own AND `resolvePoolIdentity` succeeded (claim → deceased member → KYC name decrypt).
      // At THIS point in the loop that is exactly true: the `identity === null` omission above has
      // already dropped every unresolvable row. Hence the literal `true`.
      //
      // NO STATUS TERM BELONGS IN THIS EXPRESSION. A yellow/red/grey row with resolvable identity gets
      // a Note; a green row whose identity is unresolvable does not. Status and availability are
      // ORTHOGONAL: availability decides WHETHER a Note exists, `deriveContributionStatus` decides what
      // it SAYS (and gates the UTR + the सत्यापित stamp inside the artifact). Letting status narrow
      // availability would ship the feature dark — green is unreachable until Epic 9's producer lands.
      noteAvailable: true,
    });
    totalInr += identity.fixedAmount;
  }

  return { rows, totalInr };
}
