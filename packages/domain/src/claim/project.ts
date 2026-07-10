// Persisted-state projector — Story 6.1 (Task 4; AC3/AC4). Twin of member/project.ts.
//
// THE SINGLE LEGITIMATE WRITER to `claims.current_state`. In ONE transaction it:
//   1. appends the claim's next lifecycle event to `events_log`,
//   2. replays the full stream → the new lifecycle state,
//   3. writes the cached `claims.current_state` + `state_event_version` to that result.
// Steps (1) and (3) share the transaction so FR-12A validity / overlay consumers
// never see a torn view (cache-invalidation invariant — architecture §1.14 line
// 1272-1275 + Cross-Cutting #18).
//
// ── Why it inserts into events_log directly (not via @twt/events.appendEvent) ──
// `@twt/events` depends on `@twt/domain`; importing `@twt/events` here would create a
// `domain → events → domain` package cycle that breaks turbo's build/typecheck/test
// task graph. Domain DEFINES + OWNS the `events_log` table (schema/events_log.ts), so
// inserting into it directly is legitimate. This mirrors appendEvent's optimistic-
// concurrency contract (next version = head + 1; the `(stream_id, event_version)`
// unique index is the backstop → ClaimStreamConcurrencyError on a race).
//
// ── The trigger guard ─────────────────────────────────────────────────────────
// Before writing `claims.current_state` the projector sets `SET LOCAL
// app.claim_state_writer = 'on'` (transaction-scoped, mirroring setPariwarScope's SET
// LOCAL discipline). The BEFORE UPDATE trigger on `claims` (migration, AC3) rejects
// any current_state change while this guard is not 'on'. `SET LOCAL` requires a raw pg
// client, so the projector takes a `pg.PoolClient` — NOT a Drizzle `Db` — and binds
// its own scoped Db to that client.
//
// ── Transaction contract ──────────────────────────────────────────────────────
// MUST be called inside an active transaction with the pariwar scope already set (the
// caller — Story 6.2 intake route / the per-test harness — opens BEGIN +
// setPariwarScope, then calls this). The projector does NOT open or commit its own
// transaction (mirror the member/consent accessors' "Transaction contract").
//
// ── Stream ordering: event_version, NOT occurred_at (AC3 — load-bearing) ──────
// The existing stream is read `ORDER BY event_version ASC` — the monotonic authority.
// `occurred_at` defaults to DB now() and CAN tie, so it is never the sort key. The
// replay input order therefore matches the append order, keeping fold ≡ step*.

import { asc, eq, sql } from 'drizzle-orm';
import type pg from 'pg';

import { bindScopedDb } from '../db.js';
import type { ClaimId, MemberId, PariwarId } from '../ids/index.js';
import { eventsLog } from '../schema/events_log.js';
import { claims } from '../schema/claims.js';
import type { ClaimIntakeChannel } from '../schema/claims.js';
import { CLAIM_EVENT_PAYLOAD_SCHEMAS, type ClaimEventType } from './events.js';
import { ClaimStreamConcurrencyError, isClaimStreamVersionConflict } from './errors.js';
import { type ClaimLifecycleState, replayClaimState } from './state.js';

export interface ProjectClaimStateInput {
  /** The claim case id == the events_log stream_id (caller-supplied; == the stream head). */
  claimCaseId: ClaimId;
  /** Tenant scope (must match `app.pariwar_id` set on the transaction). */
  pariwarId: PariwarId;
  /** The deceased member this claim is filed against (branded MemberId). */
  deceasedMemberId: MemberId;
  /** The intake-channel SET for the claim row (ICP may converge multiple; Story 6.4). */
  intakeChannels: readonly ClaimIntakeChannel[];
  /** The filer (nominee / operator); NULL for a trustee-initiated claim. */
  claimantActorId: string | null;
  /** One of the 22 `claim.*` event types. */
  eventType: ClaimEventType;
  /** Event payload — validated against the event's strict Zod schema before insert. */
  payload: unknown;
  /** NULL = system / SIE (architecture §1.14 line 1262-1268). */
  actorId: string | null;
  /** Optional explicit event UUID for idempotent re-append (AR-58); DB default otherwise. */
  eventId?: string;
  /**
   * Caller-supplied audit id (AC4 "audit-transparent … caller-supplied auditId
   * threaded"), mirroring the member/consent accessors. Transport-free: the
   * projector does not write an audit row itself — the CALLER owns the
   * audit-or-throw obligation and correlates its own audit write to this id.
   * Optional because Story 6.1 has no live caller yet (Story 6.2/6.3 are first);
   * when supplied, it is threaded straight through to the result unchanged.
   */
  auditId?: string;
}

export interface ProjectClaimStateResult {
  eventId: string;
  eventVersion: number;
  /** The replay-derived lifecycle state now cached in `claims.current_state`. */
  state: ClaimLifecycleState;
  /** Echoes `input.auditId` unchanged (AC4) — `undefined` when the caller supplied none. */
  auditId: string | undefined;
}

/**
 * Append a claim lifecycle event and project the new state into `claims.current_state`,
 * atomically. Returns the appended event's id/version + the new state.
 *
 * @throws ZodError                     if `payload` fails the event's strict schema.
 * @throws ClaimStreamConcurrencyError  on a `(stream_id, event_version)` race.
 */
export async function projectClaimState(
  client: pg.PoolClient,
  input: ProjectClaimStateInput,
): Promise<ProjectClaimStateResult> {
  // (0) Fail-fast payload validation (defense-in-depth alongside the JSONB column).
  CLAIM_EVENT_PAYLOAD_SCHEMAS[input.eventType].parse(input.payload);

  const db = bindScopedDb(client);

  // (1) Determine the next version from the current stream head (event_version-ordered,
  //     NOT occurred_at — the monotonic authority), then append.
  const existing = await db
    .select()
    .from(eventsLog)
    .where(eq(eventsLog.streamId, input.claimCaseId))
    .orderBy(asc(eventsLog.eventVersion));
  const nextVersion = (existing.at(-1)?.eventVersion ?? 0) + 1;

  let inserted;
  try {
    const rows = await db
      .insert(eventsLog)
      .values({
        ...(input.eventId !== undefined ? { eventId: input.eventId } : {}),
        streamId: input.claimCaseId,
        eventType: input.eventType,
        payload: input.payload,
        eventVersion: nextVersion,
        actorId: input.actorId,
        pariwarId: input.pariwarId,
      })
      .returning();
    inserted = rows[0];
  } catch (err) {
    if (isClaimStreamVersionConflict(err)) {
      throw new ClaimStreamConcurrencyError(input.claimCaseId, nextVersion);
    }
    throw err;
  }
  if (!inserted) throw new Error('[projectClaimState] event insert returned no row');

  // (2) Replay the full stream (existing + the new event, same event_version order) →
  //     new lifecycle state.
  const newState = replayClaimState([...existing, inserted]);

  // (3) Write the state cache under the trigger guard. INSERT on the first event (the
  //     BEFORE UPDATE trigger does not fire); UPDATE thereafter (guard allows it).
  await client.query("SET LOCAL app.claim_state_writer = 'on'");
  try {
    await db
      .insert(claims)
      .values({
        claimCaseId: input.claimCaseId,
        pariwarId: input.pariwarId,
        deceasedMemberId: input.deceasedMemberId,
        claimantActorId: input.claimantActorId,
        intakeChannels: [...input.intakeChannels],
        currentState: newState,
        stateEventVersion: inserted.eventVersion,
        createdByActor: input.actorId,
      })
      .onConflictDoUpdate({
        target: claims.claimCaseId,
        set: {
          currentState: newState,
          stateEventVersion: inserted.eventVersion,
          updatedAt: sql`now()`,
        },
      });
  } finally {
    // Reset the guard immediately (defense-in-depth) — it is also tx-scoped, so a
    // rollback/commit clears it regardless. Best-effort only: if the upsert above
    // already aborted the transaction, this query can itself throw (e.g. Postgres
    // 25P02, "current transaction is aborted"); swallow that so it never masks the
    // real error the caller needs to see (Story 6.1 review finding).
    try {
      await client.query("SET LOCAL app.claim_state_writer = 'off'");
    } catch {
      // transaction already aborted — guard clears on rollback regardless.
    }
  }

  return {
    eventId: inserted.eventId,
    eventVersion: inserted.eventVersion,
    state: newState,
    auditId: input.auditId,
  };
}
