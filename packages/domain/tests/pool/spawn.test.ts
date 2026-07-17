// DB-free unit tests for the pool spawn saga — Story 7.3 (Task 7).
//
// Covers the pure/deterministic surface: pool_id derivation (the replay-identity vector),
// the spawn-index conflict detector, freeze-month derivation, the assignment seam contract,
// and the cycle.* payload schemas. The transactional orchestration (parent plan, child
// spawn, last-child finalize, atomicity + idempotency) is proven in the live-DB spec.

import { describe, expect, it } from 'vitest';

import {
  CycleFrozenPayloadSchema,
  CycleSpawnAbortedPayloadSchema,
  POOL_ID_NAMESPACE_UUID,
  POOL_SPAWN_INDEX_CONSTRAINT,
  V1_SPAWN_BENEFIT_MECHANISM,
  V1_SPAWN_SUPPORT_CATEGORY,
  derivePoolId,
  deriveFreezeMonth,
  emptyAssignmentSeam,
  isPoolSpawnIndexConflict,
} from '../../src/pool/index.js';
import { POOL_SUPPORT_CATEGORIES } from '../../src/schema/pools.js';

const CYCLE_A = '11111111-1111-1111-1111-111111111111';
const CYCLE_B = '22222222-2222-2222-2222-222222222222';
const PARIWAR = '33333333-3333-3333-3333-333333333333';

describe('derivePoolId — deterministic UUIDv5 (the pool-stream replay identity)', () => {
  it('is a pure function of (cycle_id, pool_index): same inputs → same id', () => {
    expect(derivePoolId(CYCLE_A, 0)).toBe(derivePoolId(CYCLE_A, 0));
    expect(derivePoolId(CYCLE_A, 7)).toBe(derivePoolId(CYCLE_A, 7));
  });

  it('PINNED regression vectors — a change here would break every cycle replay', () => {
    // If this fails, the namespace UUID or the derivation changed — a replay-identity break.
    expect(derivePoolId(CYCLE_A, 0)).toBe('045a3ebf-6a30-5947-88fe-fb477a1bf677');
    expect(derivePoolId(CYCLE_A, 1)).toBe('e13b4c01-3b50-5f2e-8e7c-b8e4e2011a28');
    expect(POOL_ID_NAMESPACE_UUID).toBe('b6e7c9a2-3d4f-4a1b-8c5e-9f0a1b2c3d4e');
  });

  it('emits a valid v5 UUID (version nibble 5, RFC-4122 variant)', () => {
    const id = derivePoolId(CYCLE_A, 3);
    expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  });

  it('distinct index or distinct cycle → distinct id', () => {
    expect(derivePoolId(CYCLE_A, 0)).not.toBe(derivePoolId(CYCLE_A, 1));
    expect(derivePoolId(CYCLE_A, 0)).not.toBe(derivePoolId(CYCLE_B, 0));
  });

  it('rejects a non-integer / negative pool_index', () => {
    expect(() => derivePoolId(CYCLE_A, -1)).toThrow(/non-negative integer/);
    expect(() => derivePoolId(CYCLE_A, 1.5)).toThrow(/non-negative integer/);
  });
});

describe('isPoolSpawnIndexConflict', () => {
  it('true for a 23505 on the spawn-index constraint (drizzle wraps on .cause)', () => {
    const err = Object.assign(new Error('dup'), {
      cause: { code: '23505', constraint: POOL_SPAWN_INDEX_CONSTRAINT },
    });
    expect(isPoolSpawnIndexConflict(err)).toBe(true);
  });

  it('false for a different constraint / non-unique-violation / non-error', () => {
    expect(
      isPoolSpawnIndexConflict(
        Object.assign(new Error('x'), { cause: { code: '23505', constraint: 'some_other_uq' } }),
      ),
    ).toBe(false);
    expect(
      isPoolSpawnIndexConflict(
        Object.assign(new Error('x'), { cause: { code: '23503', constraint: POOL_SPAWN_INDEX_CONSTRAINT } }),
      ),
    ).toBe(false);
    expect(isPoolSpawnIndexConflict('not an error')).toBe(false);
    expect(isPoolSpawnIndexConflict(null)).toBe(false);
  });
});

describe('deriveFreezeMonth (IST, clock-free)', () => {
  it('reads the IST calendar month of the stored UTC instant', () => {
    // 2026-07-15 12:00 UTC → 17:30 IST, same day → July.
    expect(deriveFreezeMonth(new Date('2026-07-15T12:00:00Z'))).toEqual({ year: 2026, month: 7 });
  });

  it('rolls into the next IST month when UTC is late on the last day (the +5:30 boundary)', () => {
    // 2026-07-31 20:00 UTC → 2026-08-01 01:30 IST → August (an IST-vs-UTC month divergence).
    expect(deriveFreezeMonth(new Date('2026-07-31T20:00:00Z'))).toEqual({ year: 2026, month: 8 });
  });

  it('rolls the year at the IST new-year boundary', () => {
    // 2025-12-31 19:00 UTC → 2026-01-01 00:30 IST → January 2026.
    expect(deriveFreezeMonth(new Date('2025-12-31T19:00:00Z'))).toEqual({ year: 2026, month: 1 });
  });
});

describe('emptyAssignmentSeam (v1 default) + spawn defaults', () => {
  it('returns no member assignments (Story 7.4 fills the real algorithm)', () => {
    expect(emptyAssignmentSeam({ cycleId: CYCLE_A, poolIndex: 0, poolCount: 5, memberSet: [] })).toEqual([]);
  });

  it('the v1 support category is the sole enum label (keyed on the enum, never a literal)', () => {
    expect(V1_SPAWN_SUPPORT_CATEGORY).toBe(POOL_SUPPORT_CATEGORIES[0]);
    expect(V1_SPAWN_BENEFIT_MECHANISM).toBe('pool');
  });
});

describe('CycleFrozenPayloadSchema', () => {
  const valid = {
    cycle_id: CYCLE_A,
    pariwar_id: PARIWAR,
    pool_count: 2,
    pool_ids: [derivePoolId(CYCLE_A, 0), derivePoolId(CYCLE_A, 1)],
    pool_canonical_identifiers: ['P-2026-07-001', 'P-2026-07-002'],
    attestation: { actor_id: 'actor-1', actor_display: 'Trustee One', committed_at: '2026-07-15T00:00:00.000Z' },
  };

  it('accepts a well-formed payload', () => {
    expect(() => CycleFrozenPayloadSchema.parse(valid)).not.toThrow();
  });

  it('rejects pool_ids / identifiers length ≠ pool_count', () => {
    expect(() => CycleFrozenPayloadSchema.parse({ ...valid, pool_count: 3 })).toThrow(/must equal pool_count/);
    expect(() =>
      CycleFrozenPayloadSchema.parse({ ...valid, pool_canonical_identifiers: ['P-2026-07-001'] }),
    ).toThrow(/must equal pool_count/);
  });

  it('is strict (an unknown key is a defect) and requires a positive pool_count', () => {
    expect(() => CycleFrozenPayloadSchema.parse({ ...valid, extra: 1 })).toThrow();
    expect(() =>
      CycleFrozenPayloadSchema.parse({ ...valid, pool_count: 0, pool_ids: [], pool_canonical_identifiers: [] }),
    ).toThrow();
  });
});

describe('CycleSpawnAbortedPayloadSchema', () => {
  it('accepts a reason string; strict + requires non-empty reason', () => {
    expect(() =>
      CycleSpawnAbortedPayloadSchema.parse({ cycle_id: CYCLE_A, pariwar_id: PARIWAR, reason: 'child 3 crashed' }),
    ).not.toThrow();
    expect(() =>
      CycleSpawnAbortedPayloadSchema.parse({ cycle_id: CYCLE_A, pariwar_id: PARIWAR, reason: '' }),
    ).toThrow();
    expect(() =>
      CycleSpawnAbortedPayloadSchema.parse({ cycle_id: CYCLE_A, pariwar_id: PARIWAR, reason: 'x', extra: 1 }),
    ).toThrow();
  });
});
