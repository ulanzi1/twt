// The field-worker LOG handler — Story 13.1c (Task 4.1; AD7; AC8). `-441`: "Keep the full log of field worker."
//
//   · GET …/field-workers/:fieldWorkerId/log?after=&limit=   → the worker's whole event stream, a page in `event_version` order
//
// `field_worker.read_log` at the worker's CURRENT district (the per-worker gate). It runs on the HOOK's transaction and writes
// nothing: the stream holds no name, mobile or code (13.1 QE4), so there is no decrypt and no audit line (AD7). The log FOLLOWS the
// worker — a District Admin of their current district reads the events from districts they were in before (AC8 (e)). The worker is
// re-read on the same transaction first: one moved out of the gate's district since the gate read it ⇒ 409 `authorization_stale`
// (the 13.1a identity read's rule, `-447` item 1). Each officer is shown by their CURRENT display name — `null` when none is
// recorded, ⛔ an email (AD7). `Cache-Control: no-store`.

import type { FieldWorkerLog, FieldWorkerLogQuery } from '@twt/contracts';
import { fieldWorker, ids } from '@twt/domain';
import type { FastifyReply, FastifyRequest } from 'fastify';

import { UnauthorizedError } from '../../http-errors.js';
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
      const page = await fieldWorker.listFieldWorkerEvents(scopeTx.tx, pariwarId, fieldWorkerId, {
        ...(query.after === undefined ? {} : { afterVersion: query.after }),
        ...(query.limit === undefined ? {} : { limit: query.limit }),
      });
      if (page === null) throw new fieldWorker.FieldWorkerGenesisMissingError(fieldWorkerId);
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
