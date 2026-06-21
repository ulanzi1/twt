// Fastify application factory (AC-5).
//
// `buildServer(deps)` returns a fully-`ready()` Fastify instance bound to an
// injected `AppDeps` (config + pool + KMS + audit/step-up/turnstile seams +
// clock). Exported for tests — `fastify.inject` drives it in-process without a
// port (no supertest, per Task 8). The boot guard (index.ts) wires production
// deps and calls `listen`.
//
// Registration order is load-bearing:
//   1. Zod validator/serializer compilers (so route schemas validate).
//   2. Error handler (maps every throw to the ErrorResponse envelope).
//   3. request-context onRequest hook (traceId + ALS + encryption context) FIRST.
//   4. cookie → session → csrf (session needs cookie; csrf needs session).
//   5. rate-limit, swagger.
//   6. origin/referer onRequest hook (after session-load; defense-in-depth).
//   7. routes: health (Task 1), then the admin-auth module (Task 4).

import Fastify, { type FastifyInstance } from 'fastify';

import type { AppDeps } from './context.js';
import { registerHealthRoutes } from './health.js';
import { errorMappingHandler } from './middleware/error-mapping/index.js';
import { requestContextHook } from './middleware/request-context/index.js';
import { registerAuditLogModule } from './modules/audit-log/index.js';
import { registerAdminAuthModule } from './modules/auth/admin/index.js';
import { registerMultiTenant } from './modules/multi-tenant/index.js';
import { registerPariwarProvisioningModule } from './modules/pariwar-provisioning/index.js';
import { registerRulesModule } from './modules/rules/index.js';
import { registerCookie } from './plugins/cookie/index.js';
import { registerCsrf, originCheckHook } from './plugins/csrf-protection/index.js';
import { registerRateLimit } from './plugins/rate-limit/index.js';
import { registerHoneypot, registerSecurityHeaders } from './plugins/security-headers/index.js';
import { registerSession } from './plugins/session/index.js';
import { registerSwagger } from './plugins/swagger/index.js';
import { registerZodOpenapi } from './plugins/zod-openapi/index.js';
import { collectRoutes } from './route-registry.js';

export async function buildServer(deps: AppDeps): Promise<FastifyInstance> {
  const app = Fastify({
    // Quiet in tests; structured logs otherwise. The raw-logger ban + audit-log
    // wrapper land at Story 1.10 (deferred lint TODO in eslint-config-twt).
    logger: deps.config.nodeEnv === 'test' ? false : { level: process.env['LOG_LEVEL'] ?? 'info' },
    // Trust the proxy hop (Cloud Run / Dokploy) so request.ip + origin are accurate.
    trustProxy: true,
    // The session cookie + CSRF flows need the body; cap it defensively.
    bodyLimit: 1_048_576,
  });

  registerZodOpenapi(app);
  app.setErrorHandler(errorMappingHandler);

  // Record every route into the registry FIRST so the AC-2 login-wall + AC-3
  // forced-pagination guards can introspect the full table (Story 1.14).
  collectRoutes(app);

  // X-Robots-Tag: noindex, nofollow on every response (FR-92). onSend runs late, so
  // registering the hook here covers all routes declared below.
  registerSecurityHeaders(app);

  // Unmatched routes get the same ErrorResponse envelope (the global onRequest
  // hooks have already set request.requestContext, so traceId is present).
  app.setNotFoundHandler((request, reply) => {
    const requestId = request.requestContext?.traceId ?? 'unknown';
    void reply.status(404).send({
      error: { code: 'request.not_found', message: 'Not found', request_id: requestId },
    });
  });

  // request-context FIRST so traceId + ALS + encryption context exist for all hooks.
  app.addHook('onRequest', requestContextHook(deps));

  await registerCookie(app);
  await registerSession(app, deps);
  await registerCsrf(app);
  await registerRateLimit(app, deps);
  await registerSwagger(app);

  // Defense-in-depth Origin/Referer check on state-changing requests.
  app.addHook('onRequest', originCheckHook(deps));

  registerHealthRoutes(app, deps);
  registerMultiTenant(app, deps);
  registerAdminAuthModule(app, deps);
  // Story 1.11a — global on-demand audit-integrity verification endpoint.
  registerAuditLogModule(app, deps);
  // Story 1.15 — global multi-Pariwar provisioning surface (pariwar.provision gate).
  registerPariwarProvisioningModule(app, deps);
  // Story 2.4 — Niyamavali amendment workflow (tenant-scoped; the first consumer of
  // the Story 2.2 tone-review publish gate).
  registerRulesModule(app, deps);
  // Story 1.14 — honeypot trap routes (emit abuse.honeypot on a hit; hidden).
  registerHoneypot(app, deps);

  await app.ready();
  return app;
}
