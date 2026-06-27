// Medical module barrel — Story 3.5 (Task 6).
//
// Registers the signup medical-disclosure SURFACE: POST /api/v1/member/medical-disclosure (submit)
// + GET /api/v1/member/medical-disclosure (status) + GET .../ima-list (catalog + ack copy), all
// member-session-gated. Wired into server.ts next to registerNomineeModule.
//
// NO `medical.repo.ts` (like the nominee module, unlike kyc): every route is fully member-session-
// gated — there is no PUBLIC pre-scope path (kyc.repo exists only for the DigiLocker callback's
// BYPASSRLS cross-tenant lookup). The handler talks to the `@twt/domain` `medical.*` / `consent.*`
// / `audit.*` accessors directly inside its own scope tx.

import type { FastifyInstance } from 'fastify';

import type { AppDeps } from '../../context.js';
import { registerMedicalRoutes } from './medical.routes.js';

export function registerMedicalModule(app: FastifyInstance, deps: AppDeps): void {
  registerMedicalRoutes(app, deps);
}
