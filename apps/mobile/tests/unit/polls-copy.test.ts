// Poll copy selection + answer-draft logic — Story 10.15 (Task 9/11; AC6). Pure, node-only.
//
// The mobile harness has NO RN mount renderer, so everything worth testing lives in
// `components/polls/copy.ts` rather than in the `.tsx`. This file is the reason that split exists.

import { describe, expect, it } from 'vitest'

import type { SurveyQuestion } from '@twt/contracts'

import {
  canSubmit,
  isOptionSelected,
  newIdempotencyKey,
  selectOptionText,
  selectQuestionText,
  selectSurveyCopy,
  setText,
  textValue,
  toSubmitPayload,
  toggleOption,
  unansweredQuestionIds,
  type AnswerDraft,
} from '../../components/polls/copy'

const CHOICE: SurveyQuestion = {
  question_id: 'q1',
  question_text: 'Which day?',
  question_text_hi: 'कौन सा दिन?',
  type: 'single_choice',
  options: [
    { option_id: 'sat', option_text: 'Saturday', option_text_hi: 'शनिवार' },
    { option_id: 'sun', option_text: 'Sunday', option_text_hi: 'रविवार' },
  ],
}
const MULTI: SurveyQuestion = { ...CHOICE, question_id: 'q2', type: 'multi_choice' }
const TEXT: SurveyQuestion = {
  question_id: 'q3',
  question_text: 'Anything else?',
  question_text_hi: 'और कुछ?',
  type: 'free_text',
}

describe('selectSurveyCopy — Hindi-first', () => {
  const full = { title: 'EN title', body: 'EN body', title_hi: 'HI title', body_hi: 'HI body' }

  it('prefers Hindi under the default locale', () => {
    expect(selectSurveyCopy(full, 'hi')).toEqual({ title: 'HI title', body: 'HI body' })
  })

  it('prefers English under en', () => {
    expect(selectSurveyCopy(full, 'en')).toEqual({ title: 'EN title', body: 'EN body' })
  })

  // Publishing requires all four fields, so a gap means partial/legacy data — and showing the member
  // the question in the "wrong" language beats showing them a blank line.
  it('falls back to the other language rather than rendering blank', () => {
    expect(selectSurveyCopy({ ...full, title_hi: null }, 'hi').title).toBe('EN title')
    expect(selectSurveyCopy({ ...full, title: '   ' }, 'en').title).toBe('HI title')
  })

  it('yields empty strings when both languages are missing', () => {
    expect(selectSurveyCopy({ title: null, body: null, title_hi: null, body_hi: null }, 'hi')).toEqual({
      title: '',
      body: '',
    })
  })

  it('applies the same rule to question and option text', () => {
    expect(selectQuestionText(CHOICE, 'hi')).toBe('कौन सा दिन?')
    expect(selectQuestionText(CHOICE, 'en')).toBe('Which day?')
    expect(selectOptionText(CHOICE.options![0]!, 'hi')).toBe('शनिवार')
    expect(selectOptionText(CHOICE.options![0]!, 'en')).toBe('Saturday')
  })
})

describe('toggleOption', () => {
  it('single_choice REPLACES the selection', () => {
    let d: AnswerDraft = {}
    d = toggleOption(d, CHOICE, 'sat')
    expect(isOptionSelected(d, 'q1', 'sat')).toBe(true)
    d = toggleOption(d, CHOICE, 'sun')
    expect(isOptionSelected(d, 'q1', 'sat')).toBe(false)
    expect(isOptionSelected(d, 'q1', 'sun')).toBe(true)
  })

  // A member who tapped by mistake must be able to undo without submitting a choice they did not mean.
  it('single_choice CLEARS when the same option is tapped again', () => {
    let d = toggleOption({}, CHOICE, 'sat')
    d = toggleOption(d, CHOICE, 'sat')
    expect(isOptionSelected(d, 'q1', 'sat')).toBe(false)
  })

  it('multi_choice toggles options in and out independently', () => {
    let d = toggleOption({}, MULTI, 'sat')
    d = toggleOption(d, MULTI, 'sun')
    expect(isOptionSelected(d, 'q2', 'sat')).toBe(true)
    expect(isOptionSelected(d, 'q2', 'sun')).toBe(true)
    d = toggleOption(d, MULTI, 'sat')
    expect(isOptionSelected(d, 'q2', 'sat')).toBe(false)
    expect(isOptionSelected(d, 'q2', 'sun')).toBe(true)
  })

  it('is a no-op on a free_text question', () => {
    const d: AnswerDraft = {}
    expect(toggleOption(d, TEXT, 'anything')).toBe(d)
  })

  it('is PURE — it never mutates the draft it was given', () => {
    const d: AnswerDraft = {}
    toggleOption(d, CHOICE, 'sat')
    expect(d).toEqual({})
  })
})

describe('unansweredQuestionIds / canSubmit', () => {
  const questions = [CHOICE, MULTI, TEXT]

  it('reports every question as unanswered on an empty draft', () => {
    expect(unansweredQuestionIds(questions, {})).toEqual(['q1', 'q2', 'q3'])
    expect(canSubmit(questions, {})).toBe(false)
  })

  it('treats a whitespace-only free-text answer as unanswered', () => {
    const d = setText({}, 'q3', '    ')
    expect(unansweredQuestionIds([TEXT], d)).toEqual(['q3'])
  })

  it('treats a choice question with an empty selection as unanswered', () => {
    let d = toggleOption({}, CHOICE, 'sat')
    d = toggleOption(d, CHOICE, 'sat') // cleared again
    expect(unansweredQuestionIds([CHOICE], d)).toEqual(['q1'])
  })

  // Mirrors the server's rule that a submission covers the WHOLE questionnaire (there is no
  // `required` flag in the v1 vocabulary), so the member sees which question they missed instead of
  // a 422 after a round trip.
  it('permits submit only when every question is answered', () => {
    let d = toggleOption({}, CHOICE, 'sat')
    d = toggleOption(d, MULTI, 'sun')
    expect(canSubmit(questions, d)).toBe(false)
    d = setText(d, 'q3', 'more notice please')
    expect(canSubmit(questions, d)).toBe(true)
    expect(unansweredQuestionIds(questions, d)).toEqual([])
  })

  it('refuses submit on a questionnaire with no questions at all', () => {
    expect(canSubmit([], {})).toBe(false)
  })
})

describe('toSubmitPayload', () => {
  // ⭐ The payload field is chosen by the QUESTION'S TYPE, matching the server's `validateAnswers`.
  // A mismatch would 422 naming a question the member did answer — the most confusing error this
  // surface could produce.
  it('emits selected_option_ids for choice questions and answer_text for free text', () => {
    let d = toggleOption({}, CHOICE, 'sat')
    d = toggleOption(d, MULTI, 'sun')
    d = setText(d, 'q3', '  trimmed  ')
    expect(toSubmitPayload([CHOICE, MULTI, TEXT], d)).toEqual([
      { question_id: 'q1', selected_option_ids: ['sat'] },
      { question_id: 'q2', selected_option_ids: ['sun'] },
      { question_id: 'q3', answer_text: 'trimmed' },
    ])
  })

  it('omits an unanswered question rather than sending an empty value', () => {
    const d = toggleOption({}, CHOICE, 'sat')
    expect(toSubmitPayload([CHOICE, TEXT], d)).toEqual([{ question_id: 'q1', selected_option_ids: ['sat'] }])
  })

  it('omits a blank free-text answer', () => {
    const d = setText({}, 'q3', '   ')
    expect(toSubmitPayload([TEXT], d)).toEqual([])
  })

  it('emits answers in the QUESTION order, not the order they were filled in', () => {
    let d = setText({}, 'q3', 'later')
    d = toggleOption(d, CHOICE, 'sat')
    expect(toSubmitPayload([CHOICE, TEXT], d).map((a) => a.question_id)).toEqual(['q1', 'q3'])
  })
})

describe('textValue', () => {
  it('returns the draft text, or empty for an unanswered or choice-typed entry', () => {
    expect(textValue(setText({}, 'q3', 'hello'), 'q3')).toBe('hello')
    expect(textValue({}, 'q3')).toBe('')
    expect(textValue(toggleOption({}, CHOICE, 'sat'), 'q1')).toBe('')
  })
})

describe('newIdempotencyKey', () => {
  // ⭐ Distinctness is what makes a SECOND genuine submission conflict; STABILITY across retries (the
  // screen memoises one per mount) is what makes a network retry replay instead of conflicting.
  it('produces a distinct key per call', () => {
    expect(newIdempotencyKey()).not.toBe(newIdempotencyKey())
  })

  it('produces a non-empty string', () => {
    expect(newIdempotencyKey().length).toBeGreaterThan(8)
  })
})
