// @vitest-environment jsdom
// Story 3.15d, Task 0.3 (AC 3) — the QUERY-DRIVEN SIGNAL is PROVEN, ⛔ assumed.
//
// Three of the eight lines this story makes "spoken again" are driven by a TanStack query's error, not by a press the
// screen owns: S2 (the posting history's Show-more error), S7 (the districts error) and S8 (the search's Show-more error).
// Their effect keys on `errorUpdateCount` — a counter that moves once per FINAL failure — so a retry that fails AGAIN
// (same words, the line still mounted) is a new value and is spoken again. `errorUpdatedAt` is ⛔ the signal: it is a
// millisecond stamp, two failures inside one millisecond tie, and under a frozen or fake clock every failure does.
//
// This file drives the app's REAL hooks (`usePostingHistoryQuery`, `useWorkplaceSearchQuery`, `useWorkplaceDistrictsQuery`)
// through a REAL `QueryClient` carrying the APP's own query defaults (`lib/query-client.ts`: `retry: 1`; the workplace hooks
// set none of their own) plus `retryDelay: 0` (a test-only addition — the default delay is exponential). Only the member
// auth SDK and the session are mocked; ⛔ fake timers; ⛔ an instant mock that hands back a constant (it hides the pending
// flip — project_tanstack_instant_mock_hides_notready_flip).
//
// What it shows, with data present (the line stays mounted across the retry):
//   · a failed fetchNextPage() / refetch() moves `errorUpdateCount` by EXACTLY one — `retry: 1` makes one press one final error;
//   · it does NOT move while a retry is merely running, and the error flag (`isFetchNextPageError` / `isError`) stays true
//     through the retry, so the line does not unmount and remount (the same words ⇒ only a counter can say "again");
//   · it does NOT reset on a later success (a remount after a success holds a non-zero count — S7's re-check on `isError`
//     exists for exactly that, S2 / S8 answer it structurally);
//   · `errorUpdatedAt` only ever moves forward (non-strict — a millisecond stamp ties, and is ⛔ asserted as +1).
// If the count does ⛔ move on any leg here, STOP and re-derive: a local counter bumped from the retry handler is ⛔ a
// substitute (S7 is also set by the mount-time refetch and by `invalidateQueries` after a refusal — neither passes through Retry).
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createElement, type ReactNode } from 'react'
import { act, cleanup, renderHook, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

const api = vi.hoisted(() => ({ postingHistory: vi.fn(), workplaceSearch: vi.fn(), workplaceDistricts: vi.fn() }))
vi.mock('../../lib/member-api', () => ({ memberAuth: api }))
vi.mock('../../lib/session-context', () => ({ useSession: () => ({ session: { memberId: 'm', pariwarId: 'p' }, isLoading: false }) }))
// `lib/query-client.ts` builds a persister over MMKV at import; the test reads only its `defaultOptions`.
vi.mock('../../lib/mmkv', () => ({ mmkvStorage: { getItem: () => null, setItem: () => undefined, removeItem: () => undefined } }))

import { useWorkplaceDistrictsQuery, useWorkplaceSearchQuery, usePostingHistoryQuery } from '../../components/workplace/useWorkplaceQueries'
import { queryClient as appQueryClient } from '../../lib/query-client'

afterEach(() => cleanup())

const offline = () => Promise.reject(new TypeError('Network request failed'))

function deferred<T = never>() {
  let resolve!: (v: T) => void
  let reject!: (e: unknown) => void
  const promise = new Promise<T>((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}

/**
 * TanStack notifies a component only about the result props it READ DURING RENDER (tracked props). The app's effects read
 * `errorUpdateCount` in render, so they are subscribed; a test that first reads `result.current.isFetching` AFTER a fetch
 * began would see a stale object — so every prop asserted below is read here, inside the hook callback.
 */
const TRACKED = [
  'status', 'fetchStatus', 'isFetching', 'isPending', 'isError', 'isSuccess', 'data', 'errorUpdateCount', 'errorUpdatedAt',
  'isFetchNextPageError', 'hasNextPage',
] as const
function tracked<T extends object>(result: T): T {
  for (const key of TRACKED) void (result as Record<string, unknown>)[key]
  return result
}

/** The APP's own query defaults (retry: 1 …) plus `retryDelay: 0`; ⛔ a hand-copied `retry`. */
function harness() {
  const queries = { ...appQueryClient.getDefaultOptions().queries, retryDelay: 0 }
  const client = new QueryClient({ defaultOptions: { queries } })
  const wrapper = ({ children }: { children: ReactNode }) => createElement(QueryClientProvider, { client }, children)
  return { client, wrapper }
}

describe('the premise: the app retries ONCE (one press = one final error)', () => {
  it("lib/query-client.ts' default is retry: 1, and the workplace hooks set none of their own", () => {
    expect(appQueryClient.getDefaultOptions().queries?.retry).toBe(1)
  })
})

describe('an INFINITE query with data — the Show-more line (S2: usePostingHistoryQuery, S8: useWorkplaceSearchQuery)', () => {
  const hooks = [
    { name: 'usePostingHistoryQuery (S2)', use: () => usePostingHistoryQuery(), fn: api.postingHistory },
    { name: 'useWorkplaceSearchQuery (S8)', use: () => useWorkplaceSearchQuery('d1', 'school' as never, 'q'), fn: api.workplaceSearch },
  ]
  for (const { name, use, fn } of hooks) {
    it(`${name}: each failed fetchNextPage adds exactly one; the flag stays true through the retry; ⛔ moves while it runs`, async () => {
      const { client, wrapper } = harness()
      fn.mockReset()
      fn.mockResolvedValueOnce({ items: [], nextCursor: 'c2' }) // page 1
      fn.mockImplementation(() => offline()) // every later call fails (the app's retry makes each press two calls)
      const { result } = renderHook(() => tracked(use()), { wrapper })
      try {
        await waitFor(() => expect(result.current.isSuccess).toBe(true))
        expect(result.current.hasNextPage).toBe(true)
        expect(result.current.errorUpdateCount).toBe(0)

        // 1 — "Show more" fails (after the one retry): the line mounts; the count is 1
        await act(async () => {
          await result.current.fetchNextPage()
        })
        await waitFor(() => expect(result.current.isFetchNextPageError).toBe(true))
        expect(result.current.errorUpdateCount).toBe(1)
        expect(result.current.data?.pages).toHaveLength(1) // the data is kept — the line sits BESIDE it
        const stamp1 = result.current.errorUpdatedAt

        // 2 — Retry: hold its first request open — the line must STAY (the flag stays true) and the count must NOT move
        const held = deferred()
        fn.mockImplementationOnce(() => held.promise)
        await act(async () => {
          void result.current.fetchNextPage()
          await new Promise((r) => setTimeout(r, 10)) // the observer's notification is flushed a macrotask later
        })
        await waitFor(() => expect(result.current.isFetching).toBe(true))
        expect(result.current.isFetchNextPageError).toBe(true)
        expect(result.current.hasNextPage).toBe(true)
        expect(result.current.errorUpdateCount).toBe(1)

        // …and then it fails AGAIN (the held attempt, then the app's one retry): +1, the same flag, the SAME words ⇒ only the count says "again"
        await act(async () => {
          held.reject(new TypeError('Network request failed'))
          await Promise.resolve()
        })
        await waitFor(() => expect(result.current.errorUpdateCount).toBe(2))
        await waitFor(() => expect(result.current.isFetching).toBe(false))
        expect(result.current.isFetchNextPageError).toBe(true)
        expect(result.current.errorUpdatedAt).toBeGreaterThanOrEqual(stamp1) // non-strict: a millisecond stamp ties

        // 3 — a third press fails too: +1 again (a strict, running count)
        await act(async () => {
          await result.current.fetchNextPage()
        })
        await waitFor(() => expect(result.current.errorUpdateCount).toBe(3))
      } finally {
        client.clear()
      }
    })

    it(`${name}: a later SUCCESS clears the flag but ⛔ resets the count (a remount after a success holds a non-zero count)`, async () => {
      const { client, wrapper } = harness()
      fn.mockReset()
      fn.mockResolvedValueOnce({ items: [], nextCursor: 'c2' })
      fn.mockImplementation(() => offline())
      const { result } = renderHook(() => tracked(use()), { wrapper })
      try {
        await waitFor(() => expect(result.current.isSuccess).toBe(true))
        await act(async () => {
          await result.current.fetchNextPage()
        })
        await waitFor(() => expect(result.current.errorUpdateCount).toBe(1))
        fn.mockReset()
        fn.mockResolvedValue({ items: [], nextCursor: null })
        await act(async () => {
          await result.current.fetchNextPage()
        })
        await waitFor(() => expect(result.current.isFetchNextPageError).toBe(false))
        expect(result.current.isError).toBe(false)
        expect(result.current.errorUpdateCount).toBe(1) // never reset
        expect(result.current.data?.pages).toHaveLength(2)
      } finally {
        client.clear()
      }
    })
  }
})

describe('a PLAIN query with data — useWorkplaceDistrictsQuery (S7)', () => {
  it('each failed refetch adds exactly one; the error state AND the data stay through the retry; ⛔ moves while it runs', async () => {
    const { client, wrapper } = harness()
    api.workplaceDistricts.mockReset()
    api.workplaceDistricts.mockResolvedValueOnce({ hasList: true, districts: ['d1'] })
    api.workplaceDistricts.mockImplementation(() => offline())
    const { result } = renderHook(() => tracked(useWorkplaceDistrictsQuery()), { wrapper })
    try {
      await waitFor(() => expect(result.current.isSuccess).toBe(true))
      expect(result.current.errorUpdateCount).toBe(0)

      // 1 — a failed refetch with the cached list: status goes `error`, the data stays (S7's error screen REPLACES the picker)
      await act(async () => {
        await result.current.refetch()
      })
      await waitFor(() => expect(result.current.isError).toBe(true))
      expect(result.current.data).toEqual({ hasList: true, districts: ['d1'] })
      expect(result.current.isPending).toBe(false)
      expect(result.current.errorUpdateCount).toBe(1)
      const stamp1 = result.current.errorUpdatedAt

      // 2 — Retry: held open — the error state stays, the count does NOT move while it runs
      const held = deferred()
      api.workplaceDistricts.mockImplementationOnce(() => held.promise)
      await act(async () => {
        void result.current.refetch()
        await new Promise((r) => setTimeout(r, 10)) // the observer's notification is flushed a macrotask later
      })
      await waitFor(() => expect(result.current.isFetching).toBe(true))
      expect(result.current.isError).toBe(true)
      expect(result.current.isPending).toBe(false)
      expect(result.current.errorUpdateCount).toBe(1)

      // …and it fails AGAIN (the held attempt, then the app's one retry): +1, the same state, the SAME words
      await act(async () => {
        held.reject(new TypeError('Network request failed'))
        await Promise.resolve()
      })
      await waitFor(() => expect(result.current.errorUpdateCount).toBe(2))
      await waitFor(() => expect(result.current.isFetching).toBe(false))
      expect(result.current.isError).toBe(true)
      expect(result.current.errorUpdatedAt).toBeGreaterThanOrEqual(stamp1)

      // 3 — a later SUCCESS: the error state clears, the count does ⛔ reset (a remount holds 2 and must stay silent — S7's isError re-check)
      api.workplaceDistricts.mockReset()
      api.workplaceDistricts.mockResolvedValue({ hasList: true, districts: ['d1', 'd2'] })
      await act(async () => {
        await result.current.refetch()
      })
      await waitFor(() => expect(result.current.isError).toBe(false))
      expect(result.current.errorUpdateCount).toBe(2)
    } finally {
      client.clear()
    }
  })
})
