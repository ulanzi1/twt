// Story 10.21 — off-portal DPDPA data-rights module barrel. Wired into server.ts.
import type { FastifyInstance } from 'fastify';

import type { AppDeps } from '../../context.js';
import { registerMemberDataRightsRoutes } from './routes.js';

export function registerMemberDataRightsModule(app: FastifyInstance, deps: AppDeps): void {
  registerMemberDataRightsRoutes(app, deps);
}
