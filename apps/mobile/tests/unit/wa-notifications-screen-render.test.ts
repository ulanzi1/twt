// @vitest-environment jsdom
// Story 5.12 (AC7; `-364` conditions 1 + 2; F13a) — the WhatsApp notification settings screen (`app/(settings)/notifications.tsx`)
// EXECUTED with React DOM and mocked native primitives (the workplace-screen-render.test.ts harness, EXTENDED):
//   · rendered inside a REAL `<LocaleProvider>` — ⛔ a mocked `useT` (a stable stub HIDES the re-fetch loop: `useT()` returns a
//     fresh closure every render — [[project_uset_fresh_closure_memo_trap]]) and ⛔ an echo-`t` (it cannot test words);
//   · the status loads EXACTLY ONCE (at the pin it re-fetched on every render, endlessly);
//   · the withdraw control renders for EVERY ACTIVE response, a `windowExpiresAt` in the PAST included (condition 2);
//   · EXPIRED_24H_WINDOW reads "not on" — ⛔ "expired" / समाप्त in either locale (condition 1).
//   · Second review (2026-10-21): `useFocusEffect` is mocked WITH a blur (the old `useEffect(cb, [cb])` stub could not see
//     blurred polling — P5); a hung read (P1), an action error surviving a refresh (P3), a 409 re-read (P4) and the
//     announcement of a later state change (P6) each have a leg.
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
  focused: true,
  focusListeners: new Set<() => void>(),
  announce: vi.fn(),
}))

vi.mock('../../lib/mmkv', () => ({ mmkvStorage: { getItem: () => null, setItem: () => undefined, removeItem: () => undefined } }))
vi.mock('../../lib/member-api', () => ({
  memberAuth: { getWaOptInStatus: mock.getWaOptInStatus, requestWaOptIn: mock.requestWaOptIn, revokeWaOptIn: mock.revokeWaOptIn },
}))
vi.mock('expo-router', async () => {
  const { useEffect } = await import('react')
  // Runs `cb` while focused and its cleanup on blur (or unmount) — the react-navigation contract.
  const useFocusEffect = (cb: () => void | (() => void)) =>
    useEffect(() => {
      let undo: void | (() => void)
      let active = false
      const sync = () => {
        if (mock.focused && !active) {
          active = true
          undo = cb()
        } else if (!mock.focused && active) {
          active = false
          if (undo) undo()
        }
      }
      mock.focusListeners.add(sync)
      sync()
      return () => {
        mock.focusListeners.delete(sync)
        if (active && undo) undo()
      }
    }, [cb])
  return { Stack: { Screen: () => null }, useFocusEffect }
})
vi.mock('react-native', async () => {
  const { createElement } = await import('react')
  return {
    ScrollView: ({ children }: { children?: ReactNode }) => createElement('div', null, children),
    Linking: { openURL: mock.openURL },
    AccessibilityInfo: { announceForAccessibility: mock.announce },
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
  for (const f of [mock.getWaOptInStatus, mock.requestWaOptIn, mock.revokeWaOptIn, mock.openURL, mock.announce]) f.mockReset()
  mock.appState = 'active'
  mock.focused = true
  mock.revokeWaOptIn.mockResolvedValue({ state: 'REVOKED' })
})
afterEach(() => { cleanup(); vi.useRealTimers() })

function changeAppState(state: string) {
  mock.appState = state
  for (const listener of mock.listeners) listener(state)
}

function setFocused(focused: boolean) {
  mock.focused = focused
  for (const sync of mock.focusListeners) sync()
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

  it('⭐ P1 — a status read that never settles does not freeze withdrawal: the controls come back and the new state shows', async () => {
    vi.useFakeTimers()
    mock.getWaOptInStatus.mockResolvedValueOnce(status('ACTIVE'))
      .mockReturnValueOnce(new Promise(() => undefined)).mockResolvedValue(status('REVOKED'))
    await act(async () => { renderScreen() })
    await act(async () => { changeAppState('background'); changeAppState('active') })
    expect(mock.getWaOptInStatus).toHaveBeenCalledTimes(2)
    await act(async () => { fireEvent.click(screen.getByTestId('wa-opt-in-revoke')) })
    expect(mock.revokeWaOptIn).toHaveBeenCalledTimes(1)
    expect(screen.getByTestId('wa-opt-in-revoke')).toBeDisabled()
    await act(async () => { await vi.advanceTimersByTimeAsync(15_000) })
    expect(mock.getWaOptInStatus).toHaveBeenCalledTimes(3)
    expect(screen.getByTestId('wa-opt-in-off')).toBeInTheDocument()
    expect(screen.getByTestId('wa-opt-in-enable')).not.toBeDisabled()
  })

  it('⭐ P1 — a first read that never settles ends in the error line, not an endless spinner', async () => {
    vi.useFakeTimers()
    mock.getWaOptInStatus.mockReturnValue(new Promise(() => undefined))
    await act(async () => { renderScreen() })
    expect(screen.getByTestId('wa-opt-in-loading')).toBeInTheDocument()
    await act(async () => { await vi.advanceTimersByTimeAsync(15_000) })
    expect(screen.queryByTestId('wa-opt-in-loading')).toBeNull()
    expect(screen.getByTestId('wa-opt-in-error')).toBeInTheDocument()
    // ⛔ a false body: with no read, "not available for your Pariwar" would be untrue.
    expect(screen.queryByTestId('wa-opt-in-unavailable')).toBeNull()
  })

  it('⭐ P1 — a withdrawal that never settles does not freeze the screen: the error shows, a fresh read follows, the controls come back', async () => {
    vi.useFakeTimers()
    mock.getWaOptInStatus.mockResolvedValue(status('ACTIVE'))
    mock.revokeWaOptIn.mockReturnValue(new Promise(() => undefined))
    await act(async () => { renderScreen() })
    await act(async () => { fireEvent.click(screen.getByTestId('wa-opt-in-revoke')) })
    expect(screen.getByTestId('wa-opt-in-revoke')).toBeDisabled()
    await act(async () => { await vi.advanceTimersByTimeAsync(15_000) })
    expect(screen.getByTestId('wa-opt-in-error')).toBeInTheDocument()
    expect(mock.getWaOptInStatus).toHaveBeenCalledTimes(2)
    expect(screen.getByTestId('wa-opt-in-revoke')).not.toBeDisabled()
  })

  it('⭐ P4 — the re-read after a failed action is FRESH: it waits out an older read instead of joining it', async () => {
    vi.useFakeTimers()
    let finishOld!: (value: ReturnType<typeof status>) => void
    mock.getWaOptInStatus.mockResolvedValueOnce(status(null))
      .mockReturnValueOnce(new Promise((resolve) => { finishOld = resolve })).mockResolvedValue(status('PENDING'))
    mock.requestWaOptIn.mockResolvedValue({ state: 'PENDING', deepLink: 'https://wa.me/919876543210?text=TWT-ABCDEFGH' })
    mock.openURL.mockRejectedValue(new Error('no handler'))
    await act(async () => { renderScreen() })
    await act(async () => { changeAppState('background'); changeAppState('active') })
    expect(mock.getWaOptInStatus).toHaveBeenCalledTimes(2)
    await act(async () => { fireEvent.click(screen.getByTestId('wa-opt-in-enable')) })
    // The mint landed before WhatsApp failed to open; the older read predates it.
    await act(async () => { finishOld(status(null)) })
    expect(mock.getWaOptInStatus).toHaveBeenCalledTimes(3)
    expect(screen.getByTestId('wa-opt-in-pending')).toBeInTheDocument()
  })

  it('⭐ P3 — an action\'s error survives the PENDING poll (WhatsApp would not open)', async () => {
    vi.useFakeTimers()
    mock.getWaOptInStatus.mockResolvedValue(status('PENDING'))
    mock.openURL.mockRejectedValue(new Error('no handler'))
    await act(async () => { renderScreen() })
    await act(async () => { fireEvent.click(screen.getByTestId('wa-opt-in-reopen')) })
    expect(screen.getByTestId('wa-opt-in-error')).toBeInTheDocument()
    await act(async () => { await vi.advanceTimersByTimeAsync(5000) })
    expect(mock.getWaOptInStatus).toHaveBeenCalledTimes(2)
    expect(screen.getByTestId('wa-opt-in-error')).toBeInTheDocument()
  })

  it('⭐ P4 — a withdrawal refused because the yes already ended re-reads: the stale ACTIVE body goes, and so does the error (it is off)', async () => {
    mock.getWaOptInStatus.mockResolvedValueOnce(status('ACTIVE')).mockResolvedValue(status('REVOKED'))
    mock.revokeWaOptIn.mockRejectedValue(new Error('409 wa_opt_in.not_active'))
    renderScreen()
    await screen.findByTestId('wa-opt-in-revoke')
    fireEvent.click(screen.getByTestId('wa-opt-in-revoke'))
    await screen.findByTestId('wa-opt-in-off')
    expect(mock.getWaOptInStatus).toHaveBeenCalledTimes(2)
    expect(screen.queryByTestId('wa-opt-in-error')).toBeNull()
  })

  it('⭐ P5 — a blurred screen neither polls nor refreshes on foreground; focusing it again refreshes', async () => {
    vi.useFakeTimers()
    mock.getWaOptInStatus.mockResolvedValue(status('PENDING'))
    await act(async () => { renderScreen() })
    expect(mock.getWaOptInStatus).toHaveBeenCalledTimes(1)
    await act(async () => { setFocused(false) })
    expect(mock.listeners.size).toBe(0)
    await act(async () => { await vi.advanceTimersByTimeAsync(20_000); changeAppState('background'); changeAppState('active') })
    expect(mock.getWaOptInStatus).toHaveBeenCalledTimes(1)
    await act(async () => { setFocused(true) })
    expect(mock.getWaOptInStatus).toHaveBeenCalledTimes(2)
    await act(async () => { await vi.advanceTimersByTimeAsync(5000) })
    expect(mock.getWaOptInStatus).toHaveBeenCalledTimes(3)
  })

  for (const locale of ['en', 'hi'] as const) {
    it(`⭐ P6 — the first read is not announced; PENDING → ACTIVE from polling is, in the screen's words (${locale})`, async () => {
      vi.useFakeTimers()
      mock.getWaOptInStatus.mockResolvedValueOnce(status('PENDING')).mockResolvedValue(status('ACTIVE'))
      await act(async () => { renderScreen(locale) })
      expect(mock.announce).not.toHaveBeenCalled()
      await act(async () => { await vi.advanceTimersByTimeAsync(5000) })
      expect(screen.getByTestId('wa-opt-in-revoke')).toBeInTheDocument()
      expect(mock.announce).toHaveBeenCalledTimes(1)
      const title = screen.getByTestId('wa-opt-in-active').firstElementChild?.textContent
      expect(title).toBeTruthy()
      expect(mock.announce).toHaveBeenCalledWith(title)
    })
  }

  it('⭐ P6 — ACTIVE → off from a foreground refresh (an external STOP) is announced as "not on"; ACTIVE while sending is disabled → off too', async () => {
    for (const available of [true, false]) {
      mock.announce.mockReset()
      mock.getWaOptInStatus.mockReset()
      mock.getWaOptInStatus.mockResolvedValueOnce(status('ACTIVE', { available })).mockResolvedValue(status('REVOKED', { available }))
      renderScreen()
      await screen.findByTestId('wa-opt-in-revoke')
      expect(mock.announce).not.toHaveBeenCalled()
      await act(async () => { changeAppState('background'); changeAppState('active') })
      expect(screen.queryByTestId('wa-opt-in-revoke')).toBeNull()
      expect(mock.announce, String(available)).toHaveBeenCalledWith('WhatsApp notifications are not on')
      cleanup()
    }
  })

  it('⭐ P6 — a change read while the app is not in front is not announced', async () => {
    mock.getWaOptInStatus.mockResolvedValueOnce(status(null)).mockResolvedValue(status('PENDING'))
    mock.requestWaOptIn.mockResolvedValue({ state: 'PENDING', deepLink: 'https://wa.me/919876543210?text=TWT-ABCDEFGH' })
    // WhatsApp is in front when the post-mint read lands.
    mock.openURL.mockImplementation(async () => { mock.appState = 'background' })
    renderScreen()
    await screen.findByTestId('wa-opt-in-enable')
    await act(async () => { fireEvent.click(screen.getByTestId('wa-opt-in-enable')) })
    await screen.findByTestId('wa-opt-in-pending')
    expect(mock.announce).not.toHaveBeenCalled()
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
