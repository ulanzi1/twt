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

/** The SAME family, in the two forms this story moves between. */
const BEFORE: Record<Locale, string> = { hi: 'रामेश्वर प्र.', en: 'Rajesh K.' };
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
