// "Did someone help you register?" module barrel — Story 3.15 (Task 2.1; DL1, DL10; author-commit 2026-11-22-494).
//
// Two member-session-gated routes under /api/v1/member/signup/assisted-code. The ONE `apps/api` caller of
// `payment.insertMemberAttribution` (N6 — the payment step stopped capturing, DL6) and a sanctioned importer of Story 13.2's API
// door (it imports `resolveAttributionForRequest` from `../field-worker/attribution-code-access.js` — ⛔ an ALLOWED entry in the
// reach fence). ⛔ RBAC key (member routes are `requireMemberSession`-gated), ⛔ events_log event (the existing audit action is
// reused), ⛔ schema change, ⛔ repo file.

import type { FastifyInstance } from 'fastify';

import type { AppDeps } from '../../context.js';
import { registerMemberAttributionRoutes } from './routes.js';

export function registerMemberAttributionModule(app: FastifyInstance, deps: AppDeps): void {
  registerMemberAttributionRoutes(app, deps);
}
