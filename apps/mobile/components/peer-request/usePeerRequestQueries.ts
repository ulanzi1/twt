// The neighbours' answer screens — TanStack Query hooks (Story 6.27a PM11, Task 5).
//
// ⭐ ⛔ NO call before the session has loaded: every hook takes the pariwarId from `useSession()` and is `enabled` only
// once it is a string (the root guard renders the Stack while the session is still loading — `app/_layout.tsx`).
// Keys are namespaced under ['peer-requests', …]. The save is a per-call `mutateAsync` (⛔ `mutate()` callbacks — only the
// latest call's fire, and each answer is its own save — [[project_tanstack_mutate_callbacks_latest_only]]).

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import type { PeerRequestAnswerValue } from '@twt/contracts'

import { peerRequestApi } from '../../lib/peer-request-api'

export function usePeerRequestsQuery(pariwarId: string | undefined) {
  return useQuery({
    queryKey: ['peer-requests', 'list', pariwarId],
    queryFn: () => peerRequestApi.list(pariwarId as string),
    enabled: typeof pariwarId === 'string',
  })
}

export function usePeerRequestQuery(pariwarId: string | undefined, pingId: string | null) {
  return useQuery({
    queryKey: ['peer-requests', 'detail', pariwarId, pingId],
    queryFn: () => peerRequestApi.get(pariwarId as string, pingId as string),
    enabled: typeof pariwarId === 'string' && pingId !== null,
    retry: false,
  })
}

export function useSavePeerAnswer(pariwarId: string | undefined, pingId: string) {
  return useMutation({
    mutationFn: (args: { questionKey: string; value: PeerRequestAnswerValue; idempotencyKey: string }) =>
      peerRequestApi.saveAnswer(pariwarId as string, pingId, args.questionKey, args.value, args.idempotencyKey),
  })
}

export function useSubmitPeerReply(pariwarId: string | undefined, pingId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (idempotencyKey: string) => peerRequestApi.submit(pariwarId as string, pingId, idempotencyKey),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['peer-requests', 'list'] }),
  })
}
