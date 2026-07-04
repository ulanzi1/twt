import { useQuery } from '@tanstack/react-query'

import { memberAuth } from '../../lib/member-api'

// Member-status read hook (Story 4.7, Task 6). Fetches the member's OWN redacted FR-12A validity payload
// via the member-auth SDK (memberValidity → GET /api/v1/member/validity). The self-call is redacted +
// NOT audited server-side (PRD FR-12A). Mirrors the React Query shape of useLifeEventsSummaryQuery; the
// response is Zod-validated inside the SDK. Key ['member','validity'].
export function useMemberValidityQuery() {
  return useQuery({
    queryKey: ['member', 'validity'],
    queryFn: () => memberAuth.memberValidity(),
  })
}
