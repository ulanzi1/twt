// Reports-&-exports library module barrel — Story 10.7 (Task 6).
//
// The admin FR-58A reports surface (request/poll/download), the admin analog of the 3.11 member
// data-export module: scope-respecting + PII-masked (the assembly + masking run in apps/jobs; this
// request path carries admin-identity keys — the 10.4 crypto boundary). Per-template RBAC (Decision 6)
// is enforced INSIDE the handler (the key is dynamic per report_type). Wired into server.ts next to the
// news-blog + helpdesk modules. NO repo.ts — handlers talk to @twt/domain in their own scope tx.

import type { FastifyInstance } from 'fastify';

import type { AppDeps } from '../../context.js';
import { registerReportsRoutes } from './routes.js';

export { createPgBossReportExportEnqueuer } from './queue.js';

export function registerReportsModule(app: FastifyInstance, deps: AppDeps): void {
  registerReportsRoutes(app, deps);
}
