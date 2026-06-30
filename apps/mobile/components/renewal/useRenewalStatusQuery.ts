import { useQuery } from '@tanstack/react-query'

import { memberAuth } from '../../lib/member-api'

// Renewal-status read hook (Story 3.8, Task 6). Fetches the server-authoritative FR-12A renewal status
// via the member-auth SDK (vyawasthaShulkRenewalStatus → GET /api/v1/member/vyawastha-shulk/
// renewal-status). Mirrors the React Query shape of components/lock-in/useLockInClockQuery.ts; the
// response is Zod-validated inside the SDK.
//
// Day-granular + calm — no per-second ticking; re-fetch on screen focus + React Query's default
// staleness covers the renewal cadence (the server figures are ≤60s fresh regardless).

export function useRenewalStatusQuery() {
  return useQuery({
    queryKey: ['member', 'renewal-status'],
    queryFn: () => memberAuth.vyawasthaShulkRenewalStatus(),
  })
}
