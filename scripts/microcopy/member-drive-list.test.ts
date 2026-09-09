// scripts/microcopy/member-drive-list.test.ts
//
// Story 11b.15 — TEETH over the MEMBER'S DRIVE LIST copy (the fourth tab), proven against the REAL
// config.
//
// ⭐ THE DELIVERABLE IS ⛔ NOT A GREEN SCAN. Adding two globs to `scope.copy_globs` and watching the
// gate stay green proves ⛔ nothing at all — the files might contain nothing the rules can match
// ([[feedback_gate_scope_semantic_coverage]]). What this file proves is that the rules BITE this
// surface's copy when a violation is planted, and that the REAL authored copy is clean.
//
// ⚠ FOUR RULE FAMILIES BITE HERE, each proven independently — ⛔ one fixture must never trip several
// checks:
//   (a) `member_only` VOCABULARY — this copy addresses a CONTRIBUTING MEMBER about their Pariwar's
//       drives, so `donor` / `customer` / `user` / `receipt` are exactly the words a well-meaning
//       author reaches for on a list of money that has been given.
//   (b) the SCARCITY / PANIC tone rules — the list's top row is a drive collecting NOW, which is the
//       single most natural place in the member app for an "only N left!" frame to appear.
//   (c) the BLAME tone rules — the EMPTY and ERROR states are the two most natural places to write
//       *"you have no drives"* or *"check your connection"*. ⛔ The copy reports STATE and never
//       attributes responsibility.
//   (d) UX-DR73 NUMERAL discipline — an OPERATIONAL register surface (counts, money, dates), so
//       LATIN numerals in BOTH locales, ⛔ never Devanagari digits, even under `hi`.
//
// ⚠ THE STAGE WORDS ARE ⛔ NOT THIS NAMESPACE'S and are deliberately not fixtured here: they live in
// `sahyog-shared` (`2026-09-04-193` cl.3, the ⛔ ONE shared source) and this surface consumes them by
// name. ⛔ A fixture here that planted a stage word would be testing the wrong file.
//
// SELF-GREEN: this file lives under `scripts/microcopy/**`, which is excluded from the gate's own
// scan scope — the planted prohibited phrases below are FIXTURES, ⛔ never member copy.

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

const EN_FILE = 'packages/i18n/locales/en/member-drive-list.json';
const HI_FILE = 'packages/i18n/locales/hi/member-drive-list.json';

/**
 * The real locale strings the surface renders — VALUES only, and ⛔ excluding `$comment*` keys.
 *
 * ⚠⛔ THE `$comment` EXCLUSION IS LOAD-BEARING, ⛔ not tidiness: those keys carry the file's
 * governance prose, which deliberately QUOTES prohibited words in order to forbid them
 * (*"⛔ never `toHindiNumeral`"*, *"never blame the member"*). ⭐ They are ⛔ not member copy and
 * ⛔ never reach a screen — the resolver renders only the keys a component asks for.
 */
function resolvedStrings(rel: string): string[] {
  return Object.entries(JSON.parse(readRepo(rel)) as Record<string, string>)
    .filter(([key]) => !key.startsWith('$comment'))
    .map(([, value]) => value);
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

describe('member_only vocabulary bites the drive-list copy', () => {
  const planted: Array<[string, string]> = [
    ['donor', '{ "row.amount": "Donor contributions so far" }'],
    ['customer', '{ "empty": "Every customer who gave is counted here." }'],
    ['user', '{ "error": "The user may try again shortly." }'],
    ['receipt', '{ "row.amount": "Download your receipt." }'],
    ['passbook', '{ "screen.subtitle": "See your passbook." }'],
  ];

  for (const [label, line] of planted) {
    it(`flags "${label}"`, () => {
      const findings = checkVocabulary(EN_FILE, line, config, { includeMemberOnly: true });
      expect(findings.length).toBeGreaterThan(0);
      expect(findings[0].kind).toBe('vocabulary');
    });
  }
});

// ─── (b) the SCARCITY / PANIC tone rules bite ───────────────────────────────────────────

describe('scarcity / panic tone bites the drive-list copy', () => {
  // ⭐ THE RULE MOST LIKELY TO BE BREACHED BY A WELL-MEANING AUTHOR HERE: the top row of this list is
  // a drive COLLECTING NOW, and a list is where "urgency" gets added to drive engagement.
  const planted: Array<[string, string]> = [
    ['only N days left', '{ "row.contributions": "Only 3 days left to contribute!" }'],
    ['URGENT', '{ "screen.subtitle": "URGENT: your Pariwar needs you now." }'],
    // ⚠⛔ `hurry up`, ⛔ NOT a bare "hurry" — and the distinction is the CONFIG's, deliberately.
    // The gate binds to the IMPERATIVE construction because the fursat register's own shipped
    // reassurance is *"there is no hurry"* / *"कोई जल्दी नहीं है"*, which must ⛔ NOT be flagged.
    // ⭐ Found by this fixture failing on a bare "Hurry —"; ⛔ the rule is right and the fixture was
    // wrong ([[feedback_negative_claims_checkable_in_repo]] — the pattern was read, not assumed).
    ['hurry up', '{ "empty": "Hurry up — do not miss the next drive." }'],
    ['last chance', '{ "row.amount": "Last chance to contribute." }'],
  ];

  for (const [label, line] of planted) {
    it(`flags "${label}"`, () => {
      const findings = checkTone(EN_FILE, line, config);
      expect(findings.length).toBeGreaterThan(0);
      expect(findings[0].kind).toBe('tone');
    });
  }
});

// ─── (c) UX-DR73 NUMERAL discipline bites BOTH locales ──────────────────────────────────

describe('UX-DR73 numeral discipline bites the drive-list copy', () => {
  it('flags a Devanagari operational digit under `hi`', () => {
    // ⚠ Counts, money and dates on this surface are OPERATIONAL data ⇒ LATIN in both locales
    // (amendment-A2). A Devanagari digit here would be the one thing the `hi` file most naturally
    // acquires from a translator working without that rule in front of them.
    const findings = checkNumerals(HI_FILE, '{ "row.contributions": "५ पुष्ट" }', config, { isCeremonial: false });
    expect(findings.length).toBeGreaterThan(0);
    expect(findings[0].kind).toBe('numeral');
  });

  it('flags a Devanagari digit under `en` too — ⛔ the rule is not locale-scoped', () => {
    const findings = checkNumerals(EN_FILE, '{ "row.contributions": "५ confirmed" }', config, { isCeremonial: false });
    expect(findings.length).toBeGreaterThan(0);
  });

  it('⭐⭐ [Review][Patch] code review of 11b-15 (2026-09-09) — the checker bites a REAL committed string, not only an invented fixture', () => {
    // ⚠⛔ BEFORE THIS PATCH every numeral-discipline fixture above was entirely synthetic
    // ("row.contributions": "५ पुष्ट") — a shape that never existed in the real file. ⭐ EVERY real
    // committed value in this surface is a template with NO literal digit (`{count}`, `{amount}`,
    // `{percent}`, `{date}` are interpolated at RENDER time, never baked into the JSON), so section
    // (d) below ("the REAL copy is clean") passes VACUOUSLY for the numeral family — it proves
    // today's copy has no digit, ⛔ not that the checker would catch a translator adding one. This
    // test closes that gap: take a REAL committed hi value, plant one Devanagari digit into it, and
    // confirm the checker fires against genuine content, not an invented shape.
    //
    // ⚠⛔ [Review][Patch] — code review of 11b-15 (2026-09-09), SECOND pass: the target used to be
    // `resolvedStrings(HI_FILE).find((v) => v.length > 0)` — whichever string happened to be FIRST in
    // object-insertion order, unnamed and unlogged. A future content edit reordering `HI_FILE` could
    // silently change what this test exercises without anyone noticing its semantics shifted. ⭐ Named
    // by KEY instead — `error`, chosen because it is real, stable, member-facing copy this surface is
    // guaranteed to carry (asserted directly against the source JSON, not merely "some string").
    const hiCatalog = JSON.parse(readRepo(HI_FILE)) as Record<string, string>;
    const target = hiCatalog['error'];
    expect(target, '`error` key missing from the real hi catalog').toBeTruthy();
    const findings = checkNumerals(HI_FILE, `${target}५`, config, { isCeremonial: false });
    expect(findings.length).toBeGreaterThan(0);
    expect(findings[0].kind).toBe('numeral');
  });
});

// ─── (d) the REAL authored copy is CLEAN under every family ─────────────────────────────

describe('the REAL committed drive-list copy passes every family', () => {
  for (const [label, file] of [
    ['en', EN_FILE],
    ['hi', HI_FILE],
  ] as const) {
    it(`[${label}] no vocabulary / tone / numeral finding in the authored copy`, () => {
      const strings = resolvedStrings(file);
      // ⛔ ANTI-VACUITY: a renamed or emptied file would otherwise pass this trivially.
      expect(strings.length).toBeGreaterThan(5);

      for (const value of strings) {
        expect(checkVocabulary(file, value, config, { includeMemberOnly: true }), value).toEqual([]);
        expect(checkTone(file, value, config), value).toEqual([]);
        expect(checkNumerals(file, value, config, { isCeremonial: false }), value).toEqual([]);
      }
    });
  }

  it('⭐ REVERT-SANITY — the checkers are live, ⛔ not no-ops returning [] for everything', () => {
    // ⚠⛔ WITHOUT THIS, the block above would pass identically against three functions that always
    // returned an empty array. ⭐ Each checker must produce a finding for a KNOWN-bad line drawn
    // from THIS surface's own register.
    expect(
      checkVocabulary(EN_FILE, '{ "empty": "No donor has given yet." }', config, {
        includeMemberOnly: true,
      }).length,
    ).toBeGreaterThan(0);
    expect(checkTone(EN_FILE, '{ "empty": "Hurry, only 2 days left!" }', config).length).toBeGreaterThan(0);
    expect(checkNumerals(HI_FILE, '{ "row.contributions": "५ पुष्ट" }', config, { isCeremonial: false }).length).toBeGreaterThan(0);
  });
});
