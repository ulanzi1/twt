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

/** ⭐ Review — the domain's OWN refusal-code union (⛔ the `@twt/contracts` mirror): ties every status map below to the
 * SAME type `WorkplaceAdminRefusedError.code` actually carries, so a map short of a key fails TYPE-CHECKING (the
 * `Record`s below), ⛔ a silent runtime 500 for a code nobody mapped. */
type WorkplaceAdminRefusalCode = memberDomain.WorkplaceAdminRefusalCode;

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

/**
 * The status of each refusal, per route family. ⛔ A message carries the input (it reaches logs).
 *
 * ⭐ Review — `500` is ⛔ a real outcome a route is EXPECTED to reach: every per-route STATUS map below is now a FULL
 * `Record` (⛔ `Partial`), so a code the route's own domain function cannot throw (read
 * `packages/domain/src/member/workplace-admin.ts`'s throw sites) is mapped to `500` with a comment, rather than left OUT
 * of the map — the pre-fix `Partial` shape let an unmapped code fall through `translate()` untranslated (a bare
 * `WorkplaceAdminRefusedError`, which Fastify's default handler turns into an undifferentiated 500 at RUNTIME, on the
 * first request that hits it). A future throw site added to a domain function without a matching map entry now fails
 * TYPE-CHECKING instead.
 */
function refuse(code: WorkplaceAdminRefusalCode, status: 404 | 409 | 422 | 500): never {
  if (status === 404) throw new NotFoundError(MESSAGES[code], code);
  if (status === 409) throw new ConflictError(MESSAGES[code], code);
  if (status === 422) throw new ApiError(422, code, MESSAGES[code]);
  // Structurally unreachable for the calling route (see the per-route STATUS map below) — a deliberate 500, ⛔ the
  // member-facing MESSAGES copy, so a route reaching this is loud rather than silently mistranslated. ⛔ `code` in the
  // thrown message — `ApiError`'s message reaches the client verbatim on a 500 (code review).
  throw new ApiError(500, 'workplace.unexpected_refusal', 'An unexpected error occurred');
}

/** ADD (`addStaffWorkplace`) can throw ONLY these two (read the function). Every other code is structurally unreachable. */
const ADD_STATUS: Record<WorkplaceAdminRefusalCode, 404 | 409 | 422 | 500> = {
  'workplace.district_not_found': 422,
  'workplace.code_taken': 409,
  'workplace.not_found': 500,
  'workplace.district_mismatch': 500,
  'workplace.import_managed': 500,
  'workplace.state_unchanged': 500,
  'workplace.request_not_found': 500,
  'workplace.request_closed': 500,
};
/** rename / delist / relist (`renameStaffWorkplace` / `setStaffWorkplaceListed`, both via `lockStaffWorkplace`) — the
 * UNION of what either can throw: `not_found`, `import_managed`, `state_unchanged`, and (code review round 2) a RELIST's
 * `district_not_found` — a relist requires the row's district to be LISTED, as an add does (422, the add's status). Every
 * other code is structurally unreachable on a `/:workplaceId/*` row write. */
const ROW_STATUS: Record<WorkplaceAdminRefusalCode, 404 | 409 | 422 | 500> = {
  'workplace.not_found': 404,
  'workplace.import_managed': 422,
  'workplace.state_unchanged': 409,
  'workplace.district_not_found': 422,
  'workplace.district_mismatch': 500,
  'workplace.code_taken': 500,
  'workplace.request_not_found': 500,
  'workplace.request_closed': 500,
};
/** SUGGEST (`suggestWorkplaceForRequest`) — `workplace.not_found` is a 422 HERE (the suggest body's `workplaceId`, ⛔ a
 * `/:workplaceId/*` path param — hence 404 in `ROW_STATUS` but 422 here, per this file's header note). */
const SUGGEST_STATUS: Record<WorkplaceAdminRefusalCode, 404 | 409 | 422 | 500> = {
  'workplace.not_found': 422,
  'workplace.district_mismatch': 422,
  'workplace.request_not_found': 404,
  'workplace.request_closed': 409,
  'workplace.district_not_found': 500,
  'workplace.import_managed': 500,
  'workplace.state_unchanged': 500,
  'workplace.code_taken': 500,
};
/** CLOSE (`closeWorkplaceRequest`) can throw ONLY these two (read the function). */
const CLOSE_STATUS: Record<WorkplaceAdminRefusalCode, 404 | 409 | 422 | 500> = {
  'workplace.request_not_found': 404,
  'workplace.request_closed': 409,
  'workplace.not_found': 500,
  'workplace.district_not_found': 500,
  'workplace.district_mismatch': 500,
  'workplace.import_managed': 500,
  'workplace.state_unchanged': 500,
  'workplace.code_taken': 500,
};

function translate(err: unknown, statuses: Partial<Record<WorkplaceAdminRefusalCode, 404 | 409 | 422 | 500>>): never {
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
    statuses: Partial<Record<WorkplaceAdminRefusalCode, 404 | 409 | 422 | 500>>,
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
    /** GET …/admin/workplaces — `workplace.manage` OR `workplace.review` (the suggest picker searches it). ⭐ Review —
     * AUDITED on the `admin_verifier_console.read` precedent (a decision-support/console read leaves a trail of who
     * read it, when) — emitted AFTER a successful read, ⛔ in the `catch`. */
    async list(request: FastifyRequest): Promise<AdminWorkplacesResponse> {
      const ctx = ctxOf(request);
      const { scopeTx, pariwarId } = ctx;
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
        audit(request, 'admin_workplace.list_read', ctx, `pariwar:${pariwarId}`, { count: page.items.length });
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

    /** GET …/admin/workplace-requests — the queue (`workplace.review`). ⛔ Member data on the wire. ⭐ Review — AUDITED
     * on the `admin_verifier_console.read` precedent, emitted AFTER a successful read, ⛔ in the `catch`. */
    async queue(request: FastifyRequest): Promise<WorkplaceRequestQueueResponse> {
      const ctx = ctxOf(request);
      const { scopeTx, pariwarId } = ctx;
      const q = request.query as WorkplaceRequestQueueQuery;
      try {
        const page = await memberDomain.listWorkplaceRequestsForReview(scopeTx.tx, {
          pariwarId,
          state: q.state,
          district: q.district,
          limit: q.limit,
          cursor: q.cursor,
        });
        audit(request, 'admin_workplace.queue_read', ctx, `pariwar:${pariwarId}`, { count: page.items.length });
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
            // Code review round 2 (RV11 as read-time staleness) — a `suggested` request whose suggestion is stale reads as
            // `pending` with `suggested: null`; this flag says so (the admin's "earlier suggestion can no longer be used").
            staleSuggestion: i.staleSuggestion,
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
