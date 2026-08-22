// scripts/microcopy/noticeboard.test.ts
//
// Story 11a.6 — TEETH for the `noticeboard` namespace's newly-scanned member copy, proven against the
// REAL config. Ruled at Decision 2026-08-22-153, D9(a).
//
// ⭐ THIS ENTRY IS NAMED BY NO EPIC AC. Story 11a.5 minted the `noticeboard` namespace and rendered it on
// a LIVE member tab (the Panchayat Noticeboard) without adding it to `microcopy.yaml`'s
// `scope.copy_globs` — so the member vocabulary register, the blame/scarcity/`fursat` tone rules and the
// UX-DR73 numeral discipline did not bite it, while `pnpm microcopy:check` reported green.
// ⚠ Story 11a.2 — three stories earlier in the SAME epic — wrote the rule against exactly this
// (`microcopy.yaml`): *"the register grows surface-by-surface BY BEING ADDED TO — a new namespace that is
// not globbed is UNSCANNED COPY wearing a green check, which is the same defect class as a vacuous gate
// leg"*. Story 11a.6 adds MORE member copy to that namespace, so it is the story that makes the gap
// bigger and the cheapest one to close it in.
//
// Like out-of-band.test.ts / close-of-cycle.test.ts / common.test.ts / fursat.test.ts (and unlike
// lib.test.ts, which unit-tests the pure engine against an INLINE SAMPLE_YAML), this file loads the
// ACTUAL microcopy.yaml + the ACTUAL locale files off disk and runs the real checks over them. Per
// [[feedback_gate_scope_semantic_coverage]], a green scan over files the gate never read before proves
// NOTHING — the teeth are sections (c) and (d) below.
//
// ⚠ ⭐ THE NUMERAL DISCIPLINE IS THE SEMANTICALLY LOAD-BEARING RULE ON THIS SURFACE. UX `:1161` (v4) rules
// the noticeboard's standalone counts and dates LATIN — operational AND celebration framing alike —
// and names Devanagari numerals as reserved EXCLUSIVELY for memorial Devanagari prose on the Shradhanjali
// surface. So a Devanagari operational digit in noticeboard copy must fail at PR time, and section (d)
// is what makes that true rather than merely intended.
//
// ⛔ NOTICE CONTENT IS OUT OF SCOPE BY CONSTRUCTION and always will be: an operator's title and body
// arrive as DATA on the row descriptor and are rendered as-is. Only CHROME is catalog copy.
//
// SELF-GREEN: this file lives under scripts/microcopy/**, which is excluded from the gate's own scan
// scope — the prohibited phrases below are fixtures, never member copy.

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

/** The REAL, committed gate config — the rules under test. */
const config: MicrocopyConfig = parseMicrocopyConfig(readRepo('microcopy.yaml'));

const EN_BOARD = 'packages/i18n/locales/en/noticeboard.json';
const HI_BOARD = 'packages/i18n/locales/hi/noticeboard.json';

function catalog(rel: string): Record<string, string> {
  return JSON.parse(readRepo(rel)) as Record<string, string>;
}

/** Resolve the real locale strings (values only) — the copy a member actually reads. */
function resolvedStrings(rel: string): string[] {
  return Object.values(catalog(rel));
}

/** Every check the gate applies to a COPY file, in one place (copy scope ⇒ `member_only` terms ON). */
function allFindings(file: string, text: string): ReturnType<typeof checkTone> {
  return [
    ...checkVocabulary(file, text, config, { includeMemberOnly: true }),
    ...checkTone(file, text, config),
    ...checkNumerals(file, text, config, { isCeremonial: false }),
  ];
}

// ─── (a) the noticeboard catalogs ARE in copy_globs (the scope actually grew) ─────────────────────

describe('the `noticeboard` catalogs are a scanned copy surface (Story 11a.6 added them)', () => {
  it('BOTH locale files appear in scope.copy_globs — ⛔ never one without the other', () => {
    expect(config.scope.copyGlobs, 'en/noticeboard.json must be scanned').toContain(EN_BOARD);
    expect(config.scope.copyGlobs, 'hi/noticeboard.json must be scanned').toContain(HI_BOARD);
  });

  it('⛔ no `allow:` entry was added to make the scan pass', () => {
    // A real finding is FIXED IN THE COPY (the 8.10 `out-of-band` precedent); only a genuine
    // non-applicable earns an allow-list row, with a stated reason. This surface earned none.
    for (const entry of config.allow) {
      expect(entry.file ?? '', `an allow entry targets the noticeboard: ${entry.pattern}`).not.toMatch(
        /noticeboard\.json$/,
      );
    }
  });
});

// ─── (b) the real committed copy is CLEAN in both locales (the load-bearing invariant) ────────────

describe('the real noticeboard surface carries no prohibited frame', () => {
  for (const [label, file] of [
    ['en noticeboard', EN_BOARD],
    ['hi noticeboard', HI_BOARD],
  ] as const) {
    it(`every ${label} string passes vocabulary + tone + numerals`, () => {
      for (const s of resolvedStrings(file)) {
        expect(allFindings(file, s), `finding in ${label}: "${s}"`).toEqual([]);
      }
    });
  }

  it('the catalogs are actually populated (an empty one would make the above vacuously green)', () => {
    expect(resolvedStrings(EN_BOARD).length).toBeGreaterThanOrEqual(12);
    expect(resolvedStrings(HI_BOARD).length).toBeGreaterThanOrEqual(12);
  });

  it("Story 11a.6's OWN new keys exist and read clean in both locales (non-vacuous)", () => {
    // ⚠ Without this, a future rename could quietly remove the very copy this entry was added for and
    // section (b) would stay green over whatever remained.
    const NEW = [
      'category_terracotta',
      'category_green',
      'category_black',
      'category_ink',
      'dismiss_a11y',
      'dismissed_a11y',
    ];
    for (const [file, c] of [
      [EN_BOARD, catalog(EN_BOARD)],
      [HI_BOARD, catalog(HI_BOARD)],
    ] as const) {
      for (const key of NEW) {
        expect(c[key], `${file}:${key}`).toBeTypeOf('string');
        expect(allFindings(file, c[key]), `${file}:${key}`).toEqual([]);
      }
    }
  });

  it('⛔ the RETIRED `open_detail_*` keys are gone — the D6(a) removal is real', () => {
    for (const file of [EN_BOARD, HI_BOARD]) {
      expect(Object.keys(catalog(file)).filter((k) => k.startsWith('open_detail'))).toEqual([]);
    }
  });
});

// ─── (c) planted tone / vocabulary violations BITE — the gate is LIVE over these files ────────────
//
// These are what a naïve author might write for a noticeboard under pressure to drive action. Each trips
// a real rule; the assertions confirm the gate fires on them THROUGH the noticeboard files' scope. If a
// future edit silently dropped these globs from copy_globs, section (b)'s scan would still pass while the
// surface's register went ungoverned — so these plants and section (a) together keep the coverage honest.

describe('planted violations on noticeboard copy bite (the scope has teeth)', () => {
  const planted: Array<[string, string, string]> = [
    // scarcity / panic — the pressure frames a notice board is most likely to drift into.
    ['scarcity — only N days left', EN_BOARD, 'Only 3 days left to read this notice.'],
    ['panic — URGENT', EN_BOARD, 'URGENT: read the notice board now.'],
    // fursat-pressure — the noticeboard is the quietest surface in the app; "act now" has no place on it.
    ['fursat — act now', EN_BOARD, 'Act now — the Pariwar is waiting on you.'],
    ['fursat hi — जल्दी कीजिए', HI_BOARD, 'कृपया जल्दी कीजिए, सूचना पढ़ लें।'],
    ['fursat hi — आप पीछे हैं', HI_BOARD, 'आप पीछे हैं — बाकी सदस्य आगे निकल गए।'],
    // pool-reality comparison — the close-of-cycle CELEBRATION category could carry a shortfall frame.
    ['pool-reality — fell short', EN_BOARD, 'The pool fell short of the target this cycle.'],
    ['pool-reality hi — लक्ष्य से कम', HI_BOARD, 'इस चक्र में लक्ष्य से कम राशि जुटी।'],
    // out-of-band-blame — a notice is a plausible place to scold a member about a side-channel payment.
    ['out-of-band-blame — outside the app', EN_BOARD, 'If you paid outside the app, it will not count.'],
    ['out-of-band-blame hi — सिस्टम के बाहर', HI_BOARD, 'सिस्टम के बाहर भुगतान न करें।'],
    // member register (UX-DR71) — `user` / `donor` are `member_only` terms and copy scope turns them ON.
    ['vocabulary — "user"', EN_BOARD, 'This notice is for every user of the app.'],
    ['vocabulary — "donor"', EN_BOARD, 'A message for every donor in the Pariwar.'],
  ];

  for (const [label, file, line] of planted) {
    it(`flags "${label}"`, () => {
      const findings = allFindings(file, line);
      expect(findings.length, `expected a finding on: ${line}`).toBeGreaterThan(0);
    });
  }
});

// ─── (d) ⭐ the NUMERAL discipline — the semantically load-bearing rule on this surface ────────────

describe('⭐ UX-DR73 / UX `:1161` — a Devanagari operational digit in noticeboard copy FIRES', () => {
  const planted: Array<[string, string, string]> = [
    ['hi — a Devanagari count in the empty copy', HI_BOARD, 'अभी ३ सूचनाएँ पट्ट पर हैं।'],
    ['hi — a Devanagari date in a meeting label', HI_BOARD, 'अगली मासिक बैठक १५ तारीख को है।'],
    // ⚠ The rule is not locale-gated — it is about the DIGITS, so it must fire in the en catalog too.
    ['en — a Devanagari digit in English copy', EN_BOARD, 'Next monthly meeting on the १५th.'],
  ];

  for (const [label, file, line] of planted) {
    it(`flags "${label}"`, () => {
      const findings = checkNumerals(file, line, config, { isCeremonial: false });
      expect(findings.length, `expected a numeral finding on: ${line}`).toBeGreaterThan(0);
      expect(findings[0].kind).toBe('numeral');
    });
  }

  it('⛔ this surface is NOT ceremonial — Devanagari digits are reserved for Shradhanjali prose', () => {
    // `numerals.ceremonial_globs` is empty at v1, so nothing exempts the noticeboard. Asserted so a
    // future ceremonial exemption cannot quietly swallow this surface with it.
    for (const glob of config.numerals.ceremonialGlobs) {
      expect(glob, 'the noticeboard must not become a ceremonial-digit surface').not.toMatch(
        /noticeboard/,
      );
    }
    expect(config.numerals.flagDevanagariDigits).toBe(true);
  });

  it('the LATIN equivalents of those same lines stay clean (the rule targets digits, not counting)', () => {
    // Revert-sanity: the plants above fail for their DIGITS, not for mentioning a number at all —
    // otherwise the producer story could not write a stat line in this namespace at all.
    expect(checkNumerals(HI_BOARD, 'अभी 3 सूचनाएँ पट्ट पर हैं।', config, { isCeremonial: false })).toEqual(
      [],
    );
    expect(
      checkNumerals(EN_BOARD, 'Next monthly meeting on the 15th.', config, { isCeremonial: false }),
    ).toEqual([]);
  });
});

// ─── (e) revert-sanity — the shipped copy is clean on its MERITS, not by under-reach ──────────────

describe('the rules do not over-reach onto the copy this surface legitimately ships', () => {
  const permitted: Array<[string, string, string]> = [
    ['en: the ratified empty copy', EN_BOARD, 'No pinned notices'],
    ['hi: the ratified empty copy', HI_BOARD, 'अभी कोई सूचना पट्ट पर नहीं है।'],
    ['en: the dismiss a11y label', EN_BOARD, 'Dismiss this message'],
    ['hi: the dismiss a11y label', HI_BOARD, 'यह संदेश हटाएँ'],
    ['en: the close-of-cycle CATEGORY label', EN_BOARD, 'Close-of-cycle notice'],
    ['hi: the masthead', HI_BOARD, 'परिवार की नब्ज़'],
  ];

  for (const [label, file, line] of permitted) {
    it(`does NOT flag "${label}"`, () => {
      expect(allFindings(file, line), `unexpected finding on: ${line}`).toEqual([]);
    });
  }
});
