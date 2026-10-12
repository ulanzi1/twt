// scripts/dlt-typed-variables/lib.test.ts — the gate's NEGATIVE CONTROLS (Story 6.34 AC6;
// [[feedback_gate_scope_semantic_coverage]]): each rule fails on the thing it guards and passes its look-alikes, so a
// green scan means something.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { REGISTRY_FILES, checkScanCoverage, isCodeLine, scanDltText } from './lib.js';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const SHEET = 'docs/launch-gate-inventory/dlt-template-requests-6-19.md';
const REGISTRY = 'apps/jobs/src/scheduler/claim-correction-sms-templates.ts';
const UNLISTED = 'apps/jobs/src/scheduler/some-new-sender.ts';
const TYPED = '{#' + 'numeric' + '#}'; // a braced typed tag (the Jio / Vi in-text form)
const MARKER = '{#' + 'var' + '#}';
const rulesOf = (file: string, text: string) => scanDltText(file, text).map((f) => f.rule);

describe('rule (i) — ⛔ a braced typed tag in REGISTERED text', () => {
  it('a typed tag in a sheet TEMPLATE ROW fails; the same tag in backticked prose passes', () => {
    expect(rulesOf(SHEET, `| 15 | OTP | en | 5.9 | \`k\` | 1 numeric | ${TYPED} is your code. |`)).toEqual(['i']);
    expect(rulesOf(SHEET, `- never type \`${TYPED}\` into the text`)).toEqual([]);
    expect(rulesOf(SHEET, `## The ${TYPED} heading`)).toEqual([]);
  });

  it('the untyped marker in a sheet template row passes', () => {
    expect(rulesOf(SHEET, `| 2 | Claim ${MARKER}: the bank details … helpline on ${MARKER}. |`)).toEqual([]);
  });

  it('a typed tag on a CODE line of a registry file fails; on its comment lines it passes', () => {
    expect(rulesOf(REGISTRY, `      registeredText: '${TYPED} is your code',`)).toEqual(['i']);
    expect(rulesOf(REGISTRY, `// the type ${TYPED} is declared in slots`)).toEqual([]);
    expect(rulesOf(REGISTRY, ` * a doc line naming ${TYPED}`)).toEqual([]);
    expect(rulesOf(REGISTRY, `/** ${TYPED} */`)).toEqual([]);
  });

  it('the REAL dlt-variables.ts passes — its detector regex escapes its closing brace', () => {
    const rel = 'packages/channels/src/dlt-variables.ts';
    expect(REGISTRY_FILES).toContain(rel);
    expect(scanDltText(rel, fs.readFileSync(path.join(repoRoot, rel), 'utf8'))).toEqual([]);
  });

  it('isCodeLine: comment openers and continuations are ⛔ code; blank is ⛔ code', () => {
    expect(isCodeLine('  const x = 1;')).toBe(true);
    expect(isCodeLine('  // x')).toBe(false);
    expect(isCodeLine('  /* x */')).toBe(false);
    expect(isCodeLine('   * x')).toBe(false);
    expect(isCodeLine('   ')).toBe(false);
  });
});

describe('rule (ii) — the marker only in a registry file', () => {
  it('the marker in an UNLISTED source file fails — code line or comment', () => {
    expect(rulesOf(UNLISTED, `const text = 'Hello ${MARKER}';`)).toEqual(['ii']);
    expect(rulesOf(UNLISTED, `// the slot is ${MARKER}`)).toEqual(['ii']);
  });

  it('a LISTED registry file holding the marker passes', () => {
    expect(rulesOf(REGISTRY, `      registeredText: 'Claim ${MARKER}: call ${MARKER}.',`)).toEqual([]);
  });
});

describe('rule (iii) — the marker identifier and the template-id prefix only in a registry file', () => {
  it('an unlisted file using `${DLT_VAR}` fails (rule ii cannot see it — no literal marker)', () => {
    expect(rulesOf(UNLISTED, "import { DLT_VAR } from '@twt/channels';")).toEqual(['iii']);
    expect(rulesOf(UNLISTED, 'const text = `Hello ${DLT_VAR}`;')).toEqual(['iii']);
  });

  it("an unlisted file holding 'sms.dlt.template_id.x' fails", () => {
    expect(rulesOf(UNLISTED, "const key = 'sms.dlt.template_id.x';")).toEqual(['iii']);
  });

  it('a whole-word match only — a longer identifier passes', () => {
    expect(rulesOf(UNLISTED, 'const MY_DLT_VARIANT = 1;')).toEqual([]);
  });

  it("the allowlisted deps.ts may hold the prefix (its startup error string) — but ⛔ the marker", () => {
    expect(rulesOf('apps/api/src/deps.ts', "'(sms.dlt.template_id.otp_login / .otp_step_up)'")).toEqual([]);
    expect(rulesOf('apps/api/src/deps.ts', `'${MARKER}'`)).toEqual(['ii']);
  });

  it('a listed registry file using both passes', () => {
    expect(rulesOf(REGISTRY, "export { DLT_VAR };\n  dltTemplateIdConfigKey: 'sms.dlt.template_id.claim_correction.reminder.hi',")).toEqual([]);
  });
});

describe('the coverage check — ⛔ a silent drop-out', () => {
  it('fails on zero scanned source files and on zero sheets', () => {
    expect(checkScanCoverage([], [SHEET]).join(' ')).toMatch(/ZERO source files/);
    expect(checkScanCoverage([...REGISTRY_FILES], []).join(' ')).toMatch(/ZERO registration sheets/);
  });

  it('fails when a REGISTRY_FILES path is ⛔ in the scanned set (renamed / untracked)', () => {
    const missing = REGISTRY_FILES.slice(1);
    expect(checkScanCoverage(missing, [SHEET])).toEqual([expect.stringContaining(REGISTRY_FILES[0] as string)]);
  });

  it('passes when every registry file and a sheet are scanned', () => {
    expect(checkScanCoverage([...REGISTRY_FILES, UNLISTED], [SHEET])).toEqual([]);
  });
});
