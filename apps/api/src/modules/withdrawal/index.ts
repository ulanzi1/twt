// Withdrawal module barrel — Story 3.10 (Task 5).
//
// Registers the member voluntary-withdrawal SURFACE (FR-6): the step-up-gated confirm route under
// /api/v1/member/withdrawal. Wired into server.ts next to registerLifeEventsModule.
//
// NO `withdrawal.repo.ts`: the confirm route is fully member-session-gated — there is no pre-scope
// path — so the handler talks to the `@twt/domain` `member.*` accessors directly inside its own scope
// tx (the life-events module precedent). The signup rejoin-lock READ lives in the member-auth repo
// (it is a PRE-scope cross-tenant read on the signup path, not part of this module).

import type { FastifyInstance } from 'fastify';

import type { AppDeps } from '../../context.js';
import { registerWithdrawalRoutes } from './routes.js';

export function registerWithdrawalModule(app: FastifyInstance, deps: AppDeps): void {
  registerWithdrawalRoutes(app, deps);
}
