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
import { registerShepherdRoutes } from './claims.shepherd.routes.js';
import { registerCycleFreezeRoutes } from './claims.cycle-freeze.routes.js';
import { registerR9VotingRoutes } from './claims.r9-voting.routes.js';
import { registerConcealmentAssessmentRoutes } from './claims.concealment-assessment.routes.js';

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
  // Story 6.12 — the R6 manual shepherd reassignment WRITE surface (claim.assign_shepherd, district-gated).
  registerShepherdRoutes(app, deps);
  // Story 6.13 — the State-Trustee cycle-freeze (bulk-approval) surface: the two-bucket pending list +
  // per-claim decision + the step-up-gated bulk commit (cycle.freeze, pariwar-gated; the FIRST
  // state_trustee-facing surface). The commit fires the POST-COMMIT pool-spawn trigger seam (AC6).
  registerCycleFreezeRoutes(app, deps);
  // Story 6.14 — the R9 special-case voting panel surface: the queue + per-claim panel + open/vote/finalize/
  // cancel + votes-by-trustee (claim.r9_vote, pariwar-gated; finalize additionally r9_finalize step-up-gated).
  // The CONSUMER end of 6.13's routeToR9 parking seam; finalize is the sole lifecycle-changer (claim.r9_outcome).
  registerR9VotingRoutes(app, deps);
  // Story 6.15 — the verifier concealment-linkage assessment WRITE surface (claim.verify, district-gated):
  // records/revises the human-supplied claim.concealed_ima_condition_linked fact. A review annotation — it
  // flags/routes, NEVER denies (the State Trustee alone decides at cycle-freeze, D-B).
  registerConcealmentAssessmentRoutes(app, deps);
}
