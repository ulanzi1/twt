// `<HelplinePeerRequests>` — Story 6.27a (PM12, PM25 (b); AC6's console half). The api client is mocked (the
// `helpline-certificate-replacement.test.tsx` pattern); the real hooks + Query cache are exercised.
//   · nothing before the caller is selected AND read back; nothing at all when the server lists ⛔ request (DARK until
//     6.27c texts anyone);
//   · the served questions in English, ONLY the shown ones (the date after "died"), the caller's own answers selected;
//   · a tap records ONE answer for THAT ping; Submit needs `has_died`; a step-up 403 opens the page's panel.

import { notifyManager, QueryClientProvider } from '@tanstack/react-query';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { StrictMode } from 'react';
import { createMemoryHistory, createRootRoute, createRoute, createRouter, Outlet, RouterProvider } from '@tanstack/react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { RELOAD_REFETCH_BOUND_MS } from '@twt/api-client';
import type { PeerRequestDetailResponse } from '@twt/contracts';

import * as api from '../src/api/client.js';
import { ApiError } from '../src/api/client.js';
import { createQueryClient } from '../src/api/hooks.js';
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
    await userEvent.click(screen.getByRole('radio', { name: 'Yes, they have died' }));
    await waitFor(() => expect(mocked.saveHelplinePeerAnswer).toHaveBeenCalledWith('p1', MEMBER, PING, 'has_died', { codes: ['died'] }, expect.any(String), 'peer_mesh.v2'));
  });

  it("the caller's own answers are selected; the date shows; Submit sends THAT ping", async () => {
    mocked.getHelplinePeerRequests.mockResolvedValue({ items: [item([{ questionKey: 'has_died', value: { codes: ['died'] }, savedAt: 'x' }])] });
    renderWithClient(<HelplinePeerRequests pariwarId="p1" memberId={MEMBER} identityConfirmed onStepUpRequired={() => {}} />);
    expect(await screen.findByText('If you know, on what date did they die?')).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'Yes, they have died' })).toHaveAttribute('aria-checked', 'true');
    await userEvent.click(screen.getByRole('button', { name: 'Submit' }));
    await waitFor(() => expect(mocked.submitHelplinePeerReply).toHaveBeenCalledWith('p1', MEMBER, PING, expect.any(String)));
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
    await userEvent.click(await screen.findByRole('radio', { name: "I don't know the date" }));
    expect(screen.getByRole('button', { name: 'Submit' })).toBeDisabled();
    await userEvent.click(screen.getByRole('button', { name: 'Submit' }));
    expect(mocked.submitHelplinePeerReply).not.toHaveBeenCalled();
    const answers = [...initial, { questionKey: 'death_date', value: { codes: ['unknown'] }, savedAt: 'y' }];
    mocked.getHelplinePeerRequests.mockResolvedValue({ items: [item(answers)] });
    await act(async () => finish({ answers }));
    await waitFor(() => expect(screen.getByRole('button', { name: 'Submit' })).toBeEnabled());
    await userEvent.click(screen.getByRole('button', { name: 'Submit' }));
    await waitFor(() => expect(screen.getByRole('radio', { name: 'Yes, they have died' })).toBeDisabled());
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
    await userEvent.click(await screen.findByRole('checkbox', { name: 'cancer' }));
    await userEvent.click(screen.getByRole('checkbox', { name: 'tb' }));
    expect(mocked.saveHelplinePeerAnswer).toHaveBeenCalledTimes(1);
    await act(async () => first({ answers: [...initial, { questionKey: 'death_illness', value: { codes: ['cancer'] }, savedAt: 'y' }] }));
    await waitFor(() => expect(mocked.saveHelplinePeerAnswer).toHaveBeenLastCalledWith('p1', MEMBER, PING, 'death_illness', { codes: ['cancer', 'tb'] }, expect.any(String), 'peer_mesh.v2'));
    const answers = [...initial, { questionKey: 'death_illness', value: { codes: ['cancer', 'tb'] }, savedAt: 'z' }];
    mocked.getHelplinePeerRequests.mockResolvedValue({ items: [{ ...request, answers }] });
    await act(async () => second({ answers }));
    await waitFor(() => expect(screen.getByRole('checkbox', { name: 'tb' })).toHaveAttribute('aria-checked', 'true'));
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
    expect(screen.getByRole('radio', { name: 'No, they have not died' })).toBeDisabled();
    expect(screen.getByLabelText('If you know, on what date did they die?', { selector: 'input' })).toBeDisabled();
    expect(busy).toHaveBeenLastCalledWith(true);
    await userEvent.click(screen.getByRole('radio', { name: 'No, they have not died' }));
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
    await userEvent.click(await screen.findByRole('radio', { name: 'No, they have not died' }));
    await waitFor(() => expect(stepUp).toHaveBeenCalledOnce());
    expect(mocked.getHelplinePeerRequests).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('radio', { name: 'No, they have not died' })).toHaveAttribute('aria-checked', 'true');
    const answers = [{ questionKey: 'has_died', value: { codes: ['not_died'] }, savedAt: 'y' }];
    mocked.saveHelplinePeerAnswer.mockResolvedValue({ answers });
    mocked.getHelplinePeerRequests.mockResolvedValue({ items: [item(answers)] });
    await userEvent.click(screen.getByRole('button', { name: 'Retry saving' }));
    await waitFor(() => expect(screen.getByRole('button', { name: 'Submit' })).toBeEnabled());
    expect(screen.getByRole('status')).toHaveTextContent('Saved');
  });

  it('acknowledged saves PATCH the cache — ⛔ a re-read of the gated list per tap (review S36); queued edits settle in order', async () => {
    const initial = [{ questionKey: 'has_died', value: { codes: ['died'] }, savedAt: 'x' }];
    mocked.getHelplinePeerRequests.mockResolvedValueOnce({ items: [item(initial)] }).mockRejectedValue(new ApiError(503, 'temporarily_unavailable', 'offline'));
    let first!: (value: { answers: PeerRequestDetailResponse['answers'] }) => void;
    let second!: (value: { answers: PeerRequestDetailResponse['answers'] }) => void;
    mocked.saveHelplinePeerAnswer
      .mockReturnValueOnce(new Promise(resolve => { first = resolve; }))
      .mockReturnValueOnce(new Promise(resolve => { second = resolve; }));
    renderWithClient(<HelplinePeerRequests pariwarId="p1" memberId={MEMBER} identityConfirmed onStepUpRequired={() => {}} />);
    await userEvent.click(await screen.findByRole('radio', { name: "I don't know the date" }));
    await userEvent.click(screen.getByRole('radio', { name: 'No, they have not died' }));
    await act(async () => first({ answers: [...initial, { questionKey: 'death_date', value: { codes: ['unknown'] }, savedAt: 'y' }] }));
    await waitFor(() => expect(mocked.saveHelplinePeerAnswer).toHaveBeenCalledTimes(2));
    expect(mocked.getHelplinePeerRequests).toHaveBeenCalledTimes(1); // ⛔ a gated, decrypting re-read per save
    expect(screen.getByRole('radio', { name: 'No, they have not died' })).toHaveAttribute('aria-checked', 'true');
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
    await userEvent.click(await screen.findByRole('radio', { name: 'No, they have not died' }));
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
  it('a FAILED first load offers "Try again", which reads the list again (review S34)', async () => {
    mocked.getHelplinePeerRequests.mockRejectedValueOnce(new ApiError(503, 'temporarily_unavailable', 'down')).mockResolvedValue({ items: [item()] });
    renderWithClient(<HelplinePeerRequests pariwarId="p1" memberId={MEMBER} identityConfirmed onStepUpRequired={() => {}} />);
    await userEvent.click(await screen.findByRole('button', { name: 'Try again' }));
    expect(await screen.findByText('Has Ram K. died?')).toBeInTheDocument();
  });

  it('a REFUSED answer can be discarded — the saved value returns and the operator is ⛔ stuck on this caller (review S34)', async () => {
    mocked.getHelplinePeerRequests.mockResolvedValue({ items: [item([{ questionKey: 'has_died', value: { codes: ['died'] }, savedAt: 'x' }])] });
    mocked.saveHelplinePeerAnswer.mockRejectedValueOnce(new ApiError(422, 'peer_request.invalid_answer', 'invalid'));
    const busy = vi.fn();
    renderWithClient(<HelplinePeerRequests pariwarId="p1" memberId={MEMBER} identityConfirmed onStepUpRequired={() => {}} onBusyChange={busy} />);
    await userEvent.click(await screen.findByRole('radio', { name: 'No, they have not died' }));
    await userEvent.click(await screen.findByRole('button', { name: 'Discard the unsaved answer' }));
    expect(screen.getByRole('radio', { name: 'Yes, they have died' })).toHaveAttribute('aria-checked', 'true');
    expect(busy).toHaveBeenLastCalledWith(false);
    expect(screen.getByRole('button', { name: 'Submit' })).toBeEnabled();
  });

  it('after Submit the request leaves the list, but its OUTCOME line stays for the operator (review S34)', async () => {
    mocked.getHelplinePeerRequests
      .mockResolvedValueOnce({ items: [item([{ questionKey: 'has_died', value: { codes: ['died'] }, savedAt: 'x' }])] })
      .mockResolvedValue({ items: [] });
    renderWithClient(<HelplinePeerRequests pariwarId="p1" memberId={MEMBER} identityConfirmed onStepUpRequired={() => {}} />);
    await userEvent.click(await screen.findByRole('button', { name: 'Submit' }));
    await waitFor(() => expect(screen.queryByRole('button', { name: 'Submit' })).not.toBeInTheDocument());
    expect(screen.getByText('Request about Ram K.: Sent — the answers are locked.')).toBeInTheDocument();
  });

  it('a date TYPED but ⛔ saved blocks Submit with a named notice — ⛔ silently dropped (review S35)', async () => {
    mocked.getHelplinePeerRequests.mockResolvedValue({ items: [item([{ questionKey: 'has_died', value: { codes: ['died'] }, savedAt: 'x' }])] });
    const busy = vi.fn();
    renderWithClient(<HelplinePeerRequests pariwarId="p1" memberId={MEMBER} identityConfirmed onStepUpRequired={() => {}} onBusyChange={busy} />);
    const input = await screen.findByLabelText('If you know, on what date did they die?', { selector: 'input' });
    expect(input).toHaveAttribute('min', '1900-01-01');
    expect(input).toHaveAttribute('max');
    await userEvent.type(input, '2026-10-01');
    expect(screen.getByRole('button', { name: 'Submit' })).toBeDisabled();
    expect(screen.getByText(/A date was typed but not saved/)).toBeInTheDocument();
    await waitFor(() => expect(busy).toHaveBeenLastCalledWith(true));
    // "I don't know the date" replaces the typed date
    mocked.saveHelplinePeerAnswer.mockResolvedValue({
      answers: [{ questionKey: 'has_died', value: { codes: ['died'] }, savedAt: 'x' }, { questionKey: 'death_date', value: { codes: ['unknown'] }, savedAt: 'y' }],
    });
    await userEvent.click(screen.getByRole('radio', { name: "I don't know the date" }));
    await waitFor(() => expect(screen.getByRole('button', { name: 'Submit' })).toBeEnabled());
  });

  it("Submit waits for EVERY required question the caller is shown — ⛔ a hard-coded 'has_died' (review S36)", async () => {
    const request = item([{ questionKey: 'has_died', value: { codes: ['died'] }, savedAt: 'x' }]);
    request.questionnaire.pages[0]!.questions.push({ key: 'how_known', kind: 'single', words: w('How do you know?'), options: ['saw', 'told'].map((code) => ({ code, words: w(code), exclusive: false })), optional: false, showIf: null });
    mocked.getHelplinePeerRequests.mockResolvedValue({ items: [request] });
    mocked.saveHelplinePeerAnswer.mockResolvedValue({ answers: [...request.answers, { questionKey: 'how_known', value: { codes: ['saw'] }, savedAt: 'y' }] });
    renderWithClient(<HelplinePeerRequests pariwarId="p1" memberId={MEMBER} identityConfirmed onStepUpRequired={() => {}} />);
    expect(await screen.findByRole('button', { name: 'Submit' })).toBeDisabled();
    expect(screen.getByRole('radiogroup', { name: 'How do you know?' })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('radio', { name: 'saw' }));
    await waitFor(() => expect(screen.getByRole('button', { name: 'Submit' })).toBeEnabled());
  });
  it('emptying a typed date is ⛔ a phantom "unsaved" date — Submit is free again (third-pass U13 (a))', async () => {
    mocked.getHelplinePeerRequests.mockResolvedValue({ items: [item([{ questionKey: 'has_died', value: { codes: ['died'] }, savedAt: 'x' }])] });
    renderWithClient(<HelplinePeerRequests pariwarId="p1" memberId={MEMBER} identityConfirmed onStepUpRequired={() => {}} />);
    const input = await screen.findByLabelText('If you know, on what date did they die?', { selector: 'input' });
    await userEvent.type(input, '2026-10-01');
    expect(screen.getByRole('button', { name: 'Submit' })).toBeDisabled();
    await userEvent.clear(input);
    expect(screen.queryByText(/A date was typed but not saved/)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Submit' })).toBeEnabled();
  });

  it('the OUTCOME line survives a post-Submit re-read REFUSED outright — the early-return panel keeps it (U13 (b), fourth-pass V10 (a))', async () => {
    mocked.getHelplinePeerRequests
      .mockResolvedValueOnce({ items: [item([{ questionKey: 'has_died', value: { codes: ['died'] }, savedAt: 'x' }])] })
      .mockRejectedValue(new ApiError(403, 'auth.forbidden', 'no longer permitted')); // ⛔ retained: the early-return branch
    renderWithClient(<HelplinePeerRequests pariwarId="p1" memberId={MEMBER} identityConfirmed onStepUpRequired={() => {}} />);
    await userEvent.click(await screen.findByRole('button', { name: 'Submit' }));
    // the refusal panel replaced the cards …
    expect(await screen.findByRole('button', { name: 'Try again' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Submit' })).not.toBeInTheDocument();
    // … and the outcome line is still there
    expect(screen.getByText('Request about Ram K.: Sent — the answers are locked.')).toBeInTheDocument();
  });

  it('a FAILED background re-read keeps the loaded editor and its choices, with the alert beside it (third-pass U15 (a))', async () => {
    mocked.getHelplinePeerRequests
      .mockResolvedValueOnce({ items: [item([{ questionKey: 'has_died', value: { codes: ['died'] }, savedAt: 'x' }])] })
      .mockRejectedValue(new ApiError(503, 'temporarily_unavailable', 'offline'));
    // a 401 on a save re-reads the list (the hook's terminal-refusal path) — that re-read then FAILS transiently
    mocked.saveHelplinePeerAnswer.mockRejectedValueOnce(new ApiError(401, 'auth.session_required', 'expired'));
    renderWithClient(<HelplinePeerRequests pariwarId="p1" memberId={MEMBER} identityConfirmed onStepUpRequired={() => {}} />);
    await userEvent.click(await screen.findByRole('radio', { name: 'No, they have not died' }));
    expect(await screen.findByText('The requests could not be loaded just now.')).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'No, they have not died' })).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByRole('button', { name: 'Retry saving' })).toBeInTheDocument();
  });
  it('a 409 STALE retries itself (bounded) — the operator ⛔ sees "Not saved" for a value that went through (fourth-pass V7)', async () => {
    mocked.getHelplinePeerRequests.mockResolvedValue({ items: [item([{ questionKey: 'has_died', value: { codes: ['died'] }, savedAt: 'x' }])] });
    mocked.saveHelplinePeerAnswer
      .mockRejectedValueOnce(new ApiError(409, 'peer_request.stale', 'try again'))
      .mockResolvedValueOnce({ answers: [{ questionKey: 'has_died', value: { codes: ['not_died'] }, savedAt: 'y' }] });
    renderWithClient(<HelplinePeerRequests pariwarId="p1" memberId={MEMBER} identityConfirmed onStepUpRequired={() => {}} />);
    await userEvent.click(await screen.findByRole('radio', { name: 'No, they have not died' }));
    await waitFor(() => expect(mocked.saveHelplinePeerAnswer).toHaveBeenCalledTimes(2));
    const keys = mocked.saveHelplinePeerAnswer.mock.calls.map((c) => c[5]);
    expect(keys[1]).toBe(keys[0]); // the SAME key on the retry
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('Saved'));
    expect(screen.queryByRole('button', { name: 'Retry saving' })).not.toBeInTheDocument();
  });

  it('…and a stale that keeps coming back stops after 3 retries, with Retry offered (V7 is BOUNDED)', async () => {
    mocked.getHelplinePeerRequests.mockResolvedValue({ items: [item([{ questionKey: 'has_died', value: { codes: ['died'] }, savedAt: 'x' }])] });
    mocked.saveHelplinePeerAnswer.mockRejectedValue(new ApiError(409, 'peer_request.stale', 'try again'));
    renderWithClient(<HelplinePeerRequests pariwarId="p1" memberId={MEMBER} identityConfirmed onStepUpRequired={() => {}} />);
    await userEvent.click(await screen.findByRole('radio', { name: 'No, they have not died' }));
    expect(await screen.findByRole('button', { name: 'Retry saving' }, { timeout: 4000 })).toBeInTheDocument();
    expect(mocked.saveHelplinePeerAnswer).toHaveBeenCalledTimes(4); // the first + 3 retries
  });

  it('a PARTIAL date (the native input reads "" with badInput) stays an unsaved edit — ⛔ dropped (fourth-pass V6)', async () => {
    mocked.getHelplinePeerRequests.mockResolvedValue({ items: [item([{ questionKey: 'has_died', value: { codes: ['died'] }, savedAt: 'x' }])] });
    renderWithClient(<HelplinePeerRequests pariwarId="p1" memberId={MEMBER} identityConfirmed onStepUpRequired={() => {}} />);
    const input = (await screen.findByLabelText('If you know, on what date did they die?', { selector: 'input' })) as HTMLInputElement;
    fireEvent.change(input, { target: { value: '2026-10-01' } }); // a complete date …
    Object.defineProperty(input, 'validity', { value: { badInput: true }, configurable: true });
    fireEvent.change(input, { target: { value: '' } }); // … a segment deleted: the input reports '' with badInput
    expect(screen.getByText(/A date was typed but not saved/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Submit' })).toBeDisabled();
  });
  it("the stale budget is PER TASK — after it runs out, the operator's Retry gets a FRESH one (fifth-pass W4)", async () => {
    mocked.getHelplinePeerRequests.mockResolvedValue({ items: [item([{ questionKey: 'has_died', value: { codes: ['died'] }, savedAt: 'x' }])] });
    mocked.saveHelplinePeerAnswer.mockRejectedValue(new ApiError(409, 'peer_request.stale', 'try again'));
    renderWithClient(<HelplinePeerRequests pariwarId="p1" memberId={MEMBER} identityConfirmed onStepUpRequired={() => {}} />);
    await userEvent.click(await screen.findByRole('radio', { name: 'No, they have not died' }));
    const retry = await screen.findByRole('button', { name: 'Retry saving' }, { timeout: 4000 });
    expect(mocked.saveHelplinePeerAnswer).toHaveBeenCalledTimes(4);
    await userEvent.click(retry);
    await screen.findByRole('button', { name: 'Retry saving' }, { timeout: 4000 });
    expect(mocked.saveHelplinePeerAnswer).toHaveBeenCalledTimes(8); // a fresh first + 3 retries, ⛔ an exhausted budget
    const keys = mocked.saveHelplinePeerAnswer.mock.calls.map((c) => c[5]);
    expect(keys[4]).not.toBe(keys[0]); // the operator's Retry carries a FRESH key (W6)
  });

  it('a PARTIAL date typed into an EMPTY field is caught on BLUR and holds Submit; Clear empties the field (fifth-pass W5)', async () => {
    mocked.getHelplinePeerRequests.mockResolvedValue({ items: [item([{ questionKey: 'has_died', value: { codes: ['died'] }, savedAt: 'x' }])] });
    renderWithClient(<HelplinePeerRequests pariwarId="p1" memberId={MEMBER} identityConfirmed onStepUpRequired={() => {}} />);
    const input = (await screen.findByLabelText('If you know, on what date did they die?', { selector: 'input' })) as HTMLInputElement;
    // empty → half-typed: the value stays '' — ⛔ change event fires; the browser flags badInput
    Object.defineProperty(input, 'validity', { value: { badInput: true }, configurable: true });
    fireEvent.blur(input);
    expect(screen.getByText(/A date was typed but not saved/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Submit' })).toBeDisabled();
    input.value = '2026-1'; // what a half-typed segment leaves in a real browser's DOM (jsdom keeps it as set)
    await userEvent.click(screen.getByRole('button', { name: 'Clear the date' }));
    expect(input.value).toBe(''); // Clear reset the FIELD itself (W5) — ⛔ only the state
    Object.defineProperty(input, 'validity', { value: { badInput: false }, configurable: true });
    expect(screen.queryByText(/A date was typed but not saved/)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Submit' })).toBeEnabled();
  });

  it('Submit itself refuses a partial date no event reported (fifth-pass W5)', async () => {
    mocked.getHelplinePeerRequests.mockResolvedValue({ items: [item([{ questionKey: 'has_died', value: { codes: ['died'] }, savedAt: 'x' }])] });
    renderWithClient(<HelplinePeerRequests pariwarId="p1" memberId={MEMBER} identityConfirmed onStepUpRequired={() => {}} />);
    const input = (await screen.findByLabelText('If you know, on what date did they die?', { selector: 'input' })) as HTMLInputElement;
    Object.defineProperty(input, 'validity', { value: { badInput: true }, configurable: true });
    fireEvent.click(screen.getByRole('button', { name: 'Submit' })); // ⛔ blur happened (e.g. keyboard Enter)
    expect(mocked.submitHelplinePeerReply).not.toHaveBeenCalled();
    expect(await screen.findByText(/A date was typed but not saved/)).toBeInTheDocument();
  });
  it('tabbing THROUGH a field that shows the SAVED date is ⛔ an edit — Submit stays free (fifth-pass follow-up X1)', async () => {
    mocked.getHelplinePeerRequests.mockResolvedValue({
      items: [item([{ questionKey: 'has_died', value: { codes: ['died'] }, savedAt: 'x' }, { questionKey: 'death_date', value: { date: '2026-10-01' }, savedAt: 'y' }])],
    });
    renderWithClient(<HelplinePeerRequests pariwarId="p1" memberId={MEMBER} identityConfirmed onStepUpRequired={() => {}} />);
    const input = (await screen.findByLabelText('If you know, on what date did they die?', { selector: 'input' })) as HTMLInputElement;
    expect(input.value).toBe('2026-10-01');
    fireEvent.focus(input);
    fireEvent.blur(input);
    expect(screen.queryByText(/A date was typed but not saved/)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Submit' })).toBeEnabled();
  });

  it('⭐ Story 6.33 (R7) — a VERSION-stale save RELOADS the list (⛔ a retry): the card is rebuilt and the unsaved answer re-recorded on the new version', async () => {
    const v1001 = { ...item(), questionnaire: { ...item().questionnaire, versionId: 'peer_mesh.v1001' } };
    mocked.getHelplinePeerRequests.mockResolvedValueOnce({ items: [item()] }).mockResolvedValue({ items: [v1001] });
    mocked.saveHelplinePeerAnswer.mockRejectedValueOnce(new ApiError(409, 'peer_request.questionnaire_version_stale', 'changed'));
    renderWithClient(<HelplinePeerRequests pariwarId="p1" memberId={MEMBER} identityConfirmed onStepUpRequired={() => {}} />);
    await userEvent.click(await screen.findByRole('radio', { name: 'Yes, they have died' }));
    await waitFor(() => expect(mocked.getHelplinePeerRequests).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(mocked.saveHelplinePeerAnswer).toHaveBeenCalledTimes(2));
    expect(mocked.saveHelplinePeerAnswer.mock.calls[0]!.at(-1)).toBe('peer_mesh.v2');
    expect(mocked.saveHelplinePeerAnswer.mock.calls[1]!.slice(3)).toEqual(['has_died', { codes: ['died'] }, expect.any(String), 'peer_mesh.v1001']);
  });

  it('⭐ Story 6.33 (R7 (v)) — an UNREADABLE pinned version ends the request for this call (said; ⛔ retried, ⛔ reloaded)', async () => {
    mocked.getHelplinePeerRequests.mockResolvedValue({ items: [item()] });
    mocked.saveHelplinePeerAnswer.mockRejectedValue(new ApiError(409, 'peer_request.questionnaire_version_unreadable', 'x'));
    renderWithClient(<HelplinePeerRequests pariwarId="p1" memberId={MEMBER} identityConfirmed onStepUpRequired={() => {}} />);
    await userEvent.click(await screen.findByRole('radio', { name: 'Yes, they have died' }));
    expect((await screen.findAllByText(/cannot be answered just now/)).length).toBeGreaterThan(0);
    expect(mocked.saveHelplinePeerAnswer).toHaveBeenCalledTimes(1);
  });
});

describe('<HelplinePeerRequests> — Story 6.33 review RV7 / RV8', () => {
  const LIST_KEY = ['helpline-peer-requests', 'p1', MEMBER];
  const V1001 = 'peer_mesh.v1001';
  const at = (id: string): PeerRequestDetailResponse => ({ ...item(), questionnaire: { ...item().questionnaire, versionId: id } });
  const stale = () => new ApiError(409, 'peer_request.questionnaire_version_stale', 'changed');
  const never = () => new Promise<never>(() => {});
  const saves = () => mocked.saveHelplinePeerAnswer.mock.calls;
  const diedAnswers = [{ questionKey: 'has_died', value: { codes: ['died'] }, savedAt: 'x' }];
  const acknowledged = async () => ({ answers: diedAnswers });
  // What the "once" legs below observe: the 0 ms apply-timer is ⛔ run a second time within these 60 ms. A retry armed BEHIND a
  // longer wait (the stale wait of 300 ms × attempt) is ⛔ what they cover — the RP19 legs at the end of this file run that wait out
  // on a fake clock (review RP19).
  const settle = () => act(async () => { await new Promise((r) => setTimeout(r, 60)); });
  function renderOwn(memberId: string = MEMBER, strict = false) {
    const client = createQueryClient();
    const ui = (id: string) => (
      <QueryClientProvider client={client}>
        <HelplinePeerRequests pariwarId="p1" memberId={id} identityConfirmed onStepUpRequired={() => {}} />
      </QueryClientProvider>
    );
    const out = render(strict ? <StrictMode>{ui(memberId)}</StrictMode> : ui(memberId));
    return { client, rerenderFor: (id: string) => out.rerender(strict ? <StrictMode>{ui(id)}</StrictMode> : ui(id)) };
  }

  beforeEach(() => {
    mocked.getHelplinePeerRequests.mockReset();
    mocked.saveHelplinePeerAnswer.mockReset();
    mocked.submitHelplinePeerReply.mockReset();
  });

  it('RV7 — an ASYNC reload that changes the data FIRST and bumps the generation LATER: the answer is re-recorded on the final card — once — and ⛔ lost', async () => {
    let finishRefetch!: () => void;
    mocked.getHelplinePeerRequests
      .mockResolvedValueOnce({ items: [item()] })
      .mockImplementationOnce(() => new Promise((resolve) => { finishRefetch = () => resolve({ items: [at(V1001)] }); }));
    mocked.saveHelplinePeerAnswer
      .mockRejectedValueOnce(stale()) // 1 — v2: the version moved
      .mockImplementationOnce(never) // 2 — the card built from the CHANGED DATA: its save is still on the wire …
      .mockImplementation(acknowledged); // 3 — … when the generation bump replaces it
    const { client } = renderOwn();
    await userEvent.click(await screen.findByRole('radio', { name: 'Yes, they have died' }));
    await waitFor(() => expect(mocked.getHelplinePeerRequests).toHaveBeenCalledTimes(2)); // the reload's refetch, still pending
    // while it is pending the card SAYS the questions are being updated — ⛔ "Saving…"
    expect(within(screen.getByRole('article')).getByText(/updating them/)).toBeInTheDocument();
    expect(within(screen.getByRole('article')).queryByText('Saving…')).toBeNull();
    act(() => client.setQueryData(LIST_KEY, { items: [at(V1001)] })); // the data changes (key …v1001:0) …
    await waitFor(() => expect(saves()).toHaveLength(2));
    expect(saves()[1]!.slice(3)).toEqual(['has_died', { codes: ['died'] }, expect.any(String), V1001]);
    await act(async () => finishRefetch()); // … and only NOW the refetch resolves and the generation moves (key …v1001:1)
    await waitFor(() => expect(saves()).toHaveLength(3));
    expect(saves()[2]!.slice(3)).toEqual(['has_died', { codes: ['died'] }, expect.any(String), V1001]);
    await waitFor(() => expect(screen.getByRole('radio', { name: 'Yes, they have died' })).toHaveAttribute('aria-checked', 'true'));
    await settle();
    expect(saves()).toHaveLength(3); // the 0 ms apply ran ONCE on the final card — ⛔ run again within 60 ms
  });

  it('RV7 — a BACKGROUND refetch that brings a new version (no reload) hands the unsent answer over too', async () => {
    mocked.getHelplinePeerRequests.mockResolvedValue({ items: [item()] });
    mocked.saveHelplinePeerAnswer.mockImplementationOnce(never).mockImplementation(acknowledged);
    const { client } = renderOwn();
    await userEvent.click(await screen.findByRole('radio', { name: 'Yes, they have died' }));
    await waitFor(() => expect(saves()).toHaveLength(1));
    act(() => client.setQueryData(LIST_KEY, { items: [at(V1001)] }));
    await waitFor(() => expect(saves()).toHaveLength(2));
    expect(saves()[1]!.slice(3)).toEqual(['has_died', { codes: ['died'] }, expect.any(String), V1001]);
    await settle();
    expect(saves()).toHaveLength(2);
  });

  it('RV7 — a SECOND rebuild before the first card applied what it was handed — with a publish on it in between — loses nothing', async () => {
    mocked.getHelplinePeerRequests.mockResolvedValue({ items: [item()] });
    mocked.saveHelplinePeerAnswer.mockImplementationOnce(never).mockImplementation(acknowledged);
    const { client } = renderOwn();
    await userEvent.click(await screen.findByRole('radio', { name: 'Yes, they have died' }));
    await waitFor(() => expect(saves()).toHaveLength(1));
    // Three cache writes in ONE tick, each rendered at once (the query client's notifications made synchronous): the v1001
    // card is built and re-reads its answers (a publish with NO drafts of its own — the answers must really differ, or the
    // cache keeps the old object) before its 0 ms apply-timer can fire, then v1002 replaces it — the answer must still reach v1002.
    notifyManager.setScheduler((cb) => cb());
    try {
      act(() => client.setQueryData(LIST_KEY, { items: [at(V1001)] }));
      act(() => client.setQueryData(LIST_KEY, { items: [{ ...at(V1001), answers: [{ questionKey: 'death_date', value: { date: '2026-10-01' }, savedAt: 'y' }] }] }));
      act(() => client.setQueryData(LIST_KEY, { items: [at('peer_mesh.v1002')] }));
    } finally {
      notifyManager.setScheduler((cb) => setTimeout(cb, 0));
    }
    await waitFor(() => expect(saves()).toHaveLength(2));
    expect(saves()[1]!.slice(3)).toEqual(['has_died', { codes: ['died'] }, expect.any(String), 'peer_mesh.v1002']);
    await settle();
    expect(saves()).toHaveLength(2);
  });

  it('RV7 — Strict Mode (setup → cleanup → setup): the carried answer is recorded ONCE', async () => {
    mocked.getHelplinePeerRequests.mockResolvedValueOnce({ items: [item()] }).mockResolvedValue({ items: [at(V1001)] });
    mocked.saveHelplinePeerAnswer.mockRejectedValueOnce(stale()).mockImplementation(acknowledged);
    renderOwn(MEMBER, true);
    await userEvent.click(await screen.findByRole('radio', { name: 'Yes, they have died' }));
    await waitFor(() => expect(saves()).toHaveLength(2));
    await settle();
    expect(saves()).toHaveLength(2);
    expect(saves()[1]!.slice(3)).toEqual(['has_died', { codes: ['died'] }, expect.any(String), V1001]);
  });

  it('RV7 — an answer unsent for ONE caller is ⛔ re-sent when the operator comes back to that caller later', async () => {
    const OTHER = '33333333-3333-4333-8333-333333333333';
    mocked.getHelplinePeerRequests.mockImplementation(async (_p, memberId) => ({ items: memberId === MEMBER ? [item()] : [] }));
    mocked.saveHelplinePeerAnswer.mockImplementationOnce(never).mockImplementation(acknowledged);
    const { rerenderFor } = renderOwn();
    await userEvent.click(await screen.findByRole('radio', { name: 'Yes, they have died' }));
    await waitFor(() => expect(saves()).toHaveLength(1));
    rerenderFor(OTHER);
    await waitFor(() => expect(screen.queryByRole('article')).toBeNull());
    rerenderFor(MEMBER);
    await screen.findByRole('radio', { name: 'Yes, they have died' });
    await settle();
    expect(saves()).toHaveLength(1);
  });

  it('RV8 — a FAILED reload refetch says so ON the card, keeps the answer, and "Try again" reads the list again', async () => {
    mocked.getHelplinePeerRequests
      .mockResolvedValueOnce({ items: [item()] })
      .mockRejectedValueOnce(new ApiError(503, 'http.503', 'down'))
      .mockResolvedValue({ items: [at(V1001)] });
    mocked.saveHelplinePeerAnswer.mockRejectedValueOnce(stale()).mockImplementation(acknowledged);
    renderOwn();
    await userEvent.click(await screen.findByRole('radio', { name: 'Yes, they have died' }));
    const card = within(await screen.findByRole('article'));
    expect(await card.findByTestId('peer-reload-failed')).toHaveTextContent('could not be updated just now');
    expect(card.queryByText('Saving…')).toBeNull(); // ⛔ stuck at "Saving…"
    expect(saves()).toHaveLength(1);
    await userEvent.click(card.getByRole('button', { name: 'Try again' }));
    await waitFor(() => expect(mocked.getHelplinePeerRequests).toHaveBeenCalledTimes(3));
    await waitFor(() => expect(saves()).toHaveLength(2)); // the kept answer, on the new version
    expect(saves()[1]!.slice(3)).toEqual(['has_died', { codes: ['died'] }, expect.any(String), V1001]);
    await waitFor(() => expect(screen.queryByTestId('peer-reload-failed')).toBeNull());
    await waitFor(() => expect(screen.getByRole('radio', { name: 'Yes, they have died' })).toHaveAttribute('aria-checked', 'true'));
  });

  it('RV8 — "Try again" can fail again and again; the card keeps saying so and ⛔ loses the answer', async () => {
    mocked.getHelplinePeerRequests
      .mockResolvedValueOnce({ items: [item()] })
      .mockRejectedValueOnce(new ApiError(503, 'http.503', 'down'))
      .mockRejectedValueOnce(new ApiError(503, 'http.503', 'down'))
      .mockResolvedValue({ items: [at(V1001)] });
    mocked.saveHelplinePeerAnswer.mockRejectedValueOnce(stale()).mockImplementation(acknowledged);
    renderOwn();
    await userEvent.click(await screen.findByRole('radio', { name: 'Yes, they have died' }));
    const card = within(await screen.findByRole('article'));
    await card.findByTestId('peer-reload-failed');
    await userEvent.click(card.getByRole('button', { name: 'Try again' }));
    await waitFor(() => expect(mocked.getHelplinePeerRequests).toHaveBeenCalledTimes(3));
    await card.findByTestId('peer-reload-failed');
    expect(saves()).toHaveLength(1);
    await userEvent.click(card.getByRole('button', { name: 'Try again' }));
    await waitFor(() => expect(saves()).toHaveLength(2));
    expect(saves()[1]!.slice(3)).toEqual(['has_died', { codes: ['died'] }, expect.any(String), V1001]);
  });
});

describe('<HelplinePeerRequests> — Story 6.33 review RP9 / RP19', () => {
  const LIST_KEY = ['helpline-peer-requests', 'p1', MEMBER];
  const V1001 = 'peer_mesh.v1001';
  const at = (id: string): PeerRequestDetailResponse => ({ ...item(), questionnaire: { ...item().questionnaire, versionId: id } });
  const versionStale = () => new ApiError(409, 'peer_request.questionnaire_version_stale', 'changed');
  const never = () => new Promise<never>(() => {});
  const saves = () => mocked.saveHelplinePeerAnswer.mock.calls;
  const acknowledged = async () => ({ answers: [{ questionKey: 'has_died', value: { codes: ['died'] }, savedAt: 'x' }] });
  let actEnvironment: boolean | undefined;
  /** Past the 300 ms stale wait of the first attempt (the other screens back off for 1 s). */
  const PAST_RETRY_MS = 1_100;
  const advance = (ms: number) => act(async () => { await vi.advanceTimersByTimeAsync(ms); });
  /** A click, and the fake clock's 0 ms notifications it sets off, inside ONE act (⛔ React updates outside it). */
  const click = (el: HTMLElement) => act(async () => { fireEvent.click(el); await vi.advanceTimersByTimeAsync(0); });
  function renderOwn() {
    const client = createQueryClient();
    render(
      <QueryClientProvider client={client}>
        <HelplinePeerRequests pariwarId="p1" memberId={MEMBER} identityConfirmed onStepUpRequired={() => {}} />
      </QueryClientProvider>,
    );
    return client;
  }

  beforeEach(() => {
    mocked.getHelplinePeerRequests.mockReset();
    mocked.saveHelplinePeerAnswer.mockReset();
    mocked.submitHelplinePeerReply.mockReset();
    // The fake clock keeps ticking in real time (`shouldAdvanceTime`), so its 0 ms notifications land BETWEEN the test's awaits —
    // outside any `act`, which is not a defect of the card. Every assertion here waits (`waitFor` / `act`) for what it reads.
    actEnvironment = (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT;
    (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = false;
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });
  afterEach(() => {
    vi.useRealTimers();
    (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = actEnvironment;
  });

  it('RP9 — a reload refetch that NEVER settles is a FAILURE once the bound has passed: the card says so with "Try again", keeps the answer; "Try again" then succeeds', async () => {
    mocked.getHelplinePeerRequests
      .mockResolvedValueOnce({ items: [item()] })
      .mockImplementationOnce(never) // the reload's refetch hangs (the admin transport has no timeout)
      .mockResolvedValue({ items: [at(V1001)] });
    mocked.saveHelplinePeerAnswer.mockRejectedValueOnce(versionStale()).mockImplementation(acknowledged);
    renderOwn();
    await click(await screen.findByRole('radio', { name: 'Yes, they have died' }));
    await waitFor(() => expect(mocked.getHelplinePeerRequests).toHaveBeenCalledTimes(2));
    const card = within(await screen.findByRole('article'));
    // within the bound the card says the questions are being updated — ⛔ yet a failure
    await advance(RELOAD_REFETCH_BOUND_MS - 500);
    expect(card.getByText(/updating them/)).toBeInTheDocument();
    expect(card.queryByTestId('peer-reload-failed')).toBeNull();
    await advance(1_000);
    expect(await card.findByTestId('peer-reload-failed')).toHaveTextContent('could not be updated just now');
    expect(card.queryByText(/updating them/)).toBeNull(); // ⛔ stuck at "updating them…"
    expect(saves()).toHaveLength(1);
    await click(card.getByRole('button', { name: 'Try again' }));
    await waitFor(() => expect(mocked.getHelplinePeerRequests).toHaveBeenCalledTimes(3));
    await waitFor(() => expect(saves()).toHaveLength(2)); // the kept answer, on the new version
    expect(saves()[1]!.slice(3)).toEqual(['has_died', { codes: ['died'] }, expect.any(String), V1001]);
    await waitFor(() => expect(screen.queryByTestId('peer-reload-failed')).toBeNull());
    await waitFor(() => expect(screen.getByRole('radio', { name: 'Yes, they have died' })).toHaveAttribute('aria-checked', 'true'));
    await advance(50); // (the trailing acknowledgement lands inside an act)
  });

  it('RP9 — "Try again" after a timeout can time out again (bounded each time); the card keeps saying so and ⛔ loses the answer', async () => {
    mocked.getHelplinePeerRequests
      .mockResolvedValueOnce({ items: [item()] })
      .mockImplementationOnce(never)
      .mockImplementationOnce(never)
      .mockResolvedValue({ items: [at(V1001)] });
    mocked.saveHelplinePeerAnswer.mockRejectedValueOnce(versionStale()).mockImplementation(acknowledged);
    renderOwn();
    await click(await screen.findByRole('radio', { name: 'Yes, they have died' }));
    await advance(RELOAD_REFETCH_BOUND_MS + 500);
    const card = within(await screen.findByRole('article'));
    await card.findByTestId('peer-reload-failed');
    await click(card.getByRole('button', { name: 'Try again' }));
    await waitFor(() => expect(mocked.getHelplinePeerRequests).toHaveBeenCalledTimes(3));
    await waitFor(() => expect(card.getByText(/updating them/)).toBeInTheDocument());
    await advance(RELOAD_REFETCH_BOUND_MS + 500);
    await card.findByTestId('peer-reload-failed');
    expect(saves()).toHaveLength(1);
    await click(card.getByRole('button', { name: 'Try again' }));
    await waitFor(() => expect(saves()).toHaveLength(2));
    expect(saves()[1]!.slice(3)).toEqual(['has_died', { codes: ['died'] }, expect.any(String), V1001]);
    await advance(50);
  });

  it('RP19 — a card REPLACED while its save waits to retry a stale is ⛔ retried by the replaced one: the successor sends the answer once, and a whole wait later nothing else has gone out', async () => {
    mocked.getHelplinePeerRequests.mockResolvedValue({ items: [item()] });
    mocked.saveHelplinePeerAnswer.mockRejectedValueOnce(new ApiError(409, 'peer_request.stale', 'try again')).mockImplementation(acknowledged);
    const client = renderOwn();
    await click(await screen.findByRole('radio', { name: 'Yes, they have died' }));
    await waitFor(() => expect(saves()).toHaveLength(1)); // the 300 ms stale wait is ARMED
    // the questions change under it: the card is replaced
    await act(async () => {
      client.setQueryData(LIST_KEY, { items: [at(V1001)] });
      await vi.advanceTimersByTimeAsync(0);
    });
    await waitFor(() => expect(saves()).toHaveLength(2));
    expect(saves()[1]!.slice(3)).toEqual(['has_died', { codes: ['died'] }, expect.any(String), V1001]);
    await advance(PAST_RETRY_MS); // … the replaced card's wait has now run out
    expect(saves()).toHaveLength(2);
  });

  it('RP19 (control) — the same stale on a card that is ⛔ replaced IS retried (same key) once the wait has run: the clock above does reach it', async () => {
    mocked.getHelplinePeerRequests.mockResolvedValue({ items: [item()] });
    mocked.saveHelplinePeerAnswer.mockRejectedValueOnce(new ApiError(409, 'peer_request.stale', 'try again')).mockImplementation(acknowledged);
    renderOwn();
    await click(await screen.findByRole('radio', { name: 'Yes, they have died' }));
    await waitFor(() => expect(saves()).toHaveLength(1));
    await advance(PAST_RETRY_MS);
    expect(saves()).toHaveLength(2);
    expect(saves()[1]![5]).toBe(saves()[0]![5]); // the SAME idempotency key on the retry
    expect(saves()[1]!.at(-1)).toBe('peer_mesh.v2');
  });
});
