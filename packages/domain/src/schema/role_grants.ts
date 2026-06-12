// `role_grants` table — Story 1.8 substrate (Task 5, AC-2 + AC-7).
//
// The storage substrate for the grant tuple `(user_id, pariwar_id, role)` +
// `(scope_dimension, scope_value)` (architecture §3.13 L2420). Landed schema-ahead-
// of-consumers — the established pattern (Story 1.7 landed `pariwar_passport` with
// no consumers); it is the substrate every downstream privileged endpoint reads
// (the HTTP middleware at Story 1.9 loads an actor's grants from here).
//
// A SCOPED table (like `events_log`), NOT a Passport-style cross-readable carve-out:
// cross-Pariwar grant reads are a REAL leak. RLS (policies/role-grants-rls.ts) keys
// SELECT + write on `pariwar_id` via the Story 1.6 closed-failure construct, and
// the adversarial leak suite asserts it returns 0 rows cross-tenant.
//
// Naming discipline per architecture line 3663-3677:
//   - DB columns snake_case (user_id, pariwar_id, scope_dimension, scope_value)
//   - TS field names camelCase (userId, pariwarId, scopeDimension, scopeValue)

import { index, pgEnum, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

import type { PariwarId, UserId } from '../ids/index.js';
import { SCOPE_DIMENSIONS } from '../rbac/scope.js';
import { users } from './users.js';

/**
 * The `scope_dimension` Postgres enum, derived from the single canonical
 * SCOPE_DIMENSIONS tuple (packages/domain/src/rbac/scope.ts) so the DB enum and the
 * domain `ScopeDimension` union can never drift. Modelled as a pgEnum (idiomatic
 * Drizzle — yields a `CREATE TYPE scope_dimension` in the migration) like the
 * `locale` enum precedent. Canonical, ratified in ADR-0008 — safe to commit as an
 * enum (contrast `role`, below, which stays `text`).
 */
export const scopeDimensionEnum = pgEnum('scope_dimension', SCOPE_DIMENSIONS);

export const roleGrants = pgTable(
  'role_grants',
  {
    // Surrogate PK (server-side `gen_random_uuid()`, the events_log precedent). A
    // composite natural key would have to include the nullable scope_value, which
    // cannot sit in a PK — so a surrogate id keeps the row addressable while the
    // lookup index below serves the read path.
    id: uuid('id').defaultRandom().primaryKey(),

    // The granted subject. FK → users.id (D4-1.8, retro-added in migration 0005 now
    // that the global identity table exists). An orphan grant (user_id with no users
    // row) is now rejected at INSERT — the integrity the no-FK column deferred
    // "until Story 1.9+". Branded `UserId` at the TS layer.
    userId: uuid('user_id')
      .$type<UserId>()
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),

    // Tenant key AND the column RLS scopes on. Branded `PariwarId` at the TS layer
    // (compile-time only; the column is a plain pg `uuid`).
    pariwarId: uuid('pariwar_id').$type<PariwarId>().notNull(),

    // The role name (one of the 12 seeded bundles). Plain `text`, NOT a pgEnum:
    // the 12-role set is PROVISIONAL pending OQ-3 (Trustee may confirm/revise it
    // pre-launch) and FR-44 makes bundles Super-Admin-editable — a `text` column
    // lets the set change without an enum migration. Referential integrity to the
    // declared bundles is enforced at the seed/domain layer, not by the DB. See
    // ADR-0008 "role column: text not enum".
    role: text('role').notNull(),

    // The scope dimension the grant is held at (the role's effective ceiling for
    // this grant). Constrained to the canonical set by the scope_dimension pgEnum.
    scopeDimension: scopeDimensionEnum('scope_dimension').notNull(),

    // The concrete node the grant is bound to: a district/block/state name or id,
    // a pariwar id, or the owner id (`self`). NULL is valid only for `global`
    // (covers everything). Hierarchical containment (rbac/scope.ts
    // `scopeContains`) interprets it; malformed rows fail closed in the guard.
    scopeValue: text('scope_value'),

    // Database-authoritative creation time (architecture §1.11 + line 3809).
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' })
      .notNull()
      .defaultNow(),

    // NULL = system / seed per the events_log.actor_id + pariwar_passport.created_by
    // precedent. Unconstrained `uuid` — NO foreign key (admin users table is 1.9+).
    createdBy: uuid('created_by'),
  },
  (t) => [
    // The hot read path: "load every grant for this actor in the active Pariwar"
    // (the Story-1.9 middleware query). pariwar_id leads — it is the RLS predicate
    // column and the higher-selectivity tenant key.
    index('role_grants_pariwar_user_idx').on(t.pariwarId, t.userId),
  ],
);

// Inferred row types for the read/write path (Story 1.9 admin routes).
export type RoleGrantRow = typeof roleGrants.$inferSelect;
export type RoleGrantInsert = typeof roleGrants.$inferInsert;
