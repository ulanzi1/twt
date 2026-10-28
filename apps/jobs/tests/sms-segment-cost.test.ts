// ⭐ THE PAID-CHANNEL COST OF THE NAME FORM — Story 8.16 (Task 5; AC5).
//
// ── Why this is a test and not a one-off measurement ────────────────────────────────────────────────
// `2026-09-02-180` ruled the deceased family's name onto consumer ④ — the push/WhatsApp/SMS copy. SMS
// is a PAID channel and is reached WHEN PUSH FAILS, so the longer name lands in an unencrypted SMS
// precisely for the members whose app is not working. The Panel ruled with all three channels named in
// the packet, so that is a recorded precision and NOT grounds to revisit — but the COST is measurable,
// and `2026-09-02-180`'s own follow-up asks for it to be measured before shipping ④.
//
// ⚠⛔ THE CEILING THAT MATTERS IS NOT 160. `2026-09-02-180`'s context note said "a 160-character
// segment", which is the GSM-7 figure. The launch locale is Hindi: Devanagari forces UCS-2, where a
// single segment is 70 units and a concatenated one is 67. ⇒ the honest artefact is "segments BEFORE →
// AFTER", never "does it fit".
//
// ⭐ AND THE ENGLISH ARM IS UCS-2 TOO, which was not obvious: `formatCurrency` emits the RUPEE SIGN
// (₹, U+20B9), which is outside both the GSM-7 basic set and its extension table. So every one of
// these messages is UCS-2 regardless of locale, and there is no "cheap" locale to fall back on.
//
// ⛔ A rise beyond ONE segment on any (locale, kind) pair is ROUTED, never absorbed silently — and it
// is never a reason to narrow a ruled scope. This test is what makes that rule fire on a future copy
// edit rather than on a bill.

import { CONTRIBUTION_LOOP_I18N_NAMESPACE } from '@twt/contracts';
import { DEFAULT_LOCALE, formatCurrency, t, type Locale } from '@twt/i18n';
import { describe, expect, it } from 'vitest';

import { renderContributionSms, smsPoolLabel } from '../src/scheduler/contribution-sms-templates.js';
import { SHEET } from './_dlt-template-sheet.js';

// ⚠ The namespace is the THIRD argument's `namespace` field — an OPTIONS OBJECT, not a positional
// string. It defaults to `common` and THROWS on a missing key, which is how a namespace omission
// surfaces loudly instead of rendering a raw key. Same shape the producer uses.
const NS = { namespace: CONTRIBUTION_LOOP_I18N_NAMESPACE } as const;

/** GSM-7 default alphabet (3GPP TS 23.038) — one septet each. */
const GSM7_BASIC = new Set(
  '@£$¥èéùìòÇ\nØø\rÅåΔ_ΦΓΛΩΠΨΣΘΞÆæßÉ !"#¤%&\'()*+,-./0123456789:;<=>?' +
    '¡ABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÑÜ§¿abcdefghijklmnopqrstuvwxyzäöñüà',
);
/** The extension table — TWO septets each (an escape plus the character). */
const GSM7_EXT = new Set('^{}\\[~]|€');

interface Measured {
  readonly encoding: 'GSM-7' | 'UCS-2';
  readonly units: number;
  readonly segments: number;
}

/** Measure one message the way a gateway does: pick the encoding, then count segments. */
function measure(message: string): Measured {
  let septets = 0;
  let gsm7 = true;
  for (const ch of message) {
    if (GSM7_BASIC.has(ch)) septets += 1;
    else if (GSM7_EXT.has(ch)) septets += 2;
    else {
      gsm7 = false;
      break;
    }
  }
  if (gsm7) {
    return {
      encoding: 'GSM-7',
      units: septets,
      segments: septets <= 160 ? 1 : Math.ceil(septets / 153),
    };
  }
  // UCS-2 counts UTF-16 CODE UNITS, not code points — a surrogate pair costs two.
  const units = [...message].reduce((n, ch) => n + (ch.codePointAt(0)! > 0xffff ? 2 : 1), 0);
  return { encoding: 'UCS-2', units, segments: units <= 70 ? 1 : Math.ceil(units / 67) };
}

/**
 * The SAME family, in the two forms this story moves between.
 *
 * ⭐ REVIEW FIX (8.16) — `BEFORE` must be what pre-story code actually rendered, not this story's OWN
 * new shielded-mode trailing period. The old `familyLabel`/`familyDisplay` joins were
 * `` `${firstName} ${lastInitial}` `` — NO period; the period is `resolveMemberFacingDeceasedName`'s
 * own addition (to match the public form's trailing period, `2026-09-02-181`). Measuring a before
 * that already carries the new period would understate the true before → after delta.
 */
const BEFORE: Record<Locale, string> = { hi: 'रामेश्वर प्र', en: 'Rajesh K' };
const AFTER: Record<Locale, string> = { hi: 'रामेश्वर प्रसाद', en: 'Rajesh Kumar Sharma' };

const POOL: Record<Locale, string> = { hi: 'युधिष्ठिर', en: 'Pool A' };

/** The two ALERT KINDS whose copy interpolates `{family}` — the FIVE render sites' two SMS-bearing
 *  messages: the cycle-open body and the day-14 deadline subject. */
const KINDS = [
  { label: 'cycle_open', key: 'notify.cycle_open.body' },
  { label: 'deadline_day_14', key: 'notify.deadline.day_14.subject' },
] as const;

function render(locale: Locale, key: string, family: string): string {
  return t(
    key,
    {
      family,
      pool: POOL[locale],
      // Operational figure ⇒ LATIN numerals even inside Hindi copy (amendment-A2), exactly as
      // `contribution-notify-triggers.ts` renders it.
      amount: formatCurrency(1100, 'en'),
      days: '0',
      date: '05-08-2026',
    },
    { locale, ...NS },
  );
}

describe('AC5 — the SMS segment cost of the name form, both locales × both alert kinds', () => {
  it.each(KINDS)('$label: the rise is at most ONE segment in BOTH locales', ({ key }) => {
    for (const locale of ['hi', 'en'] as const) {
      const before = measure(render(locale, key, BEFORE[locale]));
      const after = measure(render(locale, key, AFTER[locale]));
      expect(
        after.segments - before.segments,
        `${locale}/${key}: ${before.segments} → ${after.segments} segments ` +
          `(${after.encoding}, ${before.units} → ${after.units} units). A rise beyond one segment is ` +
          `ROUTED, not absorbed — and never a reason to narrow the ruled scope of 2026-09-02-180.`,
      ).toBeLessThanOrEqual(1);
    }
  });

  it('⚠ every one of these messages is UCS-2 — including ENGLISH, because of the ₹ sign', () => {
    // The consequence, stated so a future reader does not "optimise" by assuming the 160/153 ceiling
    // applies to the English arm: it does not, and it never did on this copy.
    for (const locale of ['hi', 'en'] as const) {
      for (const { key } of KINDS) {
        expect(measure(render(locale, key, AFTER[locale])).encoding).toBe('UCS-2');
      }
    }
    expect(measure(formatCurrency(1100, 'en')).encoding).toBe('UCS-2');
  });

  it('⚠ the Hindi cycle-open body is ALREADY multi-segment BEFORE any name is interpolated', () => {
    // ⭐ This is why the artefact is "before → after" and never "does it fit". The template alone
    // exceeds the 70-unit single-segment UCS-2 ceiling, so the message was two segments at ANY name
    // length — the name form is not what put it there and shortening the name would not bring it back.
    const bareTemplate = t('notify.cycle_open.body', { family: '', pool: '', amount: '' }, { locale: 'hi', ...NS });
    expect(measure(bareTemplate).encoding).toBe('UCS-2');
    expect(measure(bareTemplate).units).toBeGreaterThan(70);
  });

  it('the measurement is not vacuous — the two name forms really are different lengths', () => {
    expect(AFTER.hi.length).toBeGreaterThan(BEFORE.hi.length);
    expect(AFTER.en.length).toBeGreaterThan(BEFORE.en.length);
    expect(DEFAULT_LOCALE).toBe('hi'); // the launch locale is the UCS-2 one
  });
});

describe('Story 5.11 review R5 / round 2 D2 (b) — the pool value never lengthens a text past the cost as put (-394 item 2)', () => {
  // [message, sheet ordinal en, en units at a 30-letter basic name, sheet ordinal hi, hi units at a 30-unit name]
  const cases = [
    ['deadline_not_recorded', 18, 134, 17, 128],
    ['payment_not_matched', 20, 91, 19, 99],
    ['payment_not_confirmed', 22, 131, 21, 133],
  ] as const;
  /** The sheet's own figure for a template, e.g. `18 (en) is 134` or `17\n(hi) 128` (the sheet wraps lines). */
  const sheetFigure = (ordinal: number, locale: 'en' | 'hi', units: number): RegExp =>
    new RegExp(`\\b${String(ordinal)}\\s+\\(${locale}\\)\\s+(?:is\\s+)?${String(units)}\\b`);
  const render = (message: (typeof cases)[number][0], locale: 'en' | 'hi', poolName: string) =>
    renderContributionSms(message, locale, { pool: smsPoolLabel({ poolName, poolLetterCode: 'C' }, locale), date: '23-10-2026' });

  it.each(cases)('%s — the longest en value is ONE GSM-7 part; extension and control characters fall back', (message, ordinal, units) => {
    expect(measure(render(message, 'en', 'A'.repeat(30)))).toEqual({ encoding: 'GSM-7', units, segments: 1 });
    for (const poolName of ['^'.repeat(30), 'Ganga€', 'Ga\nnga', 'Ganga|1']) {
      expect(smsPoolLabel({ poolName, poolLetterCode: 'C' }, 'en')).toBe('C');
    }
    expect(SHEET).toMatch(sheetFigure(ordinal, 'en', units));
  });

  it.each(cases)('%s — the longest hi value is TWO parts, counted in UTF-16 units', (message, _en, _enUnits, ordinal, units) => {
    expect(measure(render(message, 'hi', 'क'.repeat(30)))).toEqual({ encoding: 'UCS-2', units, segments: 2 });
    // 15 supplementary-plane letters are 30 UTF-16 units — the slot's ceiling; 16 are 32 and fall back to the letter code.
    expect(measure(render(message, 'hi', '\u{10400}'.repeat(15)))).toEqual({ encoding: 'UCS-2', units, segments: 2 });
    expect(smsPoolLabel({ poolName: '\u{10400}'.repeat(16), poolLetterCode: 'C' }, 'hi')).toBe('C');
    expect(SHEET).toMatch(sheetFigure(ordinal, 'hi', units));
  });

  it('Q5 — the boundaries: 30 UTF-16 units fit, 31 do not; a whitespace-only name is absent', () => {
    expect(smsPoolLabel({ poolName: 'A'.repeat(30), poolLetterCode: 'C' }, 'en')).toBe('A'.repeat(30));
    expect(smsPoolLabel({ poolName: 'A'.repeat(31), poolLetterCode: 'C' }, 'en')).toBe('C');
    expect(smsPoolLabel({ poolName: 'क'.repeat(31), poolLetterCode: 'C' }, 'hi')).toBe('C');
    expect(smsPoolLabel({ poolName: ' \t ', poolLetterCode: 'C' }, 'hi')).toBe('C');
    expect(smsPoolLabel({ poolName: null, poolLetterCode: 'C' }, 'hi')).toBe('C');
  });

  it.each([...'^{}\\[~]|€'])('Q5 — the en GSM-7 extension character %j falls back to the letter code', (ch) => {
    expect(smsPoolLabel({ poolName: `Ganga${ch}`, poolLetterCode: 'C' }, 'en')).toBe('C');
  });

  it.each(['\n', '\r', '\f', '\t', '\u001b', '\u0085'])('Q3 — a control character %j falls back in BOTH locales', (ch) => {
    expect(smsPoolLabel({ poolName: `Ganga${ch}x`, poolLetterCode: 'C' }, 'en')).toBe('C');
    expect(smsPoolLabel({ poolName: `गंगा${ch}क`, poolLetterCode: 'C' }, 'hi')).toBe('C');
  });

  it('Q3 — a Devanagari ZWJ / ZWNJ (Cf, ⛔ Cc) is kept in a hi name', () => {
    for (const joiner of ['\u200d', '\u200c']) {
      expect(smsPoolLabel({ poolName: `क्${joiner}ष`, poolLetterCode: 'C' }, 'hi')).toBe(`क्${joiner}ष`);
    }
  });

  it('a padded curated name is sent trimmed, and its length is measured trimmed', () => {
    expect(smsPoolLabel({ poolName: ' Ganga ', poolLetterCode: 'C' }, 'en')).toBe('Ganga');
    expect(smsPoolLabel({ poolName: ` ${'a'.repeat(30)} `, poolLetterCode: 'C' }, 'en')).toBe('a'.repeat(30));
  });
});

// ⭐ Story 5.8b (Task 7; AC10; FS12 / FS15 (a), `2026-10-28-415`) — the degraded-mode bridge text, its OWN `it` (the `cases` above assert
// 1 en / 2 hi parts — the bridge carries the family's name in two boxes and is longer). Templates 23 (hi) / 24 (en), BOTH provisioned
// Unicode (a family name may be Devanagari — FS15 (a)), so the gateway counts UCS-2 for either language.
describe('Story 5.8b — the bridge text at its LONGEST values is 3 Unicode parts in either language (the sheet\'s figures, pinned)', () => {
  const sheetFigure = (ordinal: number, locale: 'en' | 'hi', units: number): RegExp =>
    new RegExp(`\\b${String(ordinal)}\\s+\\(${locale}\\)\\s+(?:is\\s+)?${String(units)}\\b`);
  const bridge = (locale: 'en' | 'hi', poolName: string, member1: string, member2: string): string =>
    renderContributionSms('cycle_open_bridge', locale, { pool: smsPoolLabel({ poolName, poolLetterCode: 'C' }, locale), member1, member2 });
  /** UCS-2 cost of a text sent on a Unicode template, whatever its characters. */
  const asUnicode = (text: string): number => Math.ceil([...text].reduce((n, ch) => n + (ch.codePointAt(0)! > 0xffff ? 2 : 1), 0) / 67);

  it('24 (en) — 174 at a 30-letter pool and a 60-letter LATIN name: 3 parts on its Unicode template (2 were it GSM-7)', () => {
    const text = bridge('en', 'A'.repeat(30), 'R'.repeat(30), 'S'.repeat(30));
    expect(measure(text)).toEqual({ encoding: 'GSM-7', units: 174, segments: 2 });
    expect(asUnicode(text)).toBe(3);
    expect(SHEET).toMatch(sheetFigure(24, 'en', 174));
  });

  it('24 (en) — a DEVANAGARI family name makes the text Unicode on its own: still 174, 3 parts (T21)', () => {
    expect(measure(bridge('en', 'A'.repeat(30), 'क'.repeat(30), 'ख'.repeat(30)))).toEqual({ encoding: 'UCS-2', units: 174, segments: 3 });
  });

  it('23 (hi) — 176 at a 30-unit pool and a 60-letter name: 3 parts', () => {
    expect(measure(bridge('hi', 'क'.repeat(30), 'R'.repeat(30), 'S'.repeat(30)))).toEqual({ encoding: 'UCS-2', units: 176, segments: 3 });
    expect(SHEET).toMatch(sheetFigure(23, 'hi', 176));
  });

  it('typical values (a 12–15-character pool, an 18–25-letter name) are 114–126 — TWO parts in either language', () => {
    for (const [pool, name] of [['A'.repeat(12), 'R'.repeat(18)], ['A'.repeat(15), 'R'.repeat(25)]] as const) {
      const half = Math.ceil(name.length / 2);
      for (const locale of ['en', 'hi'] as const) {
        const text = bridge(locale, locale === 'hi' ? 'क'.repeat(pool.length) : pool, name.slice(0, half), name.slice(half));
        expect(text.length).toBeGreaterThanOrEqual(114);
        expect(text.length).toBeLessThanOrEqual(126);
        expect(asUnicode(text)).toBe(2);
      }
    }
    expect(SHEET).toMatch(/114–126 \(\*\*2 segments\*\*\)/);
  });
});

