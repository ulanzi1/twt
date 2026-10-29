// The Trust's announcement channels module barrel — Story 5.14 (Task 5). The admin config + "Posts" list (`pariwar.configure_channels`)
// and the member read of the links. Wired into server.ts beside the channel-config and the member Telegram opt-in modules.

import type { FastifyInstance } from 'fastify';

import type { AppDeps } from '../../context.js';
import { registerAnnouncementChannelsRoutes } from './routes.js';

export function registerAnnouncementChannelsModule(app: FastifyInstance, deps: AppDeps): void {
  registerAnnouncementChannelsRoutes(app, deps);
}
