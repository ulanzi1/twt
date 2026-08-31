// `contributor_list.empty` — the empty-state copy makes NO confirmation claim. Story 11b.2a (AC8; D7(c)).
//
// ⭐ WHY THIS KEY IS PINNED AT ALL. Under D5 an RTBF'd contributor is OMITTED from the contributor
// list, while D3-aggregate rules that the SAME member still counts toward `confirmedCount`. Those two
// axes are correct and they diverge — which means `rows` can reach ZERO while `pending` does not. On
// the shipped surface that rendered, verbatim and arithmetically false:
//
//     "No confirmed contributions yet."      beside      "2 pending confirmation (67%)"
//
// on a pool of 3 — 0 + 2 ≠ 3 — while the 8.2 card on the sibling screen said "1 of 3". D7(c) fixes it
// AT THE SURFACE: the copy describes THE LIST'S representational state instead of asserting that
// nothing was confirmed. ⛔ No aggregate moved, ⛔ no field was added to the wire.
//
// ⛔⛔ THIS FILE ASSERTS THE PROPERTY, ⛔ NEVER THE SENTENCE. A byte-equality test on copy pins the
// wording and turns every future tone review into a test edit — and the tone review is a REQUIRED
// second layer that `pnpm microcopy:check` explicitly does not substitute for (`docs/tone-guide.md`
// §5). What must survive re-wording is the PROPERTY: this string may not claim that nothing has been
// confirmed. See Decision 2026-08-30-169 cl.9.

import { describe, expect, it } from 'vitest';

import { t } from '../src/resolver.js';

const LOCALES = ['en', 'hi'] as const;

/**
 * Vocabulary that ASSERTS a confirmation fact, per locale. `पुष्ट` / `पुष्टि` is the register the
 * pending strip and the confirmed header both use for exactly that claim, which is why its presence
 * in the EMPTY state is the defect.
 */
const CONFIRMATION_CLAIM_TERMS: Record<(typeof LOCALES)[number], readonly RegExp[]> = {
  // ⚠ WIDENED (second review pass). The original pair — /confirmed/i and /contributions? yet/i — was a
  // two-string denylist, and the most obvious wrong re-word walked straight through it: "No one has
  // contributed yet." is `contributed`, not `contributions`, and carries no `confirmed`. Match the
  // VERB and the EVENT NOUN, not one inflection of each.
  // ⛔ Note what is deliberately NOT banned: `contributor`. The correct copy names the people whose
  //   names are absent — the defect is asserting something about the CONTRIBUTION EVENT.
  en: [/confirm/i, /\bcontribut(ed|ing|ion|ions)\b/i, /\bnothing\b/i],
  // ⚠ `पुष्ट` already subsumes `पुष्टि` — kept as one pattern, not two that look independent.
  // ⭐ `योगदान` needs a NEGATIVE LOOKAHEAD, and this is the whole subtlety of the Hindi guard: the
  //   CORRECT string contains `योगदानकर्ता` ("contributor"), of which `योगदान` ("contribution") is a
  //   literal prefix. A bare /योगदान/ would fail the very string it is meant to protect, while
  //   omitting it lets "अभी तक किसी ने योगदान नहीं दिया।" pass. Match the event noun only when it is
  //   NOT the agent noun.
  hi: [/पुष्ट/, /अंशदान/, /योगदान(?!कर्ता)/],
};

/**
 * Re-words that MUST be caught. ⭐ The guard above is a denylist, and a denylist that has quietly
 * stopped matching anything still reports green — so these pin that it actually bites. Both were
 * constructed as real tone-review candidates: each is fluent, plausible, and arithmetically FALSE
 * beside "2 pending confirmation (67%)" on a pool of 3 whose only confirmed contributor was erased.
 */
const MUST_BE_REJECTED: Record<(typeof LOCALES)[number], readonly string[]> = {
  en: [
    'No one has contributed yet.',
    'No confirmed contributions yet.',
    'Nothing to show here yet.',
    'No contributions have been confirmed.',
  ],
  hi: [
    'अभी तक किसी ने योगदान नहीं दिया।',
    'अभी तक कोई पुष्ट अंशदान नहीं।',
    'अभी तक कोई योगदान पुष्ट नहीं हुआ है।',
  ],
};

describe('contributor_list.empty — AC8 / D7(c)', () => {
  for (const locale of LOCALES) {
    describe(`locale: ${locale}`, () => {
      it('the key EXISTS — `t()` throws on a miss, so an absent key is a member-visible crash', () => {
        // The resolver defaults to `common` and THROWS on an unresolved key, so a key present in one
        // locale and dropped from the other is a crash on that locale only. Assert existence in both.
        const value = t('contributor_list.empty', undefined, { locale, namespace: 'contribution' });
        expect(typeof value).toBe('string');
        expect(value.trim().length).toBeGreaterThan(0);
      });

      it('⛔ makes NO claim about confirmation — the pending strip beside it already owns that claim', () => {
        const value = t('contributor_list.empty', undefined, { locale, namespace: 'contribution' });
        for (const term of CONFIRMATION_CLAIM_TERMS[locale]) {
          expect(value).not.toMatch(term);
        }
      });

      it('carries no interpolation token — it is unconditional, ⛔ not a discriminator', () => {
        // A "why is this list empty" branch was rejected by name (D7(c)): a server-emitted reason
        // field breaks every read on every stale `.strict()` client, and a client-side inference off
        // the ROUNDED `pending.percentage` is unsound. So this string takes no parameters at all.
        const value = t('contributor_list.empty', undefined, { locale, namespace: 'contribution' });
        expect(value).not.toMatch(/\{[a-zA-Z]+\}/);
      });
    });
  }

  it('the guard BITES — every known-false re-word is rejected by the same terms', () => {
    // ⭐ Without this, the denylist could silently stop matching anything and still report green —
    // which is exactly how the original two-term version passed "No one has contributed yet."
    for (const locale of LOCALES) {
      for (const candidate of MUST_BE_REJECTED[locale]) {
        const caught = CONFIRMATION_CLAIM_TERMS[locale].some((term) => term.test(candidate));
        expect(caught, `${locale}: "${candidate}" must be rejected but no term matched`).toBe(true);
      }
    }
  });

  it('⛔ the PENDING STRIP is untouched — it owns the confirmation claim and is CORRECT', () => {
    // D7(c) moves one LIST-AXIS string back onto its own axis. It does not silence the aggregate.
    // If a later pass "tidies" the confirmation language out of the strip too, information IS lost.
    // ⚠ Asserted through the SAME vocabulary list as the empty-state guard (second review pass —
    // this used to hardcode /confirmation/i, i.e. pin a word in the copy, the exact practice this
    // file's header forbids). Reusing the list also keeps the two sides from drifting apart: the
    // strip must MATCH the register the empty state must NOT.
    for (const locale of LOCALES) {
      const strip = t(
        'contributor_list.pending_strip',
        { count: 2, percentage: 67 },
        { locale, namespace: 'contribution' },
      );
      expect(strip).toContain('2');
      expect(strip).toContain('67');
      const ownsTheClaim = CONFIRMATION_CLAIM_TERMS[locale].some((term) => term.test(strip));
      expect(ownsTheClaim, `${locale}: the pending strip must still assert confirmation`).toBe(true);
    }
  });
});
