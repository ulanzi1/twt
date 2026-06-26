// Nominee module barrel — Story 3.4 (Task 5).
//
// Registers the signup nominee-declaration SURFACE: POST /api/v1/member/nominees (declare) +
// GET /api/v1/member/nominees (status), both member-session-gated. Wired into server.ts next
// to registerKycModule.
//
// NO `nominee.repo.ts` (unlike the KYC module): kyc.repo exists solely for the PUBLIC
// DigiLocker callback's BYPASSRLS pre-scope cross-tenant lookup (no member JWT). Nominee
// routes are fully member-session-gated — there is no pre-scope path, so a repo seam would
// add complexity with no purpose. The handler talks to the `@twt/domain` `nominee.*`
// accessors directly inside its own scope tx.

import type { FastifyInstance } from 'fastify';

import type { AppDeps } from '../../context.js';
import { registerNomineeRoutes } from './nominee.routes.js';

export function registerNomineeModule(app: FastifyInstance, deps: AppDeps): void {
  registerNomineeRoutes(app, deps);
}
