// The claim-correction SMS copy ↔ the registered DLT text — the LOCKSTEP (Story 6.19b, AC3, AC11b "the message"; D32,
// D33; the `dpdpa-consent-copy` / `claim-contact-copy` precedent). A DLT gateway rejects any content that does not
// byte-match its registered template, so for BOTH messages in BOTH locales: the REAL `t()` (⛔ never a stub) renders
// EXACTLY the registered text when each variable is the `{#var#}` token; the request sheet carries the same text; and
// the body is name-free, carries the reference and the helpline number, and ⛔ no deadline. ⭐ Each variable renders
// with its OWN marker (a swap fails), and the Hindi deny-list is matched as substrings (`\b` is ASCII-only).

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import {
  CLAIM_CORRECTION_SMS_TEMPLATES,
  DLT_VAR,
  claimCorrectionHelplineConfigKey,
  renderClaimCorrectionSms,
} from '../src/scheduler/claim-correction-sms-templates.js';

const SHEET = readFileSync(
  fileURLToPath(new URL('../../../docs/launch-gate-inventory/dlt-template-requests-6-19.md', import.meta.url)),
  'utf-8',
);

/** Deadline-threat terms in Hindi (S4 / T6) — "day(s)", "within", "last date / chance", "urgent", "immediately",
 * "deadline", "otherwise". Substrings, ⛔ never `\b`-anchored (see the test). */
const HINDI_DEADLINE_TERMS = [
  'दिन',
  'भीतर',
  'के अंदर',
  'अंतिम',
  'आखिरी',
  'आख़िरी',
  'तुरंत',
  'अत्यावश्यक',
  'जल्द से जल्द',
  'समय सीमा',
  'समय-सीमा',
  'अन्यथा',
  'वरना',
] as const;

const CASES = (['reminder', 'closure_notice'] as const).flatMap((message) =>
  (['hi', 'en'] as const).map((locale) => ({ message, locale })),
);

describe('the claim-correction SMS templates (D32 — both messages × both locales)', () => {
  it.each(CASES)('⭐ $message / $locale — the real t() renders EXACTLY the registered DLT text', ({ message, locale }) => {
    const template = CLAIM_CORRECTION_SMS_TEMPLATES[message][locale];
    // ⭐ DISTINCT markers per variable — one shared token would let a swapped `{reference}` / `{helpline}` pass.
    const REF = '\u0001REFERENCE\u0001';
    const HELP = '\u0002HELPLINE\u0002';
    const rendered = renderClaimCorrectionSms(message, locale, { reference: REF, helpline: HELP });
    // Each variable lands exactly ONCE, and in the registered ORDER — reference first, helpline second.
    expect(rendered.split(REF)).toHaveLength(2);
    expect(rendered.split(HELP)).toHaveLength(2);
    expect(rendered.indexOf(REF)).toBeLessThan(rendered.indexOf(HELP));
    // With each marker put back as the DLT token, the text is byte-identical to the registered one.
    expect(rendered.replace(REF, DLT_VAR).replace(HELP, DLT_VAR)).toBe(template.registeredText);
    // Exactly the two slots.
    expect(template.registeredText.split(DLT_VAR)).toHaveLength(3);
  });

  it.each(CASES)('⭐ $message / $locale — the request sheet carries the SAME registered text', ({ message, locale }) => {
    expect(SHEET).toContain(CLAIM_CORRECTION_SMS_TEMPLATES[message][locale].registeredText);
  });

  it.each(CASES)('$message / $locale — the config key is the sheet\'s (D7)', ({ message, locale }) => {
    const key = CLAIM_CORRECTION_SMS_TEMPLATES[message][locale].dltTemplateIdConfigKey;
    expect(key).toBe(`sms.dlt.template_id.claim_correction.${message}.${locale}`);
    expect(SHEET).toContain(key);
  });

  it.each(CASES)('⛔ $message / $locale — name-free, reference + helpline, ⛔ no deadline threat (T6, S4)', ({ message, locale }) => {
    const body = renderClaimCorrectionSms(message, locale, { reference: '3F2A9C1E', helpline: '+911800123456' });
    expect(body).toContain('3F2A9C1E');
    expect(body).toContain('+911800123456');
    expect(body).not.toMatch(/\{\w+\}/); // every variable filled
    expect(body.toLowerCase()).not.toMatch(/\bdays?\b|urgent|last chance|within|deadline/);
    expect(body).not.toMatch(/[०-९]/); // UX-DR73 — ⛔ Devanagari digits
    // ⚠ The HINDI deny-list is matched as SUBSTRINGS, ⛔ never with `\b`: JavaScript's `\b` is ASCII-only, so it can
    // never fire between Devanagari letters — a `\b`-anchored Hindi pattern passes every body vacuously.
    for (const term of HINDI_DEADLINE_TERMS) expect(body, `"${term}" in the ${locale} ${message}`).not.toContain(term);
  });

  it('the Hindi deny-list is LIVE — it catches a deadline threat written into a Hindi body', () => {
    const threatened = `${renderClaimCorrectionSms('reminder', 'hi', { reference: 'X', helpline: 'Y' })} 7 दिनों के भीतर उत्तर दें।`;
    expect(HINDI_DEADLINE_TERMS.some((term) => threatened.includes(term))).toBe(true);
  });

  it('⭐ the reminder asks the family to CALL — ⛔ never "update in the app" (a returned claim is never member-editable)', () => {
    const en = renderClaimCorrectionSms('reminder', 'en', { reference: 'X', helpline: 'Y' });
    expect(en).toContain('call the helpline');
    expect(en).toContain('District Admin will contact you');
    expect(en.toLowerCase()).not.toContain('app');
  });

  it('⭐ the closure notice says it cannot be appealed and a new claim goes through the helpline or the District Admin (`-254`)', () => {
    const en = renderClaimCorrectionSms('closure_notice', 'en', { reference: 'X', helpline: 'Y' });
    expect(en).toContain('cannot be appealed');
    expect(en).toContain('new claim may be filed through the helpline');
  });

  it('`-269` §5 — ONE helpline key PER PARIWAR, lower-case id', () => {
    expect(claimCorrectionHelplineConfigKey('AAAAAAAA-1111-2222-3333-444444444444')).toBe(
      'sms.claim_correction.helpline_number.aaaaaaaa-1111-2222-3333-444444444444',
    );
  });
});
