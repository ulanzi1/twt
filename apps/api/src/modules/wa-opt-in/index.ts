// Member WhatsApp opt-in module barrel — Story 5.4 (Task 6). The member-session-gated opt-in surface
// (POST mint / GET status / DELETE revoke) + the trustee admin_action force-opt-out (member.moderate).

import type { FastifyInstance } from 'fastify';

import type { AppDeps } from '../../context.js';
import { registerWaOptInRoutes } from './routes.js';

export { registerWaOptInRoutes } from './routes.js';
export { createWaOptInHandlers, buildSendHelloDeepLink } from './handlers.js';

export function registerWaOptInModule(app: FastifyInstance, deps: AppDeps): void {
  registerWaOptInRoutes(app, deps);
}
