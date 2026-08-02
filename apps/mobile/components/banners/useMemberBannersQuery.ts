// Member banner read + dismiss hooks — Story 10.9 (Task 7).
//
// Fetches the SERVER-RESOLVED at-most-one-banner + at-most-one-popup pair via the @twt/api-client
// member-banner SDK (GET /api/v1/p/:pariwarId/member/banners). Mirrors the React Query shape of
// components/active-contribution/useActiveContributionQuery.ts; the response is Zod-validated inside
// the SDK.
//
// ⚠ The client NEVER re-resolves precedence. The server picks the winner (one pure resolver, shared
// with the admin console) so every device shows the same banner — the whole point of AC5.
//
// Calm cadence: a banner window moves in hours/days, not seconds. No polling interval; the query is
// auto-persisted to MMKV by the app's PersistQueryClientProvider (lib/query-client.ts), so a cached
// banner renders offline read-only ([[project_mmkv_asyncstorage_equivalent]] — the app standardized
// on MMKV, not AsyncStorage).

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { bannerApi } from '../../lib/banner-api'

export const MEMBER_BANNERS_QUERY_KEY = ['member', 'banners'] as const

/** The resolved banner + popup pair for the member's Pariwar. */
export function useMemberBannersQuery(pariwarId: string | null | undefined) {
  return useQuery({
    queryKey: [...MEMBER_BANNERS_QUERY_KEY, pariwarId ?? 'none'],
    queryFn: () => bannerApi.list(pariwarId!),
    // No session → no tenant → nothing to ask for. The host self-suppresses in that case anyway.
    enabled: typeof pariwarId === 'string' && pariwarId.length > 0,
  })
}

/**
 * Record an acknowledgement. IDEMPOTENT server-side, so a retry (or a double-tap that slipped past
 * the local guard) is harmless. On success the banner list is invalidated so the next fetch
 * reconciles with the optimistic local removal the host already applied.
 */
export function useDismissBannerMutation(pariwarId: string | null | undefined) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (args: { bannerId: string; kind: 'dismissed' | 'shown' }) =>
      bannerApi.dismiss(pariwarId!, args.bannerId, args.kind),
    onSettled: () => {
      // Reconcile on both success AND failure: a failed dismiss must not leave the member looking at
      // a banner the server still considers live with no way back to the truth.
      void qc.invalidateQueries({ queryKey: MEMBER_BANNERS_QUERY_KEY })
    },
  })
}
