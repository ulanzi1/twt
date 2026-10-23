// Story 11b.4 (AC1) — the family memorial's queries.
//
// ⚠⛔ EVERY memorial query sets `gcTime: 0`: `components/Provider.tsx` writes every successful query to UNENCRYPTED MMKV
// for 7 days EXCEPT one whose hook sets `gcTime: 0` (*"NEVER PERSIST THIS"*). Without it the family's words, the deceased's
// name and a signed photo URL would survive sign-out and the erasure (CR-11b.2a-COMBINED-W3 trigger (iii) — ⛔ met here).
// Plus `staleTime: 0` (the default 1 h would show `with_the_trust` long after the Trust decided) and invalidation after
// Send / Withdraw (the `useMemberDriveDetailQuery.ts` precedent).

import { useQuery, type QueryClient } from '@tanstack/react-query'

import type { MemorialEntryResponse, MemorialMemberViewResponse } from '@twt/contracts'

import { memorialApi } from '../../lib/memorial-api'

export const MEMORIAL_ENTRY_QUERY_KEY = ['member', 'memorial', 'entry'] as const
export const MEMORIAL_VIEW_QUERY_KEY = ['member', 'memorial', 'view'] as const

export function useMemorialEntryQuery(enabled: boolean) {
  return useQuery<MemorialEntryResponse>({
    queryKey: MEMORIAL_ENTRY_QUERY_KEY,
    queryFn: () => memorialApi.entry(),
    enabled,
    gcTime: 0,
    staleTime: 0,
    retry: false,
  })
}

export function useMemorialViewQuery(opts: { refetchOnMount?: 'always' } = {}) {
  return useQuery<MemorialMemberViewResponse>({
    queryKey: MEMORIAL_VIEW_QUERY_KEY,
    queryFn: () => memorialApi.view(),
    gcTime: 0,
    staleTime: 0,
    retry: false,
    ...(opts.refetchOnMount ? { refetchOnMount: opts.refetchOnMount } : {}),
  })
}

/** After a Send or a Withdraw: both memorial queries are stale at once. */
export async function invalidateMemorialQueries(client: QueryClient): Promise<void> {
  await client.invalidateQueries({ queryKey: ['member', 'memorial'] })
}
