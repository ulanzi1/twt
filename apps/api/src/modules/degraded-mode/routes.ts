// Trustee degraded-mode declare/revoke/read routes — Story 5.8 (Task 5; AC4).
//
// The scoped admin chain [requireAdminSession, scopeResolutionHook, requirePermissionHook(
// pariwar.declare_degraded_mode)] (the channel-config precedent). Scope-resolution sets request.scopeTx +
// request.scopeGrants; the permission hook fail-closes on deny (401 no session, 403 no permission — never a
// silent declaration write; AI-4-3(b)). All three routes register in openapi/v1.yaml (the EXPECTED diff).

import { DegradedModeActiveResponse, DegradedModeDeclarationResponse, DegradedModeDeclareRequest } from '@twt/contracts';
import type { FastifyInstance } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';

import type { AppDeps } from '../../context.js';
import { scopeResolutionHook } from '../../middleware/scope-resolution/index.js';
import { requireAdminSession } from '../auth/shared/session-guard.js';
import { requirePermissionHook } from '../rbac/index.js';
import { createDegradedModeHandlers } from './handlers.js';

const DEGRADED_MODE_TAG = 'degraded-mode';

const PariwarParam = z.object({ pariwarId: z.string().uuid() }).strict();
const RevokeParams = z.object({ pariwarId: z.string().uuid(), id: z.string().uuid() }).strict();

export function registerDegradedModeRoutes(app: FastifyInstance, deps: AppDeps): void {
  const h = createDegradedModeHandlers(deps);
  const r = app.withTypeProvider<ZodTypeProvider>();
  const adminSession = requireAdminSession(deps);
  const scope = scopeResolutionHook(deps);
  const declareDegradedMode = requirePermissionHook(deps, h.PARIWAR_DECLARE_DEGRADED_MODE_KEY);
  const chain = [adminSession, scope, declareDegradedMode];

  r.post(
    '/api/v1/p/:pariwarId/admin/degraded-mode/declarations',
    {
      schema: {
        params: PariwarParam,
        body: DegradedModeDeclareRequest,
        response: { 200: DegradedModeDeclarationResponse },
        tags: [DEGRADED_MODE_TAG],
      },
      preHandler: chain,
    },
    h.declare,
  );

  r.post(
    '/api/v1/p/:pariwarId/admin/degraded-mode/declarations/:id/revoke',
    {
      schema: {
        params: RevokeParams,
        response: { 200: DegradedModeActiveResponse },
        tags: [DEGRADED_MODE_TAG],
      },
      preHandler: chain,
    },
    h.revoke,
  );

  r.get(
    '/api/v1/p/:pariwarId/admin/degraded-mode/active',
    {
      schema: { params: PariwarParam, response: { 200: DegradedModeActiveResponse }, tags: [DEGRADED_MODE_TAG] },
      preHandler: chain,
    },
    h.getActive,
  );
}
