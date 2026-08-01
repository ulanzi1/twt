// packages/contracts/src/feature-flags/feature-flags.ts
//
// The feature-flag transport DTOs (Story 10.8, Task 6) — the inventory READ shapes and the FLIP write
// shape, at the route shapes this directory's README already committed:
//   · catalog                → /api/v1/global/feature-flags
//   · per-Pariwar effective  → /api/v1/p/<pariwar_id>/feature-flags
//
// ── Contracts discipline ──────────────────────────────────────────────────────────────────────────
// A contracts SOURCE file MUST NOT import `@twt/domain` (the browser-bundle rule — the domain barrel
// re-exports pg-touching namespaces, which would drag `pg` into the RN Metro bundle). Plain Zod
// primitives only; the domain↔contracts enum equality is pinned by a TEST-only sync-guard.
// snake_case wire (the 10.x convention; domain is camelCase — watch the drift). `.strict()` throughout.
//
// ── The "no secret flags" property, expressed as a contract (AC4) ─────────────────────────────────
// ⚠ There is deliberately NO `hidden` / `internal` / `visibility` field anywhere in these DTOs, and
// no filter parameter on the inventory responses. That absence is load-bearing: prd.md:892 requires
// the inventory be COMPLETE for an authorized reader, and a contract that could express "omit this
// one" is a contract that invites a code path to do so. If a future story needs to hide a flag, that
// is a change to this property and belongs in a reviewed ADR, not a new optional field.
//
// ── PII discipline ────────────────────────────────────────────────────────────────────────────────
// Nothing here is member data. `owner` is a DESK/team label (controlled staff metadata, never a
// person's identity), `rationale` is a bounded governance note, and `last_flip_actor` is an admin
// user id. A cohort clause's `values` carry geo/role/tag identifiers — never a member id or any
// Tier-1 value.

import { z } from 'zod';

import { Iso8601Datetime } from '../_common/primitives.js';

/** The staged-rollout state (mirrors the domain `FEATURE_FLAG_STATES`; a test-only sync-guard pins
 *  the two equal). `rolled_back` is distinct from `off` so the inventory and the audit trail can
 *  tell a rollback from a flag that never launched. */
export const FeatureFlagState = z.enum(['off', 'canary', 'rollout', 'full', 'rolled_back']);
export type FeatureFlagState = z.output<typeof FeatureFlagState>;

/** The gating axes a cohort clause may use — FR-58C's stated dimensions (`prd.md:886`). A FIXED enum:
 *  it is what keeps the predicate a bounded declarative form rather than an expression language
 *  (Decision 5). Mirrors the domain `COHORT_DIMENSIONS` (test-only sync-guard). */
export const CohortDimension = z.enum(['pariwar_id', 'member_state', 'district', 'block', 'role', 'cohort_tag']);
export type CohortDimension = z.output<typeof CohortDimension>;

/** The operators a cohort clause may use. Mirrors the domain `COHORT_OPERATORS` (test-only sync-guard). */
export const CohortOperator = z.enum(['in', 'eq']);
export type CohortOperator = z.output<typeof CohortOperator>;

/** Which tier answered the flag lookup — the inventory's provenance column (AC4 requires the
 *  per-Pariwar view show global-vs-override). `default` = the code-constant v1, which is not a row. */
export const FlagSource = z.enum(['override', 'global', 'default']);
export type FlagSource = z.output<typeof FlagSource>;

/** One cohort clause. Values are ORed within a clause; clauses are first-match in EXPLICIT ARRAY
 *  ORDER — the array order IS the precedence, which is why this is an array and not a record. */
export const CohortClause = z
  .object({
    dimension: CohortDimension,
    op: CohortOperator,
    values: z.array(z.string().min(1).max(256)).min(1).max(200),
  })
  .strict();
export type CohortClause = z.output<typeof CohortClause>;

/** The cohort predicate. An EMPTY clause list means "no cohort narrowing" — the state alone decides. */
export const CohortDefinition = z
  .object({
    clauses: z.array(CohortClause).max(20),
  })
  .strict();
export type CohortDefinition = z.output<typeof CohortDefinition>;

/**
 * ⚠ The READ side uses this SAME strict shape, deliberately (Review Pass 4).
 *
 * An earlier fix made the read schema tolerant (`.catch`) so that one malformed persisted row could
 * not fail `parse` for a whole inventory response and blank the admin console. That was the right
 * PROBLEM and the wrong LAYER: a wire contract should describe the shape the API actually emits, and
 * `ZodCatch` cannot be expressed in OpenAPI at all — the generator throws on it, which is a fair
 * signal that "sometimes this field is garbage" does not belong in a published contract.
 *
 * The resilience now lives where the malformed row actually is: `apps/api`'s projection coerces a
 * degenerate `cohort_definition` to `{ clauses: [] }` on the way out, so the response is ALWAYS
 * contract-valid and no consumer has to defend against it.
 */

/**
 * One inventory entry — a flag's effective resolution for the requested scope, plus the lifecycle
 * metadata the console renders. `flag_version` is the replay pin's version component; together with
 * the scope and `flag_key` it identifies the exact document that decided.
 */
export const FeatureFlagInventoryEntry = z
  .object({
    flag_key: z.string().min(1).max(128),
    /** One line stating the behaviour this flag toggles (from the code registry). */
    description: z.string().max(512),
    state: FeatureFlagState,
    source: FlagSource,
    flag_version: z.number().int().nonnegative(),
    cohort_definition: CohortDefinition,
    /** The offline-resilience default — what evaluation returns when the cohort cannot be resolved. */
    fallback_default: z.boolean(),
    /** Lifecycle accountability (architecture.md:4094-4098). A desk/team label, never a person. */
    owner: z.string().max(64),
    /** ISO date (YYYY-MM-DD) — the expected-retirement signal the quarterly inventory audit reads. */
    dead_by: z.string().max(10).nullable(),
    effective_from: Iso8601Datetime.nullable(),
    effective_until: Iso8601Datetime.nullable(),
    /** The last flip's actor + why (FR-58C: "flag changes audit-logged with actor + rationale"). Both
     *  null on the `default` tier, which is code data and was never flipped by anyone. */
    last_flip_actor: z.string().nullable(),
    /**
     * The flipping admin's display name, SNAPSHOT at flip time — the human-readable half of AC4's
     * "last flip actor". Null means the row predates migration 0089 (attribution snapshotting), NOT
     * "unknown actor"; render it as "not recorded" rather than substituting the UUID.
     */
    last_flip_actor_display: z.string().max(128).nullable(),
    rationale: z.string().max(500).nullable(),
  })
  .strict();
export type FeatureFlagInventoryEntry = z.output<typeof FeatureFlagInventoryEntry>;

/**
 * `GET /api/v1/global/feature-flags` and `GET /api/v1/p/{pariwarId}/feature-flags` — the COMPLETE
 * inventory for that scope. Every registered flag appears; see the no-secret-flags note in the header.
 */
export const FeatureFlagInventoryResponse = z
  .object({
    flags: z.array(FeatureFlagInventoryEntry),
  })
  .strict();
export type FeatureFlagInventoryResponse = z.output<typeof FeatureFlagInventoryResponse>;

/** One persisted version row in a flag's history (version 1 is never here — it is the code default). */
export const FeatureFlagVersionEntry = z
  .object({
    flag_key: z.string().min(1).max(128),
    /** null = the cross-tenant GLOBAL row; non-null = a Pariwar override. */
    pariwar_id: z.string().nullable(),
    version: z.number().int().positive(),
    state: FeatureFlagState,
    cohort_definition: CohortDefinition,
    fallback_default: z.boolean(),
    owner: z.string().max(64),
    dead_by: z.string().max(10),
    effective_from: Iso8601Datetime,
    effective_until: Iso8601Datetime.nullable(),
    actor_who_flipped: z.string().nullable(),
    /** Display-name snapshot at flip time; null on rows predating migration 0089. */
    actor_display: z.string().max(128).nullable(),
    rationale: z.string().max(500),
    /** The immutability forward-pointer; null = this is the latest version for its scope. */
    superseded_by_version: z.number().int().positive().nullable(),
    created_at: Iso8601Datetime,
  })
  .strict();
export type FeatureFlagVersionEntry = z.output<typeof FeatureFlagVersionEntry>;

/** `GET …/feature-flags/{flagKey}/versions` — the flag's version history, newest first. */
export const FeatureFlagVersionsResponse = z
  .object({
    flag_key: z.string(),
    /**
     * True when the history is deeper than the page returned. Surfaced because the read is bounded
     * at 100 rows and used to truncate SILENTLY (Review Pass 2) — a consumer rendering provenance
     * could not tell a complete history from a clipped one.
     */
    has_more: z.boolean(),
    versions: z.array(FeatureFlagVersionEntry),
  })
  .strict();
export type FeatureFlagVersionsResponse = z.output<typeof FeatureFlagVersionsResponse>;

/**
 * `POST /api/v1/p/{pariwarId}/feature-flags/{flagKey}/versions` — THE FLIP. Creates a new immutable
 * version row; prior rows are never mutated.
 *
 * ⚠ `rationale` is REQUIRED and non-empty, not optional. FR-58C (`prd.md:890`) requires flag changes
 * be "audit-logged with actor + rationale" — an optional rationale would make the audit trail
 * optional in practice, since the field would be empty on exactly the hurried flips that most need
 * explaining. Bounded at 500 chars so it stays a governance note and never a free-text PII sink.
 */
export const FeatureFlagFlipRequest = z
  .object({
    state: FeatureFlagState,
    cohort_definition: CohortDefinition,
    fallback_default: z.boolean(),
    owner: z.string().min(1).max(64),
    /** ISO date (YYYY-MM-DD) — required: a flag with no retirement date is permanent debt. Format-
     *  checked here (the calendar-validity check, e.g. rejecting `2027-02-30`, is server-side). */
    dead_by: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'dead_by must be an ISO date (YYYY-MM-DD)'),
    rationale: z.string().min(1).max(500),
    /**
     * Optional window start; defaults to the DB's `now()`.
     *
     * ⚠ MAY NOT BE IN THE FUTURE. Scheduled flips are not supported — a flip takes effect
     * immediately (Review Pass 2 dropped scheduling: a future-dated version deadlocked the rollback
     * path, because the effective-from ordering guard then rejected every later flip, including the
     * audited rollback, until that date arrived). A future value is rejected with
     * `400 feature_flag.invalid_version`. Not expressed as a `.refine()` here deliberately: "the
     * future" is server-clock-relative, and a wire-level check against the CLIENT's clock would
     * reject legitimately-now values under ordinary skew.
     */
    effective_from: Iso8601Datetime.optional(),
    /** Optional window end; null/absent = open-ended (superseded by the next version instead). */
    effective_until: Iso8601Datetime.optional(),
  })
  .strict();
export type FeatureFlagFlipRequest = z.output<typeof FeatureFlagFlipRequest>;

/** `POST …/versions` response — the newly-created version's pin + its audit anchor. */
export const FeatureFlagFlipResponse = z
  .object({
    flag_key: z.string(),
    pariwar_id: z.string().nullable(),
    version: z.number().int().positive(),
    state: FeatureFlagState,
    effective_from: Iso8601Datetime,
    /** The §1.5 hash-chain audit line anchoring this flip (AC3). */
    audit_id: z.string().nullable(),
  })
  .strict();
export type FeatureFlagFlipResponse = z.output<typeof FeatureFlagFlipResponse>;
