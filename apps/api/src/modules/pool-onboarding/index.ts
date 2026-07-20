// Member pool-onboarding-tutorial module barrel — Story 7.10 (Task 5). The member-session-gated
// completion/skip outcome surface (POST record → single audit line).

import type { FastifyInstance } from 'fastify';

import type { AppDeps } from '../../context.js';
import { registerPoolOnboardingRoutes } from './routes.js';

export { registerPoolOnboardingRoutes } from './routes.js';
export { createPoolOnboardingHandlers, poolOnboardingAuditPayloadHash } from './handlers.js';

export function registerPoolOnboardingModule(app: FastifyInstance, deps: AppDeps): void {
  registerPoolOnboardingRoutes(app, deps);
}
