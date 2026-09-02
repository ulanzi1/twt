// scripts/sahyog-vivran-financial-truth/check.ts
//
// The sahyog-vivran-financial-truth CI gate — Story 11b.3 (AC3, AC4).
//
// ⭐ THE EPIC AC, MECHANIZED: *"a CI test asserts: no API endpoint serving Sahyog Vivran data computes
// inferred financial state from non-canonical sources; financial summaries source exclusively from
// `contribution.confirmed` + `pool.settled` events."*
//
// Impure orchestration only — the pure scanner lives in `lib.ts` (the
// testable-pure-core / impure-entry split every gate in `scripts/` follows).
//
// ── ⭐ SCOPE, AND THE PER-STORY SCOPE TAX THIS GATE OWES ITS SIBLINGS ───────────────────────────
// The files below ARE the Sahyog Vivran read path today. ⚠ **11b.3a** adds the nominee-bank
// presentation and **11b.3b** the named-identity render layer + the amount-raised render — ⛔ each of
// them adds files to this path, and each MUST add them to {@link SCAN_FILES} in its own commit.
// ⛔ A gate that does not cover the new surface silently under-protects, and a green scan over files
// it never reads proves nothing ([[feedback_gate_scope_semantic_coverage]]).
// ⚠⛔ AND **11b.3b IS THE SHARP ONE**: it lifts the `@twt/ui` fence and RENDERS the amount, so it must
// flip that file's `renderPath` flag to `false` — or, better, replace rule (3) with a check that the
// amount comes from the SHIPPED presenter rather than a local multiplication. ⛔ Deleting the rule
// outright would discard D1(c)'s refusal, which survives 11b.3b unchanged.
//
// ⚠ THE TEETH ARE PROVEN BY KNOWN-BAD FIXTURES in `lib.test.ts` — a planted `contribution.utr-attested`
// read, a planted attestation import, and a planted local multiplication — plus the revert-sanity run
// recorded in the story's Dev Agent Record. ⛔ A green scan over new files proves nothing.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  ALLOWED_EVENT_TYPES,
  type FinancialTruthFinding,
  findUnscannedCandidates,
  formatFinding,
  scanFinancialTruth,
} from './lib.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, '../..');

/**
 * The Sahyog Vivran read path, end to end.
 *
 * `renderPath: true` ⇒ rule (3) applies (⛔ no amount operand may even be NAMED). ⛔ The domain read
 * is `false` because it legitimately feeds `classifyCycleOutcome`, which QUARANTINES the target.
 */
const SCAN_FILES: readonly { readonly path: string; readonly renderPath: boolean }[] = [
  // The domain read — where the event types actually live.
  { path: 'packages/domain/src/pool/sahyog-vivran-read.ts', renderPath: false },
  // The wire shape. ⭐ On the render path: nothing about an amount may reach the wire at this story.
  { path: 'packages/contracts/src/public-pages/sahyog-vivran.ts', renderPath: true },
  // The API boundary. ⚠ SHARED with the two sibling routes, so it is scanned for rules (1) and (2)
  // only — a legitimate `member-directory` or `sahyog-drive` amount operand there is not this
  // surface's defect, and flagging it would be the noisy failure that gets a gate allow-listed.
  { path: 'apps/api/src/modules/public-pages/handlers.ts', renderPath: false },
  // The SSR page's client + its pure render module.
  { path: 'apps/public/src/lib/sahyog-vivran.server.ts', renderPath: true },
  { path: 'apps/public/src/lib/sahyog-vivran-render.ts', renderPath: true },
  // ⭐ review finding — was MISSING. The page itself names no amount operand today (D1(c) is
  // refused at this story), but it is the render path and belongs on rule (3)'s watch list the
  // moment 11b.3b lifts the `@twt/ui` fence here.
  {
    path: 'apps/public/src/pages/sahyog-vivran/[poolCanonicalIdentifier].astro',
    renderPath: true,
  },
];

/**
 * ⭐ THE SCOPE SAFEGUARD (review finding) — directories where a Sahyog Vivran read-path file would
 * plausibly land, walked for anything that belongs to this surface but is NOT in
 * {@link SCAN_FILES}. ⛔ Narrow and naming-convention-based ON PURPOSE: `sharedDirs` hold plenty of
 * files this gate has no business scanning (the whole pool engine, every other public-pages
 * surface), so those are filtered by "filename contains sahyog-vivran". `wholeDirs` are directories
 * that exist ONLY for this surface (the route folder), so every file inside is a candidate
 * regardless of its name.
 */
const CANDIDATE_DIRS: {
  readonly sharedDirs: readonly string[];
  readonly wholeDirs: readonly string[];
} = {
  sharedDirs: [
    'packages/domain/src/pool',
    'packages/contracts/src/public-pages',
    'apps/api/src/modules/public-pages',
    'apps/public/src/lib',
  ],
  wholeDirs: ['apps/public/src/pages/sahyog-vivran'],
};

function findSahyogVivranCandidates(root: string): string[] {
  const isTest = (entry: string): boolean => /\.(test|spec)\.tsx?$/.test(entry);
  const isCandidateExt = (entry: string): boolean => /\.(ts|tsx|astro)$/.test(entry);

  const out: string[] = [];
  for (const dir of CANDIDATE_DIRS.sharedDirs) {
    const abs = path.join(root, dir);
    if (!fs.existsSync(abs)) continue;
    for (const entry of fs.readdirSync(abs)) {
      if (!/sahyog-vivran/i.test(entry) || isTest(entry) || !isCandidateExt(entry)) continue;
      out.push(`${dir}/${entry}`);
    }
  }
  for (const dir of CANDIDATE_DIRS.wholeDirs) {
    const abs = path.join(root, dir);
    if (!fs.existsSync(abs)) continue;
    for (const entry of fs.readdirSync(abs)) {
      if (isTest(entry) || !isCandidateExt(entry)) continue;
      out.push(`${dir}/${entry}`);
    }
  }
  return out;
}

function main(): void {
  console.log(
    'sahyog-vivran-financial-truth gate — financial truth from CANONICAL EVENTS only (Story 11b.3 AC3/AC4)\n',
  );

  console.log(`▸ Canonical event surface (${String(ALLOWED_EVENT_TYPES.length)})`);
  for (const t of ALLOWED_EVENT_TYPES) console.log(`    · ${t}`);
  console.log(
    '  ⛔ ADDING TO THIS LIST IS A SCOPE DECISION, ⛔ never a way to make a failing scan pass.\n',
  );

  console.log(`▸ Scope — ${String(SCAN_FILES.length)} file(s) on the read path`);
  const findings: FinancialTruthFinding[] = [];
  let missing = 0;
  for (const entry of SCAN_FILES) {
    const abs = path.join(repoRoot, entry.path);
    if (!fs.existsSync(abs)) {
      // ⛔ FAIL-CLOSED. A renamed or deleted read-path file must not silently shrink the scope — that
      // is how a gate goes vacuous while staying green.
      console.error(`  ✗ MISSING — ${entry.path}`);
      missing += 1;
      continue;
    }
    console.log(`  · ${entry.path}${entry.renderPath ? '   [render path]' : ''}`);
    findings.push(...scanFinancialTruth(entry.path, fs.readFileSync(abs, 'utf8'), entry));
  }
  console.log('');

  console.log('▸ Findings');
  if (missing > 0) {
    console.error(
      `\n✗ sahyog-vivran-financial-truth gate FAILED — ${String(missing)} scoped file(s) do not exist.\n` +
        '  A read-path file was renamed or removed without updating SCAN_FILES. ⛔ The scope must\n' +
        '  follow the code, or the green check certifies an invariant nobody is enforcing.',
    );
    process.exit(1);
  }

  console.log('▸ Scope safeguard — files named like this read path but not in SCAN_FILES');
  const scannedRelPaths = SCAN_FILES.map((e) => e.path);
  const unscanned = findUnscannedCandidates(findSahyogVivranCandidates(repoRoot), scannedRelPaths);
  if (unscanned.length > 0) {
    console.error(
      `\n✗ sahyog-vivran-financial-truth gate FAILED — ${String(unscanned.length)} file(s) look like ` +
        'Sahyog Vivran read-path files but are not in SCAN_FILES:\n' +
        unscanned.map((p) => `    ✗ ${p}`).join('\n') +
        '\n  Add each to SCAN_FILES above (with the correct renderPath flag) — see the header comment\n' +
        '  on the per-story scope tax this gate owes its siblings.',
    );
    process.exit(1);
  }
  console.log('  ✓ none\n');

  if (findings.length === 0) {
    console.log('  ✓ the read path names ONLY canonical event types');
    console.log('  ✓ no attestation-derived accessor is imported');
    console.log('  ✓ no amount operand appears on the render path (D1(c) holds)\n');
    console.log('✓ sahyog-vivran-financial-truth gate passed');
    console.log(
      '  ⚠ SYNTACTIC, per-file — ⛔ no call-graph analysis. A prohibited read placed in a THIRD\n' +
        '    module and called from here is invisible to it. A tripwire, ⛔ not a proof of AC3.',
    );
    return;
  }

  for (const f of findings) console.error(`  ✗ ${formatFinding(f)}`);
  console.error(
    `\n✗ sahyog-vivran-financial-truth gate FAILED with ${String(findings.length)} finding(s).\n` +
      '  Financial truth on the Sahyog Vivran derives EXCLUSIVELY from Epic 9 canonical events\n' +
      '  (Story 11b.3 AC3). ⛔ PROHIBITED, each named so a reviewer can check for it: (a) totals\n' +
      '  inferred from attestation events; (b) projected or estimated final amounts during a live\n' +
      '  cycle; (c) "X% confirmed so far" framing that exposes the attested↔confirmed gap;\n' +
      '  (d) synthesized confidence-interval-style "approximate" totals; (e) any aggregate mixing\n' +
      '  confirmed and unconfirmed counts.\n' +
      '  ⛔ Do NOT resolve this by adding the event type to ALLOWED_EVENT_TYPES — that inverts the\n' +
      '  control. See scripts/sahyog-vivran-financial-truth/README.md.',
  );
  process.exit(1);
}

try {
  main();
} catch (err: unknown) {
  console.error(
    `\n✗ sahyog-vivran-financial-truth gate ERRORED: ${err instanceof Error ? err.message : String(err)}`,
  );
  process.exit(1);
}
