// The CONTRIBUTION NOTICE SMS TEMPLATE REGISTRY — Story 5.11 (Task 1; AC1, AC2; Decision `2026-10-23-389` FS1 (d), FS4 (a),
// FS13 (a), FS16 (b)). A SIBLING of `peer-mesh-sms-templates.ts` / `suspicion-notice-sms-templates.ts` — message × locale,
// typed slots, one config key per (message, locale).
//
// The THREE per-member notices about a member's OWN contribution that a text may carry when the app (and WhatsApp, where used)
// could not reach them (`2026-10-23-390` Q1 B): day 10 "not recorded yet", a payment not matched (ONE text for every mismatch
// reason), a payment still not confirmed (the pending-match ESCALATED tier). × `hi` / `en` = six DLT templates.
// ⛔ A pool opening and the cycle's last day — general notices, for the Trust's announcement channels (`-390` Q2 A); their words
// are kept as drafts in the story, ⛔ here. ⛔ Any broadcast (news, survey, moderation, the staff push) — I5.
//
// ⭐ The words are BigDev's (en + hi reviewed and corrected in session, 2026-10-23 — story Debug Log (a)); "TWT:" is the only name
// (FS16 (b) — the DLT header carries the sender; [[project_legal_name_pending]]). ⛔ No text carries a member's name, so ⛔ name
// box (`sms-member-boxes.ts`) is used here.
//
// ⭐ The REGISTERED text is the `contribution.json` `sms.<message>` string with each `{param}` as `{#var#}` (I1) — proven through the
// REAL `t()` by `apps/jobs/tests/contribution-sms-templates.test.ts`. The template ids stay UNSET until each template is approved
// (roster Row 40 (a)). ⭐ Story 5.11b sends them (`alert-sms-send.ts`): until an id is set, a lit, eligible rung ends
// `config:dlt_template_id_missing:<locale>` (`sms_send_not_wired` only where no seam is wired — tests).

import { needsUnicode, type DltSlot } from '@twt/channels';
import { AlertSmsMessage } from '@twt/contracts';
import { t, type Locale } from '@twt/i18n';

export type ContributionSmsLocale = Extract<Locale, 'hi' | 'en'>;

export const CONTRIBUTION_SMS_LOCALES = ['hi', 'en'] as const satisfies readonly ContributionSmsLocale[];

/** The three lit messages — the contract's enum, so the payload's `sms.message` and this registry share ONE list. */
export const CONTRIBUTION_SMS_MESSAGES: readonly AlertSmsMessage[] = AlertSmsMessage.options;

export interface ContributionSmsTemplate {
  /** The `contribution.json` key (namespace `contribution`). */
  readonly copyKey: string;
  /** The config / Secret-Manager NAME of the TRAI-assigned DLT template id (resolved at send time — row 5-11b). */
  readonly dltTemplateIdConfigKey: string;
  /** The content registered with TRAI, each variable written `{#var#}`, in text order. */
  readonly registeredText: string;
  /** The declared variables, in text order (Story 6.34 TV4) — named as the i18n params (TV13). */
  readonly slots: readonly DltSlot[];
}

/** The `{pool}` slot — the curated pool name or the letter code (FS13). 30, the sheet's per-variable ceiling (Row 30 (d)). */
export const POOL_SLOT: DltSlot = { name: 'pool', type: 'alphanumeric', maxLength: 30, label: 'pool name or letter code' };

/** The `{date}` slot — the cycle's close date, `DD-MM-YYYY` (the push's `operationalDate`). */
export const DATE_SLOT: DltSlot = { name: 'date', type: 'alphanumeric', maxLength: 10, label: 'cycle close date, DD-MM-YYYY' };

const SLOTS: Readonly<Record<AlertSmsMessage, readonly DltSlot[]>> = {
  deadline_not_recorded: [POOL_SLOT, DATE_SLOT],
  payment_not_matched: [],
  payment_not_confirmed: [POOL_SLOT],
};

/** The Secret Manager name of a notice's DLT template id (F24's family form). */
export function contributionSmsDltConfigKey(message: AlertSmsMessage, locale: ContributionSmsLocale): string {
  return `sms.dlt.template_id.contribution.${message}.${locale}`;
}

const entry = (message: AlertSmsMessage, locale: ContributionSmsLocale, registeredText: string): ContributionSmsTemplate => ({
  copyKey: `sms.${message}`,
  dltTemplateIdConfigKey: contributionSmsDltConfigKey(message, locale),
  registeredText,
  slots: SLOTS[message],
});

// ⭐ `payment_not_matched` has NO variable: Story 5.11b (MG12 superseded in part, `-404`) tells "no values supplied" (an absent
// `values` — still refused) from "a template with no slots" (`values: []` — sent).
export const CONTRIBUTION_SMS_TEMPLATES: Readonly<
  Record<AlertSmsMessage, Readonly<Record<ContributionSmsLocale, ContributionSmsTemplate>>>
> = {
  deadline_not_recorded: {
    hi: entry(
      'deadline_not_recorded',
      'hi',
      'TWT: पूल {#var#} में आपका योगदान अभी दर्ज नहीं हुआ है। यह चक्र {#var#} को बंद होगा। कृपया योगदान करें।',
    ),
    en: entry(
      'deadline_not_recorded',
      'en',
      'TWT: your contribution to pool {#var#} is not recorded yet. This cycle closes on {#var#}. Please contribute.',
    ),
  },
  payment_not_matched: {
    hi: entry(
      'payment_not_matched',
      'hi',
      'TWT: आपके भुगतान का मिलान अभी नहीं हो पाया है। इसे ठीक करने में हम आपकी मदद करेंगे। कृपया ऐप देखें।',
    ),
    en: entry(
      'payment_not_matched',
      'en',
      'TWT: we could not match your payment yet. We will help you sort it out. Please see the app.',
    ),
  },
  payment_not_confirmed: {
    hi: entry(
      'payment_not_confirmed',
      'hi',
      'TWT: पूल {#var#} के लिए आपके भुगतान की पुष्टि अब तक नहीं हो पाई है। कृपया ऐप में जाँचें या फिर से प्रयास करें।',
    ),
    en: entry(
      'payment_not_confirmed',
      'en',
      'TWT: we still have not been able to confirm your payment for pool {#var#}. Please check or retry in the app.',
    ),
  },
};

/** GSM-7 characters an en pool value may NOT use beyond the control characters: the extension table (two septets each). */
const GSM7_EXTENSION = new Set('^{}\\[~]|€');

/** A control character (Unicode Cc — newline, tab, ESC, …) in ANY locale. */
const CONTROL_CHARACTER = /\p{Cc}/u;

/**
 * ⭐ Story 5.11b (FS21 (a), `-404` — `-394` item 2 superseded in part) — the INVISIBLE characters a curated name may ⛔ carry into a
 * text, in ANY locale: a line / paragraph separator (Zl / Zp), a LONE surrogate (Cs — tested with `/\p{Cs}/u`; ⛔
 * `isWellFormed()`, ES2024, outside `lib: ["ES2022"]`), and any FORMAT character (Cf — a bidi control, ZWSP, a word joiner, a BOM)
 * EXCEPT ZWNJ U+200C / ZWJ U+200D, which Devanagari shaping needs. Any of them could break DLT matching (Row 30 (d) is
 * unanswered for such characters) ⇒ the letter code instead.
 */
const SEPARATOR_OR_LONE_SURROGATE = /[\p{Zl}\p{Zp}\p{Cs}]/u;
const FORMAT_CHARACTER_BUT_JOINERS = /(?![\u200C\u200D])\p{Cf}/u;

/**
 * FS13 as superseded by Decision `2026-10-23-394` item 2 (review round 2, D2 (b)) — the `{pool}` value of a text: the curated
 * pool name, TRIMMED, when it is non-empty, fits the slot (30 UTF-16 units — the unit `dlt-variables.ts` counts) AND, for an
 * `en` text, is basic GSM-7 only (⛔ extension table); ⛔ a control character in ANY locale (round-2 patch review, Q3) — and
 * (Story 5.11b, FS21) ⛔ any other invisible character but the Devanagari joiners;
 * otherwise the LETTER CODE. So the text is never longer than the cost as put: 1 en / 2 hi parts. The curated name is always the HINDI name
 * (`resolveCuratedPoolName`), so in practice an en text names the pool by its letter and a hi text by its name — a Devanagari
 * value in an en text would turn the whole SMS Unicode (T5). The push keeps its own label (`poolLabel`).
 */
export function smsPoolLabel(
  identity: { readonly poolName: string | null; readonly poolLetterCode: string },
  locale: ContributionSmsLocale,
): string {
  const name = identity.poolName?.trim() ?? '';
  const fitsLocale = locale !== 'en' || (!needsUnicode(name) && ![...name].some((ch) => GSM7_EXTENSION.has(ch)));
  const invisible = CONTROL_CHARACTER.test(name) || SEPARATOR_OR_LONE_SURROGATE.test(name) || FORMAT_CHARACTER_BUT_JOINERS.test(name);
  if (name !== '' && name.length <= POOL_SLOT.maxLength && !invisible && fitsLocale) return name;
  return identity.poolLetterCode;
}

/** Render a notice's body through the REAL `t()` — the text the gateway byte-matches (row 5-11b sends it). A missing param THROWS. */
export function renderContributionSms(
  message: AlertSmsMessage,
  locale: ContributionSmsLocale,
  values: Readonly<Record<string, string>>,
): string {
  return t(CONTRIBUTION_SMS_TEMPLATES[message][locale].copyKey, values, { locale, namespace: 'contribution' });
}
