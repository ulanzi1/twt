// Story 3.13 — the identity check's queries and mutations (kept beside the module, ⛔ in the shared `api/hooks.ts`).

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { IdentityCheckRecordRequest } from '@twt/contracts';

import * as api from '../../api/client.js';

export const identityCheckQueueKey = (pariwarId: string) => ['identity-check-queue', pariwarId] as const;
export const identityCheckDetailKey = (pariwarId: string, memberId: string) => ['identity-check-detail', pariwarId, memberId] as const;

export function useIdentityCheckQueue(pariwarId: string) {
  return useQuery({ queryKey: identityCheckQueueKey(pariwarId), queryFn: () => api.getIdentityCheckQueue(pariwarId) });
}

/** The detail DECRYPTS the typed-in identity and is AUDITED per view ⇒ ⛔ a window-focus refetch. */
export function useIdentityCheckDetail(pariwarId: string, memberId: string) {
  return useQuery({
    queryKey: identityCheckDetailKey(pariwarId, memberId),
    queryFn: () => api.getIdentityCheckDetail(pariwarId, memberId),
    refetchOnWindowFocus: false,
  });
}

/** Record the act; on success the detail AND the queue are refreshed (the member may have left the queue). */
export function useRecordIdentityCheck(pariwarId: string, memberId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ body, idempotencyKey }: { body: IdentityCheckRecordRequest; idempotencyKey: string }) =>
      api.recordIdentityCheck(pariwarId, memberId, body, idempotencyKey),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: identityCheckDetailKey(pariwarId, memberId) });
      void qc.invalidateQueries({ queryKey: identityCheckQueueKey(pariwarId) });
    },
  });
}

/** ONE showing per press — ⛔ retried, ⛔ cached (the number lives in the component's state only). */
export function useRevealIdentityCheckMobile(pariwarId: string, memberId: string) {
  return useMutation({ mutationFn: () => api.revealIdentityCheckMobile(pariwarId, memberId), retry: false });
}
