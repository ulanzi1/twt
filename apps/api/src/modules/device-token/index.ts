// Push device-token module barrel — Story 5.2 (Task 4). The registration routes (member + admin) + the
// delivery-resolver seam + the Tier-1 crypto helpers. Wired into server.ts as the first Epic 5 consumer.

import type { FastifyInstance } from 'fastify';

import type { AppDeps } from '../../context.js';
import { registerDeviceTokenRoutes } from './device-token.routes.js';

export { registerDeviceTokenRoutes } from './device-token.routes.js';
export { createDeviceTokenHandlers, resolvePushTargets } from './device-token.handlers.js';
export {
  invalidatePushTokenOnFailure,
  type PushInvalidationOutcome,
} from './push-invalidation.js';
export {
  encryptDeviceToken,
  decryptDeviceToken,
  deviceTokenBlindIndex,
} from './device-token-crypto.js';

export function registerDeviceTokenModule(app: FastifyInstance, deps: AppDeps): void {
  registerDeviceTokenRoutes(app, deps);
}
