// scripts/marketplace-module-state-invariant/check.ts
//
// marketplace-module-state-invariant CI gate (Story 12.1 I1): `marketplace_modules`' six projected
// columns are a replay-derived cache writable ONLY by the event-replay projector. Scans
// packages/domain/src/**/*.ts and fails (exit 1, naming file + line) on any write outside the projector
// allowlist. Twin of scripts/helpdesk-state-invariant/check.ts.
//
// ⚠ The SCAN_ROOT MUST cover packages/domain/src, where marketplace/project.ts and any accidental writer
// live (the Epic-5 retro H-1 heed — "build the gate and still miss the target"). Teeth proven by the
// known-bad fixtures in lib.test.ts. The module lifecycle gets its OWN gate (⛔ a bolt-on to another
// primitive's gate — a vacuous green scan proves nothing).

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  type AllowlistEntry,
  type MarketplaceModuleStateWriteFinding,
  formatFinding,
  isAllowlistedWrite,
  scanMarketplaceModuleStateWrites,
} from './lib.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, '../..');
const SCAN_ROOT = 'packages/domain/src';

// The legitimate writers of the six projected columns: the event-replay projector's
// `projectModuleGenesis` (the genesis INSERT) + `projectModuleTransition` (every transition's UPDATE).
// Allowlisted by FILE + FUNCTION NAME (⛔ the whole file) so a future addition to project.ts that writes
// from a DIFFERENT function — or from an inner named helper — is still flagged. Each new legitimate writer
// must be a deliberate addition HERE AND must set the app.marketplace_module_state_writer trigger guard
// (migration 0193's trigger is independent of this static gate — the guard is necessary for the trigger
// but ⛔ sufficient for this allowlist).
const ALLOWLIST: readonly AllowlistEntry[] = [
  {
    file: 'packages/domain/src/marketplace/project.ts',
    functions: new Set(['projectModuleGenesis', 'projectModuleTransition']),
  },
];

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
    'marketplace-module-state-invariant gate — marketplace_modules projected columns are projector-only (Story 12.1 I1)\n',
  );

  const absRoot = path.join(repoRoot, SCAN_ROOT);
  if (!fs.existsSync(absRoot)) {
    console.error(`✗ marketplace-module-state-invariant gate: scan root '${SCAN_ROOT}' not found`);
    process.exit(1);
  }

  const files: string[] = [];
  collectTsFiles(absRoot, files);
  files.sort();

  // A misconfigured/moved SCAN_ROOT would silently scan ~0 files, log 0 findings, and exit 0 — a
  // vacuous pass indistinguishable from a real clean scan. Fail loud instead (packages/domain/src
  // has 375+ files at authoring time; 50 is a generous floor with room for reorganization).
  const MIN_EXPECTED_FILES = 50;
  if (files.length < MIN_EXPECTED_FILES) {
    console.error(
      `✗ marketplace-module-state-invariant gate: only found ${String(files.length)} file(s) under '${SCAN_ROOT}' ` +
        `(expected at least ${String(MIN_EXPECTED_FILES)}) — SCAN_ROOT looks misconfigured or moved; ` +
        'refusing to report a vacuous pass',
    );
    process.exit(1);
  }

  console.log(`▸ Scope — ${files.length} TypeScript file(s) under ${SCAN_ROOT}`);
  console.log(
    `▸ Allowlisted writer(s): ${ALLOWLIST.map((e) => `${e.file} (${[...e.functions].join(', ')})`).join(', ')}\n`,
  );

  const findings: MarketplaceModuleStateWriteFinding[] = [];
  for (const abs of files) {
    const rel = path.relative(repoRoot, abs).split(path.sep).join('/');
    const src = fs.readFileSync(abs, 'utf8');
    for (const finding of scanMarketplaceModuleStateWrites(rel, src)) {
      if (isAllowlistedWrite(finding, ALLOWLIST)) continue; // the projector's own guarded write
      findings.push(finding);
    }
  }

  console.log('▸ Findings');
  if (findings.length === 0) {
    console.log('  ✓ no code outside the projector writes a marketplace_modules projected column\n');
    console.log('✓ marketplace-module-state-invariant gate passed');
    return;
  }

  for (const f of findings) console.error(`  ✗ ${formatFinding(f)}`);
  console.error(
    `\n✗ marketplace-module-state-invariant gate FAILED with ${findings.length} finding(s).\n` +
      "  marketplace_modules' projected columns are DERIVED from event replay (Story 12.1 I1).\n" +
      '  A write outside the projector lets the cache diverge from the source of truth — the exact\n' +
      '  failure the DB trigger (migration 0193) blocks at runtime. Fix: route the change through a\n' +
      '  marketplace.* command.',
  );
  process.exit(1);
}

try {
  main();
} catch (err: unknown) {
  console.error(
    `\n✗ marketplace-module-state-invariant gate ERRORED: ${err instanceof Error ? err.message : String(err)}`,
  );
  process.exit(1);
}
