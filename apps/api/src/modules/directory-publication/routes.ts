// Directory-publication kill-switch admin routes — Story 10.30 (Task 3; AC1, AC2).
//
// The scoped admin chain [requireAdminSession, scopeResolutionHook, requirePermissionHook(
// pariwar.manage_directory_publication)] (the degraded-mode precedent). Scope-resolution sets
// request.scopeTx + request.scopeGrants; the permission hook fail-closes on deny — 401 no session,
// 403 no permission, ⛔ never a silent no-op and ⛔ never a 200. Both routes register in
// openapi/v1.yaml (the EXPECTED diff for this story).
//
// ⛔ The chain is the ONLY permission boundary that matters here. The admin console deliberately
// carries NO client-side capability check: `pariwar.manage_directory_publication` is a
// PARIWAR-dimension grant and never appears in an admin session's `nationalGrants`, so a
// client-side gate modelled on the global-scope pattern would deny every operator including
// super_admin.

import {
  DirectoryPublicationStatusResponse,
  SetDirectoryPublicationRequest,
} from '@twt/contracts';
import type { FastifyInstance } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';

import type { AppDeps } from '../../context.js';
import { scopeResolutionHook } from '../../middleware/scope-resolution/index.js';
import { requireAdminSession } from '../auth/shared/session-guard.js';
import { requirePermissionHook } from '../rbac/index.js';
import { createDirectoryPublicationHandlers } from './handlers.js';

const DIRECTORY_PUBLICATION_TAG = 'directory-publication';

const PariwarParam = z.object({ pariwarId: z.string().uuid() }).strict();

export function registerDirectoryPublicationRoutes(app: FastifyInstance, deps: AppDeps): void {
  const h = createDirectoryPublicationHandlers(deps);
  const r = app.withTypeProvider<ZodTypeProvider>();
  const adminSession = requireAdminSession(deps);
  const scope = scopeResolutionHook(deps);
  const manageDirectoryPublication = requirePermissionHook(
    deps,
    h.MANAGE_DIRECTORY_PUBLICATION_KEY,
  );
  const chain = [adminSession, scope, manageDirectoryPublication];

  r.get(
    '/api/v1/p/:pariwarId/admin/directory-publication/status',
    {
      schema: {
        params: PariwarParam,
        response: { 200: DirectoryPublicationStatusResponse },
        tags: [DIRECTORY_PUBLICATION_TAG],
      },
      preHandler: chain,
    },
    h.getStatus,
  );

  // ⭐ The `body` schema is the 400 boundary an empty rationale hits (`.trim().min(1)`). It is NOT a
  // convenience: without it the request reaches the domain's
  // `UngovernedDirectoryPublicationChangeError`, which is unregistered in the error-mapping registry
  // and would surface as an opaque 500 on a plain input error.
  r.put(
    '/api/v1/p/:pariwarId/admin/directory-publication/status',
    {
      schema: {
        params: PariwarParam,
        body: SetDirectoryPublicationRequest,
        response: { 200: DirectoryPublicationStatusResponse },
        tags: [DIRECTORY_PUBLICATION_TAG],
      },
      preHandler: chain,
    },
    h.setStatus,
  );
}
