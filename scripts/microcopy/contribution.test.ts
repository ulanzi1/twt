// scripts/microcopy/contribution.test.ts
//
// Story 8.2 — TEETH over the My Pool <ActiveContributionCard> tone-gradient copy, proven against the
// REAL config. Mirrors close-of-cycle.test.ts (Story 7.8): it loads the ACTUAL microcopy.yaml + the
// ACTUAL contribution.json locale files off disk and runs the real `checkTone` / `checkNumerals` over
// them. The deliverable is not "a green scan" but proof that (a) the scarcity/panic tone patterns +
// the UX-DR73 Devanagari-digit discipline BITE a planted 15-day-nudge violation on this surface, and
// (b) the REAL authored tone-gradient copy is clean (AC3 / [[feedback_gate_scope_semantic_coverage]]
// — teeth over green: the `contribution` namespace was NOT in copy_globs before this story, so a green
// scan proved nothing until the scope was extended + these teeth added).
//
// SELF-GREEN: this file lives under scripts/microcopy/**, excluded from the gate's own scan scope —
// the planted prohibited phrases below are fixtures, never member copy.

import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { type MicrocopyConfig, checkNumerals, checkTone, parseMicrocopyConfig } from './lib.js';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const readRepo = (rel: string): string => readFileSync(path.join(repoRoot, rel), 'utf8');

/** The REAL, committed gate config. */
const config: MicrocopyConfig = parseMicrocopyConfig(readRepo('microcopy.yaml'));

const EN_FILE = 'packages/i18n/locales/en/contribution.json';
const HI_FILE = 'packages/i18n/locales/hi/contribution.json';

/** Resolve the real locale strings (values only) — the copy the card renders. */
function resolvedStrings(rel: string): string[] {
  return Object.values(JSON.parse(readRepo(rel)) as Record<string, string>);
}

// ─── (a) the scarcity / panic tone patterns bite a 15-day nudge phrasing ──────────────────

describe('tone — scarcity/panic frames bite the contribution surface (AC3)', () => {
  const planted: Array<[string, string]> = [
    ['scarcity: only N days left', 'Hurry — only 2 days left to contribute!'],
    ['scarcity: only 1 day left', 'only 1 day left, act now'],
    ['panic: URGENT', 'URGENT: your pool closes today'],
  ];
  for (const [label, line] of planted) {
    it(`flags "${label}"`, () => {
      const findings = checkTone(EN_FILE, line, config);
      expect(findings.length).toBeGreaterThan(0);
      expect(findings[0].kind).toBe('tone');
    });
  }
});

// ─── (b) a planted violation in a contribution-shaped fixture fails; clean passes ─────────

describe('planted-violation fixture fails, clean fixture passes (revert-sanity in-test)', () => {
  it('a fixture tone body carrying a scarcity frame → checkTone finds it', () => {
    const dirty = '{ "active_contribution.tone.closing": "Only 1 day left — hurry!" }';
    expect(checkTone(EN_FILE, dirty, config).length).toBeGreaterThan(0);
  });

  it('the SAME fixture with the prohibited frame removed → no finding', () => {
    const clean = '{ "active_contribution.tone.closing": "Last day — please contribute to support the family." }';
    expect(checkTone(EN_FILE, clean, config)).toEqual([]);
  });

  it('a fixture Hindi body with a Devanagari operational digit → checkNumerals finds it (UX-DR73)', () => {
    const dirty = '{ "active_contribution.tone.factual": "१२ दिन शेष" }';
    expect(checkNumerals(HI_FILE, dirty, config, { isCeremonial: false }).length).toBeGreaterThan(0);
  });
});

// ─── (c) the load-bearing invariant — the REAL authored copy is clean ─────────────────────

describe('AC3 — the real contribution tone-gradient copy carries no prohibited frame or digit', () => {
  for (const [locale, file] of [
    ['en', EN_FILE],
    ['hi', HI_FILE],
  ] as const) {
    it(`checkTone over every ${locale} contribution string returns empty`, () => {
      for (const s of resolvedStrings(file)) {
        expect(checkTone(file, s, config), `prohibited frame in ${locale}: "${s}"`).toEqual([]);
      }
    });
    it(`checkNumerals over every ${locale} contribution string returns empty (Latin operational numerals)`, () => {
      for (const s of resolvedStrings(file)) {
        expect(
          checkNumerals(file, s, config, { isCeremonial: false }),
          `Devanagari digit in ${locale}: "${s}"`,
        ).toEqual([]);
      }
    });
  }
});
