// Story 5.14 (Task 7; AC8; `2026-10-29-417` FS10 (a)) — the announcement card's dismissal: ONCE per device per member, ⛔ expiry, its
// own module (⛔ the 6.36c store, which prunes after 30 days), cleared on sign-out. The query's key and cache policy (FS11 (a), `-418`
// item 10) and its account-change clear are pinned here too; the SessionProvider's own `signOut` is EXECUTED in
// `announcement-channels-signout.test.ts` (G3-P9), the foreground / focus refetch in `announcement-channels-refetch.test.ts` (G3-P2).
import { QueryClient } from '@tanstack/react-query'
import { describe, expect, it, vi } from 'vitest'

vi.mock('../../lib/mmkv', () => ({ mmkvStorage: { getItem: () => null, setItem: () => undefined, removeItem: () => undefined } }))
vi.mock('../../lib/member-api', () => ({ memberAuth: {} }))
vi.mock('../../lib/session-context', () => ({ useSession: () => ({ session: null }) }))
vi.mock('react-native', () => ({ AppState: { addEventListener: () => ({ remove: () => undefined }) } }))
vi.mock('expo-router', () => ({ useFocusEffect: () => undefined }))

import {
  ANNOUNCEMENT_CHANNELS_CACHE_OPTIONS,
  announcementBodyKey,
  announcementChannelsKey,
  clearAnnouncementChannelsCache,
} from '../../components/announcement-channels/useAnnouncementChannelsQuery'
import {
  announcementCardDismissedKey,
  clearAnnouncementCardDismissal,
  dismissAnnouncementCard,
  isAnnouncementCardDismissed,
  type SyncStorage,
} from '../../lib/announcement-channels-dismissal'

function memory(): SyncStorage & { map: Map<string, string> } {
  const map = new Map<string, string>()
  return { map, getItem: (k) => map.get(k) ?? null, setItem: (k, v) => void map.set(k, v), removeItem: (k) => void map.delete(k) }
}

describe('the announcement card dismissal (FS10 (a))', () => {
  it('is per account, under its own versioned key, and has ⛔ expiry (a dismissal from years ago still holds)', () => {
    const s = memory()
    expect(isAnnouncementCardDismissed('m-1', s)).toBe(false)
    dismissAnnouncementCard('m-1', new Date('2020-01-01T00:00:00.000Z'), s)
    expect([...s.map.keys()]).toEqual(['announcement-channels.card-dismissed.v1.m-1'])
    expect(announcementCardDismissedKey('m-1')).toBe('announcement-channels.card-dismissed.v1.m-1')
    expect(isAnnouncementCardDismissed('m-1', s)).toBe(true)
    expect(isAnnouncementCardDismissed('m-2', s)).toBe(false)
  })

  it('is cleared on sign-out for that account only; `undefined` is a no-op; a throwing store fails soft', () => {
    const s = memory()
    dismissAnnouncementCard('m-1', new Date(), s)
    dismissAnnouncementCard('m-2', new Date(), s)
    clearAnnouncementCardDismissal(undefined, s)
    expect(s.map.size).toBe(2)
    clearAnnouncementCardDismissal('m-1', s)
    expect(isAnnouncementCardDismissed('m-1', s)).toBe(false)
    expect(isAnnouncementCardDismissed('m-2', s)).toBe(true)
    const broken: SyncStorage = { getItem: () => { throw new Error('x') }, setItem: () => { throw new Error('x') }, removeItem: () => { throw new Error('x') } }
    expect(isAnnouncementCardDismissed('m-1', broken)).toBe(false)
    expect(() => dismissAnnouncementCard('m-1', new Date(), broken)).not.toThrow()
    expect(() => clearAnnouncementCardDismissal('m-1', broken)).not.toThrow()
  })
})

describe('the member read\'s key and cache policy (FS11 (a), `-418` item 10)', () => {
  it('⭐ `{ gcTime: 0, staleTime: 0 }` — ⛔ persisted to MMKV, refetched at each mount (and on foreground / focus — `-419` item 5)', () => {
    expect(ANNOUNCEMENT_CHANNELS_CACHE_OPTIONS).toEqual({ gcTime: 0, staleTime: 0 })
  })

  it('⭐ keyed per (Pariwar, member) and cleared on an account change — the next account\'s first render has no cached links', () => {
    expect(announcementChannelsKey('p', 'm-1')).toEqual(['announcement-channels', 'v1', 'p', 'm-1'])
    expect(announcementChannelsKey('p', 'm-1')).not.toEqual(announcementChannelsKey('p', 'm-2'))
    const client = new QueryClient()
    client.setQueryData(announcementChannelsKey('p', 'm-1'), { whatsappChannelUrl: 'https://whatsapp.com/channel/x', telegramChannelUrl: null })
    clearAnnouncementChannelsCache(client)
    expect(client.getQueryData(announcementChannelsKey('p', 'm-1'))).toBeUndefined()
    expect(client.getQueryCache().findAll({ queryKey: ['announcement-channels'] })).toHaveLength(0)
  })

  it('the body variant follows the links (I7)', () => {
    expect(announcementBodyKey(undefined)).toBeNull()
    expect(announcementBodyKey({ whatsappChannelUrl: null, telegramChannelUrl: null })).toBeNull()
    expect(announcementBodyKey({ whatsappChannelUrl: 'a', telegramChannelUrl: 'b' })).toBe('announcementChannels.body_both')
    expect(announcementBodyKey({ whatsappChannelUrl: 'a', telegramChannelUrl: null })).toBe('announcementChannels.body_whatsapp')
    expect(announcementBodyKey({ whatsappChannelUrl: null, telegramChannelUrl: 'b' })).toBe('announcementChannels.body_telegram')
  })
})
