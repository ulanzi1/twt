// SPOKEN state for the neighbours' screens (Story 6.27a second-pass review S28 / S29; checklist family 13 (d)). A bare
// `accessibilityRole="alert"` does ⛔ not reliably announce on mount (`app/(claim)/nominee-review.tsx`), and
// `accessibilityLiveRegion` is Android-only — so a state the story made reachable is spoken through the repo's ONE plan
// (`announcementPlan`, `lib/death-certificate-announce.ts`): the live region on Android, `announceForAccessibility` on
// iOS only (⛔ both, or TalkBack speaks it twice).

import { useEffect } from 'react'
import { AccessibilityInfo, Platform } from 'react-native'
import { Text } from 'tamagui'

import { announcementPlan, type AnnouncementKind } from '../../lib/death-certificate-announce'

/** Speak `text` now (iOS only — Android speaks the live region). */
export function announce(text: string, kind: AnnouncementKind = 'status'): void {
  if (announcementPlan(Platform.OS, kind).iosAnnounce) AccessibilityInfo.announceForAccessibility(text)
}

/** Speak `text` whenever it CHANGES (and is non-empty) — a page or phase change, which fires ⛔ no navigation event. */
export function useAnnounceOnChange(text: string | null, kind: AnnouncementKind = 'status'): void {
  useEffect(() => {
    if (text) announce(text, kind)
  }, [text, kind])
}

/** A line that is SHOWN and SPOKEN: the live region on Android, the announce call on iOS. */
export function AnnouncedText({
  text,
  kind = 'status',
  color,
  fontSize = '$2',
}: {
  readonly text: string
  readonly kind?: AnnouncementKind
  readonly color?: string
  readonly fontSize?: string
}): React.ReactElement {
  useAnnounceOnChange(text, kind)
  return (
    <Text
      fontSize={fontSize as never}
      color={(color ?? (kind === 'error' ? '$red10' : '$colorPress')) as never}
      accessibilityRole={kind === 'error' ? 'alert' : 'text'}
      accessibilityLiveRegion={announcementPlan(Platform.OS, kind).liveRegion}
    >
      {text}
    </Text>
  )
}
