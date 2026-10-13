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
  announce: vi.fn(), dispatch: vi.fn(), backHandlers: [] as (() => boolean)[], os: 'ios' as string, focused: true, loading: false,
}));
vi.mock('../../components/peer-request/usePeerRequestQueries', () => ({
  usePeerRequestQuery: () => ({ data: mock.loading ? undefined : mock.detail, error: mock.error, isLoading: mock.loading }),
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
});
