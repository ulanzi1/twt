// Data-export module barrel — Story 3.11 (Task 5).
//
// Registers the member DPDPA data-export SURFACE (FR-95): the request + status-poll + one-time,
// step-up-gated download routes under /api/v1/member/data-export. Wired into server.ts next to
// registerWithdrawalModule. The build/vacuum WORKERS live in apps/jobs (this module only PRODUCES the
// build job via the send-only `deps.dataExportQueue`; apps cannot depend on apps — @twt/queue is the
// shared seam).

import type { FastifyInstance } from 'fastify';

import type { AppDeps } from '../../context.js';
import { registerDataExportRoutes } from './routes.js';

export { createPgBossDataExportEnqueuer } from './queue.js';

export function registerDataExportModule(app: FastifyInstance, deps: AppDeps): void {
  registerDataExportRoutes(app, deps);
}
