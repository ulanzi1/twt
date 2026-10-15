// People who know me — TanStack Query hooks (Story 6.36b, Task 4).
//
// ⭐ ⛔ NO call before the session has loaded: every hook is `enabled` only once the session's pariwarId and memberId are
// strings (the peer-request hooks' rule). A 4xx is ⛔ retried — a non-`active` member's 403 must settle at once so the
// home card and notice-strip item render nothing. The writes are per-call `mutateAsync` (⛔ `mutate()` callbacks — only
// the latest call's fire: [[project_tanstack_mutate_callbacks_latest_only]]); each carries its own Idempotency-Key.

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ApiError } from '@twt/api-client'
import type { KnownPeopleFoundByWire } from '@twt/contracts'

import { knownPeopleApi } from '../../lib/known-people-api'
import { useSession } from '../../lib/session-context'
import { KNOWN_PEOPLE_CACHE_OPTIONS, KNOWN_PEOPLE_MUTATION_OPTIONS, knownPeopleListKey, knownPeopleRequestsKey } from './known-people-cache'

/** Retry only what might succeed on a retry — ⛔ a 4xx (a refusal is the answer). */
export function retryKnownPeople(failureCount: number, error: unknown): boolean {
  if (error instanceof ApiError && error.status >= 400 && error.status < 500) return false
  return failureCount < 2
}

function useIds() {
  const { session, isLoading } = useSession()
  const pariwarId = isLoading ? undefined : session?.pariwarId
  const memberId = isLoading ? undefined : session?.memberId
  return { pariwarId, memberId, ready: typeof pariwarId === 'string' && typeof memberId === 'string' }
}

export function useMyKnownPeopleQuery() {
  const { pariwarId, memberId, ready } = useIds()
  return useQuery({
    ...KNOWN_PEOPLE_CACHE_OPTIONS,
    queryKey: knownPeopleListKey(pariwarId, memberId),
    queryFn: () => knownPeopleApi.list(),
    enabled: ready,
    retry: retryKnownPeople,
  })
}

export function useKnownPeopleRequestsQuery() {
  const { pariwarId, memberId, ready } = useIds()
  return useQuery({
    ...KNOWN_PEOPLE_CACHE_OPTIONS,
    queryKey: knownPeopleRequestsKey(pariwarId, memberId),
    queryFn: () => knownPeopleApi.requests(),
    enabled: ready,
    retry: retryKnownPeople,
  })
}

/** The writes. Each invalidates both lists on success (the other side's view changes too). */
export function useKnownPeopleWrites() {
  const qc = useQueryClient()
  const { pariwarId, memberId } = useIds()
  const refresh = async () => {
    await Promise.all([
      qc.invalidateQueries({ queryKey: knownPeopleListKey(pariwarId, memberId) }),
      qc.invalidateQueries({ queryKey: knownPeopleRequestsKey(pariwarId, memberId) }),
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
