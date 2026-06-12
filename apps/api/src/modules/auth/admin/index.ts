// Admin-auth module entry — registers the admin authentication surface.
//
// The CSRF-token mint endpoint (AC-3): a browser client GETs a token here, then
// submits it in the `csrf-token` header on the protected state-changing routes (the
// `app.csrfProtection` pre-handler validates it against the session-stored secret).
// The password / WebAuthn / recovery / reset routes are in admin-auth.routes.ts;
// the step-up routes (Task 5) in step-up.routes.ts.

import type { FastifyInstance } from 'fastify';

import type { AppDeps } from '../../../context.js';
import { registerStepUpRoutes } from '../../step-up/index.js';
import { registerAdminAuthRoutes } from './admin-auth.routes.js';

export function registerAdminAuthModule(app: FastifyInstance, deps: AppDeps): void {
  // CSRF token mint (idempotent GET — no CSRF protection on itself). Establishes
  // the anonymous session that carries the CSRF secret + double-submit token.
  app.get('/api/v1/auth/csrf', { schema: { hide: true } }, (_request, reply) => {
    return { csrfToken: reply.generateCsrf() };
  });

  registerAdminAuthRoutes(app, deps);
  registerStepUpRoutes(app, deps);
}
