// Member-validity module barrel — Story 4.7 (Task 4; D5).
//
// The apps/api contract boundary Story 4.6 deferred here: the member-self validity read + the admin
// (scope-gated, audited) validity read + the AR-65 admin member-search. Redaction + audit stay in
// `@twt/validity-service`; this module only constructs the `ValidityCaller`, supplies the engine deps,
// and maps the service payload → the camelCase wire DTO. Wired into server.ts next to
// registerMemberHomeModule.

import type { FastifyInstance } from 'fastify';

import type { AppDeps } from '../../context.js';
import { registerMemberValidityRoutes } from './routes.js';

export function registerMemberValidityModule(app: FastifyInstance, deps: AppDeps): void {
  registerMemberValidityRoutes(app, deps);
}
