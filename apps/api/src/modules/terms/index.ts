// Member-terms module barrel — Story 3.6a (Task 5).
//
// Registers the member-facing T&C SURFACE: GET /api/v1/member/terms (current effective) + POST
// /api/v1/member/terms/accept (records a tc_acceptance consent via the audit-or-throw chain), both
// member-session-gated. Wired into server.ts next to registerMedicalModule. SEPARATE from the
// trustee `terms-and-conditions` admin module (authoring/approval): the admin module authors +
// approves versions; this module is the member READ + ACCEPT on top.
//
// NO repo file (like the nominee/medical modules): every route is fully member-session-gated — there
// is no PUBLIC pre-scope path. The handler talks to the `@twt/domain` `termsAndConditions.*` /
// `consent.*` / `audit.*` accessors directly inside its own scope tx.

import type { FastifyInstance } from 'fastify';

import type { AppDeps } from '../../context.js';
import { registerMemberTermsRoutes } from './member-terms.routes.js';

export function registerMemberTermsModule(app: FastifyInstance, deps: AppDeps): void {
  registerMemberTermsRoutes(app, deps);
}
