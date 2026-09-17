// The sahyog-vivran-financial-truth scanner's TEETH — Story 11b.3 (Task 6; AC4).
//
// ⭐⭐ EVERY CASE BELOW IS A KNOWN-BAD FIXTURE THAT MUST GO RED. A gate proven only by a green scan
// over the files it was written for proves nothing — the story's own AC says so
// ([[feedback_gate_scope_semantic_coverage]]). The revert-sanity run against the REAL read path is
// recorded in the story's Dev Agent Record.

import { describe, expect, it } from 'vitest';

import {
  ALLOWED_EVENT_TYPES,
  findUnscannedCandidates,
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

  // ── ⭐ NARROWED AT STORY 11b.3b (AC11(b)) — the fixtures that PROVE the narrowing kept its teeth.
  // ⛔ A green scan proves nothing on its own; these pin both halves of the new shape.

  it('⭐ PERMITS the RULED `amountRaisedInr` to be NAMED on the render path (11b.3b AC3b)', () => {
    // ⛔ THE NARROWING'S WHOLE POINT. `2026-09-04-190` cl.6 rules this the public rupee figure and
    // `-189` cl.5 records the boundary as newly crossed ⇒ a rule banning the ruled field's own NAME
    // made the ruling unshippable. Taking it from the domain read is CONSUMPTION, not derivation.
    const src = `const vm = { amountRaisedInr: entry.amountRaisedInr };`;
    expect(scanFinancialTruth('render.ts', src, RENDER)).toEqual([]);
  });

  it('⛔ STILL FAILS on the domain\'s own spelling — ⚠ BOTH legs fire here, and that is the point', () => {
    // ⚠⛔⛔ **THIS TEST\'S TITLE USED TO SAY *"even when NO banned word is named"* — ⛔ AND ITS OWN
    // FIXTURE NAMED ONE.** `row.fixedAmount` is a {@link TARGET_OPERANDS} member, so this source trips
    // the NAME leg on its own; the test would have passed with the shape leg DELETED, and so proved
    // ⛔ nothing about it (`#decision-2026-09-16-219` cl.5(a), which ordered a test that ISOLATES the
    // shape leg — see the two below).
    // ⭐ Kept, re-titled, and SHARPENED to assert the count: exactly TWO findings — the product (shape)
    // and the `fixedAmount` identifier (name) — which pins the double-fire as the expected behaviour
    // rather than leaving it unstated.
    const src = `const total = confirmedContributionCount * row.fixedAmount;`;
    const findings = scanFinancialTruth('render.ts', src, RENDER);
    expect(findings.map((f) => f.rule)).toEqual([
      'render_path_multiplication',
      'render_path_multiplication',
    ]);
  });

  it('⭐⭐ THE SHAPE LEG, ISOLATED — a NAMED product with ⛔ NO banned word fires exactly ONCE', () => {
    // ⭐ `fixed_amount` (snake) is in {@link PER_MEMBER_AMOUNT} and ⛔ ABSENT from
    // {@link TARGET_OPERANDS} ⇒ the NAME leg cannot fire, and neither can it on
    // `confirmedContributionCount` or `row`. ⇒ a single finding here is the shape leg and ⛔ nothing
    // else. ⚠ Delete `isAmountDerivation` and this test goes RED — which the old one did not.
    const src = `const total = confirmedContributionCount * row.fixed_amount;`;
    const findings = scanFinancialTruth('render.ts', src, RENDER);
    expect(findings.map((f) => f.rule)).toEqual(['render_path_multiplication']);
  });

  it('⭐⭐ `-219` cl.5(a) — a HARD-CODED per-member amount fires, with ⛔ NO banned word anywhere', () => {
    // ⚠⛔⛔ **THE REGRESSION THE PANEL RULED ON.** AC11(b) dropped `amountRaisedInr` from
    // {@link TARGET_OPERANDS} — correctly — but the shape leg then required BOTH operands to be NAMED,
    // so this exact line passed GREEN, where before the narrowing it tripped the name rule.
    // ⛔ Nothing in this source is a banned word: ⛔ not `amountRaisedInr`, ⛔ not
    // `confirmedContributionCount`, ⛔ not `1000`.
    const src = `const amountRaisedInr = confirmedContributionCount * 1000;`;
    const findings = scanFinancialTruth('render.ts', src, RENDER);
    expect(findings.map((f) => f.rule)).toEqual(['render_path_multiplication']);
  });

  it('⭐ …and SYMMETRICALLY, with the literal on the LEFT', () => {
    const src = `const amountRaisedInr = 1000 * confirmedCount;`;
    const findings = scanFinancialTruth('render.ts', src, RENDER);
    expect(findings.map((f) => f.rule)).toEqual(['render_path_multiplication']);
  });

  it('⭐⭐ ANTI-VACUITY — the `.astro` TEMPLATE half is scanned, ⛔ not just the frontmatter', () => {
    // ⚠⛔⛔ **THE GATE WAS BLIND HERE, AND IT WAS FOUND BY ADVERSARIAL REVIEW, ⛔ not by this suite.**
    // Every file was parsed as `ScriptKind.TS`; an `.astro` file is frontmatter BETWEEN `---` fences
    // followed by a template, so the parse stopped at the first `<` and the template's `{...}`
    // expressions were ⛔ NEVER VISITED — while `-219` cl.5(b) records this gate as D1(c)'s SOLE
    // enforcement, and the template is the most natural place to write a figure on an Astro page.
    // ⛔⛔ **DO ⛔ NOT DELETE THIS TEST.** Without it `prepareSource` can silently regress to scanning
    // nothing and every other test in this file stays green.
    const astro = [
      '---',
      "import { t } from '@twt/i18n';",
      'const model = getModel();',
      '---',
      '<section>',
      '  <p>{confirmedContributionCount * 1000}</p>',
      '</section>',
    ].join('\n');
    const findings = scanFinancialTruth('page.astro', astro, RENDER);
    expect(findings.map((f) => f.rule)).toEqual(['render_path_multiplication']);
  });

  it('⭐ …and the FRONTMATTER half still is, with both halves in one walk', () => {
    const astro = [
      '---',
      'const total = confirmedContributionCount * row.fixed_amount;',
      '---',
      '<p>{confirmedContributionCount * 1000}</p>',
    ].join('\n');
    // ⭐ TWO findings — one per half. ⛔ A regression that drops either half changes this count.
    expect(scanFinancialTruth('page.astro', astro, RENDER)).toHaveLength(2);
  });

  it('⛔ `-1000`, `\'1000\'` and `*=` are ⛔ NOT escapes from the literal leg', () => {
    // ⚠ All three walked past the leg added at `-219` cl.5(a); found by adversarial review 2026-09-17.
    for (const src of [
      'const x = confirmedContributionCount * -1000;',
      "const x = confirmedContributionCount * '1000';",
      'confirmedCount *= 1000;',
    ]) {
      expect(scanFinancialTruth('render.ts', src, RENDER).map((f) => f.rule)).toEqual([
        'render_path_multiplication',
      ]);
    }
  });

  it('⛔ but a literal product over a NON-count operand is ⛔ NOT a finding (the leg is narrow)', () => {
    // ⚠ The leg keys on {@link COUNT_OPERAND}, ⛔ not on "any identifier times any number" — otherwise
    // every page-size, timeout and index arithmetic on the render path becomes a false positive, and a
    // noisy gate is the one that gets allow-listed.
    const src = `const width = columnCount * 1000;`;
    expect(scanFinancialTruth('render.ts', src, RENDER)).toEqual([]);
  });

  it('⛔ STILL FAILS on the TARGET and its factors reaching the render path', () => {
    // ⚠ `-204` cl.8 keeps these off the wire "BY CONSTRUCTION". ⛔ Naming is still enough for THESE.
    for (const name of ['rosterSize', 'expectedTotal', 'deliveredTotal']) {
      const findings = scanFinancialTruth('dto.ts', `const s = { ${name}: 1 };`, RENDER);
      expect(findings.map((f) => f.rule)).toEqual(['render_path_multiplication']);
    }
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

describe('findUnscannedCandidates — the SCOPE SAFEGUARD (review finding)', () => {
  it('⛔ FLAGS a candidate with no matching SCAN_FILES entry', () => {
    expect(findUnscannedCandidates(['a.ts', 'b.ts'], ['a.ts'])).toEqual(['b.ts']);
  });

  it('✓ finds nothing when every candidate is scanned', () => {
    expect(findUnscannedCandidates(['a.ts', 'b.ts'], ['a.ts', 'b.ts', 'c.ts'])).toEqual([]);
  });

  it('is pure and sorted, regardless of input order', () => {
    expect(findUnscannedCandidates(['z.ts', 'a.ts'], [])).toEqual(['a.ts', 'z.ts']);
  });
});
