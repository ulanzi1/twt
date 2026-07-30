// News/Blog admin module barrel — Story 10.5 (Task 4).
//
// The News/Blog authoring surface (list/create/read/edit + submit/approve/schedule/publish), gated on
// the NEW `news.manage` key (pariwar-dimension). The domain owns the workflow (author≠reviewer + the
// tone-review gate); the apps/jobs worker owns the audience fan-out (crypto boundary). Wired into
// server.ts next to the helpdesk module. NO repo.ts — handlers talk to @twt/domain directly in the
// request scope tx.

import type { FastifyInstance } from 'fastify';

import type { AppDeps } from '../../context.js';
import { registerNewsBlogRoutes } from './routes.js';

export function registerNewsBlogModule(app: FastifyInstance, deps: AppDeps): void {
  registerNewsBlogRoutes(app, deps);
}
