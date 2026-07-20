// Deterministic alert_id derivation — DB-free unit + frozen-vector suite (Story 8.1, Task 4;
// AC2). deriveAlertId is PURE, so this suite proves: determinism (same cycle → same id),
// distinctness (different cycles → different ids), UUIDv5 shape, and FROZEN seeded vectors that
// pin the exact bytes so a silent algorithm/namespace drift is caught (the 7.4/7.7 frozen-vector
// discipline — a green "it's deterministic" test without pinned bytes proves nothing).
//
// ── The frozen vectors are a CONTRACT, not a snapshot to regenerate ────────────
// A diff in either pinned vector below means the ALERT_ID_NAMESPACE_UUID or the derivation shape
// changed — a REPLAY-IDENTITY break that re-routes the (member_id, alert_id) `tr=` binding for
// every already-issued reference. Never "fix" a failing vector by pasting the new value; the
// namespace constant is pinned "never change" for exactly this reason (alert/id.ts).

import { createHash } from 'node:crypto';

import { describe, expect, it } from 'vitest';

import { ALERT_ID_NAMESPACE_UUID, deriveAlertId } from '../../src/alert/id.js';

/** Deterministic, replay-stable UUIDs from a seed — SHA-256(`${seed}:${i}`) → 8-4-4-4-12 hex
 *  (the contribution-reference.test.ts / assign.test.ts seeded-uuid discipline). The ONLY id
 *  source for the frozen vectors below, so the suite re-derives byte-identically. */
function seededUuid(seed: string, i: number): string {
  const hex = createHash('sha256').update(`${seed}:${String(i)}`).digest().subarray(0, 16).toString('hex');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`;
}

const C0 = seededUuid('twt-8.1-frozen-cycle', 0);
const C1 = seededUuid('twt-8.1-frozen-cycle', 1);

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

describe('deriveAlertId — determinism + distinctness', () => {
  it('same cycle → same alert id (idempotent by construction)', () => {
    expect(deriveAlertId(C0)).toBe(deriveAlertId(C0));
    expect(deriveAlertId(C1)).toBe(deriveAlertId(C1));
  });

  it('different cycles → different alert ids', () => {
    expect(deriveAlertId(C0)).not.toBe(deriveAlertId(C1));
  });

  it('the derived id is a well-formed UUIDv5 (version nibble 5, RFC-4122 variant)', () => {
    const id = deriveAlertId(C0);
    expect(id).toMatch(UUID_RE);
    // Version nibble (first char of the 3rd group) is '5'.
    expect(id.split('-')[2]![0]).toBe('5');
    // Variant nibble (first char of the 4th group) is one of 8/9/a/b.
    expect('89ab').toContain(id.split('-')[3]![0]);
  });
});

describe('FROZEN VECTORS — a change here == a namespace/derivation replay-identity break', () => {
  it('the pinned namespace is unchanged (guards the vectors below)', () => {
    expect(ALERT_ID_NAMESPACE_UUID).toBe('d4f1a7c8-6b23-4e90-9a1f-2c5d8e0b3f47');
  });

  it('the seeded cycle-id generator is itself pinned (guards the vectors below)', () => {
    expect(C0).toBe('0e87b4b8-8fff-759d-517c-dd46e46848dc');
    expect(C1).toBe('bb2472c2-19bf-07b0-d661-dd9dd3bea7d1');
  });

  it('deriveAlertId(C0) is byte-identical to the pinned vector', () => {
    expect(deriveAlertId(C0)).toBe('c61f18fa-eee8-52ee-b44a-a03c19fb8e7e');
  });

  it('deriveAlertId(C1) is byte-identical to the pinned vector', () => {
    expect(deriveAlertId(C1)).toBe('aeff23e0-59a2-51d9-865a-1f565a76142d');
  });
});
