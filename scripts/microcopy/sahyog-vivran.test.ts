// scripts/microcopy/sahyog-vivran.test.ts
//
// Story 11b.3 — TEETH over the PUBLIC per-claim Sahyog Vivran copy, proven against the REAL config.
//
// ⭐ THE DELIVERABLE IS NOT A GREEN SCAN. Adding two globs to `scope.copy_globs` and watching the
// gate stay green proves nothing at all — the files might contain nothing the rules can match
// ([[feedback_gate_scope_semantic_coverage]]). What this file proves is that the rules BITE this
// surface's copy when a violation is planted, and that the REAL authored copy is clean.
//
// ⚠ AND THIS SURFACE IS NAMED BY THE GATE ITSELF: Story 8.10's `out-of-band-blame` rule names
// **Epic 11b Story 11b.3** as its RE-TRIGGER in terms. The glob entry is what makes that trigger
// bite, and this file is what proves it bit.
//
// ⚠ FOUR RULE FAMILIES BITE HERE, each proven independently — ⛔ one fixture must never trip several
// checks:
//   (a) `member_only` VOCABULARY — `donor`, `Late Teacher`, `customer`, `user`, plus `report`.
//       ⭐ `report`'s canonical replacement IS THIS SURFACE'S NAME (*Sahyog Vivran*), so copy that
//       calls the page a "report" contradicts the very term the register exists to establish.
//   (b) the STRENGTHENED `pool-reality-comparison` TONE rule — this page renders Pool-Reality #2
//       framing, and AC3 forbids a comparison-to-target frame. The numbers are quarantined upstream
//       by `classifyCycleOutcome`; copy is the SECOND place that quarantine has to hold, because
//       copy is where a shortfall would actually surface to a grieving family.
//   (c) the `out-of-band-blame` TONE rule (Story 8.10 AC4) — its named re-trigger.
//   (d) UX-DR73 NUMERAL discipline — an OPERATIONAL register surface (drive codes, dates, counts),
//       so Latin numerals + Gregorian dates, ⛔ never Devanagari digits, even under `hi`.
//
// ⚠⛔ AND ONE PROHIBITION THE REGEX SET CANNOT EXPRESS: AC3's ban on ESTIMATES, PROJECTIONS and
// "X% confirmed so far" framing for a LIVE drive. ⛔ It is deliberately not faked into a tone rule
// here — natural language defeats that — and is asserted directly over the resolved copy in
// `apps/public/tests/sahyog-vivran-copy.test.ts`, with the HUMAN tone review (tone-guide §5) as the
// backstop.
//
// SELF-GREEN: this file lives under scripts/microcopy/**, which is excluded from the gate's own scan
// scope — the planted prohibited phrases below are fixtures, ⛔ never member copy.

import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import {
  type MicrocopyConfig,
  checkNumerals,
  checkTone,
  checkVocabulary,
  parseMicrocopyConfig,
} from './lib.js';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const readRepo = (rel: string): string => readFileSync(path.join(repoRoot, rel), 'utf8');

/** The REAL, committed gate config — the patterns under test. */
const config: MicrocopyConfig = parseMicrocopyConfig(readRepo('microcopy.yaml'));

const EN_FILE = 'packages/i18n/locales/en/sahyog-vivran.json';
const HI_FILE = 'packages/i18n/locales/hi/sahyog-vivran.json';

/** Resolve the real locale strings (values only) — the copy the surface renders. */
function resolvedStrings(rel: string): string[] {
  return Object.values(JSON.parse(readRepo(rel)) as Record<string, string>);
}

// ─── (0) the SCOPE claim itself, asserted rather than assumed ───────────────────────────

describe('the surface is actually IN SCOPE — ⛔ the premise of every test below', () => {
  it('both locale files are listed in scope.copy_globs', () => {
    // ⛔ Without this, every "the real copy is clean" assertion below would be vacuously true of a
    // file the gate never opens — the exact shape of a green check certifying nothing.
    expect(config.scope.copyGlobs).toContain(EN_FILE);
    expect(config.scope.copyGlobs).toContain(HI_FILE);
  });
});

// ─── (a) the member_only VOCABULARY rules bite this surface ─────────────────────────────

describe('member_only vocabulary bites the Sahyog Vivran copy (AC7)', () => {
  const planted: Array<[string, string]> = [
    ['donor', '{ "label.contributions": "Donor contributions" }'],
    ['Late Teacher', '{ "page.intro": "A drive for a Late Teacher." }'],
    ['customer', '{ "page.intro": "Every customer who gave is counted." }'],
    ['user', '{ "outage.body": "The user may try again shortly." }'],
    // ⭐ THE ONE THAT MATTERS MOST HERE: `report`'s canonical replacement is *Sahyog Vivran* — this
    // page's own name. Calling it a "report" contradicts the term the register exists to establish.
    ['report (→ Sahyog Vivran)', '{ "page.title": "Drive report" }'],
    ['receipt', '{ "label.contributions": "Download your receipt." }'],
    ['passbook', '{ "label.contributions": "See your passbook." }'],
  ];

  for (const [label, line] of planted) {
    it(`flags "${label}"`, () => {
      const findings = checkVocabulary(EN_FILE, line, config, { includeMemberOnly: true });
      expect(findings.length).toBeGreaterThan(0);
      expect(findings[0].kind).toBe('vocabulary');
    });
  }
});

// ─── (b) the strengthened pool-reality-comparison TONE rule bites ───────────────────────

describe('pool-reality-comparison bites the Sahyog Vivran copy (AC3, AC7)', () => {
  // ⭐ THE RULE MOST LIKELY TO BE BREACHED BY A WELL-MEANING AUTHOR ON THIS SURFACE — sharper here
  // than on the index, because a PER-CLAIM page invites "here is how this family's drive did against
  // what was needed", which is precisely the frame Pool-Reality #2 forbids.
  const planted: Array<[string, string]> = [
    ['fell short', '{ "outcome.under_funded": "This drive fell short of what was needed." }'],
    ['shortfall', '{ "outcome.under_funded": "The drive closed with a shortfall." }'],
    ['N% of the target', '{ "outcome.partial": "The family received 62% of the target." }'],
    ['did not reach', '{ "outcome.under_funded": "The pool did not reach the amount." }'],
    ['target was not met', '{ "outcome.under_funded": "The goal was not met this cycle." }'],
    ['Hindi: लक्ष्य से कम', '{ "outcome.under_funded": "इस बार अभियान लक्ष्य से कम रहा।" }'],
  ];

  for (const [label, line] of planted) {
    it(`flags "${label}"`, () => {
      const findings = checkTone(EN_FILE, line, config);
      expect(findings.length).toBeGreaterThan(0);
      expect(findings[0].kind).toBe('tone');
      expect(findings[0].replacement).toMatch(/pool-reality-comparison/);
    });
  }
});

// ─── (c) the out-of-band-blame rule bites — ⭐ THIS SURFACE IS ITS NAMED RE-TRIGGER ─────

describe('out-of-band-blame bites the Sahyog Vivran copy (Story 8.10 AC4, its named re-trigger)', () => {
  // ⚠ A member who sent money directly to a bereaved family did something HONOURABLE that the Pool
  // Engine structurally cannot capture. ⛔ No copy may frame it as wrong, mistaken, "outside the
  // system", or as not counting — and a transparency page is exactly where an author reaches for
  // "contributions made outside the system are not reflected here".
  const planted: Array<[string, string]> = [
    [
      'outside the system',
      '{ "page.intro": "Gifts made outside the system are not shown here." }',
    ],
    [
      "doesn't count",
      '{ "page.intro": "A gift sent directly does not count towards this drive." }',
    ],
    [
      'should have paid through the app',
      '{ "page.intro": "You should have paid through the app for it to appear." }',
    ],
  ];

  for (const [label, line] of planted) {
    it(`flags "${label}"`, () => {
      const findings = checkTone(EN_FILE, line, config);
      expect(findings.length).toBeGreaterThan(0);
      expect(findings.some((f) => /out-of-band-blame/.test(f.replacement))).toBe(true);
    });
  }
});

// ─── (d) the UX-DR73 numeral discipline bites ───────────────────────────────────────────

describe('numeral discipline bites the Sahyog Vivran copy (AC7)', () => {
  it('flags a Devanagari operational digit — ⛔ this is an OPERATIONAL register surface', () => {
    // Drive codes, dates and counts are facts a person may need to quote back to the helpline, so
    // they stay in Latin numerals + Gregorian dates even under `hi`.
    const dirty = '{ "appeal.stage": "अपील चरण २ पर पलटा गया" }';
    const findings = checkNumerals(HI_FILE, dirty, config, { isCeremonial: false });
    expect(findings.length).toBeGreaterThan(0);
    expect(findings[0].kind).toBe('numeral');
  });

  it('the SAME string in Latin numerals → no finding', () => {
    const clean = '{ "appeal.stage": "अपील चरण 2 पर पलटा गया" }';
    expect(checkNumerals(HI_FILE, clean, config, { isCeremonial: false })).toEqual([]);
  });
});

// ─── (e) revert-sanity: planted fails, clean passes, ON THIS SURFACE'S SHAPE ────────────

describe('planted-violation fixture fails, clean fixture passes (revert-sanity in-test)', () => {
  it('a fixture outcome line carrying a prohibited frame AND a prohibited term → found on both', () => {
    const dirty = '{ "outcome.under_funded": "This drive fell short; the donor report is below." }';
    expect(checkTone(EN_FILE, dirty, config).length).toBeGreaterThan(0);
    expect(
      checkVocabulary(EN_FILE, dirty, config, { includeMemberOnly: true }).length,
    ).toBeGreaterThan(0);
  });

  it('the SAME fixture rewritten in the sanctioned register → clean on BOTH rules', () => {
    const clean =
      '{ "outcome.under_funded": "The cycle closed. The trust met its commitment to the family." }';
    expect(checkTone(EN_FILE, clean, config)).toEqual([]);
    expect(checkVocabulary(EN_FILE, clean, config, { includeMemberOnly: true })).toEqual([]);
  });
});

// ─── (f) the load-bearing invariant — the REAL authored copy is clean ───────────────────

describe('the REAL Sahyog Vivran copy carries no prohibited term, frame or numeral', () => {
  for (const [locale, file] of [
    ['en', EN_FILE],
    ['hi', HI_FILE],
  ] as const) {
    it(`${locale}: no prohibited VOCABULARY`, () => {
      for (const s of resolvedStrings(file)) {
        expect(checkVocabulary(file, s, config, { includeMemberOnly: true })).toEqual([]);
      }
    });

    it(`${locale}: no prohibited TONE frame`, () => {
      for (const s of resolvedStrings(file)) {
        expect(checkTone(file, s, config)).toEqual([]);
      }
    });

    it(`${locale}: no Devanagari operational numeral`, () => {
      for (const s of resolvedStrings(file)) {
        expect(checkNumerals(file, s, config, { isCeremonial: false })).toEqual([]);
      }
    });
  }
});
