// Story 6.10 (D10) — concealment MUST NEVER be derived from the validity payload's `specialFlags` /
// `medicalDisclosureFlags`, and an absent producer must render `not_evaluated` (never `not_flagged`,
// `empty`, or a green/clear).
//
// Why a STRUCTURAL test, not a live-DB one: `assembleValidity` (claims.verifier-console.handlers.ts)
// calls `getValidityCached` WITHOUT injecting a `ConcealmentAssessment` — and
// `deriveMedicalDisclosureFlags` (packages/validity-service/src/producer.ts) only ever sets
// `pendingConcealmentFlag: true` when a caller injects one. So a "flagged" validity payload cannot be
// produced through 6.10's own real call path today (this itself is independent confirmation of D10 —
// "no claim-linked concealment producer exists"). The residual risk is future code drift — someone
// later wiring `concealment` to read `specialFlags`/`medicalDisclosureFlags` — which a structural
// source check catches better than a runtime fixture that can't represent the drifted state anyway.

import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

const here = dirname(fileURLToPath(import.meta.url));
const handlersPath = resolve(here, '../../src/modules/claims/claims.verifier-console.handlers.ts');
const source = readFileSync(handlersPath, 'utf-8');

describe('concealment tri-state never derives from validity flags (D10)', () => {
  it('the concealment assignment is the fixed not_evaluated/indicator_only literal', () => {
    const match = source.match(/const concealment = (\{[^;]*\}) as const;/);
    expect(match).not.toBeNull();
    const literal = match![1];
    expect(literal).toContain(`status: 'not_evaluated'`);
    expect(literal).toContain(`detailVisibility: 'indicator_only'`);
    // Never a green/clear default, and never a computed expression referencing validity data.
    expect(literal).not.toContain('not_flagged');
    expect(literal).not.toContain('specialFlags');
    expect(literal).not.toContain('pendingConcealmentFlag');
    expect(literal).not.toContain('validity.');
    expect(literal).not.toContain('payload.');
  });

  it('no line in the assembler reads specialFlags/pendingConcealmentFlag INTO the concealment field', () => {
    // Broader guard: the ENTIRE file must never combine "concealment" and "specialFlags" /
    // "pendingConcealmentFlag" on a line that assigns one from the other — this is deliberately loose
    // (whole-file scan for the two dangerous identifiers) so it also catches a future helper function
    // introduced elsewhere in this file, not just the current inline literal.
    const suspiciousLines = source
      .split('\n')
      .filter((line) => /\bconcealment\b/i.test(line) && (/specialFlags/.test(line) || /pendingConcealmentFlag/.test(line)));
    expect(suspiciousLines).toEqual([]);
  });
});
