// People who know me — the query keys and cache policy (Story 6.36b, Task 4).
//
// Keys are namespaced by (pariwarId, memberId) under ['known-people', …]. ⭐ `gcTime: 0` on every query and mutation: the
// lists carry other members' REGISTERED names, and the provider's dehydration filter treats `gcTime: 0` as "⛔ persist to
// MMKV" (the peer-request precedent, `peer-request-cache.ts`). The contact list itself is ⛔ a query at all — the find
// screen holds it in memory. Cleared with the other member caches on sign-in, sign-out and a terminated / rejected refresh.

import type { QueryClient } from '@tanstack/react-query'

import { clearKnownPeopleNotices } from '../../lib/known-people-notice'

export const knownPeopleListKey = (pariwarId: string | undefined, memberId: string | undefined) =>
  ['known-people', 'v1', pariwarId, memberId, 'list'] as const

export const knownPeopleRequestsKey = (pariwarId: string | undefined, memberId: string | undefined) =>
  ['known-people', 'v1', pariwarId, memberId, 'requests'] as const

/** Story 6.36c — the home prompts (which reminder cards to show). Under ['known-people', …] so the account-change clear covers it. */
export const knownPeoplePromptsKey = (pariwarId: string | undefined, memberId: string | undefined) =>
  ['known-people', 'v1', pariwarId, memberId, 'prompts'] as const

/**
 * Refetch the home prompts of whichever account is signed in (a posting saved on the Workplace screen — Story 6.36c).
 * ⭐ The ONE path every caller uses for this (fix-review) — `WorkplaceSuggestionQuestion.tsx`, `WorkplacePicker.tsx`, and
 * `useKnownPeopleWrites`' own `refresh` all call THIS, instead of each re-deriving its own match.
 * Matches by rebuilding the EXACT key `knownPeoplePromptsKey` would produce for a query's own (pariwarId, memberId) —
 * ⛔ a hardcoded positional index (`queryKey[4] === 'prompts'`): if that builder's shape ever changes, this match
 * changes with it, from the ONE place that shape is written.
 */
export function invalidateKnownPeoplePrompts(client: QueryClient): Promise<void> {
  return client.invalidateQueries({
    predicate: (q) => {
      const [, , pariwarId, memberId] = q.queryKey as readonly unknown[]
      const expected = knownPeoplePromptsKey(pariwarId as string | undefined, memberId as string | undefined)
      return q.queryKey.length === expected.length && expected.every((segment, i) => q.queryKey[i] === segment)
    },
  })
}

export const KNOWN_PEOPLE_CACHE_OPTIONS = { gcTime: 0, staleTime: 0 } as const
export const KNOWN_PEOPLE_MUTATION_OPTIONS = {
  mutationKey: ['known-people'],
  gcTime: 0,
  networkMode: 'always',
  meta: { persist: false },
} as const

/** Remove every people-who-know-me query and mutation (an account change) — and any parked success notice (round 2, P2). */
export function clearKnownPeopleCache(client: QueryClient): void {
  clearKnownPeopleNotices()
  client.removeQueries({ queryKey: ['known-people'] })
  for (const mutation of client.getMutationCache().getAll()) {
    if (mutation.options.mutationKey?.[0] === 'known-people') client.getMutationCache().remove(mutation)
  }
}
