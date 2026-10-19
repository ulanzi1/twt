// The neighbours' WhatsApp REMINDER — the Meta template body per locale (Story 6.31, Task 5.1; WR6, I6; `2026-10-10-303` Q1 A
// *"with the same words"*, its language by `-310` CF1 A; `2026-10-10-304` Q6 A *"a few"*; `2026-10-17-344` the Hindi).
//
// ⭐ THE SAME WORDS (I6, T7): each body is EXACTLY the real `t('peer_mesh_sms.request')` output (`packages/i18n/locales/{en,hi}/
// claim.json`) with the member, the link and the helpline replaced by the three Meta body variables, in that order — pinned by a
// lockstep test calling the REAL `t()`. ⛔ Header, ⛔ footer, ⛔ buttons, ⛔ a "TWT:" prefix (WhatsApp shows the Pariwar's business
// name — PM3's reading). Category UTILITY. If Meta files it as MARKETING or refuses a locale's body, that locale is "Meta refuses"
// (`-303`): ⛔ reminder in it, the text still goes — ⛔ re-worded here (a wording change is the Panel's; roster Row 35 (b)).
// ⚠ S1: Meta lists *"Variables cannot be at the start or end of the template"* (2388299, read 2026-10-19). The English body ends
// with the third variable and a full stop — only Meta answers whether that counts as trailing; the Hindi ends with words.
// ⚠ T6: this file is scanned by the DLT typed-variables gate — it carries ⛔ marker of the SMS registry, ⛔ even in a comment.

/** The locales the ruled words exist in. */
export const PEER_MESH_WA_REMINDER_LOCALES = ['en', 'hi'] as const;
export type PeerMeshWaReminderLocale = (typeof PEER_MESH_WA_REMINDER_LOCALES)[number];

/** The i18n key whose output the bodies equal (the neighbours' text's words — the ruled "same words"). */
export const PEER_MESH_WA_REMINDER_COPY_KEY = 'peer_mesh_sms.request';

/** The values' order — `{{1}}` the member's FULL name (WR13), `{{2}}` the link, `{{3}}` the Pariwar's helpline. */
export const PEER_MESH_WA_REMINDER_PARAM_ORDER = ['member', 'link', 'helpline'] as const;

/** ⭐ WR6 — the Meta template body per locale (to be registered with Meta exactly as written). */
export const PEER_MESH_WA_REMINDER_BODY: Readonly<Record<PeerMeshWaReminderLocale, string>> = {
  en: 'We have been told that {{1}} has died. If you knew them, please answer a few short questions: {{2}} — or call the helpline {{3}}.',
  hi: 'हमें बताया गया है कि {{1}} का निधन हो गया है। यदि आप उन्हें जानते थे, तो कृपया कुछ छोटे प्रश्नों के उत्तर दें: {{2}} — या हेल्पलाइन {{3}} पर कॉल करें।',
};

/**
 * ⭐ WR6 — Meta's `language.code` must be the code the template was REGISTERED under: a fixed map (⛔ `en_US`, ⛔ `en_IN` — separate
 * codes at Meta). Roster Row 35 (b) requires the templates be registered under EXACTLY these.
 */
export const PEER_MESH_WA_REMINDER_LANGUAGE: Readonly<Record<PeerMeshWaReminderLocale, string>> = { en: 'en', hi: 'hi' };
