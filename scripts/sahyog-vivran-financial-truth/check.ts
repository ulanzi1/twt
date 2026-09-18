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
// The files below ARE the Sahyog Vivran read path today. ⭐ **11b.3a PAID ITS SHARE** (the three
// `claim/nominee-bank-*` modules at the end of the list). ⚠ **11b.3b** still owes its own — the
// named-identity render layer + the amount-raised render — ⛔ and it MUST add them to
// {@link SCAN_FILES} in its own commit.
// ⛔ A gate that does not cover the new surface silently under-protects, and a green scan over files
// it never reads proves nothing ([[feedback_gate_scope_semantic_coverage]]).
// ⚠⛔ AND **11b.3b IS THE SHARP ONE**: it lifts the `@twt/ui` fence and RENDERS the amount, so it must
// flip that file's `renderPath` flag to `false` — or, better, replace rule (3) with a check that the
// amount comes from the SHIPPED presenter rather than a local multiplication. ⛔ Deleting the rule
// outright would discard D1(c)'s refusal, which survives 11b.3b unchanged.
//
// ⭐⭐ **AMENDED 2026-09-15 (Story 11b.3b, AC11) — ⛔ THE PARAGRAPH ABOVE IS KEPT AS THE RECORD AND IS
// NOW PARTLY SUPERSEDED. ⛔ It is ⛔ not rewritten** ([[feedback_supersede_never_reinterpret]]).
//   · ⭐ **DONE, and by the THIRD route, ⛔ neither of the two above:** rule (3) is **NARROWED** — the
//     TARGET and its factors stay banned by NAME, the RULED `amountRaisedInr` may cross, and the D1(c)
//     act is caught **BY SHAPE** (`isAmountDerivation` in `lib.ts`). ⛔ `renderPath` was ⛔ NOT flipped
//     to `false` on the DTO: that would leave the whole file unscanned for every operand at once.
//   · ⚠⛔ **AND *"comes from the SHIPPED presenter"* IS ⛔ NOT WHAT 11b.3b DOES** — ⛔ do ⛔ not
//     re-point the rule at the presenter. `@twt/ui`'s `pool-progress` presenter takes `rosterSize` and
//     `fixedAmount` as INPUTS, and `2026-09-07-204` cl.3/cl.8 reserve that pair ⇒ consuming it on a
//     PUBLIC surface would put both factors on the wire. ⭐ The amount is therefore taken **server-side**
//     from the domain read's own `deliveredTotal`, published as `amountRaisedInr` (`2026-09-04-190`
//     cl.6). ⭐ D1(c) is unchanged: the arithmetic still happens exactly ONCE, in the domain.
//   · ⚠ **SCOPE (AC11(a)) IS ⛔ NOT DISCHARGED HERE.** 11b.3b's render layer edits files that are
//     ALREADY on this list; ⛔ if it adds a NEW one under `apps/public/src/lib` or
//     `apps/public/src/pages/sahyog-vivran`, that file joins `SCAN_FILES` **in the same commit** —
//     the scope safeguard below fails the run otherwise.
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
 * `renderPath: true` ⇒ rule (3) applies. ⛔ The domain read is `false` because it legitimately feeds
 * `classifyCycleOutcome`, which QUARANTINES the target.
 *
 * ⚠⛔⛔ **WHAT RULE (3) BANS WAS NARROWED AT STORY 11b.3b (AC11(b)) — THIS SENTENCE USED TO SAY
 * *"⛔ no amount operand may even be NAMED"* AND THAT IS ⛔ NO LONGER TRUE** (Review finding,
 * 2026-09-16 second pass). ⭐ Rule (3) now bans the TARGET and its FACTORS by name
 * ({@link TARGET_OPERANDS}) plus the D1(c) product BY SHAPE — ⛔ it does ⛔ not ban `amountRaisedInr`,
 * which `2026-09-04-190` **cl.6** RULES the public rupee figure and which legitimately crosses the
 * wire.
 * ⚠⛔ **SO ⛔ DO ⛔ NOT REACH FOR `renderPath: false` TO NAME AN AMOUNT IN A NEW FILE.** That is the
 * weaker option AC11(b) explicitly REFUSED — it would leave the file unscanned for EVERY operand at
 * once. ⭐ If a render-path file needs an amount, it needs the RULED wire field, ⛔ not the flag off.
 */
const SCAN_FILES: readonly { readonly path: string; readonly renderPath: boolean }[] = [
  // The domain read — where the event types actually live.
  { path: 'packages/domain/src/pool/sahyog-vivran-read.ts', renderPath: false },
  // The wire shape. ⭐ On the render path: the TARGET and its factors may ⛔ never reach the wire.
  // ⛔ NOT "nothing about an amount" — `amountRaisedInr` SHIPS here (`-190` cl.6, `-189` Consequence 5 record
  // the rupee boundary as CROSSED at 11b.3b); it is the target/expected-total/shortfall that is
  // forbidden "in any field, under any name" (Review finding, 2026-09-16 second pass).
  { path: 'packages/contracts/src/public-pages/sahyog-vivran.ts', renderPath: true },
  // The API boundary. ⚠ SHARED with the two sibling routes, so it is scanned for rules (1) and (2)
  // only — a legitimate `member-directory` or `sahyog-drive` amount operand there is not this
  // surface's defect, and flagging it would be the noisy failure that gets a gate allow-listed.
  { path: 'apps/api/src/modules/public-pages/handlers.ts', renderPath: false },
  // The SSR page's client + its pure render module.
  { path: 'apps/public/src/lib/sahyog-vivran.server.ts', renderPath: true },
  { path: 'apps/public/src/lib/sahyog-vivran-render.ts', renderPath: true },
  // ⭐ Added 2026-09-18 (11b.3b fifth review pass) — the page's query/paging rules, EXTRACTED from
  // `[driveToken].astro` by the fourth pass. ⚠ That pass created the file WITHOUT registering it and
  // this gate's completeness check went RED; its only arithmetic is `page * limit`, which rule (3)
  // does ⛔ not match (neither operand is a count or an amount).
  { path: 'apps/public/src/lib/sahyog-vivran-paging.ts', renderPath: true },
  // ⭐ review finding — was MISSING. The page itself names no amount operand today (D1(c) is
  // refused at this story), but it is the render path and belongs on rule (3)'s watch list the
  // moment 11b.3b lifts the `@twt/ui` fence here.
  {
    // ⚠ RENAMED at Story 11b.10 — the route parameter is the drive's OPAQUE PUBLIC TOKEN. This
    // gate reads the file by PATH, so the rename must land here in the SAME commit or the gate goes
    // silently vacuous on its own render path ([[feedback_gate_scope_semantic_coverage]]).
    path: 'apps/public/src/pages/sahyog-vivran/[driveToken].astro',
    renderPath: true,
  },
  // ⭐ STORY 11b.3a — THE SCOPE TAX THIS GATE'S HEADER NAMED, PAID. The nominee-bank presentation
  // added three modules to this read path, and *"a gate that does not cover the new surface silently
  // under-protects"* ([[feedback_gate_scope_semantic_coverage]]).
  // ⚠ `renderPath: false` on all three, and each for a stated reason rather than by default:
  //   · the masking policy accessor and the pure projection carry ⛔ no amount operand and ⛔ no
  //     event type at all — they are scanned for rules (1) and (2) so that a future edit CANNOT
  //     introduce one unnoticed, which is the whole purchase of adding them;
  //   · the API boundary module was already on the list at `renderPath: false` and is unchanged.
  // ⛔ Flipping any of these to `true` without reading rule (3) would forbid a legitimate operand in
  // a module that has nothing to do with the render.
  { path: 'packages/domain/src/claim/nominee-bank-masking.ts', renderPath: false },
  { path: 'packages/domain/src/claim/nominee-bank-masking-policy.ts', renderPath: false },
  { path: 'packages/domain/src/claim/nominee-bank-read.ts', renderPath: false },
  // ⭐ STORY 11b.11 — THE SCOPE TAX, PAID AGAIN. The story mechanized this route's applicable
  // control set into one constant (`SAHYOG_VIVRAN_APPLICABLE_CONTROLS`), and the module landed in
  // `apps/api/src/modules/public-pages/` with `sahyog-vivran` in its name ⇒ the SCOPE SAFEGUARD
  // FAILED THE RUN until it was declared here. ⭐ That is the safeguard working — it is why the
  // gate has one ([[feedback_gate_scope_semantic_coverage]]).
  // ⚠⛔ AND THIS IS A SCOPE DECLARATION, ⛔ NOT A COVERAGE CLAIM. The module is prose and typed
  // constants: it carries ⛔ no event type, ⛔ no amount operand and ⛔ no read. Scanning it buys
  // exactly one thing — a future edit ⛔ cannot introduce either unnoticed. ⛔ Do ⛔ not cite its
  // green scan as evidence the control set is correct; `login-wall.spec.ts` asserts that.
  // ⛔ `renderPath: false`: it renders nothing.
  { path: 'apps/api/src/modules/public-pages/sahyog-vivran-controls.ts', renderPath: false },
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
    console.log('  ✓ the TARGET stays off the render path and the rupee figure is ⛔ not re-derived (D1(c) holds)\n');
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
