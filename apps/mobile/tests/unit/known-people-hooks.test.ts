// @vitest-environment jsdom
// Story 6.36b — the people-who-know-me QUERY HOOKS themselves, against a real QueryClient (the screen and entry tests mock
// them): the server's denial (`known_people.not_available`) is kept AS DATA by BOTH hooks, so it stands through later
// failures of any other kind until a success (fix-diff reviews E1, G3 — a revert of either hook's wiring fails here).
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ApiError } from '@twt/api-client'
import { createElement, type ReactNode } from 'react'
import { act, cleanup, renderHook, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

const api = vi.hoisted(() => ({ list: vi.fn(), requests: vi.fn() }))
vi.mock('../../lib/known-people-api', () => ({ knownPeopleApi: api }))
vi.mock('../../lib/session-context', () => ({ useSession: () => ({ session: { memberId: 'm', pariwarId: 'p' }, isLoading: false }) }))
vi.mock('../../lib/mmkv', () => ({ mmkvStorage: { getItem: () => null, setItem: () => undefined, removeItem: () => undefined } }))

import {
  KNOWN_PEOPLE_READ_TIMEOUT_MS,
  KnownPeopleReadTimeout,
  useKnownPeopleRequestsQuery,
  useMyKnownPeopleQuery,
  useRestartKnownPeopleLists,
} from '../../components/known-people/useKnownPeopleQueries'
import { isDenied, requestEntryVisible, requestsDenied } from '../../lib/known-people'

const AT = '2026-10-14T10:00:00.000Z'

// Unmount each test's hooks (a hook left mounted from an earlier test keeps fetching into the next one's mocks).
afterEach(() => cleanup())
const denied = () => new ApiError(403, 'known_people.not_available', 'not available')
const offline = () => new TypeError('Network request failed')
const down = () => new ApiError(503, 'http.503', 'down')

/** Refetch, then wait for the HOOK's state to show the outcome (TanStack flushes its notifications in a later tick). */
async function refetchSettled(result: { current: { refetch: () => Promise<unknown>; dataUpdatedAt: number; errorUpdatedAt: number } }) {
  const before = result.current.dataUpdatedAt + result.current.errorUpdatedAt
  await act(async () => {
    await result.current.refetch()
  })
  await waitFor(() => expect(result.current.dataUpdatedAt + result.current.errorUpdatedAt).not.toBe(before))
}

function harness() {
  const client = new QueryClient({ defaultOptions: { queries: { retryDelay: 0 } } })
  const wrapper = ({ children }: { children: ReactNode }) => createElement(QueryClientProvider, { client }, children)
  return { client, wrapper }
}

describe('the denial is sticky DATA in both hooks', () => {
  it('useKnownPeopleRequestsQuery: open → denied → offline → 503 → open again', async () => {
    const { client, wrapper } = harness()
    const script = [
      () => Promise.resolve({ items: [{ linkId: 'a', state: 'asked', name: 'Asha D.', askedAt: AT }], nextCursor: null, hasMore: false }),
      () => Promise.reject(denied()),
      () => Promise.reject(offline()),
      () => Promise.reject(down()),
      () => Promise.resolve({ items: [{ linkId: 'b', state: 'asked', name: 'Ravi K.', askedAt: AT }], nextCursor: null, hasMore: false }),
    ]
    let call = 0
    // a failing step is retried by the hook's own policy (twice for a network error / 5xx) — each retry gets the SAME step
    api.requests.mockImplementation(() => script[Math.min(call, script.length - 1)]!())
    const { result } = renderHook(() => useKnownPeopleRequestsQuery(), { wrapper })
    const visible = () => requestEntryVisible({ pages: result.current.data?.pages, errorCode: undefined })
    try {
      await waitFor(() => expect(result.current.isSuccess).toBe(true))
      const seen = [visible()]
      for (let step = 1; step < script.length; step += 1) {
        call = step
        await refetchSettled(result)
        seen.push(visible())
        if (step === 1) expect(requestsDenied(result.current.data?.pages)).toBe(true)
      }
      expect(seen).toEqual([true, false, false, false, true])
    } finally {
      client.clear()
    }
  })

  it('useMyKnownPeopleQuery: the namer\'s list keeps its denial through a later failure; a success clears it', async () => {
    const { client, wrapper } = harness()
    const script = [
      () => Promise.reject(denied()),
      () => Promise.reject(offline()),
      () => Promise.resolve({ items: [], freeSlots: 3 }),
    ]
    let call = 0
    api.list.mockImplementation(() => script[Math.min(call, script.length - 1)]!())
    const { result } = renderHook(() => useMyKnownPeopleQuery(), { wrapper })
    try {
      await waitFor(() => expect(result.current.isSuccess).toBe(true))
      expect(isDenied(result.current.data)).toBe(true)
      call = 1
      await refetchSettled(result)
      expect(result.current.isError).toBe(true)
      expect(isDenied(result.current.data)).toBe(true)
      call = 2
      await refetchSettled(result)
      expect(isDenied(result.current.data)).toBe(false)
      expect(result.current.data?.freeSlots).toBe(3)
      // the server's own history bound (the saved-name prune relies on it), and an abortable request (round 7)
      expect(api.list).toHaveBeenCalledWith(50, { signal: expect.any(AbortSignal) })
    } finally {
      client.clear()
    }
  })
})

describe('useRestartKnownPeopleLists (the not-available Retry — round-6 review)', () => {
  it('restarts a HUNG FIRST fetch — refetch() only re-joins it — and reports whether access is back', async () => {
    const { client, wrapper } = harness()
    api.list.mockReset()
    api.requests.mockReset()
    api.list.mockResolvedValue({ items: [], freeSlots: 3 })
    // BOTH first fetches hang (the query holds ⛔ data) — each settles only when its request is aborted
    const hangUntilAborted = (_a: unknown, opts?: { signal?: AbortSignal }) =>
      new Promise((_, reject) => opts?.signal?.addEventListener('abort', () => reject(new Error('aborted'))))
    let listCalls = 0
    api.list.mockImplementation((limit: unknown, opts?: { signal?: AbortSignal }) => {
      listCalls += 1
      return listCalls === 1 ? hangUntilAborted(limit, opts) : Promise.resolve({ items: [], freeSlots: 3 })
    })
    let requestsCalls = 0
    const signals: AbortSignal[] = []
    api.requests.mockImplementation((params: unknown, opts?: { signal?: AbortSignal }) => {
      requestsCalls += 1
      if (opts?.signal) signals.push(opts.signal)
      return requestsCalls === 1
        ? hangUntilAborted(params, opts)
        : Promise.resolve({ items: [{ linkId: 'a', state: 'asked', name: 'Asha D.', askedAt: AT }], nextCursor: null, hasMore: false })
    })
    const { result } = renderHook(
      () => ({ mine: useMyKnownPeopleQuery(), requests: useKnownPeopleRequestsQuery(), restart: useRestartKnownPeopleLists() }),
      { wrapper },
    )
    try {
      await waitFor(() => expect(requestsCalls).toBe(1))
      // the control: refetch() RE-JOINS the hung fetch — ⛔ a second request
      await act(async () => {
        void result.current.requests.refetch()
        await new Promise((r) => setTimeout(r, 10))
      })
      expect(requestsCalls).toBe(1)
      let outcome: { restored: boolean } | undefined
      await act(async () => {
        outcome = await result.current.restart()
      })
      expect(requestsCalls).toBe(2)
      expect(listCalls).toBe(2)
      expect(signals[0]!.aborted).toBe(true) // the hung request itself was aborted, ⛔ only abandoned
      expect((api.list.mock.calls[0]![1] as { signal: AbortSignal }).signal.aborted).toBe(true) // the namer's list's too
      expect(outcome).toEqual({ restored: true })
      await waitFor(() => expect(result.current.requests.data?.pages[0]?.items).toHaveLength(1))
    } finally {
      client.clear()
    }
  })

  it('a refusal on the restart ⇒ restored: false (the message re-mounts on its own)', async () => {
    const { client, wrapper } = harness()
    api.list.mockReset()
    api.requests.mockReset()
    api.list.mockRejectedValue(denied())
    api.requests.mockRejectedValue(denied())
    const { result } = renderHook(() => ({ mine: useMyKnownPeopleQuery(), requests: useKnownPeopleRequestsQuery(), restart: useRestartKnownPeopleLists() }), { wrapper })
    try {
      await waitFor(() => expect(isDenied(result.current.mine.data)).toBe(true))
      const before = { list: api.list.mock.calls.length, requests: api.requests.mock.calls.length }
      let outcome: { restored: boolean } | undefined
      await act(async () => {
        outcome = await result.current.restart()
      })
      expect(outcome).toEqual({ restored: false })
      expect(api.list.mock.calls.length).toBe(before.list + 1) // it really fetched both again
      expect(api.requests.mock.calls.length).toBe(before.requests + 1)
    } finally {
      client.clear()
    }
  })

  it('restored needs BOTH lists loaded: the namer\'s back but the requests failed ⇒ restored: false', async () => {
    const { client, wrapper } = harness()
    api.list.mockReset()
    api.requests.mockReset()
    api.list.mockRejectedValueOnce(denied()).mockResolvedValue({ items: [], freeSlots: 3 })
    api.requests.mockRejectedValueOnce(denied()).mockRejectedValue(new ApiError(400, 'known_people.cursor_invalid', 'bad'))
    const { result } = renderHook(() => ({ mine: useMyKnownPeopleQuery(), requests: useKnownPeopleRequestsQuery(), restart: useRestartKnownPeopleLists() }), { wrapper })
    try {
      await waitFor(() => expect(isDenied(result.current.mine.data)).toBe(true))
      let outcome: { restored: boolean } | undefined
      await act(async () => {
        outcome = await result.current.restart()
      })
      expect(outcome).toEqual({ restored: false })
    } finally {
      client.clear()
    }
  })

  it('a requests list STILL refused while the namer\'s list is back ⇒ restored: false', async () => {
    const { client, wrapper } = harness()
    api.list.mockReset()
    api.requests.mockReset()
    api.list.mockRejectedValueOnce(denied()).mockResolvedValue({ items: [], freeSlots: 3 })
    api.requests.mockRejectedValue(denied())
    const { result } = renderHook(() => ({ mine: useMyKnownPeopleQuery(), requests: useKnownPeopleRequestsQuery(), restart: useRestartKnownPeopleLists() }), { wrapper })
    try {
      await waitFor(() => expect(isDenied(result.current.mine.data)).toBe(true))
      let outcome: { restored: boolean } | undefined
      await act(async () => {
        outcome = await result.current.restart()
      })
      expect(outcome).toEqual({ restored: false })
    } finally {
      client.clear()
    }
  })
})

describe('the read bound is WIRED into both hooks (round 8 — a read that never settles fails at KNOWN_PEOPLE_READ_TIMEOUT_MS)', () => {
  it('the bound is 15 s — long enough for a slow 2G page, short enough that a member is never left on a spinner', () => {
    expect(KNOWN_PEOPLE_READ_TIMEOUT_MS).toBe(15_000)
  })

  it.each(['list', 'requests'] as const)('%s: a read that never settles (and ignores its signal) fails at the bound — ⛔ retried', async (which) => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    const { client, wrapper } = harness()
    try {
      api.list.mockReset()
      api.requests.mockReset()
      const never = () => new Promise(() => undefined)
      const ok = which === 'list'
        ? () => Promise.resolve({ items: [], nextCursor: null, hasMore: false })
        : () => Promise.resolve({ items: [], freeSlots: 3 })
      api.list.mockImplementation(which === 'list' ? never : ok)
      api.requests.mockImplementation(which === 'requests' ? never : ok)
      const { result } = renderHook(() => (which === 'list' ? useMyKnownPeopleQuery() : useKnownPeopleRequestsQuery()), { wrapper })
      // ⛔ before the bound — checked at HALF of it (`shouldAdvanceTime` also moves the clock with wall time, so a margin
      // of a few ms would be flaky under ci:local load — round-9 review); the exact value is pinned by its own test
      await vi.advanceTimersByTimeAsync(KNOWN_PEOPLE_READ_TIMEOUT_MS / 2)
      expect(result.current.isPending).toBe(true)
      await vi.advanceTimersByTimeAsync(KNOWN_PEOPLE_READ_TIMEOUT_MS / 2 + 200)
      await waitFor(() => expect(result.current.error).toBeInstanceOf(KnownPeopleReadTimeout))
      expect((which === 'list' ? api.list : api.requests).mock.calls).toHaveLength(1) // ⛔ retried
    } finally {
      client.clear()
      vi.useRealTimers()
    }
  })
})

describe('restored — the NAMER\'s list side (round 8)', () => {
  it.each([
    ['still refused', () => Promise.reject(denied())],
    ['failing', () => Promise.reject(new ApiError(400, 'http.400', 'bad'))],
  ] as const)('the requests list back but the namer\'s list %s ⇒ restored: false', async (_label, second) => {
    const { client, wrapper } = harness()
    api.list.mockReset()
    api.requests.mockReset()
    api.list.mockRejectedValueOnce(denied()).mockImplementation(second)
    api.requests.mockRejectedValueOnce(denied()).mockResolvedValue({ items: [], nextCursor: null, hasMore: false })
    const { result } = renderHook(() => ({ mine: useMyKnownPeopleQuery(), requests: useKnownPeopleRequestsQuery(), restart: useRestartKnownPeopleLists() }), { wrapper })
    try {
      await waitFor(() => expect(isDenied(result.current.mine.data)).toBe(true))
      let outcome: { restored: boolean } | undefined
      await act(async () => {
        outcome = await result.current.restart()
      })
      expect(outcome).toEqual({ restored: false })
    } finally {
      client.clear()
    }
  })
})
