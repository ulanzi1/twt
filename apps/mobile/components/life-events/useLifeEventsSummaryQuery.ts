import { useQuery } from '@tanstack/react-query'

import { memberAuth } from '../../lib/member-api'

// Life Events panel summary read hook (Story 3.9, Task 8). Fetches the NON-PII summary across the
// four sub-types (nominees / address / posting / medical) via the member-auth SDK (lifeEventsSummary
// → GET /api/v1/member/life-events). Mirrors the React Query shape of useRenewalStatusQuery; the
// response is Zod-validated inside the SDK. Query key ['member','life-events'] is invalidated after
// every Life Events mutation so the panel index reflects the latest state.

export function useLifeEventsSummaryQuery() {
  return useQuery({
    queryKey: ['member', 'life-events'],
    queryFn: () => memberAuth.lifeEventsSummary(),
  })
}
