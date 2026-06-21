// `clause_versions` table — Story 2.3 substrate (the Niyamavali rule registry).
//
// FR-7 + AR-46 + architectural-freeze rows 12 (`benefit_mechanism` enum required)
// + 14 (shape-vs-engine seam). This table owns the registry SHAPE only: a
// versioned, per-Pariwar, stable-clause-id rule record with amendment-with-diff
// lineage. The rule-EVALUATION engine that interprets `payload` is Epic 4 (FR-8..
// FR-12A Member Validity Service) — the `payload` JSONB is OPAQUE here (stored,
// structurally diffed, resolved by id; NEVER interpreted). Engine logic leaking
// into this registry is a freeze violation (epics.md L531, L1389).
//
// ⚠ The table MUST be named `clause_versions` — `benefit-mechanism.yaml`
// `rule_sources.tables: [clause_versions]` (set day-one at Story 1.16d) is what
// the repo-global gate's check (c) matches by EXACT name; a different name
// silently keeps check (c) a no-op and breaks AC8 (benefit-mechanism.yaml L44;
// scripts/benefit-mechanism/lib.ts scanRuleTableColumns).
//
// Naming discipline per architecture L3663-3677:
//   - DB columns snake_case (clause_version_id, clause_id, effective_date, …)
//   - TS field names camelCase (clauseVersionId, clauseId, effectiveDate, …)
//   - JSONB keys snake_case (the opaque payload + the diff document)
// Table named snake_case-PLURAL (`clause_versions`) — a collection of versioned
// rows, so no singular exception (contrast `pariwar_passport`).

import { sql } from 'drizzle-orm';
import {
  type AnyPgColumn,
  check,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';

import type { ClauseId, ClauseVersionId, PariwarId } from '../ids/index.js';
import { auditLogEntries } from './audit_log_entries.js';

/**
 * The FR-7 / FR-100 benefit-mechanism discriminator carried by every rule record
 * (architecture §1.13 Hook 1 L1133-1147). `pool` = crowdfunded daan (v1 ships
 * ONLY pool); `reserve` = trust-paid assistance (forward-compat for v2/v3 so new
 * reserve rules ADD without re-tagging existing v1 rules).
 *
 * ⚠ LOCKSTEP with the `@twt/contracts` `BenefitMechanism` z.enum: the literal
 * `['pool', 'reserve']` is DUPLICATED here because `@twt/domain` must NOT import
 * `@twt/contracts` (turbo cycle — contracts depends on domain; see
 * packages/domain/src/errors.ts). Drift is prevented by an equality assertion in
 * the contracts test (`packages/contracts/tests/rules.test.ts`) comparing this
 * pgEnum's `.enumValues` to `BenefitMechanism.options` — the legal import
 * direction. `pgEnum` (not a raw CHECK string) yields a `CREATE TYPE` in the
 * migration + the column the benefit-mechanism gate's check (c) looks for.
 */
export const benefitMechanismEnum = pgEnum('benefit_mechanism', ['pool', 'reserve']);

/**
 * The structured rule content (AC1 `payload`). OPAQUE at this layer per freeze
 * row 14: the registry stores + structurally diffs + resolves it, but NEVER
 * interprets it — that is Epic 4 (FR-8..FR-12A). Typed as a permissive
 * snake_case-keyed record so the column is not mistyped as an evaluated rule.
 */
export interface ClausePayload {
  [k: string]: unknown;
}

export const clauseVersions = pgTable(
  'clause_versions',
  {
    // Per-row address (UUID). Server-side gen_random_uuid() default
    // (events_log / audit_log_entries precedent). Branded `ClauseVersionId`.
    clauseVersionId: uuid('clause_version_id')
      .defaultRandom()
      .primaryKey()
      .$type<ClauseVersionId>(),

    // The stable, human-readable clause identifier (AC2). A slug, NOT a uuid —
    // text column, branded `ClauseId`. Immutable across amendment/deprecation/
    // version increment (AC3, enforced at the domain layer for 2.3).
    clauseId: text('clause_id').notNull().$type<ClauseId>(),

    // Tenant key + RLS predicate column (Task 4). Branded `PariwarId`.
    pariwarId: uuid('pariwar_id').notNull().$type<PariwarId>(),

    // Monotonically increasing per `clause_id`, starting at 1 (AC1/AC4). The
    // (pariwar_id, clause_id, version) unique index is the structural guard.
    version: integer('version').notNull(),

    // DB-authoritative point-in-time (architecture §1.11). timestamptz — NOT
    // `date`: AC7 resolution compares `effective_date <= resolution_timestamp`,
    // and a rule's effective instant is a business point-in-time, not a calendar
    // date. The `date` choice would force an implicit timezone cast. Documented
    // in ADR-0020.
    effectiveDate: timestamp('effective_date', { withTimezone: true, mode: 'date' }).notNull(),

    // Opaque structured rule content (see ClausePayload). NOT interpreted here.
    payload: jsonb('payload').notNull().$type<ClausePayload>(),

    // The FR-7 / FR-100 discriminator (NOT NULL). Enforced by the Story 1.16d
    // benefit-mechanism CI gate (check (a) tag scan + check (c) schema-column).
    benefitMechanism: benefitMechanismEnum('benefit_mechanism').notNull(),

    // Lineage references (AC4/AC5). DB name is `predecessor_clause_ids` (mandated
    // verbatim by AC1), but it stores predecessor **clause_version_id**s — the
    // precise version-node a row descends from — NOT clause_id slugs. This is the
    // only coherent reading of AC4 ("populated … the prior version's id") for a
    // same-clause amendment, where the clause_id would be self-referential. So:
    //   · amend       → [prior version's clause_version_id]   (1 ref, same clause)
    //   · split child → [source clause's clause_version_id]   (1 ref, one→many)
    //   · merge result→ [each source clause's clause_version_id] (N refs, many→one)
    //   · plain create→ []                                    (no predecessor)
    // lineageForward/lineageBackward (read.ts) map these version-nodes → distinct
    // clause_ids for the AC5 "which clauses descend / originate" audit query.
    // Decision recorded in ADR-0020. Defaults to the empty array.
    predecessorClauseIds: text('predecessor_clause_ids')
      .array()
      .notNull()
      .default(sql`'{}'`)
      .$type<ClauseVersionId[]>(),

    // Points at the NEXT version of the same `clause_id` (AC4). Nullable (the
    // latest version has no successor). Self-FK — the `AnyPgColumn` return-type
    // annotation breaks the circular type inference on a self-reference.
    supersededByVersion: uuid('superseded_by_version')
      .$type<ClauseVersionId>()
      .references((): AnyPgColumn => clauseVersions.clauseVersionId),

    // Deprecation marker (AC6). Set on the latest version row when a clause is
    // retired/replaced; the `clause_id` is NEVER reused and stays resolvable.
    deprecatedAt: timestamp('deprecated_at', { withTimezone: true, mode: 'date' }),

    // NULL = system / SIE (events_log.actor_id precedent, architecture §1.14).
    authoredByActor: uuid('authored_by_actor'),

    // DB-authoritative authoring time (architecture §1.11). Default now().
    authoredAt: timestamp('authored_at', { withTimezone: true, mode: 'date' })
      .notNull()
      .defaultNow(),

    // FK → the Story 1.10 audit line. NULLABLE at 2.3 (BigDev-decided): domain-
    // direct creates + the structural seed land BEFORE the Story 2.4 audited
    // route exists. The NOT-NULL "audit-or-throw" invariant (no published clause
    // without an audit line) is enforced on the Story 2.4 write path — that
    // story tightens this column. Contract documented in ADR-0020.
    auditId: uuid('audit_id').references(() => auditLogEntries.auditId),
  },
  (t) => [
    // version >= 1 (monotonic per clause_id, starting at 1).
    check('clause_versions_version_positive', sql`${t.version} >= 1`),

    // Structural guard that a (clause_id, version) pair is allocated exactly once
    // per Pariwar — the per-Pariwar uniqueness + amendment-collision guard (AC3/AC4).
    uniqueIndex('clause_versions_pariwar_clause_version_uq').on(
      t.pariwarId,
      t.clauseId,
      t.version,
    ),

    // AC7 "latest version" resolution: newest version of a clause, per tenant.
    index('clause_versions_pariwar_clause_version_desc_idx').on(
      t.pariwarId,
      t.clauseId,
      t.version.desc(),
    ),

    // AC7 effective-date filtering ("rule effective at instant X").
    index('clause_versions_pariwar_effective_date_idx').on(t.pariwarId, t.effectiveDate),
  ],
);

// Inferred row types for the accessor read/write paths (pariwar_passport precedent).
export type ClauseVersionRow = typeof clauseVersions.$inferSelect;
export type ClauseVersionInsert = typeof clauseVersions.$inferInsert;
