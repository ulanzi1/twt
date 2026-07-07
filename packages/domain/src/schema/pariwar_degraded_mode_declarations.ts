// `pariwar_degraded_mode_declarations` — the per-Pariwar degraded-mode declaration substrate (Story 5.8,
// Task 1; AC1). A trustee declares "degraded mode" (in-app push infra down, WA unavailable system-wide, or
// a "treat all cycle-open as critical" declaration) so the cycle-open SMS bridge (the AR-20 carve-out) can
// force SMS for cycle-open (`alert_published`) alerts, bypassing the normal cost-optimization layer.
//
// ── "Active" is a COMPUTED predicate, never a stored boolean (AC1 #2) ──────────────────────────────────
// A declaration is active for `pariwar_id` at instant `at` IFF
//   `revoked_at IS NULL AND effective_from <= at AND (expires_at IS NULL OR expires_at > at)`.
// There is deliberately NO `is_active` column — it would drift against `expires_at` / `revoked_at`. Manual
// revocation is a STATE TRANSITION (`revoked_at` / `revoked_by_actor` set), NOT a row delete. A Pariwar has
// at most ONE active declaration at a time — enforced by the application transaction (advisory lock +
// auto-revoke-on-declare in degraded-mode/declarations.ts), NOT a DB `EXCLUDE` constraint (AC1 #2).
//
// ── RLS: standard inline tenant-isolation (0038 shape) ─────────────────────────────────────────────────
// A Pariwar's degraded-mode state must NOT be cross-tenant readable — so STANDARD inline tenant-isolation
// RLS on `pariwar_id` (mirror pariwar_wa_config / member_device_tokens), NOT pariwar_passport's public
// cross-tenant-READ carve-out. The RLS lives INLINE in migration 0050 (no separate *-rls.sql).
//
// Naming discipline per architecture L3663-3677: DB columns snake_case, TS fields camelCase, tables plural.

import { index, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

import type { PariwarId, UserId } from '../ids/index.js';

/** The degraded-mode modes (the `mode` value set — CHECK-constrained here + in the migration). Extensible. */
export const DEGRADED_MODE_MODES = ['cycle_open_sms_bridge'] as const;
export type DegradedMode = (typeof DEGRADED_MODE_MODES)[number];

export const pariwarDegradedModeDeclarations = pgTable(
  'pariwar_degraded_mode_declarations',
  {
    // Per-row address (UUID). Server-side gen_random_uuid() default. The declaration is keyed by this
    // opaque id — the revoke route addresses a specific declaration by it.
    id: uuid('id').defaultRandom().primaryKey(),

    // Multi-tenant scope (RLS predicate column; branded). NO default — the pariwar_id is the path scope,
    // never minted here.
    pariwarId: uuid('pariwar_id').notNull().$type<PariwarId>(),

    // The degraded-mode kind — v1 CHECK IN ('cycle_open_sms_bridge'), extensible. Plain text (the CHECK is
    // the constraint, not a pgEnum — mirrors pariwar_wa_templates.alert_category).
    mode: text('mode').notNull(),

    // The window the declaration is active FROM (inclusive). Injected by the declare route (defaults to now,
    // no backdating). Part of the computed-active predicate.
    effectiveFrom: timestamp('effective_from', { withTimezone: true, mode: 'date' }).notNull(),

    // The window the declaration is active UNTIL (exclusive). NULLABLE — null ⇒ open-ended until manual
    // revocation. Part of the computed-active predicate.
    expiresAt: timestamp('expires_at', { withTimezone: true, mode: 'date' }),

    // Manual-revocation state transition (NOT a row delete). NULL ⇒ not manually revoked. Set to the
    // instant of revocation (or, on auto-revoke-on-declare, the superseding declaration's effective_from).
    revokedAt: timestamp('revoked_at', { withTimezone: true, mode: 'date' }),

    // The actor who revoked (audit provenance). NULL when not revoked. FK-free at the column layer (mirrors
    // pariwar_wa_config.updated_by_actor); the audit line carries the actor.
    revokedByActor: uuid('revoked_by_actor').$type<UserId>(),

    // The actor who declared degraded mode (audit provenance). NULL = system/seed.
    declaredByActor: uuid('declared_by_actor').$type<UserId>(),

    // The trustee-authored justification (free text, bounded by the contract). PII-free — never a member
    // mobile / name.
    reason: text('reason').notNull(),

    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
  },
  // Backs the active-declaration lookup (pariwar_id + effective_from ordering / window filter).
  (t) => [index('pariwar_degraded_mode_declarations_active_idx').on(t.pariwarId, t.effectiveFrom)],
);

export type PariwarDegradedModeDeclarationRow = typeof pariwarDegradedModeDeclarations.$inferSelect;
export type PariwarDegradedModeDeclarationInsert = typeof pariwarDegradedModeDeclarations.$inferInsert;
