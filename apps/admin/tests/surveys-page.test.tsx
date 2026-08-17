// SurveysPage + SurveyResults RENDER tests (Story 10.15, Task 8/11; AC1, AC4, AC7).
//
// ⭐ WHY THESE ARE RENDER TESTS AND NOT VIEW-MODEL TESTS: the 10.10 AC9 lesson — prose asserted only
// at the view-model reaches nobody. Two of this story's Load-Bearing Decisions are ONLY real if an
// admin actually reads them on screen:
//   · LBD-1 — a survey is ADVISORY and its threshold decides nothing;
//   · LBD-3 — this surface CANNOT show who said what, by design, not by omission.
// So they are asserted here, in the DOM, not in `derive.ts`'s return values.
//
// The api-client module is mocked so the list renders and the freeze/publish paths are exercised.

import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { SurveyAggregateResponse, SurveyResponse } from '@twt/contracts';
import { SurveysPage } from '../src/modules/surveys/SurveysPage.js';
import { renderWithClient } from './_helpers.js';

const PARIWAR = '11111111-1111-1111-1111-111111111111';
const NOW = new Date('2026-08-04T12:00:00.000Z');
const FROM = '2026-08-01T00:00:00.000Z';
const UNTIL = '2026-08-08T00:00:00.000Z';

const Q_CHOICE = '00000000-0000-4000-8000-000000000001';
const Q_TEXT = '00000000-0000-4000-8000-000000000002';
const OPT_A = '00000000-0000-4000-8000-00000000000a';
const OPT_B = '00000000-0000-4000-8000-00000000000b';

function survey(over: Partial<SurveyResponse>): SurveyResponse {
  return {
    survey_id: '22222222-2222-2222-2222-222222222222',
    pariwar_id: PARIWAR,
    title: 'Meeting day',
    body: 'Tell us which day suits you.',
    title_hi: 'बैठक का दिन',
    body_hi: 'हमें बताइए',
    questions: [
      {
        question_id: Q_CHOICE,
        question_text: 'Which day suits?',
        question_text_hi: 'कौन सा दिन?',
        type: 'single_choice',
        options: [
          { option_id: OPT_A, option_text: 'Saturday', option_text_hi: 'शनिवार' },
          { option_id: OPT_B, option_text: 'Sunday', option_text_hi: 'रविवार' },
        ],
      },
      { question_id: Q_TEXT, question_text: 'Anything else?', question_text_hi: 'और कुछ?', type: 'free_text' },
    ],
    audience_scope: 'members-all',
    audience_scope_value: null,
    valid_from: FROM,
    valid_until: UNTIL,
    response_threshold: null,
    status: 'draft',
    display_state: 'draft',
    created_by_actor_id: '33333333-3333-3333-3333-333333333333',
    tone_signoff_content_hash: null,
    tone_signoff_reviewed_at: null,
    tone_signoff_reviewed_by: null,
    published_at: null,
    closed_at: null,
    created_at: FROM,
    updated_at: FROM,
    ...over,
  } as SurveyResponse;
}

const DRAFT = survey({ survey_id: 'aaaa1111-1111-1111-1111-111111111111', title: 'A draft' });
const PUBLISHED = survey({
  survey_id: 'bbbb2222-2222-2222-2222-222222222222',
  title: 'An open survey',
  status: 'published',
  display_state: 'open',
  response_threshold: 20,
  published_at: FROM,
});

const AGGREGATE: SurveyAggregateResponse = {
  survey_id: PUBLISHED.survey_id,
  response_count: 25,
  response_threshold: 20,
  threshold_met: true,
  questions: [
    {
      question_id: Q_CHOICE,
      type: 'single_choice',
      option_counts: [
        { option_id: OPT_A, count: 15 },
        { option_id: OPT_B, count: 0 },
      ],
      answered_count: 15,
    },
    { question_id: Q_TEXT, type: 'free_text', option_counts: [], answered_count: 3 },
  ],
};

vi.mock('../src/api/client.js', () => {
  class ApiError extends Error {
    public constructor(
      public readonly status: number,
      public readonly code: string,
      message: string,
    ) {
      super(message);
      this.name = 'ApiError';
    }
    public get isUnauthorized(): boolean {
      return this.status === 401;
    }
  }
  return {
    ApiError,
    listSurveys: vi.fn(async () => ({ items: [DRAFT, PUBLISHED], next_offset: null })),
    getSurvey: vi.fn(async () => DRAFT),
    createSurvey: vi.fn(),
    updateSurvey: vi.fn(async () => {
      throw new ApiError(409, 'survey.frozen_field', 'survey is published; questions cannot be changed');
    }),
    publishSurvey: vi.fn(async () => {
      throw new ApiError(409, 'tone_review.required', 'a non-author sign-off is required');
    }),
    closeSurvey: vi.fn(async () => PUBLISHED),
    getSurveyAggregate: vi.fn(async () => AGGREGATE),
    listSurveyFreeText: vi.fn(async () => ({
      items: [
        { answer_text: 'please give more notice', submitted_at: FROM },
        { answer_text: 'saturdays clash with work', submitted_at: FROM },
      ],
      next_offset: null,
    })),
  };
});

// The module-level mocks are shared across every test in this file, so call counts must be reset —
// otherwise the "not yet fetched" assertion below reads a previous test's clicks.
beforeEach(() => {
  vi.clearAllMocks();
});

describe('SurveysPage — the list', () => {
  it('renders the surveys with their DERIVED display states', async () => {
    renderWithClient(<SurveysPage pariwarId={PARIWAR} now={NOW} />);
    expect(await screen.findByText('A draft')).toBeTruthy();
    expect(screen.getByText('An open survey')).toBeTruthy();
    // ⚠ Scoped to the LIST — the state-filter <select> renders every label as an <option> too, so an
    // unscoped getByText would match the dropdown rather than the row's badge.
    const list = screen.getByTestId('surveys-list');
    expect(within(list).getByText('Draft')).toBeTruthy();
    expect(within(list).getByText('Open')).toBeTruthy();
  });

  // ⭐ LBD-1, ON SCREEN. This is the assertion that makes the decision real for an admin rather than
  // real only for a reviewer reading a code comment.
  it('states on the page that a survey does not decide anything', async () => {
    renderWithClient(<SurveysPage pariwarId={PARIWAR} now={NOW} />);
    const notice = await screen.findByTestId('surveys-advisory-notice');
    expect(notice.textContent).toContain('gathers views');
    expect(notice.textContent).toContain('does not decide anything');
  });

  it('offers Publish only on a draft, and Close on both a draft and a published survey', async () => {
    renderWithClient(<SurveysPage pariwarId={PARIWAR} now={NOW} />);
    await screen.findByText('A draft');
    expect(screen.queryByTestId(`survey-publish-${DRAFT.survey_id}`)).toBeTruthy();
    // ⛔ A published survey cannot be re-published — `closed` is terminal and `published` is not a
    // publishable state.
    expect(screen.queryByTestId(`survey-publish-${PUBLISHED.survey_id}`)).toBeNull();
    expect(screen.queryByTestId(`survey-close-${PUBLISHED.survey_id}`)).toBeTruthy();
  });

  it('surfaces the tone-review 409 with the resolution path', async () => {
    const user = userEvent.setup();
    renderWithClient(<SurveysPage pariwarId={PARIWAR} now={NOW} />);
    await screen.findByText('A draft');
    await user.click(screen.getByTestId(`survey-publish-${DRAFT.survey_id}`));
    await waitFor(() => expect(screen.getByTestId('survey-error')).toBeTruthy());
    expect(screen.getByTestId('survey-error').textContent).toContain('other than the person who wrote it');
  });
});

// ⭐ LBD-5 at the render: the editor DISABLES rather than letting an admin type a change the server
// will reject and lose.
describe('SurveysPage — the editor and the freeze', () => {
  it('a DRAFT has its content fields enabled', async () => {
    const user = userEvent.setup();
    renderWithClient(<SurveysPage pariwarId={PARIWAR} now={NOW} />);
    await user.click(await screen.findByText('A draft'));
    expect((screen.getByTestId('survey-field-title') as HTMLInputElement).disabled).toBe(false);
    expect(screen.queryByTestId('survey-frozen-hint')).toBeNull();
  });

  it('a PUBLISHED survey disables the questionnaire and copy, keeps the closing date, and SAYS WHY', async () => {
    const user = userEvent.setup();
    renderWithClient(<SurveysPage pariwarId={PARIWAR} now={NOW} />);
    await user.click(await screen.findByText('An open survey'));

    expect((screen.getByTestId('survey-field-title') as HTMLInputElement).disabled).toBe(true);
    expect((screen.getByTestId('survey-field-response-threshold') as HTMLInputElement).disabled).toBe(true);
    expect((screen.getByTestId('survey-field-valid-from') as HTMLInputElement).disabled).toBe(true);
    // ⭐ The ONE field that may still move.
    expect((screen.getByTestId('survey-field-valid-until') as HTMLInputElement).disabled).toBe(false);

    const hint = screen.getByTestId('survey-frozen-hint');
    expect(hint.textContent).toContain('Members have already been asked');
    expect(hint.textContent).toContain('Only the closing date can be moved');
  });

  // ⭐ LBD-1 at the exact field FR-58 called a "quorum threshold".
  it('the threshold field says, on screen, that it changes nothing', async () => {
    const user = userEvent.setup();
    renderWithClient(<SurveysPage pariwarId={PARIWAR} now={NOW} />);
    await user.click(await screen.findByText('A draft'));
    const hint = screen.getByTestId('survey-threshold-hint');
    expect(hint.textContent).toContain('It changes nothing');
    expect(hint.textContent).toContain('does not approve or decide anything');
    expect(hint.textContent?.toLowerCase()).not.toContain('quorum');
  });
});

describe('SurveyResults — the aggregate and the PII shield', () => {
  it('renders per-option counts, keeping a ZERO-vote option visible', async () => {
    const user = userEvent.setup();
    renderWithClient(<SurveysPage pariwarId={PARIWAR} now={NOW} />);
    await user.click(await screen.findByText('An open survey'));
    await screen.findByTestId('survey-results');
    expect(screen.getByTestId(`survey-option-${OPT_A}-count`).textContent).toContain('15');
    // ⭐ "Nobody chose this" must stay distinguishable from "this option does not exist".
    expect(screen.getByTestId(`survey-option-${OPT_B}-count`).textContent).toContain('0');
  });

  // ⭐ LBD-1 on the results screen — where an admin reads a number and decides what it means.
  it('reports a met threshold as PARTICIPATION and never as a verdict', async () => {
    const user = userEvent.setup();
    renderWithClient(<SurveysPage pariwarId={PARIWAR} now={NOW} />);
    await user.click(await screen.findByText('An open survey'));
    const label = await screen.findByTestId('survey-threshold-label');
    expect(label.textContent).toContain('participation figure');
    expect(label.textContent).toContain('does not decide anything');
    for (const word of ['quorum', 'passed', 'carried', 'approved']) {
      expect(label.textContent?.toLowerCase()).not.toContain(word);
    }
  });

  it('states on screen that individual responses are not linked to anyone', async () => {
    const user = userEvent.setup();
    renderWithClient(<SurveysPage pariwarId={PARIWAR} now={NOW} />);
    await user.click(await screen.findByText('An open survey'));
    const note = await screen.findByTestId('survey-aggregate-note');
    expect(note.textContent).toContain('not linked to anyone');
  });

  // ⭐ LBD-3 AT THE RENDER. A shape an admin cannot see is not an explanation: without this sentence
  // the first admin who wants to follow up with a respondent files a ticket asking for a feature this
  // design deliberately refuses.
  it('states, beside the written answers, that there is no way to see how a member answered', async () => {
    const user = userEvent.setup();
    renderWithClient(<SurveysPage pariwarId={PARIWAR} now={NOW} />);
    await user.click(await screen.findByText('An open survey'));
    await screen.findByTestId('survey-results');
    await user.click(screen.getByTestId(`survey-result-${Q_TEXT}-toggle`));

    const note = await screen.findByTestId('survey-anonymity-note');
    expect(note.textContent).toContain('without any indication of who wrote them');
    expect(note.textContent).toContain('no way to see how a particular member answered');
    expect(note.textContent).toContain('by design');
    expect(screen.getByTestId('survey-export-note').textContent).toContain('cannot be exported');
  });

  it('renders the free-text answers themselves, with no attribution anywhere in the DOM', async () => {
    const user = userEvent.setup();
    const { container } = renderWithClient(<SurveysPage pariwarId={PARIWAR} now={NOW} />);
    await user.click(await screen.findByText('An open survey'));
    await screen.findByTestId('survey-results');
    await user.click(screen.getByTestId(`survey-result-${Q_TEXT}-toggle`));

    expect(await screen.findByText('please give more notice')).toBeTruthy();
    expect(screen.getByText('saturdays clash with work')).toBeTruthy();
    // No member id could appear — the DTO has no field for one — but assert the rendered DOM too,
    // because that is what an admin (and a screenshot) actually sees.
    expect(container.innerHTML).not.toContain('member_id');
  });

  it('does not fetch the free text until the admin asks for it — the read is audited', async () => {
    const user = userEvent.setup();
    const client = await import('../src/api/client.js');
    renderWithClient(<SurveysPage pariwarId={PARIWAR} now={NOW} />);
    await user.click(await screen.findByText('An open survey'));
    await screen.findByTestId('survey-results');
    // ⚠ Firing it speculatively would record an admin as having viewed responses they never asked
    // to see — the server writes a `survey.responses_viewed` audit line on every call.
    expect(vi.mocked(client.listSurveyFreeText)).not.toHaveBeenCalled();

    await user.click(screen.getByTestId(`survey-result-${Q_TEXT}-toggle`));
    await waitFor(() => expect(vi.mocked(client.listSurveyFreeText)).toHaveBeenCalled());
  });
});
