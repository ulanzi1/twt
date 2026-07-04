// Persisted-state projector — Story 3.1 (Task 4; AC2/AC3).
//
// THE SINGLE LEGITIMATE WRITER to `members.state`. In ONE transaction it:
//   1. appends the member's next lifecycle event to `events_log`,
//   2. replays the full stream → the new lifecycle state,
//   3. writes the cached `members.state` + `state_event_version` to that result.
// Steps (1) and (3) share the transaction so FR-12A validity consumers never see a
// torn view (cache-invalidation invariant — architecture §1.14 line 1272-1275 +
// Cross-Cutting #18).
//
// ── Why it inserts into events_log directly (not via @twt/events.appendEvent) ──
// `@twt/events` depends on `@twt/domain`; importing `@twt/events` here would create a
// `domain → events → domain` package cycle that breaks turbo's build/typecheck/test
// task graph. Domain DEFINES + OWNS the `events_log` table (schema/events_log.ts), so
// inserting into it directly is legitimate. This mirrors appendEvent's optimistic-
// concurrency contract (next version = head + 1; the `(stream_id, event_version)`
// unique index is the backstop → MemberStreamConcurrencyError on a race).
//
// ── The trigger guard ─────────────────────────────────────────────────────────
// Before writing `members.state` the projector sets `SET LOCAL app.member_state_writer
// = 'on'` (transaction-scoped, mirroring setPariwarScope's SET LOCAL discipline). The
// BEFORE UPDATE trigger on `members` (migration, AC3) rejects any state change while
// this guard is not 'on'. `SET LOCAL` requires a raw pg client, so the projector takes
// a `pg.PoolClient` — NOT a Drizzle `Db` — and binds its own scoped Db to that client.
//
// ── Transaction contract ──────────────────────────────────────────────────────
// MUST be called inside an active transaction with the pariwar scope already set
// (the caller — Story 3.6 signup route / the SIE scheduler / the per-test harness —
// opens BEGIN + setPariwarScope, then calls this). The projector does NOT open or
// commit its own transaction (mirror the consent accessors' "Transaction contract").

import { asc, eq, sql } from 'drizzle-orm';
import type pg from 'pg';

import { bindScopedDb } from '../db.js';
import type { MemberId, PariwarId } from '../ids/index.js';
import { eventsLog } from '../schema/events_log.js';
import { members } from '../schema/members.js';
import { MEMBER_EVENT_PAYLOAD_SCHEMAS, type MemberEventType } from './events.js';
import { MemberStreamConcurrencyError, isMemberStreamVersionConflict } from './errors.js';
import { refreshMemberSearchProjection } from './search-projection.js';
import { type MemberLifecycleState, replayMemberState } from './state.js';

export interface ProjectMemberStateInput {
  /** The member id == the events_log stream_id. */
  memberId: MemberId;
  /** Tenant scope (must match `app.pariwar_id` set on the transaction). */
  pariwarId: PariwarId;
  /** One of the 14 `member.*` event types. */
  eventType: MemberEventType;
  /** Event payload — validated against the event's strict Zod schema before insert. */
  payload: unknown;
  /** NULL = system / SIE (architecture §1.14 line 1262-1268). */
  actorId: string | null;
  /** Optional explicit event UUID for idempotent re-append (AR-58); DB default otherwise. */
  eventId?: string;
}

export interface ProjectMemberStateResult {
  eventId: string;
  eventVersion: number;
  /** The replay-derived lifecycle state now cached in `members.state`. */
  state: MemberLifecycleState;
}

/**
 * Append a member lifecycle event and project the new state into `members.state`,
 * atomically. Returns the appended event's id/version + the new state.
 *
 * @throws ZodError                       if `payload` fails the event's strict schema.
 * @throws MemberStreamConcurrencyError    on a `(stream_id, event_version)` race.
 */
export async function projectMemberState(
  client: pg.PoolClient,
  input: ProjectMemberStateInput,
): Promise<ProjectMemberStateResult> {
  // (0) Fail-fast payload validation (defense-in-depth alongside the JSONB column).
  MEMBER_EVENT_PAYLOAD_SCHEMAS[input.eventType].parse(input.payload);

  const db = bindScopedDb(client);

  // (1) Determine the next version from the current stream head, then append.
  const existing = await db
    .select()
    .from(eventsLog)
    .where(eq(eventsLog.streamId, input.memberId))
    .orderBy(asc(eventsLog.eventVersion));
  const nextVersion = (existing.at(-1)?.eventVersion ?? 0) + 1;

  let inserted;
  try {
    const rows = await db
      .insert(eventsLog)
      .values({
        ...(input.eventId !== undefined ? { eventId: input.eventId } : {}),
        streamId: input.memberId,
        eventType: input.eventType,
        payload: input.payload,
        eventVersion: nextVersion,
        actorId: input.actorId,
        pariwarId: input.pariwarId,
      })
      .returning();
    inserted = rows[0];
  } catch (err) {
    if (isMemberStreamVersionConflict(err)) {
      throw new MemberStreamConcurrencyError(input.memberId, nextVersion);
    }
    throw err;
  }
  if (!inserted) throw new Error('[projectMemberState] event insert returned no row');

  // (2) Replay the full stream (existing + the new event) → new lifecycle state.
  const newState = replayMemberState([...existing, inserted]);

  // (3) Write the state cache under the trigger guard. INSERT on the first event
  //     (BEFORE UPDATE trigger does not fire); UPDATE thereafter (guard allows it).
  await client.query("SET LOCAL app.member_state_writer = 'on'");
  try {
    await db
      .insert(members)
      .values({
        memberId: input.memberId,
        pariwarId: input.pariwarId,
        state: newState,
        stateEventVersion: inserted.eventVersion,
      })
      .onConflictDoUpdate({
        target: members.memberId,
        set: {
          state: newState,
          stateEventVersion: inserted.eventVersion,
          updatedAt: sql`now()`,
        },
      });
  } finally {
    // Reset the guard immediately (defense-in-depth) — it is also tx-scoped, so a
    // rollback/commit clears it regardless.
    await client.query("SET LOCAL app.member_state_writer = 'off'");
  }

  // (4) Refresh the AR-65 admin member-search compound read model (Story 4.7) in the SAME tx, so the
  //     projection never lags a state change by more than the projector's own latency (freshness =
  //     eventual consistency within the projector budget). This is the ONLY writer to
  //     member_search_projection — the write-rejection trigger enforces it structurally.
  await refreshMemberSearchProjection(client, {
    memberId: input.memberId,
    pariwarId: input.pariwarId,
    state: newState,
    stateEventVersion: inserted.eventVersion,
  });

  return { eventId: inserted.eventId, eventVersion: inserted.eventVersion, state: newState };
}
