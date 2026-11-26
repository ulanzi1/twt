// "We could not confirm your identity yet" — the member read, its key, cache policy and re-read (Story 3.13a, Task 3; DL3, DL6;
// N6; `2026-11-26-509`, built on `-508`).
//
// ⭐ Mirrors Story 5.14's `useAnnouncementChannelsQuery` (⛔ a second mechanism, ⛔ a global `focusManager` bridge):
//   · keyed by (pariwarId, memberId) and CLEARED on an account change (session-context, the four paths — each right after
//     `clearAnnouncementChannelsCache`);
//   · `{ gcTime: 0, staleTime: 0 }` — the provider's dehydration filter keeps a `gcTime: 0` query OUT of the 7-day MMKV cache:
//     the reason is personal data and must not sit on the phone, and a cached "not confirmed" must not outlive a confirmation;
//   · bounded by `withTimeout` (the transport has ⛔ timeout of its own — a HUNG re-read keeps `status: 'success'` and would keep
//     a stale card up for ever);
//   · re-read when the home tab gains focus (`useFocusEffect`) AND when the app returns to the foreground (`AppState` `active`):
//     the home tab mounts ONCE per app process and the app's query client ⛔ refetches on focus or reconnect.
// ⭐ The render rule lives in `identityCheckNoticeReason` below: the card shows ONLY on a SUCCESSFUL read carrying a notice ⇒ a
// FAILED re-read hides it (TanStack keeps the old data and sets `status: 'error'`). The OPPOSITE of the known-people rule
// (`requestEntryVisible`: only the denial hides it) — chosen because here a stale card is the worse error; its cost is a card that
// flickers off on a network blip and back on the next good read (DL6, as answered).

import { useCallback, useEffect } from 'react'
import { AppState } from 'react-native'

import type { QueryClient } from '@tanstack/react-query'
import { useQuery } from '@tanstack/react-query'
import type { IdentityCheckNotConfirmedReason, MemberIdentityCheckNoticeResponse } from '@twt/contracts'
import { useFocusEffect } from 'expo-router'

import { memberAuth } from '../../lib/member-api'
import { useSession } from '../../lib/session-context'
import { CALL_TIMEOUT_MS, withTimeout } from '../../lib/with-timeout'

export const identityCheckNoticeKey = (pariwarId: string | undefined, memberId: string | undefined) =>
  ['identity-check-notice', 'v1', pariwarId, memberId] as const

/** ⛔ persisted (the F7 marker), re-read at each mount, on home-tab focus and on foreground. */
export const IDENTITY_CHECK_NOTICE_CACHE_OPTIONS = { gcTime: 0, staleTime: 0 } as const

/** Remove every identity-check-notice query (an account change). */
export function clearIdentityCheckNoticeCache(client: QueryClient): void {
  client.removeQueries({ queryKey: ['identity-check-notice'] })
}

/** ⭐ DL6's render rule: the reason to show, or `null` — a notice ONLY from a SUCCESSFUL read (⛔ `data` alone). */
export function identityCheckNoticeReason(q: {
  readonly isSuccess: boolean
  readonly data: MemberIdentityCheckNoticeResponse | undefined
}): IdentityCheckNotConfirmedReason | null {
  if (!q.isSuccess || q.data === undefined || q.data.notice === null) return null
  return q.data.notice.reason
}

/** The member's notice — `{ notice: null }` unless staff could ⛔ confirm them and they still await a check. */
export function useIdentityCheckNoticeQuery() {
  const { session } = useSession()
  const pariwarId = session?.pariwarId
  const memberId = session?.memberId
  const enabled = pariwarId !== undefined && memberId !== undefined
  const q = useQuery<MemberIdentityCheckNoticeResponse>({
    ...IDENTITY_CHECK_NOTICE_CACHE_OPTIONS,
    queryKey: identityCheckNoticeKey(pariwarId, memberId),
    queryFn: () => withTimeout(memberAuth.memberIdentityCheckNotice(), CALL_TIMEOUT_MS),
    enabled,
    // ⛔ a `retry` here: the app client's default (`retry: 1`, `lib/query-client.ts`) applies, and a test's `retry: false` can.
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
