// @vitest-environment jsdom
// Story 6.36b — the people screen and the home entry, EXECUTED with React DOM and mocked native primitives (the
// `peer-questionnaire-render` harness): the real handlers and branches run; native layout and an actual screen reader
// still need a device ([[feedback_record_unattested_no_backfill]]).
//   · review 2026-10-15 R5 — every completed action is SHOWN and SPOKEN (iOS: `announceForAccessibility`), a refusal too;
//   · R3 — the requests list joins its loaded pages and offers *"Show more"* while the server says there are more;
//   · R4 — the home entry hides when a refetch is denied, although the cached pages still hold an open request.
import '@testing-library/jest-dom/vitest'
import { createElement } from 'react'
import { act, cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mock = vi.hoisted(() => ({
  store: new Map<string, string>(),
  announce: vi.fn(),
  answer: vi.fn(),
  withdraw: vi.fn(),
  remove: vi.fn(),
  fetchNextPage: vi.fn(),
  restart: vi.fn(),
  refresh: vi.fn(),
  interactions: [] as (() => void)[],
  cancelled: 0,
  mine: null as unknown,
  requests: null as unknown,
}))

class FakeApiError extends Error {
  constructor(readonly status: number, readonly code: string) {
    super(code)
  }
}

vi.mock('../../components/known-people/useKnownPeopleQueries', () => ({
  useMyKnownPeopleQuery: () => mock.mine,
  useKnownPeopleRequestsQuery: () => mock.requests,
  useKnownPeopleWrites: () => ({
    answer: { mutateAsync: mock.answer },
    withdraw: { mutateAsync: mock.withdraw },
    remove: { mutateAsync: mock.remove },
    refresh: mock.refresh,
  }),
  errorCodeOf: (e: unknown) => (e instanceof FakeApiError ? e.code : undefined),
  useRestartKnownPeopleLists: () => mock.restart,
}))
vi.mock('expo-router', async () => {
  const { useEffect } = await import('react')
  // `useFocusEffect` runs its callback whenever the (memoised) callback changes — here, on mount: the screen is focused.
  return { Stack: { Screen: () => null }, useRouter: () => ({ push: vi.fn() }), useFocusEffect: (cb: () => void) => useEffect(() => cb(), [cb]) }
})
vi.mock('../../lib/known-people-i18n', () => ({
  useKnownPeopleT: () => (key: string, params?: Record<string, unknown>) => (params?.['name'] ? `${key}:${String(params['name'])}` : key),
}))
vi.mock('../../lib/idempotency-key', () => ({ newIdempotencyKey: () => 'k' }))
vi.mock('../../lib/session-context', () => ({ useSession: () => ({ session: { memberId: 'm', pariwarId: 'p' }, isLoading: false }) }))
// The REAL saved-names module over an in-memory MMKV (a no-op stub hid the round-4 wipe — fix-diff review H1).
vi.mock('../../lib/mmkv', () => ({
  mmkvStorage: {
    getItem: (k: string) => mock.store.get(k) ?? null,
    setItem: (k: string, v: string) => void mock.store.set(k, v),
    removeItem: (k: string) => void mock.store.delete(k),
  },
}))
vi.mock('react-native', async () => {
  const { createElement } = await import('react')
  return {
    ScrollView: ({ children }: { children: React.ReactNode }) => createElement('div', null, children),
    Platform: { OS: 'ios' },
    AccessibilityInfo: { announceForAccessibility: mock.announce },
    // DEFERRED, so a test proves the notice waits for the interactions and that a blur cancels it (the timing itself is
    // a device check — FD-4).
    InteractionManager: {
      runAfterInteractions: (cb: () => void) => {
        mock.interactions.push(cb)
        return {
          cancel: () => {
            mock.cancelled += 1
            mock.interactions = mock.interactions.filter((q) => q !== cb)
          },
        }
      },
    },
  }
})
vi.mock('tamagui', async () => {
  const { createElement } = await import('react')
  const container = ({ children, accessibilityRole }: { children?: React.ReactNode; accessibilityRole?: string }) =>
    createElement('div', { role: accessibilityRole === 'alert' ? 'alert' : undefined }, children)
  return {
    H2: container, H3: container, Paragraph: container, Text: container, XStack: container, YStack: container,
    Spinner: () => createElement('span', null, 'spinner'),
    Button: ({ children, onPress, disabled, accessibilityLabel }: { children: React.ReactNode; onPress?: () => void; disabled?: boolean; accessibilityLabel?: string }) =>
      createElement('button', { onClick: onPress, disabled, 'aria-label': accessibilityLabel }, children),
  }
})

import KnownPeopleScreen from '../../app/(life-events)/known-people'
import { KnownPeopleRequestEntry } from '../../components/known-people/KnownPeopleRequestEntry'
import { DENIED_MY_KNOWN_PEOPLE, DENIED_REQUESTS_PAGE } from '../../lib/known-people'
import { clearKnownPeopleNotices, handKnownPeopleNotice, NOTICE_TTL_MS, takeKnownPeopleNotice } from '../../lib/known-people-notice'
import { loadSavedNames, saveSavedName } from '../../lib/known-people-saved-names'

type Req = { linkId: string; state: 'asked' | 'accepted'; name: string | null; askedAt: string }
const AT = '2026-10-14T10:00:00.000Z'
function requestsQuery(pages: Req[][], over: Record<string, unknown> = {}) {
  const data = { pages: pages.map((items, i) => ({ items, nextCursor: i < pages.length - 1 ? `c${i + 1}` : null, hasMore: i < pages.length - 1 })) }
  return {
    data,
    isLoading: false, isError: false, isFetching: false, isFetchNextPageError: false, isFetchingNextPage: false,
    hasNextPage: false, error: null, refetch: vi.fn(async () => ({ data, isError: false })), fetchNextPage: mock.fetchNextPage, ...over,
  }
}
/** A namer's-list query mock whose `refetch` resolves as TanStack's does — with the settled result. */
function mineQuery(data: unknown, over: Record<string, unknown> = {}) {
  return { data, isLoading: false, isError: false, error: null, refetch: vi.fn(async () => ({ data, isError: false })), ...over }
}

beforeEach(() => {
  mock.store.clear()
  saveSavedName('m', 'l1', 'Meena (school)')
  mock.mine = mineQuery({ items: [{ linkId: 'l1', label: 'asked', name: null, askedAt: AT }], freeSlots: 2 })
  mock.requests = requestsQuery([[
    { linkId: 'r1', state: 'asked', name: 'Asha D.', askedAt: AT },
    { linkId: 'r2', state: 'accepted', name: 'Ravi K.', askedAt: AT },
  ]])
  for (const f of [mock.answer, mock.withdraw, mock.remove]) f.mockResolvedValue({})
  mock.restart.mockResolvedValue({ restored: false })
  mock.refresh.mockResolvedValue(undefined)
  mock.interactions = []
  mock.cancelled = 0
  clearKnownPeopleNotices()
})

/** Settle the running interactions (what `runAfterInteractions` waits for). */
function flushInteractions(): void {
  act(() => {
    const queued = mock.interactions
    mock.interactions = []
    for (const cb of queued) cb()
  })
}
afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

describe('R5 — every completed action is shown AND spoken', () => {
  it.each([
    ['request.yes_a11y:Asha D.', 'done.accepted:Asha D.', () => mock.answer],
    ['request.no_a11y:Asha D.', 'done.declined:Asha D.', () => mock.answer],
    ['request.withdraw_a11y:Ravi K.', 'done.withdrawn:Ravi K.', () => mock.withdraw],
    ['action.remove_a11y:Meena (school)', 'done.removed:Meena (school)', () => mock.remove],
  ])('%s ⇒ "%s"', async (label, spoken, write) => {
    render(createElement(KnownPeopleScreen))
    await userEvent.click(screen.getByRole('button', { name: label }))
    expect(write()).toHaveBeenCalledTimes(1)
    expect(await screen.findByText(spoken)).toBeInTheDocument()
    expect(mock.announce).toHaveBeenCalledWith(spoken)
  })

  it('the SAME words twice are spoken twice; a refusal is spoken as an alert', async () => {
    render(createElement(KnownPeopleScreen))
    await userEvent.click(screen.getByRole('button', { name: 'request.withdraw_a11y:Ravi K.' }))
    await userEvent.click(screen.getByRole('button', { name: 'request.withdraw_a11y:Ravi K.' }))
    expect(mock.announce.mock.calls.filter(([text]) => text === 'done.withdrawn:Ravi K.')).toHaveLength(2)
    mock.answer.mockRejectedValueOnce(new FakeApiError(409, 'known_people.request_closed'))
    await userEvent.click(screen.getByRole('button', { name: 'request.yes_a11y:Asha D.' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('error.request_closed')
    expect(mock.announce).toHaveBeenLastCalledWith('error.request_closed')
  })
})

describe('R3 — the requests list, page by page', () => {
  it('joins the loaded pages (each link once) and offers "Show more" while there are more — never cancelling a fetch', async () => {
    mock.requests = requestsQuery(
      [[{ linkId: 'r1', state: 'asked', name: 'Asha D.', askedAt: AT }], [{ linkId: 'r1', state: 'asked', name: 'Asha D.', askedAt: AT }, { linkId: 'r9', state: 'accepted', name: 'Oldest O.', askedAt: AT }]],
      { hasNextPage: true },
    )
    render(createElement(KnownPeopleScreen))
    expect(screen.getAllByText('request.question:Asha D.')).toHaveLength(1)
    expect(screen.getByText('request.accepted:Oldest O.')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'requests.show_more' }))
    expect(mock.fetchNextPage).toHaveBeenCalledWith({ cancelRefetch: false })
  })

  it('"Show more" waits while ANY fetch is in flight (a write\'s refetch included) and keeps its name while loading (F1, F5)', () => {
    mock.requests = requestsQuery([[{ linkId: 'r9', state: 'accepted', name: 'Oldest O.', askedAt: AT }], []], { hasNextPage: true, isFetching: true })
    const { rerender } = render(createElement(KnownPeopleScreen))
    expect(screen.getByRole('button', { name: 'requests.show_more' })).toBeDisabled()
    mock.requests = requestsQuery([[{ linkId: 'r9', state: 'accepted', name: 'Oldest O.', askedAt: AT }], []], { hasNextPage: true, isFetching: true, isFetchingNextPage: true })
    rerender(createElement(KnownPeopleScreen))
    expect(screen.getByRole('button', { name: 'requests.show_more' })).toHaveTextContent('spinner')
  })

  it('"Show more" waits for a write in flight (its refetch would cancel the page — fix-diff review G1)', async () => {
    mock.requests = requestsQuery([[{ linkId: 'r1', state: 'asked', name: 'Asha D.', askedAt: AT }], []], { hasNextPage: true })
    let finish!: () => void
    mock.answer.mockReturnValueOnce(new Promise<void>((resolve) => (finish = resolve)))
    render(createElement(KnownPeopleScreen))
    expect(screen.getByRole('button', { name: 'requests.show_more' })).toBeEnabled()
    await userEvent.click(screen.getByRole('button', { name: 'request.yes_a11y:Asha D.' }))
    expect(screen.getByRole('button', { name: 'requests.show_more' })).toBeDisabled()
    await act(async () => finish())
    expect(screen.getByRole('button', { name: 'requests.show_more' })).toBeEnabled()
  })

  it('a failed page\'s Retry waits for a write in flight too (G1)', async () => {
    mock.requests = requestsQuery([[{ linkId: 'r1', state: 'asked', name: 'Asha D.', askedAt: AT }]], {
      hasNextPage: true, isError: true, isFetchNextPageError: true, error: new FakeApiError(503, 'x'), errorUpdatedAt: 1,
    })
    let finish!: () => void
    mock.answer.mockReturnValueOnce(new Promise<void>((resolve) => (finish = resolve)))
    render(createElement(KnownPeopleScreen))
    expect(screen.getByRole('button', { name: 'retry' })).toBeEnabled()
    await userEvent.click(screen.getByRole('button', { name: 'request.yes_a11y:Asha D.' }))
    expect(screen.getByRole('button', { name: 'retry' })).toBeDisabled()
    await act(async () => finish())
    expect(screen.getByRole('button', { name: 'retry' })).toBeEnabled()
  })

  it('the writes stay ENABLED while a page loads — ⛔ every answer locked behind a fetch with no timeout (G2, superseding E2)', () => {
    mock.requests = requestsQuery(
      [[{ linkId: 'r1', state: 'asked', name: 'Asha D.', askedAt: AT }, { linkId: 'r2', state: 'accepted', name: 'Ravi K.', askedAt: AT }], []],
      { hasNextPage: true, isFetching: true, isFetchingNextPage: true },
    )
    render(createElement(KnownPeopleScreen))
    for (const name of ['request.yes_a11y:Asha D.', 'request.no_a11y:Asha D.', 'request.withdraw_a11y:Ravi K.', 'action.remove_a11y:Meena (school)']) {
      expect(screen.getByRole('button', { name })).toBeEnabled()
    }
  })

  it('a failed "Show more" keeps the rows and offers its own Retry; a SECOND failure is spoken again (F4)', async () => {
    const failed = (errorUpdatedAt: number) =>
      requestsQuery([[{ linkId: 'r9', state: 'accepted', name: 'Oldest O.', askedAt: AT }]], {
        hasNextPage: true, isError: true, isFetchNextPageError: true, error: new FakeApiError(503, 'x'), errorUpdatedAt,
      })
    mock.requests = failed(1)
    const { rerender } = render(createElement(KnownPeopleScreen))
    expect(screen.getByText('request.accepted:Oldest O.')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'retry' }))
    expect(mock.fetchNextPage).toHaveBeenCalledWith({ cancelRefetch: false })
    mock.requests = failed(2)
    rerender(createElement(KnownPeopleScreen))
    expect(mock.announce.mock.calls.filter(([text]) => text === 'error.load')).toHaveLength(2)
  })
})

describe('R4 — the home entry', () => {
  it('shows for an open request; hides when the refetch is DENIED although `data` still holds it — ⛔ on another failure', () => {
    const { rerender, container } = render(createElement(KnownPeopleRequestEntry))
    expect(screen.getByRole('button')).toBeInTheDocument()
    mock.requests = requestsQuery([[{ linkId: 'r1', state: 'asked', name: 'Asha D.', askedAt: AT }]], {
      isError: true, error: new FakeApiError(403, 'known_people.not_available'),
    })
    act(() => rerender(createElement(KnownPeopleRequestEntry)))
    expect(container).toBeEmptyDOMElement()
    // a blip after a plain success: the open request still shows (only the denial hides it)
    mock.requests = requestsQuery([[{ linkId: 'r1', state: 'asked', name: 'Asha D.', askedAt: AT }]], {
      isError: true, isFetchNextPageError: false, error: new FakeApiError(503, 'network.unavailable'),
    })
    act(() => rerender(createElement(KnownPeopleRequestEntry)))
    expect(screen.getByRole('button')).toBeInTheDocument()
    // a blip AFTER a denial: the cached denial (the query's data) still hides it (fix-diff review E1)
    mock.requests = { ...requestsQuery([]), data: { pages: [DENIED_REQUESTS_PAGE] }, isError: true, error: new FakeApiError(503, 'network.unavailable') }
    act(() => rerender(createElement(KnownPeopleRequestEntry)))
    expect(container).toBeEmptyDOMElement()
  })
})

describe('the not-available state and the saved names (fix-diff reviews E1, G3, H1, round 5)', () => {
  const spoken = (text: string) => mock.announce.mock.calls.filter(([t]) => t === text).length
  const deniedRequests = () => ({
    ...requestsQuery([]),
    data: { pages: [DENIED_REQUESTS_PAGE] },
    refetch: vi.fn(async () => ({ data: { pages: [DENIED_REQUESTS_PAGE] }, isError: false })),
  })

  it('a cached denial (a page-2 denial beside an OPEN page 1) reads "not available" — ⛔ stale answer buttons; Retry refetches BOTH', async () => {
    const openPage = requestsQuery([[{ linkId: 'r1', state: 'asked', name: 'Asha D.', askedAt: AT }]]).data.pages[0]!
    const pages = [openPage, DENIED_REQUESTS_PAGE]
    mock.requests = { ...requestsQuery([]), data: { pages }, isError: true, error: new TypeError('Network request failed'), refetch: vi.fn(async () => ({ data: { pages }, isError: false })) }
    render(createElement(KnownPeopleScreen))
    expect(screen.getByText('error.not_available')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'request.yes_a11y:Asha D.' })).toBeNull()
    await userEvent.click(screen.getByRole('button', { name: 'retry' }))
    expect(mock.restart).toHaveBeenCalledTimes(1) // BOTH lists reloaded from nothing (the hook's own test: a hung first fetch too)
  })

  it('a denial held by the NAMER\'s list alone (beside an open request) reads "not available" (G3)', () => {
    mock.mine = mineQuery(DENIED_MY_KNOWN_PEOPLE, { isError: true, error: new TypeError('Network request failed') })
    render(createElement(KnownPeopleScreen))
    expect(screen.getByText('error.not_available')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'request.yes_a11y:Asha D.' })).toBeNull() // the default requests mock holds an OPEN one
  })

  it('a denial keeps every SAVED name — ⛔ pruned against its empty list (H1); a real empty list prunes', () => {
    mock.mine = mineQuery(DENIED_MY_KNOWN_PEOPLE)
    const { unmount } = render(createElement(KnownPeopleScreen))
    expect(loadSavedNames('m')).toEqual({ l1: 'Meena (school)' })
    unmount()
    // positive control: the member's list really is empty now (the link was removed elsewhere) ⇒ its name goes
    mock.mine = mineQuery({ items: [], freeSlots: 3 })
    render(createElement(KnownPeopleScreen))
    expect(loadSavedNames('m')).toEqual({})
  })

  it('a history AT its bound keeps the saved names (an older "Not accepted" row may come back into view) — round 5', () => {
    const ended = (n: number) => Array.from({ length: n }, (_, i) => ({ linkId: `x${i}`, label: 'not_accepted', name: null, askedAt: AT }))
    mock.mine = mineQuery({ items: ended(50), freeSlots: 3 })
    const { unmount } = render(createElement(KnownPeopleScreen))
    expect(loadSavedNames('m')).toEqual({ l1: 'Meena (school)' })
    unmount()
    mock.mine = mineQuery({ items: ended(49), freeSlots: 3 }) // below the bound: the list is complete ⇒ l1 is gone for good
    render(createElement(KnownPeopleScreen))
    expect(loadSavedNames('m')).toEqual({})
  })

  it('Retry reloads both lists; access back ⇒ "Loaded." is SHOWN and SPOKEN; refused again ⇒ ⛔ "Loaded."', async () => {
    mock.mine = mineQuery(DENIED_MY_KNOWN_PEOPLE)
    mock.requests = deniedRequests()
    const { rerender } = render(createElement(KnownPeopleScreen))
    await userEvent.click(screen.getByRole('button', { name: 'retry' })) // refused again (the default)
    expect(mock.restart).toHaveBeenCalledTimes(1)
    expect(spoken('loaded')).toBe(0)
    mock.restart.mockResolvedValueOnce({ restored: true })
    await userEvent.click(screen.getByRole('button', { name: 'retry' }))
    mock.mine = mineQuery({ items: [], freeSlots: 3 }) // the lists came back
    mock.requests = requestsQuery([[{ linkId: 'r1', state: 'asked', name: 'Asha D.', askedAt: AT }]])
    rerender(createElement(KnownPeopleScreen))
    expect(screen.getByText('loaded')).toBeInTheDocument()
    expect(spoken('loaded')).toBe(1)
  })

  it('only the LATEST Retry\'s outcome counts', async () => {
    mock.mine = mineQuery(DENIED_MY_KNOWN_PEOPLE)
    mock.requests = deniedRequests()
    const settle: ((v: { restored: boolean }) => void)[] = []
    mock.restart.mockImplementation(() => new Promise((resolve) => settle.push(resolve)))
    const { rerender } = render(createElement(KnownPeopleScreen))
    await userEvent.click(screen.getByRole('button', { name: 'retry' }))
    await userEvent.click(screen.getByRole('button', { name: 'retry' }))
    await act(async () => settle[1]!({ restored: false })) // the latest: refused
    await act(async () => settle[0]!({ restored: true })) // the superseded one, settling late
    mock.mine = mineQuery({ items: [], freeSlots: 3 })
    mock.requests = requestsQuery([[{ linkId: 'r1', state: 'asked', name: 'Asha D.', askedAt: AT }]])
    rerender(createElement(KnownPeopleScreen))
    expect(spoken('loaded')).toBe(0)
  })

  it('a notice from BEFORE a denial is not spoken again when the lists come back', async () => {
    const { rerender } = render(createElement(KnownPeopleScreen))
    await userEvent.click(screen.getByRole('button', { name: 'request.withdraw_a11y:Ravi K.' }))
    expect(spoken('done.withdrawn:Ravi K.')).toBe(1)
    const normal = { mine: mock.mine, requests: mock.requests }
    mock.mine = mineQuery(DENIED_MY_KNOWN_PEOPLE)
    act(() => rerender(createElement(KnownPeopleScreen)))
    mock.mine = normal.mine
    mock.requests = normal.requests
    act(() => rerender(createElement(KnownPeopleScreen)))
    expect(spoken('done.withdrawn:Ravi K.')).toBe(1)
    expect(screen.queryByText('done.withdrawn:Ravi K.')).toBeNull()
  })

  it('a write\'s notice that lands during the reload is ⛔ overwritten by a late "Loaded." (round 7, E2)', async () => {
    mock.mine = mineQuery(DENIED_MY_KNOWN_PEOPLE)
    mock.requests = deniedRequests()
    let settle!: (v: { restored: boolean }) => void
    mock.restart.mockImplementation(() => new Promise((resolve) => (settle = resolve)))
    const { rerender } = render(createElement(KnownPeopleScreen))
    await userEvent.click(screen.getByRole('button', { name: 'retry' }))
    // the lists come back while the restart is still settling; the member withdraws at once
    mock.mine = mineQuery({ items: [], freeSlots: 3 })
    mock.requests = requestsQuery([[{ linkId: 'r2', state: 'accepted', name: 'Ravi K.', askedAt: AT }]])
    rerender(createElement(KnownPeopleScreen))
    await userEvent.click(screen.getByRole('button', { name: 'request.withdraw_a11y:Ravi K.' }))
    await act(async () => settle({ restored: true }))
    expect(screen.getByText('done.withdrawn:Ravi K.')).toBeInTheDocument()
    expect(spoken('loaded')).toBe(0)
  })

  it('"Loading…" does not linger after a Retry that did not bring access back (round 8)', async () => {
    mock.mine = mineQuery(DENIED_MY_KNOWN_PEOPLE)
    mock.requests = deniedRequests()
    let settle!: (v: { restored: boolean }) => void
    mock.restart.mockImplementation(() => new Promise((resolve) => (settle = resolve)))
    const { rerender } = render(createElement(KnownPeopleScreen))
    await userEvent.click(screen.getByRole('button', { name: 'retry' }))
    // the reset emptied the lists; both then failed to load
    mock.mine = mineQuery(undefined, { isError: true, error: new TypeError('x'), errorUpdatedAt: 5 })
    mock.requests = { ...requestsQuery([]), data: undefined, isError: true, error: new TypeError('x'), errorUpdatedAt: 5 }
    rerender(createElement(KnownPeopleScreen))
    expect(screen.getByText('loading')).toBeInTheDocument()
    await act(async () => settle({ restored: false }))
    expect(screen.queryByText('loading')).toBeNull()
  })

  it('the requests list failing to load AGAIN is spoken again (its first-load line re-keyed by errorUpdatedAt)', () => {
    mock.requests = { ...requestsQuery([]), data: undefined, isError: true, error: new TypeError('x'), errorUpdatedAt: 1 }
    const { rerender } = render(createElement(KnownPeopleScreen))
    mock.requests = { ...requestsQuery([]), data: undefined, isError: true, error: new TypeError('x'), errorUpdatedAt: 2 }
    rerender(createElement(KnownPeopleScreen))
    expect(spoken('error.load')).toBe(2)
  })

  it('the named list failing AGAIN is spoken again (its line re-keyed by errorUpdatedAt — round 7, E3)', () => {
    mock.mine = mineQuery({ items: [], freeSlots: 3 }, { isError: true, error: new TypeError('x'), errorUpdatedAt: 1 })
    const { rerender } = render(createElement(KnownPeopleScreen))
    mock.mine = mineQuery({ items: [], freeSlots: 3 }, { isError: true, error: new TypeError('x'), errorUpdatedAt: 2 })
    rerender(createElement(KnownPeopleScreen))
    expect(spoken('error.load')).toBe(2)
  })

  it('a list that fails to load SAYS so (spoken) — the outcome of a Retry whose fetch failed', () => {
    mock.mine = mineQuery(undefined, { isError: true, error: new TypeError('Network request failed') })
    mock.requests = { ...requestsQuery([]), data: undefined, isError: true, error: new FakeApiError(503, 'http.503') }
    render(createElement(KnownPeopleScreen))
    expect(spoken('error.load')).toBe(2)
    expect(screen.queryByText('error.not_available')).toBeNull()
  })
})

describe('review round 2', () => {
  it('P11 — each answer button NAMES the person it answers (⛔ N identical "Yes" buttons)', () => {
    mock.requests = requestsQuery([[
      { linkId: 'r1', state: 'asked', name: 'Asha D.', askedAt: AT },
      { linkId: 'r3', state: 'asked', name: 'Kiran L.', askedAt: AT },
    ]])
    render(createElement(KnownPeopleScreen))
    for (const label of ['request.yes_a11y:Asha D.', 'request.yes_a11y:Kiran L.', 'request.no_a11y:Asha D.', 'request.no_a11y:Kiran L.']) {
      expect(screen.getByRole('button', { name: label })).toBeInTheDocument()
    }
  })

  it('P3 — a REFUSED action refreshes both lists and speaks its own message (a 404 not_found ⇒ "changed", ⛔ the generic one)', async () => {
    mock.withdraw.mockRejectedValueOnce(new FakeApiError(404, 'known_people.not_found'))
    render(createElement(KnownPeopleScreen))
    await userEvent.click(screen.getByRole('button', { name: 'request.withdraw_a11y:Ravi K.' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('error.changed')
    expect(mock.announce).toHaveBeenLastCalledWith('error.changed')
    expect(mock.refresh).toHaveBeenCalledTimes(1)
  })

  it('P3 — a completed action does ⛔ refresh from the screen (the write\'s own onSuccess does)', async () => {
    render(createElement(KnownPeopleScreen))
    await userEvent.click(screen.getByRole('button', { name: 'request.yes_a11y:Asha D.' }))
    expect(await screen.findByText('done.accepted:Asha D.')).toBeInTheDocument()
    expect(mock.refresh).not.toHaveBeenCalled()
  })

  it('P9 — a failed REFETCH of the named list keeps the rows and their Remove control, and says so beside them', () => {
    mock.mine = mineQuery({ items: [{ linkId: 'l1', label: 'asked', name: null, askedAt: AT }], freeSlots: 2 }, { isError: true, errorUpdatedAt: 7 })
    render(createElement(KnownPeopleScreen))
    expect(screen.getByRole('button', { name: 'action.remove_a11y:Meena (school)' })).toBeInTheDocument()
    expect(screen.getByText('error.load')).toBeInTheDocument()
    expect(mock.announce).toHaveBeenCalledWith('error.load')
  })

  it('P9 — with ⛔ data yet, a failure still shows the error block alone (a positive control)', () => {
    mock.mine = mineQuery(undefined, { isError: true, errorUpdatedAt: 7 })
    render(createElement(KnownPeopleScreen))
    expect(screen.queryByRole('button', { name: 'action.remove_a11y:Meena (school)' })).toBeNull()
    expect(screen.getByText('error.load')).toBeInTheDocument()
  })

  it('P2 — the find screen\'s success, parked as it goes back, is SHOWN and SPOKEN once this screen is focused AND the interactions settle', async () => {
    handKnownPeopleNotice('find.sent') // the find screen, going back
    render(createElement(KnownPeopleScreen)) // focused (the mock runs the focus callback on mount)
    expect(screen.queryByText('find.sent')).toBeNull() // ⛔ before the interactions settle (round 3)
    expect(mock.announce).not.toHaveBeenCalledWith('find.sent')
    flushInteractions()
    expect(await screen.findByText('find.sent')).toBeInTheDocument()
    expect(mock.announce).toHaveBeenCalledWith('find.sent')
  })

  it('P2 — a blur BEFORE the interactions settle cancels the take, and the notice stays parked for the next focus', () => {
    handKnownPeopleNotice('find.sent')
    render(createElement(KnownPeopleScreen))
    cleanup() // blurred / unmounted before the interactions settled
    expect(mock.cancelled).toBe(1)
    expect(takeKnownPeopleNotice()).toBe('find.sent') // ⛔ taken by the cancelled one
  })

  it('P2 — a STALE parked notice, or one dropped by an account change, is ⛔ shown', () => {
    handKnownPeopleNotice('find.sent', Date.now() - NOTICE_TTL_MS - 1)
    render(createElement(KnownPeopleScreen))
    flushInteractions()
    expect(screen.queryByText('find.sent')).toBeNull()
    cleanup()
    handKnownPeopleNotice('find.sent')
    clearKnownPeopleNotices() // sign-out
    render(createElement(KnownPeopleScreen))
    flushInteractions()
    expect(screen.queryByText('find.sent')).toBeNull()
    expect(mock.announce).not.toHaveBeenCalledWith('find.sent')
  })
})
