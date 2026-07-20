// Persisted-state projector — Story 8.1 (Task 6; AC3/AC5). Twin of pool/project.ts.
//
// THE SINGLE LEGITIMATE WRITER to `alerts.current_state`. In ONE transaction it:
//   1. appends the alert's next lifecycle event to `events_log`,
//   2. replays the full stream → the new lifecycle state,
//   3. writes the cached `alerts.current_state` + `state_event_version` to that result.
// Steps (1) and (3) share the transaction so downstream consumers never see a torn view
// (cache-invalidation invariant — architecture §1.14).
//
// ── Why it inserts into events_log directly (not via @twt/events.appendEvent) ──
// `@twt/events` depends on `@twt/domain`; importing `@twt/events` here would create a
// `domain → events → domain` package cycle that breaks turbo's task graph. Domain DEFINES
// + OWNS the `events_log` table, so inserting into it directly is legitimate. This mirrors
// appendEvent's optimistic-concurrency contract (next version = head + 1; the
// `(stream_id, event_version)` unique index is the backstop → concurrency conflict on a race).
//
// ── The trigger guard ─────────────────────────────────────────────────────────
// Before writing `alerts.current_state` the projector sets `SET LOCAL app.alert_state_writer
// = 'on'` (transaction-scoped). The BEFORE INSERT OR UPDATE trigger on `alerts` (migration
// 0078, AC5) rejects any current_state write while this guard is not 'on'. `SET LOCAL`
// requires a raw pg client, so the projector takes a `pg.PoolClient` — NOT a Drizzle `Db` —
// and binds its own scoped Db to that client.
//
// ── Transaction contract ──────────────────────────────────────────────────────
// MUST be called inside an active transaction with the pariwar scope already set (the
// caller opens BEGIN + setPariwarScope, then calls this). The projector does NOT open or
// commit its own transaction.
//
// ── Idempotent cycle-open (AC2/AC3) ───────────────────────────────────────────
// `mintAndOpenAlert` is the cycle-open driver: it derives the deterministic alert_id,
// short-circuits if the alert already exists (a sequential redelivery), and otherwise
// appends alert.frozen (genesis) → alert.published → alert.live and upserts the projection
// to `live`. A CONCURRENT redelivery races on the genesis (stream_id, event_version=1) slot
// → exactly one wins, the other no-ops. No second alert is ever minted.
//
// ── Reused stream-concurrency detection ───────────────────────────────────────
// `isPoolStreamVersionConflict` / `PoolStreamConcurrencyError` are the GENERIC events_log
// (stream_id, event_version) unique-violation detector + error — already reused by the
// cycle-stream appender (pool/spawn.ts). Reused here for the alert stream (not pool-specific).

import { and, asc, eq, sql } from 'drizzle-orm';
import type pg from 'pg';
import type { z } from 'zod';

import { bindScopedDb } from '../db.js';
import { pariwarId as toPariwarId } from '../ids/index.js';
import type { AlertId, CycleFreezeCommitId, PariwarId } from '../ids/index.js';
import { eventsLog } from '../schema/events_log.js';
import { alerts } from '../schema/alerts.js';
import { PoolStreamConcurrencyError, isPoolStreamVersionConflict } from '../pool/errors.js';
import { CycleFrozenPayloadSchema, type CycleFrozenPayload } from '../pool/cycle-events.js';
import { getActiveDegradedMode } from '../degraded-mode/index.js';
import { DEGRADED_MODE_MODES } from '../schema/pariwar_degraded_mode_declarations.js';
import {
  ALERT_EVENT_PAYLOAD_SCHEMAS,
  type AlertEventType,
  type AlertFrozenPayload,
} from './events.js';
import { deriveAlertId } from './id.js';
import { type AlertLifecycleState, replayAlertState } from './state.js';

/**
 * The degraded-mode kind that enables the AR-66 cycle-open SMS bridge (AC4). When a
 * declaration of THIS mode is active for the cycle's Pariwar at cycle-open, the emitted
 * `alert.published` carries `time_critical: true` (the AR-18 cost-optimization override
 * Story 8.8's dispatcher + Story 5.8's bridge consume). The v1 degraded-mode kind
 * (degraded-mode/declarations.ts: "v1 `'cycle_open_sms_bridge'`"). Read from the schema's
 * ONE authority tuple (DEGRADED_MODE_MODES), never a hardcoded literal, so a v2 mode rename
 * is a schema change, not a silent drift here.
 */
export const CYCLE_OPEN_SMS_BRIDGE_MODE: string = DEGRADED_MODE_MODES[0];

export interface ProjectAlertStateInput {
  /** The alert id == the events_log stream_id (caller-supplied; == the stream head). */
  alertId: AlertId;
  /** The cycle boundary (cycle_freeze_commits.commit_id — no `cycles` table). */
  cycleId: CycleFreezeCommitId;
  /** Tenant scope (must match `app.pariwar_id` set on the transaction). */
  pariwarId: PariwarId;
  /** N — the cycle's pool count (copied from cycle.frozen). Written on the genesis INSERT. */
  poolCount: number;
  /** WHO minted the alert (the trustee attestation actor_id from cycle.frozen). Written on
   *  the genesis INSERT; NON-PII, text NOT NULL (mirrors cycle_freeze_commits.actor_id). */
  createdByActor: string;
  /** One of the 5 `alert.*` event types. */
  eventType: AlertEventType;
  /** Event payload — validated against the event's strict Zod schema before insert. */
  payload: unknown;
  /** events_log.actor_id — NULL = system (the cycle-open trigger is a system actor). */
  actorId: string | null;
  /** Optional explicit event UUID for idempotent re-append; DB default otherwise. */
  eventId?: string;
  /** The freeze-transition audit anchor (AC1). Threaded to `alerts.audit_id` on the first row. */
  auditId?: string;
}

export interface ProjectAlertStateResult {
  eventId: string;
  eventVersion: number;
  /** The replay-derived lifecycle state now cached in `alerts.current_state`. */
  state: AlertLifecycleState;
}

/**
 * Append an alert lifecycle event and project the new state into `alerts.current_state`,
 * atomically. Returns the appended event's id/version + the new state.
 *
 * @throws ZodError                    if `payload` fails the event's strict schema.
 * @throws PoolStreamConcurrencyError  on a `(stream_id, event_version)` race.
 */
export async function projectAlertState(
  client: pg.PoolClient,
  input: ProjectAlertStateInput,
): Promise<ProjectAlertStateResult> {
  // (0) Fail-fast payload validation (defense-in-depth alongside the JSONB column). Guarded
  // lookup — a future caller may reach this with an untyped/typo'd string; an unguarded index
  // would throw an opaque "cannot read properties of undefined" instead of a diagnosable error.
  const payloadSchema: z.ZodTypeAny | undefined = ALERT_EVENT_PAYLOAD_SCHEMAS[input.eventType];
  if (!payloadSchema) {
    throw new Error(`[projectAlertState] unknown alert event type: ${String(input.eventType)}`);
  }
  const parsedPayload = payloadSchema.parse(input.payload) as { actor: string };

  // Every alert.* payload carries the §1.14 audit-shape `actor` field. Cross-check it against
  // the caller-supplied `actorId` so the audit-shape's attribution can never silently disagree
  // with the durable `events_log.actor_id` column — NULL means system (the docstring's contract).
  const isSystemActor = parsedPayload.actor === 'system';
  const hasNullActorId = input.actorId === null;
  if (isSystemActor !== hasNullActorId) {
    throw new Error(
      `[projectAlertState] actor/actorId mismatch: payload.actor='${parsedPayload.actor}' requires actorId ` +
        `${isSystemActor ? '=== null' : '!== null'}, got ${input.actorId === null ? 'null' : `'${input.actorId}'`}`,
    );
  }

  const db = bindScopedDb(client);

  // (1) Determine the next version from the current stream head (event_version-ordered — the
  //     monotonic authority), then append.
  const existing = await db
    .select()
    .from(eventsLog)
    .where(eq(eventsLog.streamId, input.alertId))
    .orderBy(asc(eventsLog.eventVersion));

  // (1a) Genesis guards — the first event on an alert's stream MUST be alert.frozen, and
  // alert.frozen is ONLY ever a genesis event. Together these forbid both (i) creating an
  // alerts row directly in a non-initial state with no genesis event and (ii) re-appending a
  // second alert.frozen onto an existing stream (a duplicate-genesis corruption). The normal
  // idempotent-redelivery path never reaches (ii): mintAndOpenAlert short-circuits first.
  if (existing.length === 0 && input.eventType !== 'alert.frozen') {
    throw new Error(
      `[projectAlertState] first event for a new alert stream must be 'alert.frozen', got '${input.eventType}'`,
    );
  }
  if (existing.length > 0 && input.eventType === 'alert.frozen') {
    throw new Error(
      `[projectAlertState] 'alert.frozen' is a genesis-only event; the alert stream ${input.alertId} already has ${String(existing.length)} event(s)`,
    );
  }

  // (1b) Cross-validate the flat genesis-identity input fields against the SAME values embedded
  // (and Zod-validated) in the alert.frozen payload — a caller passing mismatched copies would
  // otherwise produce an alerts row that permanently disagrees with its own genesis event.
  if (input.eventType === 'alert.frozen') {
    const frozen = parsedPayload as unknown as AlertFrozenPayload;
    const mismatches: string[] = [];
    if (input.cycleId !== frozen.cycle_id) mismatches.push('cycleId');
    if (input.pariwarId !== frozen.pariwar_id) mismatches.push('pariwarId');
    if (input.poolCount !== frozen.pool_count) mismatches.push('poolCount');
    if (input.createdByActor !== frozen.attestation.actor_id) mismatches.push('createdByActor');
    if (mismatches.length > 0) {
      throw new Error(`[projectAlertState] alert.frozen input/payload mismatch on: ${mismatches.join(', ')}`);
    }
  }

  const nextVersion = (existing.at(-1)?.eventVersion ?? 0) + 1;

  let inserted;
  try {
    const rows = await db
      .insert(eventsLog)
      .values({
        ...(input.eventId !== undefined ? { eventId: input.eventId } : {}),
        streamId: input.alertId,
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
      throw new PoolStreamConcurrencyError(input.alertId, nextVersion);
    }
    throw err;
  }
  if (!inserted) throw new Error('[projectAlertState] event insert returned no row');

  // (2) Replay the full stream (existing + the new event, same event_version order) → new state.
  const newState = replayAlertState([...existing, inserted]);

  // (3) Write the state cache under the trigger guard. INSERT on the first event (the BEFORE
  //     INSERT trigger requires the guard too — migration 0078); UPDATE thereafter.
  await client.query("SET LOCAL app.alert_state_writer = 'on'");
  try {
    await db
      .insert(alerts)
      .values({
        alertId: input.alertId,
        cycleId: input.cycleId,
        pariwarId: input.pariwarId,
        poolCount: input.poolCount,
        currentState: newState,
        stateEventVersion: inserted.eventVersion,
        createdByActor: input.createdByActor,
        ...(input.auditId !== undefined ? { auditId: input.auditId } : {}),
      })
      .onConflictDoUpdate({
        target: alerts.alertId,
        set: {
          currentState: newState,
          stateEventVersion: inserted.eventVersion,
          updatedAt: sql`now()`,
        },
      });
  } finally {
    // Reset the guard immediately (defense-in-depth) — it is also tx-scoped, so a
    // rollback/commit clears it regardless. Best-effort only: if the upsert above already
    // aborted the transaction, this query can itself throw (25P02); swallow that so it never
    // masks the real error the caller needs to see (the Story 6.1 review finding).
    try {
      await client.query("SET LOCAL app.alert_state_writer = 'off'");
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

export interface MintAndOpenAlertInput {
  /** The `cycle.frozen` payload (the cycle-open trigger loaded it from the cycle stream). */
  cycleFrozenPayload: CycleFrozenPayload;
  /** The AR-18 cost-optimization override (AC4): `true` iff a `cycle_open_sms_bridge`
   *  degraded-mode declaration is active for the cycle's Pariwar at cycle-open. The caller
   *  (the apps/jobs worker / apps/api service) resolves this via getActiveDegradedMode.
   *  Defaults to `false`. Carried onto the emitted `alert.published` payload. */
  timeCritical?: boolean;
  /** Optional freeze-transition audit anchor threaded onto `alerts.audit_id`. */
  auditId?: string;
}

export interface MintAndOpenAlertResult {
  readonly alertId: AlertId;
  /** `false` on the idempotent no-op path (the alert was already minted by a prior/concurrent
   *  delivery of the same cycle.frozen). */
  readonly minted: boolean;
  /** The alert's current lifecycle state after this call (`live` on the mint path; the
   *  existing state on the no-op path). */
  readonly state: AlertLifecycleState;
}

/**
 * The cycle-open driver (AC3): mint the cycle's canonical alert and drive it to `live`.
 * Derives `alert_id = deriveAlertId(cycle_id)`, then — in the caller's transaction — appends
 * the genesis `alert.frozen` → `alert.published` → `alert.live` and upserts the projection to
 * `live`. Idempotent: a sequential redelivery short-circuits at the existence check; a
 * concurrent redelivery races on the genesis (stream_id, event_version=1) slot → exactly one
 * wins, the other no-ops. No second alert is ever minted (AC2).
 *
 * The alert.frozen genesis copies `cycle_id`, `pariwar_id`, `pool_count`, `pool_ids`, and the
 * trustee `attestation` from the cycle.frozen payload (never reconstructed). The alert.published
 * carries `time_critical` (AC4). The alert lifecycle actor is `system` (events_log.actor_id =
 * null); `alerts.created_by_actor` records the freeze committer's attestation actor_id.
 */
export async function mintAndOpenAlert(
  client: pg.PoolClient,
  input: MintAndOpenAlertInput,
): Promise<MintAndOpenAlertResult> {
  const { cycleFrozenPayload: cf } = input;
  const alertId = deriveAlertId(cf.cycle_id);
  const db = bindScopedDb(client);

  // (1) Fast-path idempotency: the alert row already exists → no-op (sequential redelivery).
  const existingAlert = await db
    .select({ currentState: alerts.currentState })
    .from(alerts)
    .where(eq(alerts.alertId, alertId));
  if (existingAlert[0]) {
    return { alertId, minted: false, state: existingAlert[0].currentState };
  }

  const cycleId = cf.cycle_id as CycleFreezeCommitId;
  const pariwarId = cf.pariwar_id as PariwarId;
  const createdByActor = cf.attestation.actor_id;
  const timeCritical = input.timeCritical ?? false;

  // Genesis alert.frozen payload — the cycle identity + pool set + attestation copied VERBATIM
  // from cycle.frozen (never reconstructed — [[feedback_record_unattested_no_backfill]]).
  const frozenPayload: AlertFrozenPayload = {
    from_state: 'draft',
    to_state: 'frozen',
    trigger: 'cycle.frozen:cycle_open',
    actor: 'system',
    cycle_id: cf.cycle_id,
    pariwar_id: cf.pariwar_id,
    pool_count: cf.pool_count,
    pool_ids: cf.pool_ids,
    attestation: cf.attestation,
  };

  const common = {
    alertId,
    cycleId,
    pariwarId,
    poolCount: cf.pool_count,
    createdByActor,
    actorId: null,
    ...(input.auditId !== undefined ? { auditId: input.auditId } : {}),
  } as const;

  // (2) Genesis: draft → frozen (creates the alerts row). ONLY this append can legitimately race
  // a concurrent redelivery (it is the sole insert competing for the stream's event_version=1
  // slot — the fast-path existence check above means at most one caller ever gets past it). The
  // catch is scoped to this call alone (Review Finding) so a conflict at the published/live steps
  // below — which should be structurally unreachable once genesis has committed this caller as
  // the stream's sole writer — is never misdiagnosed as the same idempotent no-op and silently
  // masked; it propagates as a real error instead.
  try {
    await projectAlertState(client, { ...common, eventType: 'alert.frozen', payload: frozenPayload });
  } catch (err) {
    // A concurrent redelivery raced past the fast-path existence check: the genesis append lost
    // the (stream_id, event_version=1) slot → another delivery already minted this alert. No-op.
    if (isPoolStreamVersionConflict(err) || err instanceof PoolStreamConcurrencyError) {
      const raced = await db
        .select({ currentState: alerts.currentState })
        .from(alerts)
        .where(eq(alerts.alertId, alertId));
      if (raced[0]) return { alertId, minted: false, state: raced[0].currentState };
    }
    throw err;
  }

  // (3) frozen → published (carries the AR-18 time_critical signal, AC4).
  await projectAlertState(client, {
    ...common,
    eventType: 'alert.published',
    payload: {
      from_state: 'frozen',
      to_state: 'published',
      trigger: 'cycle.frozen:cycle_open',
      actor: 'system',
      time_critical: timeCritical,
    },
  });
  // (4) published → live (contribution window open — the ratified D10 extension).
  const live = await projectAlertState(client, {
    ...common,
    eventType: 'alert.live',
    payload: {
      from_state: 'published',
      to_state: 'live',
      trigger: 'cycle.frozen:cycle_open',
      actor: 'system',
    },
  });
  return { alertId, minted: true, state: live.state };
}

/**
 * Load a cycle's `cycle.frozen` payload from its event stream (stream_id = cycle_id). Returns
 * the parsed, schema-validated payload, or `null` when the cycle has no `cycle.frozen` yet (a
 * cycle-open trigger fired for an unfrozen cycle — a race the caller decides how to handle).
 * RLS-scoped by the caller's transaction. Reads the durable event, never reconstructs it
 * ([[feedback_record_unattested_no_backfill]]).
 */
export async function loadCycleFrozenPayload(
  db: ReturnType<typeof bindScopedDb>,
  cycleId: string,
): Promise<CycleFrozenPayload | null> {
  const rows = await db
    .select({ payload: eventsLog.payload })
    .from(eventsLog)
    .where(and(eq(eventsLog.streamId, cycleId), eq(eventsLog.eventType, 'cycle.frozen')))
    .orderBy(asc(eventsLog.eventVersion))
    .limit(1);
  if (!rows[0]) return null;
  // Review Finding: a corrupt/malformed stored payload should fail with a diagnosable message,
  // not an opaque raw ZodError bubbling into pg-boss's indefinite retry loop.
  try {
    return CycleFrozenPayloadSchema.parse(rows[0].payload);
  } catch (err) {
    throw new Error(`[loadCycleFrozenPayload] malformed cycle.frozen payload for cycle ${cycleId}: ${String(err)}`);
  }
}

export interface OpenCycleAlertInput {
  /** The cycle boundary (== cycle_freeze_commits.commit_id == the cycle stream_id). */
  cycleId: string;
  /** Optional freeze-transition audit anchor threaded onto `alerts.audit_id`. */
  auditId?: string;
}

export interface OpenCycleAlertResult extends MintAndOpenAlertResult {
  /** `true` iff the AR-18 SMS-bridge signal was set (a `cycle_open_sms_bridge` declaration
   *  was active for the Pariwar at the cycle-freeze instant). Carried onto alert.published. */
  readonly timeCritical: boolean;
}

/**
 * The COMPOSED cycle-open orchestration (AC3/AC4) — the ONE definition the apps/jobs
 * cycle-open worker AND the apps/api alert.service call (the shepherd-hook "one definition,
 * both call sites" discipline). In the caller's scoped transaction it:
 *   1. loads the cycle's `cycle.frozen` payload (throws if absent — a cycle-open trigger
 *      only fires AFTER the freeze, so a missing payload is a real defect, not a no-op),
 *   2. resolves the AR-18 `time_critical` signal by reading the Pariwar's degraded-mode
 *      state AT the cycle-freeze `committed_at` (deterministic + replay-stable — the same
 *      durable instant the spawn saga uses; a `cycle_open_sms_bridge` declaration ⇒ true),
 *   3. mints + drives the alert to `live` via {@link mintAndOpenAlert} (idempotent).
 *
 * The caller opens BEGIN + setPariwarScope and passes the raw client; this does NOT open or
 * commit its own transaction.
 */
export async function openCycleAlert(
  client: pg.PoolClient,
  input: OpenCycleAlertInput,
): Promise<OpenCycleAlertResult> {
  const db = bindScopedDb(client);

  const cf = await loadCycleFrozenPayload(db, input.cycleId);
  if (!cf) {
    throw new Error(
      `[openCycleAlert] no cycle.frozen event on cycle stream ${input.cycleId} — the cycle-open trigger fires only after the freeze; refusing to mint an alert for an unfrozen cycle`,
    );
  }

  // AC4 — the SMS-bridge signal. Read the Pariwar's degraded-mode state at the cycle-freeze
  // committed_at (durable + deterministic; a live now()-read would break replay). A
  // cycle_open_sms_bridge declaration active at that instant ⇒ time_critical: true.
  const committedAt = new Date(cf.attestation.committed_at);
  const active = await getActiveDegradedMode(db, toPariwarId(cf.pariwar_id), committedAt);
  const timeCritical = active?.mode === CYCLE_OPEN_SMS_BRIDGE_MODE;

  const result = await mintAndOpenAlert(client, {
    cycleFrozenPayload: cf,
    timeCritical,
    ...(input.auditId !== undefined ? { auditId: input.auditId } : {}),
  });
  return { ...result, timeCritical };
}
