// The Trust's announcement channels — the home card's dismissal as the card reads it (Story 5.14, code review G3-P7; fix-diff review
// FM-1; `2026-10-29-417` FS10 (a)). The store is `lib/announcement-channels-dismissal.ts` (MMKV); this hook adds the two things a
// render-time read misses:
// - G3-P7 — the dismissal is ALSO kept in component state (the account it was for), so "Not now" hides the card at once even when
//   the MMKV write throws.
// - FM-1 — the store is RE-READ each time the screen gains focus. The settings screen's successful open writes the same dismissal
//   while the home card stays MOUNTED beneath it, and the focus refetch that follows returns EQUAL data (structural sharing ⇒ ⛔
//   re-render), so without this the card kept asking after the member had opened a link.

import { useCallback, useState } from 'react'

import { useFocusEffect } from 'expo-router'

import { dismissAnnouncementCard, isAnnouncementCardDismissed } from '../../lib/announcement-channels-dismissal'

export function useAnnouncementCardDismissal(memberId: string | undefined): { dismissed: boolean; dismiss: () => void } {
  const [dismissedFor, setDismissedFor] = useState<string | null>(null)
  const [, setReads] = useState(0)
  useFocusEffect(
    useCallback(() => {
      setReads((n) => n + 1)
    }, []),
  )
  return {
    dismissed: memberId !== undefined && (dismissedFor === memberId || isAnnouncementCardDismissed(memberId)),
    dismiss: () => {
      if (memberId === undefined) return
      setDismissedFor(memberId)
      dismissAnnouncementCard(memberId)
    },
  }
}
