// @vitest-environment jsdom
// Story 5.12 (AC7; `-364` conditions 1 + 2; F13a) — the WhatsApp notification settings screen (`app/(settings)/notifications.tsx`)
// EXECUTED with React DOM and mocked native primitives (the workplace-screen-render.test.ts harness, EXTENDED):
//   · rendered inside a REAL `<LocaleProvider>` — ⛔ a mocked `useT` (a stable stub HIDES the re-fetch loop: `useT()` returns a
//     fresh closure every render — [[project_uset_fresh_closure_memo_trap]]) and ⛔ an echo-`t` (it cannot test words);
//   · the status loads EXACTLY ONCE (at the pin it re-fetched on every render, endlessly);
//   · the withdraw control renders for EVERY ACTIVE response, a `windowExpiresAt` in the PAST included (condition 2);
//   · EXPIRED_24H_WINDOW reads "not on" — ⛔ "expired" / समाप्त in either locale (condition 1).
// The tamagui mocks FORWARD `testID` → `data-testid` (the precedent's `({ children }) => div` drops it). Native layout and a
// real screen reader still need a device ([[feedback_record_unattested_no_backfill]]).
import '@testing-library/jest-dom/vitest'
import { createElement, type ReactNode } from 'react'
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { LocaleProvider } from '@twt/i18n/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mock = vi.hoisted(() => ({
  getWaOptInStatus: vi.fn(),
  requestWaOptIn: vi.fn(),
  revokeWaOptIn: vi.fn(),
  openURL: vi.fn(),
  appState: 'active',
  listeners: new Set<(state: string) => void>(),
}))

vi.mock('../../lib/mmkv', () => ({ mmkvStorage: { getItem: () => null, setItem: () => undefined, removeItem: () => undefined } }))
vi.mock('../../lib/member-api', () => ({
  memberAuth: { getWaOptInStatus: mock.getWaOptInStatus, requestWaOptIn: mock.requestWaOptIn, revokeWaOptIn: mock.revokeWaOptIn },
}))
vi.mock('expo-router', async () => {
  const { useEffect } = await import('react')
  return { Stack: { Screen: () => null }, useFocusEffect: (cb: () => void) => useEffect(cb, [cb]) }
})
vi.mock('react-native', async () => {
  const { createElement } = await import('react')
  return {
    ScrollView: ({ children }: { children?: ReactNode }) => createElement('div', null, children),
    Linking: { openURL: mock.openURL },
    AppState: {
      get currentState() { return mock.appState },
      addEventListener: (_: string, listener: (state: string) => void) => {
        mock.listeners.add(listener)
        return { remove: () => mock.listeners.delete(listener) }
      },
    },
  }
})
vi.mock('tamagui', async () => {
  const { createElement } = await import('react')
  const container = ({ children, testID }: { children?: ReactNode; testID?: string }) =>
    createElement('div', testID ? { 'data-testid': testID } : null, children)
  return {
    YStack: container,
    Paragraph: container,
    Text: container,
    H2: container,
    Spinner: ({ testID }: { testID?: string }) => createElement('div', testID ? { 'data-testid': testID } : null),
    Button: ({ children, onPress, disabled, testID }: { children?: ReactNode; onPress?: () => void; disabled?: boolean; testID?: string }) =>
      createElement('button', { onClick: onPress, disabled, ...(testID ? { 'data-testid': testID } : {}) }, children),
  }
})

import NotificationSettingsScreen from '../../app/(settings)/notifications'

const NO_EXPIRY = /expir|समाप्त/i

function status(state: string | null, o: { available?: boolean; windowExpiresAt?: string | null } = {}) {
  return {
    available: o.available ?? true,
    displayPhoneNumber: '+91 98765 43210',
    state,
    deepLink: state === 'PENDING' ? 'https://wa.me/919876543210?text=TWT-ABCDEFGH' : null,
    verificationPhrase: state === 'PENDING' ? 'TWT-ABCDEFGH' : null,
    windowExpiresAt: o.windowExpiresAt ?? null,
  }
}

function renderScreen(locale: 'en' | 'hi' = 'en') {
  return render(createElement(LocaleProvider, { initialLocale: locale }, createElement(NotificationSettingsScreen)))
}

/** Let any further effect-driven fetches happen (a loop would issue thousands in this window). */
const settle = () => new Promise((r) => setTimeout(r, 50))

beforeEach(() => {
  for (const f of [mock.getWaOptInStatus, mock.requestWaOptIn, mock.revokeWaOptIn, mock.openURL]) f.mockReset()
  mock.appState = 'active'
  mock.revokeWaOptIn.mockResolvedValue({ state: 'REVOKED' })
})
afterEach(() => { cleanup(); vi.useRealTimers() })

function changeAppState(state: string) {
  mock.appState = state
  for (const listener of mock.listeners) listener(state)
}

describe('NotificationSettingsScreen — Story 5.12 (AC7)', () => {
  it('⭐ loads the status EXACTLY ONCE (F13a — at the pin a `[t]` dependency re-fetched on every render)', async () => {
    mock.getWaOptInStatus.mockResolvedValue(status('ACTIVE'))
    renderScreen()
    await screen.findByTestId('wa-opt-in-active')
    await settle()
    expect(mock.getWaOptInStatus).toHaveBeenCalledTimes(1)
  })

  it('⭐ ACTIVE with a windowExpiresAt in the PAST ⇒ the withdraw control renders; pressing it withdraws once', async () => {
    mock.getWaOptInStatus.mockResolvedValue(status('ACTIVE', { windowExpiresAt: '2026-01-01T00:00:00.000Z' }))
    renderScreen()
    await screen.findByTestId('wa-opt-in-active')
    const revoke = screen.getByTestId('wa-opt-in-revoke')
    expect(revoke).toHaveTextContent('Turn off WhatsApp notifications')
    expect(screen.getByTestId('wa-opt-in-active')).toHaveTextContent('until you turn them off here or reply STOP on WhatsApp')
    fireEvent.click(revoke)
    await settle()
    expect(mock.revokeWaOptIn).toHaveBeenCalledTimes(1)
  })

  for (const locale of ['en', 'hi'] as const) {
    it(`⭐ EXPIRED_24H_WINDOW ⇒ the retry branch with the unconfirmed words — ⛔ "expired" (${locale})`, async () => {
      mock.getWaOptInStatus.mockResolvedValue(status('EXPIRED_24H_WINDOW'))
      const { container } = renderScreen(locale)
      await screen.findByTestId('wa-opt-in-retry')
      expect(screen.getByTestId('wa-opt-in-enable')).toBeInTheDocument()
      expect(screen.queryByTestId('wa-opt-in-revoke')).toBeNull()
      expect(container.textContent).toContain(locale === 'en' ? 'WhatsApp notifications are not on' : 'व्हाट्सएप सूचनाएँ चालू नहीं हैं')
      expect(container.textContent).not.toMatch(NO_EXPIRY)
    })
  }

  it('BLOCKED_BY_META ⇒ the retry branch with the reworded blocked words', async () => {
    mock.getWaOptInStatus.mockResolvedValue(status('BLOCKED_BY_META'))
    const { container } = renderScreen()
    await screen.findByTestId('wa-opt-in-retry')
    expect(container.textContent).toContain('WhatsApp notifications were turned off')
    expect(container.textContent).not.toMatch(/you blocked/i)
  })

  it('REVOKED and null ⇒ the off branch; unavailable without a standing yes ⇒ no enable control', async () => {
    for (const state of ['REVOKED', null]) {
      mock.getWaOptInStatus.mockResolvedValue(status(state))
      renderScreen()
      await screen.findByTestId('wa-opt-in-off')
      expect(screen.queryByTestId('wa-opt-in-retry')).toBeNull()
      cleanup()
    }
    mock.getWaOptInStatus.mockResolvedValue(status(null, { available: false }))
    renderScreen()
    await screen.findByTestId('wa-opt-in-unavailable')
    expect(screen.queryByTestId('wa-opt-in-revoke')).toBeNull()
    expect(screen.queryByTestId('wa-opt-in-enable')).toBeNull()
  })

  it('ACTIVE + unavailable preserves withdrawal and the unavailable explanation', async () => {
    mock.getWaOptInStatus.mockResolvedValueOnce(status('ACTIVE', { available: false }))
      .mockResolvedValue(status('REVOKED', { available: false }))
    renderScreen()
    await screen.findByTestId('wa-opt-in-active')
    expect(screen.getByTestId('wa-opt-in-unavailable')).toBeInTheDocument()
    fireEvent.click(screen.getByTestId('wa-opt-in-revoke'))
    await waitFor(() => expect(mock.revokeWaOptIn).toHaveBeenCalledTimes(1))
    await waitFor(() => expect(screen.queryByTestId('wa-opt-in-revoke')).toBeNull())
  })

  it('returning from WhatsApp refreshes PENDING; delayed webhook activation reveals withdrawal and stops polling', async () => {
    vi.useFakeTimers()
    mock.getWaOptInStatus.mockResolvedValueOnce(status('PENDING'))
      .mockResolvedValueOnce(status('PENDING')).mockResolvedValue(status('ACTIVE'))
    mock.openURL.mockResolvedValue(undefined)
    await act(async () => { renderScreen() })
    expect(screen.getByTestId('wa-opt-in-pending')).toBeInTheDocument()
    expect(mock.getWaOptInStatus).toHaveBeenCalledTimes(1)
    await act(async () => { fireEvent.click(screen.getByTestId('wa-opt-in-reopen')) })
    expect(mock.openURL).toHaveBeenCalledTimes(1)
    await act(async () => { changeAppState('background'); await vi.advanceTimersByTimeAsync(10000) })
    expect(mock.getWaOptInStatus).toHaveBeenCalledTimes(1)
    await act(async () => { changeAppState('active') })
    expect(mock.getWaOptInStatus).toHaveBeenCalledTimes(2)
    expect(screen.getByTestId('wa-opt-in-pending')).toBeInTheDocument()
    await act(async () => { await vi.advanceTimersByTimeAsync(5000) })
    expect(screen.getByTestId('wa-opt-in-revoke')).toBeInTheDocument()
    expect(mock.getWaOptInStatus).toHaveBeenCalledTimes(3)
    await act(async () => { await vi.advanceTimersByTimeAsync(10000) })
    expect(mock.getWaOptInStatus).toHaveBeenCalledTimes(3)
  })

  it('foreground refresh reflects an external STOP for an already ACTIVE member', async () => {
    mock.getWaOptInStatus.mockResolvedValueOnce(status('ACTIVE')).mockResolvedValue(status('REVOKED'))
    renderScreen()
    await screen.findByTestId('wa-opt-in-revoke')
    await act(async () => { changeAppState('background'); changeAppState('active') })
    expect(screen.getByTestId('wa-opt-in-off')).toBeInTheDocument()
    expect(screen.queryByTestId('wa-opt-in-revoke')).toBeNull()
  })

  it('withdrawal waits for an older background read, then fetches the post-withdrawal state', async () => {
    let finishBackground!: (value: ReturnType<typeof status>) => void
    const background = new Promise<ReturnType<typeof status>>((resolve) => { finishBackground = resolve })
    mock.getWaOptInStatus.mockResolvedValueOnce(status('ACTIVE'))
      .mockReturnValueOnce(background).mockResolvedValue(status('REVOKED'))
    renderScreen()
    await screen.findByTestId('wa-opt-in-revoke')
    await act(async () => { changeAppState('background'); changeAppState('active') })
    await act(async () => { fireEvent.click(screen.getByTestId('wa-opt-in-revoke')) })
    expect(mock.revokeWaOptIn).toHaveBeenCalledTimes(1)
    expect(mock.getWaOptInStatus).toHaveBeenCalledTimes(2)
    await act(async () => { finishBackground(status('ACTIVE')) })
    expect(mock.getWaOptInStatus).toHaveBeenCalledTimes(3)
    expect(screen.getByTestId('wa-opt-in-off')).toBeInTheDocument()
    expect(screen.queryByTestId('wa-opt-in-revoke')).toBeNull()
  })

  it('unmount cleans up pending polling and the foreground listener', async () => {
    vi.useFakeTimers()
    mock.getWaOptInStatus.mockResolvedValue(status('PENDING'))
    await act(async () => { renderScreen() })
    expect(mock.listeners.size).toBe(1)
    cleanup()
    expect(mock.listeners.size).toBe(0)
    await act(async () => { await vi.advanceTimersByTimeAsync(10000); changeAppState('active') })
    expect(mock.getWaOptInStatus).toHaveBeenCalledTimes(1)
  })

  it('a failed load shows the translated error line', async () => {
    mock.getWaOptInStatus.mockRejectedValue(new Error('network'))
    renderScreen('hi')
    const line = await screen.findByTestId('wa-opt-in-error')
    expect(line).toHaveTextContent('कुछ गड़बड़ हुई। कृपया फिर से प्रयास करें।')
    await settle()
    expect(mock.getWaOptInStatus).toHaveBeenCalledTimes(1)
  })
})
