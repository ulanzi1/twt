// @vitest-environment jsdom
// Story 6.36e (code review 2026-10-24) — the nominee-link QUERY HOOKS themselves, against a real QueryClient (the screens mock
// them), mirroring 6.36b's `known-people-hooks.test.ts`:
//   · ⭐ BOTH reads are bounded: a read that never settles (and ignores its signal) fails at `KNOWN_PEOPLE_READ_TIMEOUT_MS` and is
//     ⛔ retried — before, the API client's missing transport timeout held the whole nominee form on a spinner;
//   · the retry policy: a 4xx and a timeout settle at once, anything else twice;
//   · the server's denial (`nominee_link.not_available`) is kept AS DATA by the requests hook (the wrapper was never executed);
//   · ⭐ the answer does ⛔ WAIT for the requests refetch it triggers (`onSettled` used to RETURN the invalidate, which
//     `mutateAsync` awaits — a stalled refetch left every Yes / No busy forever and the success line unsaid).
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ApiError } from '@twt/api-client'
import { createElement, type ReactNode } from 'react'
import { act, cleanup, renderHook, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

const api = vi.hoisted(() => ({ links: vi.fn(), requests: vi.fn(), answer: vi.fn() }))
vi.mock('../../lib/nominee-links-api', () => ({ nomineeLinksApi: api }))
vi.mock('../../lib/known-people-api', () => ({ knownPeopleApi: {} })) // the sibling hook module (`withReadTimeout`) imports it
vi.mock('../../lib/session-context', () => ({ useSession: () => ({ session: { memberId: 'm', pariwarId: 'p' }, isLoading: false }) }))
vi.mock('../../lib/mmkv', () => ({ mmkvStorage: { getItem: () => null, setItem: () => undefined, removeItem: () => undefined } }))

import { KNOWN_PEOPLE_READ_TIMEOUT_MS, KnownPeopleReadTimeout } from '../../components/known-people/useKnownPeopleQueries'
import {
  retryNomineeLinks,
  useNomineeLinkAnswer,
  useNomineeLinkRequestsQuery,
  useNomineeLinksQuery,
} from '../../components/nominee-links/useNomineeLinkQueries'

afterEach(() => cleanup())

function harness() {
  const client = new QueryClient({ defaultOptions: { queries: { retryDelay: 0 } } })
  const wrapper = ({ children }: { children: ReactNode }) => createElement(QueryClientProvider, { client }, children)
  return { client, wrapper }
}
const page = { items: [], nextCursor: null, hasMore: false }

describe('retryNomineeLinks', () => {
  it('a 4xx and a TIMEOUT settle at once; a 5xx / a network error is tried twice more', () => {
    expect(retryNomineeLinks(0, new ApiError(403, 'nominee_link.not_available', 'no'))).toBe(false)
    expect(retryNomineeLinks(0, new KnownPeopleReadTimeout())).toBe(false) // it would only wait as long again
    expect(retryNomineeLinks(0, new ApiError(503, 'http.503', 'down'))).toBe(true)
    expect(retryNomineeLinks(1, new TypeError('Network request failed'))).toBe(true)
    expect(retryNomineeLinks(2, new ApiError(503, 'http.503', 'down'))).toBe(false)
  })
})

describe('the read bound is WIRED into both reads (a read that never settles fails at KNOWN_PEOPLE_READ_TIMEOUT_MS)', () => {
  it.each(['links', 'requests'] as const)('%s: never settles (and ignores its signal) ⇒ a timeout at the bound, ⛔ retried', async (which) => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    const { client, wrapper } = harness()
    try {
      api.links.mockReset()
      api.requests.mockReset()
      const never = () => new Promise(() => undefined)
      api.links.mockImplementation(which === 'links' ? never : () => Promise.resolve({ ranks: [], links: [] }))
      api.requests.mockImplementation(which === 'requests' ? never : () => Promise.resolve(page))
      const { result } = renderHook(() => (which === 'links' ? useNomineeLinksQuery() : useNomineeLinkRequestsQuery()), { wrapper })
      await vi.advanceTimersByTimeAsync(KNOWN_PEOPLE_READ_TIMEOUT_MS / 2)
      expect(result.current.isPending).toBe(true) // ⛔ before the bound
      await vi.advanceTimersByTimeAsync(KNOWN_PEOPLE_READ_TIMEOUT_MS / 2 + 200)
      await waitFor(() => expect(result.current.error).toBeInstanceOf(KnownPeopleReadTimeout))
      expect((which === 'links' ? api.links : api.requests).mock.calls).toHaveLength(1)
    } finally {
      client.clear()
      vi.useRealTimers()
    }
  })
})

describe('the server\'s denial is kept AS DATA by the requests hook', () => {
  it('`nominee_link.not_available` ⇒ the denied page (a SUCCESS carrying `denied`), ⛔ an error the screen retries', async () => {
    const { client, wrapper } = harness()
    try {
      api.requests.mockReset()
      api.requests.mockRejectedValue(new ApiError(403, 'nominee_link.not_available', 'not available'))
      const { result } = renderHook(() => useNomineeLinkRequestsQuery(), { wrapper })
      await waitFor(() => expect(result.current.isSuccess).toBe(true))
      expect(result.current.data?.pages[0]).toMatchObject({ denied: true, items: [] })
      expect(api.requests.mock.calls).toHaveLength(1)
    } finally {
      client.clear()
    }
  })
})

describe('the cached request is marked ANSWERED when the server confirms (round 3)', () => {
  it('the home card and the notice strip read the same cache — the row reads answered although the reload has not landed (it STALLS here)', async () => {
    const { client, wrapper } = harness()
    try {
      api.requests.mockReset()
      api.answer.mockReset()
      const open = { items: [{ linkId: 'a', answer: null, name: 'Asha D.', askedAt: '2026-10-24T10:00:00.000Z' }], nextCursor: null, hasMore: false }
      api.requests.mockResolvedValueOnce(open)
      api.requests.mockImplementation(() => new Promise(() => undefined)) // every refetch stalls
      api.answer.mockResolvedValue({ linkId: 'a', answer: 'not_me' })
      const { result } = renderHook(() => ({ list: useNomineeLinkRequestsQuery(), answer: useNomineeLinkAnswer() }), { wrapper })
      await waitFor(() => expect(result.current.list.isSuccess).toBe(true))
      expect(result.current.list.data?.pages[0]).toMatchObject({ items: [{ linkId: 'a', answer: null }] })
      await act(async () => {
        await result.current.answer.mutateAsync({ linkId: 'a', answer: 'not_me', idempotencyKey: 'k' })
      })
      // the observer is notified on the next tick; the reload is STILL in flight (it stalls) — the row must not wait for it
      await waitFor(() => expect(result.current.list.data?.pages[0]).toMatchObject({ items: [{ linkId: 'a', answer: 'not_me' }] })) // the RECORDED answer
      expect(result.current.list.isFetching).toBe(true)
    } finally {
      client.clear()
    }
  })
})

describe('the answer does ⛔ wait for the refetch it triggers', () => {
  it('a requests refetch that never settles ⇒ `mutateAsync` STILL resolves (the success line is said at once)', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    const { client, wrapper } = harness()
    try {
      api.requests.mockReset()
      api.answer.mockReset()
      api.requests.mockResolvedValueOnce(page) // the screen's first load …
      api.requests.mockImplementation(() => new Promise(() => undefined)) // … and every refetch after it STALLS
      api.answer.mockResolvedValue({ linkId: 'a', answer: 'confirmed' })
      const { result } = renderHook(() => ({ list: useNomineeLinkRequestsQuery(), answer: useNomineeLinkAnswer() }), { wrapper })
      await waitFor(() => expect(result.current.list.isSuccess).toBe(true))
      let resolved = false
      void result.current.answer.mutateAsync({ linkId: 'a', answer: 'yes', idempotencyKey: 'k' }).then(() => {
        resolved = true
      })
      await vi.advanceTimersByTimeAsync(1_000) // far short of the 15 s bound the stalled refetch would end at
      expect(resolved).toBe(true)
      expect(api.requests.mock.calls.length).toBeGreaterThanOrEqual(2) // … and the list WAS asked to reload
    } finally {
      client.clear()
      vi.useRealTimers()
    }
  })
})
