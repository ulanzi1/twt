// scripts/microcopy/out-of-band.test.ts
//
// Story 8.10 — TEETH for the `out-of-band-blame` tone rule, proven against the REAL config.
//
// Like close-of-cycle.test.ts (and unlike lib.test.ts, which unit-tests the pure engine against an
// INLINE SAMPLE_YAML), this file loads the ACTUAL microcopy.yaml + the ACTUAL locale files off disk
// and runs the real `checkTone` over them.
//
// What makes this rule's teeth UNUSUALLY well-proven: it was authored BEFORE the copy it governs was
// fixed, and it FAILED the real gate on the real committed strings. Story 7.10 shipped Screen 3 as
// "If you accidentally pay outside the system" / "अगर आप गलती से सिस्टम के बाहर भुगतान कर दें" — which
// names an honourable direct-to-family gift a mistake and defines it by its relation to the app,
// exactly the framing epics.md:3038 forbids. Adding the rule + the copy_globs entry turned the gate
// red with 8 findings across both locales; the AC2 rewrite turned it green. Section (a) below pins
// those pre-8.10 strings as fixtures so the proof survives the rewrite that removed them
// ([[feedback_gate_scope_semantic_coverage]] — a green scan over newly-scanned files proves nothing).
//
// SELF-GREEN: this file lives under scripts/microcopy/**, which is excluded from the gate's own scan
// scope — the prohibited phrases below are fixtures, never member copy.

import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { type MicrocopyConfig, checkTone, parseMicrocopyConfig } from './lib.js';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const readRepo = (rel: string): string => readFileSync(path.join(repoRoot, rel), 'utf8');

/** The REAL, committed gate config — the rule under test. */
const config: MicrocopyConfig = parseMicrocopyConfig(readRepo('microcopy.yaml'));

const EN_TUTORIAL = 'packages/i18n/locales/en/pool-onboarding.json';
const HI_TUTORIAL = 'packages/i18n/locales/hi/pool-onboarding.json';
const EN_CONTRIBUTION = 'packages/i18n/locales/en/contribution.json';
const HI_CONTRIBUTION = 'packages/i18n/locales/hi/contribution.json';

/** Resolve the real locale strings (values only) — the copy a consumer surface renders. */
function resolvedStrings(rel: string): string[] {
  return Object.values(JSON.parse(readRepo(rel)) as Record<string, string>);
}

/** The findings this rule (and only this rule) produced. */
function blameFindings(file: string, text: string): ReturnType<typeof checkTone> {
  return checkTone(file, text, config).filter((f) => f.replacement.includes('out-of-band-blame'));
}

// ─── (a) the rule FIRES on the pre-8.10 committed Screen-3 strings (the load-bearing proof) ──────

describe('out-of-band-blame — the pre-8.10 committed Screen-3 copy is flagged (AC4.i)', () => {
  // VERBATIM as Story 7.10 committed them. These are the strings the gate went red on; keeping them
  // here is what stops a future author from re-introducing the frame the rewrite removed.
  const preStory810: Array<[string, string, string]> = [
    ['en screen3.title', EN_TUTORIAL, 'If you accidentally pay outside the system'],
    ['en screen3.progress_a11y', EN_TUTORIAL, 'Screen three: if you accidentally pay outside the system'],
    ['hi screen3.title', HI_TUTORIAL, 'अगर आप गलती से सिस्टम के बाहर भुगतान कर दें'],
    ['hi screen3.progress_a11y', HI_TUTORIAL, 'तीसरी स्क्रीन: अगर आप गलती से सिस्टम के बाहर भुगतान कर दें'],
  ];

  for (const [label, file, line] of preStory810) {
    it(`flags the shipped-then-removed "${label}"`, () => {
      const findings = blameFindings(file, line);
      expect(findings.length).toBeGreaterThan(0);
      expect(findings[0].kind).toBe('tone');
    });
  }

  it('each pre-8.10 title trips BOTH arms — the mistake frame AND the defined-by-the-app frame', () => {
    expect(blameFindings(EN_TUTORIAL, 'If you accidentally pay outside the system').map((f) => f.match)).toEqual([
      'accidentally pay',
      'outside the system',
    ]);
    expect(blameFindings(HI_TUTORIAL, 'अगर आप गलती से सिस्टम के बाहर भुगतान कर दें').map((f) => f.match)).toEqual([
      'गलती से',
      'सिस्टम के बाहर',
    ]);
  });
});

// ─── (b) planted violations in BOTH locales are flagged (AC4.ii) ─────────────────────────────────

describe('out-of-band-blame — planted violations bite in both locales (AC4.ii)', () => {
  const planted: Array<[string, string, string]> = [
    // (1) retrospective correction — the epics.md:3038 headline frame
    ['en: should have gone through the app', EN_TUTORIAL, 'You should have gone through the app for this.'],
    ['en: should have paid', EN_TUTORIAL, 'You should have paid through your assigned pool.'],
    ["en: should've sent", EN_TUTORIAL, "You should've sent it through the app instead."],
    ['hi: करना चाहिए था', HI_TUTORIAL, 'आपको यह भुगतान ऐप से करना चाहिए था।'],
    // (2) mistake framing applied to an intentional gift
    ['en: accidentally gave', EN_TUTORIAL, 'If you accidentally gave money to the family directly…'],
    ['en: accidental payment', EN_TUTORIAL, 'We noticed an accidental payment to the family.'],
    ['en: by mistake', EN_TUTORIAL, 'If you sent it to the family by mistake, tell us.'],
    ['en: mistakenly', EN_TUTORIAL, 'You mistakenly supported the family on your own.'],
    ['hi: गलती से', HI_TUTORIAL, 'अगर आपने गलती से परिवार को सीधे पैसे भेज दिए…'],
    // (3) the act defined by its relation to the software
    ['en: outside the system', EN_TUTORIAL, 'This payment was made outside the system.'],
    ['en: outside our app', EN_TUTORIAL, 'Support given outside our app cannot be handled.'],
    ['hi: सिस्टम के बाहर', HI_TUTORIAL, 'सिस्टम के बाहर किया गया भुगतान मान्य नहीं है।'],
    ['hi: ऐप के बाहर', HI_TUTORIAL, 'ऐप के बाहर भेजी गई राशि दर्ज नहीं होती।'],
    // (4) doesn't-count / irregular / incomplete (epics.md:3039(c))
    ["en: doesn't count", EN_TUTORIAL, "Money sent directly doesn't count for this cycle."],
    ['en: does not count', EN_TUTORIAL, 'A direct transfer does not count toward your record.'],
    ['en: will not count', EN_TUTORIAL, 'It will not count as your contribution.'],
    ['en: not counted', EN_TUTORIAL, 'Direct gifts are not counted anywhere.'],
    ['en: irregular contribution', EN_TUTORIAL, 'This is an irregular contribution.'],
    ['en: gift is incomplete', EN_TUTORIAL, 'Your gift is incomplete without the app payment.'],
    ['hi: नहीं गिना', HI_TUTORIAL, 'सीधे भेजी गई राशि आपके योगदान में नहीं गिनी जाएगी।'],
    ['hi: अधूरा योगदान', HI_TUTORIAL, 'यह एक अधूरा योगदान है।'],
    ['hi: अनियमित भुगतान', HI_TUTORIAL, 'यह अनियमित भुगतान माना जाएगा।'],
  ];

  for (const [label, file, line] of planted) {
    it(`flags "${label}"`, () => {
      const findings = blameFindings(file, line);
      expect(findings.length, `expected the out-of-band-blame rule to fire on: ${line}`).toBeGreaterThan(0);
      expect(findings[0].kind).toBe('tone');
    });
  }
});

// ─── (c) the DELIBERATE non-matches — the narrowings, so a later "strengthening" cannot silently
//         swallow copy that is correctly framed (the wrong-PIN / wrong-pool genuine mistakes) ────

describe('out-of-band-blame — the recorded narrowings hold (no over-reach)', () => {
  const permitted: Array<[string, string, string]> = [
    // A wrong UPI PIN and a wrong-pool payment ARE genuine mistakes; the gift is not. Bare गलत / wrong
    // must stay usable for the events that really are errors (contribution.json, shipped 8.2 / 7.6).
    ['hi: wrong PIN copy (गलत, not गलती से)', HI_CONTRIBUTION, 'पिन गलत टाइप होना आम बात है।'],
    [
      'en: wrong-pool recovery copy',
      EN_CONTRIBUTION,
      'We received your payment, but it went to a different pool than your assigned one.',
    ],
    // Innocent "should have" — not the retrospective-correction frame; the arm is bound to an action verb.
    ['en: should have received', EN_CONTRIBUTION, 'You should have received an SMS with the details.'],
    // Innocent irregular/incomplete — the arm is bound to a contribution/gift noun.
    ['en: incomplete address', EN_CONTRIBUTION, 'Your address is incomplete.'],
    // A developer comment in the code_globs slice — the reason `accidental` is bound to a giving verb.
    [
      'admin code comment',
      'apps/admin/src/modules/claim-verification/ConcealmentAssessmentControl.tsx',
      '// an accidental double-click on the submit button silently re-records',
    ],
  ];

  for (const [label, file, line] of permitted) {
    it(`does NOT flag "${label}"`, () => {
      expect(blameFindings(file, line), `unexpected out-of-band-blame finding on: ${line}`).toEqual([]);
    });
  }
});

// ─── (d) the load-bearing invariant — the REAL re-authored copy is clean (AC4.iii / AC4.iv) ──────

describe('the real governed surfaces carry no blame frame', () => {
  for (const [label, file] of [
    ['en pool-onboarding', EN_TUTORIAL],
    ['hi pool-onboarding', HI_TUTORIAL],
    ['en contribution', EN_CONTRIBUTION],
    ['hi contribution', HI_CONTRIBUTION],
  ] as const) {
    it(`checkTone over every ${label} string returns empty`, () => {
      for (const s of resolvedStrings(file)) {
        expect(checkTone(file, s, config), `prohibited frame in ${label}: "${s}"`).toEqual([]);
      }
    });
  }

  it('the re-authored Screen-3 keys specifically read as honouring, not correcting (AC2/AC4.iii)', () => {
    const en = JSON.parse(readRepo(EN_TUTORIAL)) as Record<string, string>;
    const hi = JSON.parse(readRepo(HI_TUTORIAL)) as Record<string, string>;
    for (const key of ['screen3.title', 'screen3.body', 'screen3.body2', 'screen3.progress_a11y']) {
      expect(checkTone(EN_TUTORIAL, en[key], config), `en ${key}`).toEqual([]);
      expect(checkTone(HI_TUTORIAL, hi[key], config), `hi ${key}`).toEqual([]);
    }
  });

  it('the helpline out-of-band script keys are clean in both locales (AC3/AC4.iv)', () => {
    for (const [file, locale] of [
      [EN_CONTRIBUTION, 'en'],
      [HI_CONTRIBUTION, 'hi'],
    ] as const) {
      const catalog = JSON.parse(readRepo(file)) as Record<string, string>;
      const scriptKeys = Object.keys(catalog).filter((k) => k.startsWith('out_of_band.helpline.'));
      // The script must EXIST — an empty filter would make this assertion vacuously green.
      expect(scriptKeys.length, `${locale} out-of-band helpline keys`).toBeGreaterThanOrEqual(6);
      for (const key of scriptKeys) {
        expect(checkTone(file, catalog[key], config), `${locale} ${key}`).toEqual([]);
      }
    }
  });
});
