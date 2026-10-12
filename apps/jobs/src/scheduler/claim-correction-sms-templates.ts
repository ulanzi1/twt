// The claim-correction SMS TEMPLATE REGISTRY — Story 6.19b (Task 4; AC3; the shared spec's D7, ⭐ D32, D33 as scoped by
// `2026-09-29-269` §5; T6, T13).
//
// ⭐ WHY IT LIVES HERE (apps/jobs), ⛔ NOT in `@twt/channels`: the copy comes from `claim.json` through the REAL `t()`,
// and `@twt/channels` has ⛔ no `@twt/i18n` dependency. ⛔ It is ⛔ NOT an entry in `SMS_DLT_TEMPLATE_REGISTRY` and ⛔ NOT
// an `AlertCategory` (AC10): the family message is a DIRECT DLT SMS to an explicit number (the OTP precedent), so
// registering it as an alert category would make every news / survey / moderation fallback a paid bulk SMS (T6).
// ⭐ D32 — 6.19b builds BOTH family messages (`reminder` and `closure_notice`) × `hi` / `en`: four config keys. 6.19c
// only CALLS the send for the closure notice. ⭐ Story 6.19d adds a THIRD — `certificate_reminder` (`2026-10-03-276`
// CR7): the replacement-certificate reminder, ONE wording for both causes (it names ⛔ no reason), its own two config
// keys; the send function is 6.19b's, reused unchanged.
// ⭐ THE REGISTERED TEXT. A DLT-transactional gateway rejects any content that does not byte-match a registered content
// template, so each entry carries the text submitted to TRAI with `{#var#}` in its two slots — the lockstep test
// (`tests/claim-correction-sms-templates.test.ts`) proves the real `t()` renders EXACTLY it, and that
// `docs/launch-gate-inventory/dlt-template-requests-6-19.md` carries the same text.
// ⭐ D33 — the two variables: the claim's SHORT REFERENCE (`claimShortReference`, the string the queue shows) and the
// Pariwar's HELPLINE NUMBER (config key `sms.claim_correction.helpline_number.<pariwarId>`, lower-case id). ⛔ No name,
// ⛔ no bank detail, ⛔ no reason (T6); ⛔ no deadline threat (S4).
// ⚠ A missing template id or helpline number fails CLOSED (the row is `error`, an alarm fires) — ⛔ never a
// placeholder number, ⛔ never a fixture that reports `accepted` (T13).
// ⭐ Story 6.34 (TV2 / TV4 / TV13; `-313`, `-314`): each entry DECLARES its two variables' TRAI types in `slots`, in text
// order — the reference alphanumeric (exactly 8 upper-case hex, ≤ 8), the helpline cbn (≤ 14). On STPL's SmartPing
// portal the text keeps the untyped marker and the type is selected beside it ⇒ ⛔ a character of any text changed.
// The marker is the ONE vocabulary's (`@twt/channels` `dlt-variables.ts`), re-exported here for the lockstep test; each
// slot's `name` is the `t()` param it fills (the MSG91 `##name##` variable — TV13). The registry test runs the shape
// check over every entry; the CI gate `scripts/dlt-typed-variables` lists this file in its `REGISTRY_FILES`.

import { DLT_VAR, type DltSlot } from '@twt/channels';
import { t, type Locale } from '@twt/i18n';

export type ClaimCorrectionSmsMessage = 'reminder' | 'closure_notice' | 'certificate_reminder';
export type ClaimCorrectionSmsLocale = Extract<Locale, 'hi' | 'en'>;

export interface ClaimCorrectionSmsTemplate {
  /** The `claim.json` key (namespace `claim`). */
  readonly copyKey: string;
  /** The config / Secret-Manager NAME of the TRAI-assigned DLT template id (resolved at send time). */
  readonly dltTemplateIdConfigKey: string;
  /** The content registered with TRAI, the two variables written `{#var#}` (reference first, helpline second). */
  readonly registeredText: string;
  /** The declared variables, in text order (Story 6.34 TV4) — the type BigDev selects for each `{#var#}`. */
  readonly slots: readonly DltSlot[];
}

/** The DLT variable token — the form the registered text carries in each slot (the ONE vocabulary's, re-exported). */
export { DLT_VAR };

/** TV4 — every claim-correction text: the claim reference, then the Pariwar's helpline. */
const REFERENCE_HELPLINE_SLOTS: readonly DltSlot[] = [
  { name: 'reference', type: 'alphanumeric', maxLength: 8, label: 'claim reference' },
  { name: 'helpline', type: 'cbn', maxLength: 14, label: 'helpline number' },
];

export const CLAIM_CORRECTION_SMS_TEMPLATES: Readonly<
  Record<ClaimCorrectionSmsMessage, Readonly<Record<ClaimCorrectionSmsLocale, ClaimCorrectionSmsTemplate>>>
> = {
  reminder: {
    hi: {
      copyKey: 'correction_sms.reminder',
      dltTemplateIdConfigKey: 'sms.dlt.template_id.claim_correction.reminder.hi',
      registeredText:
        'दावा {#var#}: आपके परिवार के दावे के बैंक विवरण ठीक किए जाने हैं। कृपया हेल्पलाइन {#var#} पर कॉल करें, या ज़िला प्रशासक आपसे संपर्क करेंगे। आपका दावा अब भी खुला है।',
      slots: REFERENCE_HELPLINE_SLOTS,
    },
    en: {
      copyKey: 'correction_sms.reminder',
      dltTemplateIdConfigKey: 'sms.dlt.template_id.claim_correction.reminder.en',
      registeredText:
        "Claim {#var#}: the bank details on your family's claim need correcting. Please call the helpline on {#var#}, or the District Admin will contact you. Your claim is still open.",
      slots: REFERENCE_HELPLINE_SLOTS,
    },
  },
  closure_notice: {
    hi: {
      copyKey: 'correction_sms.closure_notice',
      dltTemplateIdConfigKey: 'sms.dlt.template_id.claim_correction.closure_notice.hi',
      registeredText:
        'दावा {#var#}: बैंक विवरण में सुधार प्राप्त न होने के कारण यह दावा बंद कर दिया गया है। इस बंद किए जाने के विरुद्ध अपील नहीं की जा सकती। नया दावा हेल्पलाइन {#var#} या ज़िला प्रशासक के माध्यम से दर्ज किया जा सकता है।',
      slots: REFERENCE_HELPLINE_SLOTS,
    },
    en: {
      copyKey: 'correction_sms.closure_notice',
      dltTemplateIdConfigKey: 'sms.dlt.template_id.claim_correction.closure_notice.en',
      registeredText:
        'Claim {#var#}: this claim was closed because no correction of the bank details was received. This closure cannot be appealed. A new claim may be filed through the helpline on {#var#} or the District Admin.',
      slots: REFERENCE_HELPLINE_SLOTS,
    },
  },
  // Story 6.19d (CR7) — ⚠ the Hindi is agent-authored, ⛔ not yet human-reviewed (go-live gate Row 21).
  certificate_reminder: {
    hi: {
      copyKey: 'certificate_sms.reminder',
      dltTemplateIdConfigKey: 'sms.dlt.template_id.claim_correction.certificate_reminder.hi',
      registeredText:
        'दावा {#var#}: आपके परिवार के दावे के लिए ऐसा मृत्यु प्रमाणपत्र चाहिए जिसमें मृत्यु की तिथि स्पष्ट हो। कृपया ऐप से भेजें या हेल्पलाइन {#var#} पर कॉल करें। आपका दावा अब भी खुला है।',
      slots: REFERENCE_HELPLINE_SLOTS,
    },
    en: {
      copyKey: 'certificate_sms.reminder',
      dltTemplateIdConfigKey: 'sms.dlt.template_id.claim_correction.certificate_reminder.en',
      registeredText:
        "Claim {#var#}: your family's claim still needs a death certificate that clearly shows the date of death. Please send it in the app, or call the helpline on {#var#}. Your claim is still open.",
      slots: REFERENCE_HELPLINE_SLOTS,
    },
  },
};

/** `-269` §5 — the helpline number's config key, ONE PER PARIWAR (lower-case id). ⛔ Never a global default. */
export function claimCorrectionHelplineConfigKey(pariwarId: string): string {
  return `sms.claim_correction.helpline_number.${pariwarId.toLowerCase()}`;
}

/** Render a claim-correction SMS body through the REAL `t()` — the text the gateway byte-matches. */
export function renderClaimCorrectionSms(
  message: ClaimCorrectionSmsMessage,
  locale: ClaimCorrectionSmsLocale,
  vars: { readonly reference: string; readonly helpline: string },
): string {
  const template = CLAIM_CORRECTION_SMS_TEMPLATES[message][locale];
  return t(template.copyKey, { reference: vars.reference, helpline: vars.helpline }, { locale, namespace: 'claim' });
}
