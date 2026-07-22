import { useQuery } from '@tanstack/react-query'

import { memberAuth } from '../../lib/member-api'

// Yogdaan Bahi read hook — Story 8.6 (Task 4). Fetches the member's OWN contribution history via the
// member-auth SDK (memberContributionHistory → GET /api/v1/member/contribution-history), Zod-validated
// inside the SDK. Replaces the P0-5 prototype's 300ms simulated sample-data fetch — this IS "the ledger
// summary endpoint production will hit" the prototype flagged.
//
// The ['yogdaan-bahi','summary'] query key is PRESERVED from the prototype (offline-cache continuity):
// the app's PersistQueryClientProvider (lib/query-client.ts) auto-persists it to MMKV, so the passbook
// renders offline read-only AND survives a Contribution-Note round-trip without a refetch flash — the
// save-and-resume posture (UX-DR50, D8). Day-granular + calm — no polling (the history moves in days).
export function useYogdaanQuery() {
  return useQuery({
    queryKey: ['yogdaan-bahi', 'summary'],
    queryFn: () => memberAuth.memberContributionHistory(),
  })
}
