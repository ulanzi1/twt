// Deterministic member-to-pool assignment — Story 7.4 (Tasks 1/2/3; AC1/AC3/AC5).
//
// THE math heart of PRD §9.1 + FR-14 + AR-57. Fills the `PoolAssignmentSeam` that Story 7.3
// deliberately left injected (`emptyAssignmentSeam → []`). A wrong or non-reproducible
// assignment is a P0 — it silently misroutes real money (Story 7.6 resolves a member's VPA
// from THIS assignment; Epic 9 reconciliation matches deposits against it). So the whole
// algorithm is version-pinned + property-tested + frozen-vector-pinned.
//
// ── THE version pin is the most important API in this module (D0) ─────────────
// `POOL_ASSIGNMENT_HASH_VERSION` keeps the `_HASH_` name for compatibility with the seam
// author's naming, but read it as `POOL_ASSIGNMENT_ALGORITHM_VERSION`: it is a SCHEMA-GRADE
// version for the ENTIRE assignment contract, gating ALL of
//   { hash function, truncation width, preimage delimiter/encoding, THE BALANCING RULE }.
// The balancing pass is part of replay identity exactly as much as SHA-256 is — a "better"
// redistribution rule shipped silently would re-route real members' contributions for an
// already-frozen roster. ANY change to any of the four bumps `'v1' → 'v2'` DELIBERATELY, and
// the frozen full-population post-balancing vector (assign.test.ts) is the enforcement.
//
// ── Balancing breaks single-member roster-independence — expected + correct (D1) ─
// Pure `hash(member_id + cycle_id) % N` makes a member's BASE bucket reproducible from
// `(member_id, cycle_id)` alone, but only balances in EXPECTATION (sizes can differ by > 1).
// The balancing pass guarantees ≤ 1 — but a redistributed member's FINAL pool now depends on
// the whole frozen roster. Reproducibility is therefore defined relative to
// `(cycle_id, member-state-at-freeze, N)` + the version pin, NOT `member_id` in isolation. The
// PERSISTED snapshot (`pool_snapshots.member_assignments`) is the source of truth Story 7.6
// reads for VPA resolution — never a naive recompute. `computeAssignableRosterHash` fingerprints
// the frozen roster so an auditor can re-derive the exact assignment (AC5).
//
// ── This module encodes NO member-state policy (D4) ───────────────────────────
// The assignable set is sourced PURELY from Story 4.6 Validity Service verdicts at freeze — the
// engine consumes verdicts, never derives them (the niyamavali-engine discipline). No member-
// state allow/deny list is embedded here; `assignMembersToPools` is verdict-blind and just hashes
// whatever member-id set it is handed. The roster query (the deferred Story 7.4 follow-up, see the
// spawn.ts / boot.ts wiring notes) is what filters by verdict.
//
// ── Purity contract ───────────────────────────────────────────────────────────
// Every export here is a PURE, deterministic function of its inputs (no clock, no randomness, no
// DB) — this is what makes the child spawner re-runnable to an identical snapshot and the whole
// algorithm replay-stable.

import { createHash } from 'node:crypto';

import { canonicalJsonStringify } from '../canonical-json.js';
import { PoolAssignmentBalancingError } from './errors.js';
import { MAX_CYCLE_SPAWN_POOLS } from './spawn.js';
import type { PoolAssignmentSeam } from './spawn.js';
import type { PoolSnapshotMemberAssignment } from './snapshot.js';

/**
 * The WHOLE-ALGORITHM replay-identity version (read as `POOL_ASSIGNMENT_ALGORITHM_VERSION`).
 * Gates { hash fn, truncation width, preimage delimiter/encoding, balancing rule }. A change to
 * ANY of those is a replay-identity break and MUST bump this constant (see the D0 header). The
 * frozen reference vectors in assign.test.ts pin it — a bump is never silent.
 */
export const POOL_ASSIGNMENT_HASH_VERSION = 'v1' as const;

/**
 * The pinned preimage delimiter between `member_id` and `cycle_id`. Part of the version pin (the
 * D0 four-tuple). UUIDs are fixed-width so ambiguity is already low, but the explicit delimiter is
 * cheap insurance and self-documents the FR-14 `member_id + cycle_id` intent.
 */
const PREIMAGE_DELIMITER = ':';

/**
 * The pinned truncation width, in bytes, of the SHA-256 digest read as the bucket source. The
 * first 8 bytes are interpreted as a big-endian uint64 before the `% n` fold. Part of the version
 * pin — widening/narrowing this changes every bucket. 8 bytes (64 bits) is ample entropy for the
 * modulus fold at any realistic `n` (bounded by MAX_CYCLE_SPAWN_POOLS).
 */
const HASH_TRUNCATION_BYTES = 8;

/** Guard: `n` must be a positive integer in `[1, MAX_CYCLE_SPAWN_POOLS]` (the naming-allocator cap
 *  mirrored on spawn.ts). Throws on a degenerate / out-of-range pool count. */
function assertPoolCount(n: number): void {
  if (!Number.isInteger(n) || n < 1 || n > MAX_CYCLE_SPAWN_POOLS) {
    throw new Error(
      `[assign] pool count n must be an integer in [1, ${String(MAX_CYCLE_SPAWN_POOLS)}], got ${String(n)}`,
    );
  }
}

/** Canonicalize a member-id SET: de-duplicate + ascending sort. Shared by
 *  {@link assignMembersToPools} (processing order) and {@link computeAssignableRosterHash}
 *  (fingerprint input) so the two never drift out of sync on what "canonical" means. */
function canonicalizeMemberIds(memberSet: readonly string[]): string[] {
  return [...new Set(memberSet)].sort();
}

/**
 * The BASE bucket for `(member_id, cycle_id)` at pool-count `n` — the pure FR-14
 * `pool_index = hash(member_id + cycle_id) % N`, BEFORE any balancing.
 *
 * `hash` = SHA-256 over the delimited preimage `` `${memberId}:${cycleId}` `` (the node:crypto
 * pattern in snapshot.ts / names.ts), truncated to the first {@link HASH_TRUNCATION_BYTES} bytes
 * read as a big-endian uint64, folded `% n`. Pure + deterministic (property #4a) and byte-stable
 * across releases at the version pin (property #4c). This is the value reproducible from
 * `(member_id, cycle_id)` ALONE — the balancing pass (see {@link assignMembersToPools}) may move a
 * member OFF this base bucket, which is expected + correct (the D1 contract).
 */
export function hashMemberToBucket(memberId: string, cycleId: string, n: number): number {
  assertPoolCount(n);
  const preimage = `${memberId}${PREIMAGE_DELIMITER}${cycleId}`;
  const digest = createHash('sha256').update(preimage, 'utf8').digest();
  // Slice to the pinned truncation width, then read it as a big-endian uint64 → `% n`. BigInt
  // keeps the modulus exact (a Number would lose precision above 2^53). `readBigUInt64BE` requires
  // exactly an 8-byte buffer, so `HASH_TRUNCATION_BYTES` is pinned at 8 — changing it is a code
  // change, not just a constant edit, and is caught immediately by the frozen vectors.
  const truncated = digest.subarray(0, HASH_TRUNCATION_BYTES).readBigUInt64BE(0);
  return Number(truncated % BigInt(n));
}

/**
 * Assign an assignable member SET deterministically + BALANCED (≤1) across `n` pools.
 *
 * Returns a `Map<member_id, pool_index>`. A total, pure function of `(memberSet, cycleId, n)`:
 *   1. Canonicalize the input to a de-duplicated, ascending-`member_id`-sorted list — the input is
 *      a SET, so duplicates collapse and processing order is canonical (replay-stable regardless of
 *      caller order).
 *   2. Compute per-bucket CAPACITIES that sum to exactly `M`: with `floor = ⌊M/n⌋` and
 *      `r = M mod n`, the FIRST `r` buckets (by ascending `pool_index`) get capacity `floor + 1`
 *      and the rest get `floor`. Because the capacities sum to `M`, greedy placement fills every
 *      bucket to EXACTLY its capacity → final sizes are all `floor` or `floor + 1` → `max - min ≤ 1`
 *      is GUARANTEED for ANY set (property #4b), never merely in expectation.
 *   3. Place each member (in canonical order) at its BASE bucket ({@link hashMemberToBucket}); if
 *      that bucket is already at capacity, scan ASCENDING by `pool_index` (WRAPPING) to the first
 *      bucket with remaining capacity. A slot always exists (Σcapacity == M).
 *
 * ── THE BALANCING RULE IS PINNED REPLAY IDENTITY ──────────────────────────────
 * The { first-`r`-buckets-get-the-+1, ascending-wrapping overflow probe } rule above is a versioned
 * contract, NOT an implementation detail. Changing HOW overflow is redistributed changes real
 * members' pools for the same roster → it MUST bump {@link POOL_ASSIGNMENT_HASH_VERSION} and is
 * caught by the frozen full-population vector. Never "improve" it silently.
 *
 * Note the naive "cap every bucket at ⌈M/n⌉" rule does NOT guarantee ≤1 (it can strand a bucket
 * two below another); the fixed-capacity-summing-to-M scheme is what makes the bound total.
 */
export function assignMembersToPools(
  memberSet: readonly string[],
  cycleId: string,
  n: number,
): ReadonlyMap<string, number> {
  assertPoolCount(n);

  // (1) Canonical order — de-dupe (it is a SET) + ascending member_id sort. Deterministic default
  //     string comparison (UTF-16 code-unit order), the same order the snapshot serializer expects.
  const members = canonicalizeMemberIds(memberSet);
  const m = members.length;

  const assignment = new Map<string, number>();
  if (m === 0) return assignment; // empty roster → empty assignment (the common (B)-scope case).

  // (2) Per-bucket capacities that sum to exactly M — the first `r` buckets carry the +1.
  const floor = Math.floor(m / n);
  const remainder = m % n;
  const capacity: number[] = Array.from({ length: n }, (_, i) => floor + (i < remainder ? 1 : 0));
  const used: number[] = Array.from({ length: n }, () => 0);

  // (3) Greedy placement at the base bucket, else ascending-wrapping overflow to the first bucket
  //     with remaining capacity. A slot always exists because Σcapacity === M.
  for (const memberId of members) {
    const base = hashMemberToBucket(memberId, cycleId, n);
    let target = base;
    for (let probe = 0; probe < n; probe++) {
      const idx = (base + probe) % n;
      if (used[idx]! < capacity[idx]!) {
        target = idx;
        break;
      }
    }
    used[target] = used[target]! + 1;
    assignment.set(memberId, target);
  }

  // Dev-time invariant (not just a test): the ≤1 balance MUST hold. A violation is a logic bug in
  // the capacity/placement math, never a caller error — fail loudly rather than persist a
  // silently-unbalanced cycle.
  const sizes = used;
  const maxSize = Math.max(...sizes);
  const minSize = Math.min(...sizes);
  if (maxSize - minSize > 1) {
    // A TYPED throw (AI-7-2) so the spawn-saga worker recognises this specific corruption and alarms on
    // it distinctly. Now reachable in the live worker (m>0) since AI-7-2 wired a real roster in.
    throw new PoolAssignmentBalancingError(m, n, maxSize, minSize);
  }

  return assignment;
}

/**
 * The roster fingerprint (`member_state_hash`) recorded in the `pool.spawned` audit trail (AC5).
 * SHA-256 over the canonical-JSON of the de-duplicated, ascending-sorted assignable member-id list,
 * using the SHARED `canonicalJsonStringify` (RFC 8785) — the SAME canonicalizer the snapshot
 * integrity hash + the @twt/events hash chain use (architecture §1.5), never a bespoke stringify.
 *
 * This is a ROSTER-SET fingerprint — distinct from `validity-cache/store.ts computeMemberStateHash`,
 * which is a PER-MEMBER state watermark. Given this fingerprint + `POOL_ASSIGNMENT_HASH_VERSION`,
 * any auditor/regulator can re-derive the exact assignment for the frozen roster.
 */
export function computeAssignableRosterHash(memberSet: readonly string[]): string {
  const canonical = canonicalizeMemberIds(memberSet);
  return createHash('sha256').update(canonicalJsonStringify(canonical), 'utf8').digest('hex');
}

/**
 * Produce the real `PoolAssignmentSeam` (Story 7.4 fills what Story 7.3 injected as
 * `emptyAssignmentSeam`). Given the full freeze-time `memberSet`, it computes the GLOBAL assignment
 * ONCE and returns the subset for `input.poolIndex`, sorted by `member_id` — the snapshot serializer
 * makes the CALLER responsible for deterministic array order (snapshot.ts:88-92), so the sort is
 * load-bearing for the snapshot integrity hash.
 *
 * The seam stays PURE (no clock, no randomness, no DB) so the child spawner remains re-runnable to
 * an identical snapshot. The O(N·M) per-child recompute (each child re-derives the whole global
 * assignment then filters) is architecture-blessed child independence (§5.11); Story 7.9 validates
 * the <60s p95 envelope.
 */
export function createPoolAssignmentSeam(): PoolAssignmentSeam {
  return (input): readonly PoolSnapshotMemberAssignment[] => {
    if (!Number.isInteger(input.poolIndex) || input.poolIndex < 0 || input.poolIndex >= input.poolCount) {
      throw new Error(
        `[createPoolAssignmentSeam] poolIndex ${String(input.poolIndex)} out of range [0, ${String(input.poolCount)})`,
      );
    }
    const global = assignMembersToPools(input.memberSet, input.cycleId, input.poolCount);
    const members: PoolSnapshotMemberAssignment[] = [];
    for (const [memberId, poolIndex] of global) {
      if (poolIndex === input.poolIndex) members.push({ member_id: memberId });
    }
    members.sort((a, b) => (a.member_id < b.member_id ? -1 : a.member_id > b.member_id ? 1 : 0));
    return members;
  };
}
