// The suspicion notice SMS copy ↔ the registered DLT text — the LOCKSTEP (Story 6.24b, Task 3.3; AC7b; `2026-10-08-295`
// RB1, RB4, RB6, RB16). The 6.19 test's shape (`claim-correction-sms-templates.test.ts`), ⛔ its D33 name assertion: these
// texts NAME the member because the Panel's ratified words do (the D33 carve-out). For all three messages in both locales:
// the REAL `t()` (⛔ never a stub) renders EXACTLY the registered text with each variable as `{#var#}`; each variable lands
// once, in the order of the Panel's words; the request sheet carries the same text and key; the en words are the Panel's,
// byte for byte (+ `{helpline}`); ⛔ no deadline threat (RB16 — `appeal_notice`'s `{date}` slot alone exempt, asserted with
// a NON-digit marker); and `$comment.suspicion_sms` carries the NOT-YET-HUMAN-REVIEWED marker in BOTH locales.

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import {
  DLT_VAR,
  SUSPICION_NOTICE_SMS_MESSAGES,
  SUSPICION_NOTICE_SMS_TEMPLATES,
  formatAppealUntil,
  renderSuspicionNoticeSms,
  suspicionNoticeDltConfigKey,
  type SuspicionNoticeSmsMessage,
} from '../src/scheduler/suspicion-notice-sms-templates.js';

const read = (rel: string) => readFileSync(fileURLToPath(new URL(rel, import.meta.url)), 'utf-8');
const SHEET = read('../../../docs/launch-gate-inventory/dlt-template-requests-6-19.md');
const CLAIM_JSON = {
  en: JSON.parse(read('../../../packages/i18n/locales/en/claim.json')) as Record<string, string>,
  hi: JSON.parse(read('../../../packages/i18n/locales/hi/claim.json')) as Record<string, string>,
};

/** RB16 — the 6.19 deny-list, COPIED WHOLE (6.19's test keeps its copy private and AC9b keeps that file unchanged).
 * "day(s)", "within", "last date / chance", "urgent", "immediately", "deadline", "otherwise". Substrings, ⛔ never `\b`. */
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

/** THE deadline-threat assertion (T6, S4) — 6.19's helper, copied whole. Throws on a threat. */
function assertNoDeadlineThreat(body: string, label: string): void {
  expect(body.toLowerCase(), label).not.toMatch(/\bdays?\b|urgent|last chance|within|deadline/);
  expect(body, label).not.toMatch(/[०-९]/); // UX-DR73 — ⛔ Devanagari digits
  for (const term of HINDI_DEADLINE_TERMS) expect(body, `"${term}" in ${label}`).not.toContain(term);
}

/** The Panel's words (FQ7 B, `-291` Q2 B, `-293` item 1 B), `[member]` / `[date]` as `{#var#}`, + the helpline slot. */
const PANEL_EN: Record<SuspicionNoticeSmsMessage, string> = {
  refusal_notice: 'A claim for {#var#} could not go ahead. Please call the helpline {#var#}.',
  closed_notice: 'Your claim for {#var#} has been closed. Please call the helpline {#var#}.',
  appeal_notice: 'The claim for {#var#} could not go ahead. It can be appealed until {#var#}. Please call the helpline {#var#}.',
};

const CASES = SUSPICION_NOTICE_SMS_MESSAGES.flatMap((message) => (['hi', 'en'] as const).map((locale) => ({ message, locale })));

const MEMBER = '\u0001MEMBER\u0001';
const DATE = '\u0003DATE\u0003';
const HELP = '\u0002HELPLINE\u0002';

describe('the suspicion notice SMS templates (RB1 — three messages × both locales)', () => {
  it.each(CASES)('⭐ $message / $locale — the real t() renders EXACTLY the registered DLT text', ({ message, locale }) => {
    const template = SUSPICION_NOTICE_SMS_TEMPLATES[message][locale];
    const dated = message === 'appeal_notice';
    // ⭐ DISTINCT markers per variable — one shared token would let a swap pass.
    const rendered = renderSuspicionNoticeSms(message, locale, { member: MEMBER, helpline: HELP, ...(dated ? { date: DATE } : {}) });
    expect(rendered.split(MEMBER)).toHaveLength(2);
    expect(rendered.split(HELP)).toHaveLength(2);
    // The order of the Panel's words: member, (date,) helpline.
    expect(rendered.indexOf(MEMBER)).toBeLessThan(rendered.indexOf(HELP));
    if (dated) {
      expect(rendered.split(DATE)).toHaveLength(2);
      expect(rendered.indexOf(MEMBER)).toBeLessThan(rendered.indexOf(DATE));
      expect(rendered.indexOf(DATE)).toBeLessThan(rendered.indexOf(HELP));
    }
    expect(rendered.replace(MEMBER, DLT_VAR).replace(DATE, DLT_VAR).replace(HELP, DLT_VAR)).toBe(template.registeredText);
    // The slot count — 2, or 3 for `appeal_notice`.
    expect(template.registeredText.split(DLT_VAR)).toHaveLength(dated ? 4 : 3);
  });

  it.each(CASES)('⭐ $message / $locale — the request sheet carries the SAME registered text', ({ message, locale }) => {
    expect(SHEET).toContain(SUSPICION_NOTICE_SMS_TEMPLATES[message][locale].registeredText);
  });

  it.each(CASES)('$message / $locale — the config key is the sheet\'s (RB4)', ({ message, locale }) => {
    const key = SUSPICION_NOTICE_SMS_TEMPLATES[message][locale].dltTemplateIdConfigKey;
    expect(key).toBe(`sms.dlt.template_id.suspicion_notice.${message}.${locale}`);
    expect(key).toBe(suspicionNoticeDltConfigKey(message, locale));
    expect(SHEET).toContain(key);
  });

  it.each(SUSPICION_NOTICE_SMS_MESSAGES)('⭐ %s / en — the Panel\'s words, byte for byte (+ `{helpline}`)', (message) => {
    expect(SUSPICION_NOTICE_SMS_TEMPLATES[message].en.registeredText).toBe(PANEL_EN[message]);
  });

  it.each(CASES)('⛔ $message / $locale — every variable filled, the member and helpline carried, ⛔ no deadline threat (RB16)', ({ message, locale }) => {
    // ⭐ `appeal_notice`'s `{date}` is the ONE exemption (the Panel's "until [date]") — rendered with a NON-digit marker so
    // the rest of the body is still held to the deny-list.
    const body = renderSuspicionNoticeSms(message, locale, { member: 'Ramesh K.', helpline: '+911800123456', date: 'DATEMARK' });
    expect(body).toContain('Ramesh K.');
    expect(body).toContain('+911800123456');
    if (message === 'appeal_notice') expect(body).toContain('DATEMARK');
    expect(body).not.toMatch(/\{\w+\}/);
    assertNoDeadlineThreat(body.replace('+911800123456', 'HELPLINE'), `the ${locale} ${message}`);
  });

  it.each([
    ['a Hindi "within N days"', ' 7 दिनों के भीतर अपील करें।'],
    ['a Hindi "last date"', ' अंतिम तिथि।'],
    ['a Hindi "immediately"', ' तुरंत संपर्क करें।'],
    ['Devanagari digits', ' ७'],
    ['an English "within 7 days"', ' Reply within 7 days.'],
  ])('the deny-list is LIVE — the SAME assertion THROWS on %s written into a real Hindi body', (_label, threat) => {
    const clean = renderSuspicionNoticeSms('appeal_notice', 'hi', { member: 'X', helpline: 'Y', date: 'Z' });
    assertNoDeadlineThreat(clean, 'clean');
    expect(() => assertNoDeadlineThreat(`${clean}${threat}`, 'threatened')).toThrow();
  });

  it('`appeal_notice` without a date THROWS (⛔ a text with a blank date)', () => {
    expect(() => renderSuspicionNoticeSms('appeal_notice', 'en', { member: 'X', helpline: 'Y' })).toThrow();
  });

  it.each(['en', 'hi'] as const)('⭐ `$comment.suspicion_sms` carries the NOT-YET-HUMAN-REVIEWED marker — %s (F27: ⛔ no other gate reads it)', (locale) => {
    expect(CLAIM_JSON[locale]['$comment.suspicion_sms']).toContain('NOT YET HUMAN-REVIEWED');
  });
});

describe('formatAppealUntil — RB6: `DD-MM-YYYY`, Latin digits, a pure reorder', () => {
  it.each([
    ['2026-10-08', '08-10-2026'],
    ['2026-12-31', '31-12-2026'],
    ['2027-01-01', '01-01-2027'],
    ['2028-02-29', '29-02-2028'],
  ])('%s ⇒ %s', (input, out) => {
    expect(formatAppealUntil(input)).toBe(out);
  });

  it('⛔ anything but a calendar date string THROWS', () => {
    for (const bad of ['', '2026-1-8', '08-10-2026', '2026-10-08T00:00:00Z']) expect(() => formatAppealUntil(bad)).toThrow();
  });
});
