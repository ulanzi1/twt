// The Trust's announcement channels — the member read, its query key and cache policy (Story 5.14, Task 7; `2026-10-29-417` FS11 (a),
// FS12 (a); `-418` item 10).
//
// ⭐ Keyed by (pariwarId, memberId) — the `known-people-cache.ts` shape — and CLEARED on sign-out / an account change (session-context),
// so one account's links are ⛔ shown to the next on a shared phone. ⭐ `{ gcTime: 0, staleTime: 0 }` (`KNOWN_PEOPLE_CACHE_OPTIONS`): the
// provider's dehydration filter keeps a `gcTime: 0` query OUT of the 7-day MMKV cache, and it refetches at each home mount, so a
// switch-off hides the links at the next mount. Bounded (`withTimeout` — the transport has ⛔ timeout of its own).

import type { QueryClient } from '@tanstack/react-query'
import { useQuery } from '@tanstack/react-query'
import type { AnnouncementChannelsMemberResponse } from '@twt/contracts'

import { memberAuth } from '../../lib/member-api'
import { useSession } from '../../lib/session-context'
import { CALL_TIMEOUT_MS, withTimeout } from '../../lib/with-timeout'

export const announcementChannelsKey = (pariwarId: string | undefined, memberId: string | undefined) =>
  ['announcement-channels', 'v1', pariwarId, memberId] as const

/** `-418` item 10 — ⛔ persisted, refetched at each mount. */
export const ANNOUNCEMENT_CHANNELS_CACHE_OPTIONS = { gcTime: 0, staleTime: 0 } as const

/** Remove every announcement-channels query (an account change). */
export function clearAnnouncementChannelsCache(client: QueryClient): void {
  client.removeQueries({ queryKey: ['announcement-channels'] })
}

/** The links a member is shown — both null while the Pariwar's channels are off (I1). */
export function useAnnouncementChannelsQuery() {
  const { session } = useSession()
  const pariwarId = session?.pariwarId
  const memberId = session?.memberId
  return useQuery<AnnouncementChannelsMemberResponse>({
    ...ANNOUNCEMENT_CHANNELS_CACHE_OPTIONS,
    queryKey: announcementChannelsKey(pariwarId, memberId),
    queryFn: () => withTimeout(memberAuth.getAnnouncementChannels(), CALL_TIMEOUT_MS),
    enabled: pariwarId !== undefined && memberId !== undefined,
    retry: 1,
  })
}

/** Which body names the links that exist (I7 — ⛔ a channel without a link). `null` ⇒ no link: nothing is shown. */
export function announcementBodyKey(links: AnnouncementChannelsMemberResponse | undefined): string | null {
  if (!links) return null
  const wa = links.whatsappChannelUrl !== null
  const tg = links.telegramChannelUrl !== null
  if (wa && tg) return 'announcementChannels.body_both'
  if (wa) return 'announcementChannels.body_whatsapp'
  if (tg) return 'announcementChannels.body_telegram'
  return null
}
