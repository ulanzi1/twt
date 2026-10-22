// The registration sheet's OTP rows — Story 6.34 (AC7; TV3 / TV8 / TV13). The claim texts' rows are proved by their own
// lockstep tests (`claim-correction-sms-templates.test.ts`, `suspicion-notice-sms-templates.test.ts`); this file proves
// templates 15 / 16 — the login and step-up OTP, whose registry lives in `@twt/channels` (⛔ `@twt/i18n` there, so ⛔
// lockstep test of its own reads the sheet): each row, found by its config key, lists the ONE numeric slot, its MSG91
// form, and the sheet carries the registered text byte for byte.

import { needsUnicode, OTP_DLT_TEMPLATE_REGISTRY, toGatewayTemplate, type DltSlot, type OtpIntent } from '@twt/channels';
import { describe, expect, it } from 'vitest';

import { CLAIM_CORRECTION_SMS_TEMPLATES } from '../src/scheduler/claim-correction-sms-templates.js';
import { PEER_MESH_REQUEST_SMS_TEMPLATES } from '../src/scheduler/peer-mesh-sms-templates.js';
import { SUSPICION_NOTICE_SMS_TEMPLATES } from '../src/scheduler/suspicion-notice-sms-templates.js';
import { expectRegisteredTextRow, msg91Form, sheetRowByConfigKey } from './_dlt-template-sheet.js';

const OTP_ROWS: ReadonlyArray<{ intent: OtpIntent; number: number }> = [
  { intent: 'login', number: 15 },
  { intent: 'step_up', number: 16 },
];

describe('the registration sheet — the OTP templates 15 / 16 (Story 6.34 AC7)', () => {
  it.each(OTP_ROWS)('⭐ $intent — row $number lists numeric, in order, and the MSG91 `##otp##` form', ({ intent, number }) => {
    const template = OTP_DLT_TEMPLATE_REGISTRY[intent];
    const row = sheetRowByConfigKey(template.dltTemplateIdConfigKey);
    expect(row.number).toBe(number);
    expect(row.types).toEqual(['numeric']);
    expect(row.types).toEqual(template.slots.map((s) => s.type));
    expect(row.msg91).toBe(msg91Form(template.contentTemplate, template.slots));
  });

  it.each(OTP_ROWS)('⭐ $intent — the sheet carries the registered text byte for byte', ({ intent, number }) => {
    expectRegisteredTextRow(number, OTP_DLT_TEMPLATE_REGISTRY[intent].contentTemplate);
  });
});

/** Every registered template 1–16, from its OWN registry (⛔ a transcribed list). */
const EVERY_TEMPLATE: ReadonlyArray<{ configKey: string; locale: 'hi' | 'en'; text: string; slots: readonly DltSlot[] }> = [
  ...Object.values(CLAIM_CORRECTION_SMS_TEMPLATES).flatMap((byLocale) =>
    (['hi', 'en'] as const).map((locale) => ({
      configKey: byLocale[locale].dltTemplateIdConfigKey,
      locale,
      text: byLocale[locale].registeredText,
      slots: byLocale[locale].slots,
    })),
  ),
  ...Object.values(SUSPICION_NOTICE_SMS_TEMPLATES).flatMap((byLocale) =>
    (['hi', 'en'] as const).map((locale) => ({
      configKey: byLocale[locale].dltTemplateIdConfigKey,
      locale,
      text: byLocale[locale].registeredText,
      slots: byLocale[locale].slots,
    })),
  ),
  ...(['hi', 'en'] as const).map((locale) => ({
    configKey: PEER_MESH_REQUEST_SMS_TEMPLATES[locale].dltTemplateIdConfigKey,
    locale,
    text: PEER_MESH_REQUEST_SMS_TEMPLATES[locale].registeredText,
    slots: PEER_MESH_REQUEST_SMS_TEMPLATES[locale].slots,
  })),
  ...OTP_ROWS.map(({ intent }) => ({
    configKey: OTP_DLT_TEMPLATE_REGISTRY[intent].dltTemplateIdConfigKey,
    locale: 'en' as const,
    text: OTP_DLT_TEMPLATE_REGISTRY[intent].contentTemplate,
    slots: OTP_DLT_TEMPLATE_REGISTRY[intent].slots,
  })),
];

/**
 * The sheet's cost notes: every Hindi text is Unicode; every English text is GSM. EMPTY since Story 6.37e's rework — 14 (en) held
 * the only non-GSM-7 English character, an em dash, which `2026-10-22-379` Q2 A made a comma. Kept so an English text that needs
 * Unicode again is named here, deliberately.
 */
const UNICODE_ENGLISH = new Set<string>();

describe('the gateway form — every template 1–16 (Story 6.37 AC6)', () => {
  it('covers sixteen distinct sheet rows', () => {
    const numbers = EVERY_TEMPLATE.map((t) => sheetRowByConfigKey(t.configKey).number).sort((a, b) => a - b);
    expect(numbers).toEqual(Array.from({ length: 16 }, (_, i) => i + 1));
  });

  it.each(EVERY_TEMPLATE)('⭐ $configKey — toGatewayTemplate equals the sheet\'s MSG91 column AND the sheet test\'s msg91Form', (t) => {
    const gateway = toGatewayTemplate(t.text, t.slots);
    expect(gateway).toBe(sheetRowByConfigKey(t.configKey).msg91);
    expect(gateway).toBe(msg91Form(t.text, t.slots));
  });

  it.each(EVERY_TEMPLATE)('⭐ $configKey — needsUnicode agrees with the sheet\'s cost notes (T11)', (t) => {
    expect(needsUnicode(t.text)).toBe(t.locale === 'hi' || UNICODE_ENGLISH.has(t.configKey));
  });
});
