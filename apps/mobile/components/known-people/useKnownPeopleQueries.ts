// People who know me — TanStack Query hooks (Story 6.36b, Task 4).
//
// ⭐ ⛔ NO call before the session has loaded: every hook is `enabled` only once the session's pariwarId and memberId are
// strings (the peer-request hooks' rule). A 4xx is ⛔ retried — a non-`active` member's 403 must settle at once so the
// home card and notice-strip item render nothing. The writes are per-call `mutateAsync` (⛔ `mutate()` callbacks — only
// the latest call's fire: [[project_tanstack_mutate_callbacks_latest_only]]); each carries its own Idempotency-Key.

import { useInfiniteQuery, useMutation, useQuery, useQueryClient, type InfiniteData } from '@tanstack/react-query'
import { ApiError } from '@twt/api-client'
import type { KnownPeopleFoundByWire, KnownPeopleRequestsResponse, MyKnownPeopleResponse } from '@twt/contracts'

import {
  DENIED_MY_KNOWN_PEOPLE,
  DENIED_REQUESTS_PAGE,
  isDenied,
  KNOWN_PEOPLE_LIST_HISTORY_LIMIT,
  requestsDenied,
  type DeniedMyKnownPeople,
  type DeniedRequestsPage,
} from '../../lib/known-people'
import { knownPeopleApi } from '../../lib/known-people-api'
import { useSession } from '../../lib/session-context'
import {
  invalidateKnownPeoplePrompts,
  KNOWN_PEOPLE_CACHE_OPTIONS,
  KNOWN_PEOPLE_MUTATION_OPTIONS,
  knownPeopleListKey,
  knownPeoplePromptsKey,
  knownPeopleRequestsKey,
} from './known-people-cache'

/**
 * A list read gives up after this long. The API client sets ⛔ timeout of its own (nor does React Native's Android HTTP
 * client), and a read that never settled left the screen on a spinner nothing could restart — every Retry design either
 * re-joined it or hid behind it (fix-diff reviews rounds 5–7). The request itself is ABORTED, ⛔ only abandoned.
 */
export const KNOWN_PEOPLE_READ_TIMEOUT_MS = 15_000

/** A list read that took longer than `KNOWN_PEOPLE_READ_TIMEOUT_MS` — ⛔ retried (it would only wait as long again). */
export class KnownPeopleReadTimeout extends Error {
  constructor() {
    super('known-people: the read timed out')
    this.name = 'KnownPeopleReadTimeout'
  }
}

/**
 * Run `read` with ONE signal that aborts on TanStack's own cancel (`querySignal` — a reset, a superseding refetch, the
 * last observer leaving) OR after `ms`, and RACE it against that timer: at `ms` the read REJECTS with
 * `KnownPeopleReadTimeout` whether or not it honoured the abort — a stall BEFORE the request is even sent (the access
 * token's refresh, a raw fetch with ⛔ timeout) left a merely-aborting bound pending forever (fix-diff review round 8).
 */
export function withReadTimeout<T>(
  querySignal: AbortSignal | undefined,
  read: (signal: AbortSignal) => Promise<T>,
  ms = KNOWN_PEOPLE_READ_TIMEOUT_MS,
): Promise<T> {
  const controller = new AbortController()
  const cancel = () => controller.abort()
  if (querySignal?.aborted) cancel()
  else querySignal?.addEventListener('abort', cancel)
  return new Promise<T>((resolve, reject) => {
    let settled = false
    const timer = setTimeout(() => {
      settle(() => {
        controller.abort()
        reject(new KnownPeopleReadTimeout())
      })
    }, ms)
    function settle(finish: () => void): void {
      if (settled) return
      settled = true
      clearTimeout(timer)
      querySignal?.removeEventListener('abort', cancel)
      finish()
    }
    read(controller.signal).then(
      (value) => settle(() => resolve(value)),
      (err: unknown) => settle(() => reject(err)),
    )
  })
}

/** Retry only what might succeed on a retry — ⛔ a 4xx (a refusal is the answer), ⛔ a timed-out read. */
export function retryKnownPeople(failureCount: number, error: unknown): boolean {
  if (error instanceof ApiError && error.status >= 400 && error.status < 500) return false
  if (error instanceof KnownPeopleReadTimeout) return false
  return failureCount < 2
}

function useIds() {
  const { session, isLoading } = useSession()
  const pariwarId = isLoading ? undefined : session?.pariwarId
  const memberId = isLoading ? undefined : session?.memberId
  return { pariwarId, memberId, ready: typeof pariwarId === 'string' && typeof memberId === 'string' }
}

/**
 * The server's DENIAL (`known_people.not_available`) becomes DATA, so it stands until the next successful fetch: as an
 * error, the next failure of another kind (offline, a 5xx) replaced it while TanStack still held the pre-denial data —
 * a non-`active` member saw their old open request again (fix-diff review E1; the namer's list too, G3). Every other
 * failure stays an error.
 */
async function denialAsData<P, D>(fetch: () => Promise<P>, denied: D): Promise<P | D> {
  try {
    return await fetch()
  } catch (err) {
    if (errorCodeOf(err) === 'known_people.not_available') return denied
    throw err
  }
}

/** One page of the requests naming the member (a denial ⇒ `DENIED_REQUESTS_PAGE`). */
export function fetchKnownPeopleRequestsPage<P>(fetchPage: () => Promise<P>): Promise<P | DeniedRequestsPage> {
  return denialAsData(fetchPage, DENIED_REQUESTS_PAGE)
}

/** The namer's list (a denial ⇒ `DENIED_MY_KNOWN_PEOPLE`). */
export function fetchMyKnownPeople<P>(fetchList: () => Promise<P>): Promise<P | DeniedMyKnownPeople> {
  return denialAsData(fetchList, DENIED_MY_KNOWN_PEOPLE)
}

export function useMyKnownPeopleQuery() {
  const { pariwarId, memberId, ready } = useIds()
  return useQuery({
    ...KNOWN_PEOPLE_CACHE_OPTIONS,
    queryKey: knownPeopleListKey(pariwarId, memberId),
    queryFn: ({ signal }) =>
      fetchMyKnownPeople(() => withReadTimeout(signal, (s) => knownPeopleApi.list(KNOWN_PEOPLE_LIST_HISTORY_LIMIT, { signal: s }))),
    enabled: ready,
    retry: retryKnownPeople,
  })
}

/**
 * The requests naming the member, PAGE BY PAGE (open asks first, then accepted ones — *"Show more"* while the server says
 * `hasMore`; review 2026-10-15 R3). An invalidation (any write) refetches from the FIRST page. ⚠ A failed refetch KEEPS
 * the loaded pages in `data` — read them through `requestEntryVisible` / `requestsDenied`, ⛔ bare (R4, E1).
 */
export function useKnownPeopleRequestsQuery() {
  const { pariwarId, memberId, ready } = useIds()
  return useInfiniteQuery({
    ...KNOWN_PEOPLE_CACHE_OPTIONS,
    queryKey: knownPeopleRequestsKey(pariwarId, memberId),
    queryFn: ({ pageParam, signal }) =>
      fetchKnownPeopleRequestsPage(() =>
        withReadTimeout(signal, (s) => knownPeopleApi.requests(pageParam !== undefined ? { cursor: pageParam } : {}, { signal: s })),
      ),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
    enabled: ready,
    retry: retryKnownPeople,
  })
}

/**
 * Reload BOTH lists from nothing — the not-available message's Retry. `resetQueries` cancels any fetch in flight and
 * fetches afresh: ⭐ `refetch()` cannot — on a query with ⛔ data yet it RE-JOINS a hung first fetch instead of restarting
 * it, and these fetches have ⛔ timeout (round-6 review). Resolves once both have settled, with whether access is back.
 */
export function useRestartKnownPeopleLists(): () => Promise<{ readonly restored: boolean }> {
  const qc = useQueryClient()
  const { pariwarId, memberId } = useIds()
  return async () => {
    const listKey = knownPeopleListKey(pariwarId, memberId)
    const requestsKey = knownPeopleRequestsKey(pariwarId, memberId)
    await Promise.all([qc.resetQueries({ queryKey: listKey, exact: true }), qc.resetQueries({ queryKey: requestsKey, exact: true })])
    const list = qc.getQueryState<MyKnownPeopleResponse | DeniedMyKnownPeople>(listKey)
    const reqs = qc.getQueryState<InfiniteData<KnownPeopleRequestsResponse | DeniedRequestsPage>>(requestsKey)
    return {
      restored: list?.status === 'success' && reqs?.status === 'success' && !isDenied(list.data) && !requestsDenied(reqs.data?.pages),
    }
  }
}

/**
 * Story 6.36c (AC5, AC6) — the home prompts: which ONE reminder card to show. `gcTime: 0` (⛔ persisted), the read timeout,
 * ⛔ a call before the session has loaded. 200 for ANY member session (RV2) — a failure simply shows ⛔ card.
 */
export function useKnownPeoplePromptsQuery() {
  const { pariwarId, memberId, ready } = useIds()
  return useQuery({
    ...KNOWN_PEOPLE_CACHE_OPTIONS,
    queryKey: knownPeoplePromptsKey(pariwarId, memberId),
    queryFn: ({ signal }) => withReadTimeout(signal, (s) => knownPeopleApi.prompts({ signal: s })),
    enabled: ready,
    retry: retryKnownPeople,
  })
}

/** The writes. Each invalidates both lists on success (the other side's view changes too) — and the home prompts (6.36c). */
export function useKnownPeopleWrites() {
  const qc = useQueryClient()
  const { pariwarId, memberId } = useIds()
  const refresh = async () => {
    await Promise.all([
      qc.invalidateQueries({ queryKey: knownPeopleListKey(pariwarId, memberId) }),
      qc.invalidateQueries({ queryKey: knownPeopleRequestsKey(pariwarId, memberId) }),
      // The ONE prompts-invalidation path (fix-review) — `known-people-cache.ts`'s `invalidateKnownPeoplePrompts`.
      invalidateKnownPeoplePrompts(qc),
    ])
  }
  const ask = useMutation({
    ...KNOWN_PEOPLE_MUTATION_OPTIONS,
    mutationFn: (v: { mobile: string; foundBy: KnownPeopleFoundByWire; idempotencyKey: string }) => knownPeopleApi.ask(v.mobile, v.foundBy, v.idempotencyKey),
  })
  const remove = useMutation({
    ...KNOWN_PEOPLE_MUTATION_OPTIONS,
    mutationFn: (v: { linkId: string; idempotencyKey: string }) => knownPeopleApi.remove(v.linkId, v.idempotencyKey),
    onSuccess: refresh,
  })
  const answer = useMutation({
    ...KNOWN_PEOPLE_MUTATION_OPTIONS,
    mutationFn: (v: { linkId: string; answer: 'accept' | 'decline'; idempotencyKey: string }) => knownPeopleApi.answer(v.linkId, v.answer, v.idempotencyKey),
    onSuccess: refresh,
  })
  const withdraw = useMutation({
    ...KNOWN_PEOPLE_MUTATION_OPTIONS,
    mutationFn: (v: { linkId: string; idempotencyKey: string }) => knownPeopleApi.withdraw(v.linkId, v.idempotencyKey),
    onSuccess: refresh,
  })
  return { ask, remove, answer, withdraw, refresh }
}

/** The server's error code (or undefined) — for `refusalCopyKey`. */
export function errorCodeOf(error: unknown): string | undefined {
  return error instanceof ApiError ? error.code : undefined
}
