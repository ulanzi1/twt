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
// ══════════════════════════════════════════════════════════════════════════════════════════════
// ⭐⭐⛔⛔ STATUS AS OF STORY 11b.11 (2026-09-05) — **THIS KNOB GOVERNS ⛔ NOTHING THAT RENDERS**
// ══════════════════════════════════════════════════════════════════════════════════════════════
// `2026-09-04-190` **cl.1** (Trustee-ratified — Dhiraj Rahul, Kalpana Bharti) withdrew the nominee
// BANKING COORDINATES from the public Sahyog Vivran surface; `2026-09-04-191` **cl.1** withdrew the
// VPA; `-190` **cl.2** kept the nominee's NAME public, ⛔ ungoverned by this schedule. ⇒ the public
// read no longer resolves the schedule at all, and setting `0 days` / `N days` / `permanent` here
// changes ⛔ NOTHING a visitor sees.
// ⛔⛔ **RETAINED DELIBERATELY** — `-190` **cl.4**: *"we may use it in future."* ⛔ Do ⛔ not delete
// this module, its routes, its permission key, its table or its tests.
// ⚠⛔⛔ **AND ⛔ DO ⛔ NOT DESCRIBE IT AS A LIVE SAFEGUARD ON ANY TRUSTEE-FACING MATERIAL.** An
// operator opening this screen today is configuring a DORMANT control. ⭐ The three REACTIVATION
// PRECONDITIONS are recorded in full at the head of
// `packages/domain/src/claim/nominee-bank-masking.ts` — they are DORMANT, ⛔ not resolved.
//
// Wired into server.ts next to registerDirectoryPublicationModule (its nearest sibling: a
// per-Pariwar, super_admin-only, governed presentation control).

import type { FastifyInstance } from 'fastify';

import type { AppDeps } from '../../context.js';
import { registerNomineeBankMaskingRoutes } from './routes.js';

export function registerNomineeBankMaskingModule(app: FastifyInstance, deps: AppDeps): void {
  registerNomineeBankMaskingRoutes(app, deps);
}
