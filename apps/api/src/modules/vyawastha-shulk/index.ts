// Vyawastha Shulk module barrel — Story 3.6b (Task 6).
//
// Registers the signup ₹110 Vyawastha Shulk SURFACE: POST /api/v1/member/vyawastha-shulk/intent +
// POST .../confirm + GET .../status, all member-session-gated. Wired into server.ts next to
// registerMedicalModule. Own module (NOT the architecture's generic modules/payment/, reserved for
// Epic 8 contributions) to keep the signup-fee path self-contained (R4).
//
// NO repo.ts (like the medical/nominee modules): every route is fully member-session-gated — there is
// no PUBLIC pre-scope path. The handler talks to the `@twt/domain` payment.* / member.* accessors
// directly inside its own scope tx.

import type { FastifyInstance } from 'fastify';

import type { AppDeps } from '../../context.js';
import { registerVyawasthaShulkRoutes } from './routes.js';

export function registerVyawasthaShulkModule(app: FastifyInstance, deps: AppDeps): void {
  registerVyawasthaShulkRoutes(app, deps);
}
