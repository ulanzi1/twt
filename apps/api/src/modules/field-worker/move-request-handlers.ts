// The field-worker MOVE REQUEST handlers — Story 13.1d (Task 4; decision `2026-11-08-458` AD4–AD6, AD10, as amended by `-460`).
//
//   · POST …/field-workers/:fieldWorkerId/move-requests             → open     (`field_worker.request_move`, the end the officer holds)
//   · POST …/field-workers/move-requests/:moveRequestId/accept      → accept   (`field_worker.answer_move_request`, the counterpart)
//   · POST …/field-workers/move-requests/:moveRequestId/refuse      → refuse   (`field_worker.answer_move_request`, the counterpart)
//   · POST …/field-workers/move-requests/:moveRequestId/withdraw    → withdraw (`field_worker.request_move`, the opener's end)
//   · POST …/field-workers/move-requests/:moveRequestId/close       → close    (`field_worker.settle_move_request`, the source)
//   · GET  …/field-workers/move-requests                            → a page   (`field_worker.read_move_requests`, a district or the Pariwar)
//   · GET  …/field-workers/move-requests/:moveRequestId             → one      (`field_worker.read_move_requests`, either end)
//
// THE WRITES — the 13.1c `act()` shape (lifecycle-handlers.ts): `tenantWrite` with the WORKER id (open) or the REQUEST id in the key's
// namespace (13.1a TR6), PRE-READ refusals on the write transaction BEFORE the audit wrapper (no audit line — I7, TR2), then ONE
// `withCompensatingAudit` (action = the event type) whose `mutate` runs the command and COMMITS. A refusal only the locks see (a
// concurrent act) throws inside `mutate` and writes the `_rolled_back` twin. The acceptance's audit id is ALSO the move's (the command
// passes it to `postFieldWorker`), so one line covers the request's answer and the worker's move.
//
// THE READS — AD10 / `-460`: nothing about a worker is released before a durable, actor-naming audit line exists. The list reads the
// page on the hook transaction, releases it, writes ONE `field_worker.move_requests_viewed` line naming the page's WORKERS (≤ 25 — the
// 1,024-character locator), then decrypts the names. The detail writes ONE `field_worker.move_request_worker_viewed` line naming the
// request and the worker, then decrypts the name; its work history is dates, districts and the current state only, and
// `members_onboarded` is `null` until Story 13.8 (`-460` item 4).
// ⛔ A mobile or a code anywhere (I6); ⛔ a name in an audit field, a log line or an error.

import { randomUUID } from 'node:crypto';

import type {
  FieldWorkerMoveRequestDetail,
  FieldWorkerMoveRequestItem,
  FieldWorkerMoveRequestListQuery,
  FieldWorkerMoveRequestPage,
  FieldWorkerMoveRequestResult,
  OpenFieldWorkerMoveRequestRequest,
  RefuseFieldWorkerMoveRequestRequest,
} from '@twt/contracts';
import { audit, fieldWorker, ids, type rbac } from '@twt/domain';
import type { FastifyReply, FastifyRequest } from 'fastify';

import type { AppDeps } from '../../context.js';
import { UnauthorizedError } from '../../http-errors.js';
import type { ScopeTx } from '../../types.js';
import { DIRECTORY_DECRYPT_CONCURRENCY, mapWithConcurrency } from '../kyc/bounded-decrypt.js';
import { closeScopeTx } from '../multi-tenant/scope-tx.js';
import { mapFieldWorkerError } from './errors.js';
import { decryptFieldWorkerField } from './field-worker-crypto.js';
import { createFieldWorkerWriteSupport, payloadHash, releaseHookTx, type WriteCtx } from './write-support.js';

/** The four keys (AD5, catalog v62; confirmed by the Panel, `-459` Q1 A). */
export const FIELD_WORKER_REQUEST_MOVE_KEY = fieldWorker.FIELD_WORKER_REQUEST_MOVE_PERMISSION_KEY;
export const FIELD_WORKER_ANSWER_MOVE_REQUEST_KEY = fieldWorker.FIELD_WORKER_ANSWER_MOVE_REQUEST_PERMISSION_KEY;
export const FIELD_WORKER_SETTLE_MOVE_REQUEST_KEY = fieldWorker.FIELD_WORKER_SETTLE_MOVE_REQUEST_PERMISSION_KEY;
export const FIELD_WORKER_READ_MOVE_REQUESTS_KEY = fieldWorker.FIELD_WORKER_READ_MOVE_REQUESTS_PERMISSION_KEY;

/** The VERIFIED result the gate stored for `key` — ⛔ recomputed; a missing one is a route registered without its gate (500). */
function storedAuthorization(request: FastifyRequest, key: string): rbac.VerifiedAuthorization {
  const authorization = request.authorizations?.[key];
  if (authorization === undefined) throw new Error(`[field-worker] a move-request route ran without the ${key} gate`);
  return authorization;
}

function scopeOf(request: FastifyRequest): { scopeTx: ScopeTx; actorId: string; traceId: string | null } {
  const scopeTx = request.scopeTx;
  const actorId = request.requestContext.actorId;
  if (!scopeTx || !actorId) throw new UnauthorizedError('Authentication required', 'auth.session_required');
  return { scopeTx, actorId, traceId: request.requestContext.traceId ?? null };
}

function resultOf(r: fieldWorker.MoveRequestActResult, workerDistrict: string): FieldWorkerMoveRequestResult {
  return {
    move_request_id: r.moveRequestId,
    field_worker_id: r.fieldWorkerId,
    state: r.state,
    from_district: r.fromDistrict,
    to_district: r.toDistrict,
    counterpart_district: r.counterpartDistrict,
    worker_district: workerDistrict,
  };
}

export function createFieldWorkerMoveRequestHandlers(deps: AppDeps) {
  const { tenantWrite } = createFieldWorkerWriteSupport(deps);

  /** ONE audited command that COMMITS inside `mutate` (the 13.1c shape). */
  function audited<T>(
    ctx: WriteCtx,
    authorization: rbac.VerifiedAuthorization,
    action: string,
    locator: string,
    hashShape: Record<string, unknown>,
    command: (auditId: string) => Promise<T>,
  ): Promise<T> {
    return audit.withCompensatingAudit(deps.servicePool, {
      auditIntent: {
        pariwarId: ctx.pariwarId,
        actorId: ctx.actorId,
        actorRole: authorization.role,
        action,
        resourceLocator: locator,
        requestPayloadHash: payloadHash(hashShape),
        traceId: ctx.traceId,
      },
      mutate: async ({ auditId }) => {
        const out = await command(auditId);
        await closeScopeTx(ctx.scopeTx, true); // COMMIT — inside `mutate`, so a failed COMMIT writes the compensating line
        return out;
      },
    });
  }

  /** `POST …/:fieldWorkerId/move-requests` — AC1. 201. */
  async function open(request: FastifyRequest, reply: FastifyReply) {
    const authorization = storedAuthorization(request, FIELD_WORKER_REQUEST_MOVE_KEY);
    const body = request.body as OpenFieldWorkerMoveRequestRequest;
    const fieldWorkerId = ids.fieldWorkerId((request.params as { fieldWorkerId: string }).fieldWorkerId);
    const out = await tenantWrite(
      request,
      (p, a) => `field_worker.move_request.open:${p}:${a}:${fieldWorkerId}`,
      async () => undefined,
      async (ctx): Promise<FieldWorkerMoveRequestResult> => {
        const pariwarId = ids.pariwarId(ctx.pariwarId);
        // The pre-read (AD6), each refusal BEFORE the wrapper (no audit line).
        const worker = await fieldWorker.getFieldWorker(ctx.scopeTx.tx, pariwarId, fieldWorkerId);
        if (worker === null) throw new fieldWorker.FieldWorkerGenesisMissingError(fieldWorkerId);
        if (worker.currentState === 'terminated') {
          throw new fieldWorker.FieldWorkerIllegalTransitionError(fieldWorkerId, worker.currentState, 'field_worker_move_request.opened');
        }
        if (worker.district !== body.from_district) throw new fieldWorker.FieldWorkerAuthorizationStaleError(fieldWorkerId, body.from_district);
        if (worker.district === body.to_district) throw new fieldWorker.FieldWorkerDistrictUnchangedError(fieldWorkerId);
        const at = (await ctx.scopeTx.client.query<{ now: Date }>('SELECT now() AS now')).rows[0]!.now;
        await fieldWorker.assertDistrictRecorded(ctx.scopeTx.tx, pariwarId, body.to_district, at);
        if (await fieldWorker.hasOpenMoveRequest(ctx.scopeTx.tx, pariwarId, fieldWorkerId)) throw new fieldWorker.FieldWorkerMoveRequestOpenError(fieldWorkerId);
        const moveRequestId = ids.fieldWorkerMoveRequestId(randomUUID());
        return audited(
          ctx,
          authorization,
          'field_worker_move_request.opened',
          `field_worker_move_request/${moveRequestId}`,
          { move_request_id: moveRequestId, field_worker_id: fieldWorkerId, from_district: body.from_district, to_district: body.to_district },
          async (auditId) => {
            const r = await fieldWorker.openFieldWorkerMoveRequest(ctx.scopeTx.client, {
              pariwarId,
              auditId,
              actor: 'operator',
              actorId: ctx.actorId,
              moveRequestId,
              fieldWorkerId,
              fromDistrict: body.from_district,
              toDistrict: body.to_district,
              authorization,
            });
            return resultOf(r, body.from_district);
          },
        );
      },
    );
    return reply.code(201).send(out);
  }

  type Act = 'accept' | 'refuse' | 'withdraw' | 'close';
  const ACT: Record<Act, { key: string; event: string }> = {
    accept: { key: FIELD_WORKER_ANSWER_MOVE_REQUEST_KEY, event: 'field_worker_move_request.accepted' },
    refuse: { key: FIELD_WORKER_ANSWER_MOVE_REQUEST_KEY, event: 'field_worker_move_request.refused' },
    withdraw: { key: FIELD_WORKER_REQUEST_MOVE_KEY, event: 'field_worker_move_request.withdrawn' },
    close: { key: FIELD_WORKER_SETTLE_MOVE_REQUEST_KEY, event: 'field_worker_move_request.closed' },
  };

  /** The four per-request acts: the pre-read refusals (no audit line), then ONE audited command. */
  async function act(request: FastifyRequest, reply: FastifyReply, which: Act, hashExtra: Record<string, unknown>) {
    const { key, event } = ACT[which];
    const authorization = storedAuthorization(request, key);
    const moveRequestId = ids.fieldWorkerMoveRequestId((request.params as { moveRequestId: string }).moveRequestId);
    const out = await tenantWrite(
      request,
      (p, a) => `field_worker.move_request.${which}:${p}:${a}:${moveRequestId}`,
      async () => undefined,
      async (ctx): Promise<FieldWorkerMoveRequestResult> => {
        const pariwarId = ids.pariwarId(ctx.pariwarId);
        const row = await fieldWorker.getMoveRequestGateRow(ctx.scopeTx.tx, pariwarId, moveRequestId);
        if (row === null) throw new fieldWorker.FieldWorkerMoveRequestMissingError(moveRequestId);
        const needs = which === 'close' ? row.state === 'escalated' : which === 'withdraw' ? fieldWorker.isMoveRequestOpen(row.state) : row.state === 'pending';
        if (!needs) throw new fieldWorker.FieldWorkerMoveRequestNotOpenError(moveRequestId, row.state);
        if ((which === 'accept' || which === 'refuse') && row.openedBy === ctx.actorId) throw new fieldWorker.FieldWorkerMoveRequestSameOfficerError(moveRequestId);
        if (which === 'withdraw' && row.openedBy !== ctx.actorId) throw new fieldWorker.FieldWorkerMoveRequestNotOpenerError(moveRequestId);
        const base = { pariwarId, actor: 'operator' as const, actorId: ctx.actorId, moveRequestId, authorization };
        return audited(
          ctx,
          authorization,
          event,
          `field_worker_move_request/${moveRequestId}`,
          { move_request_id: moveRequestId, field_worker_id: row.fieldWorkerId, ...hashExtra },
          async (auditId) => {
            switch (which) {
              case 'accept': {
                const r = await fieldWorker.acceptFieldWorkerMoveRequest(ctx.scopeTx.client, { ...base, auditId });
                return resultOf(r, r.toDistrict);
              }
              case 'refuse': {
                const r = await fieldWorker.refuseFieldWorkerMoveRequest(ctx.scopeTx.client, {
                  ...base,
                  auditId,
                  refusalReason: (request.body as RefuseFieldWorkerMoveRequestRequest).reason_code,
                });
                return resultOf(r, r.fromDistrict);
              }
              case 'withdraw':
                return resultOf(await fieldWorker.withdrawFieldWorkerMoveRequest(ctx.scopeTx.client, { ...base, auditId }), row.fromDistrict);
              case 'close':
                return resultOf(await fieldWorker.closeFieldWorkerMoveRequest(ctx.scopeTx.client, { ...base, auditId }), row.fromDistrict);
            }
          },
        );
      },
    );
    return reply.code(200).send(out);
  }

  const accept = (request: FastifyRequest, reply: FastifyReply) => act(request, reply, 'accept', {});
  const refuse = (request: FastifyRequest, reply: FastifyReply) =>
    act(request, reply, 'refuse', { reason_code: (request.body as RefuseFieldWorkerMoveRequestRequest).reason_code });
  const withdraw = (request: FastifyRequest, reply: FastifyReply) => act(request, reply, 'withdraw', {});
  const close = (request: FastifyRequest, reply: FastifyReply) => act(request, reply, 'close', {});

  /** `GET …/field-workers/move-requests` — AC7: one `field_worker.move_requests_viewed` line a page, before any decrypt. */
  async function list(request: FastifyRequest, reply: FastifyReply) {
    const authorization = storedAuthorization(request, FIELD_WORKER_READ_MOVE_REQUESTS_KEY);
    const { scopeTx, actorId, traceId } = scopeOf(request);
    const q = request.query as FieldWorkerMoveRequestListQuery;
    try {
      const after = q.cursor === undefined ? undefined : fieldWorker.decodeMoveRequestCursor(q.cursor);
      const limit = q.limit ?? fieldWorker.PAGE_MOVE_REQUESTS_DEFAULT_LIMIT;
      const pariwarId = scopeTx.pariwarId;
      const page = await fieldWorker.pageFieldWorkerMoveRequests(scopeTx.tx, ids.pariwarId(pariwarId), {
        state: q.state,
        ...(q.district === undefined ? {} : { district: q.district }),
        ...(after === undefined ? {} : { after }),
        limit,
      });
      await releaseHookTx(request);
      const out = await audit.withCompensatingAudit(deps.servicePool, {
        auditIntent: {
          pariwarId,
          actorId,
          actorRole: authorization.role,
          action: 'field_worker.move_requests_viewed',
          // WHICH workers the officer saw: the page's worker ids in page order (≤ 25 UUIDs — the 1,024-character locator).
          resourceLocator: `field_workers/${page.items.map((i) => i.fieldWorkerId).join(',')}`,
          requestPayloadHash: payloadHash({ state: q.state, district: q.district ?? null, limit, cursor: q.cursor ?? null }),
          traceId,
        },
        mutate: async (): Promise<FieldWorkerMoveRequestPage> => {
          const names = await mapWithConcurrency(page.items, DIRECTORY_DECRYPT_CONCURRENCY, (i) =>
            decryptFieldWorkerField(i.nameCiphertext, pariwarId, deps.encryption),
          );
          return { items: page.items.map((i, n) => itemOf(i, names[n]!)), next_cursor: page.nextCursor };
        },
      });
      return reply.header('Cache-Control', 'no-store').send(out);
    } catch (err) {
      return mapFieldWorkerError(err);
    }
  }

  /** `GET …/move-requests/:moveRequestId` — AC7 / `-460`: one `field_worker.move_request_worker_viewed` line, before the decrypt. */
  async function detail(request: FastifyRequest, reply: FastifyReply) {
    const authorization = storedAuthorization(request, FIELD_WORKER_READ_MOVE_REQUESTS_KEY);
    const { scopeTx, actorId, traceId } = scopeOf(request);
    const moveRequestId = ids.fieldWorkerMoveRequestId((request.params as { moveRequestId: string }).moveRequestId);
    try {
      const pariwarId = scopeTx.pariwarId;
      const found = await fieldWorker.getFieldWorkerMoveRequest(scopeTx.tx, ids.pariwarId(pariwarId), moveRequestId);
      const history = await fieldWorker.getMoveRequestWorkerHistory(scopeTx.tx, ids.pariwarId(pariwarId), moveRequestId);
      if (found === null || history === null) throw new fieldWorker.FieldWorkerMoveRequestMissingError(moveRequestId);
      await releaseHookTx(request);
      const out = await audit.withCompensatingAudit(deps.servicePool, {
        auditIntent: {
          pariwarId,
          actorId,
          actorRole: authorization.role,
          action: 'field_worker.move_request_worker_viewed',
          resourceLocator: `field_worker_move_request/${moveRequestId}/field_worker/${history.fieldWorkerId}`,
          requestPayloadHash: payloadHash({ move_request_id: moveRequestId, field_worker_id: history.fieldWorkerId }),
          traceId,
        },
        mutate: async (): Promise<FieldWorkerMoveRequestDetail> => {
          // ONE decrypt: the list item and the worker block carry the same name.
          const name = await decryptFieldWorkerField(history.nameCiphertext, pariwarId, deps.encryption);
          return {
            request: itemOf(found.request, name),
            events: found.events.map((e) => ({
              event_version: e.eventVersion,
              event_type: e.eventType as FieldWorkerMoveRequestDetail['events'][number]['event_type'],
              occurred_at: e.occurredAt,
              refusal_reason: e.refusalReason as FieldWorkerMoveRequestDetail['events'][number]['refusal_reason'],
              cause: e.cause,
            })),
            worker: {
              field_worker_id: history.fieldWorkerId,
              name,
              current_state: history.currentState,
              registered_on: history.registeredOn,
              active_since: history.activeSince,
              districts: history.districts.map((d) => ({ district: d.district, from: d.from, to: d.to })),
              suspensions: history.suspensions.map((s) => ({ from: s.from, to: s.to })),
              history_truncated: history.truncated,
              // `-460` item 4 — "Not counted yet": a member's code is not resolved to a worker before Story 13.8 (C4).
              members_onboarded: null,
            },
          };
        },
      });
      return reply.header('Cache-Control', 'no-store').send(out);
    } catch (err) {
      return mapFieldWorkerError(err);
    }
  }

  return { open, accept, refuse, withdraw, close, list, detail };
}

function itemOf(i: fieldWorker.FieldWorkerMoveRequestListRow, name: string): FieldWorkerMoveRequestItem {
  return {
    move_request_id: i.moveRequestId,
    field_worker_id: i.fieldWorkerId,
    name,
    from_district: i.fromDistrict,
    to_district: i.toDistrict,
    opened_at_end: i.openedAtEnd,
    counterpart_district: i.counterpartDistrict,
    state: i.state,
    refusal_reason: i.refusalReason,
    escalation_cause: i.escalationCause,
    supersede_cause: i.supersedeCause,
    opened_by: i.openedBy,
    opened_by_display: i.openedByDisplay,
    opened_at: i.openedAt,
    answered_at: i.answeredAt,
  };
}
