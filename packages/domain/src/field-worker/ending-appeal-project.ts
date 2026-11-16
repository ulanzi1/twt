// The appeal's projector — Story 13.1f (decision `2026-11-16-464` AD7). THE ONLY WRITER of `field_worker_ending_appeals` (0207's guard
// trigger refuses every other write). 13.1d's request projector's shape:
//   · `projectEndingAppealLodged` — inside `SAVEPOINT field_worker_ending_appeal_lodge`: the appeal's stream must be empty, append
//     `field_worker_ending_appeal.lodged` at version 1, INSERT the `open` row under the writer variable. A second OPEN appeal for the
//     worker is the partial unique's 23505 BY NAME → `FieldWorkerAppealOpenError` (the backstop — lodges queue on the worker lock).
//   · `projectEndingAppealTransition` — the command took the locks (worker, then appeal — TR5) and checked the guards; this checks the
//     stream head = the locked version, appends at version + 1, and UPDATEs the projected columns (state, decider, decision day).
// ⛔ Re-exported by the barrel; it imports nothing from `commands.ts` (TR17). ⛔ `withCompensatingAudit` here — the caller passes its id.

import type pg from 'pg';
import type { ZodError } from 'zod';

import type { FieldWorkerEndingAppealId, PariwarId } from '../ids/index.js';
import { STREAM_VERSION_CONSTRAINT } from '../marketplace/errors.js';
import { rollbackToSavepoint } from '../marketplace/project.js';
import { FIELD_WORKER_ENDING_APPEAL_ONE_OPEN_CONSTRAINT, type FieldWorkerEndingAppealState } from '../schema/field_worker_ending_appeals.js';
import {
  FieldWorkerAppealOpenError,
  FieldWorkerAppealPersistError,
  FieldWorkerAppealStreamConcurrencyError,
  FieldWorkerProjectorInputError,
  uniqueViolationConstraint,
} from './errors.js';
import { FIELD_WORKER_ENDING_APPEAL_EVENT_PAYLOAD_SCHEMAS, FieldWorkerEndingAppealLodgedPayloadSchema } from './ending-appeal-events.js';
import type { EndingAppealLockedRow } from './ending-appeal-lock.js';
import { nextEndingAppealState, type FieldWorkerEndingAppealTransitionEventType } from './ending-appeal-state.js';

const LODGE_SAVEPOINT = 'field_worker_ending_appeal_lodge';

function zodMessage(e: ZodError): string {
  return e.issues.map((i) => `${i.path.join('.') || '(root)'}: ${i.message}`).join('; ');
}

export interface ProjectEndingAppealLodgedInput {
  pariwarId: PariwarId;
  appealId: FieldWorkerEndingAppealId;
  /** The full `lodged` payload the command built — strict-parsed here. */
  payload: unknown;
  /** The lodging officer — `events_log.actor_id` AND `lodged_by_user_id`. */
  actorId: string;
  /** The officer who ENDED the worker — the terminated event's `events_log.actor_id`, read under the worker lock (AD17). */
  endedByUserId: string;
  auditId: string;
}

/**
 * Append `field_worker_ending_appeal.lodged` (version 1) and INSERT the `open` row, atomically, in the caller's transaction.
 * @throws FieldWorkerProjectorInputError, FieldWorkerAppealOpenError (the partial unique, by name), FieldWorkerAppealStreamConcurrencyError,
 *         FieldWorkerAppealPersistError.
 */
export async function projectEndingAppealLodged(client: pg.PoolClient, input: ProjectEndingAppealLodgedInput): Promise<{ eventId: string }> {
  const parsed = FieldWorkerEndingAppealLodgedPayloadSchema.safeParse(input.payload);
  if (!parsed.success) {
    throw new FieldWorkerProjectorInputError(`[field_worker_ending_appeal.lodged] payload fails its schema: ${zodMessage(parsed.error)}`, parsed.error);
  }
  const p = parsed.data;
  await client.query(`SAVEPOINT ${LODGE_SAVEPOINT}`);
  try {
    const existing = await client.query('SELECT 1 FROM events_log WHERE stream_id = $1 LIMIT 1', [input.appealId]);
    if (existing.rows.length > 0) throw new FieldWorkerAppealStreamConcurrencyError(input.appealId, 1);
    const appended = await client.query<{ event_id: string }>(
      `INSERT INTO events_log (stream_id, event_type, payload, event_version, actor_id, pariwar_id)
       VALUES ($1, 'field_worker_ending_appeal.lodged', $2, 1, $3, $4) RETURNING event_id`,
      [input.appealId, JSON.stringify(input.payload), input.actorId, input.pariwarId],
    );
    const eventId = appended.rows[0]?.event_id;
    if (eventId === undefined) throw new FieldWorkerAppealPersistError(input.appealId, new Error('events_log insert returned no row'));
    await client.query("SET LOCAL app.field_worker_ending_appeal_writer = 'on'");
    try {
      await client.query(
        `INSERT INTO field_worker_ending_appeals
           (appeal_id, pariwar_id, field_worker_id, ending_event_version, state, heard_by, received_on, received_via,
            lodged_by_user_id, ended_by_user_id, state_event_version, audit_id)
         VALUES ($1, $2, $3, $4, 'open', $5, $6, $7, $8, $9, 1, $10)`,
        [
          input.appealId,
          input.pariwarId,
          p.field_worker_id,
          p.ending_event_version,
          p.heard_by,
          p.received_on,
          p.received_via,
          input.actorId,
          input.endedByUserId,
          input.auditId,
        ],
      );
    } finally {
      try {
        await client.query("SET LOCAL app.field_worker_ending_appeal_writer = 'off'");
      } catch {
        // an aborted tx refuses this — the savepoint rollback below restores the caller's state
      }
    }
    await client.query(`RELEASE SAVEPOINT ${LODGE_SAVEPOINT}`);
    return { eventId };
  } catch (err) {
    await rollbackToSavepoint(client, LODGE_SAVEPOINT);
    const constraint = uniqueViolationConstraint(err);
    if (constraint === FIELD_WORKER_ENDING_APPEAL_ONE_OPEN_CONSTRAINT) throw new FieldWorkerAppealOpenError(p.field_worker_id);
    if (constraint === STREAM_VERSION_CONSTRAINT) throw new FieldWorkerAppealStreamConcurrencyError(input.appealId, 1);
    if (err instanceof FieldWorkerAppealStreamConcurrencyError || err instanceof FieldWorkerAppealPersistError) throw err;
    throw new FieldWorkerAppealPersistError(input.appealId, err);
  }
}

export interface ProjectEndingAppealTransitionInput {
  pariwarId: PariwarId;
  eventType: FieldWorkerEndingAppealTransitionEventType;
  payload: unknown;
  /** The acting officer — `events_log.actor_id` AND `decided_by_user_id`. */
  actorId: string;
  /** This act's audit line — the row's `audit_id`. */
  auditId: string;
  lockedRow: EndingAppealLockedRow;
}

export interface EndingAppealTransitionResult {
  eventId: string;
  eventVersion: number;
  fromState: FieldWorkerEndingAppealState;
  state: FieldWorkerEndingAppealState;
}

/**
 * Append ONE transition event at `lockedRow.stateEventVersion + 1` and re-project the row, in the caller's transaction. ⛔ It takes no
 * lock — the command did (worker first, then the appeal — TR5).
 * @throws FieldWorkerProjectorInputError, FieldWorkerAppealStreamConcurrencyError, FieldWorkerAppealPersistError.
 */
export async function projectEndingAppealTransition(
  client: pg.PoolClient,
  input: ProjectEndingAppealTransitionInput,
): Promise<EndingAppealTransitionResult> {
  const { lockedRow, eventType } = input;
  const fromState = lockedRow.state;
  const toState = nextEndingAppealState(fromState, eventType);
  if (toState === null) {
    throw new FieldWorkerProjectorInputError(`[${eventType}] does not apply to a '${fromState}' appeal (the command must refuse it first)`);
  }
  const p = (typeof input.payload === 'object' && input.payload !== null ? input.payload : {}) as Record<string, unknown>;
  if (p['from_state'] !== fromState || p['to_state'] !== toState) {
    throw new FieldWorkerProjectorInputError(
      `[${eventType}] payload from_state/to_state (${String(p['from_state'])} → ${String(p['to_state'])}) disagree with the locked row (${fromState} → ${toState})`,
    );
  }
  if (p['field_worker_id'] !== lockedRow.fieldWorkerId || p['heard_by'] !== lockedRow.heardBy) {
    throw new FieldWorkerProjectorInputError(`[${eventType}] payload field_worker_id / heard_by disagree with the locked appeal`);
  }
  const parsed = FIELD_WORKER_ENDING_APPEAL_EVENT_PAYLOAD_SCHEMAS[eventType].safeParse(input.payload);
  if (!parsed.success) {
    throw new FieldWorkerProjectorInputError(`[${eventType}] payload fails its schema: ${zodMessage(parsed.error)}`, parsed.error);
  }

  const head = await client.query<{ max: string | null }>(
    'SELECT max(event_version) AS max FROM events_log WHERE pariwar_id = $1 AND stream_id = $2',
    [input.pariwarId, lockedRow.appealId],
  );
  const headVersion = head.rows[0]?.max == null ? 0 : Number(head.rows[0].max);
  const nextVersion = lockedRow.stateEventVersion + 1;
  if (headVersion !== lockedRow.stateEventVersion) throw new FieldWorkerAppealStreamConcurrencyError(lockedRow.appealId, nextVersion);

  let eventId: string;
  try {
    const appended = await client.query<{ event_id: string }>(
      `INSERT INTO events_log (stream_id, event_type, payload, event_version, actor_id, pariwar_id)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING event_id`,
      [lockedRow.appealId, eventType, JSON.stringify(input.payload), nextVersion, input.actorId, input.pariwarId],
    );
    const id = appended.rows[0]?.event_id;
    if (id === undefined) throw new FieldWorkerAppealPersistError(lockedRow.appealId, new Error('events_log insert returned no row'));
    eventId = id;
  } catch (err) {
    if (uniqueViolationConstraint(err) === STREAM_VERSION_CONSTRAINT) {
      throw new FieldWorkerAppealStreamConcurrencyError(lockedRow.appealId, nextVersion);
    }
    throw err;
  }

  await client.query("SET LOCAL app.field_worker_ending_appeal_writer = 'on'");
  try {
    let updated: pg.QueryResult;
    try {
      updated = await client.query(
        `UPDATE field_worker_ending_appeals
            SET state = $3,
                decided_by_user_id = $4,
                decided_on = $5::date,
                state_event_version = $6,
                audit_id = $7,
                updated_at = now()
          WHERE appeal_id = $1 AND pariwar_id = $2`,
        [lockedRow.appealId, input.pariwarId, toState, input.actorId, p['decided_on'], nextVersion, input.auditId],
      );
    } catch (err) {
      throw new FieldWorkerAppealPersistError(lockedRow.appealId, err);
    }
    if (updated.rowCount !== 1) {
      throw new FieldWorkerAppealPersistError(lockedRow.appealId, new Error(`expected 1 row updated, got ${String(updated.rowCount)}`));
    }
  } finally {
    try {
      await client.query("SET LOCAL app.field_worker_ending_appeal_writer = 'off'");
    } catch {
      // an aborted tx refuses this — the caller's rollback clears it
    }
  }
  return { eventId, eventVersion: nextVersion, fromState, state: toState };
}
