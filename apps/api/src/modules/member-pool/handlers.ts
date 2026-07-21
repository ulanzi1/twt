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
  claim as claimDomain,
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
  PoolContributorListResponse,
} from '@twt/contracts';
import type { FastifyRequest } from 'fastify';

import type { AppDeps } from '../../context.js';
import { UnauthorizedError } from '../../http-errors.js';
import { decryptKycField } from '../kyc/kyc-crypto.js';
import { closeScopeTx, openScopeTx } from '../multi-tenant/scope-tx.js';
import { splitFirstNameLastInitial } from './name.js';

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/**
 * The bounded contribution-window length in days (D5 SEAM). Story 8.9 (calendar-aware close-of-cycle
 * — Bihar holiday windows) OWNS the authoritative close date and will REPLACE this fixed window with
 * the real deadline. Until then, days-remaining = `committed_at + CYCLE_WINDOW_DAYS`. Do NOT encode
 * any holiday/close-of-cycle policy against this constant — it is a placeholder, not the deadline authority.
 */
const CYCLE_WINDOW_DAYS = 15;

const UNASSIGNED: ActiveContributionCardResponse = { assigned: false };

/**
 * Days-remaining in the bounded contribution window (D5 SEAM) — PURE + unit-testable. `committedAt +
 * CYCLE_WINDOW_DAYS` using LEAP-SAFE `setDate` arithmetic (handles month/year rollover — the
 * member-home clock precedent; a fixed-ms add does NOT), then `ceil((windowEnd − now)/day)`, clamped
 * ≥0. Story 8.9 (calendar-aware close-of-cycle) replaces this fixed window with the authoritative close.
 */
export function computeDaysRemaining(committedAt: Date, now: Date): number {
  const windowEnd = new Date(committedAt);
  windowEnd.setDate(windowEnd.getDate() + CYCLE_WINDOW_DAYS);
  return Math.max(0, Math.ceil((windowEnd.getTime() - now.getTime()) / MS_PER_DAY));
}

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

interface ResolveCtx {
  readonly memberId: ReturnType<typeof ids.memberId>;
  readonly pariwarId: ReturnType<typeof ids.pariwarId>;
  readonly now: Date;
}

/** The member's assigned pool in the soonest-closing live cycle (D7) + the window anchor + N. */
interface ChosenLivePool {
  readonly committedAt: Date;
  readonly poolCount: number;
  readonly cycleId: Awaited<ReturnType<typeof alertDomain.listLiveAlertsForPariwar>>[number]['cycleId'];
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
async function resolveMemberLivePool(
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

  // (7) The deceased member whose family is supported (AC2 — NOT the nominee). claim → deceased_member_id
  //     → KYC name ciphertext → decrypt (member-session layer, D11) → PII-shielded first-name+last-initial.
  const claimCase = await claimDomain.getClaimCase(tx, pariwarId, pool.claimCaseId);
  if (!claimCase) return UNASSIGNED;
  const kycProfile = await kycDomain.getMemberKycProfile(tx, pariwarId, claimCase.deceasedMemberId);
  if (!kycProfile || kycProfile.nameCiphertext === null) return UNASSIGNED;
  // A branded PariwarId IS a string (brand is compile-time only) — the KYC decrypt context keys on it.
  const fullName = await decryptKycField(kycProfile.nameCiphertext, pariwarId, deps.encryption);
  const { firstName, lastInitial } = splitFirstNameLastInitial(fullName);
  if (firstName === '') return UNASSIGNED; // an unresolvable name — fail-soft (no undignified blank card)

  // (8) Pool identity — the member-facing letter code always; the curated Mahabharata name when the
  //     Pariwar has configured its registry (else null → the letter-code fallback, TWT-Bihar launch).
  const poolLetterCode = poolDomain.poolLetterCode(pool.poolIndex);
  const poolName = await resolveCuratedPoolName(tx, pariwarId, poolCount, pool.poolIndex, request);

  // (9) AC6 — the NEXT scheduled fixed-amount change, surfaced gently. The card's CURRENT amount stays
  //     the SNAPSHOTTED pool.fixedAmount (D3); this is additive future context.
  const upcoming = await poolDomain.resolveUpcomingFixedAmountChange(tx, pariwarId, now);

  return {
    assigned: true,
    poolLetterCode,
    poolName,
    poolCanonicalIdentifier: pool.poolCanonicalIdentifier,
    deceasedFirstName: firstName,
    deceasedLastInitial: lastInitial,
    fixedAmount: pool.fixedAmount,
    daysRemaining,
    // (AC4) confirmed-only meter: numerator is `contribution.confirmed`-derived — legitimately 0 until
    // Epic 9's producer lands (render `0 of N`). There is NO attested/pending field: yellow (Story 8.4)
    // is intent, not confirmed money, and is STRUCTURALLY unable to reach the meter (epics.md:2912,2939-2941).
    progress: { confirmedCount: 0, rosterSize: pool.rosterSize },
    upcomingAmountChange:
      upcoming === null ? null : { effectiveFrom: upcoming.effectiveFrom.toISOString(), newAmount: upcoming.fixedAmount },
  };
}

/**
 * The curated Mahabharata-rooted pool name for THIS pool, or `null` (→ the letter-code fallback). The
 * name is NOT stored per pool (Story 7.2 `names.ts`: `pools` has no name column); it is re-derived by
 * reserving the cycle's N names in position order and indexing by the pool's ordering. Returns:
 *   · `null`   — the Pariwar opted OUT (empty registry — TWT-Bihar launch → letter code everywhere), or
 *                the registry is under-configured (exhaustion) / any read error → letter-code fallback.
 *   · a name   — the position-ordered curated name for `poolIndex`.
 *
 * Locale note (documented seam): the reservation carries both locales, but this read layer has no
 * viewer locale (requestContext exposes none), so it returns the Hindi-primary name (Hindi-first
 * product). Full bilingual name-by-locale resolution is deferred until a tenant actually configures
 * the registry — a seam, not a launch gap (the launch value is `null`). Its own try/catch so a config
 * gap degrades to the letter code WITHOUT suppressing the whole card.
 */
async function resolveCuratedPoolName(
  tx: Db,
  pariwarId: ReturnType<typeof ids.pariwarId>,
  poolCount: number,
  poolIndex: number,
  request: FastifyRequest,
): Promise<string | null> {
  try {
    const names = await poolDomain.reserveNames(tx, { pariwarId, count: poolCount });
    if (names.length === 0) return null; // opted out — letter code (the committed launch behavior)
    const reserved = names[poolIndex];
    return reserved ? reserved.displayNameHi : null;
  } catch (err) {
    if (err instanceof poolDomain.PoolNameListExhaustedError) {
      // A trustee CONFIGURATION GAP (names.ts), not a benign opt-out — surface it loudly so it can be
      // acted on, while still degrading THIS card to the letter code rather than suppressing it.
      request.log.error({ err }, 'active-contribution: pool-name registry exhausted — trustee must extend the curated list');
      return null;
    }
    request.log.warn({ err }, 'active-contribution: pool-name registry unresolved — letter-code fallback');
    return null;
  }
}
