// `niyamavali_amendments` table — Story 2.3 substrate (AC4 + architecture §1.10).
//
// The append-only ledger of Niyamavali amendments: one row per amendment linking
// `from_clause_version_id → to_clause_version_id` with the structured-payload
// `diff_document`, PLUS the architecture §1.10 mandatory `affected_member_scope`
// declaration. Like `events_log` / `audit_log_entries` this table is FULLY
// append-only — the migration (Task 5) installs BEFORE UPDATE/DELETE/TRUNCATE
// triggers that RAISE (events_log 0001 precedent). Contrast `clause_versions`,
// which is NOT fully append-only (it has two legitimately-mutable columns).
//
// Naming discipline per architecture L3663-3677: DB columns snake_case, TS fields
// camelCase, JSONB keys snake_case. Table snake_case-plural.

import {
  type AnyPgColumn,
  index,
  jsonb,
  pgTable,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';

import type { ClauseId, ClauseVersionId, PariwarId } from '../ids/index.js';
import { auditLogEntries } from './audit_log_entries.js';
import { clauseVersions } from './clause_versions.js';

/**
 * Structured (key-path) JSONB diff between a clause's prior and new `payload`
 * (AC4). Produced by `computePayloadDiff` (../niyamavali/diff.ts). Dot-path keys;
 * `added`/`removed` map a path to its (new / prior) value, `changed` maps a path
 * to its `{ from, to }`. snake_case keys per architecture §Naming.
 */
export interface AmendmentDiffDocument {
  added: Record<string, unknown>;
  removed: Record<string, unknown>;
  changed: Record<string, { from: unknown; to: unknown }>;
}

/**
 * The architecture §1.10 (L1053-1056) mandatory affected-member scope declaration:
 * "Every Niyamavali amendment declares its affected-member scope as part of the
 * amendment record … Amendments cannot be committed without a scope declaration."
 *
 * 2.3 STORES + VALIDATES the declaration shape only. The INTERPRETATION (which
 * member ids the scope resolves to + the FR-12A cache-invalidation fan-out) is
 * Epic 4 (seam-clean). A discriminated union keyed on `kind`; the Zod validator
 * lives in `@twt/contracts` (`AffectedMemberScopeSchema`) and the write path
 * rejects a malformed/absent scope.
 */
export type AffectedMemberScope =
  | { kind: 'all_members' }
  | { kind: 'past_lockin' }
  | { kind: 'rule_subclause'; clause_id: ClauseId; subclause: string }
  | { kind: 'named_cohort'; definition: string };

export const niyamavaliAmendments = pgTable(
  'niyamavali_amendments',
  {
    // Per-row address (UUID). Server-side gen_random_uuid() default.
    amendmentId: uuid('amendment_id').defaultRandom().primaryKey(),

    // Tenant key + RLS predicate column (Task 4). Branded `PariwarId`.
    pariwarId: uuid('pariwar_id').notNull().$type<PariwarId>(),

    // The amendment edge: prior version → new version of the same clause (AC4).
    // FKs → clause_versions.clause_version_id. The `AnyPgColumn` return-type
    // annotation matches the clause_versions self-FK pattern (cross-file here, so
    // not strictly circular, but kept for consistency / forward-safety).
    fromClauseVersionId: uuid('from_clause_version_id')
      .notNull()
      .$type<ClauseVersionId>()
      .references((): AnyPgColumn => clauseVersions.clauseVersionId),
    toClauseVersionId: uuid('to_clause_version_id')
      .notNull()
      .$type<ClauseVersionId>()
      .references((): AnyPgColumn => clauseVersions.clauseVersionId),

    // The structured-payload diff (AC4). NOT NULL — an amendment without a diff is
    // meaningless. See AmendmentDiffDocument.
    diffDocument: jsonb('diff_document').notNull().$type<AmendmentDiffDocument>(),

    // REQUIRED (architecture §1.10): the affected-member scope declaration. NOT
    // NULL — "Amendments cannot be committed without a scope declaration." 2.3
    // stores + validates; Epic 4 resolves to member ids + invalidation.
    affectedMemberScope: jsonb('affected_member_scope').notNull().$type<AffectedMemberScope>(),

    // DB-authoritative creation time (architecture §1.11). Default now().
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' })
      .notNull()
      .defaultNow(),

    // FK → the Story 1.10 audit line. NULLABLE at 2.3 (same contract as
    // clause_versions.audit_id — the Story 2.4 audited write path tightens it).
    auditId: uuid('audit_id').references(() => auditLogEntries.auditId),
  },
  (t) => [
    // Lineage queries (AC5 forward/backward walk by version edge), per tenant.
    index('niyamavali_amendments_pariwar_from_idx').on(t.pariwarId, t.fromClauseVersionId),
    index('niyamavali_amendments_pariwar_to_idx').on(t.pariwarId, t.toClauseVersionId),
  ],
);

// Inferred row types for the accessor write path.
export type NiyamavaliAmendmentRow = typeof niyamavaliAmendments.$inferSelect;
export type NiyamavaliAmendmentInsert = typeof niyamavaliAmendments.$inferInsert;
