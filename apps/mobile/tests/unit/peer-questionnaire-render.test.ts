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

const mock = vi.hoisted(() => ({ detail: null as PeerRequestDetailResponse | null, error: null as unknown, save: vi.fn(), submit: vi.fn() }));
vi.mock('../../components/peer-request/usePeerRequestQueries', () => ({
  usePeerRequestQuery: () => ({ data: mock.detail, error: mock.error, isLoading: false }),
  useSavePeerAnswer: () => ({ mutateAsync: mock.save }),
  useSubmitPeerReply: () => ({ mutateAsync: mock.submit, isPending: false }),
}));
vi.mock('@react-navigation/native', () => ({ usePreventRemove: vi.fn() }));
vi.mock('expo-router', () => ({ useRouter: () => ({ replace: vi.fn() }) }));
vi.mock('@twt/i18n/react', () => ({ useLocale: () => ({ locale: 'en' }) }));
vi.mock('../../lib/claim-i18n', () => ({ useClaimT: () => (key: string) => key }));
vi.mock('../../components/common/CallHelplineCTA', () => ({ CallHelplineCTA: () => null }));
vi.mock('react-native', async () => {
  const { createElement } = await import('react');
  return { ScrollView: ({ children }: { children: React.ReactNode }) => createElement('div', null, children) };
});
vi.mock('tamagui', async () => {
  const { createElement } = await import('react');
  const container = ({ children, accessibilityRole }: { children: React.ReactNode; accessibilityRole?: string }) =>
    createElement('div', { role: accessibilityRole === 'alert' ? 'alert' : undefined }, children);
  return {
    Paragraph: container, Text: container, XStack: container, YStack: container,
    Button: ({ children, onPress, disabled, accessibilityRole, accessibilityLabel, accessibilityState }: {
      children: React.ReactNode; onPress?: () => void; disabled?: boolean; accessibilityRole?: string;
      accessibilityLabel?: string; accessibilityState?: { selected?: boolean };
    }) => createElement('button', { onClick: onPress, disabled, role: accessibilityRole, 'aria-label': accessibilityLabel, 'aria-checked': accessibilityState?.selected }, children),
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

  it('Back and route removal are blocked while a save is unresolved (R7)', async () => {
    let finish!: (value: unknown) => void;
    mock.save.mockReturnValue(new Promise(resolve => { finish = resolve; }));
    const back = vi.fn();
    render(createElement(PeerQuestionnaire, { pariwarId: "p", pingId: "ping", onBack: back }));
    await userEvent.click(screen.getByRole('radio', { name: 'not_died' }));
    expect(screen.getByRole('button', { name: 'peer_request.back' })).toBeDisabled();
    expect(vi.mocked(usePreventRemove).mock.lastCall?.[0]).toBe(true);
    await userEvent.click(screen.getByRole('button', { name: 'peer_request.back' }));
    expect(back).not.toHaveBeenCalled();
    await act(async () => finish({ answers: saved('not_died') }));
    await waitFor(() => expect(screen.getByRole('button', { name: 'peer_request.back' })).toBeEnabled());
    expect(vi.mocked(usePreventRemove).mock.lastCall?.[0]).toBe(false);
  });

  it('a refreshed detail reconciles saved answers in the existing questionnaire (R5)', async () => {
    const view = render(createElement(PeerQuestionnaire, { pariwarId: "p", pingId: "ping", onBack: () => {} }));
    mock.detail = detail(saved('not_died'));
    view.rerender(createElement(PeerQuestionnaire, { pariwarId: "p", pingId: "ping", onBack: () => {} }));
    await waitFor(() => expect(screen.getByRole('radio', { name: 'not_died' })).toHaveAttribute('aria-checked', 'true'));
    expect(screen.queryByLabelText('When?')).not.toBeInTheDocument();
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
    expect(screen.getByLabelText('When?')).toHaveValue('01-10-2026');
    mock.detail = detail([...saved('died'), { questionKey: 'death_date', value: { date: '2026-10-02' }, savedAt: 'y' }]);
    view.rerender(createElement(PeerQuestionnaire, { pariwarId: 'p', pingId: 'ping', onBack: () => {} }));
    await waitFor(() => expect(screen.getByLabelText('When?')).toHaveValue('02-10-2026'));
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
    expect(screen.getByRole('button', { name: 'peer_request.back' })).toBeDisabled();
    await act(async () => finish({ answers: saved('not_died') }));
    expect(await screen.findByText('peer_request.saved')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'peer_request.back' })).toBeEnabled();
  });
});
