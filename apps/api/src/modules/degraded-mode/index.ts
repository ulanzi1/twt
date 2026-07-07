// Degraded-mode module barrel — Story 5.8 (Task 5; AC4, AC5).
//
// The trustee degraded-mode surface: declare / revoke / read-active, on the scoped admin chain gated by
// `pariwar.declare_degraded_mode`. The demoable "trustee declares degraded mode" flow (mirrors
// channel-config). Wired into server.ts next to registerChannelConfigModule.

import type { FastifyInstance } from 'fastify';

import type { AppDeps } from '../../context.js';
import { registerDegradedModeRoutes } from './routes.js';

// Story 5.8 (Task 5 / AC5) — the composition read-seam (reusable building block for the future live
// fan-out; NO live call site yet — [[project_channels_no_live_dispatch_yet]]).
export { resolveDegradedModeActive, type DegradedModeCompositionDeps } from './composition.js';

export function registerDegradedModeModule(app: FastifyInstance, deps: AppDeps): void {
  registerDegradedModeRoutes(app, deps);
}
