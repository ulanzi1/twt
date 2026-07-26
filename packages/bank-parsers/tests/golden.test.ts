// Golden-file regression test — Story 9.2 (Task 3, AC2/AC4).
//
// For all 250 committed golden files (50 × 5 banks): `parseStatement(bank, input.csv)`
// deep-equals the committed `input.expected.json`. This is the regression corpus — a
// parser or format change that alters output FAILS here until `golden:regen` is run and
// the diff reviewed (AC4 teeth). Inputs are read as Buffers so the encoding heuristic is
// exercised exactly as the runtime parser sees it.

import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { parseStatement } from '../src/index.js';

const BANKS = ['sbi', 'pnb', 'bob', 'boi', 'cooperative'] as const;
const biharRoot = join(dirname(fileURLToPath(import.meta.url)), '..', 'bihar');

describe('golden-file regression corpus', () => {
  for (const bank of BANKS) {
    const goldenDir = join(biharRoot, bank, 'golden');
    const csvs = readdirSync(goldenDir)
      .filter((f) => f.endsWith('.csv'))
      .sort();

    describe(`${bank} (${csvs.length} golden files)`, () => {
      it('has exactly 50 golden files (coverage matrix, not padding)', () => {
        expect(csvs).toHaveLength(50);
      });

      for (const csv of csvs) {
        it(`${csv} → matches expected.json`, () => {
          const input = readFileSync(join(goldenDir, csv)); // Buffer — exercises decode
          const expected = JSON.parse(
            readFileSync(join(goldenDir, csv.replace(/\.csv$/, '.expected.json')), 'utf8'),
          ) as unknown;
          const actual = parseStatement('bihar', bank, input);
          // JSON round-trip normalizes readonly arrays to plain arrays for structural compare.
          expect(JSON.parse(JSON.stringify(actual))).toEqual(expected);
        });
      }
    });
  }
});
