// The field-worker code SMS copy ↔ the registered DLT text — the LOCKSTEP (Story 13.1b, Task 4.4; AC11; AD9). The contribution test's shape:
// in both locales the REAL `t()` (⛔ a stub) renders EXACTLY the registered text with the variable as the marker; the slot is named as the
// i18n param; the registration sheet carries the same text, key, type and MSG91 form, its rows found BY CONFIG KEY; and the shape check passes.

import { DLT_VAR, checkDltTemplateShape, needsUnicode } from '@twt/channels';
import { describe, expect, it } from 'vitest';

import {
  CODE_SLOT,
  FIELD_WORKER_CODE_SMS_TEMPLATE_LOCALES,
  FIELD_WORKER_CODE_SMS_TEMPLATES,
  fieldWorkerCodeSmsDltConfigKey,
  renderFieldWorkerCodeSms,
} from '../src/scheduler/field-worker-code-sms-templates.js';

import { FIELD_WORKER_CATALOG, SHEET, expectRegisteredTextRow, i18nParamNames, msg91Form, sheetRowByConfigKey } from './_dlt-template-sheet.js';

const ORDINAL = { hi: 25, en: 26 } as const;

describe.each(FIELD_WORKER_CODE_SMS_TEMPLATE_LOCALES)('template %s', (locale) => {
  const template = FIELD_WORKER_CODE_SMS_TEMPLATES[locale];

  it('passes the shape check; one numeric slot of six; the family config key', () => {
    expect(checkDltTemplateShape(template.registeredText, template.slots)).toEqual([]);
    expect(template.slots).toEqual([{ name: 'code', type: 'numeric', maxLength: 6, label: 'attribution code' }]);
    expect(template.slots[0]).toBe(CODE_SLOT);
    expect(template.dltTemplateIdConfigKey).toBe(`sms.dlt.template_id.field_worker.code.${locale}`);
    expect(template.dltTemplateIdConfigKey).toBe(fieldWorkerCodeSmsDltConfigKey(locale));
    expect(template.copyKey).toBe('sms.code');
  });

  it('⭐ the REAL t() renders EXACTLY the registered text, the variable as the marker', () => {
    expect(renderFieldWorkerCodeSms(locale, DLT_VAR)).toBe(template.registeredText);
  });

  it('⭐ the slot name IS the i18n param; the catalogue registers as the registry’s text', () => {
    const value = FIELD_WORKER_CATALOG[locale][template.copyKey];
    expect(value).toBeTypeOf('string');
    expect(i18nParamNames(value as string)).toEqual(['code']);
    expect((value as string).replace('{code}', DLT_VAR)).toBe(template.registeredText);
  });

  it('⭐ the sheet carries the same row, found by config key: ordinal, type, MSG91 form; and the registered-text row', () => {
    const row = sheetRowByConfigKey(template.dltTemplateIdConfigKey);
    expect(row.number).toBe(ORDINAL[locale]);
    expect(row.types).toEqual(['numeric']);
    expect(row.msg91).toBe(msg91Form(template.registeredText, template.slots));
    expectRegisteredTextRow(ORDINAL[locale], template.registeredText);
  });

  it('a leading zero survives the render, as text', () => {
    const body = renderFieldWorkerCodeSms(locale, '012346');
    expect(body).toContain('012346');
    expect(body).not.toMatch(/\{\w+\}|\{#var#\}/);
  });

  it('AD9 — ⛔ a link, ⛔ a pay or employment word; "TWT:" is the only name', () => {
    expect(template.registeredText.startsWith('TWT: ')).toBe(true);
    expect(template.registeredText).not.toMatch(/https?:|www\.|salary|pay|commission|employ|वेतन|कमीशन|नौकरी/i);
  });
});

describe('the two languages (Q-1, AC11)', () => {
  it('Hindi is Unicode, English is Normal: the sheet’s MSG91 note', () => {
    expect(needsUnicode(renderFieldWorkerCodeSms('hi', '012346'))).toBe(true);
    expect(needsUnicode(renderFieldWorkerCodeSms('en', '012346'))).toBe(false);
    expect(SHEET).toContain('**25 Unicode, 26 Normal**');
  });

  it('the sheet’s wording section holds the template back until Row 49 says so, and writes its cost, rejection and Record lines', () => {
    expect(SHEET).toContain('## The wording of templates 25–26');
    expect(SHEET).toContain('Do not provision the ids of 25–26 until roster Row 49 (`field-worker-code-sms-live`) says so');
    expect(SHEET).toMatch(/^\| 25–26, English and Hindi \|/m);
    expect(SHEET).toMatch(/^\| 2026-11-06 \| 25–26 \|/m);
  });

  it('a slot value is required: the real t() THROWS, never a blank in a sent text', () => {
    expect(() => renderFieldWorkerCodeSms('en', undefined as unknown as string)).toThrow();
  });
});
