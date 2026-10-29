// The Trust's announcement channels — the member read, its query key and cache policy (Story 5.14, Task 7; `2026-10-29-417` FS11 (a),
// FS12 (a); `-418` item 10; `-419` item 5).
//
// ⭐ Keyed by (pariwarId, memberId) — the `known-people-cache.ts` shape — and CLEARED on sign-out / an account change (session-context),
// so one account's links are ⛔ shown to the next on a shared phone. ⭐ `{ gcTime: 0, staleTime: 0 }` (`KNOWN_PEOPLE_CACHE_OPTIONS`): the
// provider's dehydration filter keeps a `gcTime: 0` query OUT of the 7-day MMKV cache. Bounded (`withTimeout` — the transport has ⛔
// timeout of its own).
// ⭐ `-419` item 5 (code review G3-P2) — the home tab mounts ONCE per app process and the app's query client ⛔ refetches on focus or
// reconnect, so a mount-only read left a switched-off or corrected link on screen for days. Each consumer ALSO refetches when the app
// returns to the foreground (AppState `active`) and when its screen gains focus (`useFocusEffect`). Local to this read — ⛔ a global
// `focusManager` bridge (that would change every query in the app). `cancelRefetch: false` — the card and the entry share one home
// screen, so the second call JOINS the first's fetch (⛔ cancels it); a disabled read (no session) is ⛔ refetched (v5's `refetch`
// ignores `enabled`).

import { useCallback, useEffect } from 'react'
import { AppState } from 'react-native'

import type { QueryClient } from '@tanstack/react-query'
import { useQuery } from '@tanstack/react-query'
import type { AnnouncementChannelsMemberResponse } from '@twt/contracts'
import { useFocusEffect } from 'expo-router'

import { memberAuth } from '../../lib/member-api'
import { useSession } from '../../lib/session-context'
import { CALL_TIMEOUT_MS, withTimeout } from '../../lib/with-timeout'

export const announcementChannelsKey = (pariwarId: string | undefined, memberId: string | undefined) =>
  ['announcement-channels', 'v1', pariwarId, memberId] as const

/** `-418` item 10 — ⛔ persisted, refetched at each mount (and, `-419` item 5, on foreground and focus — the hook below). */
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
  const enabled = pariwarId !== undefined && memberId !== undefined
  const q = useQuery<AnnouncementChannelsMemberResponse>({
    ...ANNOUNCEMENT_CHANNELS_CACHE_OPTIONS,
    queryKey: announcementChannelsKey(pariwarId, memberId),
    queryFn: () => withTimeout(memberAuth.getAnnouncementChannels(), CALL_TIMEOUT_MS),
    enabled,
    retry: 1,
  })
  const { refetch } = q
  const reread = useCallback(() => {
    if (enabled) void refetch({ cancelRefetch: false })
  }, [enabled, refetch])
  useFocusEffect(reread)
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') reread()
    })
    return () => sub.remove()
  }, [reread])
  return q
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
