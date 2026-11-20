// The appeal superseded by a SLIP's undo — Story 13.1f (decision `2026-11-16-464` AD6, I4). Called by `undoFieldWorkerEnding` ONLY (cause
// `mistake`), AFTER the worker's transition, on the SAME client: the worker's row lock is still held, so the appeal's lock is taken
// second (TR5). An allowed appeal's own undo supersedes nothing — the open appeal IS the one being allowed (13.1d's acceptance shape).
// It imports nothing from `commands.ts` (TR17 — the `move-request-supersede.ts` pattern); ⛔ re-exported by the barrel.
//
// Statement order (pinned in `commands-guards.test.ts`): APPEAL LOCK → (when one is open) NOW → appeal APPEND → appeal UPDATE. A failure
// here fails the CALLER's transaction whole (⛔ a swallowed error).

import type pg from 'pg';

import type { FieldWorkerId, PariwarId } from '../ids/index.js';
import type { FieldWorkerAuthorizationSnapshot } from './events.js';
import { lockOpenEndingAppealOfWorker, type EndingAppealLockedRow } from './ending-appeal-lock.js';
import { projectEndingAppealTransition } from './ending-appeal-project.js';

export interface SupersedeOpenEndingAppealInput {
  pariwarId: PariwarId;
  fieldWorkerId: FieldWorkerId;
  /** The undo's VERIFIED `field_worker.undo_ending` snapshot — the superseded event carries it. */
  authorization: FieldWorkerAuthorizationSnapshot;
  /** The undo's `field_worker.ending_undone` event. */
  undoneEventId: string;
  auditId: string;
  actor: 'operator' | 'trustee';
  actorId: string;
}

/** Supersede the worker's open appeal, if any; returns the superseded row (or null — nothing was open). */
export async function supersedeOpenEndingAppeal(client: pg.PoolClient, i: SupersedeOpenEndingAppealInput): Promise<EndingAppealLockedRow | null> {
  const open = await lockOpenEndingAppealOfWorker(client, i.pariwarId, i.fieldWorkerId);
  if (open === null) return null;
  // The undo's IST day, on the transaction-start clock (the same clock as `occurred_at` — TR4).
  const res = await client.query<{ ist_today: string }>("SELECT (now() AT TIME ZONE 'Asia/Kolkata')::date::text AS ist_today");
  const today = res.rows[0]?.ist_today;
  if (typeof today !== 'string') throw new Error('[field-worker] the IST day query returned no row');
  // An undo begun before IST midnight can lock after a lodge begun on the next day. Keep the transaction-start event clock,
  // but never date the supersede before the appeal it closes (R7; the locked row is authoritative, 0207's date CHECK).
  const decidedOn = today < open.receivedOn ? open.receivedOn : today;
  await projectEndingAppealTransition(client, {
    pariwarId: i.pariwarId,
    eventType: 'field_worker_ending_appeal.superseded',
    payload: {
      from_state: 'open',
      to_state: 'superseded',
      actor: i.actor,
      field_worker_id: i.fieldWorkerId,
      heard_by: open.heardBy,
      authorization: i.authorization,
      decided_on: decidedOn,
      undone_event_id: i.undoneEventId,
    },
    actorId: i.actorId,
    auditId: i.auditId,
    lockedRow: open,
  });
  return open;
}
