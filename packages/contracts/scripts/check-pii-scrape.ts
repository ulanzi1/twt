// packages/contracts/scripts/check-pii-scrape.ts
//
// The PII scrape CI gate entrypoint (Story 1.16b, AC-2/AC-3). Impure
// orchestration only: load + Zod-parse the FR-74 matrix, enumerate available
// render snapshots, run the pure engine (src/public-pages/scrape.ts), accumulate
// failures, print structured per-finding output naming surface + field, and exit
// non-zero on any leak. Mirrors the testable-pure-core / impure-entry split of
// scripts/friction-budget/{lib.ts,check.ts} and the path-resolution + structured
// failure posture of packages/contracts/scripts/check-openapi-determinism.ts.
//
// Self-green by construction (AC-3/AC-6): the scaffold matrix has zero surfaces
// and NO render snapshots exist at v1 → the engine evaluates nothing → pass. The
// no-op is DATA-DRIVEN (empty matrix + no snapshots), not a feature flag: as
// Epic 11a populates the matrix and Story 2.5/11a.2 render public surfaces, the
// snapshots feed the engine and the leak rules acquire teeth with no code change.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  type RenderSnapshot,
  evaluateSnapshot,
  parsePublicVsPrivateMatrix,
} from '../src/public-pages/index.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const matrixPath = path.resolve(here, '../public-pages/public-vs-private-matrix.yaml');

/**
 * Enumerate the render snapshots available in CI. At v1 there are NONE:
 * `apps/public` is a `tsc` stub until the Story 2.5 Astro shell, and
 * `apps/api/src/modules/public-pages/` is empty until Epic 11b — so this returns
 * `[]` and every surface is a no-op (AC-3). The architecture-committed live-render
 * integration spec `tests/integration/public-pages/scrape-test.spec.ts` (D13-1.2)
 * lands at Story 2.5/11a.2 and feeds REAL snapshots into the same `evaluateSnapshot`
 * engine this gate calls.
 */
function loadSnapshots(): RenderSnapshot[] {
  return [];
}

function main(): void {
  const failures: string[] = [];

  console.log('pii-scrape gate — FR-74 Public-vs-Private matrix (Story 1.16b)\n');

  // ── Matrix: the consumed contract ─────────────────────────────────────────
  if (!fs.existsSync(matrixPath)) {
    console.log(`· no matrix at ${path.basename(matrixPath)} — no-op (AC-3: absent matrix → pass)`);
    console.log('\n✓ pii-scrape gate passed (no-op)');
    return;
  }

  // parsePublicVsPrivateMatrix throws on malformed → the gate fails loudly (AC-1),
  // never silently skipped. `null` is the empty-document sentinel (no-op).
  const matrix = parsePublicVsPrivateMatrix(fs.readFileSync(matrixPath, 'utf8'));
  if (matrix === null) {
    console.log('· matrix document is empty — no-op (AC-3: empty matrix → pass)');
    console.log('\n✓ pii-scrape gate passed (no-op)');
    return;
  }

  console.log(`▸ Matrix: version ${matrix.version}, ${matrix.surfaces.length} surface(s)`);
  if (matrix.surfaces.length === 0) {
    console.log('  · no surfaces declared — Epic 11a (Story 11a.1) populates; all checks no-op');
  }

  // ── Render snapshots ──────────────────────────────────────────────────────
  const snapshots = loadSnapshots();
  console.log(`\n▸ Render snapshots: ${snapshots.length}`);
  if (snapshots.length === 0) {
    console.log('  · no render snapshots available — every surface scrape is a no-op (AC-3)');
    console.log(
      '    (apps/public is a tsc stub until Story 2.5; apps/api public-pages empty until Epic 11b)',
    );
  }

  for (const snapshot of snapshots) {
    const verdict = evaluateSnapshot(matrix, snapshot);
    const glyph = verdict.status === 'fail' ? '✗' : verdict.status === 'no-op' ? '·' : '✓';
    console.log(`  ${glyph} ${verdict.message}`);
    for (const w of verdict.warnings) console.log(`    ⚠ ${w}`);
    if (verdict.status === 'fail') {
      for (const leak of verdict.leaks) failures.push(`tier-leak: ${leak.message}`);
      for (const pii of verdict.piiMatches) {
        failures.push(
          `naked-PII: ${pii.type} pattern "${pii.value}" on public surface "${verdict.surfaceId}"`,
        );
      }
    }
  }

  // ── Verdict ───────────────────────────────────────────────────────────────
  console.log('');
  if (failures.length > 0) {
    console.error(`✗ pii-scrape gate FAILED with ${failures.length} finding(s):`);
    for (const f of failures) console.error(`  - ${f}`);
    process.exit(1);
  }
  console.log('✓ pii-scrape gate passed');
}

main();
