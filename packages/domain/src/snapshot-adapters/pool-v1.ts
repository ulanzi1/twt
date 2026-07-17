// Pool snapshot migration adapter — v1 (Story 7.1, Task 6; AC3).
//
// The FIRST real snapshot adapter in this directory (previously README-only). Per
// architecture §1.6 line 925-934, snapshots are read through PER-VERSION migration
// adapters selected by `format_version`: a stored snapshot at an OLD shape is migrated
// FORWARD to the current shape at read time, so replay is robust across shape evolution.
//
// v1 IS the current shape, so `poolSnapshotV1Adapter.migrate` is an identity migration
// that VALIDATES structure (a stored blob must be a well-formed v1 snapshot) and, by
// default, verifies the integrity hash. When a v2 shape lands, its adapter reads a v1
// blob and returns the current shape — this file is the template.
//
// This is §1.6's "read through migration adapters (property tests)" — the property
// tests live in tests/pool/pool-snapshot.test.ts (deterministic · canonical-shape ·
// replay-invariants · hash-discrimination).

import { z } from 'zod';

import { POOL_LIFECYCLE_STATES, POOL_SUPPORT_CATEGORIES } from '../schema/pools.js';
import {
  POOL_SNAPSHOT_FORMAT_VERSION,
  type PoolSnapshotV1,
  verifyPoolSnapshotIntegrity,
} from '../pool/snapshot.js';

/** Thrown when a stored snapshot's `format_version` has no registered adapter. */
export class UnknownPoolSnapshotFormatError extends Error {
  public readonly name = 'UnknownPoolSnapshotFormatError';
  public constructor(public readonly formatVersion: unknown) {
    super(`[pool-snapshot] no migration adapter for format_version ${JSON.stringify(formatVersion)}`);
  }
}

/** Thrown when a stored snapshot's `integrity_hash` does not match its recomputed body. */
export class PoolSnapshotIntegrityError extends Error {
  public readonly name = 'PoolSnapshotIntegrityError';
  public constructor(public readonly poolId: string) {
    super(`[pool-snapshot] integrity hash mismatch for pool ${poolId} — snapshot rejected`);
  }
}

/** Strict Zod schema for a v1 pool snapshot — the structural gate for a stored blob. */
export const PoolSnapshotV1Schema = z
  .object({
    format_version: z.literal(POOL_SNAPSHOT_FORMAT_VERSION),
    schema_version: z.string().min(1),
    pool_id: z.string().uuid(),
    pariwar_id: z.string().uuid(),
    cycle_id: z.string().uuid(),
    pool_index: z.number().int().nonnegative(),
    support_category: z.enum(POOL_SUPPORT_CATEGORIES),
    benefit_mechanism: z.enum(['pool', 'reserve']),
    fixed_amount: z.number().int().positive(),
    current_state: z.enum(POOL_LIFECYCLE_STATES),
    member_assignments: z.array(z.object({ member_id: z.string().uuid() }).strict()),
    integrity_hash: z.string().regex(/^[0-9a-f]{64}$/, 'integrity_hash must be lowercase sha-256 hex'),
  })
  .strict();

/** A per-version snapshot migration adapter. `migrate` reads a raw blob at this
 *  adapter's `formatVersion` and returns the CURRENT snapshot shape. */
export interface PoolSnapshotAdapter {
  readonly formatVersion: number;
  migrate(raw: unknown, opts?: { verifyIntegrity?: boolean }): PoolSnapshotV1;
}

/**
 * The v1 adapter. v1 is the current shape → an identity migration that validates the
 * blob structurally and (by default) verifies the integrity hash. `verifyIntegrity`
 * defaults to true; a caller migrating a KNOWN-perturbed fixture for a negative test
 * may pass `false` to inspect the parsed shape without the hash gate.
 */
export const poolSnapshotV1Adapter: PoolSnapshotAdapter = {
  formatVersion: POOL_SNAPSHOT_FORMAT_VERSION,
  migrate(raw, opts) {
    const parsed = PoolSnapshotV1Schema.parse(raw) as PoolSnapshotV1;
    if (opts?.verifyIntegrity !== false && !verifyPoolSnapshotIntegrity(parsed)) {
      throw new PoolSnapshotIntegrityError(parsed.pool_id);
    }
    return parsed;
  },
};

/** Registry of pool-snapshot adapters, keyed by `format_version`. */
export const POOL_SNAPSHOT_ADAPTERS: Readonly<Record<number, PoolSnapshotAdapter>> = {
  [POOL_SNAPSHOT_FORMAT_VERSION]: poolSnapshotV1Adapter,
};

/**
 * Read a stored pool snapshot blob through the correct migration adapter, selected by
 * its `format_version`, and return the CURRENT snapshot shape. Throws
 * `UnknownPoolSnapshotFormatError` for an unregistered version and
 * `PoolSnapshotIntegrityError` on a hash mismatch (unless `verifyIntegrity: false`).
 */
export function readPoolSnapshot(raw: unknown, opts?: { verifyIntegrity?: boolean }): PoolSnapshotV1 {
  const formatVersion =
    typeof raw === 'object' && raw !== null
      ? (raw as { format_version?: unknown }).format_version
      : undefined;
  const adapter =
    typeof formatVersion === 'number' ? POOL_SNAPSHOT_ADAPTERS[formatVersion] : undefined;
  if (!adapter) throw new UnknownPoolSnapshotFormatError(formatVersion);
  return adapter.migrate(raw, opts);
}
