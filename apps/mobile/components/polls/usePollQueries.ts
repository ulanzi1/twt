// Poll member query hooks — Story 10.15 (Task 9).
//
// TanStack Query hooks over the member-survey SDK (lib/poll-api). The survey routes are
// Pariwar-scoped in the path, so each hook takes the pariwarId (the screens read it from the session
// context). Keys are namespaced under ['polls', …] so a successful submit can invalidate the list —
// which is what flips the member's `answered` flag without a manual refetch.

import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query'

import type { MemberSurveyListResponse, MemberSurveyResponse, SurveyAnswer } from '@twt/contracts'

import { pollApi } from '../../lib/poll-api'

/**
 * [Review][Patch] — code review of 10-15-survey-poll (2026-08-17): `usePollsQuery` was a single
 * `useQuery` with no way to reach a page past the server's default (`pollApi.list` took no
 * `limit`/`offset` at all) — a member with more open, in-audience polls than one page could never
 * see the rest, AND the answer screen (which searches every loaded page for one `surveyId`) would
 * report "not found" for a poll that genuinely exists just past page 1. `useInfiniteQuery` + the
 * server's `next_offset` (added in the API/contracts pass) fixes both: `flattenPolls` below gives
 * callers the same flat `MemberSurveyResponse[]` shape as before, while `index.tsx` wires
 * `fetchNextPage`/`hasNextPage` to the list's `onEndReached`.
 */
export function usePollsQuery(pariwarId: string | undefined) {
  return useInfiniteQuery({
    queryKey: ['polls', 'list', pariwarId],
    queryFn: ({ pageParam }) => pollApi.list(pariwarId as string, { offset: pageParam }),
    initialPageParam: 0,
    getNextPageParam: (lastPage) => lastPage.next_offset ?? undefined,
    enabled: !!pariwarId,
  })
}

/** Flattens every loaded page into one list, in fetch order — the shape every screen consumes. */
export function flattenPolls(data: { pages: MemberSurveyListResponse[] } | undefined): MemberSurveyResponse[] {
  return data?.pages.flatMap((page) => page.items) ?? []
}

/**
 * Submit the member's response.
 *
 * ⚠ `idempotencyKey` is supplied by the CALLER and must be generated ONCE per screen mount, not per
 * tap (`newIdempotencyKey` in ./copy.ts). Reusing it across retries replays the original 201; a fresh
 * key on a genuine second submission correctly conflicts with a 409, because a member answers once
 * and the answer is final.
 */
export function useSubmitPollResponse(pariwarId: string | undefined) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (args: {
      surveyId: string
      answers: SurveyAnswer[]
      turnstileToken: string
      idempotencyKey: string
    }) =>
      pollApi.submitResponse(
        pariwarId as string,
        args.surveyId,
        args.answers,
        args.turnstileToken,
        args.idempotencyKey,
      ),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['polls', 'list', pariwarId] })
    },
  })
}
