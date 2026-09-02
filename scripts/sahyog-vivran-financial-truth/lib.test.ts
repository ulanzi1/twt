// The sahyog-vivran-financial-truth scanner's TEETH — Story 11b.3 (Task 6; AC4).
//
// ⭐⭐ EVERY CASE BELOW IS A KNOWN-BAD FIXTURE THAT MUST GO RED. A gate proven only by a green scan
// over the files it was written for proves nothing — the story's own AC says so
// ([[feedback_gate_scope_semantic_coverage]]). The revert-sanity run against the REAL read path is
// recorded in the story's Dev Agent Record.

import { describe, expect, it } from 'vitest';

import {
  ALLOWED_EVENT_TYPES,
  PROHIBITED_IMPORTS,
  scanFinancialTruth,
} from './lib.js';

const DOMAIN = { renderPath: false } as const;
const RENDER = { renderPath: true } as const;

describe('rule (1) — the canonical event surface', () => {
  it('✓ accepts every allowed type', () => {
    const src = ALLOWED_EVENT_TYPES.map((t, i) => `const e${String(i)} = '${t}';`).join('\n');
    expect(scanFinancialTruth('f.ts', src, DOMAIN)).toEqual([]);
  });

  it('⛔ FAILS on a planted `contribution.utr-attested` read (the YELLOW source)', () => {
    // ⚠ THE HEADLINE CASE the AC names. Yellow is a member's CLAIM that they paid — intent, ⛔ not
    // confirmed money — and it must be structurally unable to reach a public transparency surface.
    const findings = scanFinancialTruth(
      'read.ts',
      `const t = 'contribution.utr-attested';`,
      DOMAIN,
    );
    expect(findings).toHaveLength(1);
    expect(findings[0]!.rule).toBe('event_surface');
    expect(findings[0]!.detail).toContain('contribution.utr-attested');
  });

  it('⛔ FAILS on a planted `contribution.reconciliation-mismatch` read', () => {
    const findings = scanFinancialTruth(
      'read.ts',
      `inArray(t, ['contribution.confirmed', 'contribution.reconciliation-mismatch'])`,
      DOMAIN,
    );
    expect(findings.map((f) => f.rule)).toEqual(['event_surface']);
  });

  it('⛔ FAILS on ANY other event type — it is an ALLOWLIST, ⛔ not a deny-list', () => {
    // ⭐ THIS IS THE CASE THAT MATTERS MOST. AC3's list of prohibited framings is explicitly
    // open-ended ("any aggregate mixing confirmed and unconfirmed counts"), so a deny-list would only
    // ever catch the sources somebody already thought of.
    const findings = scanFinancialTruth('read.ts', `const t = 'alert.opened';`, DOMAIN);
    expect(findings).toHaveLength(1);
  });

  it('⛔ FAILS on a TEMPLATE literal too — ⛔ backticks are not a way around the rule', () => {
    const findings = scanFinancialTruth('read.ts', 'const t = `contribution.utr-attested`;', DOMAIN);
    expect(findings).toHaveLength(1);
  });

  it('⭐ IGNORES COMMENTS — the prohibition may be WRITTEN DOWN without failing the gate', () => {
    // ⛔⛔ THE PROPERTY THAT MAKES THIS AN AST SCAN. These files are dense with comments that NAME the
    // prohibited types in order to forbid them. A line scan would fail on the prohibition itself, and
    // the only way to make it pass would be to DELETE the sentence explaining the rule.
    const src = [
      `// ⛔ NEVER contribution.utr-attested — yellow is intent, not confirmed money.`,
      `/* and never 'contribution.reconciliation-mismatch' either */`,
      `const t = 'contribution.confirmed';`,
    ].join('\n');
    expect(scanFinancialTruth('read.ts', src, DOMAIN)).toEqual([]);
  });

  it('⭐ IGNORES ordinary dotted strings — ⛔ the gate must not be noisy', () => {
    // A noisy gate gets an allow-list, which is how it stops meaning anything.
    const src = [
      `const a = 'application/json';`,
      `const b = 'x-forwarded-for';`,
      `import x from 'node:crypto';`,
      `const c = 'P-2026-09-003';`,
      `const d = 'sahyog-vivran.json';`,
    ].join('\n');
    expect(scanFinancialTruth('read.ts', src, DOMAIN)).toEqual([]);
  });
});

describe('rule (2) — prohibited attestation-derived imports', () => {
  it('⛔ FAILS on each prohibited symbol', () => {
    // ⭐ RULE (1) CANNOT SEE THESE: the accessor reads the prohibited event type in ANOTHER file, so
    // no prohibited literal ever appears on the read path.
    for (const symbol of PROHIBITED_IMPORTS) {
      const findings = scanFinancialTruth(
        'read.ts',
        `import { ${symbol} } from '../contribution/read.js';`,
        DOMAIN,
      );
      expect(findings.map((f) => f.rule)).toEqual(['prohibited_import']);
    }
  });

  it('⛔ FAILS on an ALIASED prohibited import', () => {
    const findings = scanFinancialTruth(
      'read.ts',
      `import { hasAttestedContribution as check } from '../contribution/read.js';`,
      DOMAIN,
    );
    expect(findings.map((f) => f.rule)).toEqual(['prohibited_import']);
  });

  it('✓ accepts the canonical confirmed accessor', () => {
    const findings = scanFinancialTruth(
      'read.ts',
      `import { listConfirmedContributorsForPool } from '../contribution/read.js';`,
      DOMAIN,
    );
    expect(findings).toEqual([]);
  });
});

describe('rule (3) — D1(c), the render-path multiplication, MECHANIZED', () => {
  it('⛔ FAILS on a local `confirmedCount * fixedAmount` in the render path', () => {
    const findings = scanFinancialTruth(
      'render.ts',
      `const amountRaisedInr = confirmedCount * fixedAmount;`,
      RENDER,
    );
    expect(findings.length).toBeGreaterThan(0);
    expect(findings.every((f) => f.rule === 'render_path_multiplication')).toBe(true);
  });

  it('⛔ FAILS on an amount operand merely REACHING the wire shape', () => {
    // ⚠ Naming it is enough: a `fixedAmount` on the DTO is the operand a later story multiplies.
    const findings = scanFinancialTruth('dto.ts', `const s = { fixedAmount: 500 };`, RENDER);
    expect(findings.map((f) => f.rule)).toEqual(['render_path_multiplication']);
  });

  it('⭐ does NOT fire on the DOMAIN read — the quarantine must stay buildable', () => {
    // ⛔ SCOPED DELIBERATELY. `classifyCycleOutcome` compares totals INSIDE the domain read and only
    // an opaque enum leaves it. Banning `fixedAmount` there would forbid the quarantine itself.
    const src = `classifyCycleOutcome({ expectedTotal: assignedCount * row.fixedAmount, deliveredTotal: n * row.fixedAmount });`;
    expect(scanFinancialTruth('read.ts', src, DOMAIN)).toEqual([]);
    expect(scanFinancialTruth('render.ts', src, RENDER).length).toBeGreaterThan(0);
  });
});

describe('the scanner is PURE', () => {
  it('does not mutate its inputs and is deterministic', () => {
    const src = `const t = 'contribution.confirmed';`;
    const a = scanFinancialTruth('f.ts', src, DOMAIN);
    const b = scanFinancialTruth('f.ts', src, DOMAIN);
    expect(a).toEqual(b);
    expect(src).toBe(`const t = 'contribution.confirmed';`);
  });
});
