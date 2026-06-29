// Member home module barrel — Story 3.7 (Task 3).
//
// Registers the lock-in home-widget read SURFACE: GET /api/v1/member/lock-in-status, member-session-
// gated. Wired into server.ts next to registerVyawasthaShulkModule. Own module (NOT folded into
// vyawastha-shulk/, the payment surface) to keep the lifecycle/home read self-contained and avoid
// premature coupling with the Epic-8 "My Pool" surface that eventually replaces this widget (AC3).
//
// NO repo.ts (like the medical/nominee/vyawastha-shulk modules): the single route is fully member-
// session-gated — no PUBLIC pre-scope path. The handler talks to the `@twt/domain` member.* read
// accessors directly inside its own scope tx.

import type { FastifyInstance } from 'fastify';

import type { AppDeps } from '../../context.js';
import { registerMemberHomeRoutes } from './routes.js';

export function registerMemberHomeModule(app: FastifyInstance, deps: AppDeps): void {
  registerMemberHomeRoutes(app, deps);
}
