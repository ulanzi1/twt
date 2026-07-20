// Member pool module barrel — Story 8.2 (Task 2).
//
// Registers the My Pool home-card read SURFACE: GET /api/v1/member/active-contribution,
// member-session-gated. Wired into server.ts next to registerMemberHomeModule. A SIBLING module (NOT
// folded into member-home/) — member-home was explicitly built to "avoid premature coupling with the
// Epic-8 My Pool surface that eventually replaces this widget" (D1). The FIRST Epic-8 SURFACE.
//
// NO repo.ts (like member-home): the single route is fully member-session-gated — no PUBLIC pre-scope
// path. The handler talks to the `@twt/domain` read accessors directly inside its own scope tx.

import type { FastifyInstance } from 'fastify';

import type { AppDeps } from '../../context.js';
import { registerMemberPoolRoutes } from './routes.js';

export function registerMemberPoolModule(app: FastifyInstance, deps: AppDeps): void {
  registerMemberPoolRoutes(app, deps);
}
