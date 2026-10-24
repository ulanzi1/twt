// A nominee who is also a member — TanStack Query hooks (Story 6.36e, Task 5; AC2, AC4).
//
// ⭐ ⛔ NO call before the session has loaded: every hook is `enabled` only once the session's pariwarId and memberId are
// strings (the 6.36b rule). A 4xx is ⛔ retried. The requests list keeps the server's DENIAL (`nominee_link.not_available`)
// AS DATA, so it stands until the next successful fetch (6.36b fix-diff review E1). The answer is a per-call `mutateAsync`
// ([[project_tanstack_mutate_callbacks_latest_only]]) with its own Idempotency-Key.
// ⭐ Code review 2026-10-24: every read is BOUNDED by 6.36b's `withReadTimeout` (the API client has no transport timeout, and a
// stalled marks read would hold the whole nominee form on a spinner); a timeout is ⛔ retried; and the answer's `onSettled` does
// ⛔ RETURN the invalidate (`mutateAsync` awaits what `onSettled` returns — a stalled refetch left the buttons busy forever).

import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ApiError } from '@twt/api-client'

import { KnownPeopleReadTimeout, withReadTimeout } from '../known-people/useKnownPeopleQueries'
import { DENIED_NOMINEE_LINK_REQUESTS_PAGE, withRequestAnswered, type RequestPagesData } from '../../lib/nominee-links'
import { nomineeLinksApi } from '../../lib/nominee-links-api'
import { useSession } from '../../lib/session-context'
import { NOMINEE_LINKS_CACHE_OPTIONS, NOMINEE_LINKS_MUTATION_OPTIONS, nomineeLinkRequestsKey, nomineeLinksKey } from './nominee-links-cache'

function useIds() {
  const { session, isLoading } = useSession()
  const pariwarId = isLoading ? undefined : session?.pariwarId
  const memberId = isLoading ? undefined : session?.memberId
  return { pariwarId, memberId, ready: typeof pariwarId === 'string' && typeof memberId === 'string' }
}

/** ⛔ A 4xx is retried (a refusal settles at once); ⛔ a timeout (it would only wait as long again); anything else twice. */
export function retryNomineeLinks(failureCount: number, error: unknown): boolean {
  if (error instanceof KnownPeopleReadTimeout) return false
  if (error instanceof ApiError && error.status >= 400 && error.status < 500) return false
  return failureCount < 2
}

/** The server's error code (or undefined). */
export function errorCodeOf(error: unknown): string | undefined {
  return error instanceof ApiError ? error.code : undefined
}

/** The declarer's live marks (Life Events — the nominee form reads them before it renders). */
export function useNomineeLinksQuery(opts: { enabled?: boolean } = {}) {
  const { pariwarId, memberId, ready } = useIds()
  return useQuery({
    ...NOMINEE_LINKS_CACHE_OPTIONS,
    queryKey: nomineeLinksKey(pariwarId, memberId),
    queryFn: ({ signal }) => withReadTimeout(signal, (s) => nomineeLinksApi.links({ signal: s })),
    enabled: ready && opts.enabled !== false,
    retry: retryNomineeLinks,
  })
}

/** One page of the marks naming the member (a denial ⇒ `DENIED_NOMINEE_LINK_REQUESTS_PAGE`). */
export async function fetchNomineeLinkRequestsPage<P>(fetchPage: () => Promise<P>): Promise<P | typeof DENIED_NOMINEE_LINK_REQUESTS_PAGE> {
  try {
    return await fetchPage()
  } catch (err) {
    if (errorCodeOf(err) === 'nominee_link.not_available') return DENIED_NOMINEE_LINK_REQUESTS_PAGE
    throw err
  }
}

export function useNomineeLinkRequestsQuery() {
  const { pariwarId, memberId, ready } = useIds()
  return useInfiniteQuery({
    ...NOMINEE_LINKS_CACHE_OPTIONS,
    queryKey: nomineeLinkRequestsKey(pariwarId, memberId),
    queryFn: ({ pageParam, signal }) =>
      fetchNomineeLinkRequestsPage(() =>
        withReadTimeout(signal, (s) => nomineeLinksApi.requests(pageParam !== undefined ? { cursor: pageParam } : {}, { signal: s })),
      ),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
    enabled: ready,
    retry: retryNomineeLinks,
  })
}

/** The ONE answer — refetches the requests on any outcome (a 409 / 404 means the list changed). */
export function useNomineeLinkAnswer() {
  const qc = useQueryClient()
  const { pariwarId, memberId } = useIds()
  return useMutation({
    ...NOMINEE_LINKS_MUTATION_OPTIONS,
    mutationFn: (v: { linkId: string; answer: 'yes' | 'not_me'; idempotencyKey: string }) => nomineeLinksApi.answer(v.linkId, v.answer, v.idempotencyKey),
    // The cached row is marked answered the moment the server confirms it (the home card reads the same cache) …
    onSuccess: (res) => {
      qc.setQueryData(nomineeLinkRequestsKey(pariwarId, memberId), (old: unknown) => withRequestAnswered(old as RequestPagesData | undefined, res.linkId, res.answer))
    },
    // … ⛔ returned: the refetch runs on in the background, the outcome is shown at once.
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: nomineeLinkRequestsKey(pariwarId, memberId) })
    },
  })
}
