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

/**
 * THE deadline-threat assertion every body runs through (T6, S4) — ONE helper, so the liveness test below exercises
 * the SAME code the per-template test does (⛔ a re-implementation that could drift). Throws on a threat.
 */
function assertNoDeadlineThreat(body: string, label: string): void {
  expect(body.toLowerCase(), label).not.toMatch(/\bdays?\b|urgent|last chance|within|deadline/);
  expect(body, label).not.toMatch(/[०-९]/); // UX-DR73 — ⛔ Devanagari digits
  // ⚠ The HINDI deny-list is matched as SUBSTRINGS, ⛔ never with `\b`: JavaScript's `\b` is ASCII-only, so it can
  // never fire between Devanagari letters — a `\b`-anchored Hindi pattern passes every body vacuously.
  for (const term of HINDI_DEADLINE_TERMS) expect(body, `"${term}" in ${label}`).not.toContain(term);
}

const CASES = (['reminder', 'closure_notice', 'certificate_reminder'] as const).flatMap((message) =>
  (['hi', 'en'] as const).map((locale) => ({ message, locale })),
);

describe('the claim-correction SMS templates (D32 — all three messages × both locales; Story 6.19d adds `certificate_reminder`)', () => {
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
    assertNoDeadlineThreat(body, `the ${locale} ${message}`);
  });

  it.each([
    ['a Hindi "within N days"', ' 7 दिनों के भीतर उत्तर दें।'],
    ['a Hindi "immediately"', ' तुरंत संपर्क करें।'],
    ['a Hindi "otherwise"', ' अन्यथा दावा बंद होगा।'],
    ['Devanagari digits', ' ७'],
    ['an English "within 7 days"', ' Reply within 7 days.'],
  ])('the deny-list is LIVE — the SAME assertion THROWS on %s written into a real Hindi body', (_label, threat) => {
    const threatened = `${renderClaimCorrectionSms('reminder', 'hi', { reference: 'X', helpline: 'Y' })}${threat}`;
    // The clean body passes the very helper that must reject the threatened one.
    assertNoDeadlineThreat(renderClaimCorrectionSms('reminder', 'hi', { reference: 'X', helpline: 'Y' }), 'clean');
    expect(() => assertNoDeadlineThreat(threatened, 'threatened')).toThrow();
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

  it('⭐ Story 6.19d — the certificate reminder states the REQUIREMENT every certificate must meet (`-236` BB), ⛔ never why one was refused', () => {
    for (const locale of ['en', 'hi'] as const) {
      const body = renderClaimCorrectionSms('certificate_reminder', locale, { reference: 'X', helpline: 'Y' });
      // ⛔ No refusal reason — the reasons 6.21a records (no date / unclear / a future date).
      expect(body.toLowerCase()).not.toMatch(/reject|refus|not accepted|unclear|future|missing/);
      expect(body).not.toMatch(/अस्वीकार|अस्पष्ट|भविष्य/);
    }
    const en = renderClaimCorrectionSms('certificate_reminder', 'en', { reference: 'X', helpline: 'Y' });
    expect(en).toContain('clearly shows the date of death');
    expect(en).toContain('Your claim is still open.');
    // ⭐ The house words (`-244` §3 call 7): तिथि and प्रमाणपत्र.
    const hi = renderClaimCorrectionSms('certificate_reminder', 'hi', { reference: 'X', helpline: 'Y' });
    expect(hi).toContain('तिथि');
    expect(hi).toContain('प्रमाणपत्र');
  });

  it('⭐ Story 6.19d — the two 6.19b / 6.19c messages render BYTE-IDENTICALLY to their registered text (AC9)', () => {
    expect(CLAIM_CORRECTION_SMS_TEMPLATES.reminder.en.registeredText).toBe(
      "Claim {#var#}: the bank details on your family's claim need correcting. Please call the helpline on {#var#}, or the District Admin will contact you. Your claim is still open.",
    );
    expect(CLAIM_CORRECTION_SMS_TEMPLATES.closure_notice.en.registeredText).toBe(
      'Claim {#var#}: this claim was closed because no correction of the bank details was received. This closure cannot be appealed. A new claim may be filed through the helpline on {#var#} or the District Admin.',
    );
  });

  it('`-269` §5 — ONE helpline key PER PARIWAR, lower-case id', () => {
    expect(claimCorrectionHelplineConfigKey('AAAAAAAA-1111-2222-3333-444444444444')).toBe(
      'sms.claim_correction.helpline_number.aaaaaaaa-1111-2222-3333-444444444444',
    );
  });
});
