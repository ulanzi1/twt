// The claimant's WhatsApp STEP — the Meta template body per chase per locale (Story 6.37d, Task 5; WS9, I6; `2026-10-17-350`
// ruling 2 (1) *"send message over WhatsApp"*; `-357` *"every claim-contact WhatsApp message uses a Meta-approved template"*).
//
// ⭐ THE SAME WORDS (I6): each body is EXACTLY the real `t('correction_sms.reminder')` / `t('certificate_sms.reminder')` output
// (`packages/i18n/locales/{en,hi}/claim.json`) — the reminder that FAILED — with the claim reference and the helpline replaced by
// the two Meta body variables, in that order — pinned by a lockstep test calling the REAL `t()`. ⛔ Header, ⛔ footer, ⛔ buttons
// (so ⛔ quick-reply STOP is offered — the worker reads only a typed STOP). Category UTILITY; each template CREATED with
// `message_send_ttl_seconds` = 43200 (12 h — Meta's maximum for a utility template; a message ⛔ delivered within 12 h is dropped
// and reads as no delivered report — T24; the check is an accepted risk, `-367` decision 4). Every body STARTS and ENDS with
// words and its two variables are ⛔ adjacent (Meta's "leading or trailing parameters" rule is ⛔ hit — F4).
// If Meta files or re-files a template as MARKETING, the operator UNSETS that Pariwar's key (⇒ `skipped:whatsapp_not_configured`)
// — ⛔ re-worded here (a wording change is the Panel's). A later change to an SMS text must re-submit BOTH its SMS registration and
// its Meta template (T8). ⚠ The certificate Hindi is ⛔ yet human-reviewed (roster Row 21) — its WhatsApp twin inherits that.
// ⚠ This file is scanned by the DLT typed-variables gate — it carries ⛔ marker of the SMS registry, ⛔ even in a comment.

/** The ladder's two chases (`claim_contact_ladders.chase`). */
export type ContactLadderChase = 'correction' | 'certificate';

/** The template's locales — the claim's `contact_locale` (T17 — ⛔ the agreement's locale). */
export const CLAIM_CONTACT_WA_LOCALES = ['en', 'hi'] as const;
export type ClaimContactWaLocale = (typeof CLAIM_CONTACT_WA_LOCALES)[number];

/** The i18n key whose output each chase's body equals (the reminder that failed). */
export const CLAIM_CONTACT_WA_COPY_KEY: Readonly<Record<ContactLadderChase, string>> = {
  correction: 'correction_sms.reminder',
  certificate: 'certificate_sms.reminder',
};

/** The values' order — `{{1}}` the claim reference, `{{2}}` the Pariwar's helpline (the SAME values the text sends). */
export const CLAIM_CONTACT_WA_PARAM_ORDER = ['reference', 'helpline'] as const;

/** ⭐ WS9 — the Meta template body per chase per locale (to be registered with Meta exactly as written). */
export const CLAIM_CONTACT_WA_BODY: Readonly<Record<ContactLadderChase, Readonly<Record<ClaimContactWaLocale, string>>>> = {
  correction: {
    en: "Claim {{1}}: the bank details on your family's claim need correcting. Please call the helpline on {{2}}, or the District Admin will contact you. Your claim is still open.",
    hi: 'दावा {{1}}: आपके परिवार के दावे के बैंक विवरण ठीक किए जाने हैं। कृपया हेल्पलाइन {{2}} पर कॉल करें, या ज़िला प्रशासक आपसे संपर्क करेंगे। आपका दावा अब भी खुला है।',
  },
  certificate: {
    en: "Claim {{1}}: your family's claim still needs a death certificate that clearly shows the date of death. Please send it in the app, or call the helpline on {{2}}. Your claim is still open.",
    hi: 'दावा {{1}}: आपके परिवार के दावे के लिए ऐसा मृत्यु प्रमाणपत्र चाहिए जिसमें मृत्यु की तिथि स्पष्ट हो। कृपया ऐप से भेजें या हेल्पलाइन {{2}} पर कॉल करें। आपका दावा अब भी खुला है।',
  },
};

/** T9 — Meta's `language.code` must be the code the template was REGISTERED under (⛔ `en_US`, ⛔ `en_IN`). */
export const CLAIM_CONTACT_WA_LANGUAGE: Readonly<Record<ClaimContactWaLocale, string>> = { en: 'en', hi: 'hi' };
