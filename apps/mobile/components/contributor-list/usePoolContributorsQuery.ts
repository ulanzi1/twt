import { useQuery } from '@tanstack/react-query'

import { memberAuth } from '../../lib/member-api'

// Live Contributor List read hook — Story 8.3 (Task 4). Fetches the server-authoritative contributor-list
// model via the member-auth SDK (memberPoolContributors → GET /api/v1/member/pool-contributors). The
// response is Zod-validated inside the SDK (the discriminated `{ assigned }` union). Auto-persisted to MMKV
// by the app's PersistQueryClientProvider (lib/query-client.ts), so a cached list renders offline read-only.
//
// ── Near-real-time refresh (AC5 / D6) — polling, NOT a push socket ──────────────────────────────────────
// The epic says "within seconds (real-time update)" when a contribution flips yellow→green via Epic 9
// reconciliation. There is NO websocket/SSE infrastructure in the stack (Fastify + React Query + MMKV), so
// v1 "near-real-time" is a bounded `refetchInterval` + `refetchOnReconnect`. ⭐ Polling is honest and
// sufficient; a push transport is a documented DEFERRED seam.
// ⚠⚠ TWO CORRECTIONS, and the SECOND retracts an over-claim made by the first (third code review):
//   1. This is ⛔ NOT "moot today". Epic 9's `contribution.confirmed` producer has been LIVE since
//      Story 9.4/9.5, so this poll carries REAL rows ([[project_epic9_confirmed_producer_is_live]] —
//      never read population from a comment). ⛔ The stream is ⛔ not empty.
//   2. ⛔⛔ BUT "NEITHER IS INERT" — written here by the second code review — WAS ITSELF FALSE, and
//      replacing a stale false claim with a NEW false claim is the exact defect AC10 exists to stop.
//      `refetchInterval` is live. **`refetchOnReconnect` is INERT ON REACT NATIVE**: query-core's
//      `OnlineManager` wires only `window.addEventListener('online'/'offline')` (its own source says
//      *"addEventListener does not exist in React Native, but window does"*), RN never fires those,
//      and this app wires ⛔ no `onlineManager`/`NetInfo` bridge — the same absence the focus-bridge
//      note below already admits. ⇒ ⭐ ONE of the two is live; ⛔ do not write "both" or "neither".
//
// The `refetch-on-foreground` half of the AC is a SEAM: React Query's `refetchOnWindowFocus` needs an
// AppState→`focusManager` bridge, which the app does not wire yet (grep: no `focusManager`/`AppState` setup).
// Until that bridge lands app-wide (a cross-cutting concern, not this story's to add), the bounded interval
// below is the refresh mechanism. When the bridge lands, `refetchOnWindowFocus` starts firing with no change here.
//
// `staleTime` is overridden shorter than the app default (1h) so the interval actually re-fetches (a value
// that is still "fresh" would be skipped). The 15-day cycle window makes a 60s cadence more than ample.
//
// Note (Review correction): this bounded interval is NEW to 8.3, not a reused posture — neither the 8.2
// `useActiveContributionQuery` nor the 3.8 renewal-status query sets any `refetchInterval`; both rely
// solely on the default `staleTime`. 8.3 is the first member surface to poll.
const NEAR_REAL_TIME_INTERVAL_MS = 60_000 // 60s — bounded; a contribution confirm surfaces on the next tick.

export function usePoolContributorsQuery() {
  return useQuery({
    queryKey: ['member', 'pool-contributors'],
    queryFn: () => memberAuth.memberPoolContributors(),
    // Near-real-time (D6): a bounded poll so an Epic-9 confirm appears within ~a minute; foreground refetch
    // is the documented seam above. ⚠ The INTERVAL is a real product choice over a live stream; the
    // `refetchOnReconnect` flag beside it is INERT on RN until an `onlineManager` bridge is wired
    // (see the header — corrected at the third code review, which caught the second over-claiming).
    refetchInterval: NEAR_REAL_TIME_INTERVAL_MS,
    refetchOnReconnect: true,
    staleTime: NEAR_REAL_TIME_INTERVAL_MS,
  })
}
