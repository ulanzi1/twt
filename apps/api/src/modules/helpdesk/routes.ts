// Helpdesk create-ticket primitive route — Story 10.1 (Task 6; AC1/AC5).
//
// ONE tenant-scoped endpoint (POST create ticket) behind the scoped admin chain
// [requireAdminSession, scopeResolutionHook] + a per-route WRITE rate-limit (the FR-88 protected-
// surface posture; §2.11/§5.8a). Scope-resolution sets request.scopeTx (the RLS-scoped request tx the
// projector writes through) + request.scopeGrants. The route registers in openapi/v1.yaml (the
// EXPECTED diff). The body is validated by the Zod contract; success is 201 (the created ticket).
//
// This is the create-ticket PRIMITIVE both Epic-10 surfaces build on: the operator call-to-ticket
// surface (Story 10.3) is the live tenant-scoped caller; the member-app ticket-filing surface (Story
// 10.2, apps/mobile) adds its own member-session-gated `/member/helpdesk/...` variant reusing the same
// domain orchestration (the claims member-vs-helpline split precedent).
//
// ── The permission gate — closed at Story 10.3 (was the re-deferred RBAC gap) ──────────────────────
// Story 10.3 CLOSES the `helpdesk.create` gap 10.1's chunk-4 review + 10.2's Dev Notes re-deferred here:
// the create route now sits behind `requirePermissionHook(deps, HELPDESK_CREATE_KEY, { dimension:
// 'pariwar' })` (value = scopeTx.pariwarId — the reconciliation.review / cycle.freeze pariwar-wide-key
// precedent; a helpdesk ticket is Pariwar-scoped, the tenant IS the target, no server-derived district).
// Granted to `helpline_operator` (the SM-1 C3 actor) + `pariwar_admin` + `super_admin` (roles.ts). NO
// step-up — helpdesk create is NOT freeze-firing and NOT in the AR-24 list (unlike the 6.3 claim intake;
// do NOT copy `requireStepUp` from claims.helpline.routes.ts). A member-app turnstile/idempotency binding
// lives on the separate 10.2 member route, not here.

import { CreateTicketRequest, CreateTicketResponse, HelpdeskCategoryListResponse } from '@twt/contracts';
import type { FastifyInstance } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';

import type { AppDeps } from '../../context.js';
import { scopeResolutionHook } from '../../middleware/scope-resolution/index.js';
import { namedRateLimits } from '../../plugins/rate-limit/index.js';
import { requireAdminSession } from '../auth/shared/session-guard.js';
import { requirePermissionHook } from '../rbac/index.js';
import { createHelpdeskHandlers } from './handlers.js';

const HELPDESK_TAG = 'helpdesk';

/** The Story-10.3 pariwar-dimension helpdesk ticket-create key (catalog v23). */
const HELPDESK_CREATE_KEY = 'helpdesk.create';

const PariwarParam = z.object({ pariwarId: z.string().uuid() }).strict();

export function registerHelpdeskRoutes(app: FastifyInstance, deps: AppDeps): void {
  const h = createHelpdeskHandlers(deps);
  const r = app.withTypeProvider<ZodTypeProvider>();
  const adminSession = requireAdminSession(deps);
  const scope = scopeResolutionHook(deps);
  const limits = namedRateLimits(deps);
  // helpdesk.create at dimension:'pariwar' (EXPLICIT — the target IS the tenant; resolveValue defaults to
  // scopeTx.pariwarId, the reconciliation.review / cycle.freeze pariwar-wide precedent; no district).
  const requireCreate = requirePermissionHook(deps, HELPDESK_CREATE_KEY, { dimension: 'pariwar' });

  r.post(
    '/api/v1/p/:pariwarId/helpdesk/tickets',
    {
      schema: {
        params: PariwarParam,
        body: CreateTicketRequest,
        response: { 201: CreateTicketResponse },
        tags: [HELPDESK_TAG],
      },
      // The FR-88 protected-surface rate-limit (per-session-keyed write budget).
      config: { rateLimit: limits.write },
      preHandler: [adminSession, scope, requireCreate],
    },
    h.create,
  );

  // Story 10.3 (AC5) — the operator category picker read. The in-force routing-policy category set
  // (reuses the domain `categoriesForPariwar`), gated by the SAME `helpdesk.create` grant (a caller who
  // may file may read the category set) so the UI is registry-driven, never hardcoding the v1 categories.
  r.get(
    '/api/v1/p/:pariwarId/helpdesk/categories',
    {
      schema: {
        params: PariwarParam,
        response: { 200: HelpdeskCategoryListResponse },
        tags: [HELPDESK_TAG],
      },
      // The standard named per-endpoint read ceiling (§2.11) — every other GET route in the codebase
      // opts into this; this route had been missing it.
      config: { rateLimit: limits.read },
      preHandler: [adminSession, scope, requireCreate],
    },
    h.categories,
  );
}
