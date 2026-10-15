// Story 6.36b — the requests naming the member, page by page (review 2026-10-15 R3), and when the home card / notice-strip
// item shows (R4). The R4 leg drives a REAL QueryClient + InfiniteQueryObserver: TanStack KEEPS the previous pages in
// `data` when a refetch fails, so the entry must read the DENIAL, ⛔ `data` alone — and ONLY the denial hides it (a blip
// or a failed page 2 says nothing about the member — fix-diff review F3).

import { InfiniteQueryObserver, QueryClient } from '@tanstack/react-query'
import { ApiError } from '@twt/api-client'
import { describe, expect, it, vi } from 'vitest'

vi.mock('../../lib/mmkv', () => ({ mmkvStorage: { getItem: () => null, setItem: () => undefined, removeItem: () => undefined } }))

import {
  errorCodeOf,
  fetchKnownPeopleRequestsPage,
  KnownPeopleReadTimeout,
  retryKnownPeople,
  withReadTimeout,
} from '../../components/known-people/useKnownPeopleQueries'
import { KNOWN_PEOPLE_LIST_LIMIT_MAX } from '@twt/contracts'

import { DENIED_REQUESTS_PAGE, flattenRequestPages, KNOWN_PEOPLE_LIST_HISTORY_LIMIT, requestEntryVisible, requestsDenied } from '../../lib/known-people'

vi.mock('../../lib/known-people-api', () => ({ knownPeopleApi: {} }))
vi.mock('../../lib/session-context', () => ({ useSession: () => ({ session: null, isLoading: true }) }))

type Item = { linkId: string; state: 'asked' | 'accepted' }
type Page = { items: Item[]; nextCursor: string | null; hasMore: boolean }
const page = (items: Item[], nextCursor: string | null = null): Page => ({ items, nextCursor, hasMore: nextCursor !== null })

describe('withReadTimeout — a list read that never settles is ABORTED and fails (fix-diff review round 7)', () => {
  /** A read that settles only when its signal aborts — the hung request. */
  const hung = (seen: AbortSignal[]) => (signal: AbortSignal) =>
    new Promise<never>((_, reject) => {
      seen.push(signal)
      signal.addEventListener('abort', () => reject(new Error('aborted')))
    })

  it('after the timeout: the request is aborted and the read fails with KnownPeopleReadTimeout — which is ⛔ retried', async () => {
    const seen: AbortSignal[] = []
    const err = await withReadTimeout(undefined, hung(seen), 20).catch((e: unknown) => e)
    expect(err).toBeInstanceOf(KnownPeopleReadTimeout)
    expect(seen[0]!.aborted).toBe(true)
    expect(retryKnownPeople(0, err)).toBe(false)
    expect(retryKnownPeople(0, new TypeError('Network request failed'))).toBe(true) // a blip still retries
  })

  it('a read that IGNORES its signal (a stall before the request is sent — the token refresh) still fails at the bound', async () => {
    const seen: AbortSignal[] = []
    const ignoring = (signal: AbortSignal) => (seen.push(signal), new Promise<never>(() => undefined))
    const err = await withReadTimeout(undefined, ignoring, 20).catch((e: unknown) => e)
    expect(err).toBeInstanceOf(KnownPeopleReadTimeout)
    expect(seen[0]!.aborted).toBe(true)
  })

  it('TanStack\'s own cancel aborts the request too — with the read\'s error, ⛔ a timeout', async () => {
    const seen: AbortSignal[] = []
    const query = new AbortController()
    const pending = withReadTimeout(query.signal, hung(seen), 10_000)
    query.abort()
    const err = await pending.catch((e: unknown) => e)
    expect(seen[0]!.aborted).toBe(true)
    expect(err).not.toBeInstanceOf(KnownPeopleReadTimeout)
  })

  it('a read that answers in time is untouched', async () => {
    const seen: AbortSignal[] = []
    await expect(withReadTimeout(undefined, async (s) => (seen.push(s), 'ok'), 20)).resolves.toBe('ok')
    await new Promise((r) => setTimeout(r, 40))
    expect(seen[0]!.aborted).toBe(false) // the timer was cleared
  })
})

describe('the history bound', () => {
  it('the app asks for — and prunes saved names against — the server\'s own bound (round-6 review)', () => {
    expect(KNOWN_PEOPLE_LIST_HISTORY_LIMIT).toBe(KNOWN_PEOPLE_LIST_LIMIT_MAX)
  })
})

describe('flattenRequestPages', () => {
  it('joins the loaded pages in order, each link ONCE — the LATER (fresher) copy, in its place (fix-diff review F2)', () => {
    // `a` was answered between the two page fetches: page 1 still says `asked`, page 2 (fetched later) says `accepted`
    const pages = [page([{ linkId: 'a', state: 'asked' }, { linkId: 'b', state: 'accepted' }], 'c1'), page([{ linkId: 'a', state: 'accepted' }, { linkId: 'c', state: 'accepted' }])]
    expect(flattenRequestPages(pages)).toEqual([
      { linkId: 'b', state: 'accepted' },
      { linkId: 'a', state: 'accepted' },
      { linkId: 'c', state: 'accepted' },
    ])
    expect(flattenRequestPages(undefined)).toEqual([])
  })
})

describe('requestEntryVisible (AC6, AC10)', () => {
  const open = [page([{ linkId: 'a', state: 'asked' }])]
  const base = { pages: open, errorCode: undefined }

  it('shows only while a loaded request is OPEN', () => {
    expect(requestEntryVisible(base)).toBe(true)
    expect(requestEntryVisible({ ...base, pages: [page([{ linkId: 'b', state: 'accepted' }])] })).toBe(false)
    expect(requestEntryVisible({ ...base, pages: undefined })).toBe(false)
  })

  it('⛔ once the server refuses the member — whatever `data` still holds; any OTHER failure leaves what the pages say', () => {
    expect(requestEntryVisible({ ...base, errorCode: 'known_people.not_available' })).toBe(false)
    expect(requestEntryVisible({ ...base, pages: [DENIED_REQUESTS_PAGE] })).toBe(false)
    expect(requestEntryVisible({ ...base, pages: [...open, DENIED_REQUESTS_PAGE] })).toBe(false) // a page-2 denial
    expect(requestEntryVisible({ ...base, errorCode: 'network.unavailable' })).toBe(true)
    expect(requestsDenied(open)).toBe(false)
  })
})

describe('R4 against the installed QueryClient', () => {
  /** The hook's own page fetch (`fetchKnownPeopleRequestsPage` — a denial becomes data) around a scripted server. */
  function observe(client: QueryClient, server: (ctx: { pageParam: string | undefined }) => Promise<Page>) {
    return new InfiniteQueryObserver(client, {
      queryKey: ['known-people', 'v1', 'p', 'm', 'requests'],
      queryFn: (ctx: { pageParam: string | undefined }) => fetchKnownPeopleRequestsPage(() => server(ctx)),
      initialPageParam: undefined as string | undefined,
      getNextPageParam: (last: { nextCursor: string | null }) => last.nextCursor ?? undefined,
      retry: false,
    })
  }
  const visibleNow = (obs: ReturnType<typeof observe>) => {
    const r = obs.getCurrentResult()
    return requestEntryVisible({ pages: r.data?.pages, errorCode: errorCodeOf(r.error) })
  }

  it('a refetch denied with known_people.not_available REPLACES the cached pages with the denial — the entry hides', async () => {
    const client = new QueryClient()
    let denied = false
    const obs = observe(client, async () => {
      if (denied) throw new ApiError(403, 'known_people.not_available', 'not available')
      return page([{ linkId: 'a', state: 'asked' }])
    })
    const unsubscribe = obs.subscribe(() => undefined)
    try {
      await vi.waitFor(() => expect(obs.getCurrentResult().isSuccess).toBe(true))
      expect(visibleNow(obs)).toBe(true)
      denied = true
      await obs.refetch()
      expect(obs.getCurrentResult().data?.pages).toEqual([DENIED_REQUESTS_PAGE]) // the denial REPLACED the old pages
      expect(visibleNow(obs)).toBe(false)
    } finally {
      unsubscribe()
      client.clear()
    }
  })

  it('the denial STANDS through later failures of any other kind — until a success (fix-diff review E1)', async () => {
    const client = new QueryClient()
    const script: (() => Promise<Page>)[] = [
      async () => page([{ linkId: 'a', state: 'asked' }]),
      async () => {
        throw new ApiError(403, 'known_people.not_available', 'not available')
      },
      async () => {
        throw new TypeError('Network request failed') // offline: ⛔ an ApiError, ⛔ a code
      },
      async () => {
        throw new ApiError(503, 'http.503', 'down')
      },
      async () => page([{ linkId: 'b', state: 'asked' }]), // active again (a renewal)
    ]
    let call = 0
    const obs = observe(client, () => script[Math.min(call++, script.length - 1)]!())
    const unsubscribe = obs.subscribe(() => undefined)
    try {
      await vi.waitFor(() => expect(obs.getCurrentResult().isSuccess).toBe(true))
      const seen = [visibleNow(obs)]
      for (let i = 0; i < 4; i += 1) {
        await obs.refetch()
        seen.push(visibleNow(obs))
      }
      expect(seen).toEqual([true, false, false, false, true])
    } finally {
      unsubscribe()
      client.clear()
    }
  })

  it('a refetch that fails for any OTHER reason keeps the entry (the member was ⛔ refused)', async () => {
    const client = new QueryClient()
    let down = false
    const obs = observe(client, async () => {
      if (down) throw new ApiError(503, 'network.unavailable', 'down')
      return page([{ linkId: 'a', state: 'asked' }])
    })
    const unsubscribe = obs.subscribe(() => undefined)
    try {
      await vi.waitFor(() => expect(obs.getCurrentResult().isSuccess).toBe(true))
      down = true
      await obs.refetch()
      expect(obs.getCurrentResult().isError).toBe(true)
      expect(visibleNow(obs)).toBe(true)
    } finally {
      unsubscribe()
      client.clear()
    }
  })

  it('a failed page 2 keeps the entry (page 1 still holds the open request)', async () => {
    const client = new QueryClient()
    const obs = observe(client, async ({ pageParam }) => {
      if (pageParam === 'c1') throw new ApiError(503, 'network.unavailable', 'down')
      return page([{ linkId: 'a', state: 'asked' }], 'c1')
    })
    const unsubscribe = obs.subscribe(() => undefined)
    try {
      await vi.waitFor(() => expect(obs.getCurrentResult().isSuccess).toBe(true))
      await obs.fetchNextPage()
      expect(obs.getCurrentResult().isFetchNextPageError).toBe(true)
      expect(visibleNow(obs)).toBe(true)
    } finally {
      unsubscribe()
      client.clear()
    }
  })
})
