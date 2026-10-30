// @vitest-environment jsdom
// Execute the mobile component with React DOM and mocked native primitives. This exercises
// its actual hooks/handlers; native layout and screen-reader behavior still need a device.
import { RELOAD_REFETCH_BOUND_MS } from '@twt/api-client';
import type { PeerRequestDetailResponse } from '@twt/contracts';
import '@testing-library/jest-dom/vitest';
import { createElement, StrictMode } from 'react';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { usePreventRemove } from '@react-navigation/native';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { PeerQuestionnaire } from '../../components/peer-request/PeerQuestionnaire';
import { retryDelayMs } from '../../lib/peer-request';

const mock = vi.hoisted(() => ({
  detail: null as PeerRequestDetailResponse | null, error: null as unknown, save: vi.fn(), submit: vi.fn(), refetch: vi.fn(),
  announce: vi.fn(), dispatch: vi.fn(), backHandlers: [] as (() => boolean)[], os: 'ios' as string, focused: true, loading: false,
}));
vi.mock('../../components/peer-request/usePeerRequestQueries', () => ({
  usePeerRequestQuery: () => ({ data: mock.loading ? undefined : mock.detail, error: mock.error, isLoading: mock.loading, refetch: mock.refetch }),
  useSavePeerAnswer: () => ({ mutateAsync: mock.save }),
  useSubmitPeerReply: () => ({ mutateAsync: mock.submit, isPending: false }),
}));
vi.mock('@react-navigation/native', () => ({
  usePreventRemove: vi.fn(),
  useNavigation: () => ({ dispatch: mock.dispatch }),
  useIsFocused: () => mock.focused,
}));
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
    Platform: { get OS() { return mock.os; } },
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
    mock.refetch.mockReset().mockImplementation(async () => ({ data: mock.detail, isError: false }));
    vi.mocked(usePreventRemove).mockClear();
    mock.announce.mockClear();
    mock.dispatch.mockClear();
    mock.backHandlers = [];
    mock.os = 'ios';
    mock.focused = true;
    mock.loading = false;
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
    // ⭐ Third-pass U5 (b): once everything saved, the offer to leave without saving — and its "please wait" — GO.
    await waitFor(() => expect(screen.queryByRole('button', { name: 'peer_request.leave_anyway' })).not.toBeInTheDocument());
    expect(screen.queryByText('peer_request.unsaved')).not.toBeInTheDocument();
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
  });

  it('a navigation-away the guard CAUGHT is dispatched once the member chooses to leave (third-pass U15 (b))', async () => {
    mock.save.mockRejectedValue(new TypeError('offline'));
    render(createElement(PeerQuestionnaire, { pariwarId: 'p', pingId: 'ping', onBack: () => {} }));
    await userEvent.click(screen.getByRole('radio', { name: 'not_died' }));
    const onPrevented = vi.mocked(usePreventRemove).mock.lastCall?.[1] as (e: { data: { action: unknown } }) => void;
    act(() => onPrevented({ data: { action: { type: 'GO_BACK' } } }));
    const before = vi.mocked(usePreventRemove).mock.calls.length;
    await userEvent.click(screen.getByRole('button', { name: 'peer_request.leave_anyway' }));
    await waitFor(() => expect(mock.dispatch).toHaveBeenCalledWith({ type: 'GO_BACK' }));
    // the guard was LIFTED for that dispatch — a render AFTER the press with it OFF (X3: counted only after the press)
    expect(vi.mocked(usePreventRemove).mock.calls.slice(before).some((c) => c[0] === false)).toBe(true);
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
    // the FIRST render is read by the screen reader itself — ⛔ announced again (fourth-pass V9)
    expect(mock.announce).not.toHaveBeenCalledWith('peer_request.title — peer_request.page_of');
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

  it('⭐ Story 6.33 (R7) — EVERY save carries the RENDERED questionnaireVersionId', async () => {
    render(createElement(PeerQuestionnaire, { pariwarId: 'p', pingId: 'ping', onBack: () => {} }));
    await userEvent.click(screen.getByRole('radio', { name: 'not_died' }));
    await waitFor(() => expect(mock.save).toHaveBeenCalledTimes(1));
    expect(mock.save.mock.calls[0]![0]).toMatchObject({ questionKey: 'has_died', value: { codes: ['not_died'] }, questionnaireVersionId: 'v2' });
  });

  it('⭐ Story 6.33 (R7) — a VERSION-stale save RELOADS (⛔ a retry): the detail is refetched, the questions rebuilt, the unsaved answer re-saved on the new version (Strict Mode)', async () => {
    mock.save.mockRejectedValueOnce({ status: 409, code: 'peer_request.questionnaire_version_stale' });
    mock.refetch.mockImplementation(async () => {
      mock.detail = { ...detail(), questionnaire: { ...detail().questionnaire, versionId: 'v1001' } };
      return { data: mock.detail, isError: false };
    });
    render(createElement(StrictMode, null, createElement(PeerQuestionnaire, { pariwarId: 'p', pingId: 'ping', onBack: () => {} })));
    await userEvent.click(screen.getByRole('radio', { name: 'not_died' }));
    await waitFor(() => expect(mock.refetch).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(mock.save).toHaveBeenCalledTimes(2));
    expect(mock.save.mock.calls[0]![0]).toMatchObject({ questionnaireVersionId: 'v2' });
    expect(mock.save.mock.calls[1]![0]).toMatchObject({ questionKey: 'has_died', value: { codes: ['not_died'] }, questionnaireVersionId: 'v1001' });
    expect(await screen.findByText('peer_request.saved')).toBeInTheDocument();
  });

  it('⭐ Story 6.33 (R7 (v)) — an UNREADABLE pinned version closes the screen (⛔ a reload loop, ⛔ a retry)', async () => {
    mock.save.mockRejectedValue({ status: 409, code: 'peer_request.questionnaire_version_unreadable' });
    render(createElement(PeerQuestionnaire, { pariwarId: 'p', pingId: 'ping', onBack: () => {} }));
    await userEvent.click(screen.getByRole('radio', { name: 'not_died' }));
    await waitFor(() => expect(screen.queryByRole('radio', { name: 'not_died' })).not.toBeInTheDocument());
    expect(mock.refetch).not.toHaveBeenCalled();
    expect(mock.save).toHaveBeenCalledTimes(1);
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
  it('on ANDROID a page / phase change is spoken too (third-pass U4) — and back is ⛔ captured while UNFOCUSED (U8)', async () => {
    mock.os = 'android';
    const view = render(createElement(PeerQuestionnaire, { pariwarId: 'p', pingId: 'ping', onBack: () => {} }));
    await userEvent.click(screen.getByRole('button', { name: 'peer_request.next' }));
    await waitFor(() => expect(mock.announce).toHaveBeenCalledWith('Closing note'));
    act(() => { hardwareBack(); }); // back to the questions — a CHANGE, spoken on Android too
    await waitFor(() => expect(mock.announce).toHaveBeenCalledWith('peer_request.title — peer_request.page_of'));
    // a MOUNTED screen that LOSES focus (another pushed on top) gives back its handler (fourth-pass V10 (c))
    expect(mock.backHandlers.length).toBeGreaterThan(0);
    mock.focused = false;
    view.rerender(createElement(PeerQuestionnaire, { pariwarId: 'p', pingId: 'ping', onBack: () => {} }));
    expect(mock.backHandlers).toHaveLength(0);
  });

  it("the member's own notice is ⛔ wiped by an unrelated acknowledgement (third-pass U5 (a))", async () => {
    let finish!: (value: unknown) => void;
    const d = detail([]);
    d.questionnaire.pages[0]!.questions.push({ key: 'how_known', kind: 'single', words: words('How?'), options: ['saw', 'told'].map((code) => ({ code, words: words(code), exclusive: false })), optional: true, showIf: null });
    mock.detail = d;
    mock.save.mockReturnValueOnce(new Promise((resolve) => { finish = resolve; }));
    render(createElement(PeerQuestionnaire, { pariwarId: 'p', pingId: 'ping', onBack: () => {} }));
    await userEvent.click(screen.getByRole('radio', { name: 'saw' })); // an unrelated save, in flight
    await userEvent.click(screen.getByRole('button', { name: 'peer_request.next' })); // has_died unanswered
    expect(screen.getByRole('alert')).toHaveTextContent('peer_request.required');
    await act(async () => finish({ answers: [{ questionKey: 'how_known', value: { codes: ['saw'] }, savedAt: 'x' }] }));
    expect(await screen.findByText('peer_request.saved')).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent('peer_request.required'); // ⛔ wiped by the ack
  });

  it('the SAVED date typed another way (single digits, "/", Devanagari) is ⛔ "unsaved" (third-pass U6)', async () => {
    mock.detail = detail([...saved('died'), { questionKey: 'death_date', value: { date: '2026-10-01' }, savedAt: 'x' }]);
    render(createElement(PeerQuestionnaire, { pariwarId: 'p', pingId: 'ping', onBack: () => {} }));
    const input = screen.getByLabelText('When?', { selector: 'input' });
    await userEvent.clear(input);
    await userEvent.type(input, '१/१०/२०२६');
    await userEvent.click(screen.getByRole('button', { name: 'peer_request.next' }));
    expect(await screen.findByText('Closing note')).toBeInTheDocument();
    expect(mock.save).not.toHaveBeenCalled();
  });
  it('with ⛔ saved date, INVALID typed text is "unsaved" — Next is held and Save KEEPS the text (fourth-pass V2)', async () => {
    render(createElement(PeerQuestionnaire, { pariwarId: 'p', pingId: 'ping', onBack: () => {} }));
    const input = screen.getByLabelText('When?', { selector: 'input' });
    await userEvent.type(input, '31-02-2026');
    await userEvent.click(screen.getByRole('button', { name: 'peer_request.next' }));
    expect(screen.getByRole('alert')).toHaveTextContent('peer_request.date_unsaved');
    await userEvent.click(screen.getByRole('button', { name: 'peer_request.date_save' }));
    expect(input).toHaveValue('31-02-2026');
    expect(screen.getByText('peer_request.date_invalid')).toBeInTheDocument();
    expect(mock.save).not.toHaveBeenCalled();
  });

  it('the "unsaved" warning beside "Leave without saving" SURVIVES a present failure (fourth-pass V3 (a))', async () => {
    mock.save.mockRejectedValue({ status: 422 });
    render(createElement(PeerQuestionnaire, { pariwarId: 'p', pingId: 'ping', onBack: () => {} }));
    await userEvent.click(screen.getByRole('radio', { name: 'not_died' }));
    expect(await screen.findByText('peer_request.invalid_named')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'peer_request.back' }));
    // BOTH lines stand, each its own (fifth-pass W2 — ⛔ one overwriting the other)
    expect(screen.getByText('peer_request.unsaved')).toBeInTheDocument();
    expect(screen.getByText('peer_request.invalid_named')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'peer_request.leave_anyway' })).toBeInTheDocument();
  });

  it('once saves settle, ONLY the "please wait" warning goes — "please answer this" stays (fourth-pass V3 (b))', async () => {
    let finish!: (value: unknown) => void;
    const d = detail([]);
    d.questionnaire.pages[0]!.questions.push({ key: 'how_known', kind: 'single', words: words('How?'), options: ['saw', 'told'].map((code) => ({ code, words: words(code), exclusive: false })), optional: true, showIf: null });
    mock.detail = d;
    mock.save.mockReturnValueOnce(new Promise((resolve) => { finish = resolve; }));
    render(createElement(PeerQuestionnaire, { pariwarId: 'p', pingId: 'ping', onBack: () => {} }));
    await userEvent.click(screen.getByRole('radio', { name: 'saw' })); // in flight
    await userEvent.click(screen.getByRole('button', { name: 'peer_request.back' })); // ⇒ "unsaved" + leave offer
    await userEvent.click(screen.getByRole('button', { name: 'peer_request.next' })); // ⇒ "please answer" (has_died)
    expect(screen.getByText('peer_request.required')).toBeInTheDocument();
    await act(async () => finish({ answers: [{ questionKey: 'how_known', value: { codes: ['saw'] }, savedAt: 'x' }] }));
    await waitFor(() => expect(screen.queryByRole('button', { name: 'peer_request.leave_anyway' })).not.toBeInTheDocument());
    expect(screen.queryByText('peer_request.unsaved')).not.toBeInTheDocument();
    expect(screen.getByText('peer_request.required')).toBeInTheDocument();
  });
  it('the FIRST page is announced when it replaced a "Loading…" line in the open screen (fifth-pass W3)', async () => {
    mock.loading = true;
    const view = render(createElement(PeerQuestionnaire, { pariwarId: 'p', pingId: 'ping', onBack: () => {} }));
    expect(screen.getByText('peer_request.loading')).toBeInTheDocument();
    mock.loading = false;
    view.rerender(createElement(PeerQuestionnaire, { pariwarId: 'p', pingId: 'ping', onBack: () => {} }));
    await waitFor(() => expect(mock.announce).toHaveBeenCalledWith('peer_request.title — peer_request.page_of'));
  });

  it('a Submit that fails while back was pressed leaves ⛔ stale "please wait" (fifth-pass W2)', async () => {
    let fail!: (e: unknown) => void;
    mock.submit.mockReturnValueOnce(new Promise((_resolve, reject) => { fail = reject; }));
    render(createElement(PeerQuestionnaire, { pariwarId: 'p', pingId: 'ping', onBack: () => {} }));
    await userEvent.click(screen.getByRole('button', { name: 'peer_request.next' }));
    await userEvent.click(screen.getByRole('button', { name: 'peer_request.submit' }));
    const onPrevented = vi.mocked(usePreventRemove).mock.lastCall?.[1] as (e: { data: { action: unknown } }) => void;
    act(() => onPrevented({ data: { action: { type: 'GO_BACK' } } }));
    expect(screen.getByText('peer_request.unsaved')).toBeInTheDocument();
    await act(async () => fail(new TypeError('offline')));
    expect(await screen.findByText('peer_request.submit_error')).toBeInTheDocument();
    expect(screen.queryByText('peer_request.unsaved')).not.toBeInTheDocument();
  });

  it('"Leave without saving" drops the queued edits NOW (fifth-pass W8)', async () => {
    mock.save.mockRejectedValue(new TypeError('offline'));
    const back = vi.fn();
    render(createElement(PeerQuestionnaire, { pariwarId: 'p', pingId: 'ping', onBack: back }));
    await userEvent.click(screen.getByRole('radio', { name: 'not_died' }));
    await userEvent.click(screen.getByRole('button', { name: 'peer_request.back' }));
    await userEvent.click(screen.getByRole('button', { name: 'peer_request.leave_anyway' }));
    await waitFor(() => expect(back).toHaveBeenCalledOnce());
    const calls = mock.save.mock.calls.length;
    await new Promise((r) => setTimeout(r, 1100)); // past the first retry backoff
    expect(mock.save.mock.calls.length).toBe(calls); // ⛔ further sends of the abandoned answer
  });
  it('on ANDROID the "could not be opened" swap is spoken too (U4 / fifth-pass W11)', async () => {
    mock.os = 'android';
    mock.save.mockRejectedValue({ status: 404 });
    render(createElement(PeerQuestionnaire, { pariwarId: 'p', pingId: 'ping', onBack: () => {} }));
    await userEvent.click(screen.getByRole('radio', { name: 'not_died' }));
    await waitFor(() => expect(mock.announce).toHaveBeenCalledWith('peer_request.not_openable'));
  });
  it('"you typed a date…" goes as soon as the date is CLEARED — ⛔ outliving it (fifth-pass follow-up X4)', async () => {
    render(createElement(PeerQuestionnaire, { pariwarId: 'p', pingId: 'ping', onBack: () => {} }));
    await userEvent.type(screen.getByLabelText('When?', { selector: 'input' }), '01-10-2026');
    await userEvent.click(screen.getByRole('button', { name: 'peer_request.next' }));
    expect(screen.getByText('peer_request.date_unsaved')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'peer_request.date_clear' }));
    await waitFor(() => expect(screen.queryByText('peer_request.date_unsaved')).not.toBeInTheDocument());
  });
  // ── Story 6.33 review RV1 / RV7 — the hand-over of unsent answers between questionnaire instances ──────────────────────
  const props = { pariwarId: 'p', pingId: 'ping', onBack: () => {} };
  const stale = { status: 409, code: 'peer_request.questionnaire_version_stale' };
  /** The rendered detail as the NEXT version: `versionId` changed, the questions kept (or replaced by `questions`). */
  const nextVersion = (versionId: string, answers = saved('died')): PeerRequestDetailResponse => ({ ...detail(answers), questionnaire: { ...detail(answers).questionnaire, versionId } });
  const withHowKnown = (d: PeerRequestDetailResponse): PeerRequestDetailResponse => {
    d.questionnaire.pages[0]!.questions.push({ key: 'how_known', kind: 'single', words: words('How?'), options: ['saw', 'told'].map((code) => ({ code, words: words(code), exclusive: false })), optional: true, showIf: null });
    return d;
  };
  /** Let timers (the carry-over's 0 ms tick, a stray re-apply) and the promises behind them run. ⛔ NOT a retry backoff: a leg
   *  that rules out a retry waits past `retryDelayMs` (`outwaitRetryBackoff`; review RP19). */
  const settle = () => act(async () => { await new Promise((r) => setTimeout(r, 60)); });
  /** Wait (REAL time) past the first retry backoff — a retry the disposed editor still owed would have been SENT by now. */
  const outwaitRetryBackoff = () => act(async () => { await new Promise((r) => setTimeout(r, retryDelayMs(1) + 150)); });

  it('⭐ RV1 — the carried answers are applied ONCE: an acknowledged save that REWRITES `detail` (new identity, same questions) re-saves nothing over the member\'s later edit', async () => {
    mock.save.mockRejectedValueOnce(stale);
    mock.refetch.mockImplementation(async () => {
      mock.detail = nextVersion('v1001');
      return { data: mock.detail, isError: false };
    });
    const tree = () => createElement(StrictMode, null, createElement(PeerQuestionnaire, props));
    const view = render(tree());
    // From now on an ACKNOWLEDGED save rewrites the cached detail, as `useSavePeerAnswer`'s `setQueryData` does — the screen
    // re-renders with a `detail` of a NEW identity (same questions), the trigger of the old effect's re-run.
    mock.save.mockImplementation(async ({ value }: { value: { codes: string[] } }) => {
      await Promise.resolve();
      const answers = saved(value.codes[0]!);
      mock.detail = { ...mock.detail!, answers };
      view.rerender(tree());
      return { answers };
    });
    await userEvent.click(screen.getByRole('radio', { name: 'not_died' })); // A — refused as version-stale
    await waitFor(() => expect(mock.save).toHaveBeenCalledTimes(2)); // …re-saved on the new version
    expect(await screen.findByText('peer_request.saved')).toBeInTheDocument();
    await settle(); // the rewrite has re-rendered; a re-run of the carry effect would have fired by now
    expect(mock.save).toHaveBeenCalledTimes(2);
    expect(mock.save.mock.calls[1]![0]).toMatchObject({ questionKey: 'has_died', value: { codes: ['not_died'] }, questionnaireVersionId: 'v1001' });
    await userEvent.click(screen.getByRole('radio', { name: 'died' })); // B — the member changes their mind
    await waitFor(() => expect(mock.save).toHaveBeenCalledTimes(3));
    await settle();
    expect(mock.save).toHaveBeenCalledTimes(3); // ⛔ the old carried A re-saved over B
    expect(mock.save.mock.calls[2]![0]).toMatchObject({ questionKey: 'has_died', value: { codes: ['died'] } });
    expect(screen.getByRole('radio', { name: 'died' })).toHaveAttribute('aria-checked', 'true');
  });

  it('⭐ RV7 — a BACKGROUND refetch returns a NEW versionId while answers sit queued (offline): the rebuilt screen re-saves them once, on the new version', async () => {
    mock.save.mockRejectedValueOnce(new TypeError('offline')); // retried behind a backoff — queued, ⛔ yet saved
    const view = render(createElement(PeerQuestionnaire, props));
    await userEvent.click(screen.getByRole('radio', { name: 'not_died' }));
    await waitFor(() => expect(mock.save).toHaveBeenCalledTimes(1));
    expect(await screen.findByText('peer_request.not_saved_retrying')).toBeInTheDocument();
    mock.detail = nextVersion('v3'); // reconnect / focus: the detail query refetched ITSELF — ⛔ a stale save, ⛔ `onReload`
    view.rerender(createElement(PeerQuestionnaire, props));
    await waitFor(() => expect(mock.save).toHaveBeenCalledTimes(2));
    expect(mock.save.mock.calls[1]![0]).toMatchObject({ questionKey: 'has_died', value: { codes: ['not_died'] }, questionnaireVersionId: 'v3' });
    expect(await screen.findByText('peer_request.saved')).toBeInTheDocument();
    // Review RP19 — the disposed editor's retry was due `retryDelayMs(1)` (1000 ms) after the failure, so a 60 ms settle observed
    // NOTHING of it: wait past the backoff, and only then is "2 saves" a proof of ONCE (⛔ the old editor's retry, ⛔ a second apply).
    await outwaitRetryBackoff();
    expect(mock.save).toHaveBeenCalledTimes(2);
    expect(mock.refetch).not.toHaveBeenCalled();
    expect(screen.getByRole('radio', { name: 'not_died' })).toHaveAttribute('aria-checked', 'true');
  });

  it('⭐ RV7 — the data changes (v2) and ONLY THEN `reloads` is bumped (a DOUBLE rebuild): the carried answer is applied once, to the FINAL instance — ⛔ lost', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] }); // the 0 ms carry tick fires only when WE say so
    try {
      mock.save.mockRejectedValueOnce(stale);
      let release!: (result: unknown) => void;
      mock.refetch.mockImplementationOnce(() => new Promise((resolve) => { release = resolve; }));
      const view = render(createElement(PeerQuestionnaire, props));
      const first = screen.getByRole('radio', { name: 'not_died' });
      fireEvent.click(first);
      await act(async () => {});
      expect(mock.refetch).toHaveBeenCalledTimes(1);
      // 1st rebuild — the query's DATA changes (the key is `v2b:0`); its carry tick is still pending when…
      mock.detail = nextVersion('v2b');
      view.rerender(createElement(PeerQuestionnaire, props));
      const second = screen.getByRole('radio', { name: 'not_died' });
      expect(second).not.toBe(first); // a new instance
      expect(mock.save).toHaveBeenCalledTimes(1);
      // …meanwhile the cached detail is rewritten (same version, NEW identity): the first rebuild's editor PUBLISHES (it takes the
      // server's answers) — a hand-over that this overwrote with the editor's own (empty) drafts would lose the carried answer.
      mock.detail = { ...mock.detail!, answers: saved('died') };
      view.rerender(createElement(PeerQuestionnaire, props));
      expect(screen.getByRole('radio', { name: 'not_died' })).toBe(second);
      // …2nd rebuild — the refetch RESOLVES and `reloads` is bumped (`v2b:1`): the first rebuild never applied anything.
      await act(async () => { release({ data: mock.detail, isError: false }); });
      expect(screen.getByRole('radio', { name: 'not_died' })).not.toBe(second); // a third instance
      expect(mock.save).toHaveBeenCalledTimes(1);
      await act(async () => { await vi.advanceTimersByTimeAsync(10); });
      expect(mock.save).toHaveBeenCalledTimes(2);
      expect(mock.save.mock.calls[1]![0]).toMatchObject({ questionKey: 'has_died', value: { codes: ['not_died'] }, questionnaireVersionId: 'v2b' });
      await act(async () => { await vi.advanceTimersByTimeAsync(100); });
      expect(mock.save).toHaveBeenCalledTimes(2);
      expect(screen.getByText('peer_request.saved')).toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
  });

  it('⭐ RV7 — an unsent answer to a question the NEW version no longer asks is DROPPED; the rest are re-saved, once', async () => {
    mock.detail = withHowKnown(detail([]));
    let refuse!: (error: unknown) => void;
    mock.save.mockReturnValueOnce(new Promise((_resolve, reject) => { refuse = reject; }));
    mock.refetch.mockImplementation(async () => {
      mock.detail = nextVersion('v1001', []); // the new version has no `how_known`
      return { data: mock.detail, isError: false };
    });
    render(createElement(PeerQuestionnaire, props));
    await userEvent.click(screen.getByRole('radio', { name: 'saw' })); // on the wire
    await userEvent.click(screen.getByRole('radio', { name: 'not_died' })); // queued behind it
    await act(async () => refuse(stale));
    await waitFor(() => expect(mock.save).toHaveBeenCalledTimes(2));
    expect(mock.save.mock.calls[1]![0]).toMatchObject({ questionKey: 'has_died', value: { codes: ['not_died'] }, questionnaireVersionId: 'v1001' });
    expect(await screen.findByText('peer_request.saved')).toBeInTheDocument();
    await settle();
    expect(mock.save).toHaveBeenCalledTimes(2);
    expect(mock.save.mock.calls.some(([task]) => (task as { questionKey: string }).questionKey === 'how_known' && (task as { questionnaireVersionId: string }).questionnaireVersionId === 'v1001')).toBe(false);
  });

  it('⭐ RV7 — a DROPPED answer is gone for good: a LATER rebuild whose version asks that question again does not bring it back', async () => {
    mock.detail = withHowKnown(detail([]));
    mock.save.mockRejectedValueOnce(stale);
    mock.refetch.mockImplementation(async () => {
      mock.detail = nextVersion('v1001', []); // no `how_known`: the only unsent answer is dropped, NOTHING is saved
      return { data: mock.detail, isError: false };
    });
    const view = render(createElement(PeerQuestionnaire, props));
    await userEvent.click(screen.getByRole('radio', { name: 'saw' }));
    await waitFor(() => expect(mock.refetch).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(screen.queryByRole('radio', { name: 'saw' })).not.toBeInTheDocument());
    await settle();
    expect(mock.save).toHaveBeenCalledTimes(1);
    mock.detail = withHowKnown(nextVersion('v1002', [])); // a later version asks `how_known` again
    view.rerender(createElement(PeerQuestionnaire, props));
    expect(await screen.findByRole('radio', { name: 'saw' })).toHaveAttribute('aria-checked', 'false');
    await settle();
    expect(mock.save).toHaveBeenCalledTimes(1); // ⛔ the dropped 'saw' carried into v1002
  });

  // ── Story 6.33 review round 2 (RP4, RP8, RP9) ──────────────────────────────────────────────────────────────────────────
  const fakeTimers = () => vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] }); // the 0 ms carry tick + the reload bound fire only when WE say so
  const asksHowKnown = (versionId: string) => withHowKnown(nextVersion(versionId, []));
  /** What the screen SENT: [questionKey, code, versionId] per save, in order. */
  const sent = () => mock.save.mock.calls.map(([task]) => {
    const t = task as { questionKey: string; value: { codes: string[] }; questionnaireVersionId: string };
    return [t.questionKey, t.value.codes[0], t.questionnaireVersionId];
  });

  it('⭐ RP4 — a reload that fires while answers carried IN are not yet applied keeps them in the hand-over: the next rebuild applies BOTH, in order', async () => {
    fakeTimers();
    try {
      mock.detail = withHowKnown(detail([]));
      mock.save.mockRejectedValueOnce(stale).mockRejectedValueOnce(stale); // X (instance 0) and Y (instance 1): both refused as version-stale
      mock.refetch
        .mockImplementationOnce(async () => { mock.detail = asksHowKnown('v1001'); return { data: mock.detail, isError: false }; })
        .mockImplementationOnce(async () => { mock.detail = asksHowKnown('v1002'); return { data: mock.detail, isError: false }; });
      render(createElement(PeerQuestionnaire, props));
      fireEvent.click(screen.getByRole('radio', { name: 'not_died' })); // X — refused ⇒ reload ⇒ instance 1, X carried IN, its 0 ms tick PENDING
      await act(async () => {});
      expect(mock.refetch).toHaveBeenCalledTimes(1);
      expect(mock.save).toHaveBeenCalledTimes(1);
      fireEvent.click(screen.getByRole('radio', { name: 'saw' })); // Y — instance 1's OWN draft, refused ⇒ reload BEFORE X was applied
      await act(async () => {});
      expect(mock.refetch).toHaveBeenCalledTimes(2);
      expect(mock.save).toHaveBeenCalledTimes(2); // ⛔ X was never sent by instance 1
      await act(async () => { await vi.advanceTimersByTimeAsync(10); }); // instance 2's carry tick
      // `onReload(editor.carryOverDrafts())` used to REPLACE the hand-over with [Y]: X was lost.
      expect(sent().slice(2)).toEqual([['has_died', 'not_died', 'v1002'], ['how_known', 'saw', 'v1002']]);
      await act(async () => { await vi.advanceTimersByTimeAsync(100); });
      expect(mock.save).toHaveBeenCalledTimes(4);
    } finally {
      vi.useRealTimers();
    }
  });

  it('⭐ RP9 — a reload refetch that NEVER settles is a FAILURE after the bound (⇒ Try again); Try again reloads and the carried answer is applied ONCE', async () => {
    fakeTimers();
    try {
      mock.save.mockRejectedValueOnce(stale);
      mock.refetch
        .mockImplementationOnce(() => new Promise(() => {})) // a hung fetch: `refetch()` re-joins it, the transport has no timeout
        .mockImplementationOnce(async () => { mock.detail = nextVersion('v1001'); return { data: mock.detail, isError: false }; });
      render(createElement(PeerQuestionnaire, props));
      fireEvent.click(screen.getByRole('radio', { name: 'not_died' }));
      await act(async () => {});
      expect(mock.refetch).toHaveBeenCalledTimes(1);
      await act(async () => { await vi.advanceTimersByTimeAsync(RELOAD_REFETCH_BOUND_MS - 1); });
      expect(screen.queryByText('peer_request.load_error')).not.toBeInTheDocument(); // still within the bound
      await act(async () => { await vi.advanceTimersByTimeAsync(1); });
      expect(screen.getByText('peer_request.load_error')).toBeInTheDocument(); // the bound = a failure
      expect(screen.queryByRole('radio')).not.toBeInTheDocument();
      expect(mock.save).toHaveBeenCalledTimes(1);
      fireEvent.click(screen.getByRole('button', { name: 'peer_request.try_again' }));
      await act(async () => {});
      expect(mock.refetch).toHaveBeenCalledTimes(2);
      await act(async () => { await vi.advanceTimersByTimeAsync(10); });
      expect(sent()).toEqual([['has_died', 'not_died', 'v2'], ['has_died', 'not_died', 'v1001']]);
      await act(async () => { await vi.advanceTimersByTimeAsync(RELOAD_REFETCH_BOUND_MS + 100); }); // the FIRST bound's timer must not fail a good reload
      expect(mock.save).toHaveBeenCalledTimes(2);
      expect(screen.queryByText('peer_request.load_error')).not.toBeInTheDocument();
      expect(screen.getByRole('radio', { name: 'not_died' })).toHaveAttribute('aria-checked', 'true');
    } finally {
      vi.useRealTimers();
    }
  });

  it('⭐ RT4 — Try again keeps the failure screen until the retry SETTLES: ⛔ a remount on the OLD version re-sending the carried answer stale', async () => {
    fakeTimers();
    try {
      mock.save.mockRejectedValueOnce(stale);
      let settle!: () => void;
      mock.refetch
        .mockRejectedValueOnce(new TypeError('offline')) // the first reload fails ⇒ Try again
        .mockImplementationOnce(() => new Promise((resolve) => {
          // a real network: the retry's refetch lands AFTER the 0 ms carry tick a premature remount would schedule
          settle = () => { mock.detail = nextVersion('v1001'); resolve({ data: mock.detail, isError: false }); };
        }));
      render(createElement(PeerQuestionnaire, props));
      fireEvent.click(screen.getByRole('radio', { name: 'not_died' }));
      await act(async () => {});
      expect(screen.getByText('peer_request.load_error')).toBeInTheDocument();
      fireEvent.click(screen.getByRole('button', { name: 'peer_request.try_again' }));
      await act(async () => { await vi.advanceTimersByTimeAsync(50); });
      expect(mock.refetch).toHaveBeenCalledTimes(2);
      expect(screen.getByText('peer_request.load_error')).toBeInTheDocument(); // ⛔ the old questions while the retry is on the wire
      expect(screen.queryByRole('radio')).not.toBeInTheDocument();
      expect(sent()).toEqual([['has_died', 'not_died', 'v2']]); // ⛔ a second, stale send
      await act(async () => settle());
      await act(async () => { await vi.advanceTimersByTimeAsync(10); });
      expect(sent()).toEqual([['has_died', 'not_died', 'v2'], ['has_died', 'not_died', 'v1001']]);
      expect(mock.refetch).toHaveBeenCalledTimes(2);
      expect(screen.queryByText('peer_request.load_error')).not.toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
  });

  it('⭐ round 4 (RF5) — a DOUBLE tap on Try again starts ONE retry: a second refetch would cancel the first, which then "succeeds" on the OLD data', async () => {
    fakeTimers();
    try {
      mock.save.mockRejectedValueOnce(stale);
      let settle!: () => void;
      mock.refetch
        .mockRejectedValueOnce(new TypeError('offline'))
        .mockImplementationOnce(() => new Promise((resolve) => {
          settle = () => { mock.detail = nextVersion('v1001'); resolve({ data: mock.detail, isError: false }); };
        }));
      render(createElement(PeerQuestionnaire, props));
      fireEvent.click(screen.getByRole('radio', { name: 'not_died' }));
      await act(async () => {});
      const tryAgain = () => fireEvent.click(screen.getByRole('button', { name: 'peer_request.try_again' }));
      tryAgain();
      tryAgain();
      await act(async () => { await vi.advanceTimersByTimeAsync(50); });
      expect(mock.refetch).toHaveBeenCalledTimes(2); // the failed reload + ONE retry — ⛔ a third
      expect(screen.getByText('peer_request.load_error')).toBeInTheDocument();
      await act(async () => settle());
      await act(async () => { await vi.advanceTimersByTimeAsync(10); });
      expect(sent()).toEqual([['has_died', 'not_died', 'v2'], ['has_died', 'not_died', 'v1001']]);
      // the guard is released once the retry settled: a later stale save reloads again
      expect(screen.queryByText('peer_request.load_error')).not.toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
  });

  it('⭐ RP9 — a reload refetch that REJECTS is a failure too (⇒ Try again), ⛔ an unhandled rejection and ⛔ a stuck spinner', async () => {
    mock.save.mockRejectedValueOnce(stale);
    mock.refetch.mockRejectedValueOnce(new TypeError('offline'));
    render(createElement(PeerQuestionnaire, props));
    await userEvent.click(screen.getByRole('radio', { name: 'not_died' }));
    expect(await screen.findByText('peer_request.load_error')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'peer_request.try_again' })).toBeEnabled();
    mock.refetch.mockImplementationOnce(async () => { mock.detail = nextVersion('v1001'); return { data: mock.detail, isError: false }; });
    await userEvent.click(screen.getByRole('button', { name: 'peer_request.try_again' }));
    await waitFor(() => expect(mock.save).toHaveBeenCalledTimes(2));
    expect(sent()[1]).toEqual(['has_died', 'not_died', 'v1001']);
  });

  it('⭐ RP8 — the failed-reload screen keeps a LEAVE GUARD while unsent answers sit in the hand-over: leaving is intercepted and asks; "Leave without saving" gives them up', async () => {
    mock.save.mockRejectedValueOnce(stale);
    mock.refetch.mockImplementation(async () => ({ data: undefined, isError: true })); // the reload's refetch FAILED
    render(createElement(PeerQuestionnaire, props));
    await userEvent.click(screen.getByRole('radio', { name: 'not_died' }));
    expect(await screen.findByText('peer_request.load_error')).toBeInTheDocument(); // the Questionnaire (and ITS guard) is gone
    expect(vi.mocked(usePreventRemove).mock.lastCall?.[0]).toBe(true); // …but the screen still guards the answer only the hand-over holds
    expect(screen.queryByRole('button', { name: 'peer_request.leave_anyway' })).not.toBeInTheDocument();
    const onPrevented = vi.mocked(usePreventRemove).mock.lastCall?.[1] as (e: { data: { action: unknown } }) => void;
    act(() => onPrevented({ data: { action: { type: 'GO_BACK' } } })); // the member tries to leave
    expect(mock.dispatch).not.toHaveBeenCalled();
    expect(screen.getByRole('alert')).toHaveTextContent('peer_request.unsaved');
    const before = vi.mocked(usePreventRemove).mock.calls.length;
    await userEvent.click(screen.getByRole('button', { name: 'peer_request.leave_anyway' }));
    await waitFor(() => expect(mock.dispatch).toHaveBeenCalledWith({ type: 'GO_BACK' }));
    expect(vi.mocked(usePreventRemove).mock.calls.slice(before).some((c) => c[0] === false)).toBe(true); // the guard was lifted for that dispatch
    // The answers were GIVEN UP: a Try again on a screen that stayed does ⛔ re-send them.
    mock.refetch.mockImplementation(async () => { mock.detail = nextVersion('v1001'); return { data: mock.detail, isError: false }; });
    await userEvent.click(screen.getByRole('button', { name: 'peer_request.try_again' }));
    expect(await screen.findByRole('radio', { name: 'died' })).toBeInTheDocument();
    await settle();
    expect(mock.save).toHaveBeenCalledTimes(1);
  });

  it('⭐ RP8 — a load error with NOTHING carried has ⛔ a leave guard (nothing to lose, and the member is ⛔ trapped)', async () => {
    mock.detail = null; // the first load failed
    mock.error = { status: 500 };
    render(createElement(PeerQuestionnaire, props));
    expect(screen.getByText('peer_request.load_error')).toBeInTheDocument();
    expect(vi.mocked(usePreventRemove).mock.lastCall?.[0]).toBe(false);
    expect(screen.queryByRole('button', { name: 'peer_request.leave_anyway' })).not.toBeInTheDocument();
  });
});
