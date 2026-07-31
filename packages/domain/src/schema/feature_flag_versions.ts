// `feature_flag_versions` table — Story 10.8 (Task 1; AC1).
//
// The per-cohort feature-flag primitive. The Story 10.1 `helpdesk_routing_policy_versions`
// immutability posture applied to flags: a FLIP INSERTs a NEW version row; prior rows are NEVER
// mutated except the `superseded_by_version` forward-pointer. That is what makes
// architecture.md:214-216 ("historical flag states are queryable for past evaluations; flag changes
// carry version + effective-at timestamps") true by a ROW READ, not by a projector.
//
// ── NOT a 6th event-derived-state primitive (Decision 3) ───────────────────────────────────────────
// The repo has five event-derived-state primitives (members/claims/pools/alerts/helpdesk_tickets),
// each with a projector-only `current_state`, a DB write-rejection trigger, and its own CI gate.
// Flags are NOT the sixth. Those five exist because an EXTERNAL event stream moves the state and a
// writer might diverge from the projector — the gate polices that divergence. Nothing outside the
// admin write path ever moves a flag: an admin authors a version, and the version IS the state. So
// `state` here is an AUTHORED ATTRIBUTE of a version row, not a derived cache. No projector, no
// state trigger, no state-invariant gate. (10.1 made the identical split: its *tickets* are
// event-derived-state; its *routing-policy registry* is versioned-immutable-rows. A flag is the
// registry, not the ticket.)
//
// ── ⚠ `pariwar_id` is NULLABLE — the ONE deliberate deviation from the standard tenant table ───────
// NULL = a GLOBAL flag row (the catalog default that applies to every Pariwar); non-NULL = that
// Pariwar's OVERRIDE. This is the one place this table departs from the ~18 sibling tenant-isolated
// tables, and it has three consequences that are DELIBERATE, TESTED carve-outs — not oversights:
//   1. The SELECT policy needs an explicit `OR pariwar_id IS NULL` leg so every tenant can read the
//      global rows (see `policies/feature-flag-versions-rls.ts`). Do NOT "fix" it.
//   2. The uniqueness guard needs `NULLS NOT DISTINCT` (PG15+). Under the DEFAULT null-distinct
//      semantics a unique index over `(pariwar_id, flag_key, version)` would NOT constrain global
//      rows at all — every `(NULL, 'k', 1)` would be considered distinct from every other, so the
//      23505 the registry's conflict detection depends on would never fire for globals.
//   3. NO composite self-FK on `(pariwar_id, flag_key, superseded_by_version)`. A composite FK is
//      MATCH SIMPLE by default, which is trivially SATISFIED whenever any referencing column is
//      NULL — i.e. it would silently not apply to exactly the global half of the table. A
//      constraint that quietly covers half its rows is worse than an honest absence; the
//      append-only trigger in migration 0087 is the real backstop.
//
// JSONB inner keys are snake_case (the clause_versions / routing-policy convention), matching the
// `@twt/contracts/feature-flags` wire shape exactly (sync-guard test).

import { boolean, index, integer, jsonb, pgEnum, pgTable, text, timestamp, unique, uuid } from 'drizzle-orm/pg-core';

import type { FeatureFlagVersionId, PariwarId, UserId } from '../ids/index.js';

/**
 * The staged-rollout state set (AC7 / Cross-Cutting #15 "canary → graduated cohorts + rollback").
 * An AUTHORED attribute of a version row, NOT a projected cache (see the header).
 */
export const FEATURE_FLAG_STATES = ['off', 'canary', 'rollout', 'full', 'rolled_back'] as const;
export type FeatureFlagState = (typeof FEATURE_FLAG_STATES)[number];
export const featureFlagStateEnum = pgEnum('feature_flag_state', FEATURE_FLAG_STATES);

/**
 * The dimensions a cohort clause may gate on (Decision 5) — FR-58C's stated gating axes
 * (`prd.md:886`). A FIXED enum, deliberately: it is what keeps the predicate a BOUNDED declarative
 * form rather than an expression language. An unknown dimension fails CLOSED at evaluation.
 */
export const COHORT_DIMENSIONS = ['pariwar_id', 'member_state', 'district', 'block', 'role', 'cohort_tag'] as const;
export type CohortDimension = (typeof COHORT_DIMENSIONS)[number];

/** The operators a cohort clause may use (Decision 5). `eq` is `in` with one value; both are kept
 *  so a trustee reading the rule in a PR sees the author's intent. An unknown op fails CLOSED. */
export const COHORT_OPERATORS = ['in', 'eq'] as const;
export type CohortOperator = (typeof COHORT_OPERATORS)[number];

/** One cohort clause (JSONB, snake_case — mirrors the contract `CohortClause`). Values are ORed
 *  within a clause (`in`); clauses are evaluated first-match in EXPLICIT ARRAY ORDER. */
export interface CohortClauseJson {
  dimension: string;
  op: string;
  values: string[];
}

/**
 * A cohort definition (JSONB) — the EXPLICITLY-ORDERED clause list. Array order is the ONLY
 * precedence source (the `resolveRoute` contract). An EMPTY clause list means "no cohort narrowing"
 * — the flag's `state` alone decides. Mirrors the contract `CohortDefinition`.
 */
export interface CohortDefinitionJson {
  clauses: CohortClauseJson[];
}

export const featureFlagVersions = pgTable(
  'feature_flag_versions',
  {
    // Per-row address (UUID). DB-defaulted, or PRE-GENERATED by an audited write (the Story 2.4
    // pattern). Branded `FeatureFlagVersionId`.
    id: uuid('id').defaultRandom().primaryKey().$type<FeatureFlagVersionId>(),

    // The flag's stable identity across versions and tenants — the key the capability bar allowlists
    // and the gate cross-checks. Bounded, non-PII, snake_case by convention (`kyc_manual_fallback`).
    flagKey: text('flag_key').notNull(),

    // ⚠ NULLABLE tenant key — NULL = the GLOBAL row, non-NULL = that Pariwar's override. See the
    // header for the three carve-outs this forces (RLS leg, NULLS NOT DISTINCT, no composite FK).
    pariwarId: uuid('pariwar_id').$type<PariwarId>(),

    // Monotonic per `(pariwar_id, flag_key)`. Version 1 is owned by the CODE DEFAULT (a constant in
    // feature-flags/registry.ts — the 10.1 default-owns-v1 trick), so persisted rows start at 2 and
    // `(pariwar_id, flag_key, version)` is an unambiguous replay pin with no extra version-id column.
    version: integer('version').notNull(),

    // The Decision-5 BOUNDED declarative predicate (opaque JSONB — the pure evaluator interprets it,
    // the table stores it). NEVER an expression language: no JSONLogic, no eval, no mini-DSL.
    cohortDefinition: jsonb('cohort_definition').notNull().$type<CohortDefinitionJson>(),

    // The staged-rollout state (AC7). Authored, not projected.
    state: featureFlagStateEnum('state').notNull(),

    // The OFFLINE-RESILIENCE default (architecture.md:217-219): the value evaluation falls back to
    // when the cohort predicate cannot be resolved (unknown dimension/op). Per-flag, never global.
    fallbackDefault: boolean('fallback_default').notNull(),

    // The LIFECYCLE-ACCOUNTABILITY pair (architecture.md:220-221 + :4094-4098): a named human owner
    // and the date by which this flag is expected to be retired. NON-PII controlled-staff metadata
    // (a role/team/desk name, never a member identity). Both REQUIRED — a flag with no owner and no
    // dead-by is exactly the permanent-flag debt the quarterly inventory audit exists to catch.
    owner: text('owner').notNull(),
    deadBy: timestamp('dead_by', { withTimezone: true, mode: 'date' }).notNull(),

    // The audit line anchoring this version's creation (AC3). PRE-GENERATED by the caller (the Story
    // 2.4 anchor pattern); the audit LINE itself is the CALLER's obligation — the narrow-write posture.
    auditId: uuid('audit_id'),

    // The effective window. `flagVersionInForce(at)` resolves the row with `effective_from <= at`
    // AND (`effective_until` IS NULL OR `effective_until` > at). ⚠ The WINDOW lives here, in the
    // LOOKUP — never inside the pure evaluator (the `computeTicketSlaDueDates` time-split, AC2).
    effectiveFrom: timestamp('effective_from', { withTimezone: true, mode: 'date' }).notNull(),
    effectiveUntil: timestamp('effective_until', { withTimezone: true, mode: 'date' }),

    // WHO flipped it (NON-PII controlled-staff attribution); null = system/seed.
    actorWhoFlipped: uuid('actor_who_flipped').$type<UserId>(),

    // WHY — FR-58C (`prd.md:890`) requires "flag changes audit-logged with actor + rationale". Stored
    // on the ROW (not only in the audit line) because AC4's inventory renders the last flip's
    // rationale, and a transparency surface must not depend on a hash-chain join. Bounded non-PII
    // free text; NEVER a member identity or any Tier-1 value.
    rationale: text('rationale').notNull(),

    // The immutability forward-pointer (the ONLY legitimately-mutable column, the clause_versions /
    // routing-policy twin): set on the PRIOR row when a new version is created. Points at the
    // successor's `version` int within the same `(pariwar_id, flag_key)`. Null = this is the latest.
    supersededByVersion: integer('superseded_by_version'),

    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
  },
  (t) => [
    // The monotonic version guard (a duplicate version is a 23505 → FlagVersionConflictError → 409,
    // never a silent overwrite). ⚠ Declared `nullsNotDistinct` — WITHOUT it the guard would not
    // constrain global (pariwar_id IS NULL) rows at all. See header carve-out (2). Declared as a
    // UNIQUE CONSTRAINT rather than the `uniqueIndex(...)` the sibling registries use, because in
    // drizzle 0.45 `nullsNotDistinct()` exists ONLY on the constraint builder — and a declaration
    // that cannot express the null semantics would silently misdescribe the DB.
    unique('feature_flag_versions_scope_key_version_uq')
      .on(t.pariwarId, t.flagKey, t.version)
      .nullsNotDistinct(),
    // In-force resolution scans per (flag, scope, window-start).
    index('feature_flag_versions_key_scope_effective_idx').on(t.flagKey, t.pariwarId, t.effectiveFrom),
  ],
);

export type FeatureFlagVersionRow = typeof featureFlagVersions.$inferSelect;
export type FeatureFlagVersionInsert = typeof featureFlagVersions.$inferInsert;
