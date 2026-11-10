// scripts/field-worker-move-request-invariant/check.ts
//
// field-worker-move-request-invariant CI gate (Story 13.1d AD2): `field_worker_move_requests` is written ONLY by its projector. Scans the
// `src`, `scripts` and `seed` of EVERY app and package, plus the root `scripts/` (not this gate's own folder), and fails (exit 1, naming file
// + line) on any write outside the allowlist — AND on a scan that did not SEE both allowlisted writers write (no vacuous pass). Test folders
// are not scanned: they write raw under `session_replication_role` on purpose. See lib.ts for what is flagged (code review CR32).

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  type AllowlistEntry,
  type MoveRequestWriteFinding,
  formatFinding,
  isAllowlistedWrite,
  scanMoveRequestWrites,
  unseenAllowlistedWriters,
} from './lib.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, '../..');
/** Roots that MUST exist — the projector lives in the first; a missing one would make the gate pass vacuously. */
const REQUIRED_ROOTS = ['packages/domain/src', 'apps/api/src', 'apps/jobs/src'];
/** Directories never read: dependencies and build output. Every OTHER dot-directory IS scanned (the reach-fence trap). */
const SKIP_DIRS = new Set(['node_modules', 'dist', '.git', '.turbo', '.next', '.cache']);

/** Every app's and package's `src` / `scripts` / `seed`, then the root `scripts/`. */
function scanRoots(): string[] {
  const roots: string[] = [];
  for (const group of ['apps', 'packages']) {
    const groupDir = path.join(repoRoot, group);
    if (!fs.existsSync(groupDir)) continue;
    for (const pkg of fs.readdirSync(groupDir, { withFileTypes: true })) {
      if (!pkg.isDirectory()) continue;
      for (const sub of ['src', 'scripts', 'seed']) {
        const dir = path.join(groupDir, pkg.name, sub);
        if (fs.existsSync(dir)) roots.push(dir);
      }
    }
  }
  roots.push(path.join(repoRoot, 'scripts'));
  return roots;
}

// By FILE + FUNCTION (⛔ the whole file): a new writer is a deliberate addition here, and must set the trigger's writer setting.
const ALLOWLIST: readonly AllowlistEntry[] = [
  {
    file: 'packages/domain/src/field-worker/move-request-project.ts',
    functions: new Set(['projectMoveRequestOpened', 'projectMoveRequestTransition']),
  },
];

function collect(absDir: string, acc: string[]): void {
  for (const entry of fs.readdirSync(absDir, { withFileTypes: true })) {
    if (SKIP_DIRS.has(entry.name)) continue;
    const abs = path.join(absDir, entry.name);
    if (abs === here) continue; // this gate's own folder: its test fixtures are the very SQL it looks for
    if (entry.isDirectory()) collect(abs, acc);
    else if (entry.isFile() && /\.(ts|mts|cts|tsx|js|mjs|cjs|jsx)$/.test(entry.name) && !/\.d\.(ts|mts|cts)$/.test(entry.name)) acc.push(abs);
  }
}

function main(): void {
  console.log('field-worker-move-request-invariant gate — field_worker_move_requests is projector-only (Story 13.1d AD2)\n');
  for (const root of REQUIRED_ROOTS) {
    if (!fs.existsSync(path.join(repoRoot, root))) {
      console.error(`✗ scan root ${root} does not exist — the gate would pass vacuously`);
      process.exit(1);
    }
  }
  const files: string[] = [];
  for (const abs of scanRoots()) collect(abs, files);
  const all: MoveRequestWriteFinding[] = [];
  for (const abs of files) all.push(...scanMoveRequestWrites(path.relative(repoRoot, abs).split(path.sep).join('/'), fs.readFileSync(abs, 'utf8')));
  const violations = all.filter((f) => !isAllowlistedWrite(f, ALLOWLIST));
  // Non-vacuity: each allowlisted function must be SEEN writing (a raw write AND the writer setting) — `unseenAllowlistedWriters`, lib.ts.
  const missing = unseenAllowlistedWriters(all, ALLOWLIST);
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
