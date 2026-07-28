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
// domain orchestration (the claims member-vs-helpline split precedent). A dedicated `helpdesk.create`
// permission + turnstile/bot-management binding for the member variant land with 10.2/10.3/10.4.

import { CreateTicketRequest, CreateTicketResponse } from '@twt/contracts';
import type { FastifyInstance } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';

import type { AppDeps } from '../../context.js';
import { scopeResolutionHook } from '../../middleware/scope-resolution/index.js';
import { namedRateLimits } from '../../plugins/rate-limit/index.js';
import { requireAdminSession } from '../auth/shared/session-guard.js';
import { createHelpdeskHandlers } from './handlers.js';

const HELPDESK_TAG = 'helpdesk';

const PariwarParam = z.object({ pariwarId: z.string().uuid() }).strict();

export function registerHelpdeskRoutes(app: FastifyInstance, deps: AppDeps): void {
  const h = createHelpdeskHandlers(deps);
  const r = app.withTypeProvider<ZodTypeProvider>();
  const adminSession = requireAdminSession(deps);
  const scope = scopeResolutionHook(deps);
  const limits = namedRateLimits(deps);

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
      preHandler: [adminSession, scope],
    },
    h.create,
  );
}
