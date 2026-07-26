// Reconciliation upload routes — Story 9.3 (Task 2; Decision D4). The FIRST reconciliation API surface.
//
// Two authenticated entry routes sharing ONE upload core (`createReconciliationHandlers`), the 6.5
// dual-surface precedent:
//   · nominee — POST /api/v1/member/reconciliation/statements (member Ravi-mode session +
//       requireMemberStepUp('claim_handover') — the WRITE seam Story 9.1 documented). The pool is
//       resolved server-side from the nominee's ACTIVE pool (the Ravi-mode session-as-deceased identity).
//   · staff  — POST /api/v1/p/:pariwarId/reconciliation/statements (admin session + scopeResolutionHook +
//       requirePermissionHook('claim.file') + requireStepUp('claim_file') — the 6.5 helpline-operator
//       chain; REUSE `claim.file`, no catalog bump, Decision D4). The pool is resolved from `claim_case_id`.
//
// The member route mints + closes its OWN scope tx (the nominee-console/claims member-handler template);
// the staff route rides the scope-resolution middleware's `request.scopeTx`. Both fail-soft to a dignified
// 4xx when the nominee is not a validated nominee / the claim has no live pool (never a 500, never an oracle).

import {
  BankStatementUploadRequest,
  BankStatementUploadResponse,
} from '@twt/contracts';
import { ids, nomineeConsole, reconciliation } from '@twt/domain';
import type { FastifyInstance, FastifyRequest } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';

import type { AppDeps } from '../../context.js';
import { BadRequestError, NotFoundError, UnauthorizedError } from '../../http-errors.js';
import type { ScopeTx } from '../../types.js';
import { requireMemberStepUp } from '../auth/member/member-step-up.gate.js';
import { requireMemberSession } from '../auth/shared/member-session-guard.js';
import { requireAdminSession } from '../auth/shared/session-guard.js';
import { scopeResolutionHook } from '../../middleware/scope-resolution/index.js';
import { requirePermissionHook } from '../rbac/index.js';
import { requireStepUp } from '../step-up/gate.js';
import { closeScopeTx, openScopeTx } from '../multi-tenant/scope-tx.js';
import { createReconciliationHandlers, type UploadTarget } from './handlers.js';

const RECONCILIATION_TAG = 'reconciliation';

/** Story 6.3 claim-filing permission key (catalog) — REUSED for the staff path (Decision D4, no new key). */
const CLAIM_FILE_KEY = 'claim.file';
/** The admin step-up action context the staff upload requires (the operator's OWN fresh admin step-up). */
const CLAIM_FILE_STEP_UP_CONTEXT = 'claim_file';
/** The member WRITE step-up (extends the claim_handover / Ravi-mode elevation — Story 9.1's documented seam). */
const CLAIM_HANDOVER_ACTION_CONTEXT = 'claim_handover';

/** Non-file upload fields ride the querystring (the 6.5 `documentType` precedent; the bytes ride multipart). */
const MemberUploadQuery = BankStatementUploadRequest.pick({ bank_code: true }).strict();
const StaffUploadQuery = BankStatementUploadRequest; // bank_code + claim_case_id
const PariwarParam = z.object({ pariwarId: z.string().uuid() }).strict();

/**
 * Per-request post-commit enqueue handoff (Decision D6/D7 — the enqueue-primary MUST fire after the scope-tx
 * commits, never before). The handler stashes what the enqueue needs; the route's `onResponse` hook — which
 * Fastify guarantees runs strictly AFTER `onSend` (where the multi-tenant lifecycle hook commits the scope tx,
 * `apps/api/src/modules/multi-tenant/index.ts`) — reads it back and fires the enqueue. This is what makes the
 * enqueue genuinely post-commit for the STAFF route, which rides the shared scope-resolution middleware's
 * request-scoped tx rather than opening/closing its own.
 */
const pendingMatchEnqueue = new WeakMap<FastifyRequest, { readonly cycleId: string; readonly pariwarId: string }>();

export function registerReconciliationRoutes(app: FastifyInstance, deps: AppDeps): void {
  const h = createReconciliationHandlers(deps);
  const r = app.withTypeProvider<ZodTypeProvider>();
  const memberSession = requireMemberSession(deps);
  const adminSession = requireAdminSession(deps);
  const scope = scopeResolutionHook(deps);
  const canFileClaim = requirePermissionHook(deps, CLAIM_FILE_KEY);
  const stepUp = requireStepUp(deps, CLAIM_FILE_STEP_UP_CONTEXT);
  /** Fires strictly after the response is sent (after `onSend`'s commit) — the post-commit enqueue seam. */
  const firePendingMatchEnqueue = async (request: FastifyRequest): Promise<void> => {
    const pending = pendingMatchEnqueue.get(request);
    if (!pending) return;
    pendingMatchEnqueue.delete(request);
    await enqueueMatchBestEffort(deps, request, pending.cycleId, pending.pariwarId);
  };

  // ── Nominee (member Ravi-mode) upload ──────────────────────────────────────────────────────────────
  r.post(
    '/api/v1/member/reconciliation/statements',
    {
      schema: {
        querystring: MemberUploadQuery,
        response: { 200: BankStatementUploadResponse },
        tags: [RECONCILIATION_TAG],
        consumes: ['multipart/form-data'],
      },
      preHandler: [memberSession, requireMemberStepUp(deps, CLAIM_HANDOVER_ACTION_CONTEXT)],
      onResponse: [firePendingMatchEnqueue],
    },
    async (request: FastifyRequest): Promise<BankStatementUploadResponse> => {
      const memberIdStr = request.requestContext.actorId;
      const pariwarIdStr = request.requestContext.pariwarId;
      if (!memberIdStr || !pariwarIdStr) {
        throw new UnauthorizedError('Authentication required', 'auth.session_required');
      }
      const { bank_code: bankCode } = request.query as z.infer<typeof MemberUploadQuery>;
      const pariwarId = ids.pariwarId(pariwarIdStr);
      const memberId = ids.memberId(memberIdStr);
      const scopeTx = await openScopeTx(deps, pariwarIdStr);
      let ok = false;
      try {
        // The pool is the nominee's ACTIVE pool (the Ravi-mode session-as-deceased identity). Not a
        // validated nominee with a live pool ⇒ a dignified 404 (no cross-pool existence oracle).
        const active = await nomineeConsole.resolveActiveNomineePool(scopeTx.tx, { pariwarId, memberId });
        if (active === null) {
          throw new NotFoundError('No active pool to reconcile', 'reconciliation.no_active_pool');
        }
        const target: UploadTarget = {
          pariwarId,
          poolId: ids.poolId(active.pool.poolId),
          claimCaseId: ids.claimId(active.pool.claimCaseId),
          bankCode,
          actorId: memberIdStr,
          role: 'nominee',
        };
        const body = await h.uploadBankStatement(request, scopeTx, target);
        ok = true;
        // Decision D7 — the enqueue-primary latency optimizer. Handed off to the route's `onResponse` hook
        // (fires strictly after this scope tx commits, never before — see `pendingMatchEnqueue`'s header).
        pendingMatchEnqueue.set(request, { cycleId: active.pool.cycleId, pariwarId: pariwarIdStr });
        return body;
      } finally {
        await closeScopeTx(scopeTx, ok);
      }
    },
  );

  // ── Staff (District-Admin takeover / fallback resolution) upload ─────────────────────────────────────
  r.post(
    '/api/v1/p/:pariwarId/reconciliation/statements',
    {
      schema: {
        params: PariwarParam,
        querystring: StaffUploadQuery,
        response: { 200: BankStatementUploadResponse },
        tags: [RECONCILIATION_TAG],
        consumes: ['multipart/form-data'],
      },
      preHandler: [adminSession, scope, canFileClaim, stepUp],
      onResponse: [firePendingMatchEnqueue],
    },
    async (request: FastifyRequest): Promise<BankStatementUploadResponse> => {
      const scopeTx = request.scopeTx as ScopeTx | undefined;
      const operatorId = request.requestContext.actorId;
      if (!scopeTx || !operatorId) {
        throw new UnauthorizedError('Authentication required', 'auth.session_required');
      }
      const { bank_code: bankCode, claim_case_id: claimCaseIdStr } = request.query as z.infer<
        typeof StaffUploadQuery
      >;
      if (!claimCaseIdStr) {
        // A missing required parameter is a 400-shaped problem, not "the claim doesn't exist" (404).
        throw new BadRequestError('A claim is required to file a statement', 'reconciliation.claim_required');
      }
      const pariwarId = ids.pariwarId(scopeTx.pariwarId);
      const pool = await reconciliation.resolveLivePoolByClaim(scopeTx.tx, {
        pariwarId,
        claimCaseId: ids.claimId(claimCaseIdStr),
      });
      if (pool === null) {
        throw new NotFoundError('No live pool for that claim', 'reconciliation.no_live_pool');
      }
      const target: UploadTarget = {
        pariwarId,
        poolId: ids.poolId(pool.poolId),
        claimCaseId: ids.claimId(pool.claimCaseId),
        bankCode,
        actorId: operatorId,
        role: 'staff',
      };
      // The staff route rides the middleware's scope tx (committed/rolled-back by the scope-resolution
      // wrapper), so this handler does not open/close its own — the 6.5 helpline-document precedent.
      const body = await h.uploadBankStatement(request, scopeTx, target);
      // Decision D7 — the enqueue-primary latency optimizer. Genuinely POST-COMMIT: handed off to the
      // route's `onResponse` hook, which Fastify guarantees runs strictly after `onSend` — the hook where the
      // multi-tenant lifecycle commits THIS scope tx (see `pendingMatchEnqueue`'s header comment).
      pendingMatchEnqueue.set(request, { cycleId: pool.cycleId, pariwarId });
      return body;
    },
  );
}

/**
 * Best-effort RECONCILIATION_MATCH enqueue (Decision D7). No-ops when the queue seam is unwired (tests) or the
 * cycle is unknown; swallows any enqueue error (the 4h recovery sweep is the safety net — a dropped job never
 * strands a member). NEVER throws into the request path.
 */
async function enqueueMatchBestEffort(
  deps: AppDeps,
  request: FastifyRequest,
  cycleId: string | undefined,
  pariwarId: string,
): Promise<void> {
  if (!deps.reconciliationMatchQueue || !cycleId) return;
  try {
    const traceId = request.requestContext.traceId || `reconciliation.upload:${cycleId}`;
    await deps.reconciliationMatchQueue.enqueueMatch({
      cycleId,
      pariwarId,
      requestId: traceId,
      actorId: request.requestContext.actorId ?? null,
      traceId,
    });
  } catch (err) {
    request.log?.warn?.(
      { err, cycleId },
      '[reconciliation] match-enqueue failed post-upload (best-effort; the 4h sweep will heal)',
    );
  }
}
