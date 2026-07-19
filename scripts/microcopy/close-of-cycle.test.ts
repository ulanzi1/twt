// scripts/microcopy/close-of-cycle.test.ts
//
// Story 7.8 — TEETH over the close-of-cycle member surface, proven against the REAL config.
//
// Unlike lib.test.ts (which unit-tests the pure engine against an INLINE SAMPLE_YAML), this
// file loads the ACTUAL microcopy.yaml + the ACTUAL close-of-cycle.json locale files off disk
// and runs the real `checkTone` over them. That is deliberate: the deliverable is not "a green
// scan" but proof that the STRENGTHENED `pool-reality-comparison` pattern (a) BITES a planted
// Pool-Reality #2 phrase on this surface, and (b) leaves the REAL authored copy clean
// (AC2 / AC10 / [[feedback_gate_scope_semantic_coverage]] — teeth over green).
//
// Cross-package note (the story's Dev Notes): the AC10 "resolve the real templates → checkTone
// empty" assertion is homed HERE (same package as `checkTone` + the real `microcopy.yaml`
// parser) rather than in packages/domain (which cannot import across the non-workspace scripts/
// boundary) and rather than re-implementing the tone regex (which would silently drift from the
// real gate pattern). The strings are read directly from the committed close-of-cycle.json —
// byte-identical to what `@twt/i18n` `getCatalog` would return, but with no root-dependency wiring.
//
// SELF-GREEN: this file lives under scripts/microcopy/**, which is excluded from the gate's own
// scan scope — the planted prohibited phrases below are fixtures, never member copy.

import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { type MicrocopyConfig, checkTone, parseMicrocopyConfig } from './lib.js';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const readRepo = (rel: string): string => readFileSync(path.join(repoRoot, rel), 'utf8');

/** The REAL, committed gate config — the strengthened pattern under test. */
const config: MicrocopyConfig = parseMicrocopyConfig(readRepo('microcopy.yaml'));

const EN_FILE = 'packages/i18n/locales/en/close-of-cycle.json';
const HI_FILE = 'packages/i18n/locales/hi/close-of-cycle.json';

/** Resolve the real locale strings (values only) — the copy a consumer surface renders. */
function resolvedStrings(rel: string): string[] {
  return Object.values(JSON.parse(readRepo(rel)) as Record<string, string>);
}

// ─── (a) the strengthened pattern BITES each close-of-cycle Pool-Reality #2 variant ──────

describe('pool-reality-comparison — strengthened variants bite (AC2.6)', () => {
  // Each is a phrasing a well-meaning celebration author might reach for; each MUST fail.
  const planted: Array<[string, string]> = [
    ['original: fell short', 'We fell short of what was needed this cycle.'],
    ['shortfall (noun)', 'The pool closed with a shortfall this month.'],
    ['short of the target', 'The pool came up short of the target.'],
    ['short of goal', 'We were short of goal by a little.'],
    ['N% of the target', 'The family received 62% of the target.'],
    ['N% achieved', 'Only 62% achieved this cycle.'],
    ['goal not met', 'The goal not met this time.'],
    ['goal met (comparison)', 'The goal met at last.'],
    ["couldn't reach", "We couldn't reach the amount this cycle."],
    ['did not reach', 'The pool did not reach the amount.'],
    ['needed more contributions', 'The pool needed more contributions.'],
    ['Hindi: लक्ष्य से कम', 'इस बार पूल लक्ष्य से कम रहा।'],
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

// ─── (b) a planted violation in a close-of-cycle-shaped fixture fails; clean passes ──────

describe('planted-violation fixture fails, clean fixture passes (revert-sanity in-test)', () => {
  it('a fixture close-of-cycle body carrying a Pool-Reality #2 phrase → checkTone finds it', () => {
    const dirty = '{ "under_funded.body": "We fell short of the target; the family received less." }';
    expect(checkTone(EN_FILE, dirty, config).length).toBeGreaterThan(0);
  });

  it('the SAME fixture with the prohibited frame removed → no finding', () => {
    const clean = '{ "under_funded.body": "214 colleagues stood together; the family received support." }';
    expect(checkTone(EN_FILE, clean, config)).toEqual([]);
  });
});

// ─── (c) the load-bearing invariant — the REAL authored copy carries no prohibited frame ──

describe('AC10 — the real close-of-cycle templates carry no prohibited frame', () => {
  for (const [locale, file] of [
    ['en', EN_FILE],
    ['hi', HI_FILE],
  ] as const) {
    it(`checkTone over every ${locale} close-of-cycle string returns empty`, () => {
      for (const s of resolvedStrings(file)) {
        expect(checkTone(file, s, config), `prohibited frame in ${locale}: "${s}"`).toEqual([]);
      }
    });
  }

  it('the under_funded + partial families specifically read as celebration, not comparison', () => {
    const en = JSON.parse(readRepo(EN_FILE)) as Record<string, string>;
    for (const key of ['under_funded.body', 'partial.body']) {
      expect(checkTone(EN_FILE, en[key], config)).toEqual([]);
    }
  });
});
