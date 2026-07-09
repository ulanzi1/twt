// scripts/claim-canonical-id-invariant/check.ts
//
// claim-canonical-id-invariant CI gate (Story 6.4 AC6/AC8): downstream flows reference the
// canonical `claim_case_id` ONLY — never the temporary `intake_attempt_id`. Scans the downstream-
// flow roots below and fails (exit 1, naming file + line) on any reference to the intake-attempt
// id. Twin of scripts/claim-state-invariant/check.ts.
//
// INVARIANT SCAN of the downstream roots — NOT a git-diff (mirror claim-state-invariant / member-
// state-invariant; NO fetch-depth: 0). Precision-scoped → self-green by construction (the scanned
// roots key on claim_case_id; the ICP's own files are OUTSIDE these roots and are never scanned).
//
// ⚠ Epic-5 retro H-1 heed ([[feedback_mechanization_split_commitment]] — "you can build the gate
// and still miss the target"): DOWNSTREAM_ROOTS must AIM at where downstream callers live/will
// live. Verification / appeal / publication are FUTURE stories (6.6+, 6.16, 11b) — those roots do
// not exist yet, so the gate logs them as "not present (future)" rather than silently covering
// nothing (no silent cap — [[feedback_closure_language_precision]]). The notification surfaces
// (Story 5.1 alerts/notifications) DO exist and are scanned for real today. The gate's teeth are
// proven by a known-bad fixture in lib.test.ts regardless of whether real downstream callers exist.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { type CanonicalIdFinding, formatFinding, scanCanonicalIdViolations } from './lib.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, '../..');

// The downstream-flow roots (repo-relative, forward-slashed). A downstream flow references
// claim_case_id ONLY. Present roots are scanned; absent (future-story) roots are logged, not
// silently skipped. Add a new downstream root here as its story lands.
const DOWNSTREAM_ROOTS: readonly string[] = [
  // Notification (Story 5.1) — alerts carry claim_case_id in provenance_refs, never the attempt id.
  'packages/contracts/src/alerts',
  'packages/contracts/src/notifications',
  'apps/mobile/components/notifications',
  // Verification (Stories 6.6/6.7/6.10/6.11) — FUTURE.
  'apps/api/src/modules/verification',
  'packages/domain/src/verification',
  // Appeal (Story 6.16) — FUTURE.
  'apps/api/src/modules/appeals',
  'packages/domain/src/appeal',
  // Publication (Epic 11b Sahyog Vivran) — FUTURE.
  'apps/api/src/modules/publication',
  'packages/domain/src/publication',
];

function collectTsFiles(absDir: string, acc: string[]): void {
  for (const entry of fs.readdirSync(absDir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue;
    const abs = path.join(absDir, entry.name);
    if (entry.isDirectory()) collectTsFiles(abs, acc);
    else if (
      entry.isFile() &&
      (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx')) &&
      !entry.name.endsWith('.d.ts')
    ) {
      acc.push(abs);
    }
  }
}

function main(): void {
  console.log(
    'claim-canonical-id-invariant gate — downstream flows key on claim_case_id only (Story 6.4 AC6/AC8)\n',
  );

  const present: string[] = [];
  const absent: string[] = [];
  const files: string[] = [];
  for (const root of DOWNSTREAM_ROOTS) {
    const abs = path.join(repoRoot, root);
    if (fs.existsSync(abs)) {
      present.push(root);
      collectTsFiles(abs, files);
    } else {
      absent.push(root);
    }
  }
  files.sort();

  console.log(`▸ Downstream roots scanned (present): ${present.length ? present.join(', ') : '(none)'}`);
  console.log(
    `▸ Downstream roots not present yet (future stories — coverage grows as they land): ${
      absent.length ? absent.join(', ') : '(none)'
    }`,
  );
  console.log(`▸ Scope — ${files.length} TypeScript file(s) across the present roots\n`);

  const findings: CanonicalIdFinding[] = [];
  for (const abs of files) {
    const rel = path.relative(repoRoot, abs).split(path.sep).join('/');
    const src = fs.readFileSync(abs, 'utf8');
    findings.push(...scanCanonicalIdViolations(rel, src));
  }

  console.log('▸ Findings');
  if (findings.length === 0) {
    console.log('  ✓ no downstream flow references the intake_attempt_id\n');
    console.log('✓ claim-canonical-id-invariant gate passed');
    return;
  }

  for (const f of findings) console.error(`  ✗ ${formatFinding(f)}`);
  console.error(
    `\n✗ claim-canonical-id-invariant gate FAILED with ${findings.length} finding(s).\n` +
      '  Post-convergence the ONLY canonical id is claim_case_id (Story 6.4 AC6/AC7/AC8). A downstream\n' +
      '  flow keyed on the temporary intake_attempt_id would resurrect a hidden secondary id the ICP\n' +
      '  discards. Fix: take claim_case_id. See scripts/claim-canonical-id-invariant/README.md.',
  );
  process.exit(1);
}

try {
  main();
} catch (err: unknown) {
  console.error(
    `\n✗ claim-canonical-id-invariant gate ERRORED: ${err instanceof Error ? err.message : String(err)}`,
  );
  process.exit(1);
}
