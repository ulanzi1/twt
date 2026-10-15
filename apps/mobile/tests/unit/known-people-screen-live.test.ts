// @vitest-environment jsdom
// Story 6.36b — the people screen through its REAL query hooks and a real QueryClient (only the API is mocked): the
// not-available Retry end to end (fix-diff review round 7 — the mocked-hook tests could not see a refusal re-spoken, nor
// the reset's own loading state). Native layout and a real screen reader still need a device.
import '@testing-library/jest-dom/vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ApiError } from '@twt/api-client'
import { createElement } from 'react'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'

const mock = vi.hoisted(() => ({ announce: vi.fn(), list: vi.fn(), requests: vi.fn(), store: new Map<string, string>() }))

vi.mock('../../lib/known-people-api', () => ({ knownPeopleApi: { list: mock.list, requests: mock.requests } }))
vi.mock('../../lib/session-context', () => ({ useSession: () => ({ session: { memberId: 'm', pariwarId: 'p' }, isLoading: false }) }))
vi.mock('../../lib/mmkv', () => ({
  mmkvStorage: {
    getItem: (k: string) => mock.store.get(k) ?? null,
    setItem: (k: string, v: string) => void mock.store.set(k, v),
    removeItem: (k: string) => void mock.store.delete(k),
  },
}))
vi.mock('expo-router', () => ({ Stack: { Screen: () => null }, useRouter: () => ({ push: vi.fn() }) }))
vi.mock('../../lib/known-people-i18n', () => ({ useKnownPeopleT: () => (key: string) => key }))
vi.mock('../../lib/idempotency-key', () => ({ newIdempotencyKey: () => 'k' }))
vi.mock('react-native', async () => {
  const { createElement } = await import('react')
  return {
    ScrollView: ({ children }: { children: React.ReactNode }) => createElement('div', null, children),
    Platform: { OS: 'ios' },
    AccessibilityInfo: { announceForAccessibility: mock.announce },
  }
})
vi.mock('tamagui', async () => {
  const { createElement } = await import('react')
  const container = ({ children }: { children?: React.ReactNode }) => createElement('div', null, children)
  return {
    H2: container, H3: container, Paragraph: container, Text: container, XStack: container, YStack: container,
    Spinner: () => createElement('span', null, 'spinner'),
    Button: ({ children, onPress, disabled, accessibilityLabel }: { children: React.ReactNode; onPress?: () => void; disabled?: boolean; accessibilityLabel?: string }) =>
      createElement('button', { onClick: onPress, disabled, 'aria-label': accessibilityLabel }, children),
  }
})

import KnownPeopleScreen from '../../app/(life-events)/known-people'

const denied = () => new ApiError(403, 'known_people.not_available', 'not available')
const spoken = (text: string) => mock.announce.mock.calls.filter(([t]) => t === text).length

function renderScreen() {
  const client = new QueryClient({ defaultOptions: { queries: { retryDelay: 0 } } })
  render(createElement(QueryClientProvider, { client }, createElement(KnownPeopleScreen)))
  return client
}

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
  mock.store.clear()
})

describe('the not-available Retry, through the real hooks', () => {
  it('refused again: "Loading…" is spoken at once, then the message is SPOKEN AGAIN — however fast the refusal comes', async () => {
    mock.list.mockRejectedValue(denied())
    mock.requests.mockRejectedValue(denied())
    const client = renderScreen()
    try {
      await waitFor(() => expect(spoken('error.not_available')).toBe(1))
      await userEvent.click(screen.getByRole('button', { name: 'retry' }))
      await waitFor(() => expect(spoken('error.not_available')).toBe(2))
      expect(spoken('loading')).toBe(1)
      expect(spoken('loaded')).toBe(0)
      expect(mock.list).toHaveBeenCalledTimes(2)
      expect(mock.requests).toHaveBeenCalledTimes(2)
    } finally {
      client.clear()
    }
  })

  it('the two lists refused in DIFFERENT renders: "not available" is spoken EXACTLY once on open, and once per Retry (round 8)', async () => {
    const later = (ms: number) => () => new Promise((_, reject) => setTimeout(() => reject(denied()), ms))
    mock.list.mockImplementation(later(0))
    mock.requests.mockImplementation(later(60)) // the second refusal lands well after the first has rendered
    const settled = () => new Promise((r) => setTimeout(r, 150))
    const client = renderScreen()
    try {
      await waitFor(() => expect(mock.requests).toHaveBeenCalledTimes(1))
      await settled()
      expect(spoken('error.not_available')).toBe(1)
      await userEvent.click(screen.getByRole('button', { name: 'retry' }))
      await waitFor(() => expect(mock.requests).toHaveBeenCalledTimes(2))
      await settled()
      expect(spoken('error.not_available')).toBe(2)
    } finally {
      client.clear()
    }
  })

  it('access back: "Loaded." is shown and spoken, and the lists render', async () => {
    mock.list.mockRejectedValueOnce(denied()).mockResolvedValue({ items: [], freeSlots: 3 })
    mock.requests
      .mockRejectedValueOnce(denied())
      .mockResolvedValue({ items: [{ linkId: '33333333-3333-4333-8333-333333333333', state: 'asked', name: 'Asha D.', askedAt: '2026-10-14T10:00:00.000Z' }], nextCursor: null, hasMore: false })
    const client = renderScreen()
    try {
      await waitFor(() => expect(screen.getByText('error.not_available')).toBeInTheDocument())
      await userEvent.click(screen.getByRole('button', { name: 'retry' }))
      await waitFor(() => expect(screen.getByText('loaded')).toBeInTheDocument())
      expect(spoken('loaded')).toBe(1)
      expect(screen.queryByText('error.not_available')).toBeNull()
      expect(screen.getByRole('button', { name: 'request.yes' })).toBeInTheDocument()
    } finally {
      client.clear()
    }
  })
})
