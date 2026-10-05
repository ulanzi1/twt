// The per-Pariwar WARNING-REASON LIST module barrel — Story 6.23a (Task 11; NW16, NW17).
//
// The Super Admin's screen behind the warning reason an approver picks when approving a claim while a nominee-change
// warning shows (`-262` FQ2, `-264` FQ12; the reasons' wording re-delegated to the Super Admin at runtime by `-278`).
// ⭐ ADD and REPLACE only — ⛔ never edit, ⛔ never delete (BigDev, 2026-10-04). Wired into server.ts next to
// registerDriveTargetModule (its nearest sibling: a per-Pariwar, Super-Admin-gated, append-only governance control).

import type { FastifyInstance } from 'fastify';

import type { AppDeps } from '../../context.js';
import { registerApprovalWarningReasonRoutes } from './routes.js';

export function registerApprovalWarningReasonsModule(app: FastifyInstance, deps: AppDeps): void {
  registerApprovalWarningReasonRoutes(app, deps);
}
