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

import { type MemberStateWriteFinding, formatFinding, scanMemberStateWrites } from './lib.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, '../..');
const SCAN_ROOT = 'packages/domain/src';

// The ONLY legitimate writer to members.state (the event-replay projector). Relative
// to repoRoot, forward-slashed. A new legitimate writer must be a deliberate,
// reviewed addition here AND must set the app.member_state_writer trigger guard.
const ALLOWLIST = new Set<string>(['packages/domain/src/member/project.ts']);

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
  for (const abs of files) {
    const rel = path.relative(repoRoot, abs).split(path.sep).join('/');
    if (ALLOWLIST.has(rel)) continue; // the projector is the one legitimate writer
    findings.push(...scanMemberStateWrites(rel, fs.readFileSync(abs, 'utf8')));
  }

  console.log('▸ Findings');
  if (findings.length === 0) {
    console.log('  ✓ no code outside the projector writes members.state\n');
    console.log('✓ member-state-invariant gate passed');
    return;
  }

  for (const f of findings) console.error(`  ✗ ${formatFinding(f)}`);
  console.error(
    `\n✗ member-state-invariant gate FAILED with ${findings.length} finding(s).\n` +
      '  members.state is DERIVED from event replay (architectural-freeze row 2). A write\n' +
      '  outside the projector lets the cache diverge from the source of truth — the exact\n' +
      '  failure the DB trigger (migration 0018) blocks at runtime. Fix: route the state\n' +
      '  change through member.projectMemberState(...). See scripts/member-state-invariant/README.md.',
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
