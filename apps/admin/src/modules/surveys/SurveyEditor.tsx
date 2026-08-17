// Survey authoring editor — Story 10.15 (Task 8; AC1, AC3, AC4).
//
// Bilingual copy, the bounded questionnaire, the audience, the window, and the response target.
//
// ── ⭐ THE EDITOR ENFORCES THE LBD-5 FREEZE BY DISABLING, NOT BY 409-ing ──────────────────────
// On a PUBLISHED survey every field except the closing date is disabled, with the reason stated
// beside them. The server would 409 anyway — but an editor that accepts input it KNOWS will be
// rejected is a worse explanation than a disabled field with a sentence next to it, and it invites
// the admin to lose work they typed.
//
// ── ⛔ THE VOCABULARY IS BOUNDED, AND THIS UI IS WHERE THAT IS VISIBLE (LBD-4) ────────────────
// Exactly three answer types. There is no branching control, no scoring field, no "required"
// toggle, no "other (please specify)" checkbox — not because they were forgotten, but because a
// tenant authoring behaviour into a JSONB column is the thing this design refuses. A fourth type is
// a code change and a review.

import { SURVEY_AUDIENCE_SCOPES, SURVEY_QUESTION_TYPES, type SurveyAudienceScope, type SurveyQuestion, type SurveyQuestionType } from '@twt/contracts';
import { MAX_OPTIONS_PER_QUESTION, MAX_QUESTIONS_PER_SURVEY } from '@twt/contracts';
import type { ReactElement } from 'react';

import { editableFields, isTargetableAudience, type SurveyStatus } from './derive.js';
import { resolveEn as t } from './i18n-en.js';

export interface EditorState {
  title: string;
  body: string;
  titleHi: string;
  bodyHi: string;
  questions: SurveyQuestion[];
  audienceScope: SurveyAudienceScope;
  audienceScopeValue: string;
  validFrom: string;
  validUntil: string;
  responseThreshold: string;
}

export const emptyEditor: EditorState = {
  title: '',
  body: '',
  titleHi: '',
  bodyHi: '',
  questions: [],
  audienceScope: 'members-all',
  audienceScopeValue: '',
  validFrom: '',
  validUntil: '',
  responseThreshold: '',
};

/** A stable client-supplied id for a new question/option. ⛔ Never a positional index — a stored
 *  answer references the option it selected, and an index would re-point on any reorder. */
function newId(): string {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function blankQuestion(): SurveyQuestion {
  return {
    question_id: newId(),
    question_text: '',
    question_text_hi: '',
    type: 'single_choice',
    // A choice question starts with the MINIMUM legal number of options (2) rather than zero, so the
    // author is never staring at a form that is invalid for a reason the UI has not explained.
    options: [
      { option_id: newId(), option_text: '', option_text_hi: '' },
      { option_id: newId(), option_text: '', option_text_hi: '' },
    ],
  };
}

export interface SurveyEditorProps {
  editor: EditorState;
  onChange: (next: EditorState) => void;
  /** The stored status of the survey being edited; `null` for an unsaved new draft (fully editable). */
  status: SurveyStatus | null;
}

export function SurveyEditor({ editor, onChange, status }: SurveyEditorProps): ReactElement {
  const editable = editableFields(status ?? 'draft');
  const contentDisabled = editable !== 'all';
  const allDisabled = editable === 'none';

  const set = (patch: Partial<EditorState>): void => onChange({ ...editor, ...patch });

  const setQuestion = (index: number, next: SurveyQuestion): void => {
    const questions = [...editor.questions];
    questions[index] = next;
    set({ questions });
  };

  return (
    <div data-testid="survey-editor" className="space-y-4">
      {contentDisabled && !allDisabled && (
        <p role="note" data-testid="survey-frozen-hint" className="text-sm">
          {t('survey.hint.frozen')}
        </p>
      )}
      {allDisabled && (
        <p role="note" data-testid="survey-terminal-hint" className="text-sm">
          {t('survey.hint.terminal')}
        </p>
      )}

      <label className="block">
        <span>{t('survey.field.title')}</span>
        <input
          value={editor.title}
          disabled={contentDisabled}
          onChange={(e) => set({ title: e.target.value })}
          data-testid="survey-field-title"
        />
      </label>
      <label className="block">
        <span>{t('survey.field.titleHi')}</span>
        <input
          value={editor.titleHi}
          disabled={contentDisabled}
          onChange={(e) => set({ titleHi: e.target.value })}
          data-testid="survey-field-title-hi"
        />
      </label>
      <label className="block">
        <span>{t('survey.field.body')}</span>
        <textarea
          value={editor.body}
          disabled={contentDisabled}
          onChange={(e) => set({ body: e.target.value })}
          data-testid="survey-field-body"
        />
      </label>
      <label className="block">
        <span>{t('survey.field.bodyHi')}</span>
        <textarea
          value={editor.bodyHi}
          disabled={contentDisabled}
          onChange={(e) => set({ bodyHi: e.target.value })}
          data-testid="survey-field-body-hi"
        />
      </label>
      <p className="text-sm">{t('survey.hint.bilingual')}</p>

      {/* ── Audience ── */}
      <label className="block">
        <span>{t('survey.field.audience')}</span>
        <select
          value={editor.audienceScope}
          disabled={contentDisabled}
          onChange={(e) => set({ audienceScope: e.target.value as SurveyAudienceScope })}
          data-testid="survey-field-audience"
        >
          {SURVEY_AUDIENCE_SCOPES.map((scope) => (
            <option key={scope} value={scope}>
              {scope}
            </option>
          ))}
        </select>
      </label>
      {/* ⚠ `public` lands here too — the OPPOSITE of the banners console, where it IS targetable. */}
      {!isTargetableAudience(editor.audienceScope) && (
        <p role="note" data-testid="survey-not-targetable" className="text-sm">
          {t('survey.hint.notTargetable')}
        </p>
      )}
      {editor.audienceScope === 'state' && (
        <label className="block">
          <span>{t('survey.field.audienceValue')}</span>
          <input
            value={editor.audienceScopeValue}
            disabled={contentDisabled}
            onChange={(e) => set({ audienceScopeValue: e.target.value })}
            data-testid="survey-field-audience-value"
          />
        </label>
      )}

      {/* ── The window. `valid_until` stays enabled on a published survey — it is the ONE field that
          may still move, and only later (AC4). ── */}
      <label className="block">
        <span>{t('survey.field.validFrom')}</span>
        <input
          type="datetime-local"
          value={editor.validFrom}
          disabled={contentDisabled}
          onChange={(e) => set({ validFrom: e.target.value })}
          data-testid="survey-field-valid-from"
        />
      </label>
      <label className="block">
        <span>{t('survey.field.validUntil')}</span>
        <input
          type="datetime-local"
          value={editor.validUntil}
          disabled={allDisabled}
          onChange={(e) => set({ validUntil: e.target.value })}
          data-testid="survey-field-valid-until"
        />
      </label>

      {/* ── ⚠ FR-58's "quorum threshold", RENAMED and DECLAWED (LBD-1). The hint is not decoration:
          it is the only thing standing between an admin and reading this number as a pass mark. ── */}
      <label className="block">
        <span>{t('survey.field.responseThreshold')}</span>
        <input
          type="number"
          min={1}
          value={editor.responseThreshold}
          disabled={contentDisabled}
          onChange={(e) => set({ responseThreshold: e.target.value })}
          data-testid="survey-field-response-threshold"
        />
      </label>
      <p data-testid="survey-threshold-hint" className="text-sm">
        {t('survey.hint.responseThreshold')}
      </p>

      {/* ── The questionnaire ── */}
      <section data-testid="survey-questions">
        <h3>{t('survey.questions.heading')}</h3>
        {editor.questions.length === 0 && <p data-testid="survey-questions-empty">{t('survey.questions.empty')}</p>}

        {editor.questions.map((q, i) => (
          <fieldset key={q.question_id} data-testid={`survey-question-${i}`} className="my-3 border p-3">
            <label className="block">
              <span>{t('survey.question.text')}</span>
              <input
                value={q.question_text}
                disabled={contentDisabled}
                onChange={(e) => setQuestion(i, { ...q, question_text: e.target.value })}
                data-testid={`survey-question-${i}-text`}
              />
            </label>
            <label className="block">
              <span>{t('survey.question.textHi')}</span>
              <input
                value={q.question_text_hi}
                disabled={contentDisabled}
                onChange={(e) => setQuestion(i, { ...q, question_text_hi: e.target.value })}
                data-testid={`survey-question-${i}-text-hi`}
              />
            </label>
            <label className="block">
              <span>{t('survey.question.type')}</span>
              <select
                value={q.type}
                disabled={contentDisabled}
                onChange={(e) => {
                  const type = e.target.value as SurveyQuestionType;
                  // ⛔ Switching TO free_text DROPS the options rather than hiding them: a free_text
                  // question carrying options is a typed 422, and carrying them invisibly in state
                  // until save would turn a UI choice into a server error the author cannot see.
                  setQuestion(i, type === 'free_text' ? { ...q, type, options: undefined } : { ...q, type, options: q.options ?? blankQuestion().options });
                }}
                data-testid={`survey-question-${i}-type`}
              >
                {SURVEY_QUESTION_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {t(`survey.question.type.${type}`)}
                  </option>
                ))}
              </select>
            </label>

            {q.type !== 'free_text' &&
              (q.options ?? []).map((o, oi) => (
                <div key={o.option_id} data-testid={`survey-question-${i}-option-${oi}`}>
                  <label className="block">
                    <span>{t('survey.option.text')}</span>
                    <input
                      value={o.option_text}
                      disabled={contentDisabled}
                      onChange={(e) => {
                        const options = [...(q.options ?? [])];
                        options[oi] = { ...o, option_text: e.target.value };
                        setQuestion(i, { ...q, options });
                      }}
                      data-testid={`survey-question-${i}-option-${oi}-text`}
                    />
                  </label>
                  <label className="block">
                    <span>{t('survey.option.textHi')}</span>
                    <input
                      value={o.option_text_hi}
                      disabled={contentDisabled}
                      onChange={(e) => {
                        const options = [...(q.options ?? [])];
                        options[oi] = { ...o, option_text_hi: e.target.value };
                        setQuestion(i, { ...q, options });
                      }}
                      data-testid={`survey-question-${i}-option-${oi}-text-hi`}
                    />
                  </label>
                  <button
                    type="button"
                    disabled={contentDisabled}
                    onClick={() => setQuestion(i, { ...q, options: (q.options ?? []).filter((_, x) => x !== oi) })}
                  >
                    {t('survey.option.remove')}
                  </button>
                </div>
              ))}

            {q.type !== 'free_text' && (q.options ?? []).length < MAX_OPTIONS_PER_QUESTION && (
              <button
                type="button"
                disabled={contentDisabled}
                onClick={() =>
                  setQuestion(i, {
                    ...q,
                    options: [...(q.options ?? []), { option_id: newId(), option_text: '', option_text_hi: '' }],
                  })
                }
                data-testid={`survey-question-${i}-add-option`}
              >
                {t('survey.option.add')}
              </button>
            )}

            <button
              type="button"
              disabled={contentDisabled}
              onClick={() => set({ questions: editor.questions.filter((_, x) => x !== i) })}
              data-testid={`survey-question-${i}-remove`}
            >
              {t('survey.questions.remove')}
            </button>
          </fieldset>
        ))}

        {editor.questions.length < MAX_QUESTIONS_PER_SURVEY && (
          <button
            type="button"
            disabled={contentDisabled}
            onClick={() => set({ questions: [...editor.questions, blankQuestion()] })}
            data-testid="survey-add-question"
          >
            {t('survey.questions.add')}
          </button>
        )}
      </section>
    </div>
  );
}
