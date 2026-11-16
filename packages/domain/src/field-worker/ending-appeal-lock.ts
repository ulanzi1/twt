// The appeal's row lock and its in-lock reads — Story 13.1f (decision `2026-11-16-464` AD9, TR5). Every writer takes the WORKER row lock
// FIRST (`lockFieldWorkerRow`), then the appeal's — decide and withdraw are given an appeal id, so they read its worker UNLOCKED first
// (`appealWorkerOf`, the column is immutable), lock the worker, then the appeal, and re-verify the pair (else an ABBA deadlock against the
// slip's undo, which locks worker → appeal). This module takes only the second lock. It imports nothing from `commands.ts` (TR17 —
// `commands.ts` reaches it from `allowFieldWorkerEndingAppeal`); ⛔ re-exported by the barrel.

import type pg from 'pg';

import type { FieldWorkerEndingAppealId, FieldWorkerId, PariwarId } from '../ids/index.js';
import type { FieldWorkerEndingAppealHearer, FieldWorkerEndingAppealState } from '../schema/field_worker_ending_appeals.js';

/** An appeal's row as its writers lock it (`SELECT … FOR UPDATE`, after the worker's — TR5). Dates as `YYYY-MM-DD` text. */
export interface EndingAppealLockedRow {
  appealId: FieldWorkerEndingAppealId;
  fieldWorkerId: FieldWorkerId;
  state: FieldWorkerEndingAppealState;
  stateEventVersion: number;
  endingEventVersion: number;
  heardBy: FieldWorkerEndingAppealHearer;
  receivedOn: string;
  lodgedByUserId: string;
  endedByUserId: string;
}

const LOCK_COLUMNS =
  'appeal_id, field_worker_id, state, state_event_version, ending_event_version, heard_by, received_on::text AS received_on, lodged_by_user_id, ended_by_user_id';

interface LockedRaw {
  appeal_id: string;
  field_worker_id: string;
  state: FieldWorkerEndingAppealState;
  state_event_version: string | number;
  ending_event_version: string | number;
  heard_by: FieldWorkerEndingAppealHearer;
  received_on: string;
  lodged_by_user_id: string;
  ended_by_user_id: string;
}

function toLocked(r: LockedRaw): EndingAppealLockedRow {
  return {
    appealId: r.appeal_id as FieldWorkerEndingAppealId,
    fieldWorkerId: r.field_worker_id as FieldWorkerId,
    state: r.state,
    stateEventVersion: Number(r.state_event_version),
    endingEventVersion: Number(r.ending_event_version),
    heardBy: r.heard_by,
    receivedOn: r.received_on,
    lodgedByUserId: r.lodged_by_user_id,
    endedByUserId: r.ended_by_user_id,
  };
}

/** `SELECT … FOR UPDATE` on one appeal — the caller holds its worker's lock already (TR5). */
export async function lockEndingAppealRow(
  client: pg.PoolClient,
  pariwarId: PariwarId,
  appealId: FieldWorkerEndingAppealId,
): Promise<EndingAppealLockedRow | null> {
  const r = await client.query<LockedRaw>(
    `SELECT ${LOCK_COLUMNS} FROM field_worker_ending_appeals WHERE appeal_id = $1 AND pariwar_id = $2 FOR UPDATE`,
    [appealId, pariwarId],
  );
  return r.rows[0] ? toLocked(r.rows[0]) : null;
}

/** `SELECT … FOR UPDATE` on the worker's ONE open appeal, if any (I4) — the caller holds the worker's lock already (TR5). */
export async function lockOpenEndingAppealOfWorker(
  client: pg.PoolClient,
  pariwarId: PariwarId,
  fieldWorkerId: FieldWorkerId,
): Promise<EndingAppealLockedRow | null> {
  const r = await client.query<LockedRaw>(
    `SELECT ${LOCK_COLUMNS} FROM field_worker_ending_appeals WHERE pariwar_id = $1 AND field_worker_id = $2 AND state = 'open' FOR UPDATE`,
    [pariwarId, fieldWorkerId],
  );
  return r.rows[0] ? toLocked(r.rows[0]) : null;
}

/** The worker an appeal is about — read WITHOUT a lock (the column is immutable), so the writer can lock the worker FIRST (TR5). */
export async function appealWorkerOf(
  client: pg.PoolClient,
  pariwarId: PariwarId,
  appealId: FieldWorkerEndingAppealId,
): Promise<FieldWorkerId | null> {
  const r = await client.query<{ field_worker_id: string }>(
    'SELECT field_worker_id FROM field_worker_ending_appeals WHERE appeal_id = $1 AND pariwar_id = $2',
    [appealId, pariwarId],
  );
  return (r.rows[0]?.field_worker_id as FieldWorkerId | undefined) ?? null;
}

/** How many REFUSED appeals name this ending (AD7's one-per-ending rule) — read under the worker lock (no other writer can add one). */
export async function countRefusedAppealsOfEnding(
  client: pg.PoolClient,
  pariwarId: PariwarId,
  fieldWorkerId: FieldWorkerId,
  endingEventVersion: number,
): Promise<number> {
  const r = await client.query<{ n: string }>(
    `SELECT count(*)::text AS n FROM field_worker_ending_appeals
      WHERE pariwar_id = $1 AND field_worker_id = $2 AND ending_event_version = $3 AND state = 'refused'`,
    [pariwarId, fieldWorkerId, endingEventVersion],
  );
  return Number(r.rows[0]?.n ?? '0');
}
