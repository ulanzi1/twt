// The APPEAL record against an ending — Story 13.1f (Task 5.1; AD7, AD9, AD13; decision `2026-11-16-464`; the Panel's `2026-11-17-465`
// — Q2 A, Q4 A, Q5 A as built; AC5, AC6, AC15).
//
//   · POST …/field-workers/:fieldWorkerId/ending-appeals             → `field_worker_ending_appeal.lodged`   (the hearer records it)
//   · POST …/field-workers/ending-appeals/:appealId/decide           → `.allowed` (+ the worker's `ending_undone`) | `.refused`
//   · POST …/field-workers/ending-appeals/:appealId/withdraw         → `.withdrawn`
//   · GET  …/field-workers/ending-appeals                            → the list (names decrypted, ONE audit line a page)
//   · GET  …/field-workers/ending-appeals/eligible                   → ended workers the reader can record an appeal for (audited)
//   · GET  …/field-workers/:fieldWorkerId/ending-appeals             → one worker's appeals (no name, no audit line)
//
// The hearer RECORDS all three acts (`-454`: "recorded by the officer who hears it"). Two hear keys (Q-4 A): the route's dispatcher has
// stored EXACTLY ONE of them in `request.authorizations` — the one matching the hearer (gate.ts). The ACTOR KIND follows the key: the
// Panel's key ⇒ `'trustee'`, the Pariwar Admin's ⇒ `'operator'` (AD9 — the claims-appeal precedent), never the body. A super admin
// derives the Panel's key but never acts as the Panel: refused 409 `appeal_wrong_hearer` on the PRE-READ (no audit line). Every pre-read
// refusal writes NO audit line (I7); the commands re-judge each under the locks (worker FIRST — TR5). A trustee-panel reader sees only
// Panel-heard appeals, on every read (AD13 — [[feedback_withholding_must_be_uniform]]). ⛔ A mobile or a code anywhere (I6).

import { randomUUID } from 'node:crypto';

import type {
  DecideFieldWorkerEndingAppealRequest,
  DecideFieldWorkerEndingAppealResponse,
  FieldWorkerAppealEligibleQuery,
  FieldWorkerAppealEligiblePage,
  FieldWorkerEndingAppeal,
  FieldWorkerEndingAppealListQuery,
  FieldWorkerEndingAppealPage,
  FieldWorkerEndingAppealsOf,
  FieldWorkerEndingAppealsOfQuery,
  LodgeFieldWorkerEndingAppealRequest,
  WithdrawFieldWorkerEndingAppealRequest,
} from '@twt/contracts';
import { audit, fieldWorker, ids, rbac } from '@twt/domain';
import type { FastifyReply, FastifyRequest } from 'fastify';

import type { AppDeps } from '../../context.js';
import { UnauthorizedError } from '../../http-errors.js';
import type { ScopeTx } from '../../types.js';
import { DIRECTORY_DECRYPT_CONCURRENCY, mapWithConcurrency } from '../kyc/bounded-decrypt.js';
import { closeScopeTx } from '../multi-tenant/scope-tx.js';
import { mapFieldWorkerError } from './errors.js';
import { decryptFieldWorkerField } from './field-worker-crypto.js';
import { assertNumberFree, lifecycleResultOfUndo } from './undo-handlers.js';
import { createFieldWorkerWriteSupport, payloadHash, releaseHookTx, type WriteCtx } from './write-support.js';

/** The four keys (AD10, catalog v63; confirmed by the Panel, `-465` Q5 A). */
export const FIELD_WORKER_HEAR_ENDING_APPEAL_KEY = 'field_worker.hear_ending_appeal';
export const FIELD_WORKER_HEAR_ENDING_APPEAL_AS_PANEL_KEY = 'field_worker.hear_ending_appeal_as_panel';
export const FIELD_WORKER_READ_ENDING_APPEALS_KEY = 'field_worker.read_ending_appeals';

/** The hear authorization the dispatcher stored, its key, and the actor kind it implies (AD9). */
function hearAuthorization(request: FastifyRequest): { authorization: rbac.VerifiedAuthorization; actor: 'operator' | 'trustee' } {
  const panel = request.authorizations?.[FIELD_WORKER_HEAR_ENDING_APPEAL_AS_PANEL_KEY];
  if (panel !== undefined) return { authorization: panel, actor: 'trustee' };
  const pa = request.authorizations?.[FIELD_WORKER_HEAR_ENDING_APPEAL_KEY];
  if (pa !== undefined) return { authorization: pa, actor: 'operator' };
  throw new Error('[field-worker] an appeal write ran without a hear-key gate');
}

/** AD9 — a super admin derives the Panel's key but never acts as the Panel (its grant is `global`). */
function assertNotGlobalPanel(appealOrWorker: string, authorization: rbac.VerifiedAuthorization): void {
  if (authorization.permissionKey === FIELD_WORKER_HEAR_ENDING_APPEAL_AS_PANEL_KEY && authorization.grant.dimension === 'global') {
    throw new fieldWorker.FieldWorkerAppealWrongHearerError(appealOrWorker, 'trustee_panel');
  }
}

function scopeOf(request: FastifyRequest): { scopeTx: ScopeTx; actorId: string; traceId: string | null } {
  const scopeTx = request.scopeTx;
  const actorId = request.requestContext.actorId;
  if (!scopeTx || !actorId) throw new UnauthorizedError('Authentication required', 'auth.session_required');
  return { scopeTx, actorId, traceId: request.requestContext.traceId ?? null };
}

function appealOf(v: fieldWorker.FieldWorkerEndingAppealView): FieldWorkerEndingAppeal {
  return {
    appeal_id: v.appealId,
    field_worker_id: v.fieldWorkerId,
    ending_event_version: v.endingEventVersion,
    state: v.state,
    heard_by: v.heardBy,
    received_on: v.receivedOn,
    received_via: v.receivedVia,
    decided_on: v.decidedOn,
    lodged_by: { user_id: v.lodgedBy.userId, display_name: v.lodgedBy.displayName },
    created_at: v.createdAt,
  };
}

/** A reader under the Trustee Panel role sees ONLY Panel-heard appeals — on every read (AD13). */
function heardByFilterOf(authorization: rbac.VerifiedAuthorization): 'trustee_panel' | undefined {
  return authorization.role === 'trustee_panel' ? 'trustee_panel' : undefined;
}

export function createFieldWorkerEndingAppealHandlers(deps: AppDeps) {
  const { tenantWrite } = createFieldWorkerWriteSupport(deps);

  /** Read the appeal back on the write's own transaction, before its COMMIT (the response shows what was committed). */
  async function readAppeal(ctx: WriteCtx, appealId: ids.FieldWorkerEndingAppealId): Promise<FieldWorkerEndingAppeal> {
    const v = await fieldWorker.getFieldWorkerEndingAppeal(ctx.scopeTx.tx, ids.pariwarId(ctx.pariwarId), appealId);
    if (v === null) throw new fieldWorker.FieldWorkerAppealMissingError(appealId);
    return appealOf(v);
  }

  /** `POST …/:fieldWorkerId/ending-appeals` — AC5. */
  async function lodge(request: FastifyRequest, reply: FastifyReply) {
    const { authorization, actor } = hearAuthorization(request);
    const fieldWorkerId = ids.fieldWorkerId((request.params as { fieldWorkerId: string }).fieldWorkerId);
    const body = request.body as LodgeFieldWorkerEndingAppealRequest;
    const out = await tenantWrite(
      request,
      (p, a) => `field_worker.ending_appeal.lodge:${p}:${a}:${fieldWorkerId}`,
      async () => undefined,
      async (ctx): Promise<FieldWorkerEndingAppeal> => {
        const pariwarId = ids.pariwarId(ctx.pariwarId);
        const db = ctx.scopeTx.tx;
        const worker = await fieldWorker.getFieldWorker(db, pariwarId, fieldWorkerId);
        if (worker === null) throw new fieldWorker.FieldWorkerGenesisMissingError(fieldWorkerId);
        if (worker.currentState !== 'terminated') {
          throw new fieldWorker.FieldWorkerIllegalTransitionError(fieldWorkerId, worker.currentState, 'field_worker_ending_appeal.lodged');
        }
        if (worker.stateEventVersion !== body.expected_ending_version) {
          throw new fieldWorker.FieldWorkerEndingChangedError(fieldWorkerId, body.expected_ending_version);
        }
        assertNotGlobalPanel(fieldWorkerId, authorization);
        const appeals = await fieldWorker.listFieldWorkerEndingAppealsOf(db, pariwarId, fieldWorkerId, { limit: fieldWorker.PAGE_ENDING_APPEALS_MAX_LIMIT });
        if (appeals.some((a) => a.state === 'open')) throw new fieldWorker.FieldWorkerAppealOpenError(fieldWorkerId);
        const refused = appeals.filter((a) => a.state === 'refused' && a.endingEventVersion === worker.stateEventVersion).length;
        if (refused >= fieldWorker.FIELD_WORKER_APPEALS_PER_ENDING) {
          throw new fieldWorker.FieldWorkerAppealAlreadyDecidedError(fieldWorkerId, worker.stateEventVersion);
        }
        const appealId = ids.fieldWorkerEndingAppealId(randomUUID());
        return audit.withCompensatingAudit(deps.servicePool, {
          auditIntent: {
            pariwarId: ctx.pariwarId,
            actorId: ctx.actorId,
            actorRole: authorization.role,
            action: 'field_worker_ending_appeal.lodged',
            resourceLocator: `field_worker/${fieldWorkerId}/field_worker_ending_appeal/${appealId}`,
            requestPayloadHash: payloadHash({ field_worker_id: fieldWorkerId, expected_ending_version: body.expected_ending_version, received_on: body.received_on, received_via: body.received_via }),
            traceId: ctx.traceId,
          },
          mutate: async ({ auditId }) => {
            await fieldWorker.lodgeFieldWorkerEndingAppeal(ctx.scopeTx.client, {
              pariwarId,
              fieldWorkerId,
              appealId,
              auditId,
              actor,
              actorId: ctx.actorId,
              authorization,
              expectedEndingVersion: body.expected_ending_version,
              receivedOn: body.received_on,
              receivedVia: body.received_via,
            });
            const appeal = await readAppeal(ctx, appealId);
            await closeScopeTx(ctx.scopeTx, true);
            return appeal;
          },
        });
      },
    );
    return reply.code(201).send(out);
  }

  /** The decide / withdraw pre-read (no audit line): the appeal, not a Panel act from a global grant, open, not the ender's. */
  async function preReadDecision(ctx: WriteCtx, appealId: ids.FieldWorkerEndingAppealId, authorization: rbac.VerifiedAuthorization) {
    const row = await fieldWorker.getFieldWorkerEndingAppealGateRow(ctx.scopeTx.tx, ids.pariwarId(ctx.pariwarId), appealId);
    if (row === null) throw new fieldWorker.FieldWorkerAppealMissingError(appealId);
    assertNotGlobalPanel(appealId, authorization);
    if (row.state !== 'open') throw new fieldWorker.FieldWorkerAppealNotOpenError(appealId, row.state);
    if (row.endedByUserId === ctx.actorId) throw new fieldWorker.FieldWorkerAppealDeciderIsEnderError(appealId);
    return row;
  }

  /** `POST …/ending-appeals/:appealId/decide` — AC6. */
  async function decide(request: FastifyRequest, reply: FastifyReply) {
    const { authorization, actor } = hearAuthorization(request);
    const appealId = ids.fieldWorkerEndingAppealId((request.params as { appealId: string }).appealId);
    const body = request.body as DecideFieldWorkerEndingAppealRequest;
    const out = await tenantWrite(
      request,
      (p, a) => `field_worker.ending_appeal.decide:${p}:${a}:${appealId}`,
      async () => undefined,
      async (ctx): Promise<DecideFieldWorkerEndingAppealResponse> => {
        const pariwarId = ids.pariwarId(ctx.pariwarId);
        const row = await preReadDecision(ctx, appealId, authorization);
        if (body.outcome === 'allowed') await assertNumberFree(ctx.scopeTx.tx, pariwarId, row.fieldWorkerId);
        const eventType = body.outcome === 'allowed' ? 'field_worker_ending_appeal.allowed' : 'field_worker_ending_appeal.refused';
        return audit.withCompensatingAudit(deps.servicePool, {
          auditIntent: {
            pariwarId: ctx.pariwarId,
            actorId: ctx.actorId,
            actorRole: authorization.role,
            action: eventType, // an allowed decision: ONE line — both of its events carry its id (I7)
            resourceLocator: `field_worker/${row.fieldWorkerId}/field_worker_ending_appeal/${appealId}`,
            requestPayloadHash: payloadHash({ appeal_id: appealId, outcome: body.outcome, decided_on: body.decided_on }),
            traceId: ctx.traceId,
          },
          mutate: async ({ auditId }) => {
            const input = { pariwarId, appealId, auditId, actor, actorId: ctx.actorId, authorization, decidedOn: body.decided_on };
            let worker: DecideFieldWorkerEndingAppealResponse['worker'] = null;
            if (body.outcome === 'allowed') {
              const r = await fieldWorker.allowFieldWorkerEndingAppeal(ctx.scopeTx.client, input);
              worker = lifecycleResultOfUndo(r.worker.fieldWorkerId, r.worker);
            } else {
              await fieldWorker.refuseFieldWorkerEndingAppeal(ctx.scopeTx.client, input);
            }
            const appeal = await readAppeal(ctx, appealId);
            await closeScopeTx(ctx.scopeTx, true);
            return { appeal, worker };
          },
        });
      },
    );
    return reply.code(200).send(out);
  }

  /** `POST …/ending-appeals/:appealId/withdraw` — AC6 (f). */
  async function withdraw(request: FastifyRequest, reply: FastifyReply) {
    const { authorization, actor } = hearAuthorization(request);
    const appealId = ids.fieldWorkerEndingAppealId((request.params as { appealId: string }).appealId);
    const body = request.body as WithdrawFieldWorkerEndingAppealRequest;
    const out = await tenantWrite(
      request,
      (p, a) => `field_worker.ending_appeal.withdraw:${p}:${a}:${appealId}`,
      async () => undefined,
      async (ctx): Promise<FieldWorkerEndingAppeal> => {
        const pariwarId = ids.pariwarId(ctx.pariwarId);
        const row = await preReadDecision(ctx, appealId, authorization);
        return audit.withCompensatingAudit(deps.servicePool, {
          auditIntent: {
            pariwarId: ctx.pariwarId,
            actorId: ctx.actorId,
            actorRole: authorization.role,
            action: 'field_worker_ending_appeal.withdrawn',
            resourceLocator: `field_worker/${row.fieldWorkerId}/field_worker_ending_appeal/${appealId}`,
            requestPayloadHash: payloadHash({ appeal_id: appealId, decided_on: body.decided_on }),
            traceId: ctx.traceId,
          },
          mutate: async ({ auditId }) => {
            await fieldWorker.withdrawFieldWorkerEndingAppeal(ctx.scopeTx.client, {
              pariwarId,
              appealId,
              auditId,
              actor,
              actorId: ctx.actorId,
              authorization,
              decidedOn: body.decided_on,
            });
            const appeal = await readAppeal(ctx, appealId);
            await closeScopeTx(ctx.scopeTx, true);
            return appeal;
          },
        });
      },
    );
    return reply.code(200).send(out);
  }

  /** `GET …/field-workers/ending-appeals` — AC15 (a): names decrypted behind ONE audit line a page; an EMPTY page writes none. */
  async function list(request: FastifyRequest, reply: FastifyReply) {
    const authorization = request.authorizations?.[FIELD_WORKER_READ_ENDING_APPEALS_KEY];
    if (authorization === undefined) throw new Error('[field-worker] the appeal list ran without its gate');
    const { scopeTx, actorId, traceId } = scopeOf(request);
    const q = request.query as FieldWorkerEndingAppealListQuery;
    try {
      const after = q.cursor === undefined ? undefined : fieldWorker.decodeEndingAppealCursor(q.cursor);
      const limit = q.limit ?? fieldWorker.PAGE_ENDING_APPEALS_DEFAULT_LIMIT;
      const pariwarId = scopeTx.pariwarId;
      const heardBy = heardByFilterOf(authorization);
      const page = await fieldWorker.pageFieldWorkerEndingAppeals(scopeTx.tx, ids.pariwarId(pariwarId), {
        ...(q.district === undefined ? {} : { district: q.district }),
        ...(q.state === undefined ? {} : { state: q.state }),
        ...(heardBy === undefined ? {} : { heardBy }),
        ...(after === undefined ? {} : { after }),
        limit,
      });
      await releaseHookTx(request);
      if (page.items.length === 0) return reply.header('Cache-Control', 'no-store').send({ items: [], next_cursor: null });
      const out = await audit.withCompensatingAudit(deps.servicePool, {
        auditIntent: {
          pariwarId,
          actorId,
          actorRole: authorization.role,
          action: 'field_worker.ending_appeal_list_viewed',
          resourceLocator: `field_workers/${page.items.map((i) => i.fieldWorkerId).join(',')}`,
          requestPayloadHash: payloadHash({ district: q.district ?? null, state: q.state ?? null, limit, cursor: q.cursor ?? null }),
          traceId,
        },
        mutate: async (): Promise<FieldWorkerEndingAppealPage> => {
          const names = await mapWithConcurrency(page.items, DIRECTORY_DECRYPT_CONCURRENCY, (i) => decryptFieldWorkerField(i.nameCiphertext, pariwarId, deps.encryption));
          return { items: page.items.map((i, n) => ({ ...appealOf(i), name: names[n]!, district: i.district })), next_cursor: page.nextCursor };
        },
      });
      return reply.header('Cache-Control', 'no-store').send(out);
    } catch (err) {
      return mapFieldWorkerError(err);
    }
  }

  /**
   * `GET …/ending-appeals/eligible` — AC15 (b): ended workers whose current ending has no open or refused appeal and whose hearer matches a
   * hear key the reader holds — the Panel's counted ONLY from a non-`global` grant (a super admin can never lodge with it — AD9).
   */
  async function eligible(request: FastifyRequest, reply: FastifyReply) {
    const authorization = request.authorizations?.[FIELD_WORKER_READ_ENDING_APPEALS_KEY];
    if (authorization === undefined) throw new Error('[field-worker] the eligible list ran without its gate');
    const { scopeTx, actorId, traceId } = scopeOf(request);
    const q = request.query as FieldWorkerAppealEligibleQuery;
    try {
      const pariwarId = scopeTx.pariwarId;
      const grants = request.scopeGrants ?? [];
      const at = { dimension: 'pariwar' as const, value: pariwarId, pariwarId };
      const hearers: Array<'pariwar_admin' | 'trustee_panel'> = [];
      if (rbac.hasPermission(grants, FIELD_WORKER_HEAR_ENDING_APPEAL_KEY, at)) hearers.push('pariwar_admin');
      if (rbac.hasPermission(grants.filter((g) => g.scopeDimension !== 'global'), FIELD_WORKER_HEAR_ENDING_APPEAL_AS_PANEL_KEY, at)) hearers.push('trustee_panel');
      const after = q.cursor === undefined ? undefined : fieldWorker.decodeAppealEligibleCursor(q.cursor);
      const limit = q.limit ?? fieldWorker.PAGE_APPEAL_ELIGIBLE_DEFAULT_LIMIT;
      const page = await fieldWorker.pageAppealEligibleFieldWorkers(scopeTx.tx, ids.pariwarId(pariwarId), {
        hearers,
        ...(q.district === undefined ? {} : { district: q.district }),
        ...(after === undefined ? {} : { after }),
        limit,
      });
      await releaseHookTx(request);
      if (page.items.length === 0) return reply.header('Cache-Control', 'no-store').send({ items: [], next_cursor: null });
      const out = await audit.withCompensatingAudit(deps.servicePool, {
        auditIntent: {
          pariwarId,
          actorId,
          actorRole: authorization.role,
          action: 'field_worker.ending_appeal_candidates_viewed',
          resourceLocator: `field_workers/${page.items.map((i) => i.fieldWorkerId).join(',')}`,
          requestPayloadHash: payloadHash({ district: q.district ?? null, limit, cursor: q.cursor ?? null, hearers }),
          traceId,
        },
        mutate: async (): Promise<FieldWorkerAppealEligiblePage> => {
          const names = await mapWithConcurrency(page.items, DIRECTORY_DECRYPT_CONCURRENCY, (i) => decryptFieldWorkerField(i.nameCiphertext, pariwarId, deps.encryption));
          return {
            items: page.items.map((i, n) => ({
              field_worker_id: i.fieldWorkerId,
              display_name: names[n]!,
              district: i.district,
              ended_on: i.endedOn,
              reason_code: i.reasonCode,
              ending_event_version: i.endingEventVersion,
              heard_by: i.heardBy,
            })),
            next_cursor: page.nextCursor,
          };
        },
      });
      return reply.header('Cache-Control', 'no-store').send(out);
    } catch (err) {
      return mapFieldWorkerError(err);
    }
  }

  /** `GET …/:fieldWorkerId/ending-appeals` — AC15 (c): no decrypt, no audit line; the trustee-only rule applies. */
  async function ofWorker(request: FastifyRequest, reply: FastifyReply) {
    const authorization = request.authorizations?.[FIELD_WORKER_READ_ENDING_APPEALS_KEY];
    if (authorization === undefined) throw new Error('[field-worker] the per-worker appeal read ran without its gate');
    const { scopeTx } = scopeOf(request);
    const fieldWorkerId = ids.fieldWorkerId((request.params as { fieldWorkerId: string }).fieldWorkerId);
    const q = request.query as FieldWorkerEndingAppealsOfQuery;
    try {
      const heardBy = heardByFilterOf(authorization);
      const items = await fieldWorker.listFieldWorkerEndingAppealsOf(scopeTx.tx, ids.pariwarId(scopeTx.pariwarId), fieldWorkerId, {
        ...(heardBy === undefined ? {} : { heardBy }),
        limit: q.limit ?? fieldWorker.PAGE_ENDING_APPEALS_DEFAULT_LIMIT,
      });
      const out: FieldWorkerEndingAppealsOf = { items: items.map(appealOf) };
      return reply.header('Cache-Control', 'no-store').send(out);
    } catch (err) {
      return mapFieldWorkerError(err);
    }
  }

  return { lodge, decide, withdraw, list, eligible, ofWorker };
}
