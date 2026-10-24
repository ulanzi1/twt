// Nominee declaration handlers — Story 3.4 (Task 5; AC1/AC2/AC3/AC4/AC5).
//
// The third signup-wizard SURFACE (between KYC 3.3b and medical 3.5). `declare` persists the
// 1–2 nominee rows (Tier-1 encrypted) with a SERVER-derived 75/25 split (R4) and emits
// `member.nominees_declared` via the projector — a NON-TRANSITION marker (from_state ===
// to_state; R5). `status` returns the current effective declaration as NON-PII summaries.
//
// ── Scope-tx discipline ────────────────────────────────────────────────────────────────
// `requireMemberSession` sets `request.requestContext.{actorId,pariwarId}` but does NOT open
// a scope tx, so each handler opens its own (`openScopeTx`) and the projector gets the raw
// `scopeTx.client` (it issues `SET LOCAL app.member_state_writer='on'`). Nominee replace +
// event append + state projection run inside ONE scope tx so a torn view never exists.
//
// ── PII discipline (R1) ──────────────────────────────────────────────────────────────────
// name/mobile/address are Tier-1 encrypted in the handler before the accessor sees them; the
// event payload + audit carry only `nominee_count` + `split` — NEVER nominee name/mobile/
// address. The status response echoes presence flags, never the raw bytes (AC4 / echo-back).
//
// ── Re-runnable for Story 3.9 (R3) ───────────────────────────────────────────────────────
// `declare` is the re-runnable declare SERVICE: Story 3.9 attaches `requireMemberStepUp(deps,
// 'nominee_change')` on its Life Events route and reuses this handler.
//
// ── Story 6.20 — the history, the lock at the first claim, and the step-up on a re-declaration ──
//   · D3 / AC2 — the FIRST thing the transaction does is take the intake advisory lock for this member
//     and refuse (409 `nominee.locked_claim_filed`) if ANY claim was ever filed for them as the
//     deceased (`-233`, `-234` V). ⛔ Never the `account-frozen` overlay, ⛔ never
//     `getClaimByDeceasedMember` (invariant 3). The lock and its predicate live in `claim/` and are
//     COMPOSED here, because a `nominee/` → `claim/` import is a runtime init cycle (T5).
//   · AC1 / D1 / D2 — every declare appends ONE version per submitted rank (plus a `vacated`
//     tombstone for a dropped rank) to `member_nominee_versions`, in the SAME transaction as the
//     `member_nominees` projection write, stamped with `clock_timestamp()` taken AFTER the lock.
//   · D9 — a RE-declaration (the member already has a version or a current nominee) requires a fresh
//     `nominee_change` step-up on BOTH routes once the member has left the signup wizard. AR-24 names
//     "nominee change" among the step-up operations, so `POST /member/nominees` accepting a
//     re-declaration on `memberSession` alone was a live conformance breach. ⚠ The wizard's own
//     pre-lock-in re-declares (`pending-kyc` / `pending-fee` / `pending-valid`) stay exempt — a
//     NARROWING of what the handler used to allow (every non-terminal state), ⛔ not a preservation.
//     The INITIAL declaration is ⛔ not a "change" and needs no step-up.
//
// ── Story 6.36e — a nominee who is also a member (AC3; `2026-10-24-397` NE2, NE4, NE5) ──
//   · A route FLAG (`declare({ allowLink })`): the signup route refuses ANY `memberLink` (400 `nominee.link_not_available`)
//     FIRST — before the elevation lookup, any charge, HMAC or transaction — and writes nothing (NE4).
//   · A `kind:'new'` mark is METERED before any HMAC: every new mark's number is normalised first (an unusable one ⇒ the ONE
//     422, ⛔ charge); then its own short scoped tx asks the cheap refusals (a claim-locked declaration, a terminal state, a
//     missing step-up — code review 2026-10-24: ⛔ charged, so the OTP retry does not charge twice), runs the caller gate and
//     charges ONE `nominee_link_resolve` unit per new mark (4 a day — NE5, V2); a refusal costs ⛔ KMS call. Then every new
//     mark's number is HMAC'd with ONE `mobileBlindIndexMany` call OUTSIDE any transaction (⛔ KMS inside the scope tx).
//     ⛔ The number is stored, logged, audited or put in an error (the number fence pins this file).
//   · Inside the declare tx, AFTER the D3 lock and the guards: every LIVE link of the declarer is locked `FOR UPDATE`, the
//     new marks are resolved through `knownPersonEligibleSql` (DB only), and NE2's plan is made BEFORE any write; the link
//     rows are written AFTER `appendMemberDeclarationVersions` (they reference its version ids). Both routes apply NE2's
//     end rules — a save without a mark ENDS the rank's live link (NE4, V20).
//   · Every unresolvable mark — and a caller the gate refuses — is the SAME 422 `nominee.link_not_found` (TR7).

import {
  NOMINEE_LINK_ERROR_CODES as LINK_CODES,
  type NomineeDeclareRequest,
  type NomineeStatusResponse,
  type NomineeSummaryEntry,
} from '@twt/contracts';
import { claim as claimDomain, encryption, ids, nominee as nomineeDomain, member as memberDomain } from '@twt/domain';
import type { FastifyRequest } from 'fastify';

import type { AppDeps } from '../../context.js';
import {
  ApiError,
  BadRequestError,
  ConflictError,
  StepUpRequiredError,
  TooManyRequestsError,
  UnauthorizedError,
} from '../../http-errors.js';
import { hasFreshElevation } from '../auth/member/member-auth.repo.js';
import { emitAuthAudit } from '../auth/shared/audit.js';
import { closeScopeTx, openScopeTx } from '../multi-tenant/scope-tx.js';
import type { ScopeTx } from '../../types.js';
import { encryptNomineeField } from './nominee-crypto.js';

/** Lifecycle states in which a nominee declaration is rejected (terminal — R2). */
const TERMINAL_STATES = new Set(['withdrawn', 'anonymized']);

/**
 * Story 6.20 (D9) — the signup wizard's pre-lock-in states, in which a back-navigation RE-declare stays
 * exempt from the step-up. Every OTHER non-terminal state requires it for a re-declaration.
 */
const PRE_LOCK_IN_STATES = new Set(['pending-kyc', 'pending-fee', 'pending-valid']);

/** The step-up action context a re-declaration requires (the Life Events route's own gate). */
const NOMINEE_CHANGE_STEP_UP = 'nominee_change';

/** Story 6.36e (NE4) — whether the route accepts a `memberLink`: Life Events ONLY. */
export interface NomineeDeclareRouteOptions {
  readonly allowLink: boolean;
}

/** The ONE 422 for every unresolvable mark and for a caller the gate refuses (TR7 — ⛔ which, ⛔ why). */
const linkNotFound = () => new ApiError(422, LINK_CODES.linkNotFound, 'A nominee marked as a member could not be found — remove the mark or pick again');

const LINK_REFUSAL: Record<'not_found' | 'stale' | 'duplicate', () => ApiError> = {
  not_found: linkNotFound,
  stale: () => new ConflictError('The nominee marks changed since this screen loaded — reload and save again', LINK_CODES.linkStale),
  duplicate: () => new ApiError(422, LINK_CODES.linkDuplicate, 'The same member cannot be marked on both nominees'),
};

export function createNomineeHandlers(deps: AppDeps) {
  const enc = deps.encryption;

  /** Read the authenticated member's (memberId, pariwarId) or fail 401. */
  function memberCtx(request: FastifyRequest): { memberIdStr: string; pariwarIdStr: string } {
    const memberIdStr = request.requestContext.actorId;
    const pariwarIdStr = request.requestContext.pariwarId;
    if (!memberIdStr || !pariwarIdStr) {
      throw new UnauthorizedError('Authentication required', 'auth.session_required');
    }
    return { memberIdStr, pariwarIdStr };
  }

  /** Map a stored nominee row to its NON-PII summary entry (never the raw bytes). The row
   * type is derived from the accessor return (schema row types are namespaced under
   * `@twt/domain` `schema.*`, not on the top barrel — the kyc-handler pattern). */
  function toSummary(
    row: Awaited<ReturnType<typeof nomineeDomain.getMemberNominees>>[number],
  ): NomineeSummaryEntry {
    return {
      rank: row.rank as 1 | 2,
      relationship: row.relationship as NomineeSummaryEntry['relationship'],
      splitPct: row.splitPct as 100 | 75 | 25,
      // ⭐ Story 6.20 (AC10, T4) — RECONCILED with D1's tombstone form, ⛔ not left to assert a mobile a
      // tombstone does not have: the projection NEVER holds a tombstone. A vacated rank is written to
      // `member_nominee_versions` only and is ABSENT here (the projection is delete-then-insert of the
      // submitted ranks — D16), and `member_nominees.mobile_ciphertext` is NOT NULL. So every row this
      // summary maps names a nominee with a mobile.
      mobilePresent: true,
      addressPresent: row.addressCiphertext !== null,
    };
  }

  /** Assemble the `/nominees` status view from the current row-set. */
  async function buildStatus(
    scopeTx: ScopeTx,
    pariwarId: ids.PariwarId,
    memberId: ids.MemberId,
  ): Promise<NomineeStatusResponse> {
    const rows = await nomineeDomain.getMemberNominees(scopeTx.tx, pariwarId, memberId);
    // Story 6.20 (AC2) — the same durable predicate the declare path enforces, so the app can show the
    // locked state before the member tries to change anything.
    const locked = await claimDomain.isNomineeDeclarationLocked(scopeTx.tx, pariwarId, memberId);
    return { nominees: rows.map(toSummary), locked };
  }

  return {
    /**
     * POST /api/v1/member/nominees — declare 1–2 nominees → emit `member.nominees_declared`, append one
     * VERSION per submitted rank (+ a tombstone for a dropped rank) and replace the current projection
     * (Story 6.20 D1/D16 — the history is kept; the projection is the latest). The split is SERVER-derived
     * from the count (R4); the lifecycle state is unchanged (non-transition marker, R5). Refused: in a
     * terminal state (R2); once a claim is filed (Story 6.20 D3, AC2 — `nominee.locked_claim_filed`); and a
     * RE-declaration outside the wizard without a fresh `nominee_change` step-up (D9, AR-24).
     */
    declare: (route: NomineeDeclareRouteOptions) => async (request: FastifyRequest): Promise<NomineeStatusResponse> => {
      const body = request.body as NomineeDeclareRequest;
      const { memberIdStr, pariwarIdStr } = memberCtx(request);

      // Defense-in-depth: the contract bounds nominees to 1..2, but never trust the count.
      const count = body.nominees.length;
      if (count < 1 || count > 2) {
        throw new BadRequestError('Declare 1 or 2 nominees', 'nominee.invalid_count');
      }
      const { split, ranks } = nomineeDomain.deriveNomineeSplit(count);

      // ⭐ Story 6.36e (NE4) — the signup route refuses a mark FIRST: ⛔ elevation lookup, ⛔ charge, ⛔ KMS, ⛔ transaction.
      if (!route.allowLink && body.nominees.some((n) => n.memberLink !== undefined)) {
        throw new BadRequestError('A nominee can be marked as a member from Life Events only', LINK_CODES.linkNotAvailable);
      }
      const memberId = ids.memberId(memberIdStr);
      const pariwarId = ids.pariwarId(pariwarIdStr);
      const newMarks = body.nominees.flatMap((n, i) => (n.memberLink?.kind === 'new' ? [{ i, mobile: n.memberLink.mobile }] : []));
      // Normalise (an unusable number ⇒ the ONE 422) BEFORE anything is charged (code review 2026-10-24): a number the Trust cannot
      // even read never reaches a lookup, so it costs the member nothing of the day's budget.
      const canonicals = newMarks.map((m) => encryption.normalizeMobile(m.mobile));
      if (canonicals.some((c) => c === null)) throw linkNotFound();

      // ⭐ Story 6.20 (D9) — the `nominee_change` elevation is looked up BEFORE any transaction opens (code
      // review 2026-09-24): looked up inside it, the lookup took a SECOND pooled connection while this one
      // held the D3 advisory lock — N concurrent re-declares could starve the pool with every lock held.
      // Whether it is NEEDED is still decided inside the transaction, below. A lookup failure is P24's
      // posture: step-up-required.
      // ⚠ DELIBERATE (code review 2026-09-24b, family 9): the freshness is judged at REQUEST time, ⛔ not
      // after the D3 lock wait — an elevation that expires while this request waits on the lock still
      // authorises the write. Accepted: the window is bounded by the lock wait (seconds), the lookup does
      // ⛔ not consume the elevation (no double use), and the alternative is the pool starvation above.
      // Re-examine if the lock wait can ever approach the elevation's lifetime.
      let elevationFresh = false;
      try {
        elevationFresh = await hasFreshElevation(deps.pool, memberIdStr, NOMINEE_CHANGE_STEP_UP, deps.clock());
      } catch {
        elevationFresh = false;
      }

      /**
       * The refusals that need NO lookup and NO KMS, in the order they were always taken: the D3 lock FIRST (no other lock
       * before it), a claim-locked declaration, a terminal state, a re-declaration without a fresh step-up. Runs in BOTH
       * transactions — ⭐ code review 2026-10-24: the metering transaction asks them BEFORE it charges, so a save that is
       * going to be refused for one of them (and the step-up round trip: a first POST that answers 403, then the OTP retry)
       * ⛔ spends the day's `nominee_link_resolve` budget; the main transaction asks them again, authoritatively. Returns the
       * lifecycle state the declare projects from.
       */
      const guardDeclare = async (tx: ScopeTx): Promise<Awaited<ReturnType<typeof memberDomain.getMemberStateAt>>> => {
        // ⭐ Story 6.20 (D3, AC2) — the intake advisory lock FIRST (no other lock before it), then the
        // claim-filed check. An intake that won the lock has already minted its claim row, and this
        // edit refuses; an edit that won commits before the claim — legitimately "before the claim".
        try {
          await claimDomain.lockNomineeDeclarationForEdit(tx.client, pariwarId, memberId);
        } catch (err) {
          if (err instanceof claimDomain.NomineeDeclarationLockedError) {
            throw new ConflictError(
              'A claim has been filed — the nominee declaration can no longer be changed. A genuine mistake can be corrected through the helpline.',
              'nominee.locked_claim_filed',
            );
          }
          throw err;
        }

        // Guard: a member in a terminal state cannot re-declare nominees (R2). Pre-lock-in
        // states (pending-kyc/pending-fee/pending-valid) and active states are all allowed —
        // nominees may legitimately be declared before or after KYC within the wizard.
        const state = await memberDomain.getMemberStateAt(tx.tx, memberId, deps.clock());
        if (TERMINAL_STATES.has(state)) {
          throw new ConflictError(
            'Member is in a terminal state — nominees cannot be declared',
            'nominee.member_terminal',
          );
        }

        // ⭐ Story 6.20 (D9) — a RE-declaration outside the wizard needs a fresh `nominee_change`
        // step-up on BOTH routes (AR-24). Checked here, ⛔ not as a static preHandler, because whether
        // this submit is a CHANGE is only known inside the transaction.
        const isRedeclaration =
          (await nomineeDomain.hasNomineeDeclarationVersion(tx.tx, pariwarId, memberId)) ||
          (await nomineeDomain.getMemberNominees(tx.tx, pariwarId, memberId)).length > 0;
        if (isRedeclaration && !PRE_LOCK_IN_STATES.has(state) && !elevationFresh) {
          throw new StepUpRequiredError(NOMINEE_CHANGE_STEP_UP);
        }
        return state;
      };

      // ⭐ Story 6.36e (NE5, V2) — METER the new marks BEFORE any HMAC, in their OWN short scoped tx (a refusal rolls the
      // counter back and costs ⛔ KMS call). A `keep` and a save without a mark are ⛔ charged (V11). ⭐ Code review 2026-10-24:
      // the cheap refusals above run FIRST in this same transaction — a locked declaration, a terminal state or a missing
      // step-up (the OTP retry would otherwise charge twice) ⇒ ⛔ charge.
      if (newMarks.length > 0) {
        const chargeTx = await openScopeTx(deps, pariwarIdStr);
        let charged = false;
        try {
          await guardDeclare(chargeTx);
          const r = await nomineeDomain.chargeNomineeLinkResolve(chargeTx.tx, {
            pariwarId,
            memberId,
            marks: newMarks.length,
          });
          if (!r.ok) {
            throw r.reason === 'daily_limit'
              ? new TooManyRequestsError('Daily limit for marking nominees as members reached — try again tomorrow', LINK_CODES.linkDailyLimit)
              : linkNotFound();
          }
          charged = true;
        } finally {
          await closeScopeTx(chargeTx, charged);
        }
      }
      // HMAC every new mark with ONE batch call OUTSIDE any transaction.
      const markIndexes = new Map<number, string>();
      if (newMarks.length > 0) {
        const indexes = await encryption.mobileBlindIndexMany(canonicals as string[], enc, {
          pariwarId: pariwarIdStr,
          purpose: nomineeDomain.NOMINEE_LINK_RESOLVE_AUDIT_PURPOSE,
        });
        newMarks.forEach((m, k) => markIndexes.set(m.i, indexes[k]!));
      }

      const scopeTx = await openScopeTx(deps, pariwarIdStr);
      let ok = false;
      try {
        const state = await guardDeclare(scopeTx);

        // ⭐ Story 6.36e (NE2) — lock EVERY live link of this declarer (after the D3 lock, BEFORE this save's versions — so
        // `onHead` is the head before the save), resolve the new marks (DB only), and PLAN before any write: a refusal
        // leaves nothing to undo.
        const liveLinks = await nomineeDomain.lockLiveNomineeLinks(scopeTx.tx, { pariwarId, declarerMemberId: memberId });
        const resolved = await nomineeDomain.resolveNomineeLinkTargets(scopeTx.tx, {
          pariwarId,
          declarerMemberId: memberId,
          indexes: [...markIndexes.values()],
        });
        const linkPlan = nomineeDomain.planNomineeLinks(
          liveLinks,
          body.nominees.map((n, i) => {
            const rank = ranks[i]!.rank;
            const mark = n.memberLink;
            if (mark === undefined) return { rank, link: null };
            if (mark.kind === 'keep') return { rank, link: { kind: 'keep' as const, linkId: mark.linkId } };
            return { rank, link: { kind: 'new' as const, nomineeMemberId: resolved.get(markIndexes.get(i)!) ?? null, foundBy: mark.foundBy } };
          }),
        );
        if (linkPlan.kind === 'refused') throw LINK_REFUSAL[linkPlan.reason]();

        // Encrypt each nominee field under the member's real pariwar context, stamping the
        // server-derived rank + splitPct (the client never supplies a percentage — R4).
        const rows = await Promise.all(
          body.nominees.map(async (n, i) => {
            const { rank, splitPct } = ranks[i]!;
            return {
              rank,
              splitPct,
              relationship: n.relationship,
              nameCiphertext: await encryptNomineeField(n.name, pariwarIdStr, enc),
              mobileCiphertext: await encryptNomineeField(n.mobile, pariwarIdStr, enc),
              addressCiphertext: n.address
                ? await encryptNomineeField(n.address, pariwarIdStr, enc)
                : null,
            };
          }),
        );

        // ⭐ Story 6.20 (D2) — the database wall clock, taken AFTER the lock, is BOTH `recorded_at` and
        // `effective_at` of every version this declare writes. Then the plan: one version per submitted
        // rank (⛔ no dedup — T3) and a tombstone for a rank this submit dropped (T9).
        const recordedAt = await nomineeDomain.readDatabaseClock(scopeTx.tx);
        const plan = nomineeDomain.planDeclarationVersions(
          await nomineeDomain.getNomineeVersionHeads(scopeTx.tx, pariwarId, memberId),
          rows.map((r) => r.rank),
        );

        await nomineeDomain.replaceMemberNominees(scopeTx.tx, {
          memberId,
          pariwarId,
          nominees: rows,
        });

        // Non-transition marker: from_state === to_state (R5). The reducer treats
        // member.nominees_declared as identity; this records the MOMENT on the stream with the
        // NON-PII audit (count + split only — R1). A re-declaration emits a NEW event (AC5).
        // Story 6.20 (AC1) — plus the OPTIONAL non-PII `source` + per-rank `versions` written.
        const projected = await memberDomain.projectMemberState(scopeTx.client, {
          memberId,
          pariwarId,
          eventType: 'member.nominees_declared',
          payload: {
            from_state: state,
            to_state: state,
            trigger: 'nominee_declaration',
            actor: 'member',
            nominee_count: count as 1 | 2,
            split,
            source: 'member',
            versions: plan.map((p) => ({ rank: p.rank, version_no: p.versionNo, kind: p.kind })),
          },
          actorId: memberIdStr,
        });

        // ⭐ Story 6.20 (AC1) — the history, in the SAME transaction as the projection. ⛔ Nothing is
        // updated or deleted there: the grant and the migration-0119 trigger both refuse it.
        const versions = await nomineeDomain.appendMemberDeclarationVersions(scopeTx.tx, {
          memberId,
          pariwarId,
          plan,
          nominees: rows,
          recordedAt,
          eventVersion: projected.eventVersion,
        });

        // ⭐ Story 6.36e (NE2) — the link rows hang off the versions just written; ends are dated `recordedAt`.
        const links = await nomineeDomain.applyNomineeLinkPlan(scopeTx.tx, {
          pariwarId,
          declarerMemberId: memberId,
          plan: linkPlan,
          versions,
          recordedAt,
        });

        const result = await buildStatus(scopeTx, pariwarId, memberId);
        ok = true;
        // Emit audit only after buildStatus succeeds and ok is set: if buildStatus throws,
        // closeScopeTx rolls back the tx but the audit would have already fired.
        emitAuthAudit(deps, request, 'member_nominees.declared', {
          actorId: memberIdStr,
          pariwarId: pariwarIdStr,
          // Story 6.20 — the version numbers written (non-PII), so the audit line joins the history.
          context: {
            nominee_count: count,
            split,
            versions: plan.map((p) => `${p.rank}:${p.versionNo}:${p.kind}`).join(','),
          },
        });
        // Story 6.36e (AC9) — one line per link written or ended: `nominee_link:<id>` + `{ rank }` ONLY.
        for (const [event, written] of [
          ['member_nominee_links.ended', links.ended],
          ['member_nominee_links.carried', links.carried],
          ['member_nominee_links.asked', links.asked],
        ] as const) {
          for (const l of written) {
            emitAuthAudit(deps, request, event, {
              actorId: memberIdStr,
              pariwarId: pariwarIdStr,
              resourceLocator: `nominee_link:${l.linkId}`,
              context: { rank: l.rank },
            });
          }
        }
        return result;
      } finally {
        await closeScopeTx(scopeTx, ok);
      }
    },

    /** GET /api/v1/member/nominees — the current effective declaration (NON-PII summaries). */
    async status(request: FastifyRequest): Promise<NomineeStatusResponse> {
      const { memberIdStr, pariwarIdStr } = memberCtx(request);
      const scopeTx = await openScopeTx(deps, pariwarIdStr);
      let ok = false;
      try {
        const result = await buildStatus(
          scopeTx,
          ids.pariwarId(pariwarIdStr),
          ids.memberId(memberIdStr),
        );
        ok = true;
        return result;
      } finally {
        await closeScopeTx(scopeTx, ok);
      }
    },
  };
}
