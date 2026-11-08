// scripts/field-worker-move-request-invariant/check.ts
//
// field-worker-move-request-invariant CI gate (Story 13.1d AD2): `field_worker_move_requests` is written ONLY by its projector. Scans
// packages/domain/src, apps/api/src and apps/jobs/src and fails (exit 1, naming file + line) on any write outside the allowlist — AND on a
// scan that did not SEE both allowlisted writers write (no vacuous pass). See lib.ts for what is flagged.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { type AllowlistEntry, type MoveRequestWriteFinding, formatFinding, isAllowlistedWrite, scanMoveRequestWrites } from './lib.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, '../..');
const SCAN_ROOTS = ['packages/domain/src', 'apps/api/src', 'apps/jobs/src'];

// By FILE + FUNCTION (⛔ the whole file): a new writer is a deliberate addition here, and must set the trigger's writer setting.
const ALLOWLIST: readonly AllowlistEntry[] = [
  {
    file: 'packages/domain/src/field-worker/move-request-project.ts',
    functions: new Set(['projectMoveRequestOpened', 'projectMoveRequestTransition']),
  },
];

function collect(absDir: string, acc: string[]): void {
  for (const entry of fs.readdirSync(absDir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue;
    const abs = path.join(absDir, entry.name);
    if (entry.isDirectory()) collect(abs, acc);
    else if (entry.isFile() && /\.(ts|mts|cts|tsx)$/.test(entry.name) && !/\.d\.(ts|mts|cts)$/.test(entry.name)) acc.push(abs);
  }
}

function main(): void {
  console.log('field-worker-move-request-invariant gate — field_worker_move_requests is projector-only (Story 13.1d AD2)\n');
  const files: string[] = [];
  for (const root of SCAN_ROOTS) {
    const abs = path.join(repoRoot, root);
    if (!fs.existsSync(abs)) {
      console.error(`✗ scan root ${root} does not exist — the gate would pass vacuously`);
      process.exit(1);
    }
    collect(abs, files);
  }
  const all: MoveRequestWriteFinding[] = [];
  for (const abs of files) all.push(...scanMoveRequestWrites(path.relative(repoRoot, abs).split(path.sep).join('/'), fs.readFileSync(abs, 'utf8')));
  const violations = all.filter((f) => !isAllowlistedWrite(f, ALLOWLIST));
  // Non-vacuity: each allowlisted function must be SEEN writing (a raw write AND the writer setting).
  const missing: string[] = [];
  for (const a of ALLOWLIST) {
    for (const fn of a.functions) {
      const seen = all.filter((f) => f.file === a.file && f.enclosingFunction === fn);
      if (!seen.some((f) => f.detail.startsWith('raw SQL write')) || !seen.some((f) => f.detail.startsWith('the app.'))) missing.push(`${a.file} ${fn}`);
    }
  }
  console.log(`  scanned ${String(files.length)} files; ${String(all.length - violations.length)} allowlisted writes`);
  if (missing.length > 0) {
    console.error(`\n✗ the scan did not see these allowlisted writers write — it may be blind:\n  ${missing.join('\n  ')}`);
    process.exit(1);
  }
  if (violations.length > 0) {
    console.error(`\n✗ ${String(violations.length)} write(s) to field_worker_move_requests outside the projector:\n  ${violations.map(formatFinding).join('\n  ')}`);
    process.exit(1);
  }
  console.log('\n✓ field-worker-move-request-invariant gate passed');
}

main();
