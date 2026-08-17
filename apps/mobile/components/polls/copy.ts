// Pure poll copy selection + answer-draft logic — Story 10.15 (Task 9; AC6). No React, no Tamagui,
// no network.
//
// Split out of the `.tsx` screens so it is unit-testable in the mobile harness, which is pure-Vitest
// with NO RN component-mount renderer (apps/mobile/vitest.config.ts). Importing a `.tsx` would drag
// Tamagui into a node env. Anything worth testing therefore lives HERE, not in a component.
//
// The survey's OWN copy — its title, body, question text and option labels — is AUTHORED bilingual
// content carried on the row, NOT an i18n catalog key (only the surrounding chrome is). So language
// selection happens here rather than in `packages/i18n`, exactly as it does for banners.

import type { SurveyAnswer, SurveyQuestion } from '@twt/contracts'

/** The four authored copy fields, as they arrive on the member DTO. */
export interface SurveyCopyFields {
  title: string | null
  body: string | null
  title_hi: string | null
  body_hi: string | null
}

/** Treats an empty/whitespace-only string the same as null — the `missingSurveyCopyFields` convention. */
function orFallback(primary: string | null | undefined, fallback: string | null | undefined): string | null {
  if (primary && primary.trim() !== '') return primary
  return fallback && fallback.trim() !== '' ? fallback : null
}

/**
 * HINDI-FIRST selection (AC6). Under the app's default `hi` locale the Hindi variant wins; under
 * `en` the English one does.
 *
 * Either way it FALLS BACK to the other language rather than rendering a blank. Publishing requires
 * all four fields (a domain 422 otherwise), so a gap can only mean partial or legacy data — and
 * showing a member the question in the "wrong" language is strictly better than showing them a blank
 * line where a question should be. A missing field on BOTH sides yields `''`.
 */
export function selectSurveyCopy(survey: SurveyCopyFields, locale: string): { title: string; body: string } {
  const hiFirst = locale !== 'en'
  const title = (hiFirst ? orFallback(survey.title_hi, survey.title) : orFallback(survey.title, survey.title_hi)) ?? ''
  const body = (hiFirst ? orFallback(survey.body_hi, survey.body) : orFallback(survey.body, survey.body_hi)) ?? ''
  return { title, body }
}

/** Hindi-first selection for one question's text — same rule, same fallback. */
export function selectQuestionText(question: SurveyQuestion, locale: string): string {
  const hiFirst = locale !== 'en'
  return (
    (hiFirst
      ? orFallback(question.question_text_hi, question.question_text)
      : orFallback(question.question_text, question.question_text_hi)) ?? ''
  )
}

/** Hindi-first selection for one option's label — same rule, same fallback. */
export function selectOptionText(
  option: { option_text: string; option_text_hi: string },
  locale: string,
): string {
  const hiFirst = locale !== 'en'
  return (
    (hiFirst
      ? orFallback(option.option_text_hi, option.option_text)
      : orFallback(option.option_text, option.option_text_hi)) ?? ''
  )
}

/**
 * The in-progress answer draft, keyed by `question_id`.
 *
 * ⚠ Held in component state only — deliberately NOT persisted to MMKV. A survey answer is a
 * one-shot, final submission (LBD-6); persisting a half-finished draft would invite a member to
 * return to it days later and submit against a survey that has since closed, and would put
 * member-authored free text (PII tier 3) into device storage for no requirement.
 */
export interface AnswerDraft {
  [questionId: string]: { selected: string[] } | { text: string }
}

function isTextDraft(entry: AnswerDraft[string] | undefined): entry is { text: string } {
  return entry !== undefined && 'text' in entry
}

/**
 * Toggle an option in the draft, respecting the question's type.
 *
 * `single_choice` REPLACES the selection (tapping a second option moves the choice); `multi_choice`
 * toggles it in and out. PURE — returns a new draft.
 */
export function toggleOption(draft: AnswerDraft, question: SurveyQuestion, optionId: string): AnswerDraft {
  if (question.type === 'free_text') return draft
  const entry = draft[question.question_id]
  const current = entry && 'selected' in entry ? entry.selected : []
  if (question.type === 'single_choice') {
    // Tapping the SAME option again clears it — a member who tapped by mistake must be able to undo
    // without submitting a choice they did not mean.
    const next = current[0] === optionId ? [] : [optionId]
    return { ...draft, [question.question_id]: { selected: next } }
  }
  const next = current.includes(optionId) ? current.filter((id) => id !== optionId) : [...current, optionId]
  return { ...draft, [question.question_id]: { selected: next } }
}

/** Set the free-text answer for a question. PURE. */
export function setText(draft: AnswerDraft, questionId: string, text: string): AnswerDraft {
  return { ...draft, [questionId]: { text } }
}

/**
 * Which questions are not yet answered? Drives the disabled state of the submit button and the
 * per-question "please answer this" hint.
 *
 * ⚠ Mirrors the server's `validateAnswers` rule that a submission covers the WHOLE questionnaire —
 * there is no `required` flag in the v1 vocabulary, so every question must be answered. Catching it
 * here means the member sees which question they missed instead of a 422 after a round trip. ⛔ The
 * server check is still the authority; this is an affordance, not a substitute.
 */
export function unansweredQuestionIds(questions: readonly SurveyQuestion[], draft: AnswerDraft): string[] {
  return questions
    .filter((q) => {
      const entry = draft[q.question_id]
      if (entry === undefined) return true
      if (q.type === 'free_text') return !isTextDraft(entry) || entry.text.trim() === ''
      return !('selected' in entry) || entry.selected.length === 0
    })
    .map((q) => q.question_id)
}

/** Is the draft complete enough to submit? */
export function canSubmit(questions: readonly SurveyQuestion[], draft: AnswerDraft): boolean {
  return questions.length > 0 && unansweredQuestionIds(questions, draft).length === 0
}

/**
 * Project the draft into the wire `answers` array.
 *
 * ⭐ The payload field is chosen by the QUESTION'S TYPE, not by which draft shape happens to be
 * present — the same rule the server's `validateAnswers` applies. A mismatch here would be a 422
 * naming a question the member did answer, which is the most confusing error this surface could
 * produce. Free text is trimmed; a choice question's key is omitted entirely rather than sent empty.
 */
export function toSubmitPayload(questions: readonly SurveyQuestion[], draft: AnswerDraft): SurveyAnswer[] {
  const answers: SurveyAnswer[] = []
  for (const q of questions) {
    const entry = draft[q.question_id]
    if (entry === undefined) continue
    if (q.type === 'free_text') {
      if (isTextDraft(entry) && entry.text.trim() !== '') {
        answers.push({ question_id: q.question_id, answer_text: entry.text.trim() })
      }
      continue
    }
    if ('selected' in entry && entry.selected.length > 0) {
      answers.push({ question_id: q.question_id, selected_option_ids: entry.selected })
    }
  }
  return answers
}

/** Is this option currently chosen? Drives the radio/checkbox rendering. */
export function isOptionSelected(draft: AnswerDraft, questionId: string, optionId: string): boolean {
  const entry = draft[questionId]
  return entry !== undefined && 'selected' in entry && entry.selected.includes(optionId)
}

/** The free-text value currently in the draft for a question (or ''). */
export function textValue(draft: AnswerDraft, questionId: string): string {
  const entry = draft[questionId]
  return isTextDraft(entry) ? entry.text : ''
}

/**
 * A fresh `Idempotency-Key` for one submission ATTEMPT.
 *
 * ⚠ Generated ONCE per screen mount and reused across retries — that is the whole point. A key
 * regenerated per tap would turn a network-retry into a second submission the server 409s, while a
 * stable key replays the original 201. ⛔ Do not move this call into the submit handler.
 */
export function newIdempotencyKey(): string {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`
}
