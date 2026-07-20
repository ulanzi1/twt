// scripts/alert-state-invariant/check.ts
//
// alert-state-invariant CI gate (Story 8.1 AC5): `alerts.current_state` is a
// replay-derived cache writable ONLY by the event-replay projector. Scans
// packages/domain/src/**/*.ts and fails (exit 1, naming file + line) on any
// `alerts.current_state` write outside the projector allowlist. Twin of
// scripts/pool-state-invariant/check.ts.
//
// INVARIANT SCAN of packages/domain/src — NOT a git-diff (mirror pool-state-invariant /
// claim-state-invariant; NO fetch-depth: 0). Precision-scoped → self-green by construction
// (the ONLY file that writes alerts.current_state is the allowlisted projector; this gate's
// own fixtures live under scripts/).
//
// ⚠ Epic-5 retro H-1 heed ([[feedback_mechanization_split_commitment]] — "you can build the
// gate and still miss the target"): the SCAN_ROOT below MUST cover packages/domain/src, where
// alert/project.ts and any accidental writer live. The gate's teeth are proven by a known-bad
// fixture INSIDE this scanned discipline (lib.test.ts) — do NOT scope this to a narrower dir.
// D7 note: the alert lifecycle gets its OWN state-mutation gate (not a bolt-on to the pool
// support-category gate — that would be a vacuous green scan over a non-support-category surface).

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  type AllowlistEntry,
  type AlertStateWriteFinding,
  formatFinding,
  isAllowlistedWrite,
  scanAlertStateWrites,
} from './lib.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, '../..');
const SCAN_ROOT = 'packages/domain/src';

// The ONLY legitimate writer to the alerts cache pair (current_state + state_event_version):
// the event-replay projector's `projectAlertState` function. Allowlisted by FILE + FUNCTION
// NAME — not the whole file — so a future addition to project.ts (a debug helper, an unrelated
// bulk-repair function, anything) that writes the cache from a DIFFERENT function is still
// flagged. `mintAndOpenAlert` is NOT allowlisted: it delegates to projectAlertState and never
// writes the cache directly. A new legitimate writer must be a deliberate, reviewed addition
// here AND must set the app.alert_state_writer trigger guard.
const ALLOWLIST: readonly AllowlistEntry[] = [
  { file: 'packages/domain/src/alert/project.ts', functions: new Set(['projectAlertState']) },
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
  console.log('alert-state-invariant gate — alerts.current_state is projector-only (Story 8.1 AC5)\n');

  const absRoot = path.join(repoRoot, SCAN_ROOT);
  if (!fs.existsSync(absRoot)) {
    console.error(`✗ alert-state-invariant gate: scan root '${SCAN_ROOT}' not found`);
    process.exit(1);
  }

  const files: string[] = [];
  collectTsFiles(absRoot, files);
  files.sort();
  console.log(`▸ Scope — ${files.length} TypeScript file(s) under ${SCAN_ROOT}`);
  console.log(
    `▸ Allowlisted writer(s): ${ALLOWLIST.map((e) => `${e.file} (${[...e.functions].join(', ')})`).join(', ')}\n`,
  );

  const findings: AlertStateWriteFinding[] = [];
  for (const abs of files) {
    const rel = path.relative(repoRoot, abs).split(path.sep).join('/');
    const src = fs.readFileSync(abs, 'utf8');
    for (const finding of scanAlertStateWrites(rel, src)) {
      if (isAllowlistedWrite(finding, ALLOWLIST)) continue; // the projector's own guarded write
      findings.push(finding);
    }
  }

  console.log('▸ Findings');
  if (findings.length === 0) {
    console.log('  ✓ no code outside the projector writes alerts.current_state\n');
    console.log('✓ alert-state-invariant gate passed');
    return;
  }

  for (const f of findings) console.error(`  ✗ ${formatFinding(f)}`);
  console.error(
    `\n✗ alert-state-invariant gate FAILED with ${findings.length} finding(s).\n` +
      '  alerts.current_state is DERIVED from event replay (Story 8.1 AC5).\n' +
      '  A write outside the projector lets the cache diverge from the source of truth — the\n' +
      '  exact failure the DB trigger (migration 0078) blocks at runtime. Fix: route the change\n' +
      '  through alert.projectAlertState(...). See scripts/alert-state-invariant/README.md.',
  );
  process.exit(1);
}

try {
  main();
} catch (err: unknown) {
  console.error(
    `\n✗ alert-state-invariant gate ERRORED: ${err instanceof Error ? err.message : String(err)}`,
  );
  process.exit(1);
}
