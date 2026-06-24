// scripts/domain-accessor-invariants/check.ts
//
// domain-accessor-invariants CI gate — family (a): the forced-pagination clamp.
// Scans packages/domain/src/**/*.ts and fails (exit 1, naming file + line) on any
// dynamic `.limit(...)` that is not `clampLimit(...)` or an integer literal.
//
// Families (b) collection-input domain guards and (c) read-then-write FOR UPDATE +
// typed-conflict + re-read are CONVENTION + required-test (NOT statically gated —
// they are judgment calls a heuristic lint would false-positive on). See
// docs/domain-accessor-invariants.md.
//
// INVARIANT SCAN of packages/domain/src — NOT a git-diff (mirror schema-diff /
// microcopy; NO fetch-depth: 0). Precision-scoped → self-green by construction
// (only domain src is read; this gate's own fixtures live under scripts/).

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { type LimitFinding, formatFinding, scanLimitInvariant } from './lib.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, '../..');
const SCAN_ROOT = 'packages/domain/src';

function collectTsFiles(absDir: string, acc: string[]): void {
  for (const entry of fs.readdirSync(absDir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue;
    const abs = path.join(absDir, entry.name);
    if (entry.isDirectory()) collectTsFiles(abs, acc);
    else if (entry.isFile() && entry.name.endsWith('.ts') && !entry.name.endsWith('.d.ts')) {
      acc.push(abs);
    }
  }
}

function main(): void {
  console.log(
    'domain-accessor-invariants gate — family (a) forced-pagination clamp (Story 1.14)\n',
  );

  const absRoot = path.join(repoRoot, SCAN_ROOT);
  if (!fs.existsSync(absRoot)) {
    console.error(`✗ domain-accessor-invariants gate: scan root '${SCAN_ROOT}' not found`);
    process.exit(1);
  }

  const files: string[] = [];
  collectTsFiles(absRoot, files);
  files.sort();
  console.log(`▸ Scope — ${files.length} TypeScript file(s) under ${SCAN_ROOT}\n`);

  const findings: LimitFinding[] = [];
  for (const abs of files) {
    const rel = path.relative(repoRoot, abs).split(path.sep).join('/');
    findings.push(...scanLimitInvariant(rel, fs.readFileSync(abs, 'utf8')));
  }

  console.log('▸ Findings');
  if (findings.length === 0) {
    console.log(
      '  ✓ every dynamic .limit(...) routes through clampLimit() (or is a fixed integer bound)\n',
    );
    console.log('✓ domain-accessor-invariants gate passed');
    return;
  }

  for (const f of findings) console.error(`  ✗ ${formatFinding(f)}`);
  console.error(
    `\n✗ domain-accessor-invariants gate FAILED with ${findings.length} finding(s).\n` +
      '  A caller-supplied LIMIT must be clamped to [1, cap]: an unbounded limit drains a\n' +
      '  connection, and a negative limit is a Postgres `LIMIT -1` pagination bypass (2.7 P2).\n' +
      '  Fix: .limit(clampLimit(opts.limit, { default: N, cap: 200 })). See docs/domain-accessor-invariants.md.',
  );
  process.exit(1);
}

try {
  main();
} catch (err: unknown) {
  console.error(
    `\n✗ domain-accessor-invariants gate ERRORED: ${err instanceof Error ? err.message : String(err)}`,
  );
  process.exit(1);
}
