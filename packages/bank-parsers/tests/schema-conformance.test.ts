// Schema-conformance guard — Story 9.2 (Task 1 last subtask, AC3).
//
// "All parser outputs conform" (architecture §3.6 L2249): every entry every parser emits
// over the full golden corpus MUST validate against the canonical @twt/domain
// `BankStatementEntry` .strict() schema — one shape regardless of source bank. Homed in
// bank-parsers (not domain) to keep the dependency direction bank-parsers → domain
// (never the reverse). This is the structural teeth behind "one canonical record shape".

import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { bankStatement } from '@twt/domain';
import { parseStatement } from '../src/index.js';

const { BankStatementEntry } = bankStatement;
const BANKS = ['sbi', 'pnb', 'bob', 'boi', 'cooperative'] as const;
const biharRoot = join(dirname(fileURLToPath(import.meta.url)), '..', 'bihar');

describe('every parser output conforms to the canonical BankStatementEntry schema', () => {
  for (const bank of BANKS) {
    it(`${bank}: all golden entries validate .strict()`, () => {
      const goldenDir = join(biharRoot, bank, 'golden');
      const csvs = readdirSync(goldenDir).filter((f) => f.endsWith('.csv'));
      let validated = 0;
      for (const csv of csvs) {
        const input = readFileSync(join(goldenDir, csv));
        const { entries } = parseStatement('bihar', bank, input);
        for (const entry of entries) {
          // Throws on any nonconformance (wrong type, extra key, bad enum, non-ISO date).
          BankStatementEntry.parse(entry);
          validated++;
        }
      }
      expect(validated).toBeGreaterThan(0);
    });
  }
});
