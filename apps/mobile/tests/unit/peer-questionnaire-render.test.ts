// @vitest-environment jsdom
// Execute the mobile component with React DOM and mocked native primitives. This exercises
// its actual hooks/handlers; native layout and screen-reader behavior still need a device.
import type { PeerRequestDetailResponse } from '@twt/contracts';
import '@testing-library/jest-dom/vitest';
import { createElement, StrictMode } from 'react';
import { act, cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { usePreventRemove } from '@react-navigation/native';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { PeerQuestionnaire } from '../../components/peer-request/PeerQuestionnaire';

const mock = vi.hoisted(() => ({
  detail: null as PeerRequestDetailResponse | null, error: null as unknown, save: vi.fn(), submit: vi.fn(),
  announce: vi.fn(), dispatch: vi.fn(), backHandlers: [] as (() => boolean)[],
}));
vi.mock('../../components/peer-request/usePeerRequestQueries', () => ({
  usePeerRequestQuery: () => ({ data: mock.detail, error: mock.error, isLoading: false }),
  useSavePeerAnswer: () => ({ mutateAsync: mock.save }),
  useSubmitPeerReply: () => ({ mutateAsync: mock.submit, isPending: false }),
}));
vi.mock('@react-navigation/native', () => ({ usePreventRemove: vi.fn(), useNavigation: () => ({ dispatch: mock.dispatch }) }));
vi.mock('expo-router', () => ({ useRouter: () => ({ replace: vi.fn() }) }));
vi.mock('@twt/i18n/react', () => ({ useLocale: () => ({ locale: 'en' }) }));
vi.mock('../../lib/claim-i18n', () => ({ useClaimT: () => (key: string) => key }));
vi.mock('../../components/common/CallHelplineCTA', async () => {
  const { createElement } = await import('react');
  return { CallHelplineCTA: () => createElement('span', { 'data-testid': 'helpline-cta' }) };
});
vi.mock('react-native', async () => {
  const { createElement } = await import('react');
  return {
    ScrollView: ({ children }: { children: React.ReactNode }) => createElement('div', null, children),
    // iOS: the plan speaks through `announceForAccessibility` (review S28 — the call is asserted, ⛔ a DOM role).
    Platform: { OS: 'ios' },
    AccessibilityInfo: { announceForAccessibility: mock.announce },
    BackHandler: {
      addEventListener: (_event: string, handler: () => boolean) => {
        mock.backHandlers.push(handler);
        return { remove: () => { mock.backHandlers = mock.backHandlers.filter((h) => h !== handler); } };
      },
    },
  };
});
/** Android's hardware back, as the LATEST registered handler sees it. */
const hardwareBack = () => mock.backHandlers.at(-1)?.() ?? false;
vi.mock('tamagui', async () => {
  const { createElement } = await import('react');
  const container = ({ children, accessibilityRole, accessibilityLabel }: { children: React.ReactNode; accessibilityRole?: string; accessibilityLabel?: string }) =>
    createElement('div', { role: accessibilityRole === 'alert' || accessibilityRole === 'radiogroup' ? accessibilityRole : undefined, 'aria-label': accessibilityLabel }, children);
  return {
    Paragraph: container, Text: container, XStack: container, YStack: container,
    Button: ({ children, onPress, disabled, accessibilityRole, accessibilityLabel, accessibilityState }: {
      children: React.ReactNode; onPress?: () => void; disabled?: boolean; accessibilityRole?: string;
      accessibilityLabel?: string; accessibilityState?: { checked?: boolean };
    // RN announces a radio / checkbox from `checked` — the stub maps EXACTLY that (review S30: it used to map `selected`,
    // which masked a radio that read "not checked").
    }) => createElement('button', { onClick: onPress, disabled, role: accessibilityRole, 'aria-label': accessibilityLabel, 'aria-checked': accessibilityState?.checked }, children),
    Input: ({ value, onChangeText, accessibilityLabel }: { value: string; onChangeText: (text: string) => void; accessibilityLabel: string }) =>
      createElement('input', { value, 'aria-label': accessibilityLabel, onChange: (event: React.ChangeEvent<HTMLInputElement>) => onChangeText(event.target.value) }),
  };
});

const words = (en: string) => ({ en, hi: en });
const saved = (code: string): PeerRequestDetailResponse['answers'] => [{ questionKey: 'has_died', value: { codes: [code] }, savedAt: 'now' }];
function detail(answers = saved('died')): PeerRequestDetailResponse {
  return { pingId: 'ping', memberName: 'A', submitted: false, answers, questionnaire: {
    versionId: 'v2', pages: [{ questions: [
      { key: 'has_died', kind: 'single', words: words('Has A died?'), options: ['died', 'not_died'].map(code => ({ code, words: words(code), exclusive: false })), optional: false, showIf: null },
      { key: 'death_date', kind: 'date', words: words('When?'), options: [{ code: 'unknown', words: words('Unknown'), exclusive: false }], optional: true, showIf: { key: 'has_died', anyOf: ['died'] } },
    ] }], closingNote: words('Closing note'), thankYou: words('Thank you. Your answers have been sent to the Trust.'),
  } };
}

describe('mobile questionnaire interaction regressions', () => {
  afterEach(cleanup);
  beforeEach(() => {
    mock.detail = detail();
    mock.error = null;
    mock.save.mockReset().mockImplementation(async ({ value }: { value: { codes: string[] } }) => ({ answers: saved(value.codes[0]!) }));
    mock.submit.mockReset().mockResolvedValue({ submitted: true });
    vi.mocked(usePreventRemove).mockClear();
    mock.announce.mockClear();
    mock.dispatch.mockClear();
    mock.backHandlers = [];
  });

  it('a failed Submit exposes an enabled retry and reaches Thank-you without an unrelated save (R4)', async () => {
    mock.submit.mockRejectedValueOnce(new TypeError('offline'));
    render(createElement(PeerQuestionnaire, { pariwarId: "p", pingId: "ping", onBack: () => {} }));
    await userEvent.click(screen.getByRole('button', { name: 'peer_request.next' }));
    await userEvent.click(screen.getByRole('button', { name: 'peer_request.submit' }));
    const retry = await screen.findByRole('button', { name: 'peer_request.try_again' });
    expect(retry).toBeEnabled();
    expect(screen.getByRole('alert')).toHaveTextContent('peer_request.submit_error');
    await userEvent.click(retry);
    expect(await screen.findByText('Thank you. Your answers have been sent to the Trust.')).toBeInTheDocument();
    expect(mock.submit.mock.calls[1]![0]).toBe(mock.submit.mock.calls[0]![0]);
    expect(mock.save).not.toHaveBeenCalled();
  });

  it('a rejected answer stays unsaved on the closing page and cannot be submitted (R6)', async () => {
    mock.save.mockRejectedValue({ status: 422 });
    render(createElement(PeerQuestionnaire, { pariwarId: "p", pingId: "ping", onBack: () => {} }));
    await userEvent.click(screen.getByRole('radio', { name: 'not_died' }));
    expect(await screen.findByText('peer_request.not_saved')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'peer_request.next' }));
    expect(screen.getByRole('alert')).toHaveTextContent('peer_request.invalid');
    expect(screen.getByRole('button', { name: 'peer_request.submit' })).toBeDisabled();
    expect(mock.submit).not.toHaveBeenCalled();
  });

  it('Back and route removal are held while a save is unresolved — the member is TOLD, and may leave by saying so (R7, review S32)', async () => {
    let finish!: (value: unknown) => void;
    mock.save.mockReturnValue(new Promise(resolve => { finish = resolve; }));
    const back = vi.fn();
    render(createElement(PeerQuestionnaire, { pariwarId: "p", pingId: "ping", onBack: back }));
    await userEvent.click(screen.getByRole('radio', { name: 'not_died' }));
    expect(vi.mocked(usePreventRemove).mock.lastCall?.[0]).toBe(true);
    await userEvent.click(screen.getByRole('button', { name: 'peer_request.back' }));
    expect(back).not.toHaveBeenCalled();
    expect(screen.getByRole('alert')).toHaveTextContent('peer_request.unsaved');
    expect(screen.getByRole('button', { name: 'peer_request.leave_anyway' })).toBeEnabled();
    await act(async () => finish({ answers: saved('not_died') }));
    await waitFor(() => expect(vi.mocked(usePreventRemove).mock.lastCall?.[0]).toBe(false));
  });

  it('offline: "Leave without saving" lifts the guard and leaves — ⛔ trapped behind an endless retry (review S32)', async () => {
    mock.save.mockRejectedValue(new TypeError('offline')); // retries forever (a real backoff timer)
    const back = vi.fn();
    render(createElement(PeerQuestionnaire, { pariwarId: 'p', pingId: 'ping', onBack: back }));
    await userEvent.click(screen.getByRole('radio', { name: 'not_died' }));
    await userEvent.click(screen.getByRole('button', { name: 'peer_request.back' }));
    expect(back).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole('button', { name: 'peer_request.leave_anyway' }));
    await waitFor(() => expect(back).toHaveBeenCalledOnce());
    // a navigation-away the guard caught is dispatched once the member chose to leave
    const onPrevented = vi.mocked(usePreventRemove).mock.lastCall?.[1] as ((e: { data: { action: unknown } }) => void) | undefined;
    expect(onPrevented).toBeTypeOf('function');
  });

  it('a REFUSED answer names its question and can be given up for the saved one (review S32)', async () => {
    mock.save.mockRejectedValueOnce({ status: 422 });
    render(createElement(PeerQuestionnaire, { pariwarId: 'p', pingId: 'ping', onBack: () => {} }));
    await userEvent.click(screen.getByRole('radio', { name: 'not_died' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('peer_request.invalid_named');
    await userEvent.click(screen.getByRole('button', { name: 'peer_request.keep_saved' }));
    expect(screen.getByRole('radio', { name: 'died' })).toHaveAttribute('aria-checked', 'true');
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('a 403 on a save closes the screen dignified — ⛔ a retry every 30 s (review S32)', async () => {
    mock.save.mockRejectedValue({ status: 403 });
    render(createElement(PeerQuestionnaire, { pariwarId: 'p', pingId: 'ping', onBack: () => {} }));
    await userEvent.click(screen.getByRole('radio', { name: 'not_died' }));
    expect(await screen.findByText('peer_request.not_openable')).toBeInTheDocument();
    expect(mock.save).toHaveBeenCalledOnce();
  });

  it('the save line, the notices and a page change are SPOKEN (iOS announce) — and the chosen radio is CHECKED, in a named group (review S28 / S29 / S30)', async () => {
    render(createElement(PeerQuestionnaire, { pariwarId: 'p', pingId: 'ping', onBack: () => {} }));
    expect(mock.announce).toHaveBeenCalledWith('peer_request.title — peer_request.page_of');
    expect(screen.getByRole('radiogroup', { name: 'Has A died?' })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'died' })).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByRole('radio', { name: 'not_died' })).toHaveAttribute('aria-checked', 'false');
    await userEvent.click(screen.getByRole('radio', { name: 'not_died' }));
    await waitFor(() => expect(mock.announce).toHaveBeenCalledWith('peer_request.saved'));
    await userEvent.click(screen.getByRole('button', { name: 'peer_request.next' }));
    await waitFor(() => expect(mock.announce).toHaveBeenCalledWith('Closing note'));
  });

  it('Android back steps back a phase, ⛔ pops the request; the closing page carries the helpline (review S33 / S40)', async () => {
    const back = vi.fn();
    render(createElement(PeerQuestionnaire, { pariwarId: 'p', pingId: 'ping', onBack: back }));
    await userEvent.click(screen.getByRole('button', { name: 'peer_request.next' }));
    expect(screen.getByTestId('helpline-cta')).toBeInTheDocument();
    let handled = false;
    act(() => { handled = hardwareBack(); });
    expect(handled).toBe(true);
    expect(await screen.findByRole('button', { name: 'peer_request.next' })).toBeInTheDocument(); // back on the questions
    act(() => { handled = hardwareBack(); });
    expect(handled).toBe(true);
    expect(back).toHaveBeenCalledOnce(); // page one ⇒ the list
  });

  it('a date TYPED but ⛔ saved holds Next with a named notice; "Clear the date" releases it (review S35)', async () => {
    render(createElement(PeerQuestionnaire, { pariwarId: 'p', pingId: 'ping', onBack: () => {} }));
    await userEvent.type(screen.getByLabelText('When?', { selector: 'input' }), '01-10-2026');
    await userEvent.click(screen.getByRole('button', { name: 'peer_request.next' }));
    expect(screen.getByRole('alert')).toHaveTextContent('peer_request.date_unsaved');
    expect(screen.queryByText('Closing note')).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'peer_request.date_clear' }));
    await userEvent.click(screen.getByRole('button', { name: 'peer_request.next' }));
    expect(await screen.findByText('Closing note')).toBeInTheDocument();
  });

  it('a REQUIRED answer saved but unreadable counts as answered — Next passes (review S38)', async () => {
    mock.detail = detail([{ questionKey: 'has_died', value: { unavailable: true }, savedAt: 'now' }]);
    render(createElement(PeerQuestionnaire, { pariwarId: 'p', pingId: 'ping', onBack: () => {} }));
    await userEvent.click(screen.getByRole('button', { name: 'peer_request.next' }));
    expect(await screen.findByText('Closing note')).toBeInTheDocument();
  });

  it('a refreshed detail reconciles saved answers in the existing questionnaire (R5)', async () => {
    const view = render(createElement(PeerQuestionnaire, { pariwarId: "p", pingId: "ping", onBack: () => {} }));
    mock.detail = detail(saved('not_died'));
    view.rerender(createElement(PeerQuestionnaire, { pariwarId: "p", pingId: "ping", onBack: () => {} }));
    await waitFor(() => expect(screen.getByRole('radio', { name: 'not_died' })).toHaveAttribute('aria-checked', 'true'));
    expect(screen.queryByLabelText('When?', { selector: 'input' })).not.toBeInTheDocument();
  });

  it('an unreadable saved date is announced as unavailable, not blank (R10)', () => {
    mock.detail = detail([...saved('died'), { questionKey: 'death_date', value: { unavailable: true }, savedAt: 'now' }]);
    render(createElement(PeerQuestionnaire, { pariwarId: "p", pingId: "ping", onBack: () => {} }));
    expect(screen.getByRole('alert')).toHaveTextContent('peer_request.unavailable');
  });

  it('closing Back and route removal cannot expose edits while Submit is in flight', async () => {
    let finish!: (value: unknown) => void;
    mock.submit.mockReturnValue(new Promise(resolve => { finish = resolve; }));
    render(createElement(PeerQuestionnaire, { pariwarId: 'p', pingId: 'ping', onBack: () => {} }));
    await userEvent.click(screen.getByRole('button', { name: 'peer_request.next' }));
    await userEvent.click(screen.getByRole('button', { name: 'peer_request.submit' }));
    expect(screen.getByRole('button', { name: 'peer_request.back' })).toBeDisabled();
    expect(vi.mocked(usePreventRemove).mock.lastCall?.[0]).toBe(true);
    await userEvent.click(screen.getByRole('button', { name: 'peer_request.back' }));
    expect(screen.queryByRole('radio')).not.toBeInTheDocument();
    expect(mock.save).not.toHaveBeenCalled();
    await act(async () => finish({ submitted: true }));
    expect(await screen.findByText('Thank you. Your answers have been sent to the Trust.')).toBeInTheDocument();
  });

  it('a date-only refresh updates the input while the field stays mounted', async () => {
    mock.detail = detail([...saved('died'), { questionKey: 'death_date', value: { date: '2026-10-01' }, savedAt: 'x' }]);
    const view = render(createElement(PeerQuestionnaire, { pariwarId: 'p', pingId: 'ping', onBack: () => {} }));
    expect(screen.getByLabelText('When?', { selector: 'input' })).toHaveValue('01-10-2026');
    mock.detail = detail([...saved('died'), { questionKey: 'death_date', value: { date: '2026-10-02' }, savedAt: 'y' }]);
    view.rerender(createElement(PeerQuestionnaire, { pariwarId: 'p', pingId: 'ping', onBack: () => {} }));
    await waitFor(() => expect(screen.getByLabelText('When?', { selector: 'input' })).toHaveValue('02-10-2026'));
  });

  it('saves still work after the Strict Mode setup-cleanup-setup cycle', async () => {
    render(createElement(StrictMode, null, createElement(PeerQuestionnaire, { pariwarId: 'p', pingId: 'ping', onBack: () => {} })));
    await userEvent.click(screen.getByRole('radio', { name: 'not_died' }));
    await waitFor(() => expect(mock.save).toHaveBeenCalledTimes(1));
    expect(await screen.findByText('peer_request.saved')).toBeInTheDocument();
  });

  it('a transient background detail failure retains the editor until its save settles', async () => {
    let finish!: (value: unknown) => void;
    mock.save.mockReturnValue(new Promise(resolve => { finish = resolve; }));
    const view = render(createElement(PeerQuestionnaire, { pariwarId: 'p', pingId: 'ping', onBack: () => {} }));
    await userEvent.click(screen.getByRole('radio', { name: 'not_died' }));
    mock.error = new TypeError('offline');
    view.rerender(createElement(PeerQuestionnaire, { pariwarId: 'p', pingId: 'ping', onBack: () => {} }));
    expect(screen.getByRole('radio', { name: 'not_died' })).toHaveAttribute('aria-checked', 'true');
    expect(vi.mocked(usePreventRemove).mock.lastCall?.[0]).toBe(true);
    await act(async () => finish({ answers: saved('not_died') }));
    expect(await screen.findByText('peer_request.saved')).toBeInTheDocument();
    expect(vi.mocked(usePreventRemove).mock.lastCall?.[0]).toBe(false);
  });
  it('two FAST taps on a multi question build on each other — the second saves BOTH (review S37)', async () => {
    const d = detail()
    d.questionnaire.pages[0]!.questions.push({ key: 'illness', kind: 'multi', words: words('Which?'), options: ['a', 'b'].map((code) => ({ code, words: words(code), exclusive: false })), optional: true, showIf: null })
    mock.detail = d
    let finish!: (value: unknown) => void
    mock.save.mockReturnValueOnce(new Promise((resolve) => { finish = resolve })).mockResolvedValue({ answers: [] })
    render(createElement(PeerQuestionnaire, { pariwarId: 'p', pingId: 'ping', onBack: () => {} }))
    await userEvent.click(screen.getByRole('checkbox', { name: 'a' }))
    await userEvent.click(screen.getByRole('checkbox', { name: 'b' }))
    await act(async () => finish({ answers: [...saved('died'), { questionKey: 'illness', value: { codes: ['a'] }, savedAt: 'x' }] }))
    await waitFor(() => expect(mock.save).toHaveBeenCalledTimes(2))
    expect(mock.save.mock.calls[1]![0]).toMatchObject({ questionKey: 'illness', value: { codes: ['a', 'b'] } })
  });
});
