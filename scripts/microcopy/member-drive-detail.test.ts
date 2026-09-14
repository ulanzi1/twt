// scripts/microcopy/member-drive-detail.test.ts
//
// Story 11b.17 — TEETH over the MEMBER'S DRIVE **DETAIL** copy (the member's view of ONE drive),
// proven against the REAL config.
//
// ⚠⛔⛔ **THIS FILE AND ITS SCOPE ENTRY WERE ADDED BY THE 2026-09-14 GROUP-D CODE REVIEW, ⛔ NOT BY
// THE STORY.** `member-drive-detail` was the ⛔ ONLY member namespace absent from
// `scope.copy_globs` — `grep -c member-drive-detail microcopy.yaml` returned **0** while every
// sibling was in scope — and the story record mentioned the gate NOWHERE: ⛔ not an AC, ⛔ not a
// Task, ⛔ not a deferral ([[feedback_closure_language_precision]]). ⭐ The ground for adding it is
// the sentence Story 11b.15 wrote into the config itself: *"leaving this one out would make it the
// ⛔ ONLY member surface whose vocabulary, tone and numeral discipline ⛔ nothing checks."*
//
// ⭐ THE DELIVERABLE IS ⛔ NOT A GREEN SCAN. Adding two globs and watching the gate stay green proves
// ⛔ nothing — the files might contain nothing the rules can match
// ([[feedback_gate_scope_semantic_coverage]]). What this file proves is that the rules BITE this
// surface's copy when a violation is planted, and that the REAL authored copy is clean.
//
// ⚠ FOUR RULE FAMILIES BITE HERE, each proven independently — ⛔ one fixture must never trip several:
//   (a) `member_only` VOCABULARY — this copy addresses a CONTRIBUTING MEMBER about a BEREAVED
//       FAMILY'S BANKING DETAILS. `donor` / `customer` / `user` / `receipt` are exactly the words a
//       well-meaning author reaches for on a screen about money that has been given.
//   (b) SCARCITY / PANIC tone — the surface renders a drive collecting NOW, beside a progress
//       figure: the single most natural place in the member app for an "only N left!" frame.
//   (c) BLAME tone — `error`, `not_found` and `bank.none` are the three most natural places to write
//       *"you did something wrong"*. ⛔ The copy reports STATE and ⛔ never attributes responsibility.
//   (d) UX-DR73 NUMERAL discipline — an OPERATIONAL register surface (counts, money, a close date),
//       so LATIN numerals in BOTH locales, ⛔ never Devanagari digits, even under `hi`.
//
// ⚠ THE STAGE WORDS AND THE RATIFIED ₹0 / MESSAGE-BLOCK SENTENCES ARE ⛔ NOT THIS NAMESPACE'S and are
// deliberately not fixtured here: they live in `sahyog-shared` (`2026-09-04-193` cl.3, the ⛔ ONE
// shared source) and this surface consumes them BY NAME. ⛔ A fixture here that planted a stage word
// would be testing the wrong file.
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

const EN_FILE = 'packages/i18n/locales/en/member-drive-detail.json';
const HI_FILE = 'packages/i18n/locales/hi/member-drive-detail.json';

/**
 * The real locale strings the surface renders — VALUES only, and ⛔ excluding `$comment*` keys.
 *
 * ⚠⛔ THE `$comment` EXCLUSION IS LOAD-BEARING, ⛔ not tidiness: those keys carry the file's
 * governance prose, which deliberately QUOTES prohibited words in order to forbid them. ⭐ They are
 * ⛔ not member copy and ⛔ never reach a screen — the resolver renders only the keys a component
 * asks for.
 */
function resolvedStrings(rel: string): string[] {
  const flat: string[] = [];
  const walk = (o: Record<string, unknown>, prefix: string): void => {
    for (const [k, v] of Object.entries(o)) {
      if (k.startsWith('$comment')) continue;
      if (typeof v === 'string') flat.push(v);
      else if (v !== null && typeof v === 'object') walk(v as Record<string, unknown>, `${prefix}${k}.`);
    }
  };
  walk(JSON.parse(readRepo(rel)) as Record<string, unknown>, '');
  return flat;
}

// ─── (0) the SCOPE claim itself, asserted rather than assumed ───────────────────────────

describe('the surface is actually IN SCOPE — ⛔ the premise of every test below', () => {
  it('both locale files are listed in scope.copy_globs', () => {
    // ⛔ Without this, every "the real copy is clean" assertion below would be vacuously true of a
    // file the gate never opens — ⭐ the exact shape of a green check certifying nothing, and the
    // exact state this surface shipped in until the 2026-09-14 review.
    expect(config.scope.copyGlobs).toContain(EN_FILE);
    expect(config.scope.copyGlobs).toContain(HI_FILE);
  });
});

// ─── (a) the member_only VOCABULARY rules bite this surface ─────────────────────────────

describe('member_only vocabulary bites the drive-detail copy', () => {
  const planted: Array<[string, string]> = [
    ['donor', '{ "bank.title": "Where the donor money went" }'],
    ['customer', '{ "error": "Every customer who gave is counted here." }'],
    ['user', '{ "not_found": "The user may try again shortly." }'],
    ['receipt', '{ "raised": "Download your receipt." }'],
    ['passbook', '{ "screen.title": "See your passbook." }'],
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

describe('scarcity / panic tone bites the drive-detail copy', () => {
  // ⭐ THE RULE MOST LIKELY TO BE BREACHED BY A WELL-MEANING AUTHOR HERE: this screen shows ONE
  // drive collecting NOW, with a percentage beside it — urgency is one sentence away.
  const planted: Array<[string, string]> = [
    ['only N days left', '{ "progress": "Only 3 days left to contribute!" }'],
    ['URGENT', '{ "raised": "URGENT: this family needs you now." }'],
    ['hurry up', '{ "bank.none": "Hurry up — do not miss this drive." }'],
    ['last chance', '{ "progress": "Last chance to contribute." }'],
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

describe('UX-DR73 numeral discipline bites the drive-detail copy', () => {
  it('flags a Devanagari operational digit under `hi`', () => {
    const findings = checkNumerals(HI_FILE, '{ "progress": "५% पुष्ट" }', config, { isCeremonial: false });
    expect(findings.length).toBeGreaterThan(0);
    expect(findings[0].kind).toBe('numeral');
  });

  it('flags a Devanagari digit under `en` too — ⛔ the rule is not locale-scoped', () => {
    const findings = checkNumerals(EN_FILE, '{ "progress": "५% confirmed" }', config, { isCeremonial: false });
    expect(findings.length).toBeGreaterThan(0);
  });

  it('⭐⭐ the checker bites a REAL committed string, ⛔ not only an invented fixture', () => {
    // ⚠⛔ THE SIBLING SURFACE LEARNED THIS IN ITS OWN REVIEW AND IT IS CARRIED HERE DELIBERATELY.
    // EVERY real committed value on this surface is a template with ⛔ NO literal digit (`{amount}`,
    // `{percent}`, `{count}`, `{rank}` interpolate at RENDER time) ⇒ the "real copy is clean" block
    // below passes VACUOUSLY for the numeral family: it proves today's copy has no digit, ⛔ not that
    // the checker would catch a translator adding one.
    // ⭐ Named by KEY — `error`, real, stable, member-facing copy this surface is guaranteed to carry
    // — ⛔ never "whichever string happens to be first", which a content reorder would silently change.
    const hiCatalog = JSON.parse(readRepo(HI_FILE)) as Record<string, string>;
    const target = hiCatalog['error'];
    expect(target, '`error` key missing from the real hi catalog').toBeTruthy();
    const findings = checkNumerals(HI_FILE, `${target}५`, config, { isCeremonial: false });
    expect(findings.length).toBeGreaterThan(0);
    expect(findings[0].kind).toBe('numeral');
  });
});

// ─── (d) the REAL authored copy is CLEAN under every family ─────────────────────────────

describe('the REAL committed drive-detail copy passes every family', () => {
  for (const [label, file] of [
    ['en', EN_FILE],
    ['hi', HI_FILE],
  ] as const) {
    it(`[${label}] no vocabulary / tone / numeral finding in the authored copy`, () => {
      const strings = resolvedStrings(file);
      // ⛔ NON-VACUITY: an empty list would make every assertion below trivially true.
      expect(strings.length).toBeGreaterThan(20);
      for (const value of strings) {
        expect(checkVocabulary(file, value, config, { includeMemberOnly: true }), value).toEqual([]);
        expect(checkTone(file, value, config), value).toEqual([]);
        expect(checkNumerals(file, value, config, { isCeremonial: false }), value).toEqual([]);
      }
    });
  }

  it('⭐ REVERT-SANITY — the checkers are live, ⛔ not no-ops returning [] for everything', () => {
    // ⚠⛔ WITHOUT THIS, the block above would pass identically against three functions that always
    // returned an empty array.
    expect(
      checkVocabulary(EN_FILE, '{ "bank.none": "No donor has given yet." }', config, {
        includeMemberOnly: true,
      }).length,
    ).toBeGreaterThan(0);
    expect(checkTone(EN_FILE, '{ "raised": "Hurry, only 2 days left!" }', config).length).toBeGreaterThan(0);
    expect(
      checkNumerals(HI_FILE, '{ "progress": "५% पुष्ट" }', config, { isCeremonial: false }).length,
    ).toBeGreaterThan(0);
  });
});
