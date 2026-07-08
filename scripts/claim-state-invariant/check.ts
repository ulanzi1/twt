// scripts/claim-state-invariant/check.ts
//
// claim-state-invariant CI gate (Story 6.1 AC3): `claims.current_state` is a
// replay-derived cache writable ONLY by the event-replay projector. Scans
// packages/domain/src/**/*.ts and fails (exit 1, naming file + line) on any
// `claims.current_state` write outside the projector allowlist. Twin of
// scripts/member-state-invariant/check.ts.
//
// INVARIANT SCAN of packages/domain/src — NOT a git-diff (mirror member-state-
// invariant / domain-accessor-invariants / schema-diff; NO fetch-depth: 0).
// Precision-scoped → self-green by construction (the ONLY file that writes
// claims.current_state is the allowlisted projector; this gate's own fixtures live
// under scripts/).
//
// ⚠ Epic-5 retro H-1 heed ([[feedback_mechanization_split_commitment]] — "you can
// build the gate and still miss the target"): the SCAN_ROOT below MUST cover
// packages/domain/src, where claim/project.ts and any accidental writer live. The
// gate's teeth are proven by a known-bad fixture INSIDE this scanned discipline
// (lib.test.ts) — do NOT scope this to a narrower directory.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { type ClaimStateWriteFinding, formatFinding, scanClaimStateWrites } from './lib.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, '../..');
const SCAN_ROOT = 'packages/domain/src';

// The ONLY legitimate writer to claims.current_state (the event-replay projector).
// Relative to repoRoot, forward-slashed. A new legitimate writer must be a deliberate,
// reviewed addition here AND must set the app.claim_state_writer trigger guard.
const ALLOWLIST = new Set<string>(['packages/domain/src/claim/project.ts']);

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
  console.log('claim-state-invariant gate — claims.current_state is projector-only (Story 6.1 AC3)\n');

  const absRoot = path.join(repoRoot, SCAN_ROOT);
  if (!fs.existsSync(absRoot)) {
    console.error(`✗ claim-state-invariant gate: scan root '${SCAN_ROOT}' not found`);
    process.exit(1);
  }

  const files: string[] = [];
  collectTsFiles(absRoot, files);
  files.sort();
  console.log(`▸ Scope — ${files.length} TypeScript file(s) under ${SCAN_ROOT}`);
  console.log(`▸ Allowlisted writer(s): ${[...ALLOWLIST].join(', ')}\n`);

  const findings: ClaimStateWriteFinding[] = [];
  for (const abs of files) {
    const rel = path.relative(repoRoot, abs).split(path.sep).join('/');
    if (ALLOWLIST.has(rel)) continue; // projector-only claims.current_state
    const src = fs.readFileSync(abs, 'utf8');
    findings.push(...scanClaimStateWrites(rel, src));
  }

  console.log('▸ Findings');
  if (findings.length === 0) {
    console.log('  ✓ no code outside the projector writes claims.current_state\n');
    console.log('✓ claim-state-invariant gate passed');
    return;
  }

  for (const f of findings) console.error(`  ✗ ${formatFinding(f)}`);
  console.error(
    `\n✗ claim-state-invariant gate FAILED with ${findings.length} finding(s).\n` +
      '  claims.current_state is DERIVED from event replay (architectural-freeze row 2).\n' +
      '  A write outside the projector lets the cache diverge from the source of truth — the\n' +
      '  exact failure the DB trigger (migration 0051) blocks at runtime. Fix: route the change\n' +
      '  through claim.projectClaimState(...). See scripts/claim-state-invariant/README.md.',
  );
  process.exit(1);
}

try {
  main();
} catch (err: unknown) {
  console.error(
    `\n✗ claim-state-invariant gate ERRORED: ${err instanceof Error ? err.message : String(err)}`,
  );
  process.exit(1);
}
