// A direct move or an ending SUPERSEDES the worker's open move request — Story 13.1d (decision `2026-11-08-458` AD3, AD4, AD9; 13.1c C1).
//
// Called by `postFieldWorker` (key `field_worker.move` ONLY — the acceptance's own move has nothing else to supersede) and by
// `terminateFieldWorker`, on the SAME client, AFTER `runLockedTransition` returns: the worker's row lock is still held (a released
// savepoint keeps its locks), so this takes the request's lock second (I5). A request is therefore never left pending for a worker who
// has moved or ended (I4) — a later acceptance reads `superseded` and answers 409 (the epic's "marked stale", superseded by `-458`).
// It also writes the act's notices (AD9): an ending tells the opener and the counterpart's District Admins (`move_request_superseded`);
// a direct move tells the District Admins of BOTH districts of the move (`moved_by_pariwar_admin`, naming the request it superseded, if any)
// and — AMENDED by decision `2026-11-10-461` item 3 (B2) — those of the superseded request's OTHER district when it is not one of the
// move's (`move_request_superseded`); a move that covers both of the request's districts writes none. ⛔ Imports from `commands.ts` (TR12).

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
 *
 * ⚠ The move's two districts are NOT always the request's two: request Patna→Gaya, the worker moved Patna→Nalanda — Gaya's District Admins
 * were told the request was opened and the move's notice does not reach them. Each district of the superseded request that is not one of the
 * move's has its District Admins sent ONE `move_request_superseded`, carrying the REQUEST's own `from → to` (decision `2026-11-10-461`
 * item 3, B2; it amends `-458` AD9, which assumed "its recipients are all told already"). Nobody is told twice for the act: the actor and
 * the officers of the first group are skipped. A move that covers both of the request's districts writes none.
 */
export async function afterDirectMove(
  client: pg.PoolClient,
  i: SupersedeAfterActInput & { fromDistrict: string; toDistrict: string },
): Promise<FieldWorkerMoveRequestId | null> {
  const superseded = await supersede(client, i, 'worker_moved');
  const fromAdmins = await districtAdminsOf(client, i.pariwarId, i.fromDistrict);
  const toAdmins = await districtAdminsOf(client, i.pariwarId, i.toDistrict);
  const moved = await writeFieldWorkerNotices(
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
  if (superseded !== null) {
    // The filter is REDUNDANT with `alreadyTold` (code review R4-8): an officer of a move's district was told by the move's notice. Kept as the
    // rule's own statement ("the request's districts that are not the move's") and to spare the reads; no leg can see it go.
    const movedDistricts = new Set([i.fromDistrict, i.toDistrict]);
    const left = [...new Set([superseded.fromDistrict, superseded.toDistrict])].filter((d) => !movedDistricts.has(d));
    const recipients: string[] = [];
    for (const district of left) recipients.push(...(await districtAdminsOf(client, i.pariwarId, district)));
    if (recipients.length > 0) {
      await writeFieldWorkerNotices(
        client,
        {
          pariwarId: i.pariwarId,
          fieldWorkerId: i.fieldWorkerId,
          moveRequestId: superseded.moveRequestId,
          fromDistrict: superseded.fromDistrict,
          toDistrict: superseded.toDistrict,
        },
        [['move_request_superseded', recipients]],
        i.actorId,
        new Set(moved.map(([recipient]) => recipient)),
      );
    }
  }
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
