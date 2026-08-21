// Directory-publication kill-switch module barrel — Story 10.30 (Task 3; AC1, AC2).
//
// The super_admin surface that makes the per-Pariwar directory kill switch OPERABLE without database
// access: read the current state, flip it in either direction with a required rationale. Discharges
// the implementation half of Decision `2026-08-21-147` cl.2 (recorded at `2026-08-21-148`).
//
// ⛔ The switch is still NOT an operational control — that status turns on a separate ≥2-trustee
// ratification, ⛔ not on this module existing, and launch-gate Row 17 stays `open` until it lands.
//
// Wired into server.ts next to registerDegradedModeModule (a sibling per-Pariwar admin-write module).
// ⚠ Deliberately THREE files: degraded-mode's fourth (`composition.ts`) is a Story-5.8-specific
// read-seam for the channels fan-out and has ⛔ no analogue here.

import type { FastifyInstance } from 'fastify';

import type { AppDeps } from '../../context.js';
import { registerDirectoryPublicationRoutes } from './routes.js';

export function registerDirectoryPublicationModule(app: FastifyInstance, deps: AppDeps): void {
  registerDirectoryPublicationRoutes(app, deps);
}
