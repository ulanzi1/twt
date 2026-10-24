// A NOMINEE WHO IS ALSO A MEMBER module barrel — Story 6.36e (Task 3).
//
// Registers the declarer's marks read and the marked member's requests + answer. The mark itself is set by the nominee
// declare (`modules/nominee/nominee.handlers.ts`, Life Events route only — NE2, NE4). Wired into server.ts beside the people
// who know me module (the 6.36b precedent).

import type { FastifyInstance } from 'fastify';

import type { AppDeps } from '../../context.js';
import { registerNomineeLinksRoutes } from './routes.js';

export function registerNomineeLinksModule(app: FastifyInstance, deps: AppDeps): void {
  registerNomineeLinksRoutes(app, deps);
}
