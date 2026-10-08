// The SUSPICION NOTICE SMS TEMPLATE REGISTRY — Story 6.24b (Task 3.2; AC7b; `2026-10-07-292` RF11 / RF12, `2026-10-07-293`
// item 1 B, `2026-10-08-295` RB1, RB4, RB6, RB16). A SIBLING of 6.19's `claim-correction-sms-templates.ts` — ⛔ never a
// fourth message there (6.19's registry hard-codes `{ reference, helpline }` and its lockstep pins every entry name-free).
//
// The three once-ever texts of a `-239` suspicion refusal, each × `hi` / `en` (six DLT templates — 7–12 of
// `docs/launch-gate-inventory/dlt-template-requests-6-19.md`):
//   · `refusal_notice` — `-262` FQ7 B: to the nominee in place at the death;
//   · `closed_notice`  — `-291` Q2 B: to the true nominee when an allowed appeal closes her claim;
//   · `appeal_notice`  — `-293` item 1 B: to the refused person, with the last date to appeal.
// The en words are the Panel's, verbatim, plus `{helpline}` — the per-Pariwar number 6.19's texts carry
// (`sms.claim_correction.helpline_number.<pariwarId>`), which supplies the number the Panel told the family to call.
//
// ⭐ THE D33 CARVE-OUT (recorded in `2026-10-08-295`): these texts NAME THE MEMBER (`{member}`) because the Panel's ratified
// texts do (FQ7 / Q2 / item 1 — *"A claim for [member] …"*). 6.19's D33 *"⛔ No name"* is ⛔ NOT weakened — it binds 6.19's
// registry, which stays name-free. `{member}` is MODE-RESOLVED (`-181`, `resolveMemberFacingDeceasedName`), ⛔ never
// hard-coded; an erased / unresolvable name ⇒ `no_target`, ⛔ never a blank (RB5).
// ⭐ THE S4 / T6 CARVE-OUT (RB16, recorded in `2026-10-08-295`): ⛔ no deadline threat in any of the three — EXCEPT
// `appeal_notice`'s `{date}` slot, the Panel's ratified *"until [date]"*. The date is the LAST day to appeal (6.24a
// RF14), rendered `DD-MM-YYYY` with Latin digits in BOTH locales (RB6 — the amendment-A2 form), ⛔ never Devanagari digits.
// ⚠ A missing template id or helpline number fails CLOSED in the shared core (`claim-dlt-sms-send.ts`) — ⛔ never a
// placeholder, ⛔ never a fixture `accepted`. The sweep checks the config FIRST so a gap never uses up a once-ever slot (RB12).

import type { cycleCalendar } from '@twt/domain';
import { t, type Locale } from '@twt/i18n';

/** The three messages (RB1). ⚠ ⛔ `SuspicionRefusalNotice` — that identifier is 6.24a's console component. */
export type SuspicionNoticeSmsMessage = 'refusal_notice' | 'closed_notice' | 'appeal_notice';
export type SuspicionNoticeSmsLocale = Extract<Locale, 'hi' | 'en'>;

export const SUSPICION_NOTICE_SMS_MESSAGES = ['refusal_notice', 'closed_notice', 'appeal_notice'] as const satisfies readonly SuspicionNoticeSmsMessage[];

export interface SuspicionNoticeSmsTemplate {
  /** The `claim.json` key (namespace `claim`). */
  readonly copyKey: string;
  /** The config / Secret-Manager NAME of the TRAI-assigned DLT template id (resolved at send time). */
  readonly dltTemplateIdConfigKey: string;
  /** The content registered with TRAI, each variable written `{#var#}`, in the order of the Panel's words. */
  readonly registeredText: string;
}

/** The variables of each message — `appeal_notice` alone carries the date. */
export interface SuspicionNoticeSmsVars {
  readonly member: string;
  readonly helpline: string;
  readonly date?: string;
}

/** The DLT variable token — the form the registered text carries in each slot. */
export const DLT_VAR = '{#var#}';

/** The Secret Manager name of a message's DLT template id (RB4). */
export function suspicionNoticeDltConfigKey(message: SuspicionNoticeSmsMessage, locale: SuspicionNoticeSmsLocale): string {
  return `sms.dlt.template_id.suspicion_notice.${message}.${locale}`;
}

const entry = (message: SuspicionNoticeSmsMessage, locale: SuspicionNoticeSmsLocale, registeredText: string): SuspicionNoticeSmsTemplate => ({
  copyKey: `suspicion_sms.${message}`,
  dltTemplateIdConfigKey: suspicionNoticeDltConfigKey(message, locale),
  registeredText,
});

// ⚠ The Hindi is agent-authored, ⛔ not yet human-reviewed (go-live gate Row 23).
export const SUSPICION_NOTICE_SMS_TEMPLATES: Readonly<
  Record<SuspicionNoticeSmsMessage, Readonly<Record<SuspicionNoticeSmsLocale, SuspicionNoticeSmsTemplate>>>
> = {
  refusal_notice: {
    hi: entry('refusal_notice', 'hi', '{#var#} के लिए किया गया एक दावा आगे नहीं बढ़ सका। कृपया हेल्पलाइन {#var#} पर कॉल करें।'),
    en: entry('refusal_notice', 'en', 'A claim for {#var#} could not go ahead. Please call the helpline {#var#}.'),
  },
  closed_notice: {
    hi: entry('closed_notice', 'hi', '{#var#} के लिए आपका दावा बंद कर दिया गया है। कृपया हेल्पलाइन {#var#} पर कॉल करें।'),
    en: entry('closed_notice', 'en', 'Your claim for {#var#} has been closed. Please call the helpline {#var#}.'),
  },
  appeal_notice: {
    hi: entry(
      'appeal_notice',
      'hi',
      '{#var#} के लिए किया गया दावा आगे नहीं बढ़ सका। इसके विरुद्ध {#var#} तक अपील की जा सकती है। कृपया हेल्पलाइन {#var#} पर कॉल करें।',
    ),
    en: entry(
      'appeal_notice',
      'en',
      'The claim for {#var#} could not go ahead. It can be appealed until {#var#}. Please call the helpline {#var#}.',
    ),
  },
};

/** Render a suspicion notice body through the REAL `t()` — the text the gateway byte-matches. A missing param THROWS. */
export function renderSuspicionNoticeSms(
  message: SuspicionNoticeSmsMessage,
  locale: SuspicionNoticeSmsLocale,
  vars: SuspicionNoticeSmsVars,
): string {
  const template = SUSPICION_NOTICE_SMS_TEMPLATES[message][locale];
  const params: Record<string, string> = { member: vars.member, helpline: vars.helpline };
  if (message === 'appeal_notice') {
    if (vars.date === undefined) throw new Error('[suspicion-notice-sms] appeal_notice needs a date');
    params.date = vars.date;
  }
  return t(template.copyKey, params, { locale, namespace: 'claim' });
}

const CALENDAR_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

/**
 * RB6 — the last day to appeal (`YYYY-MM-DD`, IST — 6.24a's `suspicionRefusalAppealUntil`) as `DD-MM-YYYY`, Latin
 * digits, in BOTH locales (the amendment-A2 form). A PURE reorder of the string's parts — ⛔ never a `Date` round-trip
 * (a UTC shift could move the day), ⛔ never `operationalDate` (UTC-based and private).
 */
export function formatAppealUntil(d: cycleCalendar.CalendarDateString): string {
  const m = CALENDAR_DATE.exec(d);
  if (!m) throw new Error(`[suspicion-notice-sms] not a calendar date: '${d}'`);
  return `${m[3]}-${m[2]}-${m[1]}`;
}
