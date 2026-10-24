// A nominee who is also a member — the query keys and cache policy (Story 6.36e, Task 5).
//
// Keys are namespaced by (pariwarId, memberId) under ['nominee-links', …]. ⭐ `gcTime: 0` on every query and mutation: the
// reads carry other members' REGISTERED names, and the provider's dehydration filter treats `gcTime: 0` as "⛔ persist to
// MMKV" (the 6.36b precedent, `known-people-cache.ts`). The matched contacts are ⛔ a query at all — the form session holds
// them in memory (`lib/nominee-links.ts`). Cleared with the other member caches on sign-in, sign-out and a terminated /
// rejected refresh.

import type { QueryClient } from '@tanstack/react-query'

import { clearNomineeLinkSession } from '../../lib/nominee-links'

/** The declarer's marks (Life Events). */
export const nomineeLinksKey = (pariwarId: string | undefined, memberId: string | undefined) =>
  ['nominee-links', 'v1', pariwarId, memberId, 'marks'] as const

/** The marks naming the member. */
export const nomineeLinkRequestsKey = (pariwarId: string | undefined, memberId: string | undefined) =>
  ['nominee-links', 'v1', pariwarId, memberId, 'requests'] as const

export const NOMINEE_LINKS_CACHE_OPTIONS = { gcTime: 0, staleTime: 0 } as const
export const NOMINEE_LINKS_MUTATION_OPTIONS = {
  mutationKey: ['nominee-links'],
  gcTime: 0,
  networkMode: 'always',
  meta: { persist: false },
} as const

/** Remove every nominee-links query and mutation (an account change) — and the form session's matched contacts and pick. */
export function clearNomineeLinksCache(client: QueryClient): void {
  clearNomineeLinkSession()
  client.removeQueries({ queryKey: ['nominee-links'] })
  for (const mutation of client.getMutationCache().getAll()) {
    if (mutation.options.mutationKey?.[0] === 'nominee-links') client.getMutationCache().remove(mutation)
  }
}
