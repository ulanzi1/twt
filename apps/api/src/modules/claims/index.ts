// Claims module barrel — Story 6.2 (Task 2).
//
// Registers the member-app claim-filing SURFACE: the handover-trust OTP send/verify + the
// intake route (the FIRST live caller of the Story 6.1 claim primitive). Wired into
// server.ts next to registerNomineeModule. Member-session-gated throughout — no pre-scope
// path — so (like the nominee module) there is no `claims.repo.ts`: the handler talks to the
// `@twt/domain` `claim.*` / `nominee.*` accessors + the shared member-OTP machinery directly
// inside its own scope tx.

import type { FastifyInstance } from 'fastify';

import type { AppDeps } from '../../context.js';
import { registerClaimsRoutes } from './claims.routes.js';

export function registerClaimsModule(app: FastifyInstance, deps: AppDeps): void {
  registerClaimsRoutes(app, deps);
}
