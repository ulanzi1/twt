// scripts/pool-support-category-invariant/check.ts
//
// pool-support-category-invariant CI gate (Story 7.1 AC4): the pool engine has NO
// death-specific branches — every path keys on the `support_category` enum, never a
// hardcoded `'death'`/`'death_support'` string. Scans the POOL-ENGINE surface and fails
// (exit 1, naming file + line) on any `death` string match outside the enum definition
// file. Twin of scripts/benefit-mechanism/ (the enum-tag scan model).
//
// ── SCOPE (heed [[feedback_gate_scope_semantic_coverage]] + the per-epic scope tax) ──
// The scan is scoped to the POOL-ENGINE surface, NOT all of packages/domain/src: the
// death-CLAIM subsystem (claim/*, schema/claims.ts) legitimately says "death" everywhere,
// so an all-domain scan would be all false positives. The invariant is about the POOL
// engine being category-agnostic. As pool-engine code lands in apps/* / other packages
// (Story 7.3 spawn saga, 7.5+ payment), those roots MUST be ADDED here — the standing
// per-epic scope-extension convention ([[project_access_wrapper_gate_pending_scope]]).
// The gate's TEETH are proven by a known-bad fixture in lib.test.ts (a `=== 'death'`
// branch → RED); a green scan over new files alone proves nothing.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { type DeathBranchFinding, formatFinding, scanDeathBranches } from './lib.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, '../..');

// The POOL-ENGINE surface (relative to repoRoot). Directories are walked recursively;
// explicit files are scanned as-is. ADD new pool-engine roots here as they land.
const SCAN_DIRS = ['packages/domain/src/pool', 'packages/domain/src/snapshot-adapters'];
const SCAN_FILES = ['packages/domain/src/schema/pools.ts', 'packages/domain/src/schema/pool_snapshots.ts'];

// The ONLY legitimate home for the `death_support` literal — the enum DEFINITION file
// (AC4 "outside the enum definition file"). Everything else in the pool engine reads the
// category from POOL_SUPPORT_CATEGORIES / the enum, never a literal.
const ALLOWLIST = new Set<string>(['packages/domain/src/schema/pools.ts']);

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
  console.log('pool-support-category-invariant gate — pool engine has NO death branches (Story 7.1 AC4)\n');

  const absFiles: string[] = [];
  for (const dir of SCAN_DIRS) {
    const absDir = path.join(repoRoot, dir);
    if (fs.existsSync(absDir)) collectTsFiles(absDir, absFiles);
  }
  for (const file of SCAN_FILES) {
    const absFile = path.join(repoRoot, file);
    if (fs.existsSync(absFile)) absFiles.push(absFile);
  }
  absFiles.sort();

  console.log(`▸ Scope — ${absFiles.length} pool-engine TypeScript file(s)`);
  console.log(`  dirs:  ${SCAN_DIRS.join(', ')}`);
  console.log(`  files: ${SCAN_FILES.join(', ')}`);
  console.log(`▸ Allowlisted (enum definition): ${[...ALLOWLIST].join(', ')}\n`);

  const findings: DeathBranchFinding[] = [];
  for (const abs of absFiles) {
    const rel = path.relative(repoRoot, abs).split(path.sep).join('/');
    if (ALLOWLIST.has(rel)) continue; // the enum definition file
    findings.push(...scanDeathBranches(rel, fs.readFileSync(abs, 'utf8')));
  }

  console.log('▸ Findings');
  if (findings.length === 0) {
    console.log('  ✓ no death literal in pool-engine code outside the enum definition\n');
    console.log('✓ pool-support-category-invariant gate passed');
    return;
  }

  for (const f of findings) console.error(`  ✗ ${formatFinding(f)}`);
  console.error(
    `\n✗ pool-support-category-invariant gate FAILED with ${findings.length} finding(s).\n` +
      "  The pool engine must operate on the support_category enum, never a hardcoded 'death'\n" +
      '  string (Story 7.1 AC4). Fix: read the category from POOL_SUPPORT_CATEGORIES / the enum.\n' +
      '  See scripts/pool-support-category-invariant/README.md.',
  );
  process.exit(1);
}

try {
  main();
} catch (err: unknown) {
  console.error(
    `\n✗ pool-support-category-invariant gate ERRORED: ${err instanceof Error ? err.message : String(err)}`,
  );
  process.exit(1);
}
