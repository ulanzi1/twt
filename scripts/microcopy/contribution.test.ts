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

// ─── (b2) Story 8.8 — the teeth bite the NEW `notify.*` push/WA/SMS copy specifically ─────
//
// The `contribution` namespace was already in `microcopy.yaml` copy_globs (Story 8.2), so Story 8.8's
// notification copy inherits the scan for free — and inheriting a scan proves NOTHING on its own
// ([[feedback_gate_scope_semantic_coverage]]: a green scan over new keys is not coverage). No gate-scope
// extension was needed or wanted; what WAS needed is a planted violation on an actual `notify.*` key, so
// the scarcity / panic / numeral rules are demonstrated to bite THIS surface, not merely to have run
// over it. A notification is the highest-pressure surface in the product — it arrives uninvited — so the
// tone rules matter more here than on the card.

describe('Story 8.8 — the tone/numeral teeth bite the notify.* contribution-loop copy', () => {
  it('a scarcity frame planted on the day-14 reminder subject → checkTone finds it', () => {
    const dirty =
      '{ "notify.deadline.day_14.subject": "{pool} — only 1 day left to contribute!" }';
    const findings = checkTone(EN_FILE, dirty, config);
    expect(findings.length).toBeGreaterThan(0);
    expect(findings[0].kind).toBe('tone');
  });

  it('a panic frame planted on the cycle-open push title → checkTone finds it', () => {
    const dirty = '{ "notify.cycle_open.title": "URGENT: your pool is open" }';
    expect(checkTone(EN_FILE, dirty, config).length).toBeGreaterThan(0);
  });

  it('a pool-reality comparison planted on the day-13 reminder → checkTone finds it', () => {
    const dirty =
      '{ "notify.deadline.day_13.subject": "{pool} — the pool needed more contributions" }';
    expect(checkTone(EN_FILE, dirty, config).length).toBeGreaterThan(0);
  });

  it('the SAME reminder phrased without the prohibited frame → no finding', () => {
    const clean = '{ "notify.deadline.day_14.subject": "{pool} — today is the final day of this cycle" }';
    expect(checkTone(EN_FILE, clean, config)).toEqual([]);
  });

  it('a Devanagari operational digit planted in the Hindi reminder display → checkNumerals finds it (UX-DR73)', () => {
    const dirty = '{ "notify.deadline.day_13.display": "१२ दिन शेष" }';
    expect(checkNumerals(HI_FILE, dirty, config, { isCeremonial: false }).length).toBeGreaterThan(0);
  });

  it('a scarcity frame planted on the day-5 reminder subject → checkTone finds it', () => {
    const dirty = '{ "notify.deadline.day_5.subject": "{pool} — hurry, only 2 days left!" }';
    expect(checkTone(EN_FILE, dirty, config).length).toBeGreaterThan(0);
  });

  it('a panic frame planted on the day-10 reminder subject → checkTone finds it', () => {
    const dirty = '{ "notify.deadline.day_10.subject": "URGENT: {pool} contribution not recorded" }';
    expect(checkTone(EN_FILE, dirty, config).length).toBeGreaterThan(0);
  });

  it('a pool-reality comparison planted on the cycle-open push body → checkTone finds it', () => {
    const dirty =
      '{ "notify.cycle_open.body": "In support of {family}\'s family. The pool needed more contributions." }';
    expect(checkTone(EN_FILE, dirty, config).length).toBeGreaterThan(0);
  });

  it('a scarcity frame planted on the confirmed period label → checkTone finds it', () => {
    const dirty = '{ "notify.confirmed.period_label": "{cycleRef} cycle — only 1 day left to confirm" }';
    expect(checkTone(EN_FILE, dirty, config).length).toBeGreaterThan(0);
  });

  it('a pool-reality comparison planted on the Hindi day-13 reminder → checkTone finds it (the one Hindi-matching pattern)', () => {
    // The gate's tone patterns are almost entirely English-language regexes (scarcity/panic), so most
    // English-side planted violations above have no Hindi equivalent to test — EXCEPT
    // pool-reality-comparison, which carries one explicit Hindi phrase ("लक्ष्य से कम" = "less than
    // target", microcopy.yaml). This asserts that ONE Hindi-matching rule actually bites a `notify.*` key.
    const dirty = '{ "notify.deadline.day_13.subject": "{pool} — लक्ष्य से कम अंशदान" }';
    expect(checkTone(HI_FILE, dirty, config).length).toBeGreaterThan(0);
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

// ─── (b3) Story 8.9 — the teeth bite the NEW close-of-cycle holiday-aware copy ────────────
//
// Same reasoning as the 8.8 block above, one surface further along: the `contribution` namespace was
// already in `microcopy.yaml` copy_globs, so these keys inherit the scan — and inheriting a scan proves
// nothing ([[feedback_gate_scope_semantic_coverage]]). No gate-scope extension was needed or wanted;
// what was needed is a planted violation on an actual `close_of_cycle.*` key.
//
// This surface carries a SPECIFIC risk the earlier ones do not. It is the copy a member reads when
// their contribution has NOT yet been confirmed because a holiday delayed bank matching — precisely
// the moment a careless author reaches for "your contribution didn't reach the target" or "only 2 days
// left to confirm". UX-DR77 exists to make that moment read as the calendar being honored. So the
// pool-reality-comparison rule is asserted here alongside scarcity/panic, and the Hindi arm is checked
// for Devanagari operational digits: a holiday-delayed date is exactly where a Hindi author would
// naturally type "१८ नवंबर".

describe('Story 8.9 — the tone/numeral teeth bite the close-of-cycle holiday-aware copy', () => {
  it('a scarcity frame planted on the holiday-aware body → checkTone finds it', () => {
    const dirty =
      '{ "close_of_cycle.holiday_aware.body": "{holiday} is being observed — only 2 days left to confirm!" }';
    const findings = checkTone(EN_FILE, dirty, config);
    expect(findings.length).toBeGreaterThan(0);
    expect(findings[0].kind).toBe('tone');
  });

  it('a panic frame planted on the holiday-aware title → checkTone finds it', () => {
    const dirty = '{ "close_of_cycle.holiday_aware.title": "URGENT: matching is delayed" }';
    expect(checkTone(EN_FILE, dirty, config).length).toBeGreaterThan(0);
  });

  it('a pool-reality comparison planted on the settling body → checkTone finds it', () => {
    const dirty =
      '{ "close_of_cycle.settling.body": "This cycle closed. The pool fell short of the target." }';
    expect(checkTone(EN_FILE, dirty, config).length).toBeGreaterThan(0);
  });

  it('a shortfall frame planted on the holiday-aware a11y line → checkTone finds it', () => {
    const dirty =
      '{ "close_of_cycle.holiday_aware.body_a11y": "Matching continues; the shortfall will be confirmed later." }';
    expect(checkTone(EN_FILE, dirty, config).length).toBeGreaterThan(0);
  });

  it('the SAME holiday-aware body phrased with dignity → no finding (revert-sanity in-test)', () => {
    const clean =
      '{ "close_of_cycle.holiday_aware.body": "{holiday} is being observed, so matching is taking a few more days. Nothing is pending from you." }';
    expect(checkTone(EN_FILE, clean, config)).toEqual([]);
  });

  it('a Devanagari operational digit planted in the Hindi holiday-aware body → checkNumerals finds it (UX-DR73)', () => {
    const dirty = '{ "close_of_cycle.holiday_aware.body": "१८ नवंबर तक पुष्टि हो जाएगी।" }';
    expect(checkNumerals(HI_FILE, dirty, config, { isCeremonial: false }).length).toBeGreaterThan(0);
  });

  it('a pool-reality comparison planted on the Hindi settling body → checkTone finds it', () => {
    const dirty = '{ "close_of_cycle.settling.body": "इस चक्र में लक्ष्य से कम योगदान मिला।" }';
    expect(checkTone(HI_FILE, dirty, config).length).toBeGreaterThan(0);
  });
});
