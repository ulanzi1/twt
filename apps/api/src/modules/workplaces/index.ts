// The workplace LIST + *"isn't listed"* QUEUE module barrel — Story 6.36c (Task 4.1; AC2, AC3; `-330` SW9 A).
//
// The Super Admin keeps the office list and adds any school the import missed; a Pariwar Admin SUGGESTS a listed entry for
// a member's *"my workplace isn't listed"* — and only the MEMBER's *"Yes"* (the life-events answer route) writes a posting.
// Wired into server.ts beside registerApprovalWarningReasonsModule (its nearest sibling: a per-Pariwar, Super-Admin-gated
// staff list with ⛔ edit-in-place of another source's rows and ⛔ delete).

import type { FastifyInstance } from 'fastify';

import type { AppDeps } from '../../context.js';
import { registerWorkplaceAdminRoutes } from './routes.js';

export function registerWorkplacesModule(app: FastifyInstance, deps: AppDeps): void {
  registerWorkplaceAdminRoutes(app, deps);
}
