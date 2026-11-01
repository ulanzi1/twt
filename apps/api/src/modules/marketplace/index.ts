// The admin MODULE surface — Story 12.2 (`2026-11-01-433`). The first production caller of the Story 12.1 module
// primitive. ⛔ Member route here: the shelf and the lead route are Story 12.3's (I8).

import type { FastifyInstance } from 'fastify';

import type { AppDeps } from '../../context.js';
import { registerMarketplaceRoutes } from './routes.js';

export function registerMarketplaceModule(app: FastifyInstance, deps: AppDeps): void {
  registerMarketplaceRoutes(app, deps);
}
