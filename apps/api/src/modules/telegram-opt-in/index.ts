// Member Telegram opt-in module barrel — Story 5.5 (Task 6). The member-session-gated opt-in surface
// (POST request-mint / GET status / POST revoke).

import type { FastifyInstance } from 'fastify';

import type { AppDeps } from '../../context.js';
import { registerTelegramOptInRoutes } from './routes.js';

export { registerTelegramOptInRoutes } from './routes.js';
export { createTelegramOptInHandlers, buildStartDeepLink } from './handlers.js';

export function registerTelegramOptInModule(app: FastifyInstance, deps: AppDeps): void {
  registerTelegramOptInRoutes(app, deps);
}
