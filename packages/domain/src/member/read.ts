// Member lifecycle read accessors — Story 3.1 (Task 5; AC4).
//
// `getMemberStateAt` is the canonical "what was this member's state on date X?"
// surface that Epic 4 (validity service), Epic 6 (claim filing), and Epic 12 (Module
// Shelf suppression) consume. It replays the member's `events_log` stream up to —
// but not exceeding — `atTimestamp`.
//
// ── Ordered by event_version, NOT occurred_at (AC4 — load-bearing) ────────────
// `occurred_at` defaults to DB `now()` and CAN tie (two events in the same
// transaction/instant). Ordering replay by the monotonic `event_version` guarantees
// a deterministic result regardless of occurred_at ties. The timestamp is used only
// as the upper BOUND of the replay window (`occurred_at <= atTimestamp`), never as
// the sort key.
//
// Reads `events_log` directly via Drizzle (domain owns the table) rather than calling
// @twt/events.loadEvents — domain cannot import @twt/events (the cycle); see
// member/project.ts header. The `events_log_pariwar_occurred_at_idx` index assists
// the bound, and the stream is small per member.

import { and, asc, desc, eq, inArray, lte } from 'drizzle-orm';

import type { Db } from '../db.js';
import type { MemberId, PariwarId } from '../ids/index.js';
import { eventsLog } from '../schema/events_log.js';
import { members } from '../schema/members.js';
import { LockInEnteredPayloadSchema } from './events.js';
import { type MemberLifecycleState, replayMemberState } from './state.js';

/**
 * Does a member row physically exist in this Pariwar? Story 3.5 (Task 6) uses this as the
 * explicit pre-check the medical-disclosure submit runs BEFORE `getMemberStateAt` — that
 * accessor is non-nullable (a non-existent member replays to `pending-kyc`), so a clean 409
 * for "member not found" needs a real existence probe (it resolves 3.4's deferred D3). The
 * FK on `member_medical_disclosures → members` is only a data-integrity backstop (it yields a
 * 500, not a clean 409). Tenant-scoped (RLS + the explicit predicate).
 */
export async function memberExists(
  db: Db,
  pariwarId: PariwarId,
  memberId: MemberId,
): Promise<boolean> {
  const rows = await db
    .select({ memberId: members.memberId })
    .from(members)
    .where(and(eq(members.pariwarId, pariwarId), eq(members.memberId, memberId)))
    .limit(1);
  return rows.length > 0;
}

/**
 * Enumerate EVERY member id in a Pariwar (the bulk set-level read the pool-spawn assignable-roster
 * resolver keys off — AI-7-2). Tenant-scoped (RLS + the EXPLICIT `pariwar_id` predicate, mirroring
 * `getPeerMeshCandidateSnapshot`'s multi-row shape), ordered by `member_id` ascending so the roster is
 * a stable, replay-deterministic input to `assignMembersToPools`.
 *
 * DELIBERATELY UNFILTERED by `members.state`: this read returns the WHOLE membership and lets the caller
 * filter by the Story 4.6 Validity Service verdict at the cycle-freeze instant. Pre-filtering by
 * lifecycle state here would re-derive member-state policy in the enumeration layer — the exact thing
 * the assignable-roster invariant forbids (assignability is `getValidityAt(...).is_assignable` ONLY —
 * AI-7-2 as amended by Story 10.17; it was `is_valid` until 2026-08-04). A member
 * who signed up AFTER the freeze still enumerates, but replays to a non-valid state at `committed_at`, so
 * the verdict excludes them — determinism is preserved by evaluating validity at the frozen instant, not
 * by narrowing this enumeration.
 *
 * Reads the `members` projection (the id set is a projection concern, not an event replay), selecting
 * `member_id` only. No user-controlled `.limit()` (the whole membership is the set), so no
 * domain-invariants clamp is needed.
 */
export async function listMemberIdsForPariwar(db: Db, pariwarId: PariwarId): Promise<MemberId[]> {
  const rows = await db
    .select({ memberId: members.memberId })
    .from(members)
    .where(eq(members.pariwarId, pariwarId))
    .orderBy(asc(members.memberId));
  return rows.map((r) => r.memberId);
}

/** One member's id paired with its CURRENT projected lifecycle state. */
export interface MemberIdWithState {
  readonly memberId: MemberId;
  readonly state: MemberLifecycleState;
}

/**
 * Enumerate every member id in a Pariwar WITH its current projected lifecycle state — ONE query
 * (Story 10.24, Task 6).
 *
 * The Trustee-Lite R7 violator scan needs a `memberState` per member to build the engine's resolved
 * evaluation context, over the WHOLE Pariwar. Calling `getMemberStateAt` per member would be an event
 * replay per member — precisely the N+1 that story's AC7 names as its binding structural criterion
 * (10.11 already paid for this lesson: its own spec went 44s → 220s doing per-member work). This read
 * is the bounded alternative.
 *
 * ⚠ It reads the `members.state` PROJECTION, so it answers for NOW — which is correct for the LIVE
 * trustee surface and ONLY for it. It is deliberately not an `At(instant)` accessor: a historical
 * answer must come from `getMemberStateAt`'s replay, and offering a cheap-but-wrong as-of variant here
 * is how a replay-correctness invariant erodes. `members.state` is projector-maintained (DB trigger +
 * CI gate), so this is a read of derived state, never a second derivation of it.
 *
 * Ordered by `member_id` ascending — stable and replay-diffable, mirroring
 * {@link listMemberIdsForPariwar}. Tenant-scoped (RLS + the explicit predicate). No user-controlled
 * `.limit()` (the whole membership is the set), so no domain-invariants clamp is needed.
 */
export async function listMemberStatesForPariwar(
  db: Db,
  pariwarId: PariwarId,
): Promise<MemberIdWithState[]> {
  const rows = await db
    .select({ memberId: members.memberId, state: members.state })
    .from(members)
    .where(eq(members.pariwarId, pariwarId))
    .orderBy(asc(members.memberId));
  return rows.map((r) => ({ memberId: r.memberId, state: r.state }));
}

/**
 * Compute a member's lifecycle state as of `atTimestamp` by replaying its event
 * stream up to (and including) that instant, ordered by `event_version`.
 *
 * Tenant scope is enforced by RLS (the caller has set `app.pariwar_id`); the query
 * filters by `stream_id` (= member_id) which is globally unique.
 *
 * Degenerate case: if the member has NO events at/before `atTimestamp` (e.g. a time
 * before signup), the empty replay returns the machine's initial state (`pending-kyc`)
 * — callers query this for members that exist as of the instant in question.
 */
export async function getMemberStateAt(
  db: Db,
  memberId: MemberId,
  atTimestamp: Date,
): Promise<MemberLifecycleState> {
  const rows = await db
    .select()
    .from(eventsLog)
    .where(and(eq(eventsLog.streamId, memberId), lte(eventsLog.occurredAt, atTimestamp)))
    .orderBy(asc(eventsLog.eventVersion));
  return replayMemberState(rows);
}

/**
 * The member's lifecycle state RIGHT NOW — the whole stream, with NO upper bound. Story 10.23
 * (review finding) uses this for a lifecycle NON-transition's audit shape (`from_state`/`to_state`)
 * instead of `getMemberStateAt(…, input.now)`, for exactly the clock-domain reason
 * `member/restoration-discipline/overlay.ts`'s `getCurrentMemberRestorationDiscipline` documents:
 * `occurred_at` is DB-generated while any `atTimestamp` a caller holds is the injected APP clock, and
 * bounding by it can make an audit field disagree with the state `projectMemberState`'s OWN unbounded
 * replay is about to write moments later. Mirrors `projectMemberState`'s internal `existing` read
 * exactly (no `lte`, ordered by `event_version`).
 */
export async function getCurrentMemberState(db: Db, memberId: MemberId): Promise<MemberLifecycleState> {
  const rows = await db
    .select()
    .from(eventsLog)
    .where(eq(eventsLog.streamId, memberId))
    .orderBy(asc(eventsLog.eventVersion));
  return replayMemberState(rows);
}

/**
 * Max `stream_id`s bound into ONE batched `events_log` replay query.
 *
 * ⚠ A REAL chunk bound, ⛔ not a page size wearing the word "chunked". A pool roster is dozens, but
 * the Epic-11b public contributor render is the ~10,000-member case, and an unbounded `inArray` is a
 * query-plan cliff (and, past ~65k, a bind-parameter ceiling). At 500, a 10,000-member set costs 20
 * sequential waves instead of one unplannable statement.
 *
 * ⛔⛔ This is NOT `DIRECTORY_DECRYPT_CONCURRENCY` and must never be collapsed into it. A CHUNK SIZE
 * (how many ids fit in one SQL statement) and a CONCURRENCY BOUND (how many KMS round-trips may be in
 * flight) are different quantities answering different questions; sharing one number couples a
 * Postgres planning decision to an external-quota decision, and the two will drift.
 */
export const MEMBER_STATE_REPLAY_CHUNK_SIZE = 500;

/**
 * The CURRENT lifecycle state of MANY members at once — {@link getCurrentMemberState}'s batched
 * sibling. Story 11b.2a (AC2), for the confirmed-contributor boundary that must know WHOM TO OMIT.
 *
 * Returns a `Map` keyed by every id in `memberIds` — a member with no events maps to the machine's
 * initial state (`pending-kyc`), the same degenerate case `getMemberStateAt` documents. ⛔ Never a
 * missing key: the caller must not have to supply a default, because the default WOULD BE the
 * erasure decision.
 *
 * ⛔⛔ MIRRORS {@link getCurrentMemberState}, ⛔ NEVER {@link getMemberStateAt} — NO `atTimestamp`
 * parameter and NO `occurred_at` upper bound, and that is a CORRECTNESS constraint, not a style
 * choice. RTBF is a RIGHT-NOW question. `occurred_at` is DB-generated while any timestamp a caller
 * holds is the injected APP clock; bounding this replay by an app clock that lags the DB clock puts
 * a `member.rtbf_anonymized` event OUTSIDE the window, resolves the member `active`, and renders the
 * erased member's REAL NAME on the contributor list — the exact defect Story 11b.2a exists to fix,
 * re-created by the choice of sibling. See Decision 2026-08-30-169 cl.4 and
 * `tests/member/batched-member-states.test.ts`, which fails loudly if the bound is ever added back.
 *
 * ⛔ Returns STATE ONLY. ⛔ No decrypt, ⛔ no KYC join, ⛔ no death overlay — `members.state`
 * deliberately carries no `deceased` label ([[project_death_is_an_overlay_not_a_state]]), and on a
 * CONTRIBUTOR read that blindness is CORRECT: a death conjunct here would delete dead contributors
 * from the historical record ("the right conjunct in the wrong read", 2026-08-24-159 cl.11).
 *
 * ⛔ Takes no dynamic `.limit()` — the set is the bound ([[project_domain_limit_clamp_and_savepoint_retry]]).
 * Tenant scope is RLS (the caller has set `app.pariwar_id`); `stream_id` is globally unique.
 *
 * ⛔ NOT a `members.state` join. That column is PROJECTOR-maintained current state, and every other
 * read in the contributor path trusts the REPLAY; joining it would make the RTBF guarantee depend on
 * projector liveness ([[project_member_lifecycle_domain_substrate]]).
 */
export async function getCurrentMemberStates(
  db: Db,
  memberIds: readonly MemberId[],
): Promise<Map<MemberId, MemberLifecycleState>> {
  const unique = [...new Set(memberIds)];
  // Seeded with the initial state for EVERY requested id, so a member with an empty stream is
  // present-and-correct rather than absent-and-defaulted-by-the-caller.
  const out = new Map<MemberId, MemberLifecycleState>(
    unique.map((id) => [id, replayMemberState([])]),
  );
  if (unique.length === 0) return out;

  for (let i = 0; i < unique.length; i += MEMBER_STATE_REPLAY_CHUNK_SIZE) {
    const chunk = unique.slice(i, i + MEMBER_STATE_REPLAY_CHUNK_SIZE);
    const rows = await db
      .select()
      .from(eventsLog)
      .where(inArray(eventsLog.streamId, chunk))
      .orderBy(asc(eventsLog.eventVersion));

    // Group in memory, then fold each stream on its own. Ordered by `event_version` in SQL, so the
    // per-stream slices stay in replay order without a second sort (`occurred_at` CAN tie inside one
    // transaction — the monotonic version is the only deterministic key).
    const byStream = new Map<string, (typeof rows)[number][]>();
    for (const row of rows) {
      const bucket = byStream.get(row.streamId);
      if (bucket) bucket.push(row);
      else byStream.set(row.streamId, [row]);
    }
    for (const id of chunk) {
      const stream = byStream.get(id);
      if (stream !== undefined) out.set(id, replayMemberState(stream));
    }
  }

  return out;
}

/**
 * The member's tenure-anchor instant: the `occurred_at` of the FIRST `member.signup_initiated`
 * event at/before `atTimestamp`, or `null` when the member had not signed up by then. Story 4.6's
 * Validity Service reads this as the `joined_at` anchor for the calendar-correct
 * `valid_membership_years` derivation (the schema has NO `joined_at` column — the anchor lives only
 * in the signup event's `occurred_at`; events.ts:238 / SignupInitiatedPayloadSchema carries no date
 * field). Ordered by `event_version` ASC (mirror `getMemberStateAt`'s replay ordering — monotonic,
 * tie-free) so the FIRST signup is deterministic. Reads `events_log` directly (domain owns it;
 * cannot import `@twt/events` — the cycle; see this module's header). RLS-scoped by `stream_id`.
 */
export async function getMemberSignupInstantAt(
  db: Db,
  memberId: MemberId,
  atTimestamp: Date,
): Promise<Date | null> {
  const rows = await db
    .select({ occurredAt: eventsLog.occurredAt })
    .from(eventsLog)
    .where(
      and(
        eq(eventsLog.streamId, memberId),
        eq(eventsLog.eventType, 'member.signup_initiated'),
        lte(eventsLog.occurredAt, atTimestamp),
      ),
    )
    .orderBy(asc(eventsLog.eventVersion))
    .limit(1);
  return rows[0]?.occurredAt ?? null;
}

/**
 * The lock-in clock snapshot Story 3.7's home-screen widget keys off. All three figures derive from
 * the `member.lock_in_entered` MARKER event (the clock-start; see events.ts:94-96): `enteredAt` is its
 * `occurred_at`, and the two snapshot fields come from its WIDENED payload (the AUTHORITATIVE record —
 * `members.lock_in_days_at_join` is only a read-cache mirror; events.ts:138-154).
 */
export interface LockInClock {
  enteredAt: Date;
  lockInDaysAtJoin: number;
  lockInPolicyVersion: string;
}

/**
 * Pure: map the most-recent `member.lock_in_entered` row (the targeted query result) to the clock
 * snapshot, or `null` when there is no such event OR its payload is malformed. Extracted as a DB-free
 * seam so the snapshot/parse logic is unit-testable with replay fixtures (mirrors how `getMemberStateAt`
 * delegates to the pure `replayMemberState`). `.safeParse` keeps a malformed payload non-throwing —
 * treated as `null`, the same discipline as `resolveLockInPolicy` (lock-in.ts:64).
 */
export function deriveLockInClock(
  row: { occurredAt: Date; payload: unknown } | undefined,
): LockInClock | null {
  if (!row) return null;
  const parsed = LockInEnteredPayloadSchema.safeParse(row.payload);
  if (!parsed.success) return null;
  return {
    enteredAt: row.occurredAt,
    lockInDaysAtJoin: parsed.data.lock_in_days_at_join,
    lockInPolicyVersion: parsed.data.lock_in_policy_version,
  };
}

/**
 * Read a member's lock-in clock snapshot for the Story 3.7 widget: the SINGLE most-recent
 * `member.lock_in_entered` event on the stream (ordered by `event_version` DESC — the opposite sort
 * of `getMemberStateAt`'s ASC replay, because here we want the latest marker, not a forward replay).
 * Returns `null` when the member never entered lock-in (no such event) or the payload is malformed.
 *
 * Reads `events_log` directly via Drizzle — domain owns the table and cannot import `@twt/events` (the
 * cycle; see this module's header). Tenant scope is enforced by RLS (the caller set `app.pariwar_id`);
 * the query filters by `stream_id` (= member_id), which is globally unique.
 */
export async function getLockInClock(
  db: Db,
  memberId: MemberId,
  atTimestamp: Date,
): Promise<LockInClock | null> {
  const rows = await db
    .select()
    .from(eventsLog)
    .where(
      and(
        eq(eventsLog.streamId, memberId),
        eq(eventsLog.eventType, 'member.lock_in_entered'),
        lte(eventsLog.occurredAt, atTimestamp),
      ),
    )
    .orderBy(desc(eventsLog.eventVersion))
    .limit(1);
  return deriveLockInClock(rows[0]);
}
