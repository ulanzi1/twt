// The move request's row lock — Story 13.1d (decision `2026-11-08-458` AD4, I5). Every writer takes the WORKER row lock FIRST
// (`lockFieldWorkerRow`), then the request's — else a direct move and an acceptance deadlock (TR1). This module takes only the second.
// It imports nothing from `commands.ts` (TR12 — `commands.ts` reaches it through the supersede).

import type pg from 'pg';

import type { FieldWorkerId, FieldWorkerMoveRequestId, PariwarId } from '../ids/index.js';
import type { FieldWorkerMoveOpenedAtEnd, FieldWorkerMoveRequestState } from '../schema/field_worker_move_requests.js';
import type { MoveRequestLockedRow } from './move-request-project.js';

const LOCK_COLUMNS =
  'move_request_id, field_worker_id, state, state_event_version, from_district, to_district, opened_at_end, counterpart_district, opened_by';

interface LockedRaw {
  move_request_id: string;
  field_worker_id: string;
  state: FieldWorkerMoveRequestState;
  state_event_version: string | number;
  from_district: string;
  to_district: string;
  opened_at_end: FieldWorkerMoveOpenedAtEnd;
  counterpart_district: string;
  opened_by: string;
}

function toLocked(r: LockedRaw): MoveRequestLockedRow {
  return {
    moveRequestId: r.move_request_id as FieldWorkerMoveRequestId,
    fieldWorkerId: r.field_worker_id as FieldWorkerId,
    state: r.state,
    stateEventVersion: Number(r.state_event_version),
    fromDistrict: r.from_district,
    toDistrict: r.to_district,
    openedAtEnd: r.opened_at_end,
    counterpartDistrict: r.counterpart_district,
    openedBy: r.opened_by,
  };
}

/** `SELECT … FOR UPDATE` on one request — the caller holds its worker's lock already (I5). */
export async function lockMoveRequestRow(
  client: pg.PoolClient,
  pariwarId: PariwarId,
  moveRequestId: FieldWorkerMoveRequestId,
): Promise<MoveRequestLockedRow | null> {
  const r = await client.query<LockedRaw>(
    `SELECT ${LOCK_COLUMNS} FROM field_worker_move_requests WHERE move_request_id = $1 AND pariwar_id = $2 FOR UPDATE`,
    [moveRequestId, pariwarId],
  );
  return r.rows[0] ? toLocked(r.rows[0]) : null;
}

/** `SELECT … FOR UPDATE` on the worker's ONE open request, if any (I4) — the caller holds the worker's lock already (I5). */
export async function lockOpenMoveRequestOfWorker(
  client: pg.PoolClient,
  pariwarId: PariwarId,
  fieldWorkerId: FieldWorkerId,
): Promise<MoveRequestLockedRow | null> {
  const r = await client.query<LockedRaw>(
    `SELECT ${LOCK_COLUMNS} FROM field_worker_move_requests
      WHERE pariwar_id = $1 AND field_worker_id = $2 AND state IN ('pending', 'escalated') FOR UPDATE`,
    [pariwarId, fieldWorkerId],
  );
  return r.rows[0] ? toLocked(r.rows[0]) : null;
}

/** The worker a request is about — read WITHOUT a lock (the column is immutable), so the writer can lock the worker FIRST (I5). */
export async function moveRequestWorkerOf(
  client: pg.PoolClient,
  pariwarId: PariwarId,
  moveRequestId: FieldWorkerMoveRequestId,
): Promise<FieldWorkerId | null> {
  const r = await client.query<{ field_worker_id: string }>(
    'SELECT field_worker_id FROM field_worker_move_requests WHERE move_request_id = $1 AND pariwar_id = $2',
    [moveRequestId, pariwarId],
  );
  return (r.rows[0]?.field_worker_id as FieldWorkerId | undefined) ?? null;
}
