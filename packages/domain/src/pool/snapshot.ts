// Pool Engine snapshot serializer + integrity hash — Story 7.1 (Task 6; AC3).
//
// The DOMAIN half of the snapshot storage abstraction (architecture §1.6 line 909-935
// + §1.5 single canonical-JSON spec). A pool snapshot is a versioned, canonical,
// integrity-hashed capture of a pool's full state + its member assignments AT A MOMENT
// (the spawn moment for the first snapshot; population at spawn is Story 7.3, the
// assignments themselves are Story 7.4 — 7.1 commits the SHAPE + serializer + hash).
//
// ── Two independent version fields (do NOT conflate — Story 7.1 Dev Notes) ─────
//   · `format_version`  — the snapshot SHAPE version. Drives migration-adapter
//     selection (snapshot-adapters/): when the shape evolves, a new adapter reads the
//     old shape forward. Bumped only when the snapshot object's structure changes.
//   · `schema_version`  — the schema/migration-generation identifier: the drizzle
//     migration tag of the DB schema that PRODUCED the snapshot. Records provenance so
//     a replayed snapshot is traceable to its producing schema, INDEPENDENT of shape
//     evolution. Bumped when the pools DDL that feeds the snapshot changes.
//
// ── ONE canonicalizer, ONE hash (architecture §1.5 — load-bearing) ────────────
// The integrity hash uses the SAME canonicalizer as the @twt/events hash chain
// (canonical-json.ts / SHA-256) — architecture §1.5: "Pool Engine snapshot writers …
// use the same canonicalizer". We do NOT hand-roll a second canonicalizer. The hash
// covers ALL snapshot fields EXCEPT `integrity_hash` itself (a self-referential hash is
// impossible). A perturbed field changes the hash (property-tested — no vacuous constant).

import { createHash } from 'node:crypto';

import { canonicalJsonStringify } from '../canonical-json.js';
import type { PoolLifecycleState, PoolSupportCategory } from '../schema/pools.js';

// RFC 4122 UUID shape — the SAME format `PoolSnapshotV1Schema` (snapshot-adapters/
// pool-v1.ts) validates on READ. Checked here too, at WRITE time, so a malformed id
// (e.g. a non-uuid `member_id`) is rejected at serialization instead of being hashed,
// persisted, and only surfacing later as a read-time failure (the write/read asymmetry
// the Story 7.1 review flagged). Not imported from pool-v1.ts to avoid a cycle (that
// file imports FROM this one).
// Matches zod's own `.string().uuid()` regex exactly (zod/v3/types.js `uuidRegex`) —
// 8-4-4-4-12 hex groups, no version/variant nibble restriction — so a value that
// passes here is guaranteed to also pass PoolSnapshotV1Schema on read.
const UUID_PATTERN = /^[0-9a-fA-F]{8}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{12}$/i;

function assertUuid(value: string, label: string): void {
  if (!UUID_PATTERN.test(value)) {
    throw new Error(`[serializePoolSnapshot] ${label} is not a valid UUID: ${JSON.stringify(value)}`);
  }
}

/** The snapshot SHAPE version (drives migration-adapter selection). Bump on a shape change. */
export const POOL_SNAPSHOT_FORMAT_VERSION = 1 as const;

/**
 * The schema/migration-generation identifier — the drizzle migration tag of the DB
 * schema that produced the snapshot (the pools DDL generation). Distinct from
 * `format_version` (which versions the snapshot SHAPE). Bump when the pools schema that
 * feeds the snapshot changes (e.g. a future migration alters the pool columns snapshotted).
 */
export const POOL_SNAPSHOT_SCHEMA_VERSION = '0071_pools-lifecycle' as const;

/** The `benefit_mechanism` labels a snapshot may carry (mirrors benefitMechanismEnum). */
export type PoolSnapshotBenefitMechanism = 'pool' | 'reserve';

/**
 * One member assignment captured in the snapshot. Story 7.1 commits the SHAPE; the
 * assignment DATA (the `hash(member_id + cycle_id) % N` mapping) is populated at spawn
 * by Story 7.4 — at Story 7.1 a serialized pool typically has an empty list.
 */
export interface PoolSnapshotMemberAssignment {
  readonly member_id: string;
}

/**
 * The domain state a caller hands the serializer — the full pool state + its member
 * assignments at the snapshot moment. camelCase (the domain-side input shape); the
 * serialized snapshot is snake_case (the on-disk / on-wire shape).
 */
export interface PoolSnapshotState {
  readonly poolId: string;
  readonly pariwarId: string;
  readonly cycleId: string;
  readonly poolIndex: number;
  readonly supportCategory: PoolSupportCategory;
  readonly benefitMechanism: PoolSnapshotBenefitMechanism;
  readonly fixedAmount: number;
  readonly currentState: PoolLifecycleState;
  readonly memberAssignments: readonly PoolSnapshotMemberAssignment[];
}

/**
 * The serialized, canonical, integrity-hashed pool snapshot (format v1). snake_case
 * keys (the on-disk / cold-storage / hot-row JSONB shape). The `member_assignments`
 * array preserves caller order; canonicalization sorts OBJECT keys but NOT array
 * elements, so the caller is responsible for a deterministic assignment order (Story
 * 7.4). `integrity_hash` is LAST and is excluded from its own computation.
 */
export interface PoolSnapshotV1 {
  readonly format_version: typeof POOL_SNAPSHOT_FORMAT_VERSION;
  readonly schema_version: string;
  readonly pool_id: string;
  readonly pariwar_id: string;
  readonly cycle_id: string;
  readonly pool_index: number;
  readonly support_category: PoolSupportCategory;
  readonly benefit_mechanism: PoolSnapshotBenefitMechanism;
  readonly fixed_amount: number;
  readonly current_state: PoolLifecycleState;
  readonly member_assignments: readonly PoolSnapshotMemberAssignment[];
  readonly integrity_hash: string;
}

/** The snapshot body (every field EXCEPT `integrity_hash`) — the exact preimage hashed. */
export type PoolSnapshotV1Body = Omit<PoolSnapshotV1, 'integrity_hash'>;

/**
 * Compute the integrity hash over the snapshot BODY (all fields except `integrity_hash`).
 * The SAME canonicalizer + SHA-256 as the @twt/events hash chain (architecture §1.5) —
 * canonical-JSON gives a deterministic byte preimage regardless of key insertion order,
 * so two structurally-equal bodies always hash identically. Returns lowercase hex.
 */
export function computePoolSnapshotHash(body: PoolSnapshotV1Body): string {
  return createHash('sha256').update(canonicalJsonStringify(body), 'utf8').digest('hex');
}

/**
 * Serialize a pool state into a versioned, canonical, integrity-hashed v1 snapshot.
 * Deterministic + pure: the same input always yields the same snapshot + hash (no
 * clock, no randomness). The producing schema is stamped via `POOL_SNAPSHOT_SCHEMA_VERSION`.
 */
export function serializePoolSnapshot(state: PoolSnapshotState): PoolSnapshotV1 {
  assertUuid(state.poolId, 'poolId');
  assertUuid(state.pariwarId, 'pariwarId');
  assertUuid(state.cycleId, 'cycleId');
  for (const assignment of state.memberAssignments) {
    assertUuid(assignment.member_id, 'memberAssignments[].member_id');
  }

  const body: PoolSnapshotV1Body = {
    format_version: POOL_SNAPSHOT_FORMAT_VERSION,
    schema_version: POOL_SNAPSHOT_SCHEMA_VERSION,
    pool_id: state.poolId,
    pariwar_id: state.pariwarId,
    cycle_id: state.cycleId,
    pool_index: state.poolIndex,
    support_category: state.supportCategory,
    benefit_mechanism: state.benefitMechanism,
    fixed_amount: state.fixedAmount,
    current_state: state.currentState,
    member_assignments: state.memberAssignments.map((a) => ({ member_id: a.member_id })),
  };
  return { ...body, integrity_hash: computePoolSnapshotHash(body) };
}

/**
 * Recompute the integrity hash over a snapshot's body and compare it to the stored
 * `integrity_hash`. Returns true iff they match (the snapshot is untampered). A
 * verifier (the replay-migration harness / the audit-integrity job) uses this before
 * trusting a snapshot's contents.
 */
export function verifyPoolSnapshotIntegrity(snapshot: PoolSnapshotV1): boolean {
  const { integrity_hash, ...body } = snapshot;
  return computePoolSnapshotHash(body) === integrity_hash;
}
