// Curated pool-name registry — live-DB specs (Story 7.2, Task 5; AC5 + the AC3 launch
// invariant).
//
// The centre of gravity is the OPT-OUT vs EXHAUSTION distinction. Getting it backwards is
// not a cosmetic bug: throwing on the opt-out branch would fail TWT-Bihar's every cycle
// freeze, because its registry is empty BY DESIGN.
//
// The illustrative names seeded here live ONLY in this test (per the story: no launch
// seed, no fixture outside a test) — they prove the ordering + exhaustion mechanics, they
// are not a name list anyone ships.

import { describe, expect, it } from 'vitest';

import {
  PoolNameListExhaustedError,
  PoolNameReservationRangeError,
  reserveNames,
} from '../../../src/pool/names.js';
import { formatPoolCanonicalIdentifier, poolLetterCode, resolvePoolDisplay } from '../../../src/pool/naming.js';
import { getTx, hasDatabase, setupLiveDb } from '../../../src/test-utils/integration-setup.js';
import { PARIWAR_A, PARIWAR_B, enterAppScope, seedPoolName } from '../_helpers.js';

describe.skipIf(!hasDatabase)('reserveNames — opt-out vs exhaustion (AC5)', () => {
  setupLiveDb();

  // ── OPT-OUT: zero rows → [] and NO throw ────────────────────────────────────
  it('TWT-Bihar launch config (zero-row registry) returns [] and does NOT throw', async () => {
    const { tx, client } = getTx();
    await enterAppScope(client, PARIWAR_A);

    const reserved = await reserveNames(tx, { pariwarId: PARIWAR_A, count: 12 });
    expect(reserved).toEqual([]);
  });

  it('opt-out holds for ANY count — a large cycle on an empty registry is still not an error', async () => {
    const { tx, client } = getTx();
    await enterAppScope(client, PARIWAR_A);

    await expect(reserveNames(tx, { pariwarId: PARIWAR_A, count: 1 })).resolves.toEqual([]);
    await expect(reserveNames(tx, { pariwarId: PARIWAR_A, count: 500 })).resolves.toEqual([]);
  });

  // ── EXHAUSTION: rows exist but too few → typed throw ─────────────────────────
  it('a populated-but-short registry THROWS PoolNameListExhaustedError (a trustee config gap)', async () => {
    const { tx, client } = getTx();
    await seedPoolName(tx, PARIWAR_A, 0);
    await seedPoolName(tx, PARIWAR_A, 1);
    await enterAppScope(client, PARIWAR_A);

    await expect(reserveNames(tx, { pariwarId: PARIWAR_A, count: 5 })).rejects.toBeInstanceOf(
      PoolNameListExhaustedError,
    );
  });

  it('the exhaustion error carries requested + available so a trustee knows how many to add', async () => {
    const { tx, client } = getTx();
    await seedPoolName(tx, PARIWAR_A, 0);
    await seedPoolName(tx, PARIWAR_A, 1);
    await enterAppScope(client, PARIWAR_A);

    const err = await reserveNames(tx, { pariwarId: PARIWAR_A, count: 5 }).catch((e: unknown) => e);
    expect(err).toMatchObject({
      name: 'PoolNameListExhaustedError',
      pariwarId: PARIWAR_A,
      requested: 5,
      available: 2,
    });
  });

  // The discriminator is TOTAL rows, not approved rows — this is the case that proves it.
  it('an opted-in registry with NOTHING approved is EXHAUSTION, not opt-out', async () => {
    const { tx, client } = getTx();
    await seedPoolName(tx, PARIWAR_A, 0, { approvalStatus: 'pending' });
    await seedPoolName(tx, PARIWAR_A, 1, { approvalStatus: 'pending' });
    await enterAppScope(client, PARIWAR_A);

    // A tenant that populated a list and had it un-approved has a CONFIGURATION GAP.
    // Silently returning [] would hide a half-configured tenant behind letter codes.
    await expect(reserveNames(tx, { pariwarId: PARIWAR_A, count: 1 })).rejects.toBeInstanceOf(
      PoolNameListExhaustedError,
    );
  });

  it('un-approved names are never reservable (the M-10 governance gate is structural)', async () => {
    const { tx, client } = getTx();
    await seedPoolName(tx, PARIWAR_A, 0, { approvalStatus: 'approved', displayNameEn: 'Approved' });
    await seedPoolName(tx, PARIWAR_A, 1, { approvalStatus: 'pending', displayNameEn: 'Unreviewed' });
    await seedPoolName(tx, PARIWAR_A, 2, { approvalStatus: 'retired', displayNameEn: 'Retired' });
    await enterAppScope(client, PARIWAR_A);

    const reserved = await reserveNames(tx, { pariwarId: PARIWAR_A, count: 1 });
    expect(reserved.map((r) => r.displayNameEn)).toEqual(['Approved']);
    // Asking for more than the approved count exhausts even though 3 rows exist.
    await expect(reserveNames(tx, { pariwarId: PARIWAR_A, count: 2 })).rejects.toBeInstanceOf(
      PoolNameListExhaustedError,
    );
  });
});

describe.skipIf(!hasDatabase)('reserveNames — deterministic ordering (AC5)', () => {
  setupLiveDb();

  it('returns names in position_in_ordered_list order, regardless of INSERT order', async () => {
    const { tx, client } = getTx();
    // Seed DELIBERATELY out of order — insertion order must not leak into the result.
    await seedPoolName(tx, PARIWAR_A, 2, { displayNameEn: 'Third' });
    await seedPoolName(tx, PARIWAR_A, 0, { displayNameEn: 'First' });
    await seedPoolName(tx, PARIWAR_A, 1, { displayNameEn: 'Second' });
    await enterAppScope(client, PARIWAR_A);

    const reserved = await reserveNames(tx, { pariwarId: PARIWAR_A, count: 3 });
    expect(reserved.map((r) => r.displayNameEn)).toEqual(['First', 'Second', 'Third']);
    expect(reserved.map((r) => r.positionInOrderedList)).toEqual([0, 1, 2]);
  });

  it('is replay-reproducible: the same registry + count returns the identical result', async () => {
    const { tx, client } = getTx();
    await seedPoolName(tx, PARIWAR_A, 0);
    await seedPoolName(tx, PARIWAR_A, 1);
    await seedPoolName(tx, PARIWAR_A, 2);
    await enterAppScope(client, PARIWAR_A);

    const first = await reserveNames(tx, { pariwarId: PARIWAR_A, count: 2 });
    const second = await reserveNames(tx, { pariwarId: PARIWAR_A, count: 2 });
    expect(second).toEqual(first);
  });

  it('takes the FIRST count names (a prefix of the list), not an arbitrary subset', async () => {
    const { tx, client } = getTx();
    for (let i = 0; i < 6; i += 1) await seedPoolName(tx, PARIWAR_A, i, { displayNameEn: `N${String(i)}` });
    await enterAppScope(client, PARIWAR_A);

    const reserved = await reserveNames(tx, { pariwarId: PARIWAR_A, count: 3 });
    expect(reserved.map((r) => r.displayNameEn)).toEqual(['N0', 'N1', 'N2']);
  });

  it('carries BOTH locales so display can pick per-member (never a pre-baked locale)', async () => {
    const { tx, client } = getTx();
    await seedPoolName(tx, PARIWAR_A, 0, { displayNameEn: 'Ganga', displayNameHi: 'गंगा' });
    await enterAppScope(client, PARIWAR_A);

    const [reserved] = await reserveNames(tx, { pariwarId: PARIWAR_A, count: 1 });
    expect(reserved).toMatchObject({ displayNameEn: 'Ganga', displayNameHi: 'गंगा' });
  });

  it('a registry is PER-PARIWAR: tenant B cannot see tenant A names', async () => {
    const { tx, client } = getTx();
    await seedPoolName(tx, PARIWAR_A, 0);
    await enterAppScope(client, PARIWAR_B);

    // B never opted in — under B's scope, A's rows are invisible, so B reads as opt-out.
    await expect(reserveNames(tx, { pariwarId: PARIWAR_B, count: 1 })).resolves.toEqual([]);
  });

  it.each([[0], [-1], [1.5], [501]])('rejects an out-of-contract count %p', async (bad) => {
    const { tx, client } = getTx();
    await enterAppScope(client, PARIWAR_A);
    await expect(reserveNames(tx, { pariwarId: PARIWAR_A, count: bad })).rejects.toBeInstanceOf(
      PoolNameReservationRangeError,
    );
  });
});

// ── The named launch invariant, end-to-end (story Task 4/7, per BigDev) ────────
describe.skipIf(!hasDatabase)('TWT-Bihar launch behavior — empty registry resolves to letter codes', () => {
  setupLiveDb();

  it('empty registry → every pool in the cycle displays its letter code, end-to-end', async () => {
    const { tx, client } = getTx();
    await enterAppScope(client, PARIWAR_A);

    // A realistic cycle freeze: 30 pools, and the registry is untouched (TWT-Bihar).
    const POOL_COUNT = 30;
    const reserved = await reserveNames(tx, { pariwarId: PARIWAR_A, count: POOL_COUNT });

    // The opt-out signal: no names, no error — the caller falls back to letter codes.
    expect(reserved).toEqual([]);

    const cycle = Array.from({ length: POOL_COUNT }, (_, i) => ({
      poolIndex: i,
      poolCanonicalIdentifier: formatPoolCanonicalIdentifier({ year: 2026, month: 5, sequence: i + 1 }),
    }));

    for (const p of cycle) {
      // This is how Story 7.3 will wire it: a reservation if one exists, else nothing.
      const name = reserved[p.poolIndex]?.displayNameEn;
      const display = resolvePoolDisplay(p, { pariwarCultureName: name });

      expect(display).toBe(poolLetterCode(p.poolIndex));
      expect(display).toMatch(/^[A-Z]+$/);
      expect(display).not.toBe('');
      expect(display).not.toBeNull();
      // The canonical identifier NEVER leaks onto a member surface.
      expect(display).not.toBe(p.poolCanonicalIdentifier);
      expect(display).not.toContain('P-2026');
    }

    // Spot-check the boundary the letter code exists to survive: pool 26 is AA, not '['.
    expect(resolvePoolDisplay(cycle[25]!, {})).toBe('Z');
    expect(resolvePoolDisplay(cycle[26]!, {})).toBe('AA');
  });

  it('a POPULATED registry overlays names on the same path (the future-tenant case)', async () => {
    const { tx, client } = getTx();
    await seedPoolName(tx, PARIWAR_A, 0, { displayNameEn: 'Alpha' });
    await seedPoolName(tx, PARIWAR_A, 1, { displayNameEn: 'Beta' });
    await enterAppScope(client, PARIWAR_A);

    const reserved = await reserveNames(tx, { pariwarId: PARIWAR_A, count: 2 });
    const cycle = [
      { poolIndex: 0, poolCanonicalIdentifier: 'P-2026-05-001' },
      { poolIndex: 1, poolCanonicalIdentifier: 'P-2026-05-002' },
    ];

    const displays = cycle.map((p) =>
      resolvePoolDisplay(p, { pariwarCultureName: reserved[p.poolIndex]?.displayNameEn }),
    );
    expect(displays).toEqual(['Alpha', 'Beta']);
  });
});
