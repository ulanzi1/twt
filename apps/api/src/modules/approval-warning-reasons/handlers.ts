// The Super Admin's WARNING-REASON LIST handlers — Story 6.23a (Task 11; NW16, NW17, NW18; AC12).
//
// GET the list (active + history), ADD a reason, REPLACE one with a newer one. ⛔ There is ⛔ no edit and ⛔ no delete
// handler: a reason is ⛔ never edited or deleted — the old row stays, and every approval that chose it keeps its
// words (BigDev, 2026-10-04). The reasons are STAFF POLICY TEXT (⛔ not member data, ⛔ not member-facing).
//
// The house write shape (the verifier-decision handlers): the actor's display name is resolved server-side FIRST
// (fail-closed, ⛔ never email-derived), the write runs in its OWN scope transaction, and the audit line is emitted
// AFTER it closes — NON-PII: ids and codes, ⛔ never a reason's words (NW12).

import type {
  ApprovalWarningReasonListResponse,
  ApprovalWarningReasonOption,
  ApprovalWarningReasonWriteRequest,
  ApprovalWarningReasonWriteResponse,
} from '@twt/contracts';
import { claim, ids } from '@twt/domain';
import type { FastifyReply, FastifyRequest } from 'fastify';

import type { AuthAuditEventType } from '../../audit/audit-sink.js';
import type { AppDeps } from '../../context.js';
import {
  AdminDisplayNameMissingError,
  BadRequestError,
  ConflictError,
  NotFoundError,
  UnauthorizedError,
} from '../../http-errors.js';
import { getDisplayName } from '../auth/admin/admin-auth.repo.js';
import { emitAuthAudit } from '../auth/shared/audit.js';
import { closeScopeTx, openScopeTx } from '../multi-tenant/scope-tx.js';

/** NW17 — the permission key (pariwar dimension; `super_admin` ONLY, derived). */
export const APPROVAL_WARNING_REASON_MANAGE_KEY = 'approval_warning_reason.manage';
/** The step-up action context both writes require (a free-form string — ⛔ no registry to extend). */
export const APPROVAL_WARNING_REASON_STEP_UP_CONTEXT = 'approval_warning_reason_manage';

function optionDto(o: claim.ApprovalWarningReasonOption): ApprovalWarningReasonOption {
  return {
    code: o.code,
    reasonId: o.reasonId,
    label: o.label,
    whenToUse: o.whenToUse,
    addedByDisplay: o.addedByDisplay,
    addedAt: o.addedAt?.toISOString() ?? null,
    replacesLabel: o.replacesLabel,
  };
}

function rowDto(row: claim.ApprovalWarningReasonRow, replacesLabel: string | null): ApprovalWarningReasonOption {
  return {
    code: row.code,
    reasonId: row.reasonId,
    label: row.labelEn,
    whenToUse: row.whenToUse,
    addedByDisplay: row.createdByDisplay,
    addedAt: row.createdAt.toISOString(),
    replacesLabel,
  };
}

/** NW17's refusals → stable HTTP. ⛔ Never the text the Super Admin typed in a message or `details`. */
function translateReasonError(err: unknown): never {
  if (err instanceof claim.ApprovalWarningReasonWriteRefusedError) {
    const code = `approval_warning_reason.${err.code}`;
    switch (err.code) {
      case 'not_found':
        throw new NotFoundError('No such warning reason in this Pariwar', code);
      case 'invalid_text':
        throw new BadRequestError('The reason’s label or note is blank, too long, or uses a word the Trust does not use', code, err.details);
      case 'already_replaced':
        throw new ConflictError('This reason was already replaced — reload the list', code);
      case 'missing_display':
        throw new ConflictError('A reason is attributed to a named person', code);
      case 'code_exhausted':
        throw new ConflictError('Could not generate a unique reason code — please try again', code);
      default: {
        const unreachable: never = err.code;
        throw new Error(`unhandled reason refusal ${String(unreachable)}`);
      }
    }
  }
  throw err;
}

export function createApprovalWarningReasonHandlers(deps: AppDeps) {
  function ctxOf(request: FastifyRequest) {
    const scopeTx = request.scopeTx;
    const actorId = request.requestContext.actorId;
    if (!scopeTx || !actorId) throw new UnauthorizedError('Authentication required', 'auth.session_required');
    return { scopeTx, actorId, pariwarId: ids.pariwarId(scopeTx.pariwarId) };
  }

  const audit = (request: FastifyRequest, type: AuthAuditEventType, actorId: string, pariwarId: string, context: Record<string, unknown>) =>
    emitAuthAudit(deps, request, type, { actorId, pariwarId, context });

  /**
   * Run one of NW17's writers in its own scope tx; audit post-commit (or the refusal). Takes the
   * caller's already-resolved `{ actorId, pariwarId }` (re-review 2026-10-05) — ⛔ not a second
   * `ctxOf(request)` call of its own; `add`/`replace` already resolved the same ones for their closure.
   */
  async function write(
    request: FastifyRequest,
    { actorId, pariwarId }: { actorId: string; pariwarId: ReturnType<typeof ids.pariwarId> },
    type: 'admin_approval_warning_reason.added' | 'admin_approval_warning_reason.replaced',
    run: (client: Parameters<typeof claim.addApprovalWarningReason>[0], display: string) => Promise<{ created: claim.ApprovalWarningReasonRow; replaced: { reasonId: string; code: string; labelEn: string } | null }>,
  ): Promise<ApprovalWarningReasonWriteResponse> {
    const display = await getDisplayName(deps.pool, actorId);
    if (display === null) throw new AdminDisplayNameMissingError(actorId);
    const scopeTx = await openScopeTx(deps, pariwarId);
    let ok = false;
    let out: Awaited<ReturnType<typeof run>>;
    try {
      out = await run(scopeTx.client, display);
      ok = true;
    } catch (err) {
      audit(request, 'admin_approval_warning_reason.rejected', actorId, pariwarId, {
        attempted: type,
        refusal: err instanceof claim.ApprovalWarningReasonWriteRefusedError ? err.code : (err as Error).name,
      });
      return translateReasonError(err);
    } finally {
      await closeScopeTx(scopeTx, ok);
    }
    audit(request, type, actorId, pariwarId, {
      reason_id: out.created.reasonId,
      code: out.created.code,
      ...(out.replaced ? { replaced_reason_id: out.replaced.reasonId, replaced_code: out.replaced.code } : {}),
    });
    return { reason: rowDto(out.created, out.replaced?.labelEn ?? null), replacedReasonId: out.replaced?.reasonId ?? null };
  }

  return {
    async list(request: FastifyRequest): Promise<ApprovalWarningReasonListResponse> {
      const { scopeTx, pariwarId } = ctxOf(request);
      const { active, history } = await claim.listApprovalWarningReasons(scopeTx.tx, pariwarId, { history: true });
      return {
        active: active.map(optionDto),
        history: history.map((h) => ({
          code: h.code,
          reasonId: h.reasonId,
          label: h.label,
          whenToUse: h.whenToUse,
          addedByDisplay: h.addedByDisplay,
          addedAt: h.addedAt.toISOString(),
          replacedAt: h.replacedAt.toISOString(),
          replacedByLabel: h.replacedByLabel,
          replacedByDisplay: h.replacedByDisplay,
        })),
      };
    },

    async add(request: FastifyRequest, reply: FastifyReply): Promise<ApprovalWarningReasonWriteResponse> {
      const body = request.body as ApprovalWarningReasonWriteRequest;
      const ctx = ctxOf(request);
      const { actorId, pariwarId } = ctx;
      const res = await write(request, ctx, 'admin_approval_warning_reason.added', async (client, display) => ({
        created: await claim.addApprovalWarningReason(client, { pariwarId, label: body.label, whenToUse: body.when_to_use, actorId, actorDisplay: display }),
        replaced: null,
      }));
      void reply.status(201);
      return res;
    },

    async replace(request: FastifyRequest, reply: FastifyReply): Promise<ApprovalWarningReasonWriteResponse> {
      const body = request.body as ApprovalWarningReasonWriteRequest;
      const { reasonId } = request.params as { reasonId: string };
      const ctx = ctxOf(request);
      const { actorId, pariwarId } = ctx;
      const res = await write(request, ctx, 'admin_approval_warning_reason.replaced', async (client, display) => {
        const r = await claim.replaceApprovalWarningReason(client, {
          pariwarId,
          reasonId,
          label: body.label,
          whenToUse: body.when_to_use,
          actorId,
          actorDisplay: display,
        });
        return { created: r.created, replaced: r.replaced };
      });
      void reply.status(201);
      return res;
    },
  };
}
