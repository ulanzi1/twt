// The Trust's announcement channels — the "could not be opened" line the home card and the settings screen share (Story 5.14, code
// review G3-P1; fix-diff review FM-2; AC8, AC9; family 13 (d)). A bare `accessibilityRole="alert"` is ⛔ reliably spoken on mount, so
// the failure is SPOKEN where it is SET — `onFailed`, once per failure, a REPEAT failure (the same words) included — through
// `announceForAccessibility` on both platforms (the 6.36f `sayMarksNotice` shape, `app/(life-events)/nominees.tsx`). ⛔ On mount: a line
// remounted when the card / screen reappears would re-announce a stale failure with no tap (FM-2). A plain `Text` — ⛔ a live region
// beside the announce call (TalkBack would speak it twice, and re-read it at a later press —
// [[project_android_live_region_reread_on_rerender]]).
// The line belongs to the read it failed on: it is shown only while `dataUpdatedAt` is the one the failure was recorded against, so a
// later successful read (new or corrected links, or the read recovering after the card / screen hid on `isError`) clears it.

import { useState } from 'react'
import { AccessibilityInfo } from 'react-native'

import { useT } from '@twt/i18n/react'
import { Text } from 'tamagui'

/** The failure state for one surface: `failed` while the read it happened on is still the one shown; `onFailed` records and SPEAKS it. */
export function useChannelLinkFailure(dataUpdatedAt: number): { failed: boolean; onFailed: () => void; clear: () => void } {
  const t = useT()
  const [failedAt, setFailedAt] = useState<number | null>(null)
  return {
    failed: failedAt !== null && failedAt === dataUpdatedAt,
    onFailed: () => {
      setFailedAt(dataUpdatedAt)
      AccessibilityInfo.announceForAccessibility(t('announcementChannels.link_error'))
    },
    clear: () => setFailedAt(null),
  }
}

export function ChannelLinkError(): React.ReactElement {
  const t = useT()
  return (
    <Text accessibilityRole="alert" fontFamily="$body" fontSize="$2" color="$colorPress" testID="announcement-link-error">
      {t('announcementChannels.link_error')}
    </Text>
  )
}
