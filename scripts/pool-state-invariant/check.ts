// scripts/pool-state-invariant/check.ts
//
// pool-state-invariant CI gate (Story 7.1 AC5): `pools.current_state` is a
// replay-derived cache writable ONLY by the event-replay projector. Scans
// packages/domain/src/**/*.ts and fails (exit 1, naming file + line) on any
// `pools.current_state` write outside the projector allowlist. Twin of
// scripts/claim-state-invariant/check.ts.
//
// INVARIANT SCAN of packages/domain/src — NOT a git-diff (mirror claim-state-
// invariant / member-state-invariant; NO fetch-depth: 0). Precision-scoped →
// self-green by construction (the ONLY file that writes pools.current_state is the
// allowlisted projector; this gate's own fixtures live under scripts/).
//
// ⚠ Epic-5 retro H-1 heed ([[feedback_mechanization_split_commitment]] — "you can
// build the gate and still miss the target"): the SCAN_ROOT below MUST cover
// packages/domain/src, where pool/project.ts and any accidental writer live. The
// gate's teeth are proven by a known-bad fixture INSIDE this scanned discipline
// (lib.test.ts) — do NOT scope this to a narrower directory.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  type AllowlistEntry,
  type PoolStateWriteFinding,
  formatFinding,
  isAllowlistedWrite,
  scanPoolStateWrites,
} from './lib.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, '../..');
const SCAN_ROOT = 'packages/domain/src';

// The ONLY legitimate writer to the pools cache pair (current_state + state_event_
// version): the event-replay projector's `projectPoolState` function. Allowlisted by
// FILE + FUNCTION NAME — not the whole file — so a future addition to project.ts
// (a debug helper, an unrelated bulk-repair function, anything) that writes the cache
// from a DIFFERENT function is still flagged. A new legitimate writer must be a
// deliberate, reviewed addition here AND must set the app.pool_state_writer trigger
// guard.
const ALLOWLIST: readonly AllowlistEntry[] = [
  { file: 'packages/domain/src/pool/project.ts', functions: new Set(['projectPoolState']) },
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
  console.log('pool-state-invariant gate — pools.current_state is projector-only (Story 7.1 AC5)\n');

  const absRoot = path.join(repoRoot, SCAN_ROOT);
  if (!fs.existsSync(absRoot)) {
    console.error(`✗ pool-state-invariant gate: scan root '${SCAN_ROOT}' not found`);
    process.exit(1);
  }

  const files: string[] = [];
  collectTsFiles(absRoot, files);
  files.sort();
  console.log(`▸ Scope — ${files.length} TypeScript file(s) under ${SCAN_ROOT}`);
  console.log(
    `▸ Allowlisted writer(s): ${ALLOWLIST.map((e) => `${e.file} (${[...e.functions].join(', ')})`).join(', ')}\n`,
  );

  const findings: PoolStateWriteFinding[] = [];
  for (const abs of files) {
    const rel = path.relative(repoRoot, abs).split(path.sep).join('/');
    const src = fs.readFileSync(abs, 'utf8');
    for (const finding of scanPoolStateWrites(rel, src)) {
      if (isAllowlistedWrite(finding, ALLOWLIST)) continue; // the projector's own guarded write
      findings.push(finding);
    }
  }

  console.log('▸ Findings');
  if (findings.length === 0) {
    console.log('  ✓ no code outside the projector writes pools.current_state\n');
    console.log('✓ pool-state-invariant gate passed');
    return;
  }

  for (const f of findings) console.error(`  ✗ ${formatFinding(f)}`);
  console.error(
    `\n✗ pool-state-invariant gate FAILED with ${findings.length} finding(s).\n` +
      '  pools.current_state is DERIVED from event replay (Story 7.1 AC5).\n' +
      '  A write outside the projector lets the cache diverge from the source of truth — the\n' +
      '  exact failure the DB trigger (migration 0071) blocks at runtime. Fix: route the change\n' +
      '  through pool.projectPoolState(...). See scripts/pool-state-invariant/README.md.',
  );
  process.exit(1);
}

try {
  main();
} catch (err: unknown) {
  console.error(
    `\n✗ pool-state-invariant gate ERRORED: ${err instanceof Error ? err.message : String(err)}`,
  );
  process.exit(1);
}
