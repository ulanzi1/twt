// The registration sheet's OTP rows — Story 6.34 (AC7; TV3 / TV8 / TV13). The claim texts' rows are proved by their own
// lockstep tests (`claim-correction-sms-templates.test.ts`, `suspicion-notice-sms-templates.test.ts`); this file proves
// templates 15 / 16 — the login and step-up OTP, whose registry lives in `@twt/channels` (⛔ `@twt/i18n` there, so ⛔
// lockstep test of its own reads the sheet): each row, found by its config key, lists the ONE numeric slot, its MSG91
// form, and the sheet carries the registered text byte for byte.

import { OTP_DLT_TEMPLATE_REGISTRY, type OtpIntent } from '@twt/channels';
import { describe, expect, it } from 'vitest';

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
