// `pools` table — Story 7.1 substrate (the pool-lifecycle anchor).
//
// The FIRST Epic-7 landing and a pure `[PRIMITIVE]` — the pool-lifecycle TWIN of
// Story 3.1's `members` table + Story 6.1's `claims` table. This table is the
// pool's lifecycle ANCHOR: a pool object whose state is DERIVED from its
// `events_log` stream (stream_id = pool_id) replayed through the pure reducer in
// `pool/state.ts`. It is the third instance of the same event-derived-state
// primitive shape (member → claim → pool).
//
// Story 7.1 commits ONLY the pool OBJECT + its state machine + the snapshot shape
// (Task 6) + the two CI gates. The member ASSIGNMENT into pools is Story 7.4; the
// spawn SAGA that populates pools (parent → N children, atomic cycle-freeze
// invariant) is Story 7.3; pool NAMING (`P-YYYY-MM-###` generation) is Story 7.2.
// 7.1 declares the columns + indexes those downstream stories fill.
//
// ── pools.current_state is a READ-OPTIMIZATION CACHE, not the source of truth ──
// The source of truth for a pool's lifecycle state is the pool's `events_log`
// stream (stream_id = pool_id) replayed through the pure reducer in `pool/state.ts`
// (architecture §1.6 Pool Engine + §1.14 line 1229 "Pool eligibility — Pool Engine
// reads member-state"). The persisted `current_state` column is a projection of
// that replay — written ONLY by the projector (`pool/project.ts`) inside the same
// transaction that appends the transition event (cache-invalidation invariant, AC5).
// Two guards keep it honest — the exact posture Story 3.1/6.1 established:
//   · the DB trigger (migration 0071, AC5) — rejects any INSERT/UPDATE to
//     `current_state` that is not issued by the projector (session-variable
//     `app.pool_state_writer` guard, mirroring `app.claim_state_writer`);
//   · the CI gate (scripts/pool-state-invariant, AC5) — static-scans
//     packages/domain/src and fails on any `.update(pools).set({ currentState })`
//     outside the projector allowlist.
//
// ── pool_id = the event-stream stream_id (no DB default) ──────────────────────
// `pool_id` IS the pool's `events_log.stream_id` (one stream per pool, architecture
// §1.6/§1.14). It is minted by the spawn saga (Story 7.3) as the stream_id of the
// first event (`pool.spawned`). It is therefore caller-supplied — NO
// `gen_random_uuid()` default — so a pool row can never exist with an id that does
// not match its event stream (the claims `claim_case_id` posture). Branded `PoolId`
// (ids/index.ts:89 — pre-reserved for "pools 7.x"; reused, NOT re-declared).
//
// ── support_category discriminator (AC4 — no death-specific branches) ─────────
// Every pool carries a `support_category` enum. v1 inserts ONLY `death_support`;
// the `_daan` categories are RESERVED for v2 (see the tuple comment) but NOT added
// as labels now (enum-width discipline, mirroring `benefit_mechanism`'s two-label
// freeze). The pool engine has NO death-specific branches — every code path keys on
// this enum, never on a hardcoded `'death'` string (the AC4 CI gate enforces it).
//
// Naming discipline per architecture line 3663-3677: DB columns snake_case, TS
// fields camelCase, table snake_case-plural. Header style mirrors schema/claims.ts.

import { bigint, index, integer, pgEnum, pgTable, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core';

import type { ClaimId, CycleFreezeCommitId, PariwarId, PoolId } from '../ids/index.js';
import { benefitMechanismEnum } from './clause_versions.js';

/**
 * The canonical pool-lifecycle state list — the ONE spelling authority (AC1/AC2).
 *
 * These are the four lifecycle states a pool passes through:
 *   · `spawned` — initial; the pool exists (the spawn saga appended `pool.spawned`).
 *   · `live`    — open for contributions (`pool.opened_for_contributions`).
 *   · `closed`  — the contribution window has closed (`pool.closed`).
 *   · `settled` — disbursed to the deceased's nominee accounts (`pool.settled`; terminal).
 *
 * The state LABELS need no delimiter (single words). Choosing the label set here
 * (not the event-name delimiter, which pool/events.ts resolves) keeps this the sole
 * spelling authority: pool is a new independent per-table enum namespace (nothing
 * joins a pool state to a member/claim state), so its delimiter choices are its own.
 *
 * Both the pgEnum (DB CREATE TYPE) and the `PoolLifecycleState` TS union below are
 * DERIVED from this single tuple — there is no second list to drift.
 */
export const POOL_LIFECYCLE_STATES = ['spawned', 'live', 'closed', 'settled'] as const;

/** pgEnum (`CREATE TYPE pool_lifecycle_state`) derived from the one tuple. */
export const poolLifecycleStateEnum = pgEnum('pool_lifecycle_state', POOL_LIFECYCLE_STATES);

/** The lifecycle-state literal union — derived from the same tuple (no drift). */
export type PoolLifecycleState = (typeof POOL_LIFECYCLE_STATES)[number];

/**
 * The pool support-category discriminator — the ONE spelling authority (AC1/AC4).
 *
 * v1 ships EXACTLY ONE label: `death_support`. Every v1 pool inserts
 * `support_category: 'death_support'`. The pool engine has NO death-specific
 * branches — it keys on this enum, never on a hardcoded `'death'` string.
 *
 * ⚠ RESERVED for v2 (`_daan` family), NOT added as labels here: the enum-width
 * discipline mirrors `benefit_mechanism`'s two-label freeze — adding an unused label
 * now would be dead surface (a green migration over a label nothing inserts proves
 * nothing). PRD §4.3 names the concrete v2 categories this reservation is for:
 *   · `kanyadan`       — daughter's-marriage support (Kanyadan)
 *   · `jivandan`       — living/education support (Jivandan)
 *   · `retirementdaan` — retirement support (Retirementdaan)
 * When v2 activates one, it lands as a `pool_support_category` ADD-VALUE migration +
 * a `support_category: '<label>'` insert — a CONFIGURATION change, NOT an engine
 * refactor (AC4). Do NOT add these labels to the tuple until the v2 story lands them.
 */
export const POOL_SUPPORT_CATEGORIES = ['death_support'] as const;

/** pgEnum (`CREATE TYPE pool_support_category`) derived from the one tuple. */
export const poolSupportCategoryEnum = pgEnum('pool_support_category', POOL_SUPPORT_CATEGORIES);

/** The support-category literal union — derived from the same tuple (no drift). */
export type PoolSupportCategory = (typeof POOL_SUPPORT_CATEGORIES)[number];

export const pools = pgTable(
  'pools',
  {
    // The pool's canonical id AND its events_log stream_id (architecture §1.6/§1.14).
    // Caller-supplied (the Story 7.3 spawn saga mints it); NO gen_random_uuid()
    // default so a row can never exist with an id that does not match an event
    // stream. Branded PoolId (reused from ids/index.ts:89 — NOT re-declared).
    poolId: uuid('pool_id').primaryKey().$type<PoolId>(),

    // Multi-tenant scope (architecture §1.2). RLS predicate column; branded. unFK'd
    // (the pre-Epic-3 posture — mirrors claims.pariwar_id — there is no pariwars FK yet).
    pariwarId: uuid('pariwar_id').notNull().$type<PariwarId>(),

    // The cycle boundary this pool belongs to. There is NO `cycles` table in the
    // substrate — the cycle boundary is `cycle_freeze_commits.commit_id` (Story 6.13,
    // the Epic-7 pool-spawn HANDOFF anchor, whose own header says it is "NOT a
    // cycle-scheduling object (that is Epic 7)"). unFK'd, mirroring claims.pariwar_id's
    // no-pre-Epic-3-FK posture — the Story 7.3 spawn saga owns the linkage wiring.
    // DEV-AGENT-RECORD choice: branded `CycleFreezeCommitId` (reused — there is no
    // dedicated `CycleId` brand today; the likely binding is
    // pool.cycle_id === cycle_freeze_commits.commit_id, so this is the honest brand).
    // A dedicated `CycleId` brand, if wanted, is a Story 7.3 decision.
    cycleId: uuid('cycle_id').notNull().$type<CycleFreezeCommitId>(),

    // The originating approved claim (the deceased's death claim). This is the
    // `nominee_bank_accounts (refs to Story 6.8)` reference (AC1): Story 6.8's
    // `claim_nominee_bank_accounts` rows are CLAIM-SCOPED disbursement channels
    // (keyed by claim_case_id, exactly two, NOT nominee-linked — the
    // project_nominee_bank_disbursement_channel discipline), so the pool links to
    // them THROUGH the claim rather than duplicating the (Tier-1 ciphertext) bank
    // rows into this table. DEV-AGENT-RECORD choice: a `claim_case_id` link (NOT a
    // `uuid[]` of account ids) — the disbursement path (Epic 7.4/9.5) joins
    // claim_nominee_bank_accounts on this key. Branded ClaimId; unFK'd (Story 7.3
    // owns the spawn-time linkage + any pool↔claim uniqueness / idempotency key).
    claimCaseId: uuid('claim_case_id').notNull().$type<ClaimId>(),

    // The 0-based index of this pool within its cycle (AC1). A cycle-freeze commit
    // may spawn N pools (one per approved claim); pool_index orders them. NOT the
    // spawn-idempotency key — that key decision is Story 7.3's (see the migration
    // comment + Dev Notes "cycle_id source").
    poolIndex: integer('pool_index').notNull(),

    // The human-readable pool identifier (`P-YYYY-MM-###`, AC1). Unique per Pariwar.
    // Story 7.1 declares the column + the unique index; the GENERATION service (the
    // counter, the culture-rooted registry) is Story 7.2.
    poolCanonicalIdentifier: text('pool_canonical_identifier').notNull(),

    // The support-category discriminator (AC1/AC4). v1 inserts ONLY 'death_support'.
    supportCategory: poolSupportCategoryEnum('support_category').notNull(),

    // The FR-7/FR-100 benefit-mechanism discriminator (architectural-freeze row 12).
    // REUSED from schema/clause_versions.ts (NOT re-declared — a second
    // pgEnum('benefit_mechanism', …) collides at migration time). NOT NULL; v1
    // pools insert 'pool' (the crowdfunded-daan mechanism; 'reserve' is v2-forward-compat).
    benefitMechanism: benefitMechanismEnum('benefit_mechanism').notNull(),

    // The fixed contribution amount snapshotted at spawn (AC1). Integer WHOLE-INR
    // (no paise) — matching the ONLY money column in the domain schema today
    // (vyawastha_shulk_receipts.amount_inr; canonical-json.ts mentions "paise" only
    // in an illustrative comment, no column uses it). NOT a float. The value is
    // frozen at spawn so a later fixed-amount change never retro-alters a live pool.
    fixedAmount: integer('fixed_amount').notNull(),

    // The CACHED lifecycle state — a projection of the event-replay, NOT the source
    // of truth. Written ONLY by the projector (pool/project.ts); guarded by the DB
    // trigger + the CI gate. No DB default: the projector writes the replayed result
    // explicitly (the first event projects to `spawned`).
    currentState: poolLifecycleStateEnum('current_state').notNull(),

    // The `events_log.event_version` the cached `current_state` was projected from —
    // the staleness / idempotency anchor. `mode: 'number'` matches the events_log +
    // claims precedent (without it Drizzle returns a JS BigInt that breaks numeric
    // comparison with the `number` the projector produces).
    stateEventVersion: bigint('state_event_version', { mode: 'number' }).notNull(),

    // NULL = system / SIE (architecture §1.14 line 1262-1268). The spawn saga runs as
    // a system actor, so this is typically NULL at spawn.
    createdByActor: uuid('created_by_actor'),

    // The freeze-transition audit anchor (AC1). The cycle-freeze commit that
    // triggered the spawn threads its audit id here. Nullable — Story 7.1 has no live
    // spawn caller yet (Story 7.3 is first); when supplied it is a plain reference
    // (the claims.audit_id no-FK-at-primitive posture).
    auditId: uuid('audit_id'),

    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    // Per-tenant pool scans / RLS-aware planner hint (pariwar_id leads, mirroring
    // claims_pariwar_id_idx). Point lookups use the pool_id PK.
    index('pools_pariwar_id_idx').on(t.pariwarId),
    // The `P-YYYY-MM-###` identifier is unique per Pariwar (Story 7.2 fills the
    // generation service; 7.1 declares the structural guard).
    uniqueIndex('pools_pariwar_canonical_identifier_uq').on(t.pariwarId, t.poolCanonicalIdentifier),
    // Cycle → pools lookup (list the pools spawned in a cycle, ordered by index).
    // NON-unique: kept for the un-scoped/system "list pools in a cycle" scan; the
    // spawn-idempotency guarantee is the UNIQUE index below (which leads with
    // pariwar_id and so does not serve a bare cycle_id scan as cheaply).
    index('pools_cycle_pool_index_idx').on(t.cycleId, t.poolIndex),
    // The SPAWN-IDEMPOTENCY KEY (Story 7.3, Task 1). Story 7.1 deliberately left the
    // (cycle_id, pool_index) index NON-unique and deferred this decision here. A cycle
    // spawns exactly one pool per (pariwar, cycle, index); this UNIQUE index is the
    // DB-level backstop that makes a child-job retry a true no-op — a second
    // `cycle.spawn.child(cycle_id, pool_index)` for an already-spawned pool hits this
    // index (23505 → isPoolSpawnIndexConflict → detect + no-op), never a duplicate pool.
    // Reconciliation (Dev Notes): the epic keys idempotency on (cycle_id, pool_index);
    // architecture §1.4 names (alert_id, claim_id) → pool_id, but there is no `alerts`
    // table until Epic 8 (which CONSUMES cycle.frozen), so (cycle_id, pool_index) — 1:1
    // with (cycle_id, claim_case_id) since one pool = one approved claim — is the
    // expressible key; the alert_id binding is an Epic-8 follow-up, not a blocker.
    uniqueIndex('pools_pariwar_cycle_pool_index_uq').on(t.pariwarId, t.cycleId, t.poolIndex),
    // The disbursement path joins claim_nominee_bank_accounts by the originating claim.
    index('pools_claim_case_id_idx').on(t.claimCaseId),
  ],
);

// Inferred row types for the accessor read/write paths (claims precedent).
export type PoolRow = typeof pools.$inferSelect;
export type PoolInsert = typeof pools.$inferInsert;
