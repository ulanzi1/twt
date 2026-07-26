// Reconciliation module barrel — Story 9.3 (Task 2). The FIRST reconciliation API module.
//
// Registers the bank-statement upload SURFACE (the transport Story 9.2 deferred): the dual member/staff
// upload endpoints running `parseStatement` inline over the uploaded buffer, storing the raw blob, emitting
// the reconciliation.* provenance/engagement + fallback events. Wired into server.ts next to the
// nominee-console module. NO repo.ts — the handlers talk to @twt/domain reads + @twt/events append + the
// injected BankStatementStorage / StatementScanner ports directly inside the scope tx.

import type { FastifyInstance } from 'fastify';

import type { AppDeps } from '../../context.js';
import { registerReconciliationRoutes } from './routes.js';

export function registerReconciliationModule(app: FastifyInstance, deps: AppDeps): void {
  registerReconciliationRoutes(app, deps);
}
