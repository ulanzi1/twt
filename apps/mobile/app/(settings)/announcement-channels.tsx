// The Trust's announcement channels — the settings screen (Story 5.14, Task 7; AC9; `2026-10-29-417` FS9 (a), FS14). The same words
// as the home card: the title, the body that names only the channels with a link (I7), and one equal-weight join button each; a link
// that could not open says so inline. No "Not now" here — the screen is the member's own choice to look. ⛔ A word about who can see a
// follower (FS14). While the channels are off (both links null) it says only what the app always says — every notice is in the app —
// by showing the title and nothing to join.

import { useState } from 'react'
import { ScrollView } from 'react-native'

import { useT } from '@twt/i18n/react'
import { Stack } from 'expo-router'
import { H2, Paragraph, Text, YStack } from 'tamagui'

import { ChannelLinkButtons } from '../../components/announcement-channels/ChannelLinkButtons'
import { announcementBodyKey, useAnnouncementChannelsQuery } from '../../components/announcement-channels/useAnnouncementChannelsQuery'

export default function AnnouncementChannelsScreen(): React.ReactElement {
  const t = useT()
  const q = useAnnouncementChannelsQuery()
  const [linkError, setLinkError] = useState(false)
  const bodyKey = announcementBodyKey(q.data)
  return (
    <ScrollView>
      <Stack.Screen options={{ title: t('announcementChannels.screen_title') }} />
      <YStack gap="$3" px="$6" py="$5">
        <H2 accessibilityRole="header">{t('announcementChannels.card_title')}</H2>
        {bodyKey !== null && q.data ? (
          <>
            <Paragraph>{t(bodyKey)}</Paragraph>
            <ChannelLinkButtons links={q.data} onOpened={() => setLinkError(false)} onFailed={() => setLinkError(true)} />
            {linkError ? (
              <Text accessibilityRole="alert" testID="announcement-link-error">
                {t('announcementChannels.link_error')}
              </Text>
            ) : null}
          </>
        ) : null}
      </YStack>
    </ScrollView>
  )
}
