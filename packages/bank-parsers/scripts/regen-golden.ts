// Golden EXPECTED-OUTPUT regenerator — Story 9.2 (Task 3, AC4).
//
// Reads every committed `bihar/<bank>/golden/*.csv` (the fixed input corpus authored by
// gen-golden-inputs.ts), runs the registered parser, and (re)writes the sibling
// `*.expected.json`. This is the AC4 workflow: a bank format change ⇒ bump the parser ⇒
// `golden:regen` ⇒ REVIEW THE DIFF ⇒ CI re-greens. Without regeneration, the golden test
// fails on drift (that is the regression teeth).
//
//   Run:  pnpm --filter @twt/bank-parsers golden:regen
//
// Inputs are read as Buffers so the encoding heuristic (UTF-8 / UTF-8-BOM / latin1) is
// exercised exactly as the runtime parser sees it.

import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { parseStatement } from '../src/index.js';

const BANKS = ['sbi', 'pnb', 'bob', 'boi', 'cooperative'] as const;

function main(): void {
  const here = dirname(fileURLToPath(import.meta.url));
  const pkgRoot = join(here, '..');
  let total = 0;

  for (const bank of BANKS) {
    const goldenDir = join(pkgRoot, 'bihar', bank, 'golden');
    const csvs = readdirSync(goldenDir)
      .filter((f) => f.endsWith('.csv'))
      .sort();
    for (const csv of csvs) {
      const input = readFileSync(join(goldenDir, csv)); // Buffer — exercises decode
      const result = parseStatement('bihar', bank, input);
      const outPath = join(goldenDir, csv.replace(/\.csv$/, '.expected.json'));
      writeFileSync(outPath, JSON.stringify(result, null, 2) + '\n', 'utf8');
      total++;
    }
    console.log(`regenerated ${csvs.length} expected outputs → bihar/${bank}/golden/`);
  }
  console.log(`total: ${total} golden expected files`);
}

main();
