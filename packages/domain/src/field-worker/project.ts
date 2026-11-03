// The field-worker projector — Story 13.1 (QE5, QE6, QE7, QE13; AC2, AC5). THE ONLY WRITER of `field_workers` (I1).
//
// Copy of the SHIPPED `marketplace/project.ts` shape (⛔ 12.1's story text):
//   · `projectFieldWorkerGenesis` — inside `SAVEPOINT field_worker_genesis`: the stream must be empty, append
//     `field_worker.registered` at version 1, then INSERT the row (`pending_kyc` / `pending`) under the writer var. A
//     refused genesis rolls the savepoint back, so the caller's transaction stays usable (the mobile race's loser — AC6 (d)).
//   · `projectFieldWorkerTransition` — the COMMAND has already taken the row lock and checked the guards; this checks the
//     stream HEAD equals `lockedRow.stateEventVersion` (else drift — `FieldWorkerStreamConcurrencyError`), cross-validates
//     the payload against the locked row, appends at version + 1, then the guarded UPDATE of the I1 columns. ⛔ A
//     whole-stream replay (12.1 rejected the helpdesk replay-then-append order — it deadlocks). ONE lock order everywhere:
//     row lock → `events_log` append → row UPDATE (I13).
// I4 (row = fold of the stream) is proven by a TEST that folds the stream, ⛔ by this projector replaying.
//
// ⛔ Re-exported from the barrel: the seven commands are the public write entry points (they take the row lock and check
// the guards the projector assumes). Specs import this file directly. ⛔ `withCompensatingAudit` here (QE14) — the
// caller pairs the audit line and passes its id.

import { and, eq, sql } from 'drizzle-orm';
import type pg from 'pg';
import type { ZodError } from 'zod';

import { bindScopedDb } from '../db.js';
import type { FieldWorkerId, PariwarId } from '../ids/index.js';
import { STREAM_VERSION_CONSTRAINT } from '../marketplace/errors.js';
import { rollbackToSavepoint } from '../marketplace/project.js';
import { eventsLog } from '../schema/events_log.js';
import {
  fieldWorkers,
  type FieldWorkerKycStatus,
  type FieldWorkerReasonCode,
  type FieldWorkerState,
} from '../schema/field_workers.js';
import {
  FIELD_WORKER_MOBILE_LIVE_CONSTRAINT,
  FIELD_WORKER_PARIWAR_WORKER_CONSTRAINT,
  FIELD_WORKER_PKEY_CONSTRAINT,
  FieldWorkerGenesisAlreadyExistsError,
  FieldWorkerIllegalTransitionError,
  FieldWorkerMobileAlreadyRegisteredError,
  FieldWorkerPersistError,
  FieldWorkerProjectorInputError,
  FieldWorkerStateDirectWriteError,
  FieldWorkerStreamConcurrencyError,
  isFieldWorkerStateDirectWriteError,
  uniqueViolationConstraint,
} from './errors.js';
import {
  FIELD_WORKER_EVENT_PAYLOAD_SCHEMAS,
  FieldWorkerRegisteredPayloadSchema,
  type FieldWorkerAuthorizationSnapshot,
  type FieldWorkerEventType,
  type FieldWorkerRegisteredPayload,
} from './events.js';
import { nextFieldWorkerState } from './state.js';

/** The genesis savepoint name (the caller's transaction survives a refused genesis). */
const GENESIS_SAVEPOINT = 'field_worker_genesis';

/**
 * The QE7 actor check every projector and command runs first: HUMAN ONLY — `operator` or `trustee` with a non-null
 * `actorId`. `system` and `member` are refused (I7). Throws `FieldWorkerProjectorInputError`.
 */
export function assertFieldWorkerActor(eventType: FieldWorkerEventType, actor: unknown, actorId: unknown): void {
  if (actor !== 'operator' && actor !== 'trustee') {
    throw new FieldWorkerProjectorInputError(
      `[${eventType}] actor must be 'operator' or 'trustee' (QE7 — human only); got '${String(actor)}'`,
    );
  }
  if (typeof actorId !== 'string' || actorId.length === 0) {
    throw new FieldWorkerProjectorInputError(`[${eventType}] a human actor needs a non-null actorId (QE7)`);
  }
}

/**
 * Map a raw pg failure of a `field_worker.*` append / row write to its typed error. A typed error passes through; an
 * unknown failure (42501 RLS, …) propagates unchanged. Exported for its unit spec only.
 */
export function mapFieldWorkerWriteError(err: unknown, fieldWorkerId: string, attemptedVersion: number): unknown {
  if (uniqueViolationConstraint(err) === STREAM_VERSION_CONSTRAINT) {
    return new FieldWorkerStreamConcurrencyError(fieldWorkerId, attemptedVersion);
  }
  if (isFieldWorkerStateDirectWriteError(err)) {
    const message = (err as { message?: unknown }).message;
    return new FieldWorkerStateDirectWriteError(typeof message === 'string' ? message : 'rejected');
  }
  return err;
}

function zodMessage(e: ZodError): string {
  return e.issues.map((i) => `${i.path.join('.') || '(root)'}: ${i.message}`).join('; ');
}

// ── Genesis ────────────────────────────────────────────────────────────────────────────────────────

export interface ProjectFieldWorkerGenesisInput {
  pariwarId: PariwarId;
  fieldWorkerId: FieldWorkerId;
  /** Tier-1 / Tier-2 strings sealed in the API layer BEFORE the writer (QE4) — opaque here. */
  nameCiphertext: string;
  mobileCiphertext: string;
  mobileBlindIndex: string;
  /** The admin's `users.display_name` (6.11 R5) — the stored attribution snapshot. */
  registeredByDisplay: string;
  /** The first REPORTING district (QE17) — the gate's target, byte-equal (the command checked it). */
  district: string;
  /** The snake_case snapshot of the VERIFIED authorization (QE18) — built by the command from `rbac.authorize`'s result. */
  authorization: FieldWorkerAuthorizationSnapshot;
  /** The caller's intent audit line — the row's first `audit_id`. */
  auditId: string;
  actor: 'operator' | 'trustee';
  /** The admin's `users` id — `events_log.actor_id` AND `registered_by_user_id`, written from this ONE input. */
  actorId: string;
}

export interface ProjectFieldWorkerGenesisResult {
  eventId: string;
  eventVersion: 1;
  state: 'pending_kyc';
  kycStatus: 'pending';
}

/**
 * Append `field_worker.registered` (version 1) and INSERT the worker row (`pending_kyc`), atomically, in the caller's
 * transaction, inside `SAVEPOINT field_worker_genesis`.
 *
 * @throws FieldWorkerProjectorInputError          a non-human actor / null actorId, or a payload that fails its schema.
 * @throws FieldWorkerGenesisAlreadyExistsError    the stream is non-empty, or a concurrent / cross-tenant genesis won
 *                                                 (the stream-version unique, the pkey or `field_workers_pariwar_worker_uq`).
 * @throws FieldWorkerMobileAlreadyRegisteredError the partial unique `field_workers_pariwar_mobile_live_uq` (BY NAME).
 * @throws FieldWorkerPersistError                 the row INSERT failed for another reason or returned no row.
 * @throws FieldWorkerStateDirectWriteError        the trigger refused the INSERT (only if the guard was not set — a bug).
 */
export async function projectFieldWorkerGenesis(
  client: pg.PoolClient,
  input: ProjectFieldWorkerGenesisInput,
): Promise<ProjectFieldWorkerGenesisResult> {
  assertFieldWorkerActor('field_worker.registered', input.actor, input.actorId);

  const payload: FieldWorkerRegisteredPayload = {
    from_state: null,
    to_state: 'pending_kyc',
    trigger: 'field_worker.register',
    actor: input.actor,
    authorization: input.authorization,
    district: input.district,
  };
  const parsed = FieldWorkerRegisteredPayloadSchema.safeParse(payload);
  if (!parsed.success) {
    throw new FieldWorkerProjectorInputError(
      `[field_worker.registered] the genesis payload fails its schema: ${zodMessage(parsed.error)}`,
      parsed.error,
    );
  }

  await client.query(`SAVEPOINT ${GENESIS_SAVEPOINT}`);
  try {
    const db = bindScopedDb(client);

    const existing = await client.query('SELECT 1 FROM events_log WHERE stream_id = $1 LIMIT 1', [input.fieldWorkerId]);
    if (existing.rows.length > 0) throw new FieldWorkerGenesisAlreadyExistsError(input.fieldWorkerId);

    const appended = await db
      .insert(eventsLog)
      .values({
        streamId: input.fieldWorkerId,
        eventType: 'field_worker.registered',
        payload,
        eventVersion: 1,
        actorId: input.actorId,
        pariwarId: input.pariwarId,
      })
      .returning({ eventId: eventsLog.eventId });
    const event = appended[0];
    if (!event) throw new FieldWorkerPersistError(input.fieldWorkerId, new Error('events_log insert returned no row'));

    await client.query("SET LOCAL app.field_worker_state_writer = 'on'");
    try {
      let written: { fieldWorkerId: FieldWorkerId }[];
      try {
        written = await db
          .insert(fieldWorkers)
          .values({
            fieldWorkerId: input.fieldWorkerId,
            pariwarId: input.pariwarId,
            nameCiphertext: input.nameCiphertext,
            mobileCiphertext: input.mobileCiphertext,
            mobileBlindIndex: input.mobileBlindIndex,
            registeredByUserId: input.actorId,
            registeredByDisplay: input.registeredByDisplay,
            currentState: 'pending_kyc',
            stateEventVersion: 1,
            kycStatus: 'pending',
            stateReasonCode: null,
            district: input.district,
            endedOn: null,
            auditId: input.auditId,
          })
          .returning({ fieldWorkerId: fieldWorkers.fieldWorkerId });
      } catch (err) {
        const constraint = uniqueViolationConstraint(err);
        // ⭐ The mobile race's loser (AC6 (d)) — mapped BY CONSTRAINT NAME, ⛔ by any 23505.
        if (constraint === FIELD_WORKER_MOBILE_LIVE_CONSTRAINT) throw new FieldWorkerMobileAlreadyRegisteredError(input.pariwarId);
        if (
          constraint === FIELD_WORKER_PKEY_CONSTRAINT ||
          constraint === FIELD_WORKER_PARIWAR_WORKER_CONSTRAINT ||
          isFieldWorkerStateDirectWriteError(err)
        ) {
          throw err;
        }
        throw new FieldWorkerPersistError(input.fieldWorkerId, err);
      }
      if (written.length !== 1) {
        throw new FieldWorkerPersistError(input.fieldWorkerId, new Error(`expected 1 row inserted, got ${String(written.length)}`));
      }
    } finally {
      try {
        await client.query("SET LOCAL app.field_worker_state_writer = 'off'");
      } catch {
        // an aborted tx refuses this — the savepoint rollback below restores the caller's state
      }
    }

    await client.query(`RELEASE SAVEPOINT ${GENESIS_SAVEPOINT}`);
    return { eventId: event.eventId, eventVersion: 1, state: 'pending_kyc', kycStatus: 'pending' };
  } catch (err) {
    await rollbackToSavepoint(client, GENESIS_SAVEPOINT);
    const constraint = uniqueViolationConstraint(err);
    if (
      constraint === STREAM_VERSION_CONSTRAINT ||
      constraint === FIELD_WORKER_PKEY_CONSTRAINT ||
      constraint === FIELD_WORKER_PARIWAR_WORKER_CONSTRAINT
    ) {
      throw new FieldWorkerGenesisAlreadyExistsError(input.fieldWorkerId);
    }
    throw mapFieldWorkerWriteError(err, input.fieldWorkerId, 1);
  }
}

// ── Transition ─────────────────────────────────────────────────────────────────────────────────────

/** A transition event type (the genesis is `projectFieldWorkerGenesis`'s). */
export type FieldWorkerTransitionEventType = Exclude<FieldWorkerEventType, 'field_worker.registered'>;

/**
 * The row the COMMAND locked with `SELECT … FOR UPDATE` before calling the projector (QE13) — read through ONE
 * `FIELD_WORKER_GUARD_COLUMNS` list. `registeredOn` / `endedOn` are IST / `::text` dates (QE20).
 */
export interface FieldWorkerLockedRow {
  currentState: FieldWorkerState;
  stateEventVersion: number;
  kycStatus: FieldWorkerKycStatus;
  stateReasonCode: FieldWorkerReasonCode | null;
  district: string;
  endedOn: string | null;
  registeredOn: string;
}

export interface ProjectFieldWorkerTransitionInput {
  pariwarId: PariwarId;
  fieldWorkerId: FieldWorkerId;
  eventType: FieldWorkerTransitionEventType;
  /** The full payload the command built; cross-validated against `lockedRow` and strict-parsed here. */
  payload: unknown;
  /** This transition's audit line — becomes the row's `audit_id` (the MOST RECENT transition's). */
  auditId: string;
  actor: 'operator' | 'trustee';
  actorId: string;
  lockedRow: FieldWorkerLockedRow;
}

export interface FieldWorkerTransitionResult {
  eventId: string;
  eventVersion: number;
  fromState: FieldWorkerState;
  state: FieldWorkerState;
  kycStatus: FieldWorkerKycStatus;
  district: string;
}

/**
 * Append ONE transition event at `lockedRow.stateEventVersion + 1` and re-project the row's I1 columns, in the caller's
 * transaction. ⛔ It does NOT replay payloads and ⛔ takes the lock — the command did.
 *
 * @throws FieldWorkerGenesisAlreadyExistsError  for `field_worker.registered`.
 * @throws FieldWorkerProjectorInputError        actor rules (QE7), or a payload that disagrees with the locked row / its schema.
 * @throws FieldWorkerStreamConcurrencyError     the stream head ≠ the locked version, or a 23505 on the version slot.
 * @throws FieldWorkerIllegalTransitionError     `nextFieldWorkerState(from, type)` is null.
 * @throws FieldWorkerPersistError               the row UPDATE failed or matched ≠ 1 row.
 */
export async function projectFieldWorkerTransition(
  client: pg.PoolClient,
  input: ProjectFieldWorkerTransitionInput,
): Promise<FieldWorkerTransitionResult> {
  const eventType: string = input.eventType;
  if (eventType === 'field_worker.registered') throw new FieldWorkerGenesisAlreadyExistsError(input.fieldWorkerId);
  assertFieldWorkerActor(input.eventType, input.actor, input.actorId);

  const db = bindScopedDb(client);
  const { lockedRow } = input;

  const head = await client.query<{ max: string | null }>(
    'SELECT max(event_version) AS max FROM events_log WHERE pariwar_id = $1 AND stream_id = $2',
    [input.pariwarId, input.fieldWorkerId],
  );
  const headVersion = head.rows[0]?.max === null || head.rows[0]?.max === undefined ? 0 : Number(head.rows[0].max);
  const nextVersion = lockedRow.stateEventVersion + 1;
  if (headVersion !== lockedRow.stateEventVersion) {
    throw new FieldWorkerStreamConcurrencyError(input.fieldWorkerId, nextVersion);
  }

  const fromState = lockedRow.currentState;
  const toState = nextFieldWorkerState(fromState, input.eventType);
  if (toState === null) throw new FieldWorkerIllegalTransitionError(input.fieldWorkerId, fromState, input.eventType);

  const p = (typeof input.payload === 'object' && input.payload !== null ? input.payload : {}) as Record<string, unknown>;
  if (p['from_state'] !== fromState || p['to_state'] !== toState) {
    throw new FieldWorkerProjectorInputError(
      `[${input.eventType}] payload from_state/to_state (${String(p['from_state'])} → ${String(p['to_state'])}) ` +
        `disagree with the locked row (${fromState} → ${toState})`,
    );
  }
  if (p['actor'] !== input.actor) {
    throw new FieldWorkerProjectorInputError(`[${input.eventType}] payload actor '${String(p['actor'])}' ≠ actor '${input.actor}'`);
  }
  if (input.eventType === 'field_worker.posted' && p['from_district'] !== lockedRow.district) {
    throw new FieldWorkerProjectorInputError('[field_worker.posted] payload from_district disagrees with the locked row’s district');
  }

  const parsed = FIELD_WORKER_EVENT_PAYLOAD_SCHEMAS[input.eventType].safeParse(input.payload);
  if (!parsed.success) {
    throw new FieldWorkerProjectorInputError(`[${input.eventType}] payload fails its schema: ${zodMessage(parsed.error)}`, parsed.error);
  }

  // The new projection — the same rules as `foldFieldWorkerProjection` (I4).
  let kycStatus = lockedRow.kycStatus;
  let stateReasonCode = lockedRow.stateReasonCode;
  let district = lockedRow.district;
  let endedOn = lockedRow.endedOn;
  switch (input.eventType) {
    case 'field_worker.kyc_completed':
      kycStatus = 'completed';
      break;
    case 'field_worker.suspended':
      stateReasonCode = p['reason_code'] as FieldWorkerReasonCode;
      break;
    case 'field_worker.reactivated':
      stateReasonCode = null;
      break;
    case 'field_worker.terminated':
      stateReasonCode = p['reason_code'] as FieldWorkerReasonCode;
      endedOn = p['ended_on'] as string;
      break;
    case 'field_worker.posted':
      // The posting's reason lives in the EVENT only — `state_reason_code` is untouched (QE12).
      district = p['to_district'] as string;
      break;
    default:
      break;
  }

  let eventId: string;
  try {
    const appended = await db
      .insert(eventsLog)
      .values({
        streamId: input.fieldWorkerId,
        eventType: input.eventType,
        payload: input.payload,
        eventVersion: nextVersion,
        actorId: input.actorId,
        pariwarId: input.pariwarId,
      })
      .returning({ eventId: eventsLog.eventId });
    const event = appended[0];
    if (!event) throw new FieldWorkerPersistError(input.fieldWorkerId, new Error('events_log insert returned no row'));
    eventId = event.eventId;
  } catch (err) {
    throw mapFieldWorkerWriteError(err, input.fieldWorkerId, nextVersion);
  }

  await client.query("SET LOCAL app.field_worker_state_writer = 'on'");
  try {
    let updated: { fieldWorkerId: FieldWorkerId }[];
    try {
      updated = await db
        .update(fieldWorkers)
        .set({
          currentState: toState,
          stateEventVersion: nextVersion,
          kycStatus,
          stateReasonCode,
          district,
          endedOn,
          auditId: input.auditId,
          updatedAt: sql`now()`,
        })
        .where(and(eq(fieldWorkers.fieldWorkerId, input.fieldWorkerId), eq(fieldWorkers.pariwarId, input.pariwarId)))
        .returning({ fieldWorkerId: fieldWorkers.fieldWorkerId });
    } catch (err) {
      const mapped = mapFieldWorkerWriteError(err, input.fieldWorkerId, nextVersion);
      throw mapped === err ? new FieldWorkerPersistError(input.fieldWorkerId, err) : mapped;
    }
    if (updated.length !== 1) {
      throw new FieldWorkerPersistError(input.fieldWorkerId, new Error(`expected 1 row updated, got ${String(updated.length)}`));
    }
  } finally {
    try {
      await client.query("SET LOCAL app.field_worker_state_writer = 'off'");
    } catch {
      // an aborted tx refuses this — the caller's rollback clears it
    }
  }

  return { eventId, eventVersion: nextVersion, fromState, state: toState, kycStatus, district };
}
