// SPOKEN state for the neighbours' screens (Story 6.27a second-pass review S28 / S29; checklist family 13 (d)). A bare
// `accessibilityRole="alert"` does ⛔ not reliably announce on mount (`app/(claim)/nominee-review.tsx`), and
// `accessibilityLiveRegion` is Android-only — so a LINE the story made reachable is spoken through the repo's ONE plan
// (`announcementPlan`, `lib/death-certificate-announce.ts`): the live region on Android, `announceForAccessibility` on
// iOS only (⛔ both, or TalkBack speaks it twice). A page / phase CHANGE has no live region, so it is announced on both.

import { useEffect, useRef } from 'react'
import { AccessibilityInfo, Platform } from 'react-native'
import { Text } from 'tamagui'

import { announcementPlan, type AnnouncementKind } from '../../lib/death-certificate-announce'

/** Speak a LINE's text (iOS only — on Android its own live region speaks it; both would speak it twice). */
function announceLine(text: string, kind: AnnouncementKind): void {
  if (announcementPlan(Platform.OS, kind).iosAnnounce) AccessibilityInfo.announceForAccessibility(text)
}

/**
 * Speak `text` whenever it CHANGES (and is non-empty) — a page or phase change, which fires ⛔ no navigation event and
 * has ⛔ no live region beside it. ⭐ Third-pass review U4: spoken on BOTH platforms (iOS-only left TalkBack silent on every
 * page, phase and "could not be opened" change); ⛔ double-speak, because nothing else announces it. ⚠ Focus is ⛔ moved.
 */
export function useAnnounceOnChange(text: string | null, opts: { readonly skipInitial?: boolean } = {}): void {
  const initial = useRef(opts.skipInitial === true)
  useEffect(() => {
    if (initial.current) {
      initial.current = false // the first render is read by the screen reader itself (fourth-pass review V9)
      return
    }
    if (text) AccessibilityInfo.announceForAccessibility(text)
  }, [text])
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
  useEffect(() => {
    if (text) announceLine(text, kind)
  }, [text, kind])
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
