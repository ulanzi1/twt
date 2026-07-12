// `users` — the GLOBAL identity table (Story 1.9, AC-7 + §3.13).
//
// THE TABLE THE WHOLE SYSTEM HAS BEEN WAITING ON. Keyed to the HUMAN, not a
// Pariwar — a person can admin multiple Pariwars; the `role_grants (user_id,
// pariwar_id, role)` join carries the tenancy. This is NOT `pariwar_passport`
// (that is the *Pariwar's* org-identity document, 1:1 with a Pariwar) — do not
// conflate. The retro FKs `role_grants.user_id → users.id` (D4-1.8) +
// `pariwar_passport.created_by → users.id` (D4-1.7) land in migration 0005 now
// that this table exists.
//
// RLS POSTURE (Reconciliation R2): GLOBAL, NOT pariwar-scoped. Login happens
// BEFORE any `app.pariwar_id` is set — copying the `role_grants` scoped-RLS
// construct here would make every login return 0 rows. Modeled as a carve-out
// family in policies/identity-auth-rls.ts (ENABLE+FORCE RLS + USING(true)),
// intentionally not pariwar-keyed. See ADR-0009.
//
// `identity_type` is the §3.13 extensible identity discriminator, seeded with
// `admin` for v1 (member/partner/nominee extend it via ALTER TYPE ADD VALUE in
// their landing epics). Modeled as a pgEnum (the canonical, architecturally
// enumerated set) — contrast `role_grants.role` (text, OQ-3-provisional).

import { pgEnum, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

import type { UserId } from '../ids/index.js';

/** §3.13 extensible identity discriminator. v1 seeds `admin`; others extend later. */
export const identityTypeEnum = pgEnum('identity_type', ['admin']);

/** Account lifecycle. `suspended` is the FR-56 hostile-admin / off-boarding state. */
export const userStatusEnum = pgEnum('user_status', ['active', 'suspended', 'disabled']);

export const users = pgTable('users', {
  // Surrogate PK minted server-side (the events_log/role_grants precedent). Branded
  // `UserId` at the TS layer (compile-time only; the column is a plain pg `uuid`).
  id: uuid('id').defaultRandom().primaryKey().$type<UserId>(),

  // The identity discriminator (v1: every row is `admin`).
  identityType: identityTypeEnum('identity_type').notNull().default('admin'),

  // Account lifecycle (default active). FR-56 suspension flips this + cascades
  // session revocation (the seam — not the flow — lands here).
  status: userStatusEnum('status').notNull().default('active'),

  // Story 6.11 (R5) — the controlled staff-attribution DISPLAY name, the SOURCE for a decision's
  // `claim_verifier_decisions.actor_display` snapshot (AC7). Controlled staff personal data —
  // plaintext BY DELIBERATE, RATIFIED DECISION: its whole purpose is to be shown on audit surfaces
  // (the verifier decision transcript, the trustee audit UI). It is NEVER derived from the Tier-1
  // encrypted admin email (the "NEVER a plaintext email column" rule stands). NULLABLE at the column
  // (existing admins have none) — the adjudication write path is where absence BLOCKS with a typed
  // error (AdminDisplayNameMissingError), and the decision-row `actor_display` is where NOT NULL is
  // enforced. The 1.16b PII-shielding gate reviewer: this is intentional plaintext staff attribution,
  // not member PII. Provisioned via createAdminAccount / repo.createAdmin (optional) +
  // repo.updateDisplayName (ops/seed/tests); a self-serve admin-profile UI is out of scope in v1.
  displayName: text('display_name'),

  // Database-authoritative timestamps (architecture §1.11 + L3809).
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),

  // NULL = system / seed (the events_log.actor_id + pariwar_passport.created_by
  // precedent). Self-referential FK is intentionally NOT added (a bootstrap admin
  // has no creator); kept a plain nullable uuid.
  createdBy: uuid('created_by').$type<UserId>(),
});

export type UserRow = typeof users.$inferSelect;
export type UserInsert = typeof users.$inferInsert;
