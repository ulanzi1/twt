import type { DehydrateOptions, QueryClient } from '@tanstack/react-query'
import { persistQueryClientSave, type Persister } from '@tanstack/react-query-persist-client'

export const peerRequestListKey = (pariwarId: string | undefined, memberId: string | undefined) =>
  ['peer-requests', 'v2', pariwarId, memberId, 'list'] as const

export const peerRequestDetailKey = (pariwarId: string | undefined, memberId: string | undefined, pingId: string | null) =>
  ['peer-requests', 'v2', pariwarId, memberId, 'detail', pingId] as const

/** Story 6.27c (R14) — the texted link's code → its ping. In memory only (`gcTime: 0` below — ⛔ the code reaches the disk cache). */
export const peerRequestByLinkKey = (pariwarId: string | undefined, memberId: string | undefined, code: string | null) =>
  ['peer-requests', 'v2', pariwarId, memberId, 'by-link', code] as const

// Provider's dehydration filter treats gcTime:0 as an explicit no-persistence marker.
export const PEER_REQUEST_CACHE_OPTIONS = { gcTime: 0, staleTime: 0 } as const
export const PEER_REQUEST_MUTATION_OPTIONS = {
  mutationKey: ['peer-requests'], gcTime: 0, networkMode: 'always', meta: { persist: false },
} as const

// Keep the existing offline policy for other features, excluding sensitive peer mutation variables too.
export const PEER_REQUEST_DEHYDRATE_OPTIONS: DehydrateOptions = {
  shouldDehydrateQuery: query => query.state.status === 'success' && query.options.gcTime !== 0,
  shouldDehydrateMutation: mutation => mutation.state.isPaused && mutation.options.meta?.['persist'] !== false,
}

/** Remove legacy unscoped / persisted entries and any in-memory peer data on account changes. */
export function clearPeerRequestsCache(client: QueryClient): void {
  client.removeQueries({ queryKey: ['peer-requests'] })
  for (const mutation of client.getMutationCache().getAll()) {
    const variables = mutation.state.variables
    // Before v2 these saves had no mutation key. This was their unique input shape.
    const legacySave = variables !== null && typeof variables === 'object' &&
      'questionKey' in variables && 'value' in variables && 'idempotencyKey' in variables
    if (mutation.options.mutationKey?.[0] === 'peer-requests' || legacySave) client.getMutationCache().remove(mutation)
  }
}

/** Rewrite restored storage immediately, before subscriptions start. A removal from memory
 * alone leaves legacy plaintext on disk until some later query happens to trigger a save. */
export async function restorePeerRequestCache(client: QueryClient, persister: Persister): Promise<void> {
  clearPeerRequestsCache(client)
  await persistQueryClientSave({
    queryClient: client,
    persister,
    dehydrateOptions: PEER_REQUEST_DEHYDRATE_OPTIONS,
  })
}
