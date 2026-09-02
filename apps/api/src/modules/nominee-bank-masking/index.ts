// Nominee-bank masking-schedule module barrel — Story 11b.3a (Task 5; AC5, AC6).
//
// The `super_admin` surface that makes `2026-08-28-160` cl.10(b)-(d)'s per-Pariwar masking knob
// OPERABLE without database access: read what is in force, set `0 days` / `N days` / `permanent`
// with a required rationale, in every direction.
//
// ⚠⭐ THE PROJECT'S FIRST SELF-SERVE PRESENTATION-TOGGLE UI. Story 11a.1 shipped none, deliberately,
// as a scope boundary — presentation changes were governed by a write path with ⛔ no screen at all.
// ⛔ Not a blocker; ⭐ recorded because it is a first.
//
// ⛔ Built is ⛔ NOT published: what keeps the public surface dark is DEPLOYMENT plus the
// counsel/Panel process — ⛔ never a code mechanism, and ⛔ never the publication kill switch.
//
// Wired into server.ts next to registerDirectoryPublicationModule (its nearest sibling: a
// per-Pariwar, super_admin-only, governed presentation control).

import type { FastifyInstance } from 'fastify';

import type { AppDeps } from '../../context.js';
import { registerNomineeBankMaskingRoutes } from './routes.js';

export function registerNomineeBankMaskingModule(app: FastifyInstance, deps: AppDeps): void {
  registerNomineeBankMaskingRoutes(app, deps);
}
