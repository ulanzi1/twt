import { useQuery } from '@tanstack/react-query'

import { memberAuth } from '../../lib/member-api'

// The member drive-list read hook — Story 11b.15 (Task 5). Fetches the server-authoritative list via
// the member-auth SDK (`memberDriveList` → GET /api/v1/member/drive-list). The response is
// Zod-validated inside the SDK. Auto-persisted to MMKV by the app's PersistQueryClientProvider
// (lib/query-client.ts), so a cached list renders offline read-only.
//
// ── ⚠⛔ THE ERROR STATE IS REACHABLE HERE, AND KEEPING IT SO IS THE POINT (AC6) ──────────────────
// The route is deliberately NOT fail-soft (see `member-pool/handlers.ts`'s `driveList`), so a read
// failure surfaces as React Query's `isError` rather than as an empty list. ⭐ That is what makes
// the surface's three ratified states — loading · empty · error — genuinely DISTINCT and separately
// announceable. ⛔ Do ⛔ not add a `placeholderData` / `select` that turns a failure into `[]`: it
// would tell a member their Pariwar has run no drives when the truth is that we could not load
// them, and it would make the error branch unreachable by construction.
//
// ── ⛔ NO POLL, AND THAT IS A CHOICE ────────────────────────────────────────────────────────────
// 8.3's contributor list sets a 60s `refetchInterval` because a yellow→green flip on the member's
// OWN live contribution is the thing that surface exists to show. ⭐ This list is a Pariwar's drive
// HISTORY: rows change when a drive opens, closes or settles — events on the order of a cycle, ⛔ not
// of a minute. A poll here would spend a member's data allowance re-fetching an archive.
// ⚠ `refetchOnReconnect` is left at the app default and is ⛔ INERT ON REACT NATIVE anyway —
// query-core's `OnlineManager` wires only `window.addEventListener('online'/'offline')`, which RN
// never fires, and this app wires ⛔ no `onlineManager`/NetInfo bridge. ⛔ Do ⛔ not describe this
// hook as "refreshing on reconnect" ([[feedback_negative_claims_checkable_in_repo]] — the claim was
// checked, not assumed).

/**
 * ⭐ The page size this surface asks for.
 *
 * ⚠ It is ⛔ NOT the bound. The server clamps through `clampLimit` against
 * `MEMBER_DRIVE_LIST_PAGE_SIZE_CAP` and the route schema caps it independently — asking for more
 * than the cap yields the cap, ⛔ never more. ⭐ This value is a REQUEST, and the two server-side
 * enforcements are what make it safe to be one.
 */
const PAGE_SIZE = 20

export function useMemberDriveListQuery() {
  return useQuery({
    queryKey: ['member', 'drive-list', PAGE_SIZE],
    queryFn: () => memberAuth.memberDriveList({ limit: PAGE_SIZE }),
  })
}
