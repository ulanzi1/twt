// The PII scrape CI gate entrypoint — Story 1.16b (AC-2/AC-3), ARMED by Story 11a.1.
//
// Impure orchestration only: load + Zod-parse the FR-74 matrix, enumerate the
// shipped public pages, run the pure legs (`src/public-pages/gate.ts`), print
// structured per-finding output, exit non-zero on any finding. Mirrors the
// testable-pure-core / impure-entry split of `scripts/friction-budget/{lib,check}.ts`.
//
// ── ⚠ WHAT THIS GATE CHECKS, AND WHAT IT DOES NOT ───────────────────────────
// Read this before extending it. Story 11a.1 found the previous header claiming
// things that were not true, so this one states the boundary explicitly.
//
// THIS SCRIPT proves what COMMITTED SOURCE can prove:
//   (1) route coverage, both directions — every shipped `apps/public` page has a
//       matrix surface, and every rendering surface names a real page;
//   (2) indexing reconciliation — each surface's declared search_indexing_policy
//       matches the `noindex` prop its page actually passes;
//   (3) escalation attestation — every escalation's cited decision EXISTS in
//       `.decision-log.md`, and the ledger count agrees with the entries;
//   (4) matrix structure — via `parsePublicVsPrivateMatrix`, which throws LOUDLY
//       (a malformed matrix must never degrade to "no entries").
//
// ⛔ IT DOES NOT CHECK TIER LEAKS. That check needs a RENDER, and this script has
// none. Per ruling D2 the live-render tier-leak leg lives in
// `apps/public/tests/integration/public-pages/scrape-test.spec.ts` — the
// architecture-committed D13-1.2 slot, which holds real render HTML and runs on
// every PR via `pnpm turbo run test`. ⛔ Do not re-add a snapshot loader here.
// The version this replaces had `loadSnapshots(): return []` while its header
// promised the rules would acquire teeth "with no code change" — a vacuous leg
// under a claim that it was live. If you need the tier check, run the suite.
//
// ⛔ AND IT CANNOT SEE PER-PARIWAR ATTRIBUTE DEFINITIONS. Those are tenant
// DATABASE ROWS (`pariwar_custom_field_definitions`). This gate must NOT be
// widened to read a tenant database — "a CI gate that needed a live tenant
// database would not be a CI gate" (the Story 10.12 fence). The matrix carries a
// RULE for them, and the runtime prohibition lives in the layers named in
// `src/public-pages/README.md`.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  type GateFinding,
  checkEscalationAttestation,
  checkIndexingReconciliation,
  checkRouteCoverage,
  pageRouteFromPath,
  parsePublicVsPrivateMatrix,
} from '../src/public-pages/index.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, '../../..');
const matrixPath = path.resolve(here, '../public-pages/public-vs-private-matrix.yaml');
const pagesDir = path.join(repoRoot, 'apps/public/src/pages');
const decisionLogPath = path.join(repoRoot, '.decision-log.md');

/**
 * Enumerate every `.astro` page under `apps/public/src/pages/`, returning
 * route → source. Recursive, so a nested route (`blog/[postId].astro`) is found.
 *
 * ⚠ These paths MUST be listed in `turbo.json`'s `contracts:check-pii-scrape`
 * `inputs`, or the task caches on the matrix alone and a page change replays a
 * stale `FULL TURBO` pass over unscanned content. They are — added in the same
 * commit as this scan.
 */
function loadPages(dir: string, prefix = ''): Map<string, string> {
  const pages = new Map<string, string>();
  if (!fs.existsSync(dir)) return pages;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
    const rel = prefix === '' ? entry.name : `${prefix}/${entry.name}`;
    if (entry.isDirectory()) {
      for (const [route, src] of loadPages(path.join(dir, entry.name), rel)) pages.set(route, src);
    } else if (entry.name.endsWith('.astro')) {
      pages.set(pageRouteFromPath(rel), fs.readFileSync(path.join(dir, entry.name), 'utf8'));
    }
  }
  return pages;
}

function main(): void {
  const findings: GateFinding[] = [];

  console.log('pii-scrape gate — FR-74 Public-vs-Private matrix (Story 1.16b, armed by 11a.1)\n');

  // ── Matrix: the consumed contract ─────────────────────────────────────────
  if (!fs.existsSync(matrixPath)) {
    console.error(`✗ pii-scrape gate FAILED — no matrix at ${path.basename(matrixPath)}.`);
    console.error(
      '  The matrix is POPULATED as of Story 11a.1; a missing file is a deletion, not a no-op.',
    );
    process.exit(1);
  }

  // Throws on malformed → the gate fails loudly, never silently skipped.
  const matrix = parsePublicVsPrivateMatrix(fs.readFileSync(matrixPath, 'utf8'));
  if (matrix === null) {
    console.error('✗ pii-scrape gate FAILED — the matrix document is EMPTY.');
    console.error(
      '  ⛔ An empty matrix would make every check below a no-op. That was the v1 scaffold ' +
        'posture; Story 11a.1 retired it.',
    );
    process.exit(1);
  }

  const rendering = matrix.surfaces.filter((s) => s.renders);
  console.log(
    `▸ Matrix: version ${matrix.version}, ${matrix.surfaces.length} surface(s) ` +
      `(${rendering.length} rendering, ${matrix.surfaces.length - rendering.length} declared-not-yet-built)`,
  );
  const fieldCount = matrix.surfaces.reduce((n, s) => n + s.fields.length, 0);
  console.log(`  · ${fieldCount} tier-classified field(s); ${matrix.escalation_count} escalation(s) on the ledger`);

  // ── Leg 1: route coverage, both directions (AC1) ──────────────────────────
  const pages = loadPages(pagesDir);
  console.log(`\n▸ Route coverage: ${pages.size} shipped page(s) under apps/public/src/pages/`);
  const routeFindings = checkRouteCoverage(matrix, [...pages.keys()]);
  findings.push(...routeFindings);
  console.log(
    routeFindings.length === 0
      ? '  ✓ every shipped route is declared, and every rendering surface names a real page'
      : `  ✗ ${routeFindings.length} coverage finding(s)`,
  );

  // ── Leg 2: search-indexing reconciliation (AC7) ───────────────────────────
  const indexingFindings = checkIndexingReconciliation(matrix, pages);
  findings.push(...indexingFindings);
  console.log('\n▸ Search-indexing reconciliation (declared policy ⇄ the page\'s noindex prop)');
  for (const s of rendering) {
    if (pages.has(s.route)) console.log(`  · ${s.route.padEnd(16)} ${s.search_indexing_policy}`);
  }
  console.log(
    indexingFindings.length === 0
      ? '  ✓ every declared policy matches the render'
      : `  ✗ ${indexingFindings.length} indexing conflict(s)`,
  );

  // ── Leg 3: escalation attestation (AC8) ───────────────────────────────────
  const decisionLog = fs.existsSync(decisionLogPath)
    ? fs.readFileSync(decisionLogPath, 'utf8')
    : '';
  const ledgerFindings = checkEscalationAttestation(matrix, decisionLog);
  findings.push(...ledgerFindings);
  console.log(`\n▸ Escalation ledger: ${matrix.escalations.length} entr(y/ies), attestation cross-checked`);
  for (const e of matrix.escalations) {
    console.log(`  · ${e.surface}.${e.field}: ${e.from} → ${e.to}  [${e.decision}]`);
  }
  console.log(
    ledgerFindings.length === 0
      ? '  ✓ every escalation cites a decision that exists, and the count agrees'
      : `  ✗ ${ledgerFindings.length} ledger finding(s)`,
  );

  // ── Where the tier-leak leg lives (D2) ────────────────────────────────────
  console.log('\n▸ Tier-leak (live render): NOT checked here, BY DESIGN (ruling D2).');
  console.log(
    '  · it runs in apps/public/tests/integration/public-pages/scrape-test.spec.ts, against real',
  );
  console.log('    render HTML, on every PR via `pnpm turbo run test`. Run the suite to exercise it.');

  // ── Verdict ───────────────────────────────────────────────────────────────
  console.log('');
  if (findings.length > 0) {
    console.error(`✗ pii-scrape gate FAILED with ${findings.length} finding(s):`);
    for (const f of findings) console.error(`  - [${f.leg}] ${f.message}`);
    process.exit(1);
  }
  console.log('✓ pii-scrape gate passed');
}

main();
