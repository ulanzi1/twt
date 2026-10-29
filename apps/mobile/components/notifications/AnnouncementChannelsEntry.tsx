// The Trust's announcement channels — the understated settings entry (Story 5.14, Task 7; AC9; `2026-10-29-417` FS9 (a)).
//
// Directly after the Telegram opt-in entry on home, shown ONLY while at least one link is returned (the channels on, a link set — I7);
// it stays whatever the home card's dismissal (FS10 (a)). Chromeless, low-prominence — the `NotificationSettingsEntry` style: following
// a channel is a member choice, framed neutrally, never nagged. It opens the screen with the same words.

import { useT } from '@twt/i18n/react'
import { useRouter } from 'expo-router'
import { Button, YStack } from 'tamagui'

import { announcementBodyKey, useAnnouncementChannelsQuery } from '../announcement-channels/useAnnouncementChannelsQuery'

export function AnnouncementChannelsEntry(): React.ReactElement | null {
  const t = useT()
  const router = useRouter()
  const q = useAnnouncementChannelsQuery()
  if (announcementBodyKey(q.data) === null) return null
  return (
    <YStack px="$6" py="$3">
      <Button
        chromeless
        height={40}
        justify="flex-start"
        opacity={0.6}
        accessible={true}
        accessibilityRole="button"
        accessibilityLabel={t('announcementChannels.entry_label')}
        accessibilityHint={t('announcementChannels.entry_hint')}
        onPress={() => router.push('/(settings)/announcement-channels')}
      >
        {t('announcementChannels.entry_label')}
      </Button>
    </YStack>
  )
}
