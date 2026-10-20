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
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { LocaleProvider } from '@twt/i18n/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mock = vi.hoisted(() => ({
  getWaOptInStatus: vi.fn(),
  requestWaOptIn: vi.fn(),
  revokeWaOptIn: vi.fn(),
  openURL: vi.fn(),
}))

vi.mock('../../lib/mmkv', () => ({ mmkvStorage: { getItem: () => null, setItem: () => undefined, removeItem: () => undefined } }))
vi.mock('../../lib/member-api', () => ({
  memberAuth: { getWaOptInStatus: mock.getWaOptInStatus, requestWaOptIn: mock.requestWaOptIn, revokeWaOptIn: mock.revokeWaOptIn },
}))
vi.mock('expo-router', () => ({ Stack: { Screen: () => null } }))
vi.mock('react-native', async () => {
  const { createElement } = await import('react')
  return {
    ScrollView: ({ children }: { children?: ReactNode }) => createElement('div', null, children),
    Linking: { openURL: mock.openURL },
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
  for (const f of Object.values(mock)) f.mockReset()
  mock.revokeWaOptIn.mockResolvedValue({ state: 'REVOKED' })
})
afterEach(cleanup)

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

  it('REVOKED and null ⇒ the off branch; available: false ⇒ the unavailable line', async () => {
    for (const state of ['REVOKED', null]) {
      mock.getWaOptInStatus.mockResolvedValue(status(state))
      renderScreen()
      await screen.findByTestId('wa-opt-in-off')
      expect(screen.queryByTestId('wa-opt-in-retry')).toBeNull()
      cleanup()
    }
    mock.getWaOptInStatus.mockResolvedValue(status('ACTIVE', { available: false }))
    renderScreen()
    await screen.findByTestId('wa-opt-in-unavailable')
    expect(screen.queryByTestId('wa-opt-in-revoke')).toBeNull()
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
