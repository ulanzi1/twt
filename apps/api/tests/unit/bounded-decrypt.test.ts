// The shared Tier-1 decrypt bound + fan-out helper. Story 11b.2a (Task 4; AC3 / D4(a)). DB-FREE.
//
// ⭐ THE TWO PROPERTIES THAT MADE THIS SHARED RATHER THAN COPY-PASTED:
//   (1) the concurrency ceiling is REAL — never more than N promises in flight, whatever the input size;
//   (2) results land at the ITEM'S OWN INDEX, never in completion order. A completion-ordered result
//       silently shuffles a public directory page, which is the failure nobody would notice in review.
// Sharing only the CONSTANT and re-typing the helper would leave (2) hand-written twice — the drift
// class 11b.9's review already filed as insufficient.

import { PUBLIC_SURFACE_PAGE_SIZE_CAP } from '@twt/contracts';
import { describe, expect, it } from 'vitest';

import {
  DIRECTORY_DECRYPT_CONCURRENCY,
  mapWithConcurrency,
} from '../../src/modules/kyc/bounded-decrypt.js';

const tick = () => new Promise((r) => setTimeout(r, 0));

describe('mapWithConcurrency', () => {
  it('preserves INPUT order even when later items settle FIRST', async () => {
    // The adversarial case: item 0 is the slowest, so a completion-ordered implementation would put
    // it last. Reversed latency is the only shape that catches an `out.push(...)` regression.
    const items = [0, 1, 2, 3, 4, 5];
    const out = await mapWithConcurrency(items, 3, async (i) => {
      await new Promise((r) => setTimeout(r, (items.length - i) * 2));
      return `item-${i}`;
    });
    expect(out).toEqual(['item-0', 'item-1', 'item-2', 'item-3', 'item-4', 'item-5']);
  });

  it('never exceeds the concurrency ceiling, whatever the input size', async () => {
    let inFlight = 0;
    let peak = 0;
    await mapWithConcurrency(Array.from({ length: 50 }, (_, i) => i), 8, async () => {
      inFlight += 1;
      peak = Math.max(peak, inFlight);
      await tick();
      inFlight -= 1;
      return null;
    });
    expect(peak).toBeLessThanOrEqual(8);
    // And it is a REAL fan-out, not an accidental serialization dressed as one.
    expect(peak).toBeGreaterThan(1);
  });

  it('spawns no more workers than there are items', async () => {
    let peak = 0;
    let inFlight = 0;
    await mapWithConcurrency([1, 2], 8, async (n) => {
      inFlight += 1;
      peak = Math.max(peak, inFlight);
      await tick();
      inFlight -= 1;
      return n;
    });
    expect(peak).toBeLessThanOrEqual(2);
  });

  it('an EMPTY input resolves to an empty array and calls nothing', async () => {
    let calls = 0;
    const out = await mapWithConcurrency([], 8, async () => {
      calls += 1;
      return 1;
    });
    expect(out).toEqual([]);
    expect(calls).toBe(0);
  });

  // ── The `@throws {RangeError}` contract (second review pass) ────────────────────────────────────
  // It was documented with a rationale — "a silent 0-worker no-op is a worse failure mode" — and then
  // left untested, so deleting the guard kept the suite green. These are the four shapes that reach a
  // zero-worker `Array.from({length: Math.min(concurrency, items.length)})`.
  it.each([
    ['zero', 0],
    ['negative', -1],
    ['fractional', 1.5],
    ['NaN', Number.NaN],
  ])('rejects a %s concurrency with RangeError rather than silently processing nothing', async (_label, bad) => {
    await expect(mapWithConcurrency([1, 2, 3], bad, async (n) => n)).rejects.toThrow(RangeError);
  });

  it('a valid concurrency LARGER than the input is fine — only non-positive integers are rejected', async () => {
    await expect(mapWithConcurrency([1, 2], 999, async (n) => n)).resolves.toEqual([1, 2]);
  });

  it('every index is filled on the resolving path — no holes reach a caller typed `R[]`', async () => {
    // The caller's guard is `row !== null`; `undefined` passes it and the type predicate then asserts
    // `undefined is ConfirmedContributorRow`. This pins that a resolved array is fully populated, so a
    // future non-throwing early exit fails HERE rather than serialising `undefined` onto the wire.
    const out = await mapWithConcurrency([1, 2, 3, 4, 5], 2, async (n) => (n % 2 === 0 ? null : n));
    expect(out).toHaveLength(5);
    expect(out.every((v) => v !== undefined)).toBe(true);
    expect(Object.keys(out)).toHaveLength(5); // ⛔ not sparse
  });

  it('a rejection inside `fn` propagates — per-item degradation is the CALLER\'s job', async () => {
    // Documented on purpose: the confirmed-contributor render fail-softs ONE row by catching inside
    // `fn`. If this helper ever swallowed rejections instead, that catch would look redundant and a
    // later pass would delete it, turning one skipped row into a silently-wrong list.
    await expect(
      mapWithConcurrency([1, 2, 3], 2, async (n) => {
        if (n === 2) throw new Error('boom');
        return n;
      }),
    ).rejects.toThrow('boom');
  });
});

describe('DIRECTORY_DECRYPT_CONCURRENCY', () => {
  it('is a real, small, positive ceiling', () => {
    expect(Number.isInteger(DIRECTORY_DECRYPT_CONCURRENCY)).toBe(true);
    expect(DIRECTORY_DECRYPT_CONCURRENCY).toBeGreaterThan(0);
    // A ceiling that exceeds a page is not a ceiling — compare against the REAL cap (Review fix:
    // this used to hardcode `50`, so raising the cap wouldn't have failed this test).
    expect(DIRECTORY_DECRYPT_CONCURRENCY).toBeLessThan(PUBLIC_SURFACE_PAGE_SIZE_CAP);
  });
});

describe('⛔ ONE implementation, ⛔ not two reconciled by a comment (AC3)', () => {
  it('public-pages and member-pool both IMPORT the shared module — neither declares its own', async () => {
    const { readFile } = await import('node:fs/promises');
    const sites = [
      new URL('../../src/modules/public-pages/handlers.ts', import.meta.url),
      new URL('../../src/modules/member-pool/handlers.ts', import.meta.url),
    ];
    for (const site of sites) {
      const source = await readFile(site, 'utf8');
      expect(source).toMatch(/from\s+'(\.\.\/)+kyc\/bounded-decrypt\.js'/);
      // The regression this catches: someone re-adds a local copy "just for this module" — indented,
      // exported, `var`-declared, or written as a function expression all still count (Review fix:
      // the original guard only matched an unindented, non-exported `const`/`let` and the
      // `function` keyword form at start-of-line).
      expect(source).not.toMatch(/^\s*(export\s+)?(const|let|var)\s+DIRECTORY_DECRYPT_CONCURRENCY\s*=/m);
      expect(source).not.toMatch(
        /^\s*(export\s+)?(async\s+function\s+mapWithConcurrency\b|(const|let|var)\s+mapWithConcurrency\s*=)/m,
      );
    }
  });
});
