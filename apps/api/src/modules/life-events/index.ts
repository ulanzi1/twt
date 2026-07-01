// Life Events module barrel — Story 3.9 (Task 5).
//
// Registers the member Life Events panel SURFACE (FR-5): five routes under
// /api/v1/member/life-events (nominee + medical step-up-gated reuse of the 3.4/3.5 services;
// NEW address + posting append-only writes; a GET summary). Wired into server.ts next to
// registerMemberHomeModule.
//
// NO `life-events.repo.ts`: the routes are fully member-session-gated — there is no pre-scope
// path — so the handlers talk to the `@twt/domain` `member.*` / `nominee.*` / `medical.*`
// accessors directly inside their own scope tx (the nominee/medical module precedent).

import type { FastifyInstance } from 'fastify';

import type { AppDeps } from '../../context.js';
import { registerLifeEventsRoutes } from './routes.js';

export function registerLifeEventsModule(app: FastifyInstance, deps: AppDeps): void {
  registerLifeEventsRoutes(app, deps);
}
