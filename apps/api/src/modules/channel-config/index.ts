// Channel-config module barrel — Story 5.3 (Task 4; AC4).
//
// The trustee WhatsApp Business config surface: GET/PUT the WA config singleton + GET/PUT the per-category
// UTILITY template mapping, on the scoped admin chain gated by `pariwar.configure_channels`. The
// `[SURFACE]` half of an otherwise-`[CONSUMER]` story — the demoable "trustee configures their WA number"
// flow. Wired into server.ts next to registerMemberValidityModule.

import type { FastifyInstance } from 'fastify';

import type { AppDeps } from '../../context.js';
import { registerChannelConfigRoutes } from './routes.js';

// Story 5.3 (Task 6) — the WA provider composition seam (reusable building block for the future live
// dispatch; NO live call site yet — [[project_channels_no_live_dispatch_yet]]).
export {
  resolveWhatsappProvider,
  resolveWhatsappProviderDeps,
  type WhatsappCompositionDeps,
} from './composition.js';

export function registerChannelConfigModule(app: FastifyInstance, deps: AppDeps): void {
  registerChannelConfigRoutes(app, deps);
}
