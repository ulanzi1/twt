// scripts/survey-advisory-invariant/check.ts
//
// The Story 10.15 Load-Bearing-Decision-1 gate: A SURVEY IS ADVISORY AND HAS NO GOVERNANCE EFFECT.
//
// Scans every path Story 10.15 adds and fails (exit 1, naming file + line) if the word `quorum` — or
// a phrase claiming a survey decided something — reaches a CODE position: a column, a DTO field, a
// TS identifier, an i18n key, an admin label or member copy.
//
// Why the word is banned rather than merely discouraged: in this project `quorum` already names the
// TRUSTEE quorum (`docs/legal/trust-deed.md:227`, Deed Cl. 19), and the project has had to
// disambiguate it once already (`docs/legal/niyamavali.md:266,270`). Members hold no governance vote
// under either document. FR-58 calls the field a "quorum threshold"; it ships as
// `response_threshold`, gating nothing — and a rename holds only for as long as nobody renames it
// back, which is what this gate is for.
//
// ⚠ COMMENTS ARE STRIPPED BEFORE SCANNING, and that deviation from Task 11's literal
// `grep -rni "quorum"` is DECLARED — see the long note in `lib.ts` and `README.md`. Every survey file
// explains in its header WHY the word is banned; a raw grep would force deleting that reasoning to
// pass, leaving a renamed column no future reader could account for.
//
// ⚠ ⭐ THE PATH LIST IS THE GATE'S REAL WEAKNESS, not the word list. A survey file added later and
// not listed here is silently uncovered, and a green run would prove nothing about it
// ([[feedback_gate_scope_semantic_coverage]]). So the gate ALSO fails when a listed path is MISSING —
// a moved or renamed file trips it rather than shrinking the scan in silence.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { formatFinding, scanAdvisoryInvariant, type AdvisoryFinding } from './lib.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, '../..');

/**
 * Every path Story 10.15 adds. ⚠ If a later story adds a survey surface, ADD IT HERE — the gate
 * cannot see what it is not pointed at.
 */
const SCAN_PATHS: readonly string[] = [
  'packages/domain/src/surveys',
  'packages/domain/src/schema/surveys.ts',
  'packages/domain/migrations/0109_survey-poll.sql',
  'packages/contracts/src/surveys',
  'apps/api/src/modules/surveys',
  'apps/admin/src/modules/surveys',
  'apps/admin/src/routes/SurveysRoute.tsx',
  'apps/mobile/app/(polls)',
  'apps/mobile/components/polls',
  'apps/mobile/lib/poll-api.ts',
  'apps/mobile/lib/poll-i18n.ts',
  'apps/jobs/src/scheduler/survey-publish.ts',
  // The member-facing chrome catalogs — where a governance verb would reach a member directly.
  'packages/i18n/locales/en/polls.json',
  'packages/i18n/locales/hi/polls.json',
];

const SCANNABLE = /\.(ts|tsx|sql|json)$/;

function collectFiles(abs: string, acc: string[]): void {
  const stat = fs.statSync(abs);
  if (stat.isFile()) {
    if (SCANNABLE.test(abs)) acc.push(abs);
    return;
  }
  for (const entry of fs.readdirSync(abs, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue;
    collectFiles(path.join(abs, entry.name), acc);
  }
}

function main(): void {
  console.log('survey-advisory-invariant gate — a survey is ADVISORY (Story 10.15, LBD-1)\n');

  const files: string[] = [];
  const missing: string[] = [];
  for (const rel of SCAN_PATHS) {
    const abs = path.join(repoRoot, rel);
    if (!fs.existsSync(abs)) {
      missing.push(rel);
      continue;
    }
    collectFiles(abs, files);
  }

  // ⭐ A missing path is a FAILURE, not a skip: a silently shrinking scan is how a gate goes green
  // over a surface it no longer covers.
  if (missing.length > 0) {
    console.error('✗ survey-advisory-invariant gate: these declared paths no longer exist —');
    for (const m of missing) console.error(`    ${m}`);
    console.error('\n  A moved or renamed survey file must be re-declared in SCAN_PATHS, not dropped.');
    process.exit(1);
  }

  files.sort();
  const findings: AdvisoryFinding[] = [];
  for (const abs of files) {
    const rel = path.relative(repoRoot, abs);
    findings.push(...scanAdvisoryInvariant(rel, fs.readFileSync(abs, 'utf8')));
  }

  console.log(`▸ scanned ${files.length} files across ${SCAN_PATHS.length} declared paths`);

  if (findings.length > 0) {
    console.error(`\n✗ survey-advisory-invariant gate FAILED — ${findings.length} violation(s):\n`);
    for (const f of findings) console.error(formatFinding(f));
    console.error(
      '\n  A survey INFORMS a decision and never MAKES one. `quorum` names the TRUSTEE quorum' +
        '\n  (Deed Cl. 19) and members hold no governance vote — FR-58\'s "quorum threshold" ships as' +
        '\n  `response_threshold`, gating nothing. If a survey result must ever BIND a decision, that' +
        '\n  is a Trustee Panel routing note and a Deed question, not a rename here.\n',
    );
    process.exit(1);
  }

  console.log('\n✓ survey-advisory-invariant gate passed — no banned term in any code position');
}

main();
