// The neighbours' answer screens — TanStack Query hooks (Story 6.27a PM11, Task 5).
//
// ⭐ ⛔ NO call before the session has loaded: every hook takes the pariwarId from `useSession()` and is `enabled` only
// once it is a string (the root guard renders the Stack while the session is still loading — `app/_layout.tsx`).
// Keys are namespaced under ['peer-requests', …]. The save is a per-call `mutateAsync` (⛔ `mutate()` callbacks — only the
// latest call's fire, and each answer is its own save — [[project_tanstack_mutate_callbacks_latest_only]]).

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import type { PeerRequestAnswerValue } from '@twt/contracts'

import { peerRequestApi } from '../../lib/peer-request-api'
import { withReadTimeout } from '../known-people/useKnownPeopleQueries'
import { useSession } from '../../lib/session-context'
import {
  PEER_REQUEST_CACHE_OPTIONS,
  PEER_REQUEST_MUTATION_OPTIONS,
  peerRequestByLinkKey,
  peerRequestDetailKey,
  peerRequestListKey,
} from './peer-request-cache'

export function usePeerRequestsQuery(pariwarId: string | undefined) {
  const { session, isLoading } = useSession()
  const memberId = isLoading ? undefined : session?.memberId
  return useQuery({
    ...PEER_REQUEST_CACHE_OPTIONS,
    queryKey: peerRequestListKey(pariwarId, memberId),
    queryFn: () => peerRequestApi.list(pariwarId as string),
    enabled: typeof pariwarId === 'string' && typeof memberId === 'string' && session?.pariwarId === pariwarId,
  })
}

export function usePeerRequestQuery(pariwarId: string | undefined, pingId: string | null) {
  const { session, isLoading } = useSession()
  const memberId = isLoading ? undefined : session?.memberId
  return useQuery({
    ...PEER_REQUEST_CACHE_OPTIONS,
    queryKey: peerRequestDetailKey(pariwarId, memberId, pingId),
    queryFn: () => peerRequestApi.get(pariwarId as string, pingId as string),
    enabled: typeof pariwarId === 'string' && typeof memberId === 'string' && session?.pariwarId === pariwarId && pingId !== null,
    retry: false,
  })
}

/**
 * ⭐ Story 6.27c (AC6; R14) — the texted link's code → `{ pingId }`: ONE call, once the session has loaded and a code is present
 * (⛔ a retry, ⛔ a refetch on focus / remount — `staleTime: Infinity`; a 404 or a network failure is the not-openable state).
 * In memory only (`gcTime: 0`). ⛔ The code is never logged. ⭐ BOUNDED (6.27c review round 2 P4): the transport has ⛔ timeout, so
 * a stalled cold start would sit on "Loading…" with ⛔ exit — the read is RACED against the app's read timeout (6.36b's
 * `withReadTimeout`), and a timed-out read is a failed call (⇒ not-openable + the helpline).
 */
export function usePeerRequestByLinkQuery(pariwarId: string | undefined, code: string | null) {
  const { session, isLoading } = useSession()
  const memberId = isLoading ? undefined : session?.memberId
  return useQuery({
    ...PEER_REQUEST_CACHE_OPTIONS,
    staleTime: Infinity,
    queryKey: peerRequestByLinkKey(pariwarId, memberId, code),
    queryFn: ({ signal }) => withReadTimeout(signal, (s) => peerRequestApi.byLink(pariwarId as string, code as string, { signal: s })),
    enabled: typeof pariwarId === 'string' && typeof memberId === 'string' && session?.pariwarId === pariwarId && code !== null,
    retry: false,
  })
}

export function useSavePeerAnswer(pariwarId: string | undefined, pingId: string) {
  const qc = useQueryClient()
  const { session } = useSession()
  const detailKey = peerRequestDetailKey(pariwarId, session?.memberId, pingId)
  return useMutation({
    ...PEER_REQUEST_MUTATION_OPTIONS,
    onMutate: () => qc.cancelQueries({ queryKey: detailKey, exact: true }),
    // ⭐ Story 6.33 (R7) — EVERY save carries the version the screen RENDERED.
    mutationFn: (args: { questionKey: string; value: PeerRequestAnswerValue; idempotencyKey: string; questionnaireVersionId: string }) =>
      peerRequestApi.saveAnswer(pariwarId as string, pingId, args.questionKey, args.value, args.idempotencyKey, args.questionnaireVersionId),
    onSuccess: (result) => {
      // A late acknowledgement after sign-out must not recreate a removed sensitive query.
      qc.setQueryData<import('@twt/contracts').PeerRequestDetailResponse>(detailKey, (detail) =>
        detail ? { ...detail, answers: result.answers } : undefined,
      )
    },
  })
}

export function useSubmitPeerReply(pariwarId: string | undefined, pingId: string) {
  const qc = useQueryClient()
  const { session } = useSession()
  return useMutation({
    ...PEER_REQUEST_MUTATION_OPTIONS,
    mutationFn: (idempotencyKey: string) => peerRequestApi.submit(pariwarId as string, pingId, idempotencyKey),
    onSuccess: () => {
      const detailKey = peerRequestDetailKey(pariwarId, session?.memberId, pingId)
      qc.setQueryData<import('@twt/contracts').PeerRequestDetailResponse>(detailKey, (detail) =>
        detail ? { ...detail, submitted: true } : undefined,
      )
      void qc.invalidateQueries({ queryKey: detailKey, exact: true, refetchType: 'none' })
      return qc.invalidateQueries({ queryKey: peerRequestListKey(pariwarId, session?.memberId) })
    },
  })
}
