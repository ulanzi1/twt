import { useQuery } from '@tanstack/react-query'

import { memberAuth } from '../../lib/member-api'

// Nominee Console read hook — Story 9.1 (Task 1). Fetches the server-authoritative console model via the
// member-auth SDK (memberNomineeConsole → GET /api/v1/member/nominee-console). The response is
// Zod-validated inside the SDK (the discriminated `{ isNominee }` union). Auto-persisted to MMKV by the
// app's PersistQueryClientProvider (lib/query-client.ts), so a cached model renders offline read-only.
//
// ── Near-real-time refresh (the daily-delta posture, UX L1560/L1700) — polling, NOT a push socket ───────
// The pool fill updates AFTER each statement upload, and the takeover clock advances daily; neither is
// real-time. There is NO websocket/SSE in the stack (the 8.3 D6 posture), so a bounded `refetchInterval` +
// `refetchOnReconnect` is the refresh mechanism. `staleTime` is set to the interval so the poll actually
// re-fetches. The 15-day window makes a 60s cadence more than ample and grief-paced (never aggressive).
const NEAR_REAL_TIME_INTERVAL_MS = 60_000 // 60s — bounded; a takeover flip / new confirm surfaces next tick.

export function useNomineeConsoleQuery() {
  return useQuery({
    queryKey: ['member', 'nominee-console'],
    queryFn: () => memberAuth.memberNomineeConsole(),
    refetchInterval: NEAR_REAL_TIME_INTERVAL_MS,
    refetchOnReconnect: true,
    staleTime: NEAR_REAL_TIME_INTERVAL_MS,
  })
}
