// Claims module barrel — Story 6.2 (member app) + Story 6.3 (helpline).
//
// The module now serves BOTH claim-filing surfaces, both live callers of the Story 6.1 claim
// primitive, both converging on the SAME `initiateIntake` dedup core (claims.service.ts):
//   · member-app (Ravi-mode, 6.2): /api/v1/member/claims/* — handover-trust OTP + intake,
//     member-session-gated, deriving the pariwar from the session.
//   · helpline (operator, 6.3): /api/v1/p/:pariwarId/admin/claims/intake — the operator files
//     on a caller's behalf, scope-gated by the admin chain + the operator's own admin step-up.
//
// Wired into server.ts next to registerNomineeModule. The member surface owns its scope tx
// (openScopeTx); the helpline surface rides the scope-resolution middleware's scope tx.

import type { FastifyInstance } from 'fastify';

import type { AppDeps } from '../../context.js';
import { registerConvergenceRoutes } from './claims.convergence.routes.js';
import { registerHelplineClaimsRoutes } from './claims.helpline.routes.js';
import { registerClaimsRoutes } from './claims.routes.js';

export function registerClaimsModule(app: FastifyInstance, deps: AppDeps): void {
  registerClaimsRoutes(app, deps);
  registerHelplineClaimsRoutes(app, deps);
  // Story 6.4 — the ICP convergence-resolution surface (pending list + merge + override).
  registerConvergenceRoutes(app, deps);
}
