// The Trust's announcement channels — the ONE calm ask on home (Story 5.14, Task 7; AC8; `2026-10-29-417` FS9–FS11, FS14; I7).
//
// Mounted directly AFTER `<HomePromptCards />` (its own query — ⛔ a `HomeCardKind` in `chooseHomeCard`, where it would compete with
// the known-people prompts and might never show — FS11 (a); two reminder cards can show at once, bounded: this one shows once, T7).
// It renders NOTHING while loading, on error, when both links are null (the channels are off, or none is set — I1), or once dismissed
// on this phone for this account. It names only the channels that have a link (the body variant), one equal-weight button each, and
// "Not now". "Not now" hides it at once and for good (FS10 (a)); a join button hides it only after the link OPENED; a link that could
// not open says so inline and keeps the card. ⛔ "must", ⛔ "required", ⛔ a consequence of not joining (G9); ⛔ a word about who can
// see a follower (FS14). In the app only.

import { useState } from 'react'

import { useT } from '@twt/i18n/react'
import { Text } from 'tamagui'

import { dismissAnnouncementCard, isAnnouncementCardDismissed } from '../../lib/announcement-channels-dismissal'
import { useSession } from '../../lib/session-context'
import { ChannelLinkButtons } from '../announcement-channels/ChannelLinkButtons'
import { announcementBodyKey, useAnnouncementChannelsQuery } from '../announcement-channels/useAnnouncementChannelsQuery'
import { HomeReminderCard } from './HomeReminderCard'

export function AnnouncementChannelsCard(): React.ReactElement | null {
  const t = useT()
  const { session } = useSession()
  const q = useAnnouncementChannelsQuery()
  // A dismissal lives in MMKV; bumping this re-reads it so the card goes at once.
  const [, setDismissals] = useState(0)
  const [linkError, setLinkError] = useState(false)
  const memberId = session?.memberId
  if (memberId === undefined || q.data === undefined) return null
  const bodyKey = announcementBodyKey(q.data)
  if (bodyKey === null || isAnnouncementCardDismissed(memberId)) return null
  const dismiss = () => {
    dismissAnnouncementCard(memberId)
    setDismissals((n) => n + 1)
  }
  return (
    <HomeReminderCard title={t('announcementChannels.card_title')} body={t(bodyKey)} dismissLabel={t('announcementChannels.not_now')} onDismiss={dismiss}>
      <ChannelLinkButtons links={q.data} onOpened={dismiss} onFailed={() => setLinkError(true)} />
      {linkError ? (
        <Text accessibilityRole="alert" fontFamily="$body" fontSize="$2" color="$colorPress" testID="announcement-link-error">
          {t('announcementChannels.link_error')}
        </Text>
      ) : null}
    </HomeReminderCard>
  )
}
