// scripts/microcopy/sahyog-drive.test.ts
//
// Story 11b.1 — TEETH over the PUBLIC Sahyog Drive copy, proven against the REAL config.
//
// ⭐ THE DELIVERABLE IS NOT A GREEN SCAN. Adding two globs to `scope.copy_globs` and watching the
// gate stay green proves nothing at all — the files might contain nothing the rules can match
// ([[feedback_gate_scope_semantic_coverage]]). What this file proves is that the rules BITE this
// surface's copy when a violation is planted, and that the REAL authored copy is clean.
//
// ⚠ THREE RULE FAMILIES BITE HERE, and each is proven independently — ⛔ one fixture must never
// trip several checks:
//   (a) `member_only` VOCABULARY — `donor` and `Late Teacher` were UNSCANNED before this story's
//       glob entry existed. ⭐ That matters concretely: the UX spec's own Sahyog List column
//       inventory uses BOTH as column headings (D5(a) records the amendment it owes), so copying
//       that inventory would have shipped clean without this entry.
//   (b) the STRENGTHENED `pool-reality-comparison` TONE rule — this surface renders Pool-Reality #2
//       framing. The numbers are already quarantined upstream by `classifyCycleOutcome`; copy is
//       the second place that quarantine has to hold, because copy is where a shortfall would
//       actually surface to a grieving family.
//   (c) UX-DR73 NUMERAL discipline — an OPERATIONAL register surface (drive codes, dates), so
//       Latin numerals + Gregorian dates, ⛔ never Devanagari digits, even under `hi`.
//
// SELF-GREEN: this file lives under scripts/microcopy/**, which is excluded from the gate's own
// scan scope — the planted prohibited phrases below are fixtures, ⛔ never member copy.

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

const EN_FILE = 'packages/i18n/locales/en/sahyog-drive.json';
const HI_FILE = 'packages/i18n/locales/hi/sahyog-drive.json';

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

describe('member_only vocabulary bites the Sahyog Drive copy (AC4)', () => {
  // Each is a term a well-meaning author would reach for on a contributions page — and each is one
  // the UX spec's own column inventory actually uses.
  const planted: Array<[string, string]> = [
    ['donor (the UX spec\'s "Donor Name" column)', '{ "table.col.name": "Donor Name" }'],
    ['Late Teacher (the UX spec\'s column heading)', '{ "table.col.name": "Late Teacher" }'],
    ['customer', '{ "page.intro": "Every customer who gave is counted." }'],
    ['report (→ Sahyog Vivran)', '{ "page.title": "Contribution report" }'],
    ['receipt', '{ "value.x": "Download your receipt." }'],
    ['passbook', '{ "value.x": "See your passbook." }'],
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

describe('pool-reality-comparison bites the Sahyog Drive copy (AC4)', () => {
  // ⭐ THIS IS THE RULE MOST LIKELY TO BE BREACHED BY A WELL-MEANING AUTHOR on this surface: a
  // transparency page invites "here is how much was raised against what was needed", which is
  // precisely the frame Pool-Reality #2 forbids.
  const planted: Array<[string, string]> = [
    ['fell short', '{ "outcome.under_funded": "This drive fell short of what was needed." }'],
    ['shortfall', '{ "outcome.under_funded": "The drive closed with a shortfall." }'],
    ['N% of the target', '{ "outcome.partial": "The family received 62% of the target." }'],
    ['did not reach', '{ "outcome.under_funded": "The pool did not reach the amount." }'],
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

// ─── (c) the UX-DR73 numeral discipline bites ───────────────────────────────────────────

describe('numeral discipline bites the Sahyog Drive copy (Task 5)', () => {
  it('flags a Devanagari operational digit — ⛔ this is an OPERATIONAL register surface', () => {
    // Drive codes and dates are facts a person may need to quote back to the helpline, so they
    // stay in Latin numerals + Gregorian dates even under `hi`.
    const dirty = '{ "pagination.status": "पृष्ठ २, कुल ५" }';
    const findings = checkNumerals(HI_FILE, dirty, config, { isCeremonial: false });
    expect(findings.length).toBeGreaterThan(0);
    expect(findings[0].kind).toBe('numeral');
  });

  it('the SAME string in Latin numerals → no finding', () => {
    const clean = '{ "pagination.status": "पृष्ठ 2, कुल 5" }';
    expect(checkNumerals(HI_FILE, clean, config, { isCeremonial: false })).toEqual([]);
  });
});

// ─── (d) revert-sanity: planted fails, clean passes, ON THIS SURFACE'S SHAPE ────────────

describe('planted-violation fixture fails, clean fixture passes (revert-sanity in-test)', () => {
  it('a fixture drive-index row carrying a prohibited frame → found', () => {
    const dirty =
      '{ "outcome.under_funded": "This drive fell short; the donor list is below." }';
    expect(checkTone(EN_FILE, dirty, config).length).toBeGreaterThan(0);
    expect(checkVocabulary(EN_FILE, dirty, config, { includeMemberOnly: true }).length)
      .toBeGreaterThan(0);
  });

  it('the SAME fixture rewritten in the sanctioned register → clean on BOTH rules', () => {
    const clean =
      '{ "outcome.under_funded": "The cycle closed. The trust met its commitment to the family." }';
    expect(checkTone(EN_FILE, clean, config)).toEqual([]);
    expect(checkVocabulary(EN_FILE, clean, config, { includeMemberOnly: true })).toEqual([]);
  });
});

// ─── (e) the load-bearing invariant — the REAL authored copy is clean ───────────────────

describe('the REAL Sahyog Drive copy carries no prohibited term, frame or numeral', () => {
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

    it(`${locale}: no Devanagari operational digit`, () => {
      for (const s of resolvedStrings(file)) {
        expect(checkNumerals(file, s, config, { isCeremonial: false })).toEqual([]);
      }
    });
  }
});
