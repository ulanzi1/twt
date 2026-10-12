import { dehydrate, hydrate, QueryClient } from '@tanstack/react-query'
import { describe, expect, it } from 'vitest'
import { clearPeerRequestsCache, PEER_REQUEST_CACHE_OPTIONS, PEER_REQUEST_DEHYDRATE_OPTIONS, PEER_REQUEST_MUTATION_OPTIONS, peerRequestDetailKey, peerRequestListKey, restorePeerRequestCache } from '../../components/peer-request/peer-request-cache'

describe('peer request privacy and freshness (6.27a R1/R5)', () => {
  it('a second member in the same Pariwar must fetch their own list and detail', async () => {
    const client = new QueryClient({ defaultOptions: { queries: { staleTime: 3_600_000 } } })
    try {
      await client.fetchQuery({ queryKey: peerRequestListKey('p', 'a'), queryFn: async () => ({ items: ['a-ping'] }) })
      await client.fetchQuery({ queryKey: peerRequestDetailKey('p', 'a', 'a-ping'), queryFn: async () => ({ date: '2026-10-01' }) })
      expect(client.getQueryData(peerRequestListKey('p', 'b'))).toBeUndefined()
      expect(client.getQueryData(peerRequestDetailKey('p', 'b', 'a-ping'))).toBeUndefined()
      await expect(client.fetchQuery({ queryKey: peerRequestDetailKey('p', 'b', 'a-ping'), queryFn: async () => { throw { status: 404 } }, retry: false })).rejects.toMatchObject({ status: 404 })
    } finally { client.clear() }
  })
  it('both reads are excluded by the Provider dehydration filter, while unrelated offline data survives', async () => {
    const client = new QueryClient()
    try {
      for (const queryKey of [peerRequestListKey('p', 'a'), peerRequestDetailKey('p', 'a', 'ping')]) {
        await client.fetchQuery({ ...PEER_REQUEST_CACHE_OPTIONS, queryKey, queryFn: async () => ({ secret: 'decrypted-date' }) })
      }
      client.setQueryData(['offline-public-data'], { safe: true })
      const cache = dehydrate(client, PEER_REQUEST_DEHYDRATE_OPTIONS)
      expect(cache.queries.map(q => q.queryKey)).toEqual([['offline-public-data']])
      expect(JSON.stringify(cache)).not.toContain('decrypted-date')
    } finally { client.clear() }
  })
  it('restoration / sign-out removal drops legacy and current peer entries, preserving unrelated queries', () => {
    const client = new QueryClient(), old = new QueryClient()
    try {
      old.setQueryData(['peer-requests', 'detail', 'p', 'ping'], { secret: true })
      hydrate(client, dehydrate(old))
      client.setQueryData(peerRequestDetailKey('p', 'a', 'ping'), { secret: true })
      client.setQueryData(['unrelated'], true)
      clearPeerRequestsCache(client)
      expect(client.getQueryCache().findAll({ queryKey: ['peer-requests'] })).toHaveLength(0)
      expect(client.getQueryData(['unrelated'])).toBe(true)
    } finally { client.clear(); old.clear() }
  })
  it('peer detail is immediately stale and has no inactive retention', () => {
    expect(PEER_REQUEST_CACHE_OPTIONS).toEqual({ gcTime: 0, staleTime: 0 })
  })
  it('restoration rewrites legacy plaintext out of persisted storage without waiting for another query event', async () => {
    const client = new QueryClient()
    let disk = 'legacy-secret'
    try {
      client.setQueryData(['peer-requests', 'detail', 'p', 'ping'], { value: 'legacy-secret' })
      client.setQueryData(['unrelated-offline-data'], { safe: true })
      await restorePeerRequestCache(client, {
        persistClient: state => { disk = JSON.stringify(state) },
        restoreClient: () => undefined,
        removeClient: () => {},
      })
      expect(disk).not.toContain('legacy-secret')
      expect(disk).toContain('unrelated-offline-data')
    } finally { client.clear() }
  })
  it('paused peer mutations are excluded; restoration also removes legacy unkeyed autosave variables', async () => {
    const client = new QueryClient()
    try {
      const makePaused = (options: { mutationKey?: readonly string[]; meta?: Record<string, unknown> }) => {
        const mutation = client.getMutationCache().build(client, { ...options, mutationFn: async (variables: unknown) => variables })
        mutation.state = { ...mutation.state, isPaused: true, status: 'pending', variables: { questionKey: 'death_date', value: { date: 'secret-date' }, idempotencyKey: 'k' } }
        return mutation
      }
      const peer = makePaused(PEER_REQUEST_MUTATION_OPTIONS)
      makePaused({})
      const unrelated = client.getMutationCache().build(client, { mutationKey: ['unrelated'], mutationFn: async () => undefined })
      unrelated.state = { ...unrelated.state, isPaused: true, status: 'pending' }
      const before = dehydrate(client, PEER_REQUEST_DEHYDRATE_OPTIONS)
      expect(before.mutations).toHaveLength(2) // only the unknown legacy and unrelated mutations
      expect(before.mutations.some(m => m.mutationKey?.[0] === 'peer-requests')).toBe(false)
      clearPeerRequestsCache(client)
      expect(client.getMutationCache().getAll()).toEqual([unrelated])
      expect(client.getMutationCache().getAll()).not.toContain(peer)
      expect(JSON.stringify(dehydrate(client, PEER_REQUEST_DEHYDRATE_OPTIONS))).not.toContain('secret-date')
      expect(PEER_REQUEST_MUTATION_OPTIONS.networkMode).toBe('always')
    } finally { client.clear() }
  })
})
