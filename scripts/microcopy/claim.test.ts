// scripts/microcopy/claim.test.ts
//
// Story 6.18 — TEETH over the CLAIM surface's member copy, proven against the REAL config.
//
// ⚠⛔⛔ **THIS FILE AND ITS FOUR SCOPE ENTRIES WERE ADDED BY THE 2026-09-22 VALIDATE PASS, ⛔ NOT BY
// THE STORY.** The story minted member-facing keys in the `claim` i18n namespace and wrote copy into
// two member mobile screens, and ⛔ none of the four files was in the gate's scan scope:
// `grep -c claim.json microcopy.yaml` returned **0**, and `code_globs` covered `apps/admin/src/**`
// but ⛔ nothing under `apps/mobile`. ⇒ **UNSCANNED COPY WEARING A GREEN CHECK** — the defect class
// `microcopy.yaml`'s own header names in those words.
//
// ⭐ THE DELIVERABLE IS ⛔ NOT A GREEN SCAN. Adding four globs and watching the gate stay green
// proves ⛔ nothing ([[feedback_gate_scope_semantic_coverage]]). What this file proves is that the
// rules BITE this surface when a violation is planted, in BOTH locales and on the CODE files too,
// and that the REAL authored copy is clean.
//
// ⚠⚠ AND IT PROVES ONE THING NO SIBLING HAS TO: **that the allow-list pair this story added did ⛔
// NOT over-suppress.** Those two entries suppress the FM-14 colour finding on exactly three hex
// literals (see their reason in `microcopy.yaml` — the remedy the gate prescribes does not exist in
// `apps/mobile`, which has ⛔ no `@twt/tokens` dependency and ⛔ no semantic colour role). An entry
// written one character wider — `#` alone, or ⛔ no `pattern` at all — would silence every colour
// literal on those files forever, and ⛔ nothing else in the repo would notice. §(e) pins that.
//
// ⚠ WHAT BITES WHERE, and the asymmetry is deliberate (`check.ts` lines 126-140):
//   · COPY files get `includeMemberOnly: true` ⇒ the full vocabulary, tone and numeral families.
//   · CODE files get `includeMemberOnly: false` ⇒ ⛔ NOT `donor` / `customer` / `user` /
//     `Late Teacher`, which are the MEMBER register and would false-fire on identifiers. The
//     always-on terms (`passbook` / `receipt` / `invoice` / `report`), tone and numerals DO bite.
//     ⭐ A fixture planting `donor` in a .tsx would therefore assert the OPPOSITE of the truth.
//
// SELF-GREEN: this file lives under `scripts/microcopy/**`, which is excluded from the gate's own
// scan scope — the planted prohibited phrases and hexes below are FIXTURES, ⛔ never member copy.

import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import {
  type MicrocopyConfig,
  checkMagicNumberColors,
  checkNumerals,
  checkTone,
  checkVocabulary,
  parseMicrocopyConfig,
} from './lib.js';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const readRepo = (rel: string): string => readFileSync(path.join(repoRoot, rel), 'utf8');

/** The REAL, committed gate config — the patterns under test. */
const config: MicrocopyConfig = parseMicrocopyConfig(readRepo('microcopy.yaml'));

const EN_FILE = 'packages/i18n/locales/en/claim.json';
const HI_FILE = 'packages/i18n/locales/hi/claim.json';
const REVIEW_TSX = 'apps/mobile/app/(claim)/nominee-review.tsx';
const FORM_TSX = 'apps/mobile/components/life-events/NomineeForm.tsx';

/** The real locale strings the surface renders — VALUES only, ⛔ excluding `$comment*` keys. */
function resolvedStrings(rel: string): string[] {
  const flat: string[] = [];
  const walk = (o: Record<string, unknown>): void => {
    for (const [k, v] of Object.entries(o)) {
      if (k.startsWith('$comment')) continue;
      if (typeof v === 'string') flat.push(v);
      else if (v !== null && typeof v === 'object') walk(v as Record<string, unknown>);
    }
  };
  walk(JSON.parse(readRepo(rel)) as Record<string, unknown>);
  return flat;
}

// ─── (0) the SCOPE claim itself, asserted rather than assumed ───────────────────────────

describe('the surface is actually IN SCOPE — ⛔ the premise of every test below', () => {
  it('both locale files are listed in scope.copy_globs', () => {
    // ⛔ Without this, every "the real copy is clean" assertion below would be vacuously true of a
    // file the gate never opens — ⭐ the exact state this surface shipped in until 2026-09-22.
    expect(config.scope.copyGlobs).toContain(EN_FILE);
    expect(config.scope.copyGlobs).toContain(HI_FILE);
  });

  it("both member mobile screens are listed in scope.code_globs", () => {
    expect(config.scope.codeGlobs).toContain(REVIEW_TSX);
    expect(config.scope.codeGlobs).toContain(FORM_TSX);
  });
});

// ─── (a) VOCABULARY bites the copy files ────────────────────────────────────────────────

describe('vocabulary bites the claim copy (member register, includeMemberOnly)', () => {
  const planted: Array<[string, string]> = [
    ['donor', '{ "nominee.bank.title": "Where the donor money will be sent" }'],
    ['customer', '{ "entry.question": "Are you a customer of this Pariwar?" }'],
    ['user', '{ "shell.saved": "The user may return anytime." }'],
    ['receipt', '{ "nominee.bank.saved": "Download your receipt." }'],
    ['passbook', '{ "shell.banner": "See the family passbook." }'],
  ];
  for (const [label, line] of planted) {
    it(`flags "${label}"`, () => {
      const findings = checkVocabulary(EN_FILE, line, config, { includeMemberOnly: true });
      expect(findings.length).toBeGreaterThan(0);
      expect(findings[0].kind).toBe('vocabulary');
    });
  }
});

// ─── (b) VOCABULARY bites the CODE files — and the member-only terms deliberately do NOT ──

describe('vocabulary bites the mobile screens (code register, includeMemberOnly FALSE)', () => {
  for (const [label, line] of [
    ['receipt', '<Text>{t("nominee.bank.saved")} — download your receipt</Text>'],
    ['passbook', '<Text>Open the passbook</Text>'],
  ] as Array<[string, string]>) {
    it(`flags "${label}" on ${REVIEW_TSX}`, () => {
      const findings = checkVocabulary(REVIEW_TSX, line, config, { includeMemberOnly: false });
      expect(findings.length).toBeGreaterThan(0);
      expect(findings[0].kind).toBe('vocabulary');
    });
  }

  it('⭐ does ⛔ NOT flag `donor` on a code file — member_only is copy-register only', () => {
    // ⚠ This is an ASSERTION ABOUT THE GATE'S DESIGN, ⛔ not a gap. `check.ts` passes
    // `includeMemberOnly: false` for code globs so that identifiers and props do not false-fire.
    // Pinning it here means a future widening of that flag cannot happen silently.
    //
    // ⚠ `donorRow` is an IDENTIFIER — `checkVocabulary` matches `\bdonor\b`, and `\b` already fails
    // between "donor" and "Row" (both word characters), so this half was passing regardless of
    // `includeMemberOnly` and proved nothing about the flag specifically.
    expect(checkVocabulary(REVIEW_TSX, 'const donorRow = rows[0]', config, { includeMemberOnly: false })).toEqual(
      [],
    );
    // ⚠ 2026-09-22 (code review): a second assertion below used to call these "the very same
    // string" as the identifier case above — they were NOT (`donorRow` vs. the standalone token
    // `"donor"`), so the pair could pass for a reason unrelated to the `includeMemberOnly` property
    // it claimed to isolate. ⭐ Isolate it properly: the IDENTICAL bare word `donor`, standalone (a
    // real word boundary on both sides) — the ONLY difference between the two calls below is
    // `includeMemberOnly`.
    // ⚠ 2026-09-23 (code review): the previous "isolating" pair still varied the FILE and the TEXT as
    // well as the flag (`REVIEW_TSX` + `const donor …` vs `EN_FILE` + `{ "x": "donor" }`) — the very
    // confound it said it removed. Now the file and the line are IDENTICAL; only the flag moves.
    const LINE = 'const donor = rows[0]';
    expect(checkVocabulary(REVIEW_TSX, LINE, config, { includeMemberOnly: false })).toEqual([]);
    expect(checkVocabulary(REVIEW_TSX, LINE, config, { includeMemberOnly: true }).length).toBeGreaterThan(0);
  });
});

// ─── (c) TONE bites — including the rule this story had to re-anchor ────────────────────

describe('tone bites the claim surface', () => {
  const planted: Array<[string, string]> = [
    ['only N days left', '{ "nominee.bank.help": "Only 3 days left to add the account!" }'],
    ['URGENT', '{ "nominee.bank.correction_needed": "URGENT: fix this now." }'],
    ['last chance', '{ "shell.save_resume": "Last chance to finish." }'],
  ];
  for (const [label, line] of planted) {
    it(`flags "${label}"`, () => {
      const findings = checkTone(EN_FILE, line, config);
      expect(findings.length).toBeGreaterThan(0);
      expect(findings[0].kind).toBe('tone');
    });
  }

  // ⚠⚠ THE REGRESSION PAIR FOR THE `pool-reality-comparison` RE-ANCHORING (2026-09-22).
  // Bringing `claim.json` into scope made that rule fire on *"We couldn't reach a nominee's
  // phone"* — the TELEPHONY sense of `reach`, in dignified helpline copy. The two `reach`
  // alternatives were UNANCHORED while every other clause in the pattern anchored on
  // target/goal/%/contributions. ⭐ The RULE was fixed, ⛔ ⛔ NOT the copy and ⛔ NOT an
  // allow-list entry (which would have silenced the rule for the whole file). These two tests
  // are what stops the anchor from being widened back or narrowed away.
  it('⭐⭐ still flags the POOL-REALITY sense of "reach" — the teeth survived the re-anchor', () => {
    for (const line of [
      '{ "x": "We couldn\'t reach the amount this cycle." }',
      '{ "x": "The pool did not reach the target." }',
      '{ "x": "The drive doesn\'t reach the total." }',
    ]) {
      const findings = checkTone(EN_FILE, line, config);
      expect(findings.length, line).toBeGreaterThan(0);
      expect(findings[0].kind).toBe('tone');
    }
  });

  it('⭐⭐ does ⛔ NOT flag the TELEPHONY sense — the real committed helpline string', () => {
    // ⭐ Named by KEY and read from the REAL catalog, ⛔ not an invented fixture: if this copy is
    // ever reworded the test reads the new words, and if the key is removed the test says so.
    const en = JSON.parse(readRepo(EN_FILE)) as Record<string, string>;
    const target = en['otp.no_nominee'];
    expect(target, '`otp.no_nominee` missing from the real en catalog').toBeTruthy();
    expect(target).toMatch(/reach/i);
    expect(checkTone(EN_FILE, target, config), target).toEqual([]);
  });
});

// ─── (d) UX-DR73 NUMERAL discipline bites BOTH locales ──────────────────────────────────

describe('UX-DR73 numeral discipline bites the claim copy', () => {
  it('flags a Devanagari operational digit under `hi`', () => {
    const findings = checkNumerals(HI_FILE, '{ "x": "आपके २ खातों की जाँच हो गई।" }', config, {
      isCeremonial: false,
    });
    expect(findings.length).toBeGreaterThan(0);
    expect(findings[0].kind).toBe('numeral');
  });

  it('flags a Devanagari digit under `en` too — ⛔ the rule is not locale-scoped', () => {
    expect(
      checkNumerals(EN_FILE, '{ "x": "५ accounts checked" }', config, { isCeremonial: false }).length,
    ).toBeGreaterThan(0);
  });

  it('⭐⭐ the checker bites a REAL committed string, ⛔ not only an invented fixture', () => {
    // ⚠⛔ WHY THIS EXISTS (carried from the sibling surfaces' own reviews): the authored values on
    // this surface are prose and templates with ⛔ no literal Devanagari digit, so §(f)'s "the real
    // copy is clean" block passes VACUOUSLY for the numeral family. This proves the checker would
    // catch a TRANSLATOR adding one to real copy.
    const hi = JSON.parse(readRepo(HI_FILE)) as Record<string, string>;
    const target = hi['member_fallback'];
    expect(target, '`member_fallback` missing from the real hi catalog').toBeTruthy();
    const findings = checkNumerals(HI_FILE, `${target}२`, config, { isCeremonial: false });
    expect(findings.length).toBeGreaterThan(0);
    expect(findings[0].kind).toBe('numeral');
  });
});

// ─── (e) THE ALLOW-LIST PAIR DID ⛔ NOT OVER-SUPPRESS ────────────────────────────────────

describe('⭐⭐ the FM-14 colour allow-list is scoped to three literals and ⛔ nothing more', () => {
  // ⚠ The three suppressed literals — the app-wide `apps/mobile` error/success convention. The
  // entries exist because the prescribed remedy (`@twt/tokens`) is ⛔ not a dependency of
  // `apps/mobile` and the nearest tokens are DIFFERENT colours on a bereaved family's screen.
  it('suppresses exactly the three named hexes on the two named files', () => {
    expect(checkMagicNumberColors(REVIEW_TSX, '<Text color="#B00020">x</Text>', config)).toEqual([]);
    expect(checkMagicNumberColors(REVIEW_TSX, '<Text color="#1E8E3E">x</Text>', config)).toEqual([]);
    expect(checkMagicNumberColors(FORM_TSX, '<Text color="#C0392B">x</Text>', config)).toEqual([]);
  });

  it('⭐ still flags ANY OTHER hex on those same files — the entries are ⛔ not a blanket', () => {
    for (const [file, line] of [
      [REVIEW_TSX, '<Text color="#DEADBE">x</Text>'],
      [REVIEW_TSX, '<View backgroundColor="#123456" />'],
      [FORM_TSX, '<Text color="#B00020">x</Text>'], // ⚠ suppressed on the OTHER file, ⛔ not here.
    ] as Array<[string, string]>) {
      const findings = checkMagicNumberColors(file, line, config);
      expect(findings.length, `${file} :: ${line}`).toBeGreaterThan(0);
      expect(findings[0].kind).toBe('magic-number');
    }
  });

  it('⭐ still flags the three hexes on ANY OTHER file — the entries are file-scoped', () => {
    const findings = checkMagicNumberColors('apps/admin/src/x.tsx', 'color: "#C0392B"', config);
    expect(findings.length).toBeGreaterThan(0);
  });

  it('⛔ does not suppress the OTHER families on those files — the hole this scope change closed', () => {
    // ⭐ THE WHOLE POINT. The colour finding is suppressed; the copy teeth are ⛔ NOT. If a future
    // edit widened the entries' `pattern`, this is the test that fails.
    expect(
      checkVocabulary(REVIEW_TSX, '<Text color="#B00020">Download your receipt</Text>', config, {
        includeMemberOnly: false,
      }).length,
      'a prohibited noun on the SAME LINE as a suppressed hex must still fire',
    ).toBeGreaterThan(0);
    expect(
      checkTone(REVIEW_TSX, '<Text color="#B00020">URGENT: only 2 days left!</Text>', config).length,
    ).toBeGreaterThan(0);
  });

  it('⚠ PINS A KNOWN GAP — a truly unrelated hex sharing the line with a suppressed one is ALSO suppressed today', () => {
    // ⚠⚠ 2026-09-22 (code review). `checkMagicNumberColors` calls `isAllowed(file, line, config)`
    // with NO match-position argument, so it falls back to a whole-LINE `re.test(lineText)` — unlike
    // `checkVocabulary`, which passes `matchRange` and is genuinely position-aware. A first attempt
    // at fixing this made `checkMagicNumberColors` position-aware too, and it broke a DIFFERENT,
    // pre-existing, INTENTIONALLY line-level allow-list entry (`primary_color|secondary_color|
    // accent_color` on `AddPariwarForm.tsx`, `microcopy.yaml`) — that entry's `pattern` deliberately
    // matches a NEARBY field name, not the hex literal itself, so it has NO position overlap with
    // the hex it means to allow and a position-aware `isAllowed` refuses it outright.
    // ⇒ REVERTED, ⛔ not carried: making `checkMagicNumberColors` position-aware needs either a
    // per-entry opt-in (`scope: 'line' | 'position'`) or rewriting the older entry's pattern to
    // match the hex itself — both are gate-DESIGN calls with blast radius beyond this story, not a
    // mechanical fix. This test instead PINS today's real, line-level behaviour honestly (recorded
    // as owed in `deferred-work.md`), so it cannot regress further while the design question is
    // open, and so nobody mistakes silence here for the gap being closed.
    const findings = checkMagicNumberColors(REVIEW_TSX, '<Text color="#B00020" backgroundColor="#DEADBE">x</Text>', config);
    expect(
      findings,
      'if this now finds #DEADBE, checkMagicNumberColors became position-aware — update this pin and the deferred-work.md entry',
    ).toEqual([]);
  });
});

// ─── (f) the REAL authored copy is CLEAN under every family ─────────────────────────────

describe('the REAL committed claim copy passes every family', () => {
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
    expect(
      checkVocabulary(EN_FILE, '{ "x": "No donor has given yet." }', config, { includeMemberOnly: true })
        .length,
    ).toBeGreaterThan(0);
    expect(checkTone(EN_FILE, '{ "x": "Hurry, only 2 days left!" }', config).length).toBeGreaterThan(0);
    expect(
      checkNumerals(HI_FILE, '{ "x": "५ खाते" }', config, { isCeremonial: false }).length,
    ).toBeGreaterThan(0);
    expect(
      checkMagicNumberColors('apps/admin/src/x.tsx', 'color: "#FF0000"', config).length,
    ).toBeGreaterThan(0);
  });
});
