// The field-worker LOG handler — Story 13.1c (Task 4.1; AD7; AC8). `-441`: "Keep the full log of field worker."
//
//   · GET …/field-workers/:fieldWorkerId/log?after=&limit=   → the worker's whole event stream, a page in `event_version` order
//
// `field_worker.read_log` at the worker's CURRENT district (the per-worker gate). It runs on the HOOK's transaction and writes
// nothing: the stream holds no name, mobile or code (13.1 QE4), so there is no decrypt and no audit line (AD7). The log FOLLOWS the
// worker — a District Admin of their current district reads the events from districts they were in before (AC8 (e)). The worker is
// re-read on the same transaction first: one moved out of the gate's district since the gate read it ⇒ 409 `authorization_stale`
// (the 13.1a identity read's rule, `-447` item 1). ⚠ That re-read is its OWN statement, not the page's (READ COMMITTED, no row lock —
// unlike the identity read's single statement and the code read's `FOR SHARE`): a move landing in the milliseconds between the
// re-read and the page lets that one page through. Accepted: the stream holds no name, mobile or code (13.1 QE4) — it does hold the
// worker's reasons and dates (a date of death among them) — and what a moved-out District Admin could read in that window is the log
// they were entitled to a moment earlier plus the events since (the move itself). The sibling reads close the window because they
// decrypt (review CR18). Each officer is shown by their CURRENT display name — `null` when none is
// recorded, ⛔ an email (AD7). `Cache-Control: no-store`.
//
// ⚠ DELIBERATE (checklist family 9): the gate judges the worker's CURRENT district, yet the page it opens holds the events from the
// districts the worker was in BEFORE, with the acting officers' ids, current names, roles and grants — a District Admin of B sees A's
// officers. Rationale: AC8 (e) and the Panel's "Keep the full log of field worker" (`-441`): the log is the WORKER's record, not a
// district's. RE-EXAMINE (the author's trigger, not the Panel's) when the stream starts to carry words of anyone's own — a complaint,
// an appeal (row 13-1f) — or an officer objects to their name being shown outside their district.
// ⭐ 2026-11-17, Story 13.1f — the trigger looked at, NOT fired: the worker stream gains only `cause`, `appeal_id` (the undo) and
// `previous_field_worker_id` (the link) — codes and ids, no one's words; the appeal lives on its OWN stream, read through its own key.
//
// Story 13.1f (AD12; `-454` Q2 B "The history reads as one person's") — `record=<id>`: the log of an EARLIER record reached from this
// worker by following `previous_field_worker_id` (at most 10 hops), returned ONLY if the officer's own `field_worker.read_log` passes on
// THAT record's district (the same predicate the gate uses, on the loaded grants). Else — not in the chain, or not readable — a BARE 403
// with NO `details` (⛔ `AuthorizationDeniedError`, whose locator would tell an existing record from an unknown one — G27, TR19). So what
// the link lets an officer READ of the earlier record is only what their own read already allows. ⚠ What it does NOT hide (code review
// round 2, R2A-5): `previous_field_worker_id` is in the NEW worker's own log, so that an earlier ended record exists, and its id, reaches
// every officer who may read that log — never the earlier record's date, reason or events, which stay behind `record=`.

import type { FieldWorkerLog, FieldWorkerLogQuery } from '@twt/contracts';
import { fieldWorker, ids, rbac } from '@twt/domain';
import type { FastifyReply, FastifyRequest } from 'fastify';

import { ApiError, UnauthorizedError } from '../../http-errors.js';
import { mapFieldWorkerError } from './errors.js';

/** The key the log read gates on (AD5, catalog v61) — `district_admin` (own district), `pariwar_admin` (any). */
export const FIELD_WORKER_READ_LOG_KEY = 'field_worker.read_log';

export function createFieldWorkerLogHandlers() {
  /** `GET …/field-workers/:fieldWorkerId/log` (AC8). */
  async function log(request: FastifyRequest, reply: FastifyReply) {
    const authorization = request.authorizations?.[FIELD_WORKER_READ_LOG_KEY];
    if (authorization === undefined) throw new Error('[field-worker] the log ran without the field_worker.read_log gate');
    const scopeTx = request.scopeTx;
    if (!scopeTx || !request.requestContext.actorId) throw new UnauthorizedError('Authentication required', 'auth.session_required');
    const fieldWorkerId = ids.fieldWorkerId((request.params as { fieldWorkerId: string }).fieldWorkerId);
    const query = request.query as FieldWorkerLogQuery;
    try {
      const pariwarId = ids.pariwarId(scopeTx.pariwarId);
      const worker = await fieldWorker.getFieldWorker(scopeTx.tx, pariwarId, fieldWorkerId);
      if (worker === null) throw new fieldWorker.FieldWorkerGenesisMissingError(fieldWorkerId);
      if (worker.district !== authorization.target.value) throw new fieldWorker.FieldWorkerAuthorizationStaleError(fieldWorkerId, authorization.target.value);
      let streamId = fieldWorkerId;
      if (query.record !== undefined) {
        const record = ids.fieldWorkerId(query.record);
        const chain = await fieldWorker.listFieldWorkerLinkChain(scopeTx.tx, pariwarId, fieldWorkerId);
        const hop = chain.find((c) => c.fieldWorkerId === record);
        const readable =
          hop !== undefined &&
          rbac.hasPermission(request.scopeGrants ?? [], FIELD_WORKER_READ_LOG_KEY, { dimension: 'district', value: hop.district, pariwarId: scopeTx.pariwarId });
        if (!readable) throw new ApiError(403, 'authz.forbidden', 'Not permitted'); // bare — no details (TR19)
        streamId = record;
      }
      const page = await fieldWorker.listFieldWorkerEvents(scopeTx.tx, pariwarId, streamId, {
        ...(query.after === undefined ? {} : { afterVersion: query.after }),
        ...(query.limit === undefined ? {} : { limit: query.limit }),
      });
      if (page === null) throw new fieldWorker.FieldWorkerGenesisMissingError(streamId);
      const out: FieldWorkerLog = {
        items: page.items.map((e) => ({
          event_version: e.eventVersion,
          event_type: e.eventType as FieldWorkerLog['items'][number]['event_type'],
          occurred_at: e.occurredAt,
          actor: { user_id: e.actorUserId, display_name: e.actorDisplayName, role: e.role },
          permission_key: e.permissionKey,
          grant: e.grant,
          target_district: e.targetDistrict,
          reason_code: e.reasonCode as FieldWorkerLog['items'][number]['reason_code'],
          from_district: e.fromDistrict,
          to_district: e.toDistrict,
          ended_on: e.endedOn,
          to_state: e.toState as FieldWorkerLog['items'][number]['to_state'],
          cause: e.cause as FieldWorkerLog['items'][number]['cause'],
          appeal_id: e.appealId,
          previous_field_worker_id: e.previousFieldWorkerId,
        })),
        next_after: page.nextAfter,
      };
      return reply.header('Cache-Control', 'no-store').send(out);
    } catch (err) {
      return mapFieldWorkerError(err);
    }
  }

  return { log };
}
