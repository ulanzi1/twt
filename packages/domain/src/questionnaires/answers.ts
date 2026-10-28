// Checking ONE answer against a (served) definition, and the dependants a changed answer supersedes — Story 6.27a
// PM7 (b). ⛔ PURE: the writer (`claim/peer-mesh-reply.ts`) calls these under its locks; the date's keyed indexes and the
// encryption are the HANDLER's (⛔ no KMS under a lock — Trap 9).

import { addCalendarDays, isRealCalendarDate } from '../cycle-calendar/holiday-resolver.js';
import { DATE_UNKNOWN_CODE, DONT_KNOW_CODE, EARLIEST_ANSWER_DATE, PEER_MESH_HEALTH_QUESTION_KEYS } from './keys.js';
import { questionsOf } from './registry.js';
import type { QuestionDefinition, QuestionnaireAnswerValue, QuestionnaireDefinition } from './types.js';

export type AnswerRefusalReason =
  | 'unknown_question'
  | 'condition_not_met'
  | 'invalid_value'
  | 'date_not_real'
  | 'date_in_future'
  | 'date_too_early';

/**
 * How an accepted answer is STORED (PM7 (a)): plaintext codes (a non-sensitive question, or *"I don't know the date"*),
 * or a plaintext to ENCRYPT (a sensitive question) — and, for a date, its ±1-day window to INDEX.
 */
export type AnswerStorage =
  | { readonly form: 'codes'; readonly codes: readonly string[] }
  | { readonly form: 'encrypted'; readonly plaintext: string; readonly dateWindow: readonly [string, string, string] | null };

export type AnswerCheck =
  | { readonly ok: true; readonly question: QuestionDefinition; readonly codes: readonly string[] | null; readonly storage: AnswerStorage }
  | { readonly ok: false; readonly reason: AnswerRefusalReason };

/**
 * A live answer's codes as the writer knows them: a non-sensitive answer's stored codes, or a sensitive answer's codes
 * DECRYPTED by the handler before the locks (keyed by the `answerId` it read — the writer refuses a stale one). A date
 * answer has `null` codes (it is ⛔ never a `showIf` parent).
 */
export type LiveAnswerCodes = ReadonlyMap<string, readonly string[] | null>;

/** The date D and its two neighbours (D − 1, D, D + 1) — the ONE shared window helper (PM7 (b); PM9's *"more than a day"*). */
export function deathDateWindow(date: string): readonly [string, string, string] {
  return [addCalendarDays(date, -1), date, addCalendarDays(date, 1)];
}

/** Is `q`'s condition met by the live answers? */
export function isShowIfMet(q: QuestionDefinition, live: LiveAnswerCodes): boolean {
  if (q.showIf === null) return true;
  const parent = live.get(q.showIf.key);
  return parent != null && parent.some((c) => q.showIf!.anyOf.includes(c));
}

function sortedByOptionOrder(q: QuestionDefinition, codes: readonly string[]): string[] {
  const order = q.options.map((o) => o.code);
  return [...codes].sort((a, b) => order.indexOf(a) - order.indexOf(b));
}

/**
 * Check `value` for question `key` of `served` (the SERVED definition of the reply's pinned version), given the reply's
 * live answers and today's IST date. A `'pending'` question is absent from `served` ⇒ `unknown_question`.
 */
export function checkAnswer(
  served: QuestionnaireDefinition,
  key: string,
  value: QuestionnaireAnswerValue,
  live: LiveAnswerCodes,
  todayIst: string,
): AnswerCheck {
  const q = questionsOf(served).find((x) => x.key === key);
  if (!q) return { ok: false, reason: 'unknown_question' };
  if (!isShowIfMet(q, live)) return { ok: false, reason: 'condition_not_met' };

  if ('date' in value) {
    if (q.kind !== 'date') return { ok: false, reason: 'invalid_value' };
    if (!isRealCalendarDate(value.date)) return { ok: false, reason: 'date_not_real' };
    if (value.date > todayIst) return { ok: false, reason: 'date_in_future' };
    if (value.date < EARLIEST_ANSWER_DATE) return { ok: false, reason: 'date_too_early' };
    // The keyed ±1-day window is `death_date`'s ALONE (0156's indexes CHECK; 6.27b's date warning) — any other date
    // question is stored encrypted with ⛔ no indexes (second-pass review S2).
    const dateWindow = q.key === 'death_date' ? deathDateWindow(value.date) : null;
    return { ok: true, question: q, codes: null, storage: { form: 'encrypted', plaintext: value.date, dateWindow } };
  }

  const codes = value.codes;
  const known = q.options.map((o) => o.code);
  if (codes.length === 0 || new Set(codes).size !== codes.length || codes.some((c) => !known.includes(c))) {
    return { ok: false, reason: 'invalid_value' };
  }
  if (q.kind !== 'multi' && codes.length !== 1) return { ok: false, reason: 'invalid_value' };
  if (q.kind === 'multi' && codes.length > 1 && q.options.some((o) => o.exclusive === true && codes.includes(o.code))) {
    return { ok: false, reason: 'invalid_value' };
  }
  const normalized = sortedByOptionOrder(q, codes);
  if (q.kind === 'date') {
    // A date question's only code is *"I don't know the date"* — a plaintext code, ⛔ no ciphertext, ⛔ no indexes.
    return normalized[0] === DATE_UNKNOWN_CODE
      ? { ok: true, question: q, codes: normalized, storage: { form: 'codes', codes: normalized } }
      : { ok: false, reason: 'invalid_value' };
  }
  const storage: AnswerStorage = q.sensitive
    ? { form: 'encrypted', plaintext: JSON.stringify(normalized), dateWindow: null }
    : { form: 'codes', codes: normalized };
  return { ok: true, question: q, codes: normalized, storage };
}

/**
 * The keys whose live answers must be SUPERSEDED when `changedKey`'s live codes become `newCodes` (`null` for a date or
 * a superseded parent): every question whose condition stops holding — transitively (a dependant superseded drops its
 * own dependants). `live` holds the answers BEFORE the change; only keys with a live answer are returned.
 */
export function dependantsToSupersede(
  def: QuestionnaireDefinition,
  changedKey: string,
  newCodes: readonly string[] | null,
  live: LiveAnswerCodes,
): string[] {
  const after = new Map(live);
  after.set(changedKey, newCodes);
  const out: string[] = [];
  for (const q of questionsOf(def)) {
    if (q.key === changedKey || q.showIf === null || !after.has(q.key)) continue;
    if (!isShowIfMet(q, after)) {
      out.push(q.key);
      after.delete(q.key);
    }
  }
  return out;
}

/**
 * ⭐ Story 6.32 (`2026-10-28-413` IQ4) — the plaintexts of a health answer's keyed CODE indexes, ONE per selected code:
 * `${claimCaseId}|${questionKey}|${code}` (claim-scoped — the same cause on two claims hashes differently). `null` — store
 * ⛔ indexes — when the key is ⛔ a health question (`death_cause` / `death_illness`), or the answer includes *"I don't know"*
 * (so it is ⛔ ever compared; decided HERE at write time, ⛔ by reading a ciphertext). Built from `checkAnswer`'s normalized
 * top-level `codes` (⛔ its `plaintext` JSON). The ONE input rule for BOTH writers (the neighbours' and the family's); the
 * HANDLER hashes each under `ANSWER_CODE_INDEX_FIELD_CLASS` before any lock.
 */
export function answerCodeIndexInputs(claimCaseId: string, questionKey: string, codes: readonly string[]): string[] | null {
  if (!(PEER_MESH_HEALTH_QUESTION_KEYS as readonly string[]).includes(questionKey)) return null;
  if (codes.length === 0 || codes.includes(DONT_KNOW_CODE)) return null;
  return codes.map((code) => `${claimCaseId.toLowerCase()}|${questionKey}|${code}`);
}
