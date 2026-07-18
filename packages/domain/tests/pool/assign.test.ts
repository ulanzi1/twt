// Deterministic member-to-pool assignment — property + replay + frozen-vector suite (Story 7.4,
// Task 4; AC1/AC3/AC4/AC5). The LOAD-BEARING correctness AC of Epic 7.
//
// Structure (D3 — decided): the UNIVERSAL "for any (member_id, cycle_id)/(set, N)" claims (#4a
// determinism, #4b balanced, #4c reproducibility) are fast-check PROPERTY tests; the scale, replay,
// and FROZEN-VECTOR tests (#4d) are conventional deterministic tests over fixed SEEDED synthetic
// populations, so the suite itself is replay-stable and the frozen vectors are pinnable. A property
// generator must NEVER be the source of a frozen vector.
//
// ── The frozen vectors are a CONTRACT, not a snapshot to regenerate ────────────
// A diff in any pinned vector below means an intentional POOL_ASSIGNMENT_HASH_VERSION bump ('v1' →
// 'v2') — the whole-algorithm replay identity changed (hash fn / truncation / delimiter / balancing
// rule). Never "fix" a failing vector by pasting the new value; that silently re-routes real
// members' contributions for already-frozen rosters (the D0/D1 contract). Mirror spawn.test.ts's
// "a change here would break every cycle replay" framing.

import { createHash } from 'node:crypto';

import fc from 'fast-check';
import { describe, expect, it } from 'vitest';

import {
  MAX_CYCLE_SPAWN_POOLS,
  POOL_ASSIGNMENT_HASH_VERSION,
  assignMembersToPools,
  computeAssignableRosterHash,
  createPoolAssignmentSeam,
  hashMemberToBucket,
} from '../../src/pool/index.js';

const CYCLE_A = '11111111-1111-1111-1111-111111111111';
const CYCLE_B = '22222222-2222-2222-2222-222222222222';

/** Deterministic, replay-stable member-id UUIDs from a seed — SHA-256(`${seed}:${i}`) formatted as
 *  an 8-4-4-4-12 hyphenated hex string (the shape `assignMembersToPools`/the snapshot serializer's
 *  member-id fields expect). This is the ONLY member-id source for the seeded/scale/frozen tests, so
 *  the whole suite re-derives byte-identically. */
function seededUuid(seed: string, i: number): string {
  const hex = createHash('sha256').update(`${seed}:${String(i)}`).digest().subarray(0, 16).toString('hex');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`;
}
function seededMemberIds(seed: string, count: number): string[] {
  return Array.from({ length: count }, (_, i) => seededUuid(seed, i));
}

/** Bucket sizes of an assignment over `n` pools (index → count). */
function bucketSizes(map: ReadonlyMap<string, number>, n: number): number[] {
  const sizes = new Array<number>(n).fill(0);
  for (const idx of map.values()) sizes[idx]! += 1;
  return sizes;
}

// ── #4a Determinism — the BASE hash bucket (fast-check universal) ──────────────

describe('hashMemberToBucket — #4a determinism (base bucket, pre-balancing)', () => {
  it('is a pure function of (member_id, cycle_id, n): identical across calls', () => {
    fc.assert(
      fc.property(fc.uuid(), fc.uuid(), fc.integer({ min: 1, max: 200 }), (memberId, cycleId, n) => {
        const a = hashMemberToBucket(memberId, cycleId, n);
        const b = hashMemberToBucket(memberId, cycleId, n);
        expect(a).toBe(b);
      }),
    );
  });

  it('always lands in [0, n)', () => {
    fc.assert(
      fc.property(fc.uuid(), fc.uuid(), fc.integer({ min: 1, max: 500 }), (memberId, cycleId, n) => {
        const bucket = hashMemberToBucket(memberId, cycleId, n);
        expect(Number.isInteger(bucket)).toBe(true);
        expect(bucket).toBeGreaterThanOrEqual(0);
        expect(bucket).toBeLessThan(n);
      }),
    );
  });

  it('is repeat-call deterministic per-cycle, for two distinct cycles', () => {
    // NOTE: this only re-checks repeat-call determinism (redundant with the fast-check property
    // above) for two specific cycles. The actual D1 claim — that the base bucket needs no roster —
    // is structural (hashMemberToBucket's signature never accepts a memberSet) and is what the
    // "PINNED full post-balancing assignment map" test below substantiates: it shows the pre-
    // balancing base bucket is stable across the whole frozen roster context.
    const id = seededUuid('d1', 0);
    expect(hashMemberToBucket(id, CYCLE_A, 13)).toBe(hashMemberToBucket(id, CYCLE_A, 13));
    expect(hashMemberToBucket(id, CYCLE_B, 13)).toBe(hashMemberToBucket(id, CYCLE_B, 13));
  });

  it('rejects a degenerate / out-of-range pool count', () => {
    expect(() => hashMemberToBucket(CYCLE_A, CYCLE_A, 0)).toThrow(/pool count n must be an integer/);
    expect(() => hashMemberToBucket(CYCLE_A, CYCLE_A, -1)).toThrow(/pool count n must be an integer/);
    expect(() => hashMemberToBucket(CYCLE_A, CYCLE_A, 1.5)).toThrow(/pool count n must be an integer/);
    expect(() => hashMemberToBucket(CYCLE_A, CYCLE_A, MAX_CYCLE_SPAWN_POOLS + 1)).toThrow(
      /pool count n must be an integer/,
    );
  });
});

// ── #4b Balanced (≤1) for ANY set (fast-check universal) ───────────────────────

describe('assignMembersToPools — #4b balanced (≤1) for any set', () => {
  it('final pool sizes differ by ≤ 1 for any (member_set, n)', () => {
    fc.assert(
      fc.property(
        fc.array(fc.uuid(), { minLength: 0, maxLength: 300 }),
        fc.integer({ min: 1, max: 50 }),
        (members, n) => {
          const map = assignMembersToPools(members, CYCLE_A, n);
          const sizes = bucketSizes(map, n);
          expect(Math.max(...sizes) - Math.min(...sizes)).toBeLessThanOrEqual(1);
        },
      ),
    );
  });

  it('assigns every UNIQUE member exactly once, each to a valid pool index', () => {
    fc.assert(
      fc.property(
        fc.array(fc.uuid(), { minLength: 1, maxLength: 300 }),
        fc.integer({ min: 1, max: 50 }),
        (members, n) => {
          const map = assignMembersToPools(members, CYCLE_A, n);
          expect(map.size).toBe(new Set(members).size); // de-duped (it is a SET)
          for (const [memberId, idx] of map) {
            expect(members).toContain(memberId);
            expect(idx).toBeGreaterThanOrEqual(0);
            expect(idx).toBeLessThan(n);
          }
        },
      ),
    );
  });

  it('bucket sizes are exactly {floor, floor+1} with the first r buckets carrying the +1', () => {
    // The pinned capacity rule: capacities sum to M, first r=(M mod n) buckets get floor+1.
    const members = seededMemberIds('cap-rule', 100);
    const n = 7;
    const sizes = bucketSizes(assignMembersToPools(members, CYCLE_A, n), n);
    const floor = Math.floor(100 / n);
    const r = 100 % n;
    for (let i = 0; i < n; i++) {
      expect(sizes[i]).toBe(floor + (i < r ? 1 : 0));
    }
  });

  it('handles the degenerate roster shapes', () => {
    expect(assignMembersToPools([], CYCLE_A, 5).size).toBe(0); // empty roster
    const one = assignMembersToPools([seededUuid('solo', 0)], CYCLE_A, 4);
    expect(one.size).toBe(1);
    // n=1 → everyone in pool 0.
    const all = assignMembersToPools(seededMemberIds('n1', 20), CYCLE_A, 1);
    expect([...all.values()].every((v) => v === 0)).toBe(true);
    // fewer members than pools → M buckets of 1, the rest empty (still ≤1).
    const sparse = bucketSizes(assignMembersToPools(seededMemberIds('sparse', 3), CYCLE_A, 10), 10);
    expect(Math.max(...sparse)).toBe(1);
    expect(sparse.filter((s) => s === 1).length).toBe(3);
  });

  it('de-dupes: a repeated member_id does not inflate a bucket', () => {
    const id = seededUuid('dupe', 0);
    const map = assignMembersToPools([id, id, id], CYCLE_A, 3);
    expect(map.size).toBe(1);
  });

  it('rejects a degenerate / out-of-range pool count', () => {
    expect(() => assignMembersToPools([], CYCLE_A, 0)).toThrow(/pool count n must be an integer/);
    expect(() => assignMembersToPools([], CYCLE_A, MAX_CYCLE_SPAWN_POOLS + 1)).toThrow(
      /pool count n must be an integer/,
    );
  });
});

// ── #4c Reproducibility across releases + #4d Replay correctness ───────────────

describe('assignMembersToPools — #4d replay correctness (roster + cycle + N → identical)', () => {
  it('the SAME (cycle_id, member-set, N) produces byte-identical assignments', () => {
    const members = seededMemberIds('replay', 250);
    const first = assignMembersToPools(members, CYCLE_A, 11);
    const second = assignMembersToPools([...members].reverse(), CYCLE_A, 11); // caller order irrelevant
    expect([...second.entries()].sort()).toEqual([...first.entries()].sort());
  });

  it('a DIFFERENT cycle_id generally re-routes members (cycle_id is in the preimage)', () => {
    const members = seededMemberIds('replay', 250);
    const a = assignMembersToPools(members, CYCLE_A, 11);
    const b = assignMembersToPools(members, CYCLE_B, 11);
    // Not asserting total disagreement (collisions happen), only that the two are not identical.
    const differ = members.some((id) => a.get(id) !== b.get(id));
    expect(differ).toBe(true);
  });
});

// ── Scale tests — determinism + balance at 10 / 100 / 1000 / 10000 / 50000 ─────

describe('scale — deterministic + balanced across synthetic populations (#4b/#4d)', () => {
  const SCALES = [10, 100, 1000, 10000, 50000] as const;
  const N = 23;
  for (const m of SCALES) {
    it(
      `${String(m)} members / ${String(N)} pools: balanced ≤1 and deterministic`,
      () => {
        const members = seededMemberIds(`scale-${String(m)}`, m);
        const a = assignMembersToPools(members, CYCLE_A, N);
        const b = assignMembersToPools(members, CYCLE_A, N);
        // determinism at scale
        expect([...a.entries()].sort()).toEqual([...b.entries()].sort());
        // balance at scale
        const sizes = bucketSizes(a, N);
        expect(Math.max(...sizes) - Math.min(...sizes)).toBeLessThanOrEqual(1);
        expect(a.size).toBe(m);
      },
      30_000,
    );
  }

  it(
    `balanced ≤1 and deterministic at the production ceiling n=${String(MAX_CYCLE_SPAWN_POOLS)}`,
    () => {
      const members = seededMemberIds('scale-ceiling', 50_000);
      const a = assignMembersToPools(members, CYCLE_A, MAX_CYCLE_SPAWN_POOLS);
      const b = assignMembersToPools(members, CYCLE_A, MAX_CYCLE_SPAWN_POOLS);
      expect([...a.entries()].sort()).toEqual([...b.entries()].sort());
      const sizes = bucketSizes(a, MAX_CYCLE_SPAWN_POOLS);
      expect(Math.max(...sizes) - Math.min(...sizes)).toBeLessThanOrEqual(1);
      expect(a.size).toBe(50_000);
    },
    30_000,
  );
});

// ── FROZEN REFERENCE VECTORS — the pinned whole-algorithm replay identity ──────

describe('FROZEN VECTORS — a change here == a deliberate POOL_ASSIGNMENT_HASH_VERSION bump', () => {
  // The exact member ids the small-population vectors were pinned against (seed twt-7.4-frozen).
  const SMALL = seededMemberIds('twt-7.4-frozen', 10);

  it('the version pin is literally "v1" (a bump must never be silent)', () => {
    expect(POOL_ASSIGNMENT_HASH_VERSION).toBe('v1');
  });

  it('the seeded member-id generator is itself pinned (guards the vectors below)', () => {
    expect(SMALL[0]).toBe('2f00dad7-62b0-4407-b85b-5a047d0fcafe');
    expect(SMALL[9]).toBe('c60b644d-08d6-4dc0-c620-bec984251ece');
  });

  it('PINNED base-hash buckets (hashMemberToBucket, cycle=A)', () => {
    expect(hashMemberToBucket(SMALL[0]!, CYCLE_A, 3)).toBe(2);
    expect(hashMemberToBucket(SMALL[0]!, CYCLE_A, 7)).toBe(4);
    expect(hashMemberToBucket(SMALL[2]!, CYCLE_A, 3)).toBe(0);
    expect(hashMemberToBucket(SMALL[4]!, CYCLE_A, 7)).toBe(1);
    expect(hashMemberToBucket(SMALL[3]!, CYCLE_A, 7)).toBe(6);
  });

  it('PINNED full post-balancing assignment map (10 members, n=3) — pins the BALANCING RULE', () => {
    // This full-population map is what makes the balancing rule part of the pinned contract: a
    // change to how overflow is redistributed flips these entries.
    const map = assignMembersToPools(SMALL, CYCLE_A, 3);
    const actual = Object.fromEntries([...map.entries()].sort((a, b) => (a[0] < b[0] ? -1 : 1)));
    expect(actual).toEqual({
      '2739809d-e359-8c8a-5181-d31371261ddb': 2,
      '2f00dad7-62b0-4407-b85b-5a047d0fcafe': 2,
      '2f971a8b-24ca-c0d6-be9b-e78e4b34be83': 1,
      '41159ef5-18f3-9003-975d-694285356866': 1,
      '56c72c1a-73f5-e1fd-2ee4-7a388109da62': 1,
      '60d17d93-288c-14db-5413-3b610bd2d132': 0,
      'b996140b-7d0d-328e-1686-133865157acd': 0,
      'c60b644d-08d6-4dc0-c620-bec984251ece': 2,
      'e09ea9e2-aefb-c0ec-be38-792d70a01eb0': 0,
      'e4b58295-f397-3748-5925-a66febf0d478': 0,
    });
  });

  it('PINNED roster fingerprint (computeAssignableRosterHash)', () => {
    expect(computeAssignableRosterHash(SMALL)).toBe(
      'ffb466b106469d324e35baafd846b9b80d1e6fb26dead8b92be6ad19a52433c1',
    );
    // The empty roster fingerprint (the current (B)-scope spawn value) == sha256("[]").
    expect(computeAssignableRosterHash([])).toBe(
      '4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945',
    );
  });
});

// ── computeAssignableRosterHash — set semantics ───────────────────────────────

describe('computeAssignableRosterHash — canonical set fingerprint', () => {
  it('is order-independent and de-duped (it fingerprints a SET)', () => {
    const ids = seededMemberIds('roster', 20);
    const shuffled = [...ids].reverse();
    const withDupes = [...ids, ids[0]!, ids[5]!];
    expect(computeAssignableRosterHash(shuffled)).toBe(computeAssignableRosterHash(ids));
    expect(computeAssignableRosterHash(withDupes)).toBe(computeAssignableRosterHash(ids));
  });

  it('a different roster → a different fingerprint', () => {
    expect(computeAssignableRosterHash(seededMemberIds('a', 10))).not.toBe(
      computeAssignableRosterHash(seededMemberIds('b', 10)),
    );
  });
});

// ── createPoolAssignmentSeam — the real seam that fills emptyAssignmentSeam ────

describe('createPoolAssignmentSeam — per-pool subset (the wired seam)', () => {
  const seam = createPoolAssignmentSeam();
  const MEMBERS = seededMemberIds('seam', 100);
  const N = 9;

  it('returns exactly the members assigned to input.poolIndex, sorted by member_id', () => {
    const global = assignMembersToPools(MEMBERS, CYCLE_A, N);
    for (let p = 0; p < N; p++) {
      const subset = seam({ cycleId: CYCLE_A, poolIndex: p, poolCount: N, memberSet: MEMBERS });
      const ids = subset.map((s) => s.member_id);
      // sorted
      expect(ids).toEqual([...ids].sort());
      // exactly the global assignment's members for this pool
      const expected = [...global.entries()].filter(([, idx]) => idx === p).map(([id]) => id).sort();
      expect(ids).toEqual(expected);
    }
  });

  it('the union of all pool subsets is the whole roster, disjointly', () => {
    const seen = new Set<string>();
    for (let p = 0; p < N; p++) {
      for (const { member_id } of seam({ cycleId: CYCLE_A, poolIndex: p, poolCount: N, memberSet: MEMBERS })) {
        expect(seen.has(member_id)).toBe(false); // disjoint
        seen.add(member_id);
      }
    }
    expect(seen.size).toBe(MEMBERS.length); // complete
  });

  it('an empty roster yields an empty subset (the current (B)-scope no-op)', () => {
    expect(seam({ cycleId: CYCLE_A, poolIndex: 0, poolCount: 3, memberSet: [] })).toEqual([]);
  });
});
