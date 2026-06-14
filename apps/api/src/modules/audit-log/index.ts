// Audit-log route module (Story 1.11a, Task 7.2) — the on-demand integrity-
// verification endpoint (AC-2b).
//
// ── GLOBAL, not tenant-scoped ─────────────────────────────────────────────────
// POST /api/v1/audit/verify-integrity is GLOBAL — the audit chain is ONE global
// chain, so the route is NOT under /p/:pariwarId/. Placing it there would wrongly
// imply a per-tenant chain.
//
// ── Why requireAdminSession, NOT requirePermissionHook ────────────────────────
// requirePermissionHook (modules/rbac) requires `request.scopeTx`, which
// scopeResolutionHook sets from the `/:pariwarId/` path param. A GLOBAL route has
// no such param, so the RBAC hook would hard-throw 500. v1 therefore gates on an
// authenticated admin session ONLY (requireAdminSession). Recorded deferred work:
// upgrade to the full RBAC `audit.verify` gate when a global-scope preHandler
// exists. The permission-gated probe at /p/:pariwarId/audit/verify-probe stays in
// place (it exercises the scoped RBAC second-guard independently).
//
// ── URL convention ────────────────────────────────────────────────────────────
// Architecture §3.1 names /api/v1/global/<resource> for cross-Pariwar endpoints,
// but the auth module established the domain-prefix pattern (/api/v1/auth/...).
// This endpoint follows that (/api/v1/audit/...) — an intentional deviation from
// the /global/ prefix.
//
// ── Route code home ───────────────────────────────────────────────────────────
// Lives in modules/audit-log/ (route code). NOT in src/audit/, which holds Story
// 1.10's non-route writer utilities (audit-log-sink.ts / audit-sink.ts).
//
// The handler reuses deps.servicePool (the BYPASSRLS pool the 1.10 audit writer
// uses) to walk the GLOBAL chain, and calls the SAME `verifyAuditChain` @twt/jobs
// ships for the cron + post-mirror triggers — DD-4's "one function, three
// triggers".

import { AuditIntegrityCheckRequest, AuditIntegrityCheckResult } from '@twt/contracts';
import {
  resolveIntegrityAlerterFromEnv,
  resolveIntegritySinkFromEnv,
  verifyAuditChain,
} from '@twt/jobs';
import type { FastifyInstance } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';

import type { AppDeps } from '../../context.js';
import { UnauthorizedError } from '../../http-errors.js';
import { requireAdminSession } from '../auth/shared/session-guard.js';

const AUDIT_TAG = 'audit';

export function registerAuditLogModule(app: FastifyInstance, deps: AppDeps): void {
  const r = app.withTypeProvider<ZodTypeProvider>();
  // Resolve the observability seams once at registration (v1 = structured-log
  // fakes; the live Cloud Monitoring wiring is the Category-5 graduation, DD-5).
  const sink = resolveIntegritySinkFromEnv();
  const alerter = resolveIntegrityAlerterFromEnv();

  r.post(
    '/api/v1/audit/verify-integrity',
    {
      schema: {
        body: AuditIntegrityCheckRequest,
        response: { 200: AuditIntegrityCheckResult },
        tags: [AUDIT_TAG],
      },
      preHandler: [requireAdminSession(deps)],
    },
    async (request) => {
      // requireAdminSession guarantees userId; re-narrow for the type system.
      const userId = request.session.userId;
      if (!userId) {
        throw new UnauthorizedError('Authentication required', 'auth.session_required');
      }

      const verdict = await verifyAuditChain({
        servicePool: deps.servicePool,
        sink,
        alerter,
        verifierActor: `on-demand:${userId}`,
        triggerSource: 'on_demand',
      });

      // Map the Drizzle row → wire shape (verified_at Date → ISO-8601 string).
      return { ...verdict, verifiedAt: verdict.verifiedAt.toISOString() };
    },
  );
}
