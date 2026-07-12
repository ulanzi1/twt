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
import { registerGroundInspectionRoutes } from './claims.ground-inspection.routes.js';
import { registerHelplineClaimsRoutes } from './claims.helpline.routes.js';
import { registerClaimsRoutes } from './claims.routes.js';
import { registerVerificationDecisionRoutes } from './claims.verification-decision.routes.js';
import { registerVerifierConsoleRoutes } from './claims.verifier-console.routes.js';

export function registerClaimsModule(app: FastifyInstance, deps: AppDeps): void {
  registerClaimsRoutes(app, deps);
  registerHelplineClaimsRoutes(app, deps);
  // Story 6.4 — the ICP convergence-resolution surface (pending list + merge + override).
  registerConvergenceRoutes(app, deps);
  // Story 6.7 — the ground-inspection admin surface (schedule/reschedule/findings/complete/refusal/photos/read).
  registerGroundInspectionRoutes(app, deps);
  // Story 6.10 — the READ-ONLY verifier-console bounded compound signals view (one district-gated GET).
  registerVerifierConsoleRoutes(app, deps);
  // Story 6.11 — the verifier adjudication WRITE surface (approve/deny/escalate + step-up-gated revise).
  registerVerificationDecisionRoutes(app, deps);
}
