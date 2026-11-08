// The officers' field-worker NOTICE handlers — Story 13.1d (Task 4; decision `2026-11-08-458` AD6, AD9).
//
//   · GET  …/field-workers/notices          → the officer's OWN notices, newest first (no key — `[session, scope]`, as `/districts`)
//   · POST …/field-workers/notices/seen     → mark the officer's own notices seen (204)
//
// A notice is the officer's OWN row: RLS separates Pariwars only (the scope transaction carries no actor setting), so the domain read and
// the seen UPDATE filter `recipient_user_id = <the session's actor>` in SQL — another officer's rows are never returned and never
// changed, and an unknown or foreign id is ignored (no error, no oracle). A notice carries ids, districts and codes — ⛔ a name; no
// decrypt, no audit line.

import type { FieldWorkerNoticeListQuery, FieldWorkerNoticePage, MarkFieldWorkerNoticesSeenRequest } from '@twt/contracts';
import { fieldWorker, ids } from '@twt/domain';
import type { FastifyReply, FastifyRequest } from 'fastify';

import { UnauthorizedError } from '../../http-errors.js';
import { mapFieldWorkerError } from './errors.js';

function scopeOf(request: FastifyRequest) {
  const scopeTx = request.scopeTx;
  const actorId = request.requestContext.actorId;
  if (!scopeTx || !actorId) throw new UnauthorizedError('Authentication required', 'auth.session_required');
  return { scopeTx, actorId };
}

export function createFieldWorkerNoticeHandlers() {
  /** `GET …/field-workers/notices` — a keyset page of the officer's own notices. */
  async function list(request: FastifyRequest, reply: FastifyReply) {
    const { scopeTx, actorId } = scopeOf(request);
    const q = request.query as FieldWorkerNoticeListQuery;
    try {
      const after = q.cursor === undefined ? undefined : fieldWorker.decodeMoveRequestCursor(q.cursor);
      const page = await fieldWorker.pageFieldWorkerNotices(scopeTx.tx, ids.pariwarId(scopeTx.pariwarId), actorId, {
        ...(after === undefined ? {} : { after }),
        limit: q.limit ?? fieldWorker.PAGE_NOTICES_DEFAULT_LIMIT,
      });
      const out: FieldWorkerNoticePage = {
        items: page.items.map((n) => ({
          notice_id: n.noticeId,
          kind: n.kind,
          field_worker_id: n.fieldWorkerId,
          move_request_id: n.moveRequestId,
          from_district: n.fromDistrict,
          to_district: n.toDistrict,
          refusal_reason: n.refusalReason,
          created_at: n.createdAt,
          seen_at: n.seenAt,
        })),
        next_cursor: page.nextCursor,
      };
      return reply.header('Cache-Control', 'no-store').send(out);
    } catch (err) {
      return mapFieldWorkerError(err);
    }
  }

  /** `POST …/field-workers/notices/seen` — sets `seen_at` once on the officer's own unseen rows named, on the scope transaction. */
  async function seen(request: FastifyRequest, reply: FastifyReply) {
    const { scopeTx, actorId } = scopeOf(request);
    const body = request.body as MarkFieldWorkerNoticesSeenRequest;
    await fieldWorker.markFieldWorkerNoticesSeen(
      scopeTx.tx,
      ids.pariwarId(scopeTx.pariwarId),
      actorId,
      body.notice_ids.map((id) => ids.fieldWorkerNoticeId(id)),
    );
    // The multi-tenant lifecycle hook COMMITS the scope transaction on a < 400 reply (multi-tenant/index.ts).
    return reply.code(204).send();
  }

  return { list, seen };
}
