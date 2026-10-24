// @vitest-environment jsdom
// Story 6.36e (fix-diff review 2026-10-24) — the marked member's REQUESTS SCREEN, EXECUTED with React DOM and mocked native
// primitives (the 6.36b `known-people-screen-render` harness; the REAL `t()`, the REAL `AnnouncedText` / announcement plan and the
// REAL `withTimeout` run — MOCKED: `react-native`, `tamagui` (plain elements), `expo-router`, the query hooks, the i18n hook (it calls
// the real `t()`) and `lib/idempotency-key` (a counter, so a reused key is visible); a screen reader and layout still need a device):
//   · ⭐ the REGRESSION — the answer no longer waits for the requests reload (a stalled reload held every button busy forever),
//     so a request the member has JUST answered must show as ANSWERED at once: ⛔ Yes / No again, and ⛔ a second tap refused
//     "can no longer be answered" straight after "saved";
//   · a request the server calls closed / changed DROPS its Yes / No and says so (round 3: ⛔ dead buttons and, once the message is
//     replaced, ⛔ no words); any OTHER failure leaves them live;
//   · the row believes the server's RECORDED answer, ⛔ the tap (round 3) — today the two are equal on this screen, and the test says
//     so: a replay only happens for the SAME Idempotency-Key and only the same answer reuses one (round 4);
//   · ONE answer in flight (two taps in one batch send one POST), and a retry of the SAME answer after the bound carries the SAME
//     key — so it replays the first outcome instead of meeting a 409 — while the OTHER answer, a success and a closure start fresh;
//   · the answer POST is BOUNDED: one that never settles fails at `CALL_TIMEOUT_MS` and the buttons are live again (round 3);
//   · a REPEATED load failure after *Retry* is spoken again (the error line stays mounted, so only its key can say "again"), and
//     while *Retry* runs v5 resets the query to PENDING — the error line and the button stay, with ONE spinner (round 3);
//   · the buttons name the declarer.
import '@testing-library/jest-dom/vitest'
import { createElement } from 'react'
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mock = vi.hoisted(() => ({
  keys: 0,
  announce: vi.fn(),
  answer: vi.fn(),
  refetch: vi.fn(),
  requests: null as unknown as Record<string, unknown>,
}))

class FakeApiError extends Error {
  constructor(readonly status: number, readonly code: string) {
    super(code)
  }
}

vi.mock('../../components/nominee-links/useNomineeLinkQueries', () => ({
  useNomineeLinkRequestsQuery: () => mock.requests,
  useNomineeLinkAnswer: () => ({ mutateAsync: mock.answer }),
  errorCodeOf: (e: unknown) => (e instanceof FakeApiError ? e.code : undefined),
}))
vi.mock('expo-router', () => ({ Stack: { Screen: () => null } }))
vi.mock('react-native', async () => {
  const { createElement } = await import('react')
  return {
    ScrollView: ({ children }: { children: React.ReactNode }) => createElement('div', null, children),
    Platform: { OS: 'ios' },
    AccessibilityInfo: { announceForAccessibility: mock.announce },
  }
})
vi.mock('../../lib/nominee-link-i18n', async () => {
  const { t } = await import('@twt/i18n')
  return { useNomineeLinkT: () => (key: string, params?: Record<string, string | number>) => t(key, params, { locale: 'en', namespace: 'nominee_link' }) }
})
vi.mock('../../lib/idempotency-key', () => ({ newIdempotencyKey: () => `k${(mock.keys += 1)}` }))
vi.mock('tamagui', async () => {
  const { createElement } = await import('react')
  const container = ({ children, accessibilityRole, testID }: { children?: React.ReactNode; accessibilityRole?: string; testID?: string }) =>
    createElement('div', { role: accessibilityRole === 'alert' ? 'alert' : undefined, 'data-testid': testID }, children)
  return {
    H2: container, Paragraph: container, Text: container, XStack: container, YStack: container,
    Spinner: () => createElement('span', null, 'spinner'),
    Button: ({ children, onPress, disabled, accessibilityLabel }: { children: React.ReactNode; onPress?: () => void; disabled?: boolean; accessibilityLabel?: string }) =>
      createElement('button', { onClick: onPress, disabled, 'aria-label': accessibilityLabel }, children),
  }
})

import NomineeLinkRequestsScreen from '../../app/(life-events)/nominee-link-requests'
import { CALL_TIMEOUT_MS } from '../../lib/with-timeout'

const L1 = '11111111-1111-4111-8111-111111111111'
const AT = '2026-10-24T10:00:00.000Z'
/** The query result the screen reads: ONE open request that STAYS open in the data (the reload has not landed). */
function queryWith(over: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    data: { pages: [{ items: [{ linkId: L1, answer: null, name: 'Asha D.', askedAt: AT }], nextCursor: null, hasMore: false }] },
    error: null,
    isLoading: false,
    isError: false,
    isSuccess: true,
    hasNextPage: false,
    isFetchingNextPage: false,
    isFetchNextPageError: false,
    errorUpdatedAt: 0,
    refetch: mock.refetch,
    fetchNextPage: vi.fn(),
    ...over,
  }
}
const yes = () => screen.getByRole('button', { name: /^Yes, that's me/ })
const no = () => screen.getByRole('button', { name: /^No, that's not me/ })

beforeEach(() => {
  mock.requests = queryWith()
  mock.keys = 0
})
afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

describe('the requests screen — a request the member has just answered', () => {
  it('⭐ shows as ANSWERED at once, with ⛔ Yes / No — although the reload has not landed (`answer` is still null in the data)', async () => {
    mock.answer.mockResolvedValue({ linkId: L1, answer: 'confirmed' })
    render(createElement(NomineeLinkRequestsScreen))
    expect(yes()).toHaveAccessibleName("Yes, that's me — Asha D.") // WCAG 2.5.3 + WHICH declarer
    await userEvent.click(yes())
    expect(await screen.findByText('You said this is you.')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /^Yes, that's me/ })).toBeNull()
    expect(screen.queryByRole('button', { name: /^No, that's not me/ })).toBeNull()
    expect(screen.getByText('Your answer has been saved.')).toBeInTheDocument()
    expect(mock.answer).toHaveBeenCalledTimes(1) // ⛔ a second tap is not even possible
    expect(mock.answer).toHaveBeenCalledWith({ linkId: L1, answer: 'yes', idempotencyKey: 'k1' })
  })

  it('"No, that\'s not me" shows as `not me` the same way', async () => {
    mock.answer.mockResolvedValue({ linkId: L1, answer: 'not_me' })
    render(createElement(NomineeLinkRequestsScreen))
    await userEvent.click(no())
    expect(await screen.findByText('You said this is not you.')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /^Yes, that's me/ })).toBeNull()
  })

  it('⭐ round 3 — the row believes the server\'s RECORDED answer, ⛔ the tap (a contract of the screen: today the two are equal, since a fresh key never replays)', async () => {
    mock.answer.mockResolvedValue({ linkId: L1, answer: 'confirmed' }) // what the server says it recorded
    render(createElement(NomineeLinkRequestsScreen))
    await userEvent.click(no())
    expect(await screen.findByText('You said this is you.')).toBeInTheDocument()
    expect(screen.queryByText('You said this is not you.')).toBeNull()
  })
})

describe('the requests screen — one answer at a time, one key per answer (round 4)', () => {
  it('⭐ two taps in ONE batch send ONE POST — `busyLink` state disables nothing until a re-render', async () => {
    let resolveAnswer!: (v: { linkId: string; answer: 'confirmed' }) => void
    mock.answer.mockReturnValue(new Promise((r) => (resolveAnswer = r)))
    render(createElement(NomineeLinkRequestsScreen))
    const button = yes()
    await act(async () => {
      button.click()
      button.click()
    })
    expect(mock.answer).toHaveBeenCalledTimes(1)
    resolveAnswer({ linkId: L1, answer: 'confirmed' })
    expect(await screen.findByText('You said this is you.')).toBeInTheDocument()
    expect(mock.answer).toHaveBeenCalledTimes(1)
  })

  it('⭐ a retry of the SAME answer after a stall carries the SAME Idempotency-Key (the first POST may have landed); the OTHER answer starts fresh', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    try {
      mock.answer
        .mockReturnValueOnce(new Promise(() => undefined)) // stalls past the bound
        .mockRejectedValueOnce(new FakeApiError(503, 'http.503')) // the retry fails non-finally
        .mockResolvedValueOnce({ linkId: L1, answer: 'not_me' })
      render(createElement(NomineeLinkRequestsScreen))
      fireEvent.click(yes())
      await act(async () => undefined)
      await vi.advanceTimersByTimeAsync(CALL_TIMEOUT_MS + 200)
      await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('Something went wrong. Try again.'))
      fireEvent.click(yes()) // the SAME answer: the same key
      await waitFor(() => expect(mock.answer).toHaveBeenCalledTimes(2))
      await waitFor(() => expect(yes()).not.toBeDisabled())
      fireEvent.click(no()) // a DIFFERENT answer is a different act
      expect(await screen.findByText('You said this is not you.')).toBeInTheDocument()
      const keys = mock.answer.mock.calls.map(([call]) => (call as { idempotencyKey: string }).idempotencyKey)
      expect(keys).toEqual(['k1', 'k1', 'k2'])
    } finally {
      vi.useRealTimers()
    }
  })
})

describe('the requests screen — a stalled answer', () => {
  it('⭐ an answer POST that NEVER settles fails at the bound — the buttons are live again, the member can try again', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    try {
      mock.answer.mockReturnValueOnce(new Promise(() => undefined)).mockResolvedValueOnce({ linkId: L1, answer: 'confirmed' })
      render(createElement(NomineeLinkRequestsScreen))
      fireEvent.click(yes())
      await act(async () => undefined)
      expect(yes()).toBeDisabled() // in flight: every row is busy
      await vi.advanceTimersByTimeAsync(CALL_TIMEOUT_MS + 200)
      await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('Something went wrong. Try again.'))
      expect(yes()).not.toBeDisabled() // ⛔ disabled for good
      fireEvent.click(yes())
      expect(await screen.findByText('You said this is you.')).toBeInTheDocument()
      expect(mock.answer).toHaveBeenCalledTimes(2)
    } finally {
      vi.useRealTimers()
    }
  })
})

describe('the requests screen — a refused answer', () => {
  it('a request the server calls CLOSED drops its Yes / No and SAYS so on the row — ⛔ a second tap, ⛔ silence once the message is replaced', async () => {
    mock.answer.mockRejectedValue(new FakeApiError(409, 'nominee_link.request_closed'))
    render(createElement(NomineeLinkRequestsScreen))
    await userEvent.click(yes())
    expect(await screen.findByRole('alert')).toHaveTextContent('This request can no longer be answered.')
    expect(screen.queryByRole('button', { name: /^Yes, that's me/ })).toBeNull()
    expect(screen.queryByRole('button', { name: /^No, that's not me/ })).toBeNull()
    expect(screen.getByTestId(`nominee-request-closed-${L1}`)).toHaveTextContent('This request can no longer be answered.') // the row's own words
    expect(screen.queryByText(/While this stands/)).toBeNull() // ⛔ a consequence for a request that does not stand
    expect(mock.answer).toHaveBeenCalledTimes(1)
  })

  it('a request that has CHANGED (not found): the spoken line says the reload is under way, the ROW says the permanent thing — ⛔ "being reloaded" left on a row for good', async () => {
    mock.answer.mockRejectedValue(new FakeApiError(404, 'nominee_link.not_found'))
    render(createElement(NomineeLinkRequestsScreen))
    await userEvent.click(yes())
    expect(await screen.findByRole('alert')).toHaveTextContent('This request has changed. The list is being reloaded.')
    expect(screen.getByTestId(`nominee-request-closed-${L1}`)).toHaveTextContent('This request can no longer be answered.')
    expect(screen.getByTestId(`nominee-request-closed-${L1}`)).not.toHaveTextContent(/reloaded/)
  })

  it('a failure that is NOT a closure (the network, a 500) leaves the buttons LIVE — the member can try again', async () => {
    mock.answer.mockRejectedValueOnce(new FakeApiError(503, 'http.503')).mockResolvedValueOnce({ linkId: L1, answer: 'confirmed' })
    render(createElement(NomineeLinkRequestsScreen))
    await userEvent.click(yes())
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('Something went wrong. Try again.'))
    expect(yes()).not.toBeDisabled()
    await userEvent.click(yes())
    expect(await screen.findByText('You said this is you.')).toBeInTheDocument()
    expect(mock.answer).toHaveBeenCalledTimes(2)
  })
})

describe('the requests screen — a load failure', () => {
  it('⭐ a REPEATED failure after *Retry* is SPOKEN again (the line stays mounted; only its key can say "again")', async () => {
    mock.requests = queryWith({ data: undefined, isError: true, isSuccess: false, errorUpdatedAt: 1 })
    // the retry FAILS again: the query reports a later failure time
    mock.refetch.mockImplementation(async () => {
      mock.requests = queryWith({ data: undefined, isError: true, isSuccess: false, errorUpdatedAt: 2 })
    })
    render(createElement(NomineeLinkRequestsScreen))
    const said = () => mock.announce.mock.calls.filter(([text]) => text === 'Could not load. Check your connection and try again.').length
    expect(said()).toBe(1)
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }))
    await waitFor(() => expect(said()).toBe(2))
    expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument() // still mounted, ready for the next try
  })

  it('⭐ round 3 — while *Retry* runs and v5 has reset the query to PENDING, the error line and the button STAY and there is ONE spinner', async () => {
    mock.requests = queryWith({ data: undefined, isError: true, isSuccess: false, errorUpdatedAt: 1 })
    let finish!: () => void
    mock.refetch.mockImplementation(() => {
      // what TanStack v5 does the moment a refetch of an errored query starts: pending, ⛔ error, ⛔ data
      mock.requests = queryWith({ data: undefined, isLoading: true, isError: false, isSuccess: false, errorUpdatedAt: 1 })
      return new Promise<void>((r) => (finish = r))
    })
    render(createElement(NomineeLinkRequestsScreen))
    expect(screen.queryByText('spinner')).toBeNull()
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }))
    expect(screen.getByTestId('nominee-requests-error')).toBeInTheDocument() // the `|| retrying` branch: kept although `isError` is now false
    expect(screen.getByRole('button', { name: 'Try again' })).toBeDisabled()
    expect(screen.getAllByText('spinner')).toHaveLength(1) // the button's own — ⛔ a second, on the page
    finish()
  })
})
