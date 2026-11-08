// The field-worker MOVE REQUEST projector — Story 13.1d (decision `2026-11-08-458` AD2). THE ONLY WRITER of `field_worker_move_requests`.
//
// The `field_workers` projector's shape (project.ts):
//   · `projectMoveRequestOpened` — inside `SAVEPOINT field_worker_move_request_open`: the request's stream must be empty, append
//     `field_worker_move_request.opened` at version 1, then INSERT the row (`pending`) under `app.field_worker_move_request_writer`. A
//     second OPEN request for the worker hits the partial unique `field_worker_move_requests_one_open_uq` → `FieldWorkerMoveRequestOpenError`
//     (BY NAME), and the savepoint keeps the caller's transaction usable (TR7).
//   · `projectMoveRequestTransition` — the COMMAND has taken the worker lock, then the request lock (I5), and checked the guards; this
//     checks the stream HEAD equals the locked version, cross-validates and strict-parses the payload, appends at version + 1, then the
//     guarded UPDATE.
// ⛔ Re-exported from the barrel: the commands (move-request-commands.ts) are the public writers.

import type pg from 'pg';
import type { ZodError } from 'zod';

import type { FieldWorkerId, FieldWorkerMoveRequestId, PariwarId } from '../ids/index.js';
import { STREAM_VERSION_CONSTRAINT } from '../marketplace/errors.js';
import { rollbackToSavepoint } from '../marketplace/project.js';
import {
  FIELD_WORKER_MOVE_REQUEST_ONE_OPEN_CONSTRAINT,
  type FieldWorkerMoveOpenedAtEnd,
  type FieldWorkerMoveRequestState,
} from '../schema/field_worker_move_requests.js';
import {
  FieldWorkerMoveRequestOpenError,
  FieldWorkerMoveRequestPersistError,
  FieldWorkerMoveRequestStreamConcurrencyError,
  FieldWorkerProjectorInputError,
  uniqueViolationConstraint,
} from './errors.js';
import {
  FIELD_WORKER_MOVE_REQUEST_EVENT_PAYLOAD_SCHEMAS,
  FieldWorkerMoveRequestOpenedPayloadSchema,
} from './move-request-events.js';
import { nextMoveRequestState, type FieldWorkerMoveRequestTransitionEventType } from './move-request-state.js';

const OPEN_SAVEPOINT = 'field_worker_move_request_open';

function zodMessage(e: ZodError): string {
  return e.issues.map((i) => `${i.path.join('.') || '(root)'}: ${i.message}`).join('; ');
}

/** A request's row as its writers lock it (`SELECT … FOR UPDATE`, I5 — after the worker's). */
export interface MoveRequestLockedRow {
  moveRequestId: FieldWorkerMoveRequestId;
  fieldWorkerId: FieldWorkerId;
  state: FieldWorkerMoveRequestState;
  stateEventVersion: number;
  fromDistrict: string;
  toDistrict: string;
  openedAtEnd: FieldWorkerMoveOpenedAtEnd;
  counterpartDistrict: string;
  openedBy: string;
}

export interface ProjectMoveRequestOpenedInput {
  pariwarId: PariwarId;
  moveRequestId: FieldWorkerMoveRequestId;
  /** The full `opened` payload the command built — strict-parsed here. */
  payload: unknown;
  /** The opener — `events_log.actor_id` AND `opened_by`. */
  actorId: string;
  auditId: string;
}

/**
 * Append `field_worker_move_request.opened` (version 1) and INSERT the request row (`pending`), atomically, in the caller's transaction.
 * @throws FieldWorkerProjectorInputError, FieldWorkerMoveRequestOpenError (the partial unique, by name), FieldWorkerMoveRequestPersistError.
 */
export async function projectMoveRequestOpened(client: pg.PoolClient, input: ProjectMoveRequestOpenedInput): Promise<{ eventId: string }> {
  const parsed = FieldWorkerMoveRequestOpenedPayloadSchema.safeParse(input.payload);
  if (!parsed.success) {
    throw new FieldWorkerProjectorInputError(`[field_worker_move_request.opened] payload fails its schema: ${zodMessage(parsed.error)}`, parsed.error);
  }
  const p = parsed.data;
  await client.query(`SAVEPOINT ${OPEN_SAVEPOINT}`);
  try {
    const existing = await client.query('SELECT 1 FROM events_log WHERE stream_id = $1 LIMIT 1', [input.moveRequestId]);
    if (existing.rows.length > 0) throw new FieldWorkerMoveRequestStreamConcurrencyError(input.moveRequestId, 1);
    const appended = await client.query<{ event_id: string }>(
      `INSERT INTO events_log (stream_id, event_type, payload, event_version, actor_id, pariwar_id)
       VALUES ($1, 'field_worker_move_request.opened', $2, 1, $3, $4) RETURNING event_id`,
      [input.moveRequestId, JSON.stringify(input.payload), input.actorId, input.pariwarId],
    );
    const eventId = appended.rows[0]?.event_id;
    if (eventId === undefined) throw new FieldWorkerMoveRequestPersistError(input.moveRequestId, new Error('events_log insert returned no row'));
    await client.query("SET LOCAL app.field_worker_move_request_writer = 'on'");
    try {
      await client.query(
        `INSERT INTO field_worker_move_requests
           (move_request_id, pariwar_id, field_worker_id, from_district, to_district, opened_at_end, counterpart_district, state,
            opened_by, state_event_version, audit_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending', $8, 1, $9)`,
        [
          input.moveRequestId,
          input.pariwarId,
          p.field_worker_id,
          p.from_district,
          p.to_district,
          p.opened_at_end,
          p.counterpart_district,
          input.actorId,
          input.auditId,
        ],
      );
    } finally {
      try {
        await client.query("SET LOCAL app.field_worker_move_request_writer = 'off'");
      } catch {
        // an aborted tx refuses this — the savepoint rollback below restores the caller's state
      }
    }
    await client.query(`RELEASE SAVEPOINT ${OPEN_SAVEPOINT}`);
    return { eventId };
  } catch (err) {
    await rollbackToSavepoint(client, OPEN_SAVEPOINT);
    const constraint = uniqueViolationConstraint(err);
    if (constraint === FIELD_WORKER_MOVE_REQUEST_ONE_OPEN_CONSTRAINT) throw new FieldWorkerMoveRequestOpenError(p.field_worker_id);
    if (constraint === STREAM_VERSION_CONSTRAINT) throw new FieldWorkerMoveRequestStreamConcurrencyError(input.moveRequestId, 1);
    if (err instanceof FieldWorkerMoveRequestStreamConcurrencyError || err instanceof FieldWorkerMoveRequestPersistError) throw err;
    throw new FieldWorkerMoveRequestPersistError(input.moveRequestId, err);
  }
}

export interface ProjectMoveRequestTransitionInput {
  pariwarId: PariwarId;
  eventType: FieldWorkerMoveRequestTransitionEventType;
  payload: unknown;
  /** The acting officer, or `null` for the system (`escalated` ONLY — the schema refuses `system` on any other event). */
  actorId: string | null;
  /** This act's audit line — the row's `audit_id`. */
  auditId: string;
  lockedRow: MoveRequestLockedRow;
}

export interface MoveRequestTransitionResult {
  eventId: string;
  eventVersion: number;
  fromState: FieldWorkerMoveRequestState;
  state: FieldWorkerMoveRequestState;
}

/**
 * Append ONE transition event at `lockedRow.stateEventVersion + 1` and re-project the row, in the caller's transaction. ⛔ It takes no
 * lock — the command did (worker first, then the request — I5).
 * @throws FieldWorkerProjectorInputError, FieldWorkerMoveRequestStreamConcurrencyError, FieldWorkerMoveRequestPersistError.
 */
export async function projectMoveRequestTransition(
  client: pg.PoolClient,
  input: ProjectMoveRequestTransitionInput,
): Promise<MoveRequestTransitionResult> {
  const { lockedRow, eventType } = input;
  const fromState = lockedRow.state;
  const toState = nextMoveRequestState(fromState, eventType);
  if (toState === null) {
    throw new FieldWorkerProjectorInputError(`[${eventType}] does not apply to a '${fromState}' request (the command must refuse it first)`);
  }
  const p = (typeof input.payload === 'object' && input.payload !== null ? input.payload : {}) as Record<string, unknown>;
  if (p['from_state'] !== fromState || p['to_state'] !== toState) {
    throw new FieldWorkerProjectorInputError(
      `[${eventType}] payload from_state/to_state (${String(p['from_state'])} → ${String(p['to_state'])}) disagree with the locked row (${fromState} → ${toState})`,
    );
  }
  if (p['field_worker_id'] !== lockedRow.fieldWorkerId) {
    throw new FieldWorkerProjectorInputError(`[${eventType}] payload field_worker_id disagrees with the locked request`);
  }
  if ((p['actor'] === 'system') !== (input.actorId === null)) {
    throw new FieldWorkerProjectorInputError(`[${eventType}] a system act has no actorId, and a human act has one`);
  }
  const parsed = FIELD_WORKER_MOVE_REQUEST_EVENT_PAYLOAD_SCHEMAS[eventType].safeParse(input.payload);
  if (!parsed.success) {
    throw new FieldWorkerProjectorInputError(`[${eventType}] payload fails its schema: ${zodMessage(parsed.error)}`, parsed.error);
  }

  const head = await client.query<{ max: string | null }>(
    'SELECT max(event_version) AS max FROM events_log WHERE pariwar_id = $1 AND stream_id = $2',
    [input.pariwarId, lockedRow.moveRequestId],
  );
  const headVersion = head.rows[0]?.max == null ? 0 : Number(head.rows[0].max);
  const nextVersion = lockedRow.stateEventVersion + 1;
  if (headVersion !== lockedRow.stateEventVersion) throw new FieldWorkerMoveRequestStreamConcurrencyError(lockedRow.moveRequestId, nextVersion);

  // The projected columns of this act (the CHECK pairs of 0205 are the shape backstop).
  const ends = toState !== 'escalated'; // every transition but the escalation ENDS the request
  const refusalReason = eventType === 'field_worker_move_request.refused' ? (p['refusal_reason'] as string) : null;
  const escalationCause = eventType === 'field_worker_move_request.escalated' ? (p['cause'] as string) : null;
  const supersedeCause = eventType === 'field_worker_move_request.superseded' ? (p['cause'] as string) : null;
  const postedEventId = eventType === 'field_worker_move_request.accepted' ? (p['posted_event_id'] as string) : null;

  let eventId: string;
  try {
    const appended = await client.query<{ event_id: string }>(
      `INSERT INTO events_log (stream_id, event_type, payload, event_version, actor_id, pariwar_id)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING event_id`,
      [lockedRow.moveRequestId, eventType, JSON.stringify(input.payload), nextVersion, input.actorId, input.pariwarId],
    );
    const id = appended.rows[0]?.event_id;
    if (id === undefined) throw new FieldWorkerMoveRequestPersistError(lockedRow.moveRequestId, new Error('events_log insert returned no row'));
    eventId = id;
  } catch (err) {
    if (uniqueViolationConstraint(err) === STREAM_VERSION_CONSTRAINT) {
      throw new FieldWorkerMoveRequestStreamConcurrencyError(lockedRow.moveRequestId, nextVersion);
    }
    throw err;
  }

  await client.query("SET LOCAL app.field_worker_move_request_writer = 'on'");
  try {
    let updated: pg.QueryResult;
    try {
      // `escalation_cause` is COALESCEd: written once, kept by a later withdraw or supersede (AD11; the trigger refuses a change).
      updated = await client.query(
        `UPDATE field_worker_move_requests
            SET state = $3,
                refusal_reason = $4,
                escalation_cause = COALESCE(escalation_cause, $5),
                supersede_cause = $6,
                posted_event_id = $7,
                answered_by = CASE WHEN $8::boolean THEN $9::uuid ELSE answered_by END,
                answered_at = CASE WHEN $8::boolean THEN now() ELSE answered_at END,
                state_event_version = $10,
                audit_id = $11,
                updated_at = now()
          WHERE move_request_id = $1 AND pariwar_id = $2`,
        [
          lockedRow.moveRequestId,
          input.pariwarId,
          toState,
          refusalReason,
          escalationCause,
          supersedeCause,
          postedEventId,
          ends,
          input.actorId,
          nextVersion,
          input.auditId,
        ],
      );
    } catch (err) {
      throw new FieldWorkerMoveRequestPersistError(lockedRow.moveRequestId, err);
    }
    if (updated.rowCount !== 1) {
      throw new FieldWorkerMoveRequestPersistError(lockedRow.moveRequestId, new Error(`expected 1 row updated, got ${String(updated.rowCount)}`));
    }
  } finally {
    try {
      await client.query("SET LOCAL app.field_worker_move_request_writer = 'off'");
    } catch {
      // an aborted tx refuses this — the caller's rollback clears it
    }
  }
  return { eventId, eventVersion: nextVersion, fromState, state: toState };
}
