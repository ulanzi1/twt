// The Super Admin's WORKPLACE LIST and the Pariwar Admin's *"isn't listed"* QUEUE — Story 6.36c (Task 4.1; AC2, AC3;
// `-330` SW9 A, `-342` calls 3–4).
//
// ⭐ A SUGGESTION DECIDES ⛔ NOTHING: ⛔ no handler here writes a posting (a test greps this module for `insertMemberPosting`).
// Only the MEMBER's *"Yes"* (the life-events answer route) does. ⭐ ONLY the Super Admin adds (`workplace.manage`).
//
// The house admin write shape (the approval-warning-reasons handlers): the ACTOR from the admin session (⛔ ever the body),
// READS on the request's scope transaction, each WRITE in its OWN `openScopeTx` / `closeScopeTx`, the audit line AFTER the
// commit (RV9 (iii) — a log line, ⛔ an event) with a readable `resourceLocator`; `context` (hashed) carries the kind and the
// district — ⛔ a workplace's name, ⛔ a member's typed text. The actor lands IN THE ROW for an add (`created_by_actor_id`)
// and a suggestion (`suggested_by_actor_id`). ⚠ The human-actor gate (`scripts/claim-adjudication-human-actor-invariant`)
// scans ONLY the claims routes — this module's tests prove the actor binding themselves.
// ⭐ The HTTP status is mapped PER ROUTE, ⛔ per code: `workplace.not_found` is a 404 on `/:workplaceId/*` and a 422 on the
// suggest body's `workplaceId`.

import type {
  AdminWorkplaceAddRequest,
  AdminWorkplaceRenameRequest,
  AdminWorkplacesQuery,
  AdminWorkplacesResponse,
  AdminWorkplaceWire,
  AdminWorkplaceWriteResponse,
  WorkplaceAdminRefusalCode,
  WorkplaceRequestQueueQuery,
  WorkplaceRequestQueueResponse,
  WorkplaceRequestWriteResponse,
  WorkplaceSuggestRequest,
} from '@twt/contracts';
import { ids, member as memberDomain } from '@twt/domain';
import type { FastifyReply, FastifyRequest } from 'fastify';

import type { AuthAuditEventType } from '../../audit/audit-sink.js';
import type { AppDeps } from '../../context.js';
import { ApiError, BadRequestError, ConflictError, NotFoundError, UnauthorizedError } from '../../http-errors.js';
import { emitAuthAudit } from '../auth/shared/audit.js';
import { closeScopeTx, openScopeTx } from '../multi-tenant/scope-tx.js';

/** SW9 A — the Super Admin's list key (pariwar dimension; `super_admin` ONLY, derived). */
export const WORKPLACE_MANAGE_KEY = 'workplace.manage';
/** SW9 A — the Pariwar Admin's queue key (pariwar dimension; `pariwar_admin` + derived `super_admin`). */
export const WORKPLACE_REVIEW_KEY = 'workplace.review';

const MESSAGES: Record<WorkplaceAdminRefusalCode, string> = {
  'workplace.not_found': 'That workplace is not on this Pariwar’s list',
  'workplace.district_not_found': 'That district is not on this Pariwar’s list',
  'workplace.district_mismatch': 'That workplace is in a different district from the request',
  'workplace.import_managed': 'An imported school is corrected by the next import, not here',
  'workplace.state_unchanged': 'The workplace is already in that state',
  'workplace.code_taken': 'A school with that UDISE code is already on the list',
  'workplace.request_not_found': 'No such request in this Pariwar',
  'workplace.request_closed': 'That request is no longer open for this',
};

/** The status of each refusal, per route family. ⛔ A message carries the input (it reaches logs). */
function refuse(code: WorkplaceAdminRefusalCode, status: 404 | 409 | 422): never {
  if (status === 404) throw new NotFoundError(MESSAGES[code], code);
  if (status === 409) throw new ConflictError(MESSAGES[code], code);
  throw new ApiError(422, code, MESSAGES[code]);
}

const ADD_STATUS: Partial<Record<WorkplaceAdminRefusalCode, 404 | 409 | 422>> = {
  'workplace.district_not_found': 422,
  'workplace.code_taken': 409,
};
const ROW_STATUS: Partial<Record<WorkplaceAdminRefusalCode, 404 | 409 | 422>> = {
  'workplace.not_found': 404,
  'workplace.import_managed': 422,
  'workplace.state_unchanged': 409,
};
const SUGGEST_STATUS: Partial<Record<WorkplaceAdminRefusalCode, 404 | 409 | 422>> = {
  'workplace.not_found': 422,
  'workplace.district_mismatch': 422,
  'workplace.request_not_found': 404,
  'workplace.request_closed': 409,
};
const CLOSE_STATUS: Partial<Record<WorkplaceAdminRefusalCode, 404 | 409 | 422>> = {
  'workplace.request_not_found': 404,
  'workplace.request_closed': 409,
};

function translate(err: unknown, statuses: Partial<Record<WorkplaceAdminRefusalCode, 404 | 409 | 422>>): never {
  if (err instanceof memberDomain.WorkplaceAdminRefusedError) {
    const status = statuses[err.code];
    if (status !== undefined) refuse(err.code, status);
  }
  if (err instanceof memberDomain.WorkplaceCursorInvalidError) throw new BadRequestError('The page cursor is not valid', 'workplace.cursor_invalid');
  throw err;
}

function workplaceDto(w: memberDomain.AdminWorkplace): AdminWorkplaceWire {
  return {
    workplaceId: w.workplaceId,
    kind: w.kind,
    name: w.name,
    district: w.district,
    villageName: w.villageName,
    blockCode: w.blockCode,
    udiseSchoolCode: w.udiseSchoolCode,
    source: w.source,
    status: w.status,
  };
}

export function createWorkplaceAdminHandlers(deps: AppDeps) {
  function ctxOf(request: FastifyRequest) {
    const scopeTx = request.scopeTx;
    const actorId = request.requestContext.actorId;
    if (!scopeTx || !actorId) throw new UnauthorizedError('Authentication required', 'auth.session_required');
    return { scopeTx, actorId, pariwarId: ids.pariwarId(scopeTx.pariwarId) };
  }

  /** Run ONE write in its own scope tx; the caller audits after it commits. */
  async function write<T>(
    request: FastifyRequest,
    statuses: Partial<Record<WorkplaceAdminRefusalCode, 404 | 409 | 422>>,
    run: (tx: Awaited<ReturnType<typeof openScopeTx>>['tx'], ctx: ReturnType<typeof ctxOf>) => Promise<T>,
  ): Promise<{ out: T; ctx: ReturnType<typeof ctxOf> }> {
    const ctx = ctxOf(request);
    const scopeTx = await openScopeTx(deps, ctx.pariwarId);
    let ok = false;
    try {
      const out = await run(scopeTx.tx, ctx);
      ok = true;
      return { out, ctx };
    } catch (err) {
      return translate(err, statuses);
    } finally {
      await closeScopeTx(scopeTx, ok);
    }
  }

  function audit(request: FastifyRequest, type: AuthAuditEventType, ctx: ReturnType<typeof ctxOf>, resourceLocator: string, context: Record<string, unknown>): void {
    emitAuthAudit(deps, request, type, { actorId: ctx.actorId, pariwarId: ctx.pariwarId, context, resourceLocator: resourceLocator.toLowerCase() });
  }

  async function rowWrite(
    request: FastifyRequest,
    type: 'admin_workplace.renamed' | 'admin_workplace.delisted' | 'admin_workplace.relisted',
    run: (tx: Awaited<ReturnType<typeof openScopeTx>>['tx'], pariwarId: ids.PariwarId, workplaceId: string) => Promise<memberDomain.AdminWorkplace>,
  ): Promise<AdminWorkplaceWriteResponse> {
    const { workplaceId } = request.params as { workplaceId: string };
    const { out, ctx } = await write(request, ROW_STATUS, (tx, c) => run(tx, c.pariwarId, workplaceId));
    audit(request, type, ctx, `workplace:${out.workplaceId}`, { kind: out.kind, district: out.district });
    return { workplace: workplaceDto(out) };
  }

  return {
    /** GET …/admin/workplaces — `workplace.manage` OR `workplace.review` (the suggest picker searches it). */
    async list(request: FastifyRequest): Promise<AdminWorkplacesResponse> {
      const { scopeTx, pariwarId } = ctxOf(request);
      const q = request.query as AdminWorkplacesQuery;
      try {
        const page = await memberDomain.listWorkplacesForAdmin(scopeTx.tx, {
          pariwarId,
          district: q.district,
          kind: q.kind,
          status: q.status,
          q: q.q,
          limit: q.limit,
          cursor: q.cursor,
        });
        return { items: page.items.map(workplaceDto), nextCursor: page.nextCursor, hasMore: page.hasMore };
      } catch (err) {
        return translate(err, {});
      }
    },

    /** POST …/admin/workplaces — ADD (`workplace.manage` + step-up). */
    async add(request: FastifyRequest, reply: FastifyReply): Promise<AdminWorkplaceWriteResponse> {
      const body = request.body as AdminWorkplaceAddRequest;
      const { out, ctx } = await write(request, ADD_STATUS, (tx, c) =>
        memberDomain.addStaffWorkplace(tx, {
          pariwarId: c.pariwarId,
          actorId: c.actorId,
          kind: body.kind,
          name: body.name,
          district: body.district,
          villageName: body.villageName ?? null,
          blockCode: body.blockCode ?? null,
          udiseSchoolCode: body.udiseSchoolCode ?? null,
        }),
      );
      audit(request, 'admin_workplace.added', ctx, `workplace:${out.workplaceId}`, { kind: out.kind, district: out.district });
      void reply.status(201);
      return { workplace: workplaceDto(out) };
    },

    async rename(request: FastifyRequest): Promise<AdminWorkplaceWriteResponse> {
      const body = request.body as AdminWorkplaceRenameRequest;
      return rowWrite(request, 'admin_workplace.renamed', (tx, pariwarId, workplaceId) =>
        memberDomain.renameStaffWorkplace(tx, { pariwarId, workplaceId, name: body.name }),
      );
    },

    async delist(request: FastifyRequest): Promise<AdminWorkplaceWriteResponse> {
      return rowWrite(request, 'admin_workplace.delisted', (tx, pariwarId, workplaceId) =>
        memberDomain.setStaffWorkplaceListed(tx, { pariwarId, workplaceId, listed: false }),
      );
    },

    async relist(request: FastifyRequest): Promise<AdminWorkplaceWriteResponse> {
      return rowWrite(request, 'admin_workplace.relisted', (tx, pariwarId, workplaceId) =>
        memberDomain.setStaffWorkplaceListed(tx, { pariwarId, workplaceId, listed: true }),
      );
    },

    /** GET …/admin/workplace-requests — the queue (`workplace.review`). ⛔ Member data on the wire. */
    async queue(request: FastifyRequest): Promise<WorkplaceRequestQueueResponse> {
      const { scopeTx, pariwarId } = ctxOf(request);
      const q = request.query as WorkplaceRequestQueueQuery;
      try {
        const page = await memberDomain.listWorkplaceRequestsForReview(scopeTx.tx, {
          pariwarId,
          state: q.state,
          district: q.district,
          limit: q.limit,
          cursor: q.cursor,
        });
        return {
          items: page.items.map((i) => ({
            requestId: i.requestId,
            typedName: i.typedName,
            typedPlace: i.typedPlace,
            district: i.district,
            startedOn: i.startedOn,
            createdAt: i.createdAt,
            state: i.state,
            sameNameCount: i.sameNameCount,
            suggested: i.suggested,
          })),
          nextCursor: page.nextCursor,
          hasMore: page.hasMore,
        };
      } catch (err) {
        return translate(err, {});
      }
    },

    /** POST …/:requestId/suggest — `workplace.review` + step-up. The suggestion decides ⛔ nothing. */
    async suggest(request: FastifyRequest): Promise<WorkplaceRequestWriteResponse> {
      const body = request.body as WorkplaceSuggestRequest;
      const { requestId } = request.params as { requestId: string };
      const { out, ctx } = await write(request, SUGGEST_STATUS, (tx, c) =>
        memberDomain.suggestWorkplaceForRequest(tx, { pariwarId: c.pariwarId, requestId, workplaceId: body.workplaceId, actorId: c.actorId }),
      );
      audit(request, 'admin_workplace.request_suggested', ctx, `workplace_request:${out.requestId}`, { workplace_id: out.workplaceId, district: out.district });
      return { requestId: out.requestId, state: 'suggested' };
    },

    /** POST …/:requestId/close — an entry that names ⛔ real workplace (`workplace.review` + step-up). */
    async close(request: FastifyRequest): Promise<WorkplaceRequestWriteResponse> {
      const { requestId } = request.params as { requestId: string };
      const { out, ctx } = await write(request, CLOSE_STATUS, (tx, c) => memberDomain.closeWorkplaceRequest(tx, { pariwarId: c.pariwarId, requestId }));
      audit(request, 'admin_workplace.request_closed', ctx, `workplace_request:${out.requestId}`, { district: out.district });
      return { requestId: out.requestId, state: 'closed' };
    },
  };
}
