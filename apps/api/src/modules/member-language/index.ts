// Member app-language module barrel — Story 6.35 (Task 2.2; LS2, Decision 2026-10-23-387).
//
// Two member-session-gated routes under /api/v1/member/language (GET the choice + the Pariwar default; PUT an explicit change).
// Wired into server.ts next to registerLifeEventsModule (the simple self-service write precedent). ⛔ RBAC key (member routes are
// `requireMemberSession`-gated), ⛔ events_log event (a preference, ⛔ a lifecycle fact), ⛔ repo file (⛔ pre-scope path).

import type { FastifyInstance } from 'fastify';

import type { AppDeps } from '../../context.js';
import { registerMemberLanguageRoutes } from './routes.js';

export function registerMemberLanguageModule(app: FastifyInstance, deps: AppDeps): void {
  registerMemberLanguageRoutes(app, deps);
}
