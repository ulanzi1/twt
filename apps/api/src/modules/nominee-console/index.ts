// Nominee-console module barrel — Story 9.1 (Task 1). The FIRST Epic-9 SURFACE.
//
// Registers the Nominee Console read SURFACE: GET /api/v1/member/nominee-console, member-session-gated.
// Wired into server.ts next to registerMemberPoolModule. NO repo.ts (like member-pool): the single route
// is fully member-session-gated — no PUBLIC pre-scope path. The handler talks to the @twt/domain
// nominee-console reads (the validated-nominee gate + poolOpenAt) directly inside its own scope tx, and
// runs the pure staff-takeover derivation server-side.

import type { FastifyInstance } from 'fastify';

import type { AppDeps } from '../../context.js';
import { registerNomineeConsoleRoutes } from './routes.js';

export function registerNomineeConsoleModule(app: FastifyInstance, deps: AppDeps): void {
  registerNomineeConsoleRoutes(app, deps);
}
