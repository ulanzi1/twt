// Payment module barrel — Story 8.4 (Task 3). The architecture's reserved `modules/payment/` for Epic-8's
// contribution (member→nominee) UPI Intent surface (architecture.md:4523,4599,4679) — the fee flow
// deliberately stayed OUT of it (vyawastha-shulk/), so 8.4 lands it here.
//
// Registers the FIRST Epic-8 WRITE surface: POST /api/v1/member/contribution/{intent,attest},
// member-session-gated. Wired into server.ts next to registerMemberPoolModule. REUSES the member-pool/
// READ seam (`resolveMemberLivePool`) for pool resolution — no re-implementation. NO repo.ts: both routes
// are fully member-session-gated (no public pre-scope path); the handlers talk to the `@twt/domain`
// accessors directly inside their own scope tx.

import type { FastifyInstance } from 'fastify';

import type { AppDeps } from '../../context.js';
import { registerPaymentRoutes } from './routes.js';

export function registerPaymentModule(app: FastifyInstance, deps: AppDeps): void {
  registerPaymentRoutes(app, deps);
}
