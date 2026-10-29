// The Trust's announcement channels — the ONE calm ask on home (Story 5.14, Task 7; AC8; `2026-10-29-417` FS9–FS11, FS14; I7).
//
// Mounted directly AFTER `<HomePromptCards />` (its own query — ⛔ a `HomeCardKind` in `chooseHomeCard`, where it would compete with
// the known-people prompts and might never show — FS11 (a); two reminder cards can show at once, bounded: this one shows once, T7).
// It renders NOTHING while loading, on error, when both links are null (the channels are off, or none is set — I1), or once dismissed
// on this phone for this account. It names only the channels that have a link (the body variant), one equal-weight button each, and
// "Not now". "Not now" hides it at once and for good (FS10 (a) — a sign-out, a reinstall or a new phone shows it once more, its
// accepted cost); a join button (here or on the settings screen) hides it only after the link OPENED; a link that could not open says
// so inline and keeps the card. ⛔ "must", ⛔ "required", ⛔ a consequence of not joining (G9); ⛔ a word about who can
// see a follower (FS14). In the app only.
// ⚠ Code review (group 3): "on error" holds a held link too — a FAILED refetch keeps TanStack's old `data`, so the card gates on
// `isError` as well (G3-P4). A dismissal is also kept in component state, so the card goes at once even when the MMKV write throws
// (G3-P7), and the store is re-read on focus, so an open from the settings screen hides a card that stayed mounted beneath it (FM-1 —
// `useAnnouncementCardDismissal`). `link_error` is SPOKEN where the failure is set, once per failure, and belongs to the read it
// failed on (G3-P1, FM-2 — `useChannelLinkFailure`).

import { useT } from '@twt/i18n/react'

import { useSession } from '../../lib/session-context'
import { ChannelLinkButtons } from '../announcement-channels/ChannelLinkButtons'
import { ChannelLinkError, useChannelLinkFailure } from '../announcement-channels/ChannelLinkError'
import { useAnnouncementCardDismissal } from '../announcement-channels/useAnnouncementCardDismissal'
import { announcementBodyKey, useAnnouncementChannelsQuery } from '../announcement-channels/useAnnouncementChannelsQuery'
import { HomeReminderCard } from './HomeReminderCard'

export function AnnouncementChannelsCard(): React.ReactElement | null {
  const t = useT()
  const { session } = useSession()
  const q = useAnnouncementChannelsQuery()
  const memberId = session?.memberId
  const { dismissed, dismiss } = useAnnouncementCardDismissal(memberId)
  const failure = useChannelLinkFailure(q.dataUpdatedAt)
  if (memberId === undefined || q.isError || q.data === undefined) return null
  const bodyKey = announcementBodyKey(q.data)
  if (bodyKey === null || dismissed) return null
  return (
    <HomeReminderCard title={t('announcementChannels.card_title')} body={t(bodyKey)} dismissLabel={t('announcementChannels.not_now')} onDismiss={dismiss}>
      <ChannelLinkButtons links={q.data} onOpened={dismiss} onFailed={failure.onFailed} />
      {failure.failed ? <ChannelLinkError /> : null}
    </HomeReminderCard>
  )
}
