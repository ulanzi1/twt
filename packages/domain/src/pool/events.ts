// Pool event vocabulary + Zod payload schemas — Story 7.1 (Task 2; AC2).
//
// The `pool.*` event types are the pool lifecycle's WRITE vocabulary: every legal
// transition is a named, dotted `resource.action` event on the pool's `events_log`
// stream (stream_id = pool_id; architecture line 3830-3833). These schemas validate
// the event PAYLOAD; `occurred_at` + `pariwar_id` + `actor_id` are columns on
// `events_log` and are NOT duplicated here.
//
// ── Why these live in @twt/domain (not @twt/contracts) ────────────────────────
// `@twt/events` depends on @twt/domain; the registry (packages/events/src/registry.ts)
// imports these schemas, and so does the reducer (pool/state.ts). Putting them in
// @twt/contracts would force domain→contracts, reversing the legal import direction
// (contracts→domain). Same rationale as claim/events.ts.
//
// ── THE PINNED SEAM CONTRACT: event-name delimiter reconciliation ─────────────
// The epic AC spells the open transition `pool.opened-for-contributions` (a HYPHEN
// in the action). The ALREADY-MERGED registry convention is single-dot
// `resource.action` snake_case (member.signup_initiated, claim.intake_initiated) —
// NOT the epic's hyphen/double-dot forms. This file RESOLVES to the established
// convention: `pool.opened_for_contributions` (snake_case action). The epic-vs-code
// spelling reconciliation is recorded in the Story 7.1 Dev Agent Record. The other
// three names (`pool.spawned` / `pool.closed` / `pool.settled`) are single-word
// actions and match both.
//
// Every transition payload carries the architecture §1.14 audit shape — `from_state`,
// `to_state`, `trigger`, `actor` — plus event-specific fields where load-bearing.
// `.strict()` everywhere: an unknown key is a defect, not silently tolerated.

import { z } from 'zod';

import { POOL_LIFECYCLE_STATES, POOL_SUPPORT_CATEGORIES } from '../schema/pools.js';

/**
 * Who caused the pool transition (architecture §1.14 line 1262-1268). Pool lifecycle
 * is predominantly cycle/time-driven — `system` = the SIE / spawn saga / scheduler.
 * `operator` (helpline staff) + `trustee` cover a manually-driven close/settle. A
 * `member` never drives pool lifecycle (deliberately absent — contrast claims).
 */
export const poolActorSchema = z.enum(['system', 'operator', 'trustee']);
export type PoolEventActor = z.infer<typeof poolActorSchema>;

/** A pool-lifecycle-state literal, derived from the one tuple in schema/pools.ts. */
export const poolLifecycleStateSchema = z.enum(POOL_LIFECYCLE_STATES);

/** A support-category literal, derived from the one tuple in schema/pools.ts. */
export const poolSupportCategorySchema = z.enum(POOL_SUPPORT_CATEGORIES);

/**
 * The `benefit_mechanism` literal for the payload. Value-mirrors the
 * `benefitMechanismEnum` pgEnum (schema/clause_versions.ts) — the ONE authority is
 * that pgEnum tuple; this z.enum is the same two labels for the event payload.
 * Declared inline (NOT imported from a contracts enum) to keep domain cycle-free;
 * the pgEnum + this list are the same `['pool', 'reserve']` by construction.
 */
export const poolBenefitMechanismSchema = z.enum(['pool', 'reserve']);

/**
 * The audit shape every pool.* payload carries. `from_state` is nullable — the
 * initial `pool.spawned` event has no prior state.
 *
 * NOTE: these are AUDIT metadata. The reducer (pool/state.ts) is the runtime
 * authority for the transition — it derives the next state from the CURRENT state +
 * the event TYPE, never from `to_state` in the payload (so a mislabelled payload can
 * never corrupt replay).
 */
const auditShape = {
  from_state: poolLifecycleStateSchema.nullable(),
  to_state: poolLifecycleStateSchema,
  // Freeform human-readable audit note — NOT a machine-matched enum; callers pass
  // e.g. "cycle_freeze_commit:spawn", "cron:contribution_window_open",
  // "cron:contribution_window_close", "disbursement:settled". Deliberately
  // unconstrained (the claim/events.ts trigger-field decision) — no bounded trigger
  // vocabulary is specified for pools, and constraining it would invent a rule the
  // ACs never asked for.
  trigger: z.string().min(1),
  actor: poolActorSchema,
};

/**
 * Pool spawned → `spawned` (initial). Owner: Story 7.3 (the spawn saga). This is the
 * CREATION event — the first event of the pool's stream. It carries the pool's
 * spawn-snapshot identity: `support_category`, `benefit_mechanism`, `fixed_amount`,
 * `pool_index`, `cycle_id`, `pool_canonical_identifier` (AC2). These are self-
 * describing for audit-replay + drive the Story 7.1 snapshot serializer (Task 6).
 * `from_state` is null (no prior state).
 */
export const PoolSpawnedPayloadSchema = z
  .object({
    ...auditShape,
    support_category: poolSupportCategorySchema,
    benefit_mechanism: poolBenefitMechanismSchema,
    // The fixed contribution amount, integer WHOLE-INR (no paise) — matching the
    // pools.fixed_amount column convention. Snapshotted at spawn. Strictly positive —
    // a zero-contribution pool has no use case (Story 7.1 review).
    fixed_amount: z.number().int().positive(),
    // 0-based index of this pool within its cycle.
    pool_index: z.number().int().nonnegative(),
    // The cycle boundary (cycle_freeze_commits.commit_id — no `cycles` table).
    cycle_id: z.string().uuid(),
    // The `P-YYYY-MM-###` human-readable identifier (Story 7.2 owns generation).
    pool_canonical_identifier: z.string().min(1),
    // ── Story 7.4 (AC5) — assignment audit-reproducibility fields ──────────────
    // `member_state_hash` is the roster fingerprint (SHA-256 over the canonical sorted
    // assignable member-id list; @twt/domain pool.computeAssignableRosterHash) at freeze, and
    // `assignment_hash_version` is the whole-algorithm version pin — together they let an auditor
    // re-derive the exact member→pool assignment for the frozen roster. OPTIONAL under `.strict()`:
    // pre-7.4 `pool.spawned` events carry neither, and a non-optional field would reject every one
    // of them on replay (the 7.1-era events must still validate). Story 7.4 writers ALWAYS populate
    // both.
    member_state_hash: z.string().optional(),
    assignment_hash_version: z.string().optional(),
    // `assignment_roster_wired` disambiguates "no assignable-roster query exists yet" (`false`,
    // the current D2→B state — every 7.4-era event carries this) from a future, genuinely-empty
    // roster once the live freeze-time query lands (`true` with `member_state_hash ===
    // sha256("[]")`). Without this flag the two cases are indistinguishable to an auditor after
    // the roster-wiring follow-up ships. OPTIONAL under `.strict()` for the same replay reason as
    // the two fields above.
    assignment_roster_wired: z.boolean().optional(),
  })
  .strict();

/** Pool opened for contributions → `live`. Owner: Epic 7 (the contribution-window
 *  scheduler). The delimiter-reconciled name `pool.opened_for_contributions` (see the
 *  PINNED SEAM header). */
export const PoolOpenedForContributionsPayloadSchema = z.object({ ...auditShape }).strict();

/** Pool contribution window closed → `closed`. Owner: Epic 7 (the window-close
 *  scheduler / manual close). */
export const PoolClosedPayloadSchema = z.object({ ...auditShape }).strict();

/** Pool disbursed to the deceased's nominee accounts → `settled` (terminal). Owner:
 *  Epic 7/9 (disbursement + reconciliation). */
export const PoolSettledPayloadSchema = z.object({ ...auditShape }).strict();

// ── The pool-event vocabulary + the type→schema map (single source) ───────────

export const POOL_EVENT_TYPES = [
  'pool.spawned',
  'pool.opened_for_contributions',
  'pool.closed',
  'pool.settled',
] as const;

/** The dotted `pool.*` event-type literal union (the 4 pool events). */
export type PoolEventType = (typeof POOL_EVENT_TYPES)[number];

/**
 * type → payload-schema map. The ONE place the 4 events bind to their schemas;
 * `EVENT_TYPE_REGISTRY` (packages/events) and the projector both consume it. The
 * `satisfies` keeps it exhaustive — adding a `PoolEventType` without a schema is a
 * compile error.
 */
export const POOL_EVENT_PAYLOAD_SCHEMAS = {
  'pool.spawned': PoolSpawnedPayloadSchema,
  'pool.opened_for_contributions': PoolOpenedForContributionsPayloadSchema,
  'pool.closed': PoolClosedPayloadSchema,
  'pool.settled': PoolSettledPayloadSchema,
} as const satisfies Record<PoolEventType, z.ZodTypeAny>;
