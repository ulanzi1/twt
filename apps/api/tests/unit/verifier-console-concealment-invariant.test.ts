// Story 6.10 (D10) / Story 6.15 — concealment MUST NEVER be derived from the validity payload's
// `specialFlags` / `medicalDisclosureFlags` / `pendingConcealmentFlag`. Story 6.15 LANDED the claim-scoped
// producer: the console now sources `concealment.status` from `claim.assessClaimConcealment` (the verifier
// ASSESSMENT), NOT the hardcoded `not_evaluated` literal and NOT the redacted validity flags. This test now
// asserts that NEW discipline — the signal comes from the claim-scoped producer, still never from validity.
//
// Why a STRUCTURAL test, not a live-DB one: the risk this guards is future code drift — someone later wiring
// `concealment` to read `specialFlags` / `medicalDisclosureFlags` / `validity.` — which a structural source
// check catches better than a runtime fixture (the live end-to-end flagged/not_flagged/not_evaluated matrix
// is covered by the Story 6.15 integration + producer tests). The whole-file guard is preserved.

import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

const here = dirname(fileURLToPath(import.meta.url));
const handlersPath = resolve(here, '../../src/modules/claims/claims.verifier-console.handlers.ts');
const source = readFileSync(handlersPath, 'utf-8');

describe('concealment tri-state comes from the claim-scoped producer, never validity flags (D10 / Story 6.15)', () => {
  it('status is sourced from the claim-scoped producer (claim.assessClaimConcealment), not a validity read', () => {
    // The producer is invoked (the claim-scoped assessment path, D-D) and its result populates the signal.
    expect(source).toContain('claim.assessClaimConcealment');
    // The concealment object literal builds `status` from the producer result — NEVER a validity field.
    // The terminator requires the closing `}` to sit on its own line at the SAME indentation as the `const`
    // declaration (not just the first `};`/`});` anywhere in the lazy expansion) — a nested call/statement
    // inside the literal ending in `};` can't cause a silent early truncation that lets a violation pass.
    const match = source.match(/ {2}const concealment: ConcealmentSignal = (\{[\s\S]*?\n {2}\});/);
    expect(match).not.toBeNull();
    const literal = match![1];
    expect(literal).toContain('concealmentSignal.status');
    // Never derived from the redacted validity payload (the D10 invariant — an absence there can't
    // distinguish "no flag" from "redacted flag").
    expect(literal).not.toContain('specialFlags');
    expect(literal).not.toContain('pendingConcealmentFlag');
    expect(literal).not.toContain('medicalDisclosureFlags');
    expect(literal).not.toContain('validity.');
    expect(literal).not.toContain('payload.');
  });

  it('detailVisibility is an effective-scope authorization check (cycle.freeze), not a role-name check', () => {
    // D-C revision 4: `full` is derived from effective decide-authority (hasPermission cycle.freeze), NOT
    // the redaction.ts CONCEALMENT_VISIBLE_ROLES role-name set.
    expect(source).toContain(`rbac.hasPermission(ctx.grants, 'cycle.freeze'`);
    expect(source).not.toContain('CONCEALMENT_VISIBLE_ROLES');
  });

  it('no line in the assembler reads specialFlags/pendingConcealmentFlag/medicalDisclosureFlags INTO the concealment field', () => {
    // Broader whole-file guard: the ENTIRE file must never combine "concealment" and a redacted validity
    // flag identifier on the same line — deliberately loose so it also catches a future helper function
    // introduced elsewhere in this file, not just the current inline block.
    const suspiciousLines = source
      .split('\n')
      .filter(
        (line) =>
          /\bconcealment\b/i.test(line) &&
          (/specialFlags/.test(line) ||
            /pendingConcealmentFlag/.test(line) ||
            /medicalDisclosureFlags/.test(line)),
      );
    expect(suspiciousLines).toEqual([]);
  });
});
