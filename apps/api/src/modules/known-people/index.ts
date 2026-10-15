// PEOPLE WHO KNOW ME module barrel — Story 6.36b (Task 3).
//
// Registers the member surface for naming up to three people who know the member (6.36a SW10–SW14): contact matching
// (positions only), asking, the member's list, removing, the requests naming the member, answering and withdrawing.
// Wired into server.ts beside the Life Events module (the people screen lives under Life Events in the app).

import type { FastifyInstance } from 'fastify';

import type { AppDeps } from '../../context.js';
import { registerKnownPeopleRoutes } from './routes.js';

export function registerKnownPeopleModule(app: FastifyInstance, deps: AppDeps): void {
  registerKnownPeopleRoutes(app, deps);
}
