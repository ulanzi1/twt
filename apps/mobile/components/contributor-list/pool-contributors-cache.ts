// The contributor-list CACHE controls — Story 11b.21 (Task 6; `#decision-2026-09-19-224` D6).
//
// ⭐ WHY THIS EXISTS: since Story 11b.21 the `pool-contributors` payload carries colleagues' FULL legal
// names (mode-resolved, `-189` cl.3), and `2026-09-01-172` recorded that an erased contributor's name could
// render offline from MMKV for up to 7 days (`CR-11b.2a-COMBINED-W3`). D6 is the per-query remedy `-172`
// cl.3 named, applied to THIS surface only:
//   1. a NEW query key, so an old-shape `{ firstName, lastInitial }` payload is never hydrated into the new
//      component;
//   2. `gcTime: 0` on the hook, which `components/Provider.tsx`'s `shouldDehydrateQuery` reads as
//      *"⛔ never persist this"* — the two are ONE control in two files;
//   3. a ONE-TIME removal, after the persisted cache is restored, of the RETIRED key. ⚠ A new key only
//      HIDES the old entry: the persister rewrites the whole client on every save and the default `gcTime`
//      is 7 days, so on an active device the old entry is re-hydrated and re-persisted forever.
// ⛔ Not the repo-wide fix (member-scoped keys + purge on sign-out); that stays open. ⛔ No persister
// `buster` — it would drop every member's whole cache for one surface.
//
// Pure and RN-free, so the pure-Vitest mobile harness can call it with a real `QueryClient`.

import type { QueryClient } from '@tanstack/react-query'

/** The CURRENT key — the `{ name: string | null }` payload (Story 11b.21). */
export const POOL_CONTRIBUTORS_QUERY_KEY = ['member', 'pool-contributors', 'v2'] as const

/** The RETIRED key — the `{ firstName, lastInitial }` payload, persisted by every build before 11b.21. */
export const RETIRED_POOL_CONTRIBUTORS_QUERY_KEY = ['member', 'pool-contributors'] as const

/**
 * Remove the retired contributor-list entry from the (restored) cache. ⚠ `exact: true` — a prefix match
 * would also remove the CURRENT key, which starts with the same two segments.
 */
export function removeRetiredPoolContributorsCache(client: QueryClient): void {
  client.removeQueries({ queryKey: RETIRED_POOL_CONTRIBUTORS_QUERY_KEY, exact: true })
}
