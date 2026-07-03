// RTBF module barrel — Story 3.12 (Task 3).
//
// Registers the member-initiated RTBF (Right-To-Be-Forgotten) SURFACE (FR-96): the step-up-gated
// confirm route under /api/v1/member/rtbf. Wired into server.ts next to registerWithdrawalModule /
// registerDataExportModule.
//
// NO `rtbf.repo.ts`: the confirm route is fully member-session-gated — there is no pre-scope path — so
// the handler talks to the `@twt/domain` `member.*` accessors (anonymizeMember + projectMemberState)
// directly inside its own scope tx (the withdrawal-module precedent). NO `rtbf-crypto.ts`: the sentinel
// encryption runs INSIDE the domain `anonymizeMember` (the domain-layer enc pattern — see anonymize.ts).

import type { FastifyInstance } from 'fastify';

import type { AppDeps } from '../../context.js';
import { registerRtbfRoutes } from './routes.js';

export function registerRtbfModule(app: FastifyInstance, deps: AppDeps): void {
  registerRtbfRoutes(app, deps);
}
