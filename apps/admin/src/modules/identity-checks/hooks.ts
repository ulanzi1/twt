// Story 3.13 — the identity check's queries and mutations (kept beside the module, ⛔ in the shared `api/hooks.ts`).

import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { IdentityCheckRecordRequest } from '@twt/contracts';

import * as api from '../../api/client.js';

/** The queue's PREFIX key — every page of it (an invalidation by this key refreshes whichever page is on screen). */
export const identityCheckQueueKey = (pariwarId: string) => ['identity-check-queue', pariwarId] as const;
/** ONE page of the queue — the key carries the offset (`-504` item 3: the screen pages the queue). */
export const identityCheckQueuePageKey = (pariwarId: string, offset: number) => [...identityCheckQueueKey(pariwarId), offset] as const;
export const identityCheckDetailKey = (pariwarId: string, memberId: string) => ['identity-check-detail', pariwarId, memberId] as const;

/**
 * ONE page of the queue. `keepPreviousData`: while the next page loads the screen keeps the last page's rows (and the page
 * controls with them) — ⛔ a "Loading…" swap that unmounts the button staff just pressed and drops focus to the page.
 */
export function useIdentityCheckQueue(pariwarId: string, offset = 0) {
  return useQuery({
    queryKey: identityCheckQueuePageKey(pariwarId, offset),
    queryFn: () => api.getIdentityCheckQueue(pariwarId, offset),
    placeholderData: keepPreviousData,
  });
}

/**
 * The detail DECRYPTS the typed-in identity and is AUDITED per view, so ONE fetch is ONE view:
 * ⛔ a window-focus refetch, ⛔ a reconnect refetch (a reconnect is not a new view), ⛔ a retry (every fetch decrypts the
 * typed-in identity, and each decrypt writes KMS audit lines — a retry repeats that for no gain), ⛔ a cache that outlives
 * the page (`gcTime: 0` — the decrypted identity is gone on unmount). The record's invalidation below is still a deliberate re-read.
 */
export function useIdentityCheckDetail(pariwarId: string, memberId: string) {
  return useQuery({
    queryKey: identityCheckDetailKey(pariwarId, memberId),
    queryFn: () => api.getIdentityCheckDetail(pariwarId, memberId),
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    gcTime: 0,
    retry: false,
  });
}

/** The two 409s that mean the member's standing changed under the form: no check is awaited any more, or a claim is now filed for the death. */
export type StandingRefusal = 'not_eligible' | 'death_reported';

/** Which standing refusal `err` is, or `null` (any other failure — a 401, a concurrent save, a 5xx, the network). */
function standingRefusalOf(err: unknown): StandingRefusal | null {
  if (!(err instanceof api.ApiError) || err.status !== 409) return null;
  if (err.code === 'identity_validation.not_eligible') return 'not_eligible';
  if (err.code === 'identity_validation.death_reported') return 'death_reported';
  return null;
}

/** What the page hears from a write, in the SAME step that starts the refresh (see {@link useRecordIdentityCheck}). */
export interface RecordIdentityCheckListeners {
  /** A save went through: its outcome. */
  readonly onSaved?: (outcome: IdentityCheckRecordRequest['outcome']) => void;
  /** The server refused the write because the member's standing changed. */
  readonly onRefused?: (refusal: StandingRefusal) => void;
}

/**
 * Record the act; on success the detail AND the queue are refreshed (the member may have left the queue). A 409 REFUSAL
 * (not eligible any more, a death claim filed) refreshes both too: the page's history and banner must show what changed.
 * `onSaved` / `onRefused` are called in the SAME step that starts the refresh, so the page's "saved" line (or its refusal) is set
 * before the refetched detail — which, after a confirmation, says the member needs no check — can reach the screen: ⛔ left to a
 * per-call `mutate` callback, which runs later and ⛔ at all once the forms have unmounted.
 */
export function useRecordIdentityCheck(pariwarId: string, memberId: string, { onSaved, onRefused }: RecordIdentityCheckListeners = {}) {
  const qc = useQueryClient();
  const refresh = (): void => {
    void qc.invalidateQueries({ queryKey: identityCheckDetailKey(pariwarId, memberId) });
    void qc.invalidateQueries({ queryKey: identityCheckQueueKey(pariwarId) });
  };
  return useMutation({
    mutationFn: ({ body, idempotencyKey }: { body: IdentityCheckRecordRequest; idempotencyKey: string }) =>
      api.recordIdentityCheck(pariwarId, memberId, body, idempotencyKey),
    onSuccess: (_data, { body }) => {
      onSaved?.(body.outcome);
      refresh();
    },
    onError: (err) => {
      const refusal = standingRefusalOf(err);
      if (refusal === null) return;
      onRefused?.(refusal);
      refresh();
    },
  });
}

/** The server's own refusal of a number press: a 409 `identity_validation.*` (the member no longer awaits a check, a claim is filed for the death, the number is gone). */
export function isRevealRefusal(err: unknown): boolean {
  return err instanceof api.ApiError && err.status === 409 && err.code.startsWith('identity_validation.');
}

/**
 * ONE showing per press — ⛔ retried, ⛔ cached (`gcTime: 0`: the number is gone from the mutation cache on unmount; it lives in the
 * component's state only). A REFUSAL means the member's standing changed under the screen, so the detail and the queue are
 * re-read (code review R3-P2) — ⛔ the typed-in identity, the forms and the press left up beside "can no longer be shown here",
 * ⛔ a row that no longer awaits a check left in the list. Any other failure refreshes nothing.
 */
export function useRevealIdentityCheckMobile(pariwarId: string, memberId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.revealIdentityCheckMobile(pariwarId, memberId),
    retry: false,
    gcTime: 0,
    onError: (err) => {
      if (!isRevealRefusal(err)) return;
      void qc.invalidateQueries({ queryKey: identityCheckDetailKey(pariwarId, memberId) });
      void qc.invalidateQueries({ queryKey: identityCheckQueueKey(pariwarId) });
    },
  });
}
