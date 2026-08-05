// Trustee-Lite module barrel — Story 10.11 (Task 4).
//
// The FR-57 trustee worklist: ONE read-only GET that composes six already-shipped source reads in one
// scope tx, filters the sections against the caller's real grants, and returns a normalized list.
// NO repo.ts — the handler talks to @twt/domain reads directly inside the request's scope tx. This
// module owns no table, no migration, no event type and no permission key.

import type { FastifyInstance } from 'fastify';

import type { AppDeps } from '../../context.js';
import { registerTrusteeLiteRoutes } from './routes.js';

export function registerTrusteeLiteModule(app: FastifyInstance, deps: AppDeps): void {
  registerTrusteeLiteRoutes(app, deps);
}
