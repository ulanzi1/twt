import { useInfiniteQuery } from '@tanstack/react-query'

import {
  MEMBER_DRIVE_LIST_PAGE_HORIZON,
  type MemberDriveListEntry,
  type MemberDriveListResponse,
} from '@twt/contracts'

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

/**
 * [Review][Patch] — code review of 11b-15-member-drive-list-fourth-tab (2026-09-09): this was a
 * single non-infinite query (`{ limit: PAGE_SIZE }`, no `page` argument) with a query key that never
 * varied by page — despite the contract, route and domain layer all being built around `page`+`limit`+
 * `total` (AC7), a Pariwar with more than one page of drives could never see the remainder. ⭐ The
 * fix follows this app's own `usePollsQuery` precedent (`components/polls/usePollQueries.ts`, itself
 * a code-review patch for the identical gap): `useInfiniteQuery` + the server's own `page`/`limit`/
 * `total` triple, with `flattenDriveList` giving callers the same flat `MemberDriveListEntry[]` shape
 * as before and `MemberDriveList.tsx` wiring `fetchNextPage`/`hasNextPage` to the list's
 * `onEndReached`.
 */
export function useMemberDriveListQuery() {
  return useInfiniteQuery({
    queryKey: ['member', 'drive-list', PAGE_SIZE],
    queryFn: ({ pageParam }) => memberAuth.memberDriveList({ page: pageParam, limit: PAGE_SIZE }),
    initialPageParam: 1,
    // ⭐ `page * limit < total` is the same "more rows exist past this window" test the public index's
    // `hasNext` uses (`apps/public/src/lib/sahyog-render.ts`) — the request's OWN `page`/`limit`,
    // never a locally-recomputed offset.
    //
    // [Review][Patch] — code review of 11b-15-member-drive-list-fourth-tab (2026-09-09), THIRD pass.
    // ⚠⛔ **TWO WAYS THAT TEST ALONE FAILED TO TERMINATE**, both ending in a banner the member could
    // ⛔ never dismiss:
    // ⚠⛔ (1) **THE CONTRACT'S PAGE HORIZON WAS INVISIBLE HERE.** `MemberDriveListQuery.page` is
    // `.max(MEMBER_DRIVE_LIST_PAGE_HORIZON)` (200). Past that the hook returned `page + 1` anyway,
    // the route 400s, `isError` goes true WITH `data` present ⇒ the inline banner renders,
    // `hasNextPage` is STILL true, and `handleInlineRetry` takes its `hasNextPage` branch and
    // re-requests the SAME rejected page forever. ⭐ The public sibling bounds this already
    // (`PUBLIC_PAGE_HORIZON`, used by `sahyog-render.ts`'s pagination builder); ⛔ nothing on the
    // member path did. ⇒ the horizon is now READ FROM THE CONTRACT, ⛔ never re-stated as a literal.
    // ⚠⛔ (2) **AN EMPTY PAGE NEVER TERMINATED.** `total` and `items` are read WITHOUT snapshot
    // pinning (this story's own disclosed READ COMMITTED gap, `deferred-work.md`), so a `total` that
    // exceeds what the list query can return left `hasNextPage` true and fetched EMPTY pages
    // indefinitely. ⇒ a page that came back with ⛔ no rows is the end of the list, whatever `total`
    // claims.
    getNextPageParam: (lastPage: MemberDriveListResponse) => {
      if (lastPage.items.length === 0) return undefined
      if (lastPage.page >= MEMBER_DRIVE_LIST_PAGE_HORIZON) return undefined
      return lastPage.page * lastPage.limit < lastPage.total ? lastPage.page + 1 : undefined
    },
  })
}

/**
 * Flattens every loaded page into one list, in fetch order — the shape every screen consumes.
 *
 * [Review][Patch] — code review of 11b-15-member-drive-list-fourth-tab (2026-09-09), THIRD pass.
 * ⚠⛔ **OFFSET PAGINATION OVER A MUTABLE SET RETURNS THE SAME ROW TWICE.** The order key puts
 * `driveClosedAt IS NULL` first, so a pool reaching `live` between two page fetches sorts to index 0
 * and shifts every row down one ⇒ `page=2`'s `offset 20` re-returns what was index 19, the same
 * `publicToken` lands in the flat list twice, and `keyExtractor` hands FlashList a DUPLICATE KEY
 * ("*Encountered two children with the same key*") plus recycling artefacts.
 * ⇒ ⭐ dedupe on `publicToken`, keeping the FIRST occurrence so the member's scroll position does not
 * jump under them.
 * ⚠⛔ **THIS DOES ⛔ NOT FIX THE SYMMETRIC CASE, AND ⛔ MUST NOT BE READ AS DOING SO:** a drive that
 * CLOSES between two fetches shifts rows the other way and a row is SKIPPED — silently never shown.
 * ⛔ No client-side dedupe can recover a row the server never sent. That remains the disclosed
 * cursor-rework gap in `deferred-work.md`; ⛔ do ⛔ not mark it closed on the strength of this.
 */
export function flattenDriveList(
  data: { pages: MemberDriveListResponse[] } | undefined,
): MemberDriveListEntry[] {
  const seen = new Set<string>()
  const rows: MemberDriveListEntry[] = []
  for (const page of data?.pages ?? []) {
    for (const item of page.items) {
      if (seen.has(item.publicToken)) continue
      seen.add(item.publicToken)
      rows.push(item)
    }
  }
  return rows
}
