// scripts/pool-bound-payment-invariant/check.ts
//
// pool-bound-payment-invariant CI gate (Story 7.6 AC3.9-3.12): the facilitated-recovery INVARIANT. No
// API endpoint / handler exists that takes a `(wrong-pool-payment, target-pool)` pair and modifies
// records — a wrong-pool deposit is NEVER silently remapped / auto-reassigned / moved (that breaks
// deterministic assignment + audit lineage). The only sanctioned alteration is the ≥2-trustee
// attestable-correction seam; the only allowed write is to the wrong-pool record ITSELF. Scans the
// pool/contribution/reconciliation/helpdesk surface + fails (exit 1, naming file + line) on any
// cross-pool remap function. Twin of scripts/pool-state-invariant/check.ts (TS-AST scan, self-green).
//
// ── SCOPE + the STANDING per-epic scope-extension convention ([[project_access_wrapper_gate_pending_scope]]) ──
// Today only the pool-engine domain surface exists (packages/domain/src/pool — where contribution-binding.ts
// lives). The contribution / reconciliation / helpdesk consumers are RESERVED for Epic 8/9/10 (the
// contributions/ + reconciliation/ + helpdesk/ dirs). As each lands, its root MUST be ADDED to SCAN_DIRS
// below — the recurring per-epic scope tax ([[feedback_gate_scope_semantic_coverage]]: a gate that does
// not cover the new surface silently under-protects). The DEFERRED roots to add are listed in
// DEFERRED_SCOPE so the next author cannot miss them. The gate's TEETH are proven by a known-bad fixture
// in lib.test.ts (a `remap(payment, targetPool)` that writes → RED); a green scan over new files proves nothing.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { type CrossPoolRemapFinding, formatFinding, scanCrossPoolRemap } from './lib.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, '../..');

// The surface in scope TODAY (relative to repoRoot), walked recursively. contribution-binding.ts is
// covered by the pool/ walk. ADD each new consumer root here as Epic 8/9/10 land it.
// Story 9.8 (code review) ADDED the reconciliation-review surface: the trustee facilitate-recovery action
// (D7) is exactly the kind of "leaves the case open, touches no record" handler this gate must prove never
// grows a remap primitive — the prior scan-scope gap made the story's own "gate stays GREEN" claim vacuous
// ([[feedback_gate_scope_semantic_coverage]]).
const SCAN_DIRS = [
  'packages/domain/src/pool',
  'packages/contracts/src/pools',
  'packages/domain/src/reconciliation',
  'packages/contracts/src/reconciliation',
  'apps/api/src/modules/reconciliation-review',
];

// The DEFERRED roots the per-epic scope-extension convention requires future stories to ADD to SCAN_DIRS
// as they land (documented so it is not forgotten — the standing convention, not dead config):
//   · Epic 8  — apps/mobile <UPIIntentButton> + apps/api contribution-intent handlers
//   · Epic 9  — the contributions record writer (packages/domain/src/contribution — the wrong-pool RECORD
//     itself; the reconciliation matcher + review-queue surface are now in SCAN_DIRS above, Story 9.8)
//   · Epic 10 — the helpdesk console handlers + ticket model
const DEFERRED_SCOPE = [
  'Epic 8: apps/api contribution-intent handlers + apps/mobile UPIIntentButton',
  'Epic 9: contributions record writer (packages/domain/src/contribution)',
  'Epic 10: helpdesk console handlers + ticket model',
];

function collectTsFiles(absDir: string, acc: string[]): void {
  for (const entry of fs.readdirSync(absDir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue;
    const abs = path.join(absDir, entry.name);
    if (entry.isDirectory()) collectTsFiles(abs, acc);
    else if (
      entry.isFile() &&
      (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx')) &&
      !entry.name.endsWith('.d.ts') &&
      !entry.name.endsWith('.test.ts') &&
      !entry.name.endsWith('.test.tsx') &&
      !entry.name.endsWith('.spec.ts') &&
      !entry.name.endsWith('.spec.tsx')
    ) {
      // .tsx is admitted so the deferred Epic-8/10 roots (apps/mobile <UPIIntentButton>, the helpdesk
      // console — DEFERRED_SCOPE below) are scanned when added, not silently skipped (Story 7.6
      // code-review finding). scanCrossPoolRemap infers ScriptKind from the file extension.
      acc.push(abs);
    }
  }
}

function main(): void {
  console.log('pool-bound-payment-invariant gate — no cross-pool remap surface (Story 7.6 AC3)\n');

  const absFiles: string[] = [];
  for (const dir of SCAN_DIRS) {
    const absDir = path.join(repoRoot, dir);
    if (fs.existsSync(absDir)) collectTsFiles(absDir, absFiles);
  }
  absFiles.sort();

  console.log(`▸ Scope — ${absFiles.length} file(s)`);
  console.log(`  dirs: ${SCAN_DIRS.join(', ')}`);
  console.log(`▸ Deferred scope (ADD as Epic 8/9/10 land — the per-epic scope-extension convention):`);
  for (const d of DEFERRED_SCOPE) console.log(`    · ${d}`);
  console.log('');

  const findings: CrossPoolRemapFinding[] = [];
  for (const abs of absFiles) {
    const rel = path.relative(repoRoot, abs).split(path.sep).join('/');
    findings.push(...scanCrossPoolRemap(rel, fs.readFileSync(abs, 'utf8')));
  }

  console.log('▸ Findings');
  if (findings.length === 0) {
    console.log('  ✓ no cross-pool remap surface exists\n');
    console.log('✓ pool-bound-payment-invariant gate passed');
    return;
  }

  for (const f of findings) console.error(`  ✗ ${formatFinding(f)}`);
  console.error(
    `\n✗ pool-bound-payment-invariant gate FAILED with ${findings.length} finding(s).\n` +
      '  A wrong-pool payment MUST NOT be silently remapped / auto-reassigned / moved (Story 7.6 AC3) —\n' +
      '  it corrupts deterministic assignment + falsifies audit lineage. Recovery is helpdesk-facilitated,\n' +
      '  off-band, logged; the only sanctioned alteration is the ≥2-trustee attestable-correction seam.\n' +
      '  See scripts/pool-bound-payment-invariant/README.md.',
  );
  process.exit(1);
}

try {
  main();
} catch (err: unknown) {
  console.error(
    `\n✗ pool-bound-payment-invariant gate ERRORED: ${err instanceof Error ? err.message : String(err)}`,
  );
  process.exit(1);
}
