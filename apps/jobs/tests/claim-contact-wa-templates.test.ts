// The claimant's WhatsApp step — the template bodies ↔ the reminder that failed — the LOCKSTEP (Story 6.37d, Task 5; AC5; WS9,
// I6, T8, T9). In both chases and both locales the REAL `t('correction_sms.reminder' | 'certificate_sms.reminder')` (⛔ a stub, ⛔ a
// hand copy of the JSON — [[feedback_stub_must_call_not_transcribe]]) with the two Meta variables as its values renders EXACTLY
// the body; each variable lands once, in order; ⛔ two variables adjacent; every body starts and ends with words (F4); the
// language map is exactly `en` / `hi`; the key family and the purposes; and ⛔ marker of the SMS registry in the file.

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { t } from '@twt/i18n';
import { describe, expect, it } from 'vitest';

import {
  CLAIM_CONTACT_WA_BODY,
  CLAIM_CONTACT_WA_COPY_KEY,
  CLAIM_CONTACT_WA_LANGUAGE,
  CLAIM_CONTACT_WA_LOCALES,
} from '../src/scheduler/claim-contact-wa-templates.js';
import { TEMPLATE_NAME_FORM } from '../src/scheduler/claim-peer-mesh-wa-reminders.js';
import { waTemplateConfigKey } from '../src/scheduler/wa-template-config-key.js';

const SOURCE = readFileSync(fileURLToPath(new URL('../src/scheduler/claim-contact-wa-templates.ts', import.meta.url)), 'utf-8');
const CASES = (['correction', 'certificate'] as const).flatMap((chase) => CLAIM_CONTACT_WA_LOCALES.map((locale) => [chase, locale] as const));

describe('the claim-contact WhatsApp bodies (WS9 / I6 — the same words as the reminder that failed)', () => {
  it.each(CASES)('⭐ %s / %s — the REAL t() with {{1}} / {{2}} renders EXACTLY the body', (chase, locale) => {
    const rendered = t(CLAIM_CONTACT_WA_COPY_KEY[chase], { reference: '{{1}}', helpline: '{{2}}' }, { namespace: 'claim', locale });
    expect(rendered).toBe(CLAIM_CONTACT_WA_BODY[chase][locale]);
  });

  it.each(CASES)('%s / %s — each variable once, in order; ⛔ adjacent; ⛔ a third; starts and ends with words (F4)', (chase, locale) => {
    const body = CLAIM_CONTACT_WA_BODY[chase][locale];
    for (const v of ['{{1}}', '{{2}}']) expect(body.split(v), v).toHaveLength(2);
    expect(body.indexOf('{{1}}')).toBeLessThan(body.indexOf('{{2}}'));
    expect(body).not.toMatch(/\}\}\s*\{\{/);
    expect(body).not.toMatch(/\{\{[03-9]\}\}/);
    expect(body.startsWith('{{')).toBe(false);
    expect(body.trimEnd().endsWith('}}')).toBe(false);
    expect(body).not.toContain('TWT');
  });

  it('T9 — the language map is EXACTLY en / hi (⛔ en_US, ⛔ en_IN)', () => {
    expect(CLAIM_CONTACT_WA_LANGUAGE).toEqual({ en: 'en', hi: 'hi' });
  });

  it('the copy keys are the two reminders (⛔ a new text, ⛔ a new SMS template — I6)', () => {
    expect(CLAIM_CONTACT_WA_COPY_KEY).toEqual({ correction: 'correction_sms.reminder', certificate: 'certificate_sms.reminder' });
  });

  it('the dlt-typed-variables markers appear ⛔ in the file, comments included', () => {
    expect(SOURCE).not.toContain('{#var#}');
    expect(SOURCE).not.toContain('DLT_VAR');
    expect(SOURCE).not.toContain('sms.dlt.template_id.');
  });

  it('WS9 — the key family carries the two claim-contact purposes; the template-name form is 6.31\'s ONE regex', () => {
    expect(waTemplateConfigKey('claim_contact.correction_reminder', 'hi', 'AAAA1111-2222-3333-4444-555566667777')).toBe(
      'wa.template.claim_contact.correction_reminder.hi.aaaa1111-2222-3333-4444-555566667777',
    );
    expect(waTemplateConfigKey('claim_contact.certificate_reminder', 'en', 'p')).toBe('wa.template.claim_contact.certificate_reminder.en.p');
    expect(TEMPLATE_NAME_FORM.test('claim_correction_reminder_hi')).toBe(true);
    expect(TEMPLATE_NAME_FORM.test('Claim-Reminder')).toBe(false);
  });
});
