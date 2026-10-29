// The Trust's announcement channels — the settings screen (Story 5.14, Task 7; AC9; `2026-10-29-417` FS9 (a), FS14). The same words
// as the home card: the title, the body that names only the channels with a link (I7), and one equal-weight join button each; a link
// that could not open says so inline (SPOKEN where the failure is set, once per failure, and cleared by a later successful read —
// `useChannelLinkFailure`, FM-2). No "Not now" here — the screen is the member's own
// choice to look. ⛔ A word about who can see a follower (FS14). A successful open here ALSO hides the home card (FS10: *"a successful
// open of either link hides the card for good"* — the same dismissal the card writes).
// ⚠ Code review (group 3) — while the first read is in flight a Spinner shows (the `telegram-notifications.tsx` sibling, G3-P5). While
// the channels are off (both links null), or the read FAILED (G3-P4 — a failed refetch keeps TanStack's old `data`, which may be a link
// since switched off), it shows the title ALONE and nothing to join — ⛔ an error / retry line: new member-facing words would reopen
// BigDev's copy review (`-417`; deferred, G3-W1).

import { ScrollView } from 'react-native'

import { useT } from '@twt/i18n/react'
import { Stack } from 'expo-router'
import { H2, Paragraph, Spinner, YStack } from 'tamagui'

import { ChannelLinkButtons } from '../../components/announcement-channels/ChannelLinkButtons'
import { ChannelLinkError, useChannelLinkFailure } from '../../components/announcement-channels/ChannelLinkError'
import { announcementBodyKey, useAnnouncementChannelsQuery } from '../../components/announcement-channels/useAnnouncementChannelsQuery'
import { dismissAnnouncementCard } from '../../lib/announcement-channels-dismissal'
import { useSession } from '../../lib/session-context'

export default function AnnouncementChannelsScreen(): React.ReactElement {
  const t = useT()
  const { session } = useSession()
  const q = useAnnouncementChannelsQuery()
  const failure = useChannelLinkFailure(q.dataUpdatedAt)
  const links = q.isError ? undefined : q.data
  const bodyKey = announcementBodyKey(links)
  const opened = () => {
    failure.clear()
    if (session?.memberId !== undefined) dismissAnnouncementCard(session.memberId)
  }
  return (
    <ScrollView>
      <Stack.Screen options={{ title: t('announcementChannels.screen_title') }} />
      <YStack gap="$3" px="$6" py="$5">
        <H2 accessibilityRole="header">{t('announcementChannels.card_title')}</H2>
        {q.isLoading ? (
          <Spinner testID="announcement-channels-loading" />
        ) : bodyKey !== null && links ? (
          <>
            <Paragraph>{t(bodyKey)}</Paragraph>
            <ChannelLinkButtons links={links} onOpened={opened} onFailed={failure.onFailed} />
            {failure.failed ? <ChannelLinkError /> : null}
          </>
        ) : null}
      </YStack>
    </ScrollView>
  )
}
