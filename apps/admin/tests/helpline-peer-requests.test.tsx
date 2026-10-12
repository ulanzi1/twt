// `<HelplinePeerRequests>` — Story 6.27a (PM12, PM25 (b); AC6's console half). The api client is mocked (the
// `helpline-certificate-replacement.test.tsx` pattern); the real hooks + Query cache are exercised.
//   · nothing before the caller is selected AND read back; nothing at all when the server lists ⛔ request (DARK until
//     6.27c texts anyone);
//   · the served questions in English, ONLY the shown ones (the date after "died"), the caller's own answers selected;
//   · a tap records ONE answer for THAT ping; Submit needs `has_died`; a step-up 403 opens the page's panel.

import { act, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryHistory, createRootRoute, createRoute, createRouter, Outlet, RouterProvider } from '@tanstack/react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { PeerRequestDetailResponse } from '@twt/contracts';

import * as api from '../src/api/client.js';
import { ApiError } from '../src/api/client.js';
import { HelplinePeerRequests } from '../src/modules/helpline-claims/HelplinePeerRequests.js';
import { renderWithClient } from './_helpers.js';

const MEMBER = '11111111-1111-4111-8111-111111111111';
const PING = '22222222-2222-4222-8222-222222222222';
const w = (en: string) => ({ en, hi: `hi:${en}` });

function item(answers: PeerRequestDetailResponse['answers'] = []): PeerRequestDetailResponse {
  return {
    pingId: PING,
    memberName: 'Ram K.',
    questionnaire: {
      versionId: 'peer_mesh.v2',
      pages: [
        {
          questions: [
            {
              key: 'has_died',
              kind: 'single',
              words: w('Has Ram K. died?'),
              options: [
                { code: 'died', words: w('Yes, they have died'), exclusive: false },
                { code: 'not_died', words: w('No, they have not died'), exclusive: false },
              ],
              optional: false,
              showIf: null,
            },
            {
              key: 'death_date',
              kind: 'date',
              words: w('If you know, on what date did they die?'),
              options: [{ code: 'unknown', words: w("I don't know the date"), exclusive: false }],
              optional: true,
              showIf: { key: 'has_died', anyOf: ['died'] },
            },
          ],
        },
      ],
      closingNote: w('Your answers are saved as you go.'),
      thankYou: w('Thank you.'),
    },
    answers,
    submitted: false,
  };
}

vi.mock('../src/api/client.js', async () => {
  const actual = await vi.importActual<typeof import('../src/api/client.js')>('../src/api/client.js');
  return {
    ...actual,
    getHelplinePeerRequests: vi.fn(async () => ({ items: [] })),
    saveHelplinePeerAnswer: vi.fn(async () => ({ answers: [] })),
    submitHelplinePeerReply: vi.fn(async () => ({ submitted: true as const })),
  };
});
const mocked = vi.mocked(api);

describe('<HelplinePeerRequests>', () => {
  beforeEach(() => {
    mocked.getHelplinePeerRequests.mockReset();
    mocked.getHelplinePeerRequests.mockResolvedValue({ items: [] });
    mocked.saveHelplinePeerAnswer.mockReset();
    mocked.saveHelplinePeerAnswer.mockResolvedValue({ answers: [] });
    mocked.submitHelplinePeerReply.mockReset();
    mocked.submitHelplinePeerReply.mockResolvedValue({ submitted: true });
  });

  it('nothing before the caller is selected and read back — and ⛔ call', () => {
    const { container } = renderWithClient(<HelplinePeerRequests pariwarId="p1" memberId={MEMBER} identityConfirmed={false} onStepUpRequired={() => {}} />);
    expect(container).toBeEmptyDOMElement();
    expect(mocked.getHelplinePeerRequests).not.toHaveBeenCalled();
  });

  it('nothing at all when the server lists ⛔ request (DARK until 6.27c texts anyone)', async () => {
    const { container } = renderWithClient(<HelplinePeerRequests pariwarId="p1" memberId={MEMBER} identityConfirmed onStepUpRequired={() => {}} />);
    await waitFor(() => expect(mocked.getHelplinePeerRequests).toHaveBeenCalledWith('p1', MEMBER));
    expect(container).toBeEmptyDOMElement();
  });

  it('the served questions in English; the date only after "died"; a tap records ONE answer for THAT ping', async () => {
    mocked.getHelplinePeerRequests.mockResolvedValue({ items: [item()] });
    renderWithClient(<HelplinePeerRequests pariwarId="p1" memberId={MEMBER} identityConfirmed onStepUpRequired={() => {}} />);
    expect(await screen.findByText('Has Ram K. died?')).toBeInTheDocument();
    expect(screen.queryByText('If you know, on what date did they die?')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Submit' })).toBeDisabled();
    await userEvent.click(screen.getByRole('button', { name: 'Yes, they have died' }));
    await waitFor(() => expect(mocked.saveHelplinePeerAnswer).toHaveBeenCalledWith('p1', PING, 'has_died', { codes: ['died'] }));
  });

  it("the caller's own answers are selected; the date shows; Submit sends THAT ping", async () => {
    mocked.getHelplinePeerRequests.mockResolvedValue({ items: [item([{ questionKey: 'has_died', value: { codes: ['died'] }, savedAt: 'x' }])] });
    renderWithClient(<HelplinePeerRequests pariwarId="p1" memberId={MEMBER} identityConfirmed onStepUpRequired={() => {}} />);
    expect(await screen.findByText('If you know, on what date did they die?')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Yes, they have died' })).toHaveAttribute('aria-pressed', 'true');
    await userEvent.click(screen.getByRole('button', { name: 'Submit' }));
    await waitFor(() => expect(mocked.submitHelplinePeerReply).toHaveBeenCalledWith('p1', PING));
  });

  it('a step-up 403 opens the page\'s step-up panel', async () => {
    mocked.getHelplinePeerRequests.mockRejectedValue(new ApiError(403, 'auth.step_up_required', 'step up'));
    const onStepUp = vi.fn();
    renderWithClient(<HelplinePeerRequests pariwarId="p1" memberId={MEMBER} identityConfirmed onStepUpRequired={onStepUp} />);
    await userEvent.click(await screen.findByRole('button', { name: 'Confirm with a code' }));
    expect(onStepUp).toHaveBeenCalled();
  });

  it('Submit waits for the last answer save, then locks all controls (review R3)', async () => {
    const initial = [{ questionKey: 'has_died', value: { codes: ['died'] }, savedAt: 'x' }];
    mocked.getHelplinePeerRequests.mockResolvedValue({ items: [item(initial)] });
    let finish!: (value: { answers: PeerRequestDetailResponse['answers'] }) => void;
    mocked.saveHelplinePeerAnswer.mockReturnValue(new Promise(resolve => { finish = resolve; }));
    renderWithClient(<HelplinePeerRequests pariwarId="p1" memberId={MEMBER} identityConfirmed onStepUpRequired={() => {}} />);
    await userEvent.click(await screen.findByRole('button', { name: "I don't know the date" }));
    expect(screen.getByRole('button', { name: 'Submit' })).toBeDisabled();
    await userEvent.click(screen.getByRole('button', { name: 'Submit' }));
    expect(mocked.submitHelplinePeerReply).not.toHaveBeenCalled();
    const answers = [...initial, { questionKey: 'death_date', value: { codes: ['unknown'] }, savedAt: 'y' }];
    mocked.getHelplinePeerRequests.mockResolvedValue({ items: [item(answers)] });
    await act(async () => finish({ answers }));
    await waitFor(() => expect(screen.getByRole('button', { name: 'Submit' })).toBeEnabled());
    await userEvent.click(screen.getByRole('button', { name: 'Submit' }));
    await waitFor(() => expect(screen.getByRole('button', { name: 'Yes, they have died' })).toBeDisabled());
  });

  it('two multi-select taps before refetch save both choices (review R12)', async () => {
    const initial = [{ questionKey: 'has_died', value: { codes: ['died'] }, savedAt: 'x' }];
    const request = item(initial);
    request.questionnaire.pages[0]!.questions.push({ key: 'death_illness', kind: 'multi', words: w('Which illness?'), options: ['cancer', 'tb'].map(code => ({ code, words: w(code), exclusive: false })), optional: true, showIf: null });
    mocked.getHelplinePeerRequests.mockResolvedValue({ items: [request] });
    let first!: (value: { answers: PeerRequestDetailResponse['answers'] }) => void;
    let second!: (value: { answers: PeerRequestDetailResponse['answers'] }) => void;
    mocked.saveHelplinePeerAnswer
      .mockReturnValueOnce(new Promise(resolve => { first = resolve; }))
      .mockReturnValueOnce(new Promise(resolve => { second = resolve; }));
    renderWithClient(<HelplinePeerRequests pariwarId="p1" memberId={MEMBER} identityConfirmed onStepUpRequired={() => {}} />);
    await userEvent.click(await screen.findByRole('button', { name: 'cancer' }));
    await userEvent.click(screen.getByRole('button', { name: 'tb' }));
    expect(mocked.saveHelplinePeerAnswer).toHaveBeenCalledTimes(1);
    await act(async () => first({ answers: [...initial, { questionKey: 'death_illness', value: { codes: ['cancer'] }, savedAt: 'y' }] }));
    await waitFor(() => expect(mocked.saveHelplinePeerAnswer).toHaveBeenLastCalledWith('p1', PING, 'death_illness', { codes: ['cancer', 'tb'] }));
    const answers = [...initial, { questionKey: 'death_illness', value: { codes: ['cancer', 'tb'] }, savedAt: 'z' }];
    mocked.getHelplinePeerRequests.mockResolvedValue({ items: [{ ...request, answers }] });
    await act(async () => second({ answers }));
    await waitFor(() => expect(screen.getByRole('button', { name: 'tb' })).toHaveAttribute('aria-pressed', 'true'));
  });

  it('an unavailable saved date stays visible as unavailable (review R10)', async () => {
    mocked.getHelplinePeerRequests.mockResolvedValue({ items: [item([{ questionKey: 'has_died', value: { codes: ['died'] }, savedAt: 'x' }, { questionKey: 'death_date', value: { unavailable: true }, savedAt: 'y' }])] });
    renderWithClient(<HelplinePeerRequests pariwarId="p1" memberId={MEMBER} identityConfirmed onStepUpRequired={() => {}} />);
    expect(await screen.findByRole('alert')).toHaveTextContent('Could not be shown just now.');
  });

  it('answer controls remain frozen throughout a delayed Submit', async () => {
    mocked.getHelplinePeerRequests.mockResolvedValue({ items: [item([{ questionKey: 'has_died', value: { codes: ['died'] }, savedAt: 'x' }])] });
    let finish!: (value: { submitted: true }) => void;
    mocked.submitHelplinePeerReply.mockReturnValue(new Promise(resolve => { finish = resolve; }));
    const busy = vi.fn();
    renderWithClient(<HelplinePeerRequests pariwarId="p1" memberId={MEMBER} identityConfirmed onStepUpRequired={() => {}} onBusyChange={busy} />);
    await userEvent.click(await screen.findByRole('button', { name: 'Submit' }));
    expect(screen.getByRole('button', { name: 'No, they have not died' })).toBeDisabled();
    expect(screen.getByLabelText('If you know, on what date did they die?')).toBeDisabled();
    expect(busy).toHaveBeenLastCalledWith(true);
    await userEvent.click(screen.getByRole('button', { name: 'No, they have not died' }));
    expect(mocked.saveHelplinePeerAnswer).not.toHaveBeenCalled();
    await act(async () => finish({ submitted: true }));
    expect(busy).toHaveBeenLastCalledWith(false);
  });

  it('a step-up save failure keeps the unsaved choice mounted until retry succeeds', async () => {
    const initial = [{ questionKey: 'has_died', value: { codes: ['died'] }, savedAt: 'x' }];
    mocked.getHelplinePeerRequests.mockResolvedValueOnce({ items: [item(initial)] }).mockRejectedValue(new ApiError(403, 'auth.step_up_required', 'step up'));
    mocked.saveHelplinePeerAnswer.mockRejectedValueOnce(new ApiError(403, 'auth.step_up_required', 'step up'));
    const stepUp = vi.fn();
    renderWithClient(<HelplinePeerRequests pariwarId="p1" memberId={MEMBER} identityConfirmed onStepUpRequired={stepUp} />);
    await userEvent.click(await screen.findByRole('button', { name: 'No, they have not died' }));
    await waitFor(() => expect(stepUp).toHaveBeenCalledOnce());
    expect(mocked.getHelplinePeerRequests).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('button', { name: 'No, they have not died' })).toHaveAttribute('aria-pressed', 'true');
    const answers = [{ questionKey: 'has_died', value: { codes: ['not_died'] }, savedAt: 'y' }];
    mocked.saveHelplinePeerAnswer.mockResolvedValue({ answers });
    mocked.getHelplinePeerRequests.mockResolvedValue({ items: [item(answers)] });
    await userEvent.click(screen.getByRole('button', { name: 'Retry saving' }));
    await waitFor(() => expect(screen.getByRole('button', { name: 'Submit' })).toBeEnabled());
    expect(screen.getByRole('status')).toHaveTextContent('Saved');
  });

  it('a failed background list refresh retains queued edits until both saves settle', async () => {
    const initial = [{ questionKey: 'has_died', value: { codes: ['died'] }, savedAt: 'x' }];
    mocked.getHelplinePeerRequests.mockResolvedValueOnce({ items: [item(initial)] }).mockRejectedValue(new ApiError(503, 'temporarily_unavailable', 'offline'));
    let first!: (value: { answers: PeerRequestDetailResponse['answers'] }) => void;
    let second!: (value: { answers: PeerRequestDetailResponse['answers'] }) => void;
    mocked.saveHelplinePeerAnswer
      .mockReturnValueOnce(new Promise(resolve => { first = resolve; }))
      .mockReturnValueOnce(new Promise(resolve => { second = resolve; }));
    renderWithClient(<HelplinePeerRequests pariwarId="p1" memberId={MEMBER} identityConfirmed onStepUpRequired={() => {}} />);
    await userEvent.click(await screen.findByRole('button', { name: "I don't know the date" }));
    await userEvent.click(screen.getByRole('button', { name: 'No, they have not died' }));
    await act(async () => first({ answers: [...initial, { questionKey: 'death_date', value: { codes: ['unknown'] }, savedAt: 'y' }] }));
    expect(await screen.findByRole('alert')).toHaveTextContent('The requests could not be loaded just now.');
    await waitFor(() => expect(mocked.saveHelplinePeerAnswer).toHaveBeenCalledTimes(2));
    expect(screen.getByRole('button', { name: 'No, they have not died' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Submit' })).toBeDisabled();
    const answers = [{ questionKey: 'has_died', value: { codes: ['not_died'] }, savedAt: 'z' }];
    await act(async () => second({ answers }));
    await waitFor(() => expect(screen.getByRole('button', { name: 'Submit' })).toBeEnabled());
    expect(screen.getByRole('status')).toHaveTextContent('Saved');
  });

  it('route navigation waits for queued answers, then succeeds without losing them', async () => {
    const scroll = vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
    const initial = [{ questionKey: 'has_died', value: { codes: ['died'] }, savedAt: 'x' }];
    mocked.getHelplinePeerRequests.mockResolvedValue({ items: [item(initial)] });
    let finish!: (value: { answers: PeerRequestDetailResponse['answers'] }) => void;
    mocked.saveHelplinePeerAnswer.mockReturnValue(new Promise(resolve => { finish = resolve; }));
    const root = createRootRoute({ component: Outlet });
    const form = createRoute({ getParentRoute: () => root, path: '/helpline', component: () => <HelplinePeerRequests pariwarId="p1" memberId={MEMBER} identityConfirmed onStepUpRequired={() => {}} /> });
    const other = createRoute({ getParentRoute: () => root, path: '/other', component: () => <p>Other page</p> });
    const history = createMemoryHistory({ initialEntries: ['/helpline'] });
    const router = createRouter({ routeTree: root.addChildren([form, other]), history });
    renderWithClient(<RouterProvider router={router} />);
    await userEvent.click(await screen.findByRole('button', { name: 'No, they have not died' }));
    await act(async () => { history.push('/other'); await new Promise(resolve => setTimeout(resolve, 0)); });
    expect(history.location.pathname).toBe('/helpline');
    expect(screen.getByRole('status')).toHaveTextContent('Please finish saving');
    const answers = [{ questionKey: 'has_died', value: { codes: ['not_died'] }, savedAt: 'y' }];
    mocked.getHelplinePeerRequests.mockResolvedValue({ items: [item(answers)] });
    await act(async () => finish({ answers }));
    await waitFor(() => expect(screen.getByRole('button', { name: 'Submit' })).toBeEnabled());
    await act(async () => { history.push('/other'); });
    expect(await screen.findByText('Other page')).toBeInTheDocument();
    scroll.mockRestore();
  });
});
