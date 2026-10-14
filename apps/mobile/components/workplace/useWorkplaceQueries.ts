// The workplace reads (Story 6.36a, Task 5; AC3, AC3b) — TanStack Query hooks over the member-auth SDK.
//
// · Every key is namespaced by `pariwarId` AND `memberId` (⛔ a cache shared across the accounts a phone has held — the
//   repo-wide persisted-cache item), and every hook is `enabled` only once the session has loaded. ⚠ A DISABLED v5 query
//   has `isLoading === false` and `data === undefined` — a screen branches its loading state on `isPending` (true until
//   data exists), ⛔ on `isLoading`, or a cold start renders the ERROR branch while the session hydrates.
// · The SEARCH results and the HISTORY are `gcTime: 0` — the Provider's dehydrate filter reads that as *"⛔ never persist
//   this to MMKV"* (`components/Provider.tsx`): the search is transient, and the history carries the member's own typed
//   workplace name. The district list (non-PII, per Pariwar) persists as usual.
// · The search is DEBOUNCED by the caller and CANCELLED when superseded: TanStack aborts the previous key's `signal`,
//   which the SDK hands to `fetch`.

import { useInfiniteQuery, useQuery } from '@tanstack/react-query'
import type { WorkplaceKindWire } from '@twt/contracts'

import { memberAuth } from '../../lib/member-api'
import { useSession } from '../../lib/session-context'

/** ⛔ Persisted to MMKV (the Provider's `gcTime: 0` marker). */
const TRANSIENT = { gcTime: 0, staleTime: 0 } as const

export const workplaceKeys = {
  all: ['workplace'] as const,
  districts: (pariwarId: string | undefined, memberId: string | undefined) => ['workplace', pariwarId, memberId, 'districts'] as const,
  search: (pariwarId: string | undefined, memberId: string | undefined, district: string | null, kind: WorkplaceKindWire | null, q: string) =>
    ['workplace', pariwarId, memberId, 'search', district, kind, q] as const,
  history: (pariwarId: string | undefined, memberId: string | undefined) => ['workplace', pariwarId, memberId, 'history'] as const,
}

/** The Pariwar's LISTED districts + whether it has a list at all (`hasList: false` ⇒ the free-text box — SW7). */
export function useWorkplaceDistrictsQuery() {
  const { session } = useSession()
  return useQuery({
    queryKey: workplaceKeys.districts(session?.pariwarId, session?.memberId),
    queryFn: () => memberAuth.workplaceDistricts(),
    enabled: Boolean(session?.pariwarId),
    staleTime: 10 * 60 * 1000,
  })
}

/** One district's listed schools or offices, searched SERVER-side, page by page (SW4). */
export function useWorkplaceSearchQuery(district: string | null, kind: WorkplaceKindWire | null, q: string) {
  const { session } = useSession()
  return useInfiniteQuery({
    queryKey: workplaceKeys.search(session?.pariwarId, session?.memberId, district, kind, q),
    queryFn: ({ pageParam, signal }) =>
      memberAuth.workplaceSearch(
        { district: district!, kind: kind!, q, ...(pageParam !== undefined ? { cursor: pageParam } : {}) },
        { signal },
      ),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
    enabled: Boolean(session?.pariwarId) && district !== null && kind !== null,
    ...TRANSIENT,
  })
}

/**
 * The member's OWN posting history, newest first, page by page (AC3b; review 2026-10-15 — ⛔ only the first page).
 * ⛔ Persisted (it carries the member's typed text). An invalidation (a save) refetches from the FIRST page, so the new
 * row is at the top (AC6).
 */
export function usePostingHistoryQuery() {
  const { session } = useSession()
  return useInfiniteQuery({
    queryKey: workplaceKeys.history(session?.pariwarId, session?.memberId),
    queryFn: ({ pageParam }) => memberAuth.postingHistory(pageParam !== undefined ? { cursor: pageParam } : undefined),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
    enabled: Boolean(session?.pariwarId),
    ...TRANSIENT,
  })
}
