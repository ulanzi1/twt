// scripts/helpdesk-state-invariant/check.ts
//
// helpdesk-state-invariant CI gate (Story 10.1 AC4): `helpdesk_tickets.current_state` is a
// replay-derived cache writable ONLY by the event-replay projector. Scans packages/domain/src/**/*.ts
// and fails (exit 1, naming file + line) on any write outside the projector allowlist. Twin of
// scripts/alert-state-invariant/check.ts.
//
// ⚠ The SCAN_ROOT MUST cover packages/domain/src, where helpdesk/project.ts and any accidental writer
// live (the Epic-5 retro H-1 heed — "build the gate and still miss the target"). Teeth proven by a
// known-bad fixture inside this scanned discipline (lib.test.ts). The helpdesk lifecycle gets its OWN
// state-mutation gate (not a bolt-on to another primitive's gate — a vacuous green scan proves nothing).

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  type AllowlistEntry,
  type HelpdeskStateWriteFinding,
  formatFinding,
  isAllowlistedWrite,
  scanHelpdeskStateWrites,
} from './lib.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, '../..');
const SCAN_ROOT = 'packages/domain/src';

// The ONLY legitimate writer to the cache pair (current_state + state_event_version): the event-replay
// projector's `projectTicketGenesis`. Allowlisted by FILE + FUNCTION NAME (not the whole file) so a
// future addition to project.ts that writes the cache from a DIFFERENT function is still flagged. A new
// legitimate writer (e.g. a transition projector for 10.2/10.4) must be a deliberate addition HERE AND
// must set the app.helpdesk_state_writer trigger guard.
const ALLOWLIST: readonly AllowlistEntry[] = [
  { file: 'packages/domain/src/helpdesk/project.ts', functions: new Set(['projectTicketGenesis']) },
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
  console.log('helpdesk-state-invariant gate — helpdesk_tickets.current_state is projector-only (Story 10.1 AC4)\n');

  const absRoot = path.join(repoRoot, SCAN_ROOT);
  if (!fs.existsSync(absRoot)) {
    console.error(`✗ helpdesk-state-invariant gate: scan root '${SCAN_ROOT}' not found`);
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
      `✗ helpdesk-state-invariant gate: only found ${String(files.length)} file(s) under '${SCAN_ROOT}' ` +
        `(expected at least ${String(MIN_EXPECTED_FILES)}) — SCAN_ROOT looks misconfigured or moved; ` +
        'refusing to report a vacuous pass',
    );
    process.exit(1);
  }

  console.log(`▸ Scope — ${files.length} TypeScript file(s) under ${SCAN_ROOT}`);
  console.log(
    `▸ Allowlisted writer(s): ${ALLOWLIST.map((e) => `${e.file} (${[...e.functions].join(', ')})`).join(', ')}\n`,
  );

  const findings: HelpdeskStateWriteFinding[] = [];
  for (const abs of files) {
    const rel = path.relative(repoRoot, abs).split(path.sep).join('/');
    const src = fs.readFileSync(abs, 'utf8');
    for (const finding of scanHelpdeskStateWrites(rel, src)) {
      if (isAllowlistedWrite(finding, ALLOWLIST)) continue; // the projector's own guarded write
      findings.push(finding);
    }
  }

  console.log('▸ Findings');
  if (findings.length === 0) {
    console.log('  ✓ no code outside the projector writes helpdesk_tickets.current_state\n');
    console.log('✓ helpdesk-state-invariant gate passed');
    return;
  }

  for (const f of findings) console.error(`  ✗ ${formatFinding(f)}`);
  console.error(
    `\n✗ helpdesk-state-invariant gate FAILED with ${findings.length} finding(s).\n` +
      '  helpdesk_tickets.current_state is DERIVED from event replay (Story 10.1 AC4).\n' +
      '  A write outside the projector lets the cache diverge from the source of truth — the exact\n' +
      '  failure the DB trigger (migration 0084) blocks at runtime. Fix: route the change through\n' +
      '  helpdesk.projectTicketGenesis(...).',
  );
  process.exit(1);
}

try {
  main();
} catch (err: unknown) {
  console.error(
    `\n✗ helpdesk-state-invariant gate ERRORED: ${err instanceof Error ? err.message : String(err)}`,
  );
  process.exit(1);
}
