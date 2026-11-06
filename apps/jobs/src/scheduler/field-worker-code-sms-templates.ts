// The FIELD WORKER CODE SMS TEMPLATE REGISTRY — Story 13.1b (Task 4; AC11; decision `2026-11-06-450` AD9, AD10, Q-1, Q-2). A SIBLING of
// `contribution-sms-templates.ts`: message × locale would be one message here, so it is keyed by locale alone, with typed slots and one
// config key per locale. Sheet templates 25 (hi) and 26 (en).
//
// ONE text, once per registration, to the number on a newly approved worker's application: their code. One variable. ⛔ A name (a mistyped
// number must not reveal one), ⛔ a link, ⛔ a helpline, ⛔ a word implying employment, pay or commission (AD9). "TWT:" is the only name, as
// templates 17-24. The language is the Pariwar's default (Q-1), and a language whose id is unset is ⛔ texted in the other.
//
// ⭐ The REGISTERED text is the `field_worker.json` `sms.code` string with `{code}` as the variable marker: proven through the REAL `t()` by
// `apps/jobs/tests/field-worker-code-sms-templates.test.ts`, which also holds the sheet to it. The template ids stay UNSET until each
// template is approved (roster Row 49 (a)); until then every due row ends `config:dlt_template_id_missing`, and the officer reads the code
// out (AD13). ⚠ The value is typed numeric: whether a provider keeps a leading zero is Row 49 (e) (one code in ten has one, G9).

import type { DltSlot } from '@twt/channels';
import { t, type Locale } from '@twt/i18n';

export type FieldWorkerCodeSmsTemplateLocale = Extract<Locale, 'hi' | 'en'>;

export const FIELD_WORKER_CODE_SMS_TEMPLATE_LOCALES = ['hi', 'en'] as const satisfies readonly FieldWorkerCodeSmsTemplateLocale[];

/** The `field_worker.json` key (namespace `field_worker`). */
const COPY_KEY = 'sms.code';
const NAMESPACE = 'field_worker';

export interface FieldWorkerCodeSmsTemplate {
  /** The `field_worker.json` key. */
  readonly copyKey: string;
  /** The config / Secret-Manager NAME of the MSG91 template id (resolved at send time). */
  readonly dltTemplateIdConfigKey: string;
  /** The content registered with TRAI, the variable written as the marker. */
  readonly registeredText: string;
  /** The declared variables, in text order — named as the i18n params. */
  readonly slots: readonly DltSlot[];
}

/**
 * The `{code}` slot — six digits, declared numeric at registration (AD9; sheet rows 25 and 26) and sent as a string of digits, so our request
 * keeps a leading zero. Whether MSG91 and the carrier keep it is not proved by anything in this repo: roster Row 49 (e), G9.
 */
export const CODE_SLOT: DltSlot = { name: 'code', type: 'numeric', maxLength: 6, label: 'attribution code' };

/** The Secret Manager name of the text's template id. */
export function fieldWorkerCodeSmsDltConfigKey(locale: FieldWorkerCodeSmsTemplateLocale): string {
  return `sms.dlt.template_id.field_worker.code.${locale}`;
}

const entry = (locale: FieldWorkerCodeSmsTemplateLocale, registeredText: string): FieldWorkerCodeSmsTemplate => ({
  copyKey: COPY_KEY,
  dltTemplateIdConfigKey: fieldWorkerCodeSmsDltConfigKey(locale),
  registeredText,
  slots: [CODE_SLOT],
});

export const FIELD_WORKER_CODE_SMS_TEMPLATES: Readonly<Record<FieldWorkerCodeSmsTemplateLocale, FieldWorkerCodeSmsTemplate>> = {
  hi: entry('hi', 'TWT: फील्ड वर्कर के रूप में आपको स्वीकृति मिल गई है। आपका कोड {#var#} है। जिन शिक्षकों को आप जोड़ें, उन्हें यह कोड दें।'),
  en: entry('en', 'TWT: you are approved as a field worker. Your code is {#var#}. Give this code to the teachers you introduce.'),
};

/** The text as sent, through the REAL `t()`. A missing key throws: a crash, ⛔ a final (TR4). */
export function renderFieldWorkerCodeSms(locale: FieldWorkerCodeSmsTemplateLocale, code: string): string {
  return t(COPY_KEY, { code }, { locale, namespace: NAMESPACE });
}
