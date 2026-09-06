// Per-Pariwar DRIVE TARGET module barrel — Story 11b.13 (Task 4; AC5).
//
// The admin surface that makes `2026-09-04-190` cl.7 OPERABLE without database access: a **Pariwar
// Admin** records what a drive in their Pariwar needs to raise; a **Super Admin** decides whether
// anyone may see it.
//
// ══════════════════════════════════════════════════════════════════════════════════════════════
// ⚠⛔ THIS MODULE GOVERNS ⛔ NOTHING THAT RENDERS — TODAY, AND BY DESIGN
// ══════════════════════════════════════════════════════════════════════════════════════════════
// `2026-09-04-190` **cl.7(b)** makes the figure invisible to members and the public. ⇒ an operator
// setting a target here changes ⛔ NOTHING a visitor or a member sees. ⭐ That is **correct and
// intended** (Story 11b.13, Trap 3), ⛔ not an unfinished job:
//   · ⛔ Do ⛔ not "finish it" by rendering the target, adding a preview, or exposing it on any
//     public/member shape.
//   · ⭐ **Story 11b.14** is its first consumer, and it consumes the value **SERVER-SIDE ONLY** —
//     the target reaches a read model, ⛔ never a response body.
//
// ⚠⛔ AND THIS IS ⛔ NOT THE `nominee-bank-masking` SITUATION, though it reads similarly. THAT module
// is DORMANT — a control that once had a public consumer and lost it (`-190` cl.1), retained under
// cl.4. THIS one has ⛔ never had a consumer yet and is being built BEFORE its display, deliberately:
// cl.7(c) is the Panel's control over a disclosure that does not exist yet, and building it after
// Story 11b.14 renders the bar would ship a display first and its governance second — the ordering
// this project inverts on purpose.
//
// ⭐⭐ THE AUTHORITY SPLIT IS THE DESIGN. Two permission keys (D1), two DB records (D2), two route
// gates (here). A `pariwar_admin` can set the figure and gets a **403** on the reveal routes.
// ⛔ Do not merge the two resources, the two keys, or the two records.
//
// Wired into server.ts next to registerNomineeBankMaskingModule (its nearest sibling: a per-Pariwar,
// governed, rationale-bearing presentation control).

import type { FastifyInstance } from 'fastify';

import type { AppDeps } from '../../context.js';
import { registerDriveTargetRoutes } from './routes.js';

export function registerDriveTargetModule(app: FastifyInstance, deps: AppDeps): void {
  registerDriveTargetRoutes(app, deps);
}
