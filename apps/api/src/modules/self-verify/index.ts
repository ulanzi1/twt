// Self-verify recovery module barrel — Story 9.7 (Tasks 3/4). The member-facing recovery API module.
//
// Registers the FR-32 screenshot-upload transport (the ONE budgeted friction surface) + the
// `<SelfVerifySurface>` detail read. Wired into server.ts next to the reconciliation + member-pool modules.
// NO repo.ts — the handlers talk to @twt/domain reads + the injected SelfVerifyScreenshotStorage /
// StatementScanner ports + the self-verify write primitive directly inside the scope tx. PURE EVIDENCE
// INTAKE (AC4): the upload path records evidence + feeds the Story 9.8 review queue; it never adjudicates.

import type { FastifyInstance } from 'fastify';

import type { AppDeps } from '../../context.js';
import { registerSelfVerifyRoutes } from './routes.js';

export function registerSelfVerifyModule(app: FastifyInstance, deps: AppDeps): void {
  registerSelfVerifyRoutes(app, deps);
}
