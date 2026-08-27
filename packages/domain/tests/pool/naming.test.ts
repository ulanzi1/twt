// Pool naming — pure, DB-free unit tests (Story 7.2, Tasks 1/2/4; AC1/AC2/AC3).
//
// Covers the three PURE halves of the naming service:
//   · poolLetterCode              — bijective base-26 (the N > 26 trap)
//   · formatPoolCanonicalIdentifier — the `P-YYYY-MM-###` grammar
//   · resolvePoolDisplay / poolAuditIdentifier — the dual-representation resolver
//
// The transactional allocator (allocateCanonicalIdentifierRange) + the registry
// reservation (reserveNames) are IO and live in the integration specs.

import { describe, expect, it } from 'vitest';

import {
  MAX_POOL_INDEX,
  MAX_POOL_LETTER_CODE_LENGTH,
  POOL_CANONICAL_IDENTIFIER_CONSTRAINT,
  PoolCanonicalIdentifierCollisionError,
  PoolLetterCodeDecodeError,
  PoolLetterCodeRangeError,
  formatPoolCanonicalIdentifier,
  isPoolCanonicalIdentifierConflict,
  poolAuditIdentifier,
  poolIndexFromLetterCode,
  poolIndexFromLetterCodeOrNull,
  poolLetterCode,
  resolvePoolDisplay,
} from '../../src/pool/naming.js';

describe('poolLetterCode — bijective base-26 (AC2)', () => {
  // The exact boundary set from the story AC + the adversarial review: a naïve
  // `String.fromCharCode(65 + poolIndex)` passes 0..25 and BREAKS at 26 ('[').
  it.each([
    [0, 'A'],
    [1, 'B'],
    [25, 'Z'],
    [26, 'AA'],
    [27, 'AB'],
    [51, 'AZ'],
    [52, 'BA'],
    [701, 'ZZ'],
    [702, 'AAA'],
  ])('poolIndex %i → %s', (index, expected) => {
    expect(poolLetterCode(index)).toBe(expected);
  });

  it('does NOT break past Z: every index in 0..1000 is a non-empty A–Z string', () => {
    for (let i = 0; i <= 1000; i += 1) {
      expect(poolLetterCode(i)).toMatch(/^[A-Z]+$/);
    }
  });

  it('is injective (no collisions) across 0..1000 — the mapping is a bijection', () => {
    const seen = new Set<string>();
    for (let i = 0; i <= 1000; i += 1) seen.add(poolLetterCode(i));
    expect(seen.size).toBe(1001);
  });

  it('is monotonic in width then lexicographic order (A < … < Z < AA < AB)', () => {
    // Width grows only at the 26/702 boundaries; within a width the codes ascend.
    expect(poolLetterCode(25).length).toBe(1);
    expect(poolLetterCode(26).length).toBe(2);
    expect(poolLetterCode(701).length).toBe(2);
    expect(poolLetterCode(702).length).toBe(3);
    for (let i = 1; i <= 1000; i += 1) {
      const prev = poolLetterCode(i - 1);
      const cur = poolLetterCode(i);
      if (prev.length === cur.length) expect(prev < cur).toBe(true);
      else expect(cur.length).toBe(prev.length + 1);
    }
  });

  it('is deterministic: the same index always yields the same code', () => {
    expect(poolLetterCode(9_999)).toBe(poolLetterCode(9_999));
  });

  // Typed error, NOT silent coercion (the story's explicit instruction).
  it.each([[-1], [1.5], [Number.NaN], [Number.POSITIVE_INFINITY]])(
    'rejects invalid poolIndex %p with PoolLetterCodeRangeError',
    (bad) => {
      expect(() => poolLetterCode(bad)).toThrow(PoolLetterCodeRangeError);
    },
  );
});

// ── poolIndexFromLetterCode — the INVERSE (Story 11b.1 AC3 / D2(a)) ──────────────────
//
// ⭐ ADDED BY THE 2026-08-27 REVIEW. The letter-code half of the Sahyog Drive's pool-code
// filter shipped with ZERO tests at any layer, and `poolIndexFromLetterCode` had no test
// anywhere in the repo — while `poolLetterCode` above carries an explicit "the obvious
// implementation passes every test up to 25" warning. The first review pass NAMED this gap
// ("No test (domain or API integration) exercises a letter-code lookup") and the row was
// checked off with the gap still open.

describe('poolIndexFromLetterCode — the inverse of poolLetterCode', () => {
  it.each([
    ['A', 0],
    ['B', 1],
    ['Z', 25],
    ['AA', 26],
    ['AB', 27],
    ['AZ', 51],
    ['BA', 52],
    ['ZZ', 701],
    ['AAA', 702],
  ])('decodes %s to %i', (code, index) => {
    expect(poolIndexFromLetterCode(code)).toBe(index);
  });

  // ⭐ THE PROPERTY THE WHOLE FILTER RESTS ON, asserted rather than assumed: the pair is a
  // BIJECTION. A round-trip failure anywhere here means a member who reads "Pool F" on their
  // card cannot find Pool F in the public index.
  it('round-trips poolLetterCode for every index across the base-26 boundaries', () => {
    for (let i = 0; i <= 800; i += 1) {
      expect(poolIndexFromLetterCode(poolLetterCode(i))).toBe(i);
    }
  });

  it.each(['', 'a', 'A1', 'P-2026-08-001', 'AB ', '-'])(
    'throws PoolLetterCodeDecodeError on %o',
    (bad) => {
      expect(() => poolIndexFromLetterCode(bad)).toThrow(PoolLetterCodeDecodeError);
    },
  );

  // ⛔ THE int4 OVERFLOW. `pools.pool_index` is `integer`, and drizzle BINDS the decoded value,
  // so Postgres resolves the parameter to int4 and raises `22003` — an unauthenticated 500,
  // reproduced live against the test container before this bound existed.
  it('refuses a code longer than MAX_POOL_LETTER_CODE_LENGTH', () => {
    const tooLong = 'A'.repeat(MAX_POOL_LETTER_CODE_LENGTH + 1);
    expect(() => poolIndexFromLetterCode(tooLong)).toThrow(PoolLetterCodeDecodeError);
  });

  it('every code at the maximum length still decodes inside int4', () => {
    const widest = 'Z'.repeat(MAX_POOL_LETTER_CODE_LENGTH);
    expect(poolIndexFromLetterCode(widest)).toBeLessThanOrEqual(MAX_POOL_INDEX);
  });
});

describe('poolIndexFromLetterCodeOrNull — the TOTAL form an untrusted caller must use', () => {
  it('agrees with the strict form on every valid code', () => {
    for (let i = 0; i <= 800; i += 1) {
      const code = poolLetterCode(i);
      expect(poolIndexFromLetterCodeOrNull(code)).toBe(poolIndexFromLetterCode(code));
    }
  });

  // ⭐ A PUBLIC SEARCH BOX IS NOT A PROGRAMMING ERROR. A visitor typing an ordinary word into
  // the Sahyog Drive's drive-code field is asking a question; the honest answer is "no drive
  // matches", ⛔ never a 500. `LUCKNOW` is 7 letters and decodes past int4.
  it.each(['LUCKNOW', 'AAAAAAA', 'ZZZZZZZ', 'AAAAAAAA', 'A'.repeat(64)])(
    'returns null rather than throwing or overflowing for %o',
    (word) => {
      expect(poolIndexFromLetterCodeOrNull(word)).toBeNull();
    },
  );

  it.each(['', 'a', 'p-2026-08-001', 'A1', '  '])('returns null for the non-code %o', (bad) => {
    expect(poolIndexFromLetterCodeOrNull(bad)).toBeNull();
  });

  it('never returns a value outside int4 range', () => {
    for (const code of ['A', 'Z', 'ZZ', 'ZZZ', 'ZZZZ', 'ZZZZZ', 'ZZZZZZ']) {
      const index = poolIndexFromLetterCodeOrNull(code);
      expect(index).not.toBeNull();
      expect(index!).toBeGreaterThanOrEqual(0);
      expect(index!).toBeLessThanOrEqual(MAX_POOL_INDEX);
    }
  });
});

describe('formatPoolCanonicalIdentifier — the P-YYYY-MM-### grammar (AC1)', () => {
  it('formats the UX reference example: 2026-05 seq 1 → P-2026-05-001', () => {
    expect(formatPoolCanonicalIdentifier({ year: 2026, month: 5, sequence: 1 })).toBe('P-2026-05-001');
  });

  it('zero-pads the month and the sequence to their fixed widths', () => {
    expect(formatPoolCanonicalIdentifier({ year: 2026, month: 12, sequence: 42 })).toBe('P-2026-12-042');
    expect(formatPoolCanonicalIdentifier({ year: 2026, month: 1, sequence: 999 })).toBe('P-2026-01-999');
  });

  it('WIDENS past 999 rather than overflowing or truncating (the ### boundary)', () => {
    expect(formatPoolCanonicalIdentifier({ year: 2026, month: 5, sequence: 1000 })).toBe('P-2026-05-1000');
    expect(formatPoolCanonicalIdentifier({ year: 2026, month: 5, sequence: 12_345 })).toBe('P-2026-05-12345');
  });

  it('is deterministic and reads the clock for nothing', () => {
    const once = formatPoolCanonicalIdentifier({ year: 2026, month: 5, sequence: 7 });
    const twice = formatPoolCanonicalIdentifier({ year: 2026, month: 5, sequence: 7 });
    expect(once).toBe(twice);
  });

  it('accepts a per-Pariwar format override (v1 TWT-Bihar passes the default)', () => {
    expect(
      formatPoolCanonicalIdentifier({ year: 2026, month: 5, sequence: 3 }, 'POOL/YYYY/MM/###'),
    ).toBe('POOL/2026/05/003');
  });

  it.each([
    [{ year: 2026, month: 0, sequence: 1 }],
    [{ year: 2026, month: 13, sequence: 1 }],
    [{ year: 2026, month: 5, sequence: 0 }],
    [{ year: 2026, month: 5.5, sequence: 1 }],
    [{ year: -1, month: 5, sequence: 1 }],
  ])('rejects out-of-range input %p', (bad) => {
    expect(() => formatPoolCanonicalIdentifier(bad)).toThrow();
  });

  it.each([
    ['P-YYYY-YYYY-MM-###'], // a repeated token
    ['P-YYYY-MM'], // missing '###'
    ['P-MM-###'], // missing 'YYYY'
  ])('rejects a malformed format string %p rather than silently leaving a token unfilled', (bad) => {
    expect(() => formatPoolCanonicalIdentifier({ year: 2026, month: 5, sequence: 1 }, bad)).toThrow();
  });
});

describe('isPoolCanonicalIdentifierConflict — the 23505 race backstop (AC1)', () => {
  it('recognizes a real unique-violation on the canonical-identifier constraint', () => {
    const err = new Error('duplicate key value violates unique constraint');
    (err as unknown as { cause: unknown }).cause = {
      code: '23505',
      constraint: POOL_CANONICAL_IDENTIFIER_CONSTRAINT,
    };
    expect(isPoolCanonicalIdentifierConflict(err)).toBe(true);
  });

  it('rejects a 23505 on a DIFFERENT constraint (not this backstop)', () => {
    const err = new Error('duplicate key value violates unique constraint');
    (err as unknown as { cause: unknown }).cause = { code: '23505', constraint: 'some_other_uq' };
    expect(isPoolCanonicalIdentifierConflict(err)).toBe(false);
  });

  it.each([
    [new Error('unrelated failure')],
    ['not an error at all'],
    [null],
    [undefined],
  ])('rejects non-conflict input %p', (notAConflict) => {
    expect(isPoolCanonicalIdentifierConflict(notAConflict)).toBe(false);
  });

  it('PoolCanonicalIdentifierCollisionError carries the pariwar + identifier for the 7.3 retry path', () => {
    const err = new PoolCanonicalIdentifierCollisionError('pariwar-1', 'P-2026-05-001');
    expect(err.pariwarId).toBe('pariwar-1');
    expect(err.identifier).toBe('P-2026-05-001');
    expect(err.message).toContain('P-2026-05-001');
  });
});

describe('resolvePoolDisplay — dual representation (AC3)', () => {
  const pool = { poolIndex: 5, poolCanonicalIdentifier: 'P-2026-05-006' };

  it('audit/system/regulator surfaces resolve the CANONICAL identifier', () => {
    expect(poolAuditIdentifier(pool)).toBe('P-2026-05-006');
  });

  // ── The named TWT-Bihar launch invariant (story Task 4, per BigDev) ──────────
  it('empty registry (TWT-Bihar launch) falls back to the letter code', () => {
    const display = resolvePoolDisplay(pool, {});
    expect(display).toBe('F'); // poolIndex 5 → F
    expect(display).not.toBe('');
    expect(display).not.toBeNull();
    // The canonical identifier must NEVER leak onto a member surface.
    expect(display).not.toContain('P-2026');
  });

  it('empty registry: EVERY pool in a cycle resolves to its letter code, never blank/null/canonical', () => {
    // The whole-cycle assertion: TWT-Bihar spawns N pools with no registry names.
    const cycle = Array.from({ length: 40 }, (_, i) => ({
      poolIndex: i,
      poolCanonicalIdentifier: formatPoolCanonicalIdentifier({ year: 2026, month: 5, sequence: i + 1 }),
    }));
    for (const p of cycle) {
      const display = resolvePoolDisplay(p, {});
      expect(display).toBe(poolLetterCode(p.poolIndex));
      expect(display).toMatch(/^[A-Z]+$/);
      expect(display).not.toBe(p.poolCanonicalIdentifier);
    }
  });

  it('a supplied registry culture-name overlays the letter code (a future tenant)', () => {
    expect(resolvePoolDisplay(pool, { pariwarCultureName: 'अर्जुन' })).toBe('अर्जुन');
  });

  it('an absent/blank culture-name falls back to the letter code (never a blank display)', () => {
    expect(resolvePoolDisplay(pool, { pariwarCultureName: undefined })).toBe('F');
    expect(resolvePoolDisplay(pool, { pariwarCultureName: '' })).toBe('F');
    expect(resolvePoolDisplay(pool, { pariwarCultureName: '   ' })).toBe('F');
  });

  it('is stable: the same pool always resolves to the same display (never remapped)', () => {
    expect(resolvePoolDisplay(pool, {})).toBe(resolvePoolDisplay(pool, {}));
    expect(poolAuditIdentifier(pool)).toBe(poolAuditIdentifier(pool));
  });
});
