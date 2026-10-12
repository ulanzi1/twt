// scripts/dlt-typed-variables/check.ts
//
// dlt-typed-variables CI gate (Story 6.34 AC6; TV7 / `2026-10-12-322` C2): every SMS template's variables are typed
// for TRAI — ⛔ a typed tag in registered text, and the marker / its identifier / the template-id key prefix only in
// the shape-tested registries. Scans the TRACKED `.ts` / `.tsx` files under `apps/*/src/**` and `packages/*/src/**`
// (rules i–iii) and `docs/launch-gate-inventory/*.md` (rule i), and fails (exit 1, naming file + line + rule).
//
// INVARIANT SCAN of the tracked tree — NOT a git-diff (mirror kyc-provider-boundary; NO fetch-depth: 0). ⚠ "Tracked"
// ⇒ a NEW registry file must be `git add`-ed before this gate sees it (else the coverage check fails).

import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { REGISTRY_FILES, checkScanCoverage, formatFinding, scanDltText, type DltFinding } from './lib.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, '..', '..');

/** `:(glob)` — `*` stays inside one path segment and `**` crosses them (a bare `apps/*\/src` would match ⛔ file). */
const SOURCE_PATHSPECS = [':(glob)apps/*/src/**', ':(glob)packages/*/src/**'];
const SHEET_PATHSPECS = [':(glob)docs/launch-gate-inventory/*.md'];

function tracked(pathspecs: readonly string[]): string[] {
  const out = execFileSync('git', ['ls-files', '-z', '--', ...pathspecs], { cwd: repoRoot, encoding: 'utf8' });
  return out.split('\0').filter((f) => f !== '');
}

function main(): void {
  console.log("dlt-typed-variables gate — every SMS template's variables are typed for TRAI (Story 6.34 AC6)\n");

  const sources = tracked(SOURCE_PATHSPECS)
    .filter((f) => (f.endsWith('.ts') || f.endsWith('.tsx')) && !f.endsWith('.d.ts'))
    .filter((f) => fs.existsSync(path.join(repoRoot, f)))
    .sort();
  const sheets = tracked(SHEET_PATHSPECS)
    .filter((f) => fs.existsSync(path.join(repoRoot, f)))
    .sort();

  console.log(`▸ Registry files (${REGISTRY_FILES.length}): ${REGISTRY_FILES.join(', ')}`);
  console.log(`▸ Scope — ${sources.length} tracked source file(s), ${sheets.length} registration sheet(s)\n`);

  const coverage = checkScanCoverage(sources, sheets);
  const findings: DltFinding[] = [];
  for (const rel of [...sources, ...sheets]) {
    findings.push(...scanDltText(rel, fs.readFileSync(path.join(repoRoot, rel), 'utf8')));
  }

  console.log('▸ Findings');
  if (coverage.length === 0 && findings.length === 0) {
    console.log('  ✓ ⛔ typed tag in registered text; the marker and the template-id keys only in the registries\n');
    console.log('✓ dlt-typed-variables gate passed');
    return;
  }

  for (const p of coverage) console.error(`  ✗ [coverage] ${p}`);
  for (const f of findings) console.error(`  ✗ ${formatFinding(f)}`);
  console.error(
    `\n✗ dlt-typed-variables gate FAILED with ${coverage.length + findings.length} problem(s).\n` +
      '  On STPL\'s SmartPing portal the registered text keeps the untyped marker and each variable\'s TRAI type is\n' +
      '  declared beside it (`slots`, checked by `checkDltTemplateShape`). Fix: keep templates in a shape-tested registry\n' +
      '  listed in REGISTRY_FILES; spell types WITHOUT braces outside registered text. See scripts/dlt-typed-variables/README.md.',
  );
  process.exit(1);
}

try {
  main();
} catch (err: unknown) {
  console.error(`\n✗ dlt-typed-variables gate ERRORED: ${err instanceof Error ? err.message : String(err)}`);
  process.exit(1);
}
