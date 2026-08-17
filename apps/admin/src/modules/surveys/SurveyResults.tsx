// Survey results dashboard — Story 10.15 (Task 8; AC7, Load-Bearing Decisions 1 + 3).
//
// ── ⛔ THIS SCREEN CANNOT SHOW WHO SAID WHAT, AND IT SAYS SO ──────────────────────────────────
// The aggregate DTO has no field that could carry a member identifier, and the free-text DTO is
// exactly `{answer_text, submitted_at}` with no id and no ordinal (LBD-3). But a shape an admin
// cannot see is not an explanation — so the screen states the property in words. Without that, the
// first admin who wants to follow up with a respondent files a ticket asking for a feature that this
// design deliberately refuses, and somebody eventually builds it.
//
// ⚠ These sentences are asserted by RENDER tests, not merely by a view-model test: prose asserted
// only at the view-model reaches nobody (the 10.10 AC9 lesson).
//
// ── ⚠ AND IT NEVER SAYS THE SURVEY DECIDED ANYTHING (LBD-1) ──────────────────────────────────
// `thresholdLabel` is the one place `response_threshold` surfaces, and it reports a PARTICIPATION
// FIGURE. No string here says a survey "passed", "carried", "was approved" or "reached quorum" —
// that last word already names the TRUSTEE quorum (Deed Cl. 19), and members hold no governance vote.

import type { SurveyAggregateResponse, SurveyFreeTextListResponse, SurveyQuestion } from '@twt/contracts';
import type { ReactElement } from 'react';

import { optionSharePct, thresholdLabel } from './derive.js';
import { resolveEn as t } from './i18n-en.js';

export interface SurveyResultsProps {
  /** The published questionnaire — the source of question and option LABELS (the aggregate has ids). */
  questions: SurveyQuestion[];
  aggregate: SurveyAggregateResponse | undefined;
  isLoading: boolean;
  isError: boolean;
  /** The currently expanded free-text question, if any, plus its loaded answers. */
  freeText: { questionId: string | null; data: SurveyFreeTextListResponse | undefined; isLoading: boolean };
  onToggleFreeText: (questionId: string | null) => void;
}

export function SurveyResults({
  questions,
  aggregate,
  isLoading,
  isError,
  freeText,
  onToggleFreeText,
}: SurveyResultsProps): ReactElement {
  if (isLoading) return <p data-testid="survey-results-loading">{t('survey.results.loading')}</p>;
  if (isError) return <p role="alert" data-testid="survey-results-error">{t('survey.results.error')}</p>;
  if (!aggregate) return <p data-testid="survey-results-empty">{t('survey.results.noResponses')}</p>;

  const byId = new Map(questions.map((q) => [q.question_id, q]));

  return (
    <section data-testid="survey-results">
      <h2>{t('survey.results.heading')}</h2>

      {/* ⭐ LBD-1 — stated at the top of the results, where an admin reads a number and decides what
          it means. */}
      <p data-testid="survey-advisory-notice">{t('survey.advisoryNotice')}</p>

      {/* ⭐ The one place `response_threshold` surfaces. A participation figure — never a verdict. */}
      <p data-testid="survey-threshold-label">
        {thresholdLabel(aggregate.response_count, aggregate.response_threshold, aggregate.threshold_met)}
      </p>

      {/* ⭐ LBD-3 — stated, not merely enforced. */}
      <p data-testid="survey-aggregate-note">{t('survey.results.aggregateNote')}</p>

      {aggregate.response_count === 0 && <p data-testid="survey-no-responses">{t('survey.results.noResponses')}</p>}

      {aggregate.questions.map((qa) => {
        const question = byId.get(qa.question_id);
        const isExpanded = freeText.questionId === qa.question_id;
        return (
          <article key={qa.question_id} data-testid={`survey-result-${qa.question_id}`}>
            <h3>{question?.question_text ?? qa.question_id}</h3>
            <p data-testid={`survey-result-${qa.question_id}-answered`}>
              {qa.answered_count} {t('survey.results.answeredCount')}
            </p>

            {qa.type === 'free_text' ? (
              <>
                <button
                  type="button"
                  onClick={() => onToggleFreeText(isExpanded ? null : qa.question_id)}
                  data-testid={`survey-result-${qa.question_id}-toggle`}
                >
                  {isExpanded ? t('survey.results.hideFreeText') : t('survey.results.showFreeText')}
                </button>
                {isExpanded && (
                  <div data-testid={`survey-result-${qa.question_id}-free-text`}>
                    {/* ⭐ The anonymity property, in words, right beside the answers it governs — so an
                        admin reading them understands that "who wrote this" is not a missing feature. */}
                    <p data-testid="survey-anonymity-note">{t('survey.results.anonymityNote')}</p>
                    <p data-testid="survey-export-note">{t('survey.results.exportNote')}</p>
                    {freeText.isLoading && <p>{t('survey.results.loading')}</p>}
                    {!freeText.isLoading && (freeText.data?.items.length ?? 0) === 0 && (
                      <p data-testid="survey-free-text-empty">{t('survey.results.freeTextEmpty')}</p>
                    )}
                    <ul>
                      {(freeText.data?.items ?? []).map((a, i) => (
                        // ⚠ The React key is the ARRAY INDEX, and that is correct here rather than
                        // lazy: there is no id on a free-text answer BY DESIGN (LBD-3), and inventing
                        // a stable one — even client-side — would be the first step toward an ordinal
                        // that could be joined back across two questions' reads.
                        <li key={i}>{a.answer_text}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </>
            ) : (
              <ul>
                {qa.option_counts.map((oc) => {
                  const label = question?.options?.find((o) => o.option_id === oc.option_id)?.option_text;
                  return (
                    <li key={oc.option_id} data-testid={`survey-option-${oc.option_id}`}>
                      <span>{label ?? oc.option_id}</span>
                      {/* Denominated in THIS question's answered_count, never the survey's total —
                          a member who skipped did not vote against every option. */}
                      <span data-testid={`survey-option-${oc.option_id}-count`}>
                        {oc.count} ({optionSharePct(oc.count, qa.answered_count)}%)
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </article>
        );
      })}
    </section>
  );
}
