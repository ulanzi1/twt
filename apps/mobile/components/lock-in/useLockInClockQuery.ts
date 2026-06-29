import { useQuery } from '@tanstack/react-query'

import { memberAuth } from '../../lib/member-api'

// Lock-in clock read hook (Story 3.7, Task 5). Fetches the server-authoritative lock-in status via the
// member-auth SDK (memberLockInStatus → GET /api/v1/member/lock-in-status). Mirrors the React Query
// shape of components/yogdaan-bahi/useYogdaanQuery.ts; the response is Zod-validated inside the SDK.
//
// The countdown is DAY-granular and calm — no per-second ticking. Re-fetch on screen focus is enough;
// React Query's default staleness + the home tab remount cover the "next alert cycle" cadence (AC3).

export function useLockInClockQuery() {
  return useQuery({
    queryKey: ['member', 'lock-in-status'],
    queryFn: () => memberAuth.memberLockInStatus(),
  })
}
