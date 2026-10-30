// THE ONE WORD FUNCTION for a questionnaire's questions and options — Story 6.33 (`2026-10-30-421` QE4; I6). Every reader of
// a questionnaire's words goes through it: the neighbours' / the helpline's / the inspector's wire (`toWireQuestionnaire`),
// the staff view's English (`peer-answers-assembler.ts`), and the completion's discrepancy words
// (`claims.ground-inspection.handlers.ts`) — ⛔ a second resolver (6.32 IQ9).
//
// · A question or option carries EXACTLY ONE of a copy key (the Panel's ruled words — `t()`, `claim` namespace) or STORED
//   text (a chain question — staff-written en + hi; ⛔ through `t()`: its catalog is a static import, TR4).
// · `{member}` in stored text is substituted with `t()`'s OWN semantics: the token `/\{(\w+)\}/g`, a SINGLE pass, ⛔
//   escaping (a name containing `{x}` is ⛔ re-scanned). The validator admits no other placeholder in stored text.
// · ⭐ D11 FIXED HERE (6.32 deferred): an EMPTY member name (⛔ recorded name, a failed decrypt, an erased member —
//   `resolvePeerRequestMemberName`'s `''`, whose contract is UNCHANGED) is filled with the HUMAN-REVIEWED fallback word
//   (`questionnaire.member_fallback` — en "the member", hi "सदस्य"; BigDev 2026-10-30) through the REAL `t()`, for copy keys
//   and stored text alike. Each binding that actually fills a `{member}` slot with it logs `questionnaire.member_name_fallback`
//   ONCE (ids only) — BigDev: *"this better be rarest of rare"*, so how often it happens is OBSERVABLE.

import type { questionnaires } from '@twt/domain';
import { t } from '@twt/i18n';

/** The reviewed fallback word's copy key (`claim` namespace). */
export const MEMBER_FALLBACK_COPY_KEY = 'questionnaire.member_fallback';

type WordLocale = 'en' | 'hi';

/** A question or an option — whichever word source it carries. */
export type Worded = Pick<questionnaires.QuestionDefinition, 'copyKey' | 'text'>;

const TOKEN = /\{(\w+)\}/g;

/** `{member}` → `member`, single pass, ⛔ escaping (`t()`'s interpolation); any other token is left as written. */
function interpolateMember(template: string, member: string): string {
  return template.replace(TOKEN, (match, name: string) => (name === 'member' ? member : match));
}

/** One item's words in one locale, `{member}` = `member`. */
export function questionnaireWord(item: Worded, member: string, locale: WordLocale): string {
  if (typeof item.text === 'object' && item.text !== null) return interpolateMember(item.text[locale], member);
  if (typeof item.copyKey !== 'string') throw new Error('[questionnaire-words] an item with neither a copy key nor stored text');
  return t(item.copyKey, { member }, { locale, namespace: 'claim' });
}

/** What the fallback log line may carry — ids only (⛔ a name, ⛔ question text). */
export interface FallbackLogContext {
  readonly log: { warn: (obj: Record<string, unknown>, msg: string) => void } | null;
  readonly ids: Readonly<Record<string, string | null>>;
}

export interface QuestionnaireWords {
  readonly en: (item: Worded) => string;
  readonly both: (item: Worded) => { readonly en: string; readonly hi: string };
}

/**
 * Bind the ONE word function to a member name. An empty name is filled with the reviewed fallback word — and logged once,
 * the first time a `{member}` slot actually takes it (an option's words carry ⛔ slot, so an option-only read logs ⛔ thing).
 */
export function questionnaireWordsFor(memberName: string, ctx: FallbackLogContext = { log: null, ids: {} }): QuestionnaireWords {
  let logged = false;
  const fallback = {
    en: t(MEMBER_FALLBACK_COPY_KEY, undefined, { locale: 'en', namespace: 'claim' }),
    hi: t(MEMBER_FALLBACK_COPY_KEY, undefined, { locale: 'hi', namespace: 'claim' }),
  };
  const word = (item: Worded, locale: WordLocale): string => {
    if (memberName !== '') return questionnaireWord(item, memberName, locale);
    const filled = questionnaireWord(item, fallback[locale], locale);
    if (!logged && filled !== questionnaireWord(item, '', locale)) {
      logged = true;
      ctx.log?.warn({ ...ctx.ids }, 'questionnaire.member_name_fallback');
    }
    return filled;
  };
  return { en: (item) => word(item, 'en'), both: (item) => ({ en: word(item, 'en'), hi: word(item, 'hi') }) };
}
