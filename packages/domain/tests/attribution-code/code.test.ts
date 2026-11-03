// The attribution-code generator and format — DB-free unit tests (Story 13.2, Task 3; AC3; AT5).

import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import {
  ATTRIBUTION_CODE_DENYLIST,
  ATTRIBUTION_CODE_LENGTH,
  ATTRIBUTION_CODE_PATTERN,
  generateAttributionCode,
  isDenylistedAttributionCode,
} from '../../src/attribution-code/code.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const MODULE_DIR = path.resolve(here, '../../src/attribution-code');

describe('generateAttributionCode (AC3)', () => {
  it('over 20,000 draws: every draw is six ASCII digits, none is deny-listed, and a leading zero is reachable', () => {
    let leadingZero = 0;
    for (let i = 0; i < 20_000; i += 1) {
      const code = generateAttributionCode();
      expect(code).toMatch(/^[0-9]{6}$/);
      expect(isDenylistedAttributionCode(code)).toBe(false);
      if (code.startsWith('0')) leadingZero += 1;
    }
    // P(no leading zero in 20,000 uniform draws) = 0.9^20000 ≈ 0.
    expect(leadingZero).toBeGreaterThan(0);
  });

  it('never uses Math.random anywhere in the module (comments stripped)', () => {
    const files = readdirSync(MODULE_DIR).filter((f) => f.endsWith('.ts'));
    expect(files.length).toBeGreaterThanOrEqual(7);
    for (const f of files) {
      const src = readFileSync(path.join(MODULE_DIR, f), 'utf8')
        .replace(/\/\*[\s\S]*?\*\//g, '')
        .replace(/\/\/.*$/gm, '');
      expect(src, f).not.toMatch(/Math\s*\.\s*random/);
    }
    expect(readFileSync(path.join(MODULE_DIR, 'code.ts'), 'utf8')).toMatch(/import \{ randomInt \} from 'node:crypto'/);
  });
});

describe('the format and the deny-list (AT5)', () => {
  it('the pattern is exactly six ASCII digits', () => {
    expect(ATTRIBUTION_CODE_LENGTH).toBe(6);
    for (const ok of ['000001', '012346', '999998']) expect(ATTRIBUTION_CODE_PATTERN.test(ok)).toBe(true);
    for (const bad of ['12345', '1234567', '12345a', ' 12345', '१२३४५६', '١٢٣٤٥٦', '']) {
      expect(ATTRIBUTION_CODE_PATTERN.test(bad), bad).toBe(false);
    }
  });

  it('the deny-list is the twenty guessable codes, frozen', () => {
    const repdigits = Array.from({ length: 10 }, (_, d) => String(d).repeat(6));
    const runs = ['012345', '123456', '234567', '345678', '456789'];
    // The five reverses: 543210, 654321, 765432, 876543, 987654.
    const reverses = runs.map((r) => [...r].reverse().join(''));
    expect([...ATTRIBUTION_CODE_DENYLIST].sort()).toEqual([...repdigits, ...runs, ...reverses].sort());
    expect(ATTRIBUTION_CODE_DENYLIST).toHaveLength(20);
    expect(Object.isFrozen(ATTRIBUTION_CODE_DENYLIST)).toBe(true);
    for (const c of ATTRIBUTION_CODE_DENYLIST) expect(isDenylistedAttributionCode(c)).toBe(true);
    expect(isDenylistedAttributionCode('123457')).toBe(false);
  });
});
