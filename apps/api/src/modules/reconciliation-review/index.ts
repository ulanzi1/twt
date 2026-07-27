// Reconciliation review-queue module barrel — Story 9.8 (Task 5). The trustee ADJUDICATION surface.
//
// A NEW module (the existing apps/api/src/modules/reconciliation/ is upload transport only): the
// deadline-ordered open-case queue read, the per-case detail read, and the four step-up-gated actions
// (confirm/reject/facilitate-recovery/review-and-reverse). Wired into server.ts next to the reconciliation
// upload module. NO repo.ts — the handlers talk to @twt/domain reads/writers + the injected storage/audit
// ports directly inside the scope tx.

import type { FastifyInstance } from 'fastify';

import type { AppDeps } from '../../context.js';
import { registerReconciliationReviewRoutes } from './routes.js';

export function registerReconciliationReviewModule(app: FastifyInstance, deps: AppDeps): void {
  registerReconciliationReviewRoutes(app, deps);
}
