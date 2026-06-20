// scripts/cadence-check/check.ts
//
// AI-1 preflight / CI gate: assert ai-cadence-actuals.md is present, has an
// open Epic section, and is current. Fails if the file is absent (the A-5
// failure mode), has no ## Epic section (bare stub, never opened for a
// cycle), the latest epic section is already closed (stale — no active
// cycle), or an epic section is missing its summary row (malformed).
//
// Run via: pnpm cadence:check
// Runs as the `cadence-check` ci.yml job (static, no external services needed).
// Also included in ci-local.sh as the last static job before integration-tests.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '../../');
const ACTUALS_PATH = path.join(
  REPO_ROOT,
  '_bmad-output/implementation-artifacts/ai-cadence-actuals.md',
);

function fail(msg: string): never {
  process.stderr.write(`\n[cadence-check] FAIL: ${msg}\n\n`);
  process.exit(1);
}

function pass(msg: string): void {
  process.stdout.write(`[cadence-check] OK: ${msg}\n`);
}

// ── 1. File must exist ────────────────────────────────────────────────────────

if (!fs.existsSync(ACTUALS_PATH)) {
  fail(
    `ai-cadence-actuals.md not found at:\n  ${ACTUALS_PATH}\n` +
      `Create it before starting the next epic (AI-1 gate). ` +
      `See Epic 1 retro action item AI-1 and the file template.`,
  );
}

let content: string;
try {
  content = fs.readFileSync(ACTUALS_PATH, 'utf8');
} catch (err) {
  fail(`could not read ai-cadence-actuals.md: ${(err as Error).message}`);
}
pass('ai-cadence-actuals.md exists');

// ── 2. File must not be empty ─────────────────────────────────────────────────

if (content.trim().length === 0) {
  fail('ai-cadence-actuals.md is empty. Open it for the current epic.');
}

// ── 3. File must have at least one ## Epic section, with no duplicates ────────
//
// Catches the "file exists but was never opened for an epic" case. A section
// header like "## Epic 2 — ..." is the minimum signal that instrumentation is
// active. An empty measurement table is OK (cycle opened but no stories done
// yet); a missing section header is not. A duplicated epic number signals a
// malformed file (e.g. copy-paste error) rather than a real second cycle.

const epicMatches = [...content.matchAll(/^## Epic (\d+)/gm)];
if (epicMatches.length === 0) {
  fail(
    'ai-cadence-actuals.md has no ## Epic N section. ' +
      'Add a section for the current epic before starting Story 2.1.',
  );
}

const epicNumbers = epicMatches.map((m) => Number(m[1]));
const duplicateEpic = epicNumbers.find((n, i) => epicNumbers.indexOf(n) !== i);
if (duplicateEpic !== undefined) {
  fail(
    `ai-cadence-actuals.md has more than one "## Epic ${duplicateEpic}" section. ` +
      `Merge or remove the duplicate before this gate can pass.`,
  );
}

pass(`found ${epicMatches.length} epic section(s): ${epicMatches.map((m) => m[0]).join(', ')}`);

// ── 4. The most recent epic section must be open (currency check) ────────────
//
// Catches the "file exists, has a section, but was never updated for the
// current epic" case (the staleness half of AI-1's "absent or stale"
// requirement). The most recently numbered epic section must show
// "**Epic N closed**: TBD" — if it already has a real closed date, nobody
// opened a section for the epic actually in progress.

const maxEpicNumber = Math.max(...epicNumbers);
const maxEpicIndex = epicNumbers.indexOf(maxEpicNumber);
const sectionStart = epicMatches[maxEpicIndex].index ?? 0;
const sectionEnd = epicMatches[maxEpicIndex + 1]?.index ?? content.length;
const latestSection = content.slice(sectionStart, sectionEnd);

const closedTbdPattern = new RegExp(`\\*\\*Epic ${maxEpicNumber} closed\\*\\*:\\s*TBD`);
if (!closedTbdPattern.test(latestSection)) {
  fail(
    `The most recent epic section (Epic ${maxEpicNumber}) does not show ` +
      `"**Epic ${maxEpicNumber} closed**: TBD" — it appears to already be closed, ` +
      `with no open cycle. Open a "## Epic N" section for the epic currently in ` +
      `progress before this gate can pass (AI-1 currency requirement).`,
  );
}

pass(`latest epic section (Epic ${maxEpicNumber}) is open`);

// ── 5. Every epic section must have a total-hours summary row ────────────────
//
// Catches a section with a header but no "**Epic N total net hours**" line —
// a malformed/incomplete section that the WARN/INFO checks below would
// otherwise silently say nothing about.

const totalRows = (content.match(/^\*\*Epic \d+ total net hours\*\*:/gm) ?? []).length;
if (totalRows < epicMatches.length) {
  fail(
    `${epicMatches.length} epic section(s) found but only ${totalRows} have a ` +
      `"**Epic N total net hours**:" summary row. Every epic section must have one.`,
  );
}

// ── 6. Warn if all epic sections show UN-ATTESTED in their total row ──────────
//
// Not a hard failure — the cycle may be mid-epic. Emits a warning so the
// developer knows the measurement table is still empty.

const unattested = (content.match(/UN-ATTESTED/g) ?? []).length;
const tbd = (content.match(/^\*\*Epic \d+ total net hours\*\*: TBD/gm) ?? []).length;

if (tbd > 0 && tbd === totalRows) {
  process.stdout.write(
    `[cadence-check] WARN: all ${tbd} epic total(s) are TBD — ` +
      `fill in per-story measurements as stories complete.\n`,
  );
}

if (unattested > 0) {
  process.stdout.write(
    `[cadence-check] INFO: ${unattested} UN-ATTESTED mention(s) found (prose + rows) — ` +
      `these are recorded open risks, not failures.\n`,
  );
}

process.stdout.write('\n[cadence-check] PASSED\n');
