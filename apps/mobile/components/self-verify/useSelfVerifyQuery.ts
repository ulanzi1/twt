import { useQuery } from '@tanstack/react-query'

import { memberAuth } from '../../lib/member-api'

// Self-verify recovery read hook — Story 9.7 (Task 6). Fetches the member's OWN recovery state for a pool
// (GET /api/v1/member/self-verify/:poolId) via the member-auth SDK — `{ mismatch, reason, screenshotUploaded,
// status }` (default / uploaded / resolved). The response is Zod-validated inside the SDK. Member-scoped
// (FR-12A) + fail-soft server-side, so the surface always has a state to render (never a 500 wall).
export function useSelfVerifyQuery(poolId: string) {
  return useQuery({
    queryKey: ['member', 'self-verify', poolId],
    queryFn: () => memberAuth.memberSelfVerifyState(poolId),
    enabled: poolId.length > 0,
  })
}
