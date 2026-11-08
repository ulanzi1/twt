// A direct move or an ending SUPERSEDES the worker's open move request — Story 13.1d (decision `2026-11-08-458` AD3, AD4, AD9; 13.1c C1).
//
// Called by `postFieldWorker` (key `field_worker.move` ONLY — the acceptance's own move has nothing else to supersede) and by
// `terminateFieldWorker`, on the SAME client, AFTER `runLockedTransition` returns: the worker's row lock is still held (a released
// savepoint keeps its locks), so this takes the request's lock second (I5). A request is therefore never left pending for a worker who
// has moved or ended (I4) — a later acceptance reads `superseded` and answers 409 (the epic's "marked stale", superseded by `-458`).
// It also writes the act's notices (AD9): an ending tells the opener and the counterpart's District Admins (`move_request_superseded`);
// a direct move tells the District Admins of BOTH districts (`moved_by_pariwar_admin`, naming the request it superseded, if any) and
// writes NO `move_request_superseded` — its recipients are all told already. ⛔ Imports from `commands.ts` (TR12).

import type pg from 'pg';

import type { FieldWorkerId, FieldWorkerMoveRequestId, PariwarId } from '../ids/index.js';
import type { FieldWorkerMoveSupersedeCause } from '../schema/field_worker_move_requests.js';
import type { FieldWorkerAuthorizationSnapshot } from './events.js';
import { lockOpenMoveRequestOfWorker } from './move-request-lock.js';
import { projectMoveRequestTransition } from './move-request-project.js';
import { districtAdminsOf, writeFieldWorkerNotices } from './notices.js';

export interface SupersedeAfterActInput {
  pariwarId: PariwarId;
  fieldWorkerId: FieldWorkerId;
  /** The verified snapshot of the act that made the request moot (`field_worker.move` / `field_worker.terminate`). */
  authorization: FieldWorkerAuthorizationSnapshot;
  auditId: string;
  actor: 'operator' | 'trustee';
  actorId: string;
}

async function supersede(
  client: pg.PoolClient,
  i: SupersedeAfterActInput,
  cause: FieldWorkerMoveSupersedeCause,
): Promise<{ moveRequestId: FieldWorkerMoveRequestId; openedBy: string; counterpartDistrict: string; fromDistrict: string; toDistrict: string } | null> {
  const locked = await lockOpenMoveRequestOfWorker(client, i.pariwarId, i.fieldWorkerId);
  if (locked === null) return null;
  await projectMoveRequestTransition(client, {
    pariwarId: i.pariwarId,
    eventType: 'field_worker_move_request.superseded',
    payload: {
      from_state: locked.state,
      to_state: 'superseded',
      actor: i.actor,
      field_worker_id: i.fieldWorkerId,
      authorization: i.authorization,
      cause,
    },
    actorId: i.actorId,
    auditId: i.auditId,
    lockedRow: locked,
  });
  return {
    moveRequestId: locked.moveRequestId,
    openedBy: locked.openedBy,
    counterpartDistrict: locked.counterpartDistrict,
    fromDistrict: locked.fromDistrict,
    toDistrict: locked.toDistrict,
  };
}

/**
 * After a Pariwar Admin's DIRECT move (`field_worker.posted` under `field_worker.move`): supersede the open request (cause
 * `worker_moved`), then tell the District Admins of BOTH districts of the move (`moved_by_pariwar_admin`) — whether or not a request was
 * open. Returns the superseded request's id, or null.
 */
export async function afterDirectMove(
  client: pg.PoolClient,
  i: SupersedeAfterActInput & { fromDistrict: string; toDistrict: string },
): Promise<FieldWorkerMoveRequestId | null> {
  const superseded = await supersede(client, i, 'worker_moved');
  const fromAdmins = await districtAdminsOf(client, i.pariwarId, i.fromDistrict);
  const toAdmins = await districtAdminsOf(client, i.pariwarId, i.toDistrict);
  await writeFieldWorkerNotices(
    client,
    {
      pariwarId: i.pariwarId,
      fieldWorkerId: i.fieldWorkerId,
      moveRequestId: superseded?.moveRequestId ?? null,
      fromDistrict: i.fromDistrict,
      toDistrict: i.toDistrict,
    },
    [['moved_by_pariwar_admin', [...fromAdmins, ...toAdmins]]],
    i.actorId,
  );
  return superseded?.moveRequestId ?? null;
}

/**
 * After an ENDING (`field_worker.terminated`): supersede the open request (cause `worker_ended`) and tell its opener and the counterpart's
 * District Admins (`move_request_superseded`). A worker with no open request: nothing. Returns the superseded request's id, or null.
 */
export async function afterEnding(client: pg.PoolClient, i: SupersedeAfterActInput): Promise<FieldWorkerMoveRequestId | null> {
  const superseded = await supersede(client, i, 'worker_ended');
  if (superseded === null) return null;
  await writeFieldWorkerNotices(
    client,
    {
      pariwarId: i.pariwarId,
      fieldWorkerId: i.fieldWorkerId,
      moveRequestId: superseded.moveRequestId,
      fromDistrict: superseded.fromDistrict,
      toDistrict: superseded.toDistrict,
    },
    [['move_request_superseded', [superseded.openedBy, ...(await districtAdminsOf(client, i.pariwarId, superseded.counterpartDistrict))]]],
    i.actorId,
  );
  return superseded.moveRequestId;
}
