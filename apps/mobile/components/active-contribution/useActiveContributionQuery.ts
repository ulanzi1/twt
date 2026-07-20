import { useQuery } from '@tanstack/react-query'

import { memberAuth } from '../../lib/member-api'

// My Pool card read hook — Story 8.2 (Task 6). Fetches the server-authoritative compound card model
// via the member-auth SDK (memberActiveContribution → GET /api/v1/member/active-contribution).
// Mirrors the React Query shape of components/renewal/useRenewalStatusQuery.ts; the response is
// Zod-validated inside the SDK (the discriminated `{ assigned }` union).
//
// Day-granular + calm — no per-second ticking (the 15-day window moves in days). The query is
// auto-persisted to MMKV by the app's PersistQueryClientProvider (lib/query-client.ts), so a cached
// card renders offline read-only (UX §248/822) — the app standardized on MMKV, not AsyncStorage.
export function useActiveContributionQuery() {
  return useQuery({
    queryKey: ['member', 'active-contribution'],
    queryFn: () => memberAuth.memberActiveContribution(),
  })
}
