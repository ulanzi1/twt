// Feature-flag admin module barrel — Story 10.8 (Task 7).
//
// The FR-58C admin surface: the global catalog read, the per-Pariwar effective inventory (with
// global-vs-override provenance), a flag's version history, and THE FLIP. Wired into server.ts next
// to the reports + news-blog + helpdesk modules. NO repo.ts — handlers talk to @twt/domain's
// `featureFlags` namespace on the request's scope tx.
//
// This module is what makes "no secret flags" (prd.md:892) real: a flag store with no inventory
// surface cannot satisfy it, however correct the store is.

import type { FastifyInstance } from 'fastify';

import type { AppDeps } from '../../context.js';
import { registerFeatureFlagsRoutes } from './routes.js';

export { FEATURE_FLAG_FLIP_KEY, FEATURE_FLAG_VIEW_KEY } from './handlers.js';

export function registerFeatureFlagsModule(app: FastifyInstance, deps: AppDeps): void {
  registerFeatureFlagsRoutes(app, deps);
}
