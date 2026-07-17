// Persisted-state projector — Story 7.1 (Task 4; AC5). Twin of claim/project.ts.
//
// THE SINGLE LEGITIMATE WRITER to `pools.current_state`. In ONE transaction it:
//   1. appends the pool's next lifecycle event to `events_log`,
//   2. replays the full stream → the new lifecycle state,
//   3. writes the cached `pools.current_state` + `state_event_version` to that result.
// Steps (1) and (3) share the transaction so downstream consumers never see a torn
// view (cache-invalidation invariant — architecture §1.14 line 1272-1275).
//
// ── Why it inserts into events_log directly (not via @twt/events.appendEvent) ──
// `@twt/events` depends on `@twt/domain`; importing `@twt/events` here would create a
// `domain → events → domain` package cycle that breaks turbo's task graph. Domain
// DEFINES + OWNS the `events_log` table (schema/events_log.ts), so inserting into it
// directly is legitimate. This mirrors appendEvent's optimistic-concurrency contract
// (next version = head + 1; the `(stream_id, event_version)` unique index is the
// backstop → PoolStreamConcurrencyError on a race).
//
// ── The trigger guard ─────────────────────────────────────────────────────────
// Before writing `pools.current_state` the projector sets `SET LOCAL
// app.pool_state_writer = 'on'` (transaction-scoped, mirroring setPariwarScope's SET
// LOCAL discipline). The BEFORE INSERT OR UPDATE trigger on `pools` (migration 0071,
// AC5) rejects any current_state write while this guard is not 'on'. `SET LOCAL`
// requires a raw pg client, so the projector takes a `pg.PoolClient` — NOT a Drizzle
// `Db` — and binds its own scoped Db to that client.
//
// ── Transaction contract ──────────────────────────────────────────────────────
// MUST be called inside an active transaction with the pariwar scope already set (the
// caller — Story 7.3 spawn saga / the per-test harness — opens BEGIN + setPariwarScope,
// then calls this). The projector does NOT open or commit its own transaction.
//
// ── Stream ordering: event_version, NOT occurred_at (AC5 — load-bearing) ──────
// The existing stream is read `ORDER BY event_version ASC` — the monotonic authority.
// `occurred_at` defaults to DB now() and CAN tie, so it is never the sort key.

import { asc, eq, sql } from 'drizzle-orm';
import type pg from 'pg';

import { bindScopedDb } from '../db.js';
import type { ClaimId, CycleFreezeCommitId, PariwarId, PoolId } from '../ids/index.js';
import { eventsLog } from '../schema/events_log.js';
import { pools } from '../schema/pools.js';
import type { PoolSupportCategory } from '../schema/pools.js';
import { POOL_EVENT_PAYLOAD_SCHEMAS, type PoolEventType, type PoolSpawnedPayloadSchema } from './events.js';
import { PoolStreamConcurrencyError, isPoolStreamVersionConflict } from './errors.js';
import { type PoolLifecycleState, replayPoolState } from './state.js';
import type { z } from 'zod';

/** The `benefit_mechanism` labels a pool row may carry (mirrors benefitMechanismEnum). */
export type PoolBenefitMechanism = 'pool' | 'reserve';

export interface ProjectPoolStateInput {
  /** The pool id == the events_log stream_id (caller-supplied; == the stream head). */
  poolId: PoolId;
  /** Tenant scope (must match `app.pariwar_id` set on the transaction). */
  pariwarId: PariwarId;
  /** The cycle boundary (cycle_freeze_commits.commit_id — no `cycles` table). */
  cycleId: CycleFreezeCommitId;
  /** The originating approved claim (the nominee-bank disbursement link — Story 6.8). */
  claimCaseId: ClaimId;
  /** 0-based index of this pool within its cycle. */
  poolIndex: number;
  /** The `P-YYYY-MM-###` identifier (Story 7.2 owns generation; the caller supplies it). */
  poolCanonicalIdentifier: string;
  /** The pool's support category (AC4). v1 supplies the sole category from the
   *  POOL_SUPPORT_CATEGORIES enum; the engine keys on the enum, never a hardcoded literal. */
  supportCategory: PoolSupportCategory;
  /** v1 pools = 'pool'. */
  benefitMechanism: PoolBenefitMechanism;
  /** The fixed contribution amount, integer WHOLE-INR, snapshotted at spawn. */
  fixedAmount: number;
  /** One of the 4 `pool.*` event types. */
  eventType: PoolEventType;
  /** Event payload — validated against the event's strict Zod schema before insert. */
  payload: unknown;
  /** NULL = system / SIE (the spawn saga is a system actor). */
  actorId: string | null;
  /** Optional explicit event UUID for idempotent re-append (AR-58); DB default otherwise. */
  eventId?: string;
  /** The freeze-transition audit anchor (AC1). Threaded to `pools.audit_id` on the first row. */
  auditId?: string;
}

export interface ProjectPoolStateResult {
  eventId: string;
  eventVersion: number;
  /** The replay-derived lifecycle state now cached in `pools.current_state`. */
  state: PoolLifecycleState;
}

/**
 * Append a pool lifecycle event and project the new state into `pools.current_state`,
 * atomically. Returns the appended event's id/version + the new state.
 *
 * @throws ZodError                    if `payload` fails the event's strict schema.
 * @throws PoolStreamConcurrencyError  on a `(stream_id, event_version)` race.
 */
export async function projectPoolState(
  client: pg.PoolClient,
  input: ProjectPoolStateInput,
): Promise<ProjectPoolStateResult> {
  // (0) Fail-fast payload validation (defense-in-depth alongside the JSONB column). The
  // schema lookup is guarded — `input.eventType` is typed as `PoolEventType`, but this
  // function is a domain primitive future callers (e.g. Story 7.3's spawn saga, or a
  // value decoded off the wire) may reach with an untyped/typo'd string; an unguarded
  // index would throw an opaque "cannot read properties of undefined" instead of a
  // diagnosable error.
  const payloadSchema: z.ZodTypeAny | undefined = POOL_EVENT_PAYLOAD_SCHEMAS[input.eventType];
  if (!payloadSchema) {
    throw new Error(`[projectPoolState] unknown pool event type: ${String(input.eventType)}`);
  }
  const parsedPayload = payloadSchema.parse(input.payload) as { actor: string };

  // Every pool.* payload carries the architecture §1.14 audit-shape `actor` field
  // (system/operator/trustee). Cross-check it against the caller-supplied `actorId` so
  // the audit-shape's attribution claim can never silently disagree with the durable
  // `events_log.actor_id` column — NULL means system (the docstring's own contract).
  const isSystemActor = parsedPayload.actor === 'system';
  const hasNullActorId = input.actorId === null;
  if (isSystemActor !== hasNullActorId) {
    throw new Error(
      `[projectPoolState] actor/actorId mismatch: payload.actor='${parsedPayload.actor}' requires actorId ` +
        `${isSystemActor ? '=== null' : '!== null'}, got ${input.actorId === null ? 'null' : `'${input.actorId}'`}`,
    );
  }

  const db = bindScopedDb(client);

  // (1) Determine the next version from the current stream head (event_version-ordered,
  //     NOT occurred_at — the monotonic authority), then append.
  const existing = await db
    .select()
    .from(eventsLog)
    .where(eq(eventsLog.streamId, input.poolId))
    .orderBy(asc(eventsLog.eventVersion));

  // (1a) Genesis guard — the first event on a pool's stream MUST be pool.spawned;
  // otherwise a pools row could be created directly in a non-initial state with no
  // spawn audit event ever recorded.
  if (existing.length === 0 && input.eventType !== 'pool.spawned') {
    throw new Error(
      `[projectPoolState] first event for a new pool stream must be 'pool.spawned', got '${input.eventType}'`,
    );
  }

  // (1b) Cross-validate the flat spawn-identity input fields against the SAME values
  // embedded (and Zod-validated) in the pool.spawned payload — a caller passing
  // mismatched copies would otherwise produce a pools row that permanently disagrees
  // with its own genesis event.
  if (input.eventType === 'pool.spawned') {
    const spawnPayload = parsedPayload as unknown as z.infer<typeof PoolSpawnedPayloadSchema>;
    const mismatches: string[] = [];
    if (input.cycleId !== spawnPayload.cycle_id) mismatches.push('cycleId');
    if (input.poolIndex !== spawnPayload.pool_index) mismatches.push('poolIndex');
    if (input.poolCanonicalIdentifier !== spawnPayload.pool_canonical_identifier) {
      mismatches.push('poolCanonicalIdentifier');
    }
    if (input.supportCategory !== spawnPayload.support_category) mismatches.push('supportCategory');
    if (input.benefitMechanism !== spawnPayload.benefit_mechanism) mismatches.push('benefitMechanism');
    if (input.fixedAmount !== spawnPayload.fixed_amount) mismatches.push('fixedAmount');
    if (mismatches.length > 0) {
      throw new Error(`[projectPoolState] pool.spawned input/payload mismatch on: ${mismatches.join(', ')}`);
    }
  }

  const nextVersion = (existing.at(-1)?.eventVersion ?? 0) + 1;

  let inserted;
  try {
    const rows = await db
      .insert(eventsLog)
      .values({
        ...(input.eventId !== undefined ? { eventId: input.eventId } : {}),
        streamId: input.poolId,
        eventType: input.eventType,
        payload: input.payload,
        eventVersion: nextVersion,
        actorId: input.actorId,
        pariwarId: input.pariwarId,
      })
      .returning();
    inserted = rows[0];
  } catch (err) {
    if (isPoolStreamVersionConflict(err)) {
      throw new PoolStreamConcurrencyError(input.poolId, nextVersion);
    }
    throw err;
  }
  if (!inserted) throw new Error('[projectPoolState] event insert returned no row');

  // (2) Replay the full stream (existing + the new event, same event_version order) →
  //     new lifecycle state.
  const newState = replayPoolState([...existing, inserted]);

  // (3) Write the state cache under the trigger guard. INSERT on the first event (the
  //     BEFORE INSERT trigger requires the guard too — migration 0071); UPDATE thereafter.
  await client.query("SET LOCAL app.pool_state_writer = 'on'");
  try {
    await db
      .insert(pools)
      .values({
        poolId: input.poolId,
        pariwarId: input.pariwarId,
        cycleId: input.cycleId,
        claimCaseId: input.claimCaseId,
        poolIndex: input.poolIndex,
        poolCanonicalIdentifier: input.poolCanonicalIdentifier,
        supportCategory: input.supportCategory,
        benefitMechanism: input.benefitMechanism,
        fixedAmount: input.fixedAmount,
        currentState: newState,
        stateEventVersion: inserted.eventVersion,
        createdByActor: input.actorId,
        ...(input.auditId !== undefined ? { auditId: input.auditId } : {}),
      })
      .onConflictDoUpdate({
        target: pools.poolId,
        set: {
          currentState: newState,
          stateEventVersion: inserted.eventVersion,
          updatedAt: sql`now()`,
        },
      });
  } finally {
    // Reset the guard immediately (defense-in-depth) — it is also tx-scoped, so a
    // rollback/commit clears it regardless. Best-effort only: if the upsert above
    // already aborted the transaction, this query can itself throw (25P02, "current
    // transaction is aborted"); swallow that so it never masks the real error the
    // caller needs to see (the Story 6.1 review finding).
    try {
      await client.query("SET LOCAL app.pool_state_writer = 'off'");
    } catch {
      // transaction already aborted — guard clears on rollback regardless.
    }
  }

  return {
    eventId: inserted.eventId,
    eventVersion: inserted.eventVersion,
    state: newState,
  };
}
