// Helpdesk module barrel — Story 10.1 (Task 6).
//
// The tenant-scoped create-ticket primitive route (the FIFTH event-derived-state primitive's write
// surface). The member ticket-filing UI (Story 10.2, apps/mobile), the helpline call-to-ticket
// operator surface (Story 10.3), and the admin console / SLA-breach / cross-link navigation (Story
// 10.4) build on this substrate. Wired into server.ts.

import type { FastifyInstance } from 'fastify';

import type { AppDeps } from '../../context.js';
import { registerMemberHelpdeskRoutes } from './member-routes.js';
import { registerHelpdeskRoutes } from './routes.js';

export function registerHelpdeskModule(app: FastifyInstance, deps: AppDeps): void {
  registerHelpdeskRoutes(app, deps);
  // Story 10.2 — the member-app ticket-filing surface (member-session-gated) on the same substrate.
  registerMemberHelpdeskRoutes(app, deps);
}
