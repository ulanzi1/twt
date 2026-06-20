// scripts/cadence-check/check.ts
//
// AI-1 preflight / CI gate: assert ai-cadence-actuals.md is present and has at
// least one open Epic section. Fails if the file is absent (the A-5 failure mode)
// or if no ## Epic section exists (file is a bare stub, not opened for a cycle).
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

const content = fs.readFileSync(ACTUALS_PATH, 'utf8');
pass('ai-cadence-actuals.md exists');

// ── 2. File must not be empty ─────────────────────────────────────────────────

if (content.trim().length === 0) {
  fail('ai-cadence-actuals.md is empty. Open it for the current epic.');
}

// ── 3. File must have at least one ## Epic section ────────────────────────────
//
// Catches the "file exists but was never opened for an epic" case. A section
// header like "## Epic 2 — ..." is the minimum signal that instrumentation is
// active. An empty measurement table is OK (cycle opened but no stories done
// yet); a missing section header is not.

const epicSections = content.match(/^## Epic \d+/gm) ?? [];
if (epicSections.length === 0) {
  fail(
    'ai-cadence-actuals.md has no ## Epic N section. ' +
      'Add a section for the current epic before starting Story 2.1.',
  );
}

pass(`found ${epicSections.length} epic section(s): ${epicSections.join(', ')}`);

// ── 4. Warn if all epic sections show UN-ATTESTED in their total row ──────────
//
// Not a hard failure — the cycle may be mid-epic. Emits a warning so the
// developer knows the measurement table is still empty.

const unattested = (content.match(/UN-ATTESTED/g) ?? []).length;
const totalRows = (content.match(/^\*\*Epic \d+ total/gm) ?? []).length;
const tbd = (content.match(/^\*\*Epic \d+ total net hours\*\*: TBD/gm) ?? []).length;

if (tbd > 0 && tbd === totalRows) {
  process.stdout.write(
    `[cadence-check] WARN: all ${tbd} epic total(s) are TBD — ` +
      `fill in per-story measurements as stories complete.\n`,
  );
}

if (unattested > 0) {
  process.stdout.write(
    `[cadence-check] INFO: ${unattested} UN-ATTESTED row(s) in prior epics — ` +
      `these are recorded open risks, not failures.\n`,
  );
}

process.stdout.write('\n[cadence-check] PASSED\n');
