// Story 11a.3 — the public-pages module barrel. Wired into server.ts.
//
// ⭐ THIS MODULE LANDS WITH ITS ROUTE, and that is a commitment, not an accident. Story 11a.2
// REFUSED to create `apps/api/src/modules/public-pages/` empty, in these terms: *"it lands with its
// first consumer"* ([[feedback_no_premature_package]]). This story is that consumer.
// ⛔ Never a module with no route.
import type { FastifyInstance } from 'fastify';

import type { AppDeps } from '../../context.js';
import { registerPublicPagesRoutes } from './routes.js';

export function registerPublicPagesModule(app: FastifyInstance, deps: AppDeps): void {
  registerPublicPagesRoutes(app, deps);
}

export { __resetDirectoryAbuseCounters, evaluateDirectoryAbuse, loadDirectoryAbuseRules } from './abuse-rules.js';
