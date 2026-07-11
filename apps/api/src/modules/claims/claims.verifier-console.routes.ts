// Verifier-console admin route — Story 6.10 (Task 3; AC1/AC3/AC5, D3/D3a).
//
// ONE READ-ONLY scope-gated admin route serving the bounded compound signals view for a single claim.
// The route IS the security control (AC5): an authenticated HUMAN admin session + `claim.verify` at the
// deceased member's SERVER-DERIVED district + tenant match — fail-closed, audited. No decision endpoint
// exists here (AC4), so nothing on this surface can auto-adjudicate.
//
// ── District is derived server-side, never client-submitted (D3) ────────────────────────────────────
// `requirePermissionHook`'s resolveValue is SYNCHRONOUS, but the authz district is an async DB derivation
// (the deceased member's latest posting district). So — exactly the 6.7 `resolveGroundInspectionAssignment`
// pattern — a preHandler resolves it first and stashes it on `request.verifierConsoleDistrict`; the sync
// resolveValue then reads the stash. The client submits ONLY pariwarId + claimCaseId in the path.
//
// ── Fail-closed no-district exception (D3a) ─────────────────────────────────────────────────────────
// When the deceased has no resolvable posting district the stash is `null`; the district gate cannot
// exact-node match → the domain check fails closed → 403 for district-dimension actors. We do NOT fall
// back to the actor's selected district (that would over-grant across districts). The exception QUEUE /
// routing (who ultimately opens a no-district claim) is downstream (6.12/6.13), not 6.10.

import { claim, ids, member as memberDomain } from '@twt/domain';
import type { FastifyInstance, FastifyRequest, preHandlerHookHandler } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';

import { VerifierConsoleResponse } from '@twt/contracts';

import type { AppDeps } from '../../context.js';
import { UnauthorizedError } from '../../http-errors.js';
import { scopeResolutionHook } from '../../middleware/scope-resolution/index.js';
import { requireAdminSession } from '../auth/shared/session-guard.js';
import { requirePermissionHook } from '../rbac/index.js';
import { createVerifierConsoleHandlers, VERIFIER_CONSOLE_KEY } from './claims.verifier-console.handlers.js';

const TAG = 'verifier-console';

const ConsoleParam = z.object({ pariwarId: z.string().uuid(), claimCaseId: z.string().uuid() }).strict();

/**
 * PreHandler: derive the deceased member's latest posting district SERVER-SIDE and stash it so the
 * (synchronous) district `resolveValue` can read it (the client never submits the authz district — D3).
 * Runs AFTER scope-resolution (needs request.scopeTx). A claim missing in this Pariwar stashes a district
 * of `null` (⇒ the district gate fails closed to 403), the same fail-closed posture as a missing district.
 */
function resolveVerifierConsoleDistrict(): preHandlerHookHandler {
  return async function preHandler(request: FastifyRequest): Promise<void> {
    const scopeTx = request.scopeTx;
    if (!scopeTx) throw new UnauthorizedError('Authentication required', 'auth.session_required');
    const { claimCaseId } = request.params as { claimCaseId: string };
    const claimRow = await claim.getClaimCase(
      scopeTx.tx,
      ids.pariwarId(scopeTx.pariwarId),
      ids.claimId(claimCaseId),
    );
    if (!claimRow) {
      // No claim in this Pariwar (RLS + explicit predicate; a cross-tenant guess also lands here).
      // Fail closed — the district gate denies (403). The handler's core read would 404, but the
      // authorization boundary must not leak existence, so we deny at the gate.
      request.verifierConsoleDistrict = null;
      return;
    }
    const posting = await memberDomain.getMemberPostingLatest(
      scopeTx.tx,
      ids.pariwarId(scopeTx.pariwarId),
      claimRow.deceasedMemberId,
    );
    request.verifierConsoleDistrict = posting?.district ?? null;
  };
}

export function registerVerifierConsoleRoutes(app: FastifyInstance, deps: AppDeps): void {
  const h = createVerifierConsoleHandlers(deps);
  const r = app.withTypeProvider<ZodTypeProvider>();
  const adminSession = requireAdminSession(deps);
  const scope = scopeResolutionHook(deps);
  const resolveDistrict = resolveVerifierConsoleDistrict();
  // The authz district is the server-derived stash — the client value is never trusted (D3).
  const districtFromStash = (request: FastifyRequest): string | null => request.verifierConsoleDistrict ?? null;
  const requireVerify = requirePermissionHook(deps, VERIFIER_CONSOLE_KEY, {
    dimension: 'district',
    resolveValue: districtFromStash,
  });

  // AC1/AC3/AC5 — the READ-ONLY verifier console (district-gated, audited, human-actor-only).
  r.get(
    '/api/v1/p/:pariwarId/admin/claims/:claimCaseId/verifier-console',
    {
      schema: {
        params: ConsoleParam,
        response: { 200: VerifierConsoleResponse },
        tags: [TAG],
      },
      preHandler: [adminSession, scope, resolveDistrict, requireVerify],
    },
    h.getVerifierConsole,
  );
}
