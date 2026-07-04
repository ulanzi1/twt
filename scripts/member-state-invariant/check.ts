// scripts/member-state-invariant/check.ts
//
// member-state-invariant CI gate (Story 3.1 AC2): `members.state` is a replay-derived
// cache writable ONLY by the event-replay projector. Scans packages/domain/src/**/*.ts
// and fails (exit 1, naming file + line) on any `members.state` write outside the
// projector allowlist.
//
// INVARIANT SCAN of packages/domain/src — NOT a git-diff (mirror domain-accessor-
// invariants / schema-diff / microcopy; NO fetch-depth: 0). Precision-scoped →
// self-green by construction (the ONLY file that writes members.state is the
// allowlisted projector; this gate's own fixtures live under scripts/).

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  type MemberStateWriteFinding,
  formatFinding,
  formatProjectionFinding,
  scanMemberSearchProjectionWrites,
  scanMemberStateWrites,
} from './lib.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, '../..');
const SCAN_ROOT = 'packages/domain/src';

// The ONLY legitimate writer to members.state (the event-replay projector). Relative
// to repoRoot, forward-slashed. A new legitimate writer must be a deliberate,
// reviewed addition here AND must set the app.member_state_writer trigger guard.
const ALLOWLIST = new Set<string>(['packages/domain/src/member/project.ts']);

// The ONLY legitimate writer to member_search_projection (the AR-65 read-model refresh, called by the
// projector). Story 4.7 D1 refinement ii. A new legitimate writer must be a deliberate, reviewed
// addition here AND must set the app.member_search_projection_writer trigger guard.
const PROJECTION_ALLOWLIST = new Set<string>(['packages/domain/src/member/search-projection.ts']);

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
  console.log('member-state-invariant gate — members.state is projector-only (Story 3.1 AC2)\n');

  const absRoot = path.join(repoRoot, SCAN_ROOT);
  if (!fs.existsSync(absRoot)) {
    console.error(`✗ member-state-invariant gate: scan root '${SCAN_ROOT}' not found`);
    process.exit(1);
  }

  const files: string[] = [];
  collectTsFiles(absRoot, files);
  files.sort();
  console.log(`▸ Scope — ${files.length} TypeScript file(s) under ${SCAN_ROOT}`);
  console.log(`▸ Allowlisted writer(s): ${[...ALLOWLIST].join(', ')}\n`);

  const findings: MemberStateWriteFinding[] = [];
  const projectionFindings: MemberStateWriteFinding[] = [];
  for (const abs of files) {
    const rel = path.relative(repoRoot, abs).split(path.sep).join('/');
    const src = fs.readFileSync(abs, 'utf8');
    if (!ALLOWLIST.has(rel)) findings.push(...scanMemberStateWrites(rel, src)); // projector-only members.state
    if (!PROJECTION_ALLOWLIST.has(rel)) {
      projectionFindings.push(...scanMemberSearchProjectionWrites(rel, src)); // projector-only read model
    }
  }

  console.log('▸ Findings');
  if (findings.length === 0 && projectionFindings.length === 0) {
    console.log('  ✓ no code outside the projector writes members.state\n');
    console.log('  ✓ no code outside the refresh writer writes member_search_projection\n');
    console.log('✓ member-state-invariant gate passed');
    return;
  }

  for (const f of findings) console.error(`  ✗ ${formatFinding(f)}`);
  for (const f of projectionFindings) console.error(`  ✗ ${formatProjectionFinding(f)}`);
  console.error(
    `\n✗ member-state-invariant gate FAILED with ${findings.length + projectionFindings.length} finding(s).\n` +
      '  members.state + member_search_projection are DERIVED from event replay (architectural-freeze\n' +
      '  row 2). A write outside the projector lets the cache diverge from the source of truth — the\n' +
      '  exact failure the DB triggers (migrations 0018 / 0035) block at runtime. Fix: route the change\n' +
      '  through member.projectMemberState(...). See scripts/member-state-invariant/README.md.',
  );
  process.exit(1);
}

try {
  main();
} catch (err: unknown) {
  console.error(
    `\n✗ member-state-invariant gate ERRORED: ${err instanceof Error ? err.message : String(err)}`,
  );
  process.exit(1);
}
