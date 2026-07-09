// Claim lifecycle read accessors — Story 6.1 (Task 5; AC3). Twin of member/read.ts.
//
// `getClaimStateAt` is the canonical "what was this claim's state on date X?" surface
// that the verifier console (Epic 6), the Pool Engine (Epic 7), and reconciliation
// (Epic 9) consume. It replays the claim's `events_log` stream up to — but not
// exceeding — `atTimestamp`.
//
// ── Ordered by event_version, NOT occurred_at (AC3 — load-bearing) ────────────
// `occurred_at` defaults to DB `now()` and CAN tie (two events in the same
// transaction/instant). Ordering replay by the monotonic `event_version` guarantees a
// deterministic result regardless of occurred_at ties, and makes any truncated replay
// (as this does at a timestamp boundary) a valid intermediate state, never a torn one.
// The timestamp is used only as the upper BOUND of the replay window
// (`occurred_at <= atTimestamp`), never as the sort key.
//
// Reads `events_log` directly via Drizzle (domain owns the table) rather than calling
// @twt/events.loadEvents — domain cannot import @twt/events (the cycle); see
// claim/project.ts header. The stream is small per claim.

import { and, asc, desc, eq, lte, notInArray } from 'drizzle-orm';

import type { Db } from '../db.js';
import type { ClaimId, MemberId, PariwarId } from '../ids/index.js';
import { eventsLog } from '../schema/events_log.js';
import { claims, type ClaimRow } from '../schema/claims.js';
import { type ClaimLifecycleState, replayClaimState } from './state.js';

/**
 * Lifecycle states from which a claim never re-opens (Story 6.1 state.ts:
 * `settled` and `denied` are both annotated terminal; `reversed` re-enters
 * `approved` via an appeal, so it is NOT terminal).
 */
export const CLAIM_TERMINAL_STATES: readonly ClaimLifecycleState[] = ['settled', 'denied'] as const;

/**
 * Compute a claim's lifecycle state as of `atTimestamp` by replaying its event stream
 * up to (and including) that instant, ordered by `event_version`.
 *
 * Tenant scope is enforced by RLS (the caller has set `app.pariwar_id`); the query
 * filters by `stream_id` (= claim_case_id) which is globally unique.
 *
 * Degenerate case: if the claim has NO events at/before `atTimestamp` (e.g. an instant
 * before intake), the empty replay returns the machine's initial state
 * (`intake_pending`) — consumers own the pre-existence check (inherited Story 3.1
 * contract; use `getClaimCase` to probe existence).
 */
export async function getClaimStateAt(
  db: Db,
  claimCaseId: ClaimId,
  atTimestamp: Date,
): Promise<ClaimLifecycleState> {
  const rows = await db
    .select()
    .from(eventsLog)
    .where(and(eq(eventsLog.streamId, claimCaseId), lte(eventsLog.occurredAt, atTimestamp)))
    .orderBy(asc(eventsLog.eventVersion));
  return replayClaimState(rows);
}

/**
 * The cached `claims` row (incl. `current_state`) for convenience consumers — a
 * transport-free point read. Tenant-scoped by RLS + the explicit `pariwar_id`
 * predicate (so a cross-tenant `claim_case_id` guess resolves to `undefined`, not
 * another tenant's row). Returns `undefined` when no claim row exists in this Pariwar.
 *
 * Recorded variance (Story 6.1 review): Task 5 specified `getClaimCase(db,
 * claimCaseId)`; the `pariwarId` parameter was added for defense-in-depth explicit
 * tenant scoping on top of RLS, mirroring how other cross-tenant-sensitive reads in
 * this codebase take the scope explicitly rather than relying on RLS alone.
 */
export async function getClaimCase(
  db: Db,
  pariwarId: PariwarId,
  claimCaseId: ClaimId,
): Promise<ClaimRow | undefined> {
  const rows = await db
    .select()
    .from(claims)
    .where(and(eq(claims.pariwarId, pariwarId), eq(claims.claimCaseId, claimCaseId)))
    .limit(1);
  return rows[0];
}

/**
 * The existing claim (if any) filed against a deceased member in this Pariwar — the
 * single-channel intake-idempotency read (Story 6.2 AC3). One death yields one claim
 * (ICP / Story 6.4 enforces cross-channel convergence); this returns the most-recently-
 * created matching row so a member-app double-tap/retry resolves the same case instead of
 * minting a second `claim_case_id` (which would double-freeze the account). Uses the
 * `claims_deceased_member_id_idx`. Tenant-scoped by RLS + the explicit `pariwar_id`
 * predicate (a cross-tenant `deceased_member_id` guess resolves to `undefined`).
 *
 * Scope note: 6.2 owns only the single-channel trivial-duplicate guard. FULL cross-channel
 * dedup (member-app + helpline for one death) is Story 6.4's ICP — this read deliberately
 * does not filter by channel, so any live intake for the death is found. It DOES filter out
 * `CLAIM_TERMINAL_STATES` (`settled`/`denied`): a death whose earlier claim already reached a
 * terminal outcome must be able to re-file (e.g. a fresh claim after `denied`), so a terminal
 * row must not be handed back as "the existing intake."
 */
export async function getClaimByDeceasedMember(
  db: Db,
  pariwarId: PariwarId,
  deceasedMemberId: MemberId,
): Promise<ClaimRow | undefined> {
  const rows = await db
    .select()
    .from(claims)
    .where(
      and(
        eq(claims.pariwarId, pariwarId),
        eq(claims.deceasedMemberId, deceasedMemberId),
        notInArray(claims.currentState, [...CLAIM_TERMINAL_STATES]),
      ),
    )
    .orderBy(desc(claims.createdAt))
    .limit(1);
  return rows[0];
}
