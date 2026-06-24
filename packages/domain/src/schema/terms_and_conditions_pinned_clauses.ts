// `terms_and_conditions_pinned_clauses` table — Story 2.6 substrate (the clause-
// pinning junction table).
//
// ── Variance from the epic's `text[]` (BigDev, 2026-06-24; ADR for Story 2.6) ──
// The epic AC literally says `pinned_to_clause_version_ids text[]` (epics.md L1532).
// We DEVIATE deliberately: pins live in this junction table so the reference to
// `clause_versions` carries a REAL foreign key — Postgres cannot FK an array
// element, and the `text[]` design could silently hold a dangling/cross-tenant id.
// Semantically identical (a set of pinned clause versions), structurally stronger.
//
// TWO guards, BOTH required (do not drop either):
//   1. The FK (`clause_version_id` → `clause_versions.clause_version_id`) is the
//      hard referential guard against a non-existent version.
//   2. The domain pre-check (`niyamavali.resolveByClauseVersionId(db, pariwarId,
//      id)` returns a row) is the CROSS-TENANT guard — the FK targets the global PK
//      and would happily link a DIFFERENT Pariwar's clause version;
//      `resolveByClauseVersionId` returns a row only when `pariwar_id` matches.
//
// ── Tenant isolation ─────────────────────────────────────────────────────────
// TENANT-ISOLATED read + write (mirrors clause_versions / the parent T&C table):
// NOT cross-readable. RLS in policies/terms-and-conditions-pinned-clauses-rls.ts.
//
// Naming discipline per architecture L3663-3677: DB columns snake_case, TS fields
// camelCase. Table snake_case-plural.

import {
  index,
  pgTable,
  primaryKey,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';

import type { ClauseVersionId, PariwarId, TcVersionId } from '../ids/index.js';
import { clauseVersions } from './clause_versions.js';
import { termsAndConditionsVersions } from './terms_and_conditions_versions.js';

export const termsAndConditionsPinnedClauses = pgTable(
  'terms_and_conditions_pinned_clauses',
  {
    // The pinning T&C version. FK → the parent T&C row, cascade-delete (link rows
    // are meaningless without their T&C version). Branded `TcVersionId`.
    tcVersionId: uuid('tc_version_id')
      .notNull()
      .$type<TcVersionId>()
      .references(() => termsAndConditionsVersions.tcVersionId, { onDelete: 'cascade' }),

    // The pinned clause version. FK → the GLOBAL clause_versions PK (referential
    // integrity guard #1). Branded `ClauseVersionId`. The same-Pariwar guard is the
    // domain pre-check, not this FK (see header).
    clauseVersionId: uuid('clause_version_id')
      .notNull()
      .$type<ClauseVersionId>()
      .references(() => clauseVersions.clauseVersionId),

    // Tenant key + RLS predicate column. Branded `PariwarId`. Denormalised onto the
    // link row so RLS isolates pins without a join to the parent.
    pariwarId: uuid('pariwar_id').notNull().$type<PariwarId>(),

    // DB-authoritative creation time (architecture §1.11). Default now().
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    // Composite PK: a (tc_version_id, clause_version_id) pin is recorded exactly once.
    primaryKey({ columns: [t.tcVersionId, t.clauseVersionId] }),

    // The hot read path: "list the pinned clause versions for this T&C version",
    // per tenant.
    index('terms_and_conditions_pinned_clauses_pariwar_tc_idx').on(t.pariwarId, t.tcVersionId),
  ],
);

// Inferred row types for the accessor read/write paths (clause_versions precedent).
export type TcPinnedClauseRow = typeof termsAndConditionsPinnedClauses.$inferSelect;
export type TcPinnedClauseInsert = typeof termsAndConditionsPinnedClauses.$inferInsert;
