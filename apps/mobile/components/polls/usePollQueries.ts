// Poll member query hooks — Story 10.15 (Task 9).
//
// TanStack Query hooks over the member-survey SDK (lib/poll-api). The survey routes are
// Pariwar-scoped in the path, so each hook takes the pariwarId (the screens read it from the session
// context). Keys are namespaced under ['polls', …] so a successful submit can invalidate the list —
// which is what flips the member's `answered` flag without a manual refetch.

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import type { SurveyAnswer } from '@twt/contracts'

import { pollApi } from '../../lib/poll-api'

export function usePollsQuery(pariwarId: string | undefined) {
  return useQuery({
    queryKey: ['polls', 'list', pariwarId],
    queryFn: () => pollApi.list(pariwarId as string),
    enabled: !!pariwarId,
  })
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
