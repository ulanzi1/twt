// Pool spawn saga — parent planner + child spawner + last-child finalizer.
// Story 7.3 (Tasks 1/3/4; AC1/AC2/AC4).
//
// THE load-bearing atomicity story. A cycle-freeze commit spawns N pools (one per approved
// claim). This module is the DOMAIN half of the parent → N-child saga; the pg-boss worker
// runtime (apps/jobs/src/cycle-spawn.ts) drives it, and the apps/api composition root
// produces the parent job (Story 6.13's PoolSpawnTrigger seam, now real).
//
// ── The atomic cycle-freeze invariant (AC2) — how it is achieved ──────────────
// Atomicity is NOT a single giant transaction (that would blow the <60s p95 envelope and
// defeat the concurrent per-pool decomposition the architecture commits). It is at the
// CYCLE-VISIBILITY level, gated on the single `cycle.frozen` commit-point event, with
// idempotent FORWARD-RECOVERY:
//   1. Each child pool row is written in its OWN short tx (fast, concurrent, per-pool).
//   2. Consumers gate on `cycle.frozen` — before it, the cycle reads as the previous
//      (unspawned) state; the pool rows from a crashed saga are invisible-because-not-frozen.
//   3. On failure the saga is RETRIED FORWARD (idempotent children), never rolled back. A
//      retry re-runs only the missing children; committed ones no-op.
//   4. `cycle.frozen` is emitted EXACTLY ONCE, by the last child to commit (see below).
//
// ── Completion detection — LAST-CHILD FINALIZES (ratified) ────────────────────
// The parent cannot hold a tx open across N async child jobs. Instead, each child — AFTER
// committing its own pool row — opens a second short tx, takes an advisory lock on the
// cycle, counts the committed pools, and if `count == N` appends `cycle.frozen`. The advisory
// lock serializes the finalize check across children, and the events_log
// `(stream_id, event_version)` unique index is the final backstop: if two children still
// race to finalize, exactly one wins and the other no-ops. `cycle.frozen` is therefore
// emitted exactly once. count-and-finalize is a pure function of committed DB state, so it is
// itself idempotent under retry (a re-run recomputes `count == N`, re-attempts, loses the
// version race against the already-emitted `cycle.frozen` → no double-freeze).
//
// ── Child independence (ratified) ────────────────────────────────────────────
// A child's entire output — its pool_id (UUIDv5 of `${cycle_id}:${pool_index}`), canonical
// identifier, member assignments, snapshot + integrity hash — is a PURE FUNCTION of
// (cycle_id, pool_index, claim_case_id, fixed_amount, member-set-at-freeze). No child reads
// another child's state, no shared mutable state, no ordering dependency, no clock, no
// randomness. This is what makes children concurrently dispatchable AND re-runnable in
// isolation to the identical result.
//
// ── Package discipline ────────────────────────────────────────────────────────
// @twt/domain cannot import @twt/events (turbo cycle). The saga appends events by inserting
// into `events_log` directly (domain owns the table) — the exact pool/project.ts rationale.

import { createHash } from 'node:crypto';

import { and, asc, eq } from 'drizzle-orm';
import type pg from 'pg';

import { insertMemberPoolAssignments } from '../contribution/projection-write.js';
import { bindScopedDb, type Db } from '../db.js';
import type { CycleFreezeCommitId, PariwarId, PoolId } from '../ids/index.js';
import { claimId, cycleFreezeCommitId, pariwarId as toPariwarId, poolId } from '../ids/index.js';
import { cycleFreezeCommits } from '../schema/cycle_freeze_commits.js';
import { eventsLog } from '../schema/events_log.js';
import { POOL_SUPPORT_CATEGORIES, pools, type PoolSupportCategory } from '../schema/pools.js';
import { poolSnapshots } from '../schema/pool_snapshots.js';
import {
  CYCLE_EVENT_PAYLOAD_SCHEMAS,
  CycleFrozenPayloadSchema,
  type CycleEventType,
} from './cycle-events.js';
import { PoolStreamConcurrencyError, isPoolStreamVersionConflict } from './errors.js';
import {
  MAX_CANONICAL_IDENTIFIER_ALLOCATION,
  allocateCanonicalIdentifierRange,
} from './naming.js';
import { reserveNames, type PoolNameReservation } from './names.js';
import type { PoolBenefitMechanism } from './project.js';
import { projectPoolState } from './project.js';
import { serializePoolSnapshot, type PoolSnapshotMemberAssignment } from './snapshot.js';
import { POOL_ASSIGNMENT_HASH_VERSION, computeAssignableRosterHash } from './assign.js';
import { getEffectiveFixedAmount } from './fixed-amount.js';

// ── The v1 spawn defaults (keyed on the enum, never a literal) ────────────────

/** The v1 support category — the SOLE label the enum ships (AC4). Read from the tuple, never
 *  a hardcoded literal, so a v2 `_daan` category is a config change, not an engine edit. */
export const V1_SPAWN_SUPPORT_CATEGORY: PoolSupportCategory = POOL_SUPPORT_CATEGORIES[0];

/** The v1 benefit mechanism — the crowdfunded-daan pool (contrast the v2-forward 'reserve'). */
export const V1_SPAWN_BENEFIT_MECHANISM: PoolBenefitMechanism = 'pool';

/** The most pools one cycle may spawn — mirrors the naming allocator's cap (one pool per
 *  approved claim; a Pariwar freezing more than this in one cycle is a bug, not a real cycle). */
export const MAX_CYCLE_SPAWN_POOLS = MAX_CANONICAL_IDENTIFIER_ALLOCATION;

// ── Deterministic pool_id (UUIDv5) — Task 1 (ratified) ────────────────────────

/**
 * The PINNED namespace UUID for deterministic pool_id derivation. This is part of the pool
 * stream's REPLAY IDENTITY — NEVER change it (a change would make every replayed cycle derive
 * different pool ids). Any fixed UUID works as a UUIDv5 namespace; this value is arbitrary but
 * permanent.
 */
export const POOL_ID_NAMESPACE_UUID = 'b6e7c9a2-3d4f-4a1b-8c5e-9f0a1b2c3d4e';

const NAMESPACE_BYTES = Buffer.from(POOL_ID_NAMESPACE_UUID.replace(/-/g, ''), 'hex');

function bytesToUuid(buf: Buffer): string {
  const h = buf.toString('hex');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20, 32)}`;
}

/**
 * Derive a pool's id DETERMINISTICALLY as UUIDv5 over the pinned namespace + the canonical
 * name `${cycleId}:${poolIndex}`. A retry reproduces the identical stream id — no read
 * round-trip, no TOCTOU window between a check and the insert. Since `pools.pool_id` has no DB
 * default (caller-minted), this makes pool_id a pure function of its deterministic inputs, so a
 * child re-run targets the SAME stream (and the idempotency guards make it a no-op). The
 * `(pariwar_id, cycle_id, pool_index)` UNIQUE index remains the structural backstop.
 */
export function derivePoolId(cycleId: string, poolIndex: number): PoolId {
  if (!Number.isInteger(poolIndex) || poolIndex < 0) {
    throw new Error(`[derivePoolId] poolIndex must be a non-negative integer, got ${String(poolIndex)}`);
  }
  const name = Buffer.from(`${cycleId}:${poolIndex}`, 'utf8');
  const hash = createHash('sha1')
    .update(Buffer.concat([NAMESPACE_BYTES, name]))
    .digest();
  const bytes = hash.subarray(0, 16);
  bytes[6] = (bytes[6]! & 0x0f) | 0x50; // version 5
  bytes[8] = (bytes[8]! & 0x3f) | 0x80; // RFC-4122 variant
  return poolId(bytesToUuid(bytes));
}

/**
 * Cheap existence check on the deterministic pool id — the SAME fast-path idempotency test
 * `spawnChildPool` runs internally (AI-7-2 review: exposed so `runCycleSpawnChild` can skip the
 * expensive freeze-time assignable-roster resolution entirely on a retry of an already-spawned
 * pool, rather than resolving the whole O(M) roster only to have `spawnChildPool` immediately
 * discard it via its own no-op fast path). A `false` here is advisory, not authoritative — a
 * concurrent double-delivery can still race past it; `spawnChildPool`'s own check + the DB unique
 * index remain the real idempotency guard.
 */
export async function isPoolAlreadySpawned(db: Db, cycleId: string, poolIndex: number): Promise<boolean> {
  const derivedPoolId = derivePoolId(cycleId, poolIndex);
  const rows = await db.select({ poolId: pools.poolId }).from(pools).where(eq(pools.poolId, derivedPoolId));
  return rows.length > 0;
}

// ── The spawn-index conflict detector — Task 1 ────────────────────────────────

/** The UNIQUE index (migration 0074) that keys spawn idempotency on
 *  (pariwar_id, cycle_id, pool_index). Keep IN SYNC with schema/pools.ts. */
export const POOL_SPAWN_INDEX_CONSTRAINT = 'pools_pariwar_cycle_pool_index_uq';

/** True iff `err` is the `pools_pariwar_cycle_pool_index_uq` unique-violation — a second child
 *  attempting an already-spawned (cycle_id, pool_index). Mirrors isPoolCanonicalIdentifierConflict:
 *  reads the SQLSTATE + constraint off `err.cause`. The child treats it as an idempotent no-op. */
export function isPoolSpawnIndexConflict(err: unknown): boolean {
  if (!(err instanceof Error)) return false;
  const causeRaw = (err as { cause?: unknown }).cause;
  const candidate = causeRaw !== undefined && causeRaw !== null ? causeRaw : err;
  if (typeof candidate !== 'object' || candidate === null) return false;
  const obj = candidate as { code?: unknown; constraint?: unknown };
  return obj.code === '23505' && obj.constraint === POOL_SPAWN_INDEX_CONSTRAINT;
}

// ── The member-assignment seam (Story 7.4 fills it) ───────────────────────────

/** The deterministic inputs a member-assignment algorithm keys on. `memberSet` is the
 *  freeze-time assignable member roster (member ids) the algorithm hashes into pools. Story 7.4
 *  fills the real seam (assign.ts `createPoolAssignmentSeam`); supplying a LIVE roster here is the
 *  deferred Story 7.4 follow-up (see the D2 note at the `spawnChildPool` call), so today the caller
 *  still passes `[]` — on which the real seam and `emptyAssignmentSeam` both return `[]`. */
export interface PoolAssignmentSeamInput {
  readonly cycleId: string;
  readonly poolIndex: number;
  readonly poolCount: number;
  readonly memberSet: readonly string[];
}

/**
 * The injected member-assignment seam. Story 7.4 fills the real deterministic
 * `hash(member_id + cycle_id) % N` algorithm + balancing pass behind this type
 * (assign.ts `createPoolAssignmentSeam`, wired into apps/jobs boot). The seam MUST be
 * pure/deterministic (no clock, no randomness) so the child stays re-runnable to the identical
 * snapshot. The snapshot serializer already accepts an empty assignment list, so an empty roster is
 * a clean no-op on either seam.
 */
export type PoolAssignmentSeam = (
  input: PoolAssignmentSeamInput,
) => readonly PoolSnapshotMemberAssignment[];

/** The no-op fallback seam — no member assignments. Retained as the default when no seam is
 *  injected (and for tests); production injects the real `createPoolAssignmentSeam` (Story 7.4). */
export const emptyAssignmentSeam: PoolAssignmentSeam = () => [];

// ── freeze-month derivation (clock-free; replay-stable) ───────────────────────

// IST is UTC+5:30 with no DST. The canonical identifier `P-YYYY-MM-###` is a member/regulator-
// facing key, so its month must match the Indian calendar month of the freeze — computed by
// shifting the stored UTC instant into IST, then reading the calendar fields. Deterministic +
// replay-stable (a fixed offset, no `new Date()` for "now").
const IST_OFFSET_MS = (5 * 60 + 30) * 60 * 1000;

/** Derive the `{ year, month }` (IST) a cycle-freeze commit belongs to, from its stored
 *  `committed_at`. The naming allocator never reads the clock — this is the sanctioned source. */
export function deriveFreezeMonth(committedAt: Date): { year: number; month: number } {
  const ist = new Date(committedAt.getTime() + IST_OFFSET_MS);
  return { year: ist.getUTCFullYear(), month: ist.getUTCMonth() + 1 };
}

// ── The parent planner — Task 3 ───────────────────────────────────────────────

/** One frozen claim in the committed set (the parent allocates one pool per entry, in order). */
export interface FrozenClaimEntry {
  readonly claimCaseId: string;
}

export interface PlanCycleSpawnInput {
  readonly pariwarId: PariwarId;
  /** The cycle boundary == cycle_freeze_commits.commit_id (there is no `cycles` table). */
  readonly cycleId: CycleFreezeCommitId;
  /** The committed claim set — ORDERED; index i becomes the pool at pool_index i. */
  readonly frozenClaims: readonly FrozenClaimEntry[];
  /** v1 defaults to the sole enum category. */
  readonly supportCategory?: PoolSupportCategory;
  /** v1 defaults to 'pool'. */
  readonly benefitMechanism?: PoolBenefitMechanism;
}

/**
 * The per-child spawn plan the parent hands each child job. FULLY JSON-serializable (it rides a
 * pg-boss job payload AND the keyed-store idempotency result), so it carries NO functions — the
 * assignment seam is injected into the child worker separately.
 */
export interface ChildSpawnSpec {
  readonly cycleId: string;
  readonly pariwarId: string;
  readonly poolIndex: number;
  readonly poolId: string;
  readonly claimCaseId: string;
  readonly poolCanonicalIdentifier: string;
  readonly supportCategory: PoolSupportCategory;
  readonly benefitMechanism: PoolBenefitMechanism;
  readonly fixedAmount: number;
  /** N — the cycle's total pool count, so the child can detect `count == N` and finalize. */
  readonly poolCount: number;
}

export interface PlanCycleSpawnResult {
  readonly children: ChildSpawnSpec[];
  /** The reserved display names (position-ordered), or `[]` when the Pariwar opted out (letter
   *  codes). Not consumed by the v1 pool.spawned payload; carried for a future name-display seam. */
  readonly names: PoolNameReservation[];
}

/**
 * Plan the cycle spawn (the parent job's domain half). Runs on the CALLER's transaction (never
 * opens its own — the pool/project.ts + naming.ts discipline): in ONE tx it reserves N names,
 * allocates the contiguous canonical-identifier range, and derives the N deterministic pool ids
 * → the child specs. The freeze month is sourced from the durable cycle_freeze_commits record
 * (never the clock) so a replay reproduces identical identifiers.
 *
 * The counter bump inside `allocateCanonicalIdentifierRange` is the one NON-idempotent step, so
 * the WORKER wraps this call in the run-once keyed store (a parent retry must reuse the same
 * identifiers, not re-bump the counter) — see apps/jobs/src/cycle-spawn.ts.
 *
 * @throws PoolNameListExhaustedError  when the Pariwar HAS a name list too short for N (a trustee
 *         config gap — surfaced, not silently degraded). An EMPTY list (`[]`) is the opt-out, NOT
 *         an error (TWT-Bihar → letter codes).
 * @throws Error when the cycle-freeze commit record is missing, or N is out of [1, MAX].
 */
export async function planCycleSpawn(
  tx: Db,
  input: PlanCycleSpawnInput,
): Promise<PlanCycleSpawnResult> {
  const n = input.frozenClaims.length;
  if (!Number.isInteger(n) || n < 1 || n > MAX_CYCLE_SPAWN_POOLS) {
    throw new Error(
      `[planCycleSpawn] frozenClaims count must be in [1, ${String(MAX_CYCLE_SPAWN_POOLS)}], got ${String(n)}`,
    );
  }
  const uniqueClaimIds = new Set(input.frozenClaims.map((c) => c.claimCaseId));
  if (uniqueClaimIds.size !== n) {
    throw new Error(
      `[planCycleSpawn] frozenClaims contains a duplicate claimCaseId (n=${String(n)}, unique=${String(uniqueClaimIds.size)}) — refusing to spawn two pools against the same claim`,
    );
  }

  // Source the freeze month from the durable commit record — the allocator never reads the clock.
  const commitRows = await tx
    .select({ committedAt: cycleFreezeCommits.committedAt })
    .from(cycleFreezeCommits)
    .where(eq(cycleFreezeCommits.commitId, input.cycleId));
  const commit = commitRows[0];
  if (!commit) {
    throw new Error(
      `[planCycleSpawn] cycle_freeze_commits row not found for cycle ${input.cycleId} (missing scope or unknown commit)`,
    );
  }
  const freezeMonth = deriveFreezeMonth(commit.committedAt);

  // Story 7.5 (D2): resolve the fixed amount effective AT the cycle-freeze `committed_at` — the same
  // durable instant the name/identifier allocation uses, NEVER the clock. Doing it here (in-tx, from
  // that same instant) is atomic + replay-safe: a parent retry re-reads the same `committed_at`, and
  // schedule rows are immutable historical, so the resolved amount is byte-identical on retry. This
  // is the CONSUMER wiring that retires the boot-time POOL_SPAWN_FIXED_AMOUNT_INR env constant.
  // Fails loud (PoolFixedAmountNotConfiguredError) if the Pariwar has no effective amount — a P0
  // trustee-config gap, never a silent default (the PoolNameListExhaustedError philosophy).
  const fixedAmount = await getEffectiveFixedAmount(tx, input.pariwarId, commit.committedAt);
  // Post-lookup invariant (the schedule's DB CHECK already guarantees this; belt-and-suspenders).
  if (!Number.isInteger(fixedAmount) || fixedAmount <= 0) {
    throw new Error(
      `[planCycleSpawn] resolved fixedAmount must be a positive integer, got ${String(fixedAmount)}`,
    );
  }

  // Reserve N display names (opt-out `[]` vs exhaustion throw — the caller decides fallback).
  const names = await reserveNames(tx, { pariwarId: input.pariwarId, count: n });

  // Allocate N contiguous canonical identifiers in the SAME tx (the one counter-bump).
  const identifiers = await allocateCanonicalIdentifierRange(tx, {
    pariwarId: input.pariwarId,
    freezeMonth,
    count: n,
  });

  const supportCategory = input.supportCategory ?? V1_SPAWN_SUPPORT_CATEGORY;
  const benefitMechanism = input.benefitMechanism ?? V1_SPAWN_BENEFIT_MECHANISM;

  const children: ChildSpawnSpec[] = input.frozenClaims.map((claim, i) => ({
    cycleId: input.cycleId,
    pariwarId: input.pariwarId,
    poolIndex: i,
    poolId: derivePoolId(input.cycleId, i),
    claimCaseId: claim.claimCaseId,
    poolCanonicalIdentifier: identifiers[i]!,
    supportCategory,
    benefitMechanism,
    fixedAmount,
    poolCount: n,
  }));

  return { children, names };
}

// ── freeze-instant read for the assignable-roster resolver (AI-7-2) ───────────

/**
 * Read a cycle-freeze commit's `committed_at` — the ONE durable instant the assignable-roster resolver
 * (apps/jobs) evaluates member validity at, so the roster is a deterministic function of the frozen
 * cycle, never `now()` (§1.11 DB-authoritative time; Story 7.4 D1). Returns `null` when the commit row
 * is absent (missing scope or unknown cycle) so the caller can fail loud with its own context. Reads the
 * durable `cycle_freeze_commits` record — the SAME instant `planCycleSpawn` sources the freeze month +
 * fixed amount from, so a re-spawn re-reads the identical value. RLS-scoped by the caller.
 */
export async function getCycleFreezeCommittedAt(db: Db, cycleId: string): Promise<Date | null> {
  const rows = await db
    .select({ committedAt: cycleFreezeCommits.committedAt })
    .from(cycleFreezeCommits)
    .where(eq(cycleFreezeCommits.commitId, cycleFreezeCommitId(cycleId)))
    .limit(1);
  return rows[0]?.committedAt ?? null;
}

// ── The child spawner — Task 4 (tx1) ──────────────────────────────────────────

export interface SpawnChildPoolResult {
  readonly poolId: string;
  readonly poolCanonicalIdentifier: string;
  /** `false` on the idempotent no-op path (the pool was already spawned by a prior run). */
  readonly spawned: boolean;
}

/**
 * Spawn ONE pool (the child job's domain half). Runs on the caller's transaction (the worker
 * opens BEGIN + setPariwarScope on a raw client). In that one tx it: derives the deterministic
 * pool_id, checks the idempotency guard, projects the `pool.spawned` event (the ONLY sanctioned
 * `pools.current_state` writer), and persists the spawn snapshot into the hot `pool_snapshots`
 * row. A retry for an already-spawned (cycle_id, pool_index) is a clean no-op.
 *
 * Idempotency is layered: (1) a fast-path existence check on the deterministic pool_id, then
 * (2) the DB backstops — the events_log `(stream_id, event_version)` unique index and the pools
 * `(pariwar_id, cycle_id, pool_index)` unique index — either of which resolves a concurrent
 * double-delivery to a no-op.
 *
 * `memberSet` is the FREEZE-TIME assignable-member roster (AI-7-2), resolved by the apps/jobs
 * assignable-roster query (validity-verdict-filtered at the cycle-freeze `committed_at`) and threaded in
 * by `runCycleSpawnChild`. It feeds BOTH the assignment seam (member→pool placement) AND the
 * `member_state_hash` roster fingerprint. It defaults to `[]` so the domain's own spawn-mechanics tests
 * can call this without a roster; production always supplies the resolved (possibly-empty) set.
 *
 * `rosterWired` records whether `memberSet` actually came from a real, live assignable-roster query
 * (threaded straight from `runCycleSpawnChild`'s `deps.resolveAssignableRoster` presence — NOT inferred
 * from `memberSet` being non-empty, since a genuine query can legitimately resolve to an empty roster).
 * It becomes the persisted `assignment_roster_wired` flag (AC5's audit-provenance marker). Defaults to
 * `false` so callers that omit it (domain unit/integration tests, or a future regression that silently
 * drops the production wiring) get an honest "not wired" audit trail instead of a hardcoded claim.
 */
export async function spawnChildPool(
  client: pg.PoolClient,
  spec: ChildSpawnSpec,
  assignmentSeam: PoolAssignmentSeam = emptyAssignmentSeam,
  memberSet: readonly string[] = [],
  rosterWired = false,
): Promise<SpawnChildPoolResult> {
  // Derive the pool_id from the deterministic inputs (child independence) — do NOT trust a
  // payload-supplied id; if one was supplied, it must match.
  const derivedPoolId = derivePoolId(spec.cycleId, spec.poolIndex);
  if (spec.poolId && spec.poolId !== derivedPoolId) {
    throw new Error(
      `[spawnChildPool] spec.poolId ${spec.poolId} disagrees with the derived id ${derivedPoolId} for ${spec.cycleId}:${String(spec.poolIndex)}`,
    );
  }

  const brandedPariwarId = toPariwarId(spec.pariwarId);
  const brandedCycleId = cycleFreezeCommitId(spec.cycleId);
  const brandedClaimId = claimId(spec.claimCaseId);
  const db = bindScopedDb(client);

  // (1) Fast-path idempotency: the pool row already exists → no-op.
  if (await isPoolAlreadySpawned(db, spec.cycleId, spec.poolIndex)) {
    return { poolId: derivedPoolId, poolCanonicalIdentifier: spec.poolCanonicalIdentifier, spawned: false };
  }

  // AI-7-2 (as amended by Story 10.17): the LIVE freeze-time assignable-roster is supplied by the
  // caller (the apps/jobs resolver evaluates each Pariwar member against the Story 4.6 Validity
  // Service at the cycle-freeze `committed_at` and keeps `is_assignable` members — NOT `is_valid`,
  // which is the COVERAGE answer; a SUSPENDED member is deliberately on this roster while remaining
  // uncovered). The real seam (Story 7.4) hashes THIS roster into
  // pools; `member_state_hash` below fingerprints it. An empty `memberSet` (no assignable members, or a
  // domain unit test) is a clean no-op on either seam — `rosterWired` (not memberSet-emptiness) is what
  // records whether this was a genuine query vs. an unwired/defaulted call.
  const memberAssignments = assignmentSeam({
    cycleId: spec.cycleId,
    poolIndex: spec.poolIndex,
    poolCount: spec.poolCount,
    memberSet,
  });

  const payload = {
    from_state: null,
    to_state: 'spawned',
    trigger: 'cycle_freeze_commit:spawn',
    actor: 'system',
    support_category: spec.supportCategory,
    benefit_mechanism: spec.benefitMechanism,
    fixed_amount: spec.fixedAmount,
    pool_index: spec.poolIndex,
    cycle_id: spec.cycleId,
    pool_canonical_identifier: spec.poolCanonicalIdentifier,
    // AC5 audit reproducibility — the frozen-roster fingerprint + the whole-algorithm version pin.
    member_state_hash: computeAssignableRosterHash(memberSet),
    assignment_hash_version: POOL_ASSIGNMENT_HASH_VERSION,
    // Reflects the CALLER's `rosterWired` claim, not memberSet-emptiness (AI-7-2 review finding: a
    // hardcoded `true` here would silently misreport "genuinely queried, none assignable" if the
    // production `resolveAssignableRoster` wiring in boot.ts ever regressed to the default-omitted
    // path). `runCycleSpawnChild` passes `true` only when `deps.resolveAssignableRoster` was actually
    // supplied — so this flag keeps meaning exactly what AC5 needs it to: "was a real roster query used
    // for this event," distinguishing both the historical pre-AI-7-2 events (`false`) AND any future
    // wiring regression from a genuine "queried, none assignable" outcome.
    assignment_roster_wired: rosterWired,
  };

  let eventVersion: number;
  try {
    const result = await projectPoolState(client, {
      poolId: derivedPoolId,
      pariwarId: brandedPariwarId,
      cycleId: brandedCycleId,
      claimCaseId: brandedClaimId,
      poolIndex: spec.poolIndex,
      poolCanonicalIdentifier: spec.poolCanonicalIdentifier,
      supportCategory: spec.supportCategory,
      benefitMechanism: spec.benefitMechanism,
      fixedAmount: spec.fixedAmount,
      eventType: 'pool.spawned',
      payload,
      actorId: null,
    });
    eventVersion = result.eventVersion;
  } catch (err) {
    // A concurrent double-delivery lands here: the deterministic-stream version race
    // (isPoolStreamVersionConflict) or the (cycle_id, pool_index) unique race
    // (isPoolSpawnIndexConflict). Either means another run already spawned this pool → no-op.
    if (isPoolStreamVersionConflict(err) || isPoolSpawnIndexConflict(err)) {
      return { poolId: derivedPoolId, poolCanonicalIdentifier: spec.poolCanonicalIdentifier, spawned: false };
    }
    throw err;
  }

  // Persist the spawn snapshot into the hot tier (append table — no state-writer guard).
  const snapshot = serializePoolSnapshot({
    poolId: derivedPoolId,
    pariwarId: spec.pariwarId,
    cycleId: spec.cycleId,
    poolIndex: spec.poolIndex,
    supportCategory: spec.supportCategory,
    benefitMechanism: spec.benefitMechanism,
    fixedAmount: spec.fixedAmount,
    currentState: 'spawned',
    memberAssignments,
  });
  await db.insert(poolSnapshots).values({
    poolId: derivedPoolId,
    pariwarId: brandedPariwarId,
    formatVersion: snapshot.format_version,
    schemaVersion: snapshot.schema_version,
    integrityHash: snapshot.integrity_hash,
    stateEventVersion: eventVersion,
    snapshot,
  });

  // ── Story 10.24 (D3): project the freeze-time assignments alongside the snapshot ──────────────
  //
  // Written from the SAME `memberAssignments` value the snapshot just serialized — never a second
  // derivation, never a recompute of `assignMembersToPools` (AC4). On the CALLER's transaction, so the
  // projection commits or rolls back WITH the snapshot it mirrors (the atomicity half of the D3
  // observational-equivalence contract), and ONE bulk insert for the whole roster, never a per-member
  // statement inside Story 7.9's <60s spawn envelope (AC7).
  //
  // This is the EXPLICIT-WRITER half of the deliberate two-mechanism split: its sibling
  // `member_contribution_ledger` is trigger-maintained (migration 0093). A trigger on `pool_snapshots`
  // would expand a JSONB array of up to 4L/N member ids inside this transaction, un-instrumented — the
  // reason the mechanisms differ. What must NOT differ is the projected state, which is why both are
  // held to atomicity · idempotency · replay equivalence · ordering-independence by ONE shared test.
  //
  // `committed_at` (NOT the spawn wall-clock) is the assignment instant: it is the durable, re-readable
  // value a re-spawn resolves identically, which is what keeps the current-year window replay-correct.
  const committedAt = await getCycleFreezeCommittedAt(db, spec.cycleId);
  if (committedAt === null) {
    throw new Error(
      `[spawnChildPool] cycle_freeze_commits row missing for ${spec.cycleId} — cannot project member assignments`,
    );
  }
  await insertMemberPoolAssignments(db, {
    pariwarId: brandedPariwarId,
    poolId: poolId(derivedPoolId),
    cycleId: brandedCycleId,
    assignedAt: committedAt,
    memberIds: memberAssignments.map((a) => a.member_id),
  });

  return { poolId: derivedPoolId, poolCanonicalIdentifier: spec.poolCanonicalIdentifier, spawned: true };
}

// ── The last-child finalizer — Task 4 (tx2) ───────────────────────────────────

export interface FinalizeCycleInput {
  readonly pariwarId: PariwarId;
  readonly cycleId: CycleFreezeCommitId;
  /** N — the cycle's expected pool count. */
  readonly poolCount: number;
}

export interface FinalizeCycleResult {
  /** `true` iff THIS call emitted `cycle.frozen`. */
  readonly frozen: boolean;
  /** `true` iff the cycle was already frozen (a prior/concurrent finalizer won). */
  readonly alreadyFrozen: boolean;
  /** The committed pool count observed under the finalize lock. */
  readonly committedCount: number;
}

/**
 * If this child was the LAST to commit its pool, emit `cycle.frozen` (exactly once). Runs on the
 * caller's transaction (a SECOND short tx opened by the worker AFTER the child's spawn tx
 * committed — so the count sees this child's own committed pool plus every sibling committed so
 * far). Takes a cycle-scoped advisory lock so the count-and-append is atomic across racing
 * children; the events_log version unique index is the final backstop.
 */
export async function finalizeCycleIfComplete(
  client: pg.PoolClient,
  input: FinalizeCycleInput,
): Promise<FinalizeCycleResult> {
  const db = bindScopedDb(client);

  // Serialize the finalize check across children (tx-scoped — auto-released at commit/rollback).
  await client.query('SELECT pg_advisory_xact_lock(hashtext($1))', [`cycle.spawn.finalize:${input.cycleId}`]);

  // Already frozen? (a prior finalizer won) → no-op.
  if (await cycleIsFrozen(db, input.cycleId)) {
    return { frozen: false, alreadyFrozen: true, committedCount: input.poolCount };
  }

  // Read the committed pools for the cycle (ordered) — both the count AND the payload material.
  const rows = await db
    .select({ poolId: pools.poolId, ident: pools.poolCanonicalIdentifier })
    .from(pools)
    .where(eq(pools.cycleId, input.cycleId))
    .orderBy(asc(pools.poolIndex));

  if (rows.length < input.poolCount) {
    return { frozen: false, alreadyFrozen: false, committedCount: rows.length };
  }
  if (rows.length > input.poolCount) {
    // More committed pools than this cycle should ever have — an integrity violation (e.g. a
    // stale/incorrect poolCount reaching this call), not a version race. Fail loudly here rather
    // than letting the CycleFrozenPayloadSchema mismatch below throw an unrelated ZodError.
    throw new Error(
      `[finalizeCycleIfComplete] committed pool count ${String(rows.length)} exceeds expected poolCount ${String(input.poolCount)} for cycle ${input.cycleId}`,
    );
  }

  // All N committed → assemble + append the atomic commit-point event. Attestation comes from the
  // durable freeze-commit record (WHO committed the freeze); the saga itself is a system actor.
  const commitRows = await db
    .select({
      actorId: cycleFreezeCommits.actorId,
      actorDisplay: cycleFreezeCommits.actorDisplay,
      committedAt: cycleFreezeCommits.committedAt,
    })
    .from(cycleFreezeCommits)
    .where(eq(cycleFreezeCommits.commitId, input.cycleId));
  const commit = commitRows[0];
  if (!commit) {
    throw new Error(`[finalizeCycleIfComplete] cycle_freeze_commits row not found for cycle ${input.cycleId}`);
  }

  const payload = CycleFrozenPayloadSchema.parse({
    cycle_id: input.cycleId,
    pariwar_id: input.pariwarId,
    pool_count: input.poolCount,
    pool_ids: rows.map((r) => r.poolId),
    pool_canonical_identifiers: rows.map((r) => r.ident),
    attestation: {
      actor_id: commit.actorId,
      actor_display: commit.actorDisplay,
      committed_at: commit.committedAt.toISOString(),
    },
  });

  try {
    await appendCycleEvent(db, {
      cycleId: input.cycleId,
      pariwarId: input.pariwarId,
      eventType: 'cycle.frozen',
      payload,
    });
  } catch (err) {
    // A racing finalizer beat us to the version slot (defense-in-depth beneath the advisory lock).
    if (isPoolStreamVersionConflict(err) || (err instanceof PoolStreamConcurrencyError)) {
      return { frozen: false, alreadyFrozen: true, committedCount: rows.length };
    }
    throw err;
  }

  return { frozen: true, alreadyFrozen: false, committedCount: rows.length };
}

// ── cycle.spawn.aborted — the retryable diagnostic breadcrumb (AC4) ───────────

/**
 * Append a `cycle.spawn.aborted` breadcrumb (RETRYABLE, never terminal — see cycle-events.ts).
 * Best-effort: a cycle stream may carry many aborted events followed by a successful
 * `cycle.frozen`. Runs on the caller's transaction. Retries a stream-version race a bounded few
 * times, then gives up (the breadcrumb is diagnostic, not load-bearing).
 */
export async function appendCycleAborted(
  client: pg.PoolClient,
  input: { pariwarId: PariwarId; cycleId: CycleFreezeCommitId; reason: string },
): Promise<void> {
  const db = bindScopedDb(client);
  const payload = { cycle_id: input.cycleId, pariwar_id: input.pariwarId, reason: input.reason };
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      await appendCycleEvent(db, {
        cycleId: input.cycleId,
        pariwarId: input.pariwarId,
        eventType: 'cycle.spawn.aborted',
        payload,
      });
      return;
    } catch (err) {
      if (isPoolStreamVersionConflict(err) || err instanceof PoolStreamConcurrencyError) continue;
      throw err;
    }
  }
  // Exhausted all 3 attempts under sustained version-conflict contention. The breadcrumb is
  // diagnostic, not load-bearing (never rethrown into a retry-blocking path elsewhere), but a
  // silently-dropped breadcrumb is worse than a loud one — throw so the caller's alarm sink logs
  // it (apps/jobs/src/cycle-spawn.ts already catches + alarms this call).
  throw new Error(
    `[appendCycleAborted] gave up after 3 stream-version conflicts for cycle ${input.cycleId} — breadcrumb dropped`,
  );
}

// ── cycle.spawn.started — the durable parent-job-started marker (AC4) ─────────

/**
 * Append `cycle.spawn.started` — call this in the SAME transaction as a freshly-computed
 * `planCycleSpawn` result (never on the idempotent-replay path), so a parent retry after a
 * planning failure (never durable — see runCycleSpawnParent) cannot duplicate it.
 */
export async function appendCycleSpawnStarted(
  db: Db,
  input: { pariwarId: PariwarId; cycleId: CycleFreezeCommitId; poolCount: number },
): Promise<void> {
  await appendCycleEvent(db, {
    cycleId: input.cycleId,
    pariwarId: input.pariwarId,
    eventType: 'cycle.spawn.started',
    payload: { cycle_id: input.cycleId, pariwar_id: input.pariwarId, pool_count: input.poolCount },
  });
}

// ── cycle-stream append + read helpers ────────────────────────────────────────

/** True iff the cycle stream already carries a `cycle.frozen` event. */
async function cycleIsFrozen(db: Db, cycleId: string): Promise<boolean> {
  const rows = await db
    .select({ id: eventsLog.eventId })
    .from(eventsLog)
    .where(and(eq(eventsLog.streamId, cycleId), eq(eventsLog.eventType, 'cycle.frozen')));
  return rows.length > 0;
}

/**
 * Append a `cycle.*` event on the cycle stream (stream_id = cycle_id) at head_version + 1,
 * validating the payload against its strict schema first. Mirrors projectPoolState's
 * optimistic-concurrency contract (the events_log `(stream_id, event_version)` unique index is
 * the backstop → PoolStreamConcurrencyError on a race). Domain inserts into events_log directly
 * (it owns the table); @twt/events would cycle.
 */
async function appendCycleEvent(
  db: Db,
  input: { cycleId: string; pariwarId: string; eventType: CycleEventType; payload: unknown },
): Promise<{ eventVersion: number }> {
  CYCLE_EVENT_PAYLOAD_SCHEMAS[input.eventType].parse(input.payload);

  const existing = await db
    .select({ v: eventsLog.eventVersion })
    .from(eventsLog)
    .where(eq(eventsLog.streamId, input.cycleId))
    .orderBy(asc(eventsLog.eventVersion));
  const nextVersion = (existing.at(-1)?.v ?? 0) + 1;

  try {
    await db.insert(eventsLog).values({
      streamId: input.cycleId,
      eventType: input.eventType,
      payload: input.payload,
      eventVersion: nextVersion,
      actorId: null,
      pariwarId: input.pariwarId,
    });
  } catch (err) {
    if (isPoolStreamVersionConflict(err)) throw new PoolStreamConcurrencyError(input.cycleId, nextVersion);
    throw err;
  }
  return { eventVersion: nextVersion };
}
