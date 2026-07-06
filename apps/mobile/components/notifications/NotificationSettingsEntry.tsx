// Understated entry point into the notification settings (WhatsApp opt-in) screen (Story 5.4, Task 6).
//
// Placed near the other bottom-of-home entries (DataExportEntry / WithdrawalEntry) — the app has no
// dedicated profile/settings screen yet. Low-prominence + chromeless: opting in is a member choice, framed
// neutrally, never nagged. The explanatory copy lives on the screen it navigates to.

import { useT } from '@twt/i18n/react'
import { useRouter } from 'expo-router'
import { Button, YStack } from 'tamagui'

export function NotificationSettingsEntry() {
  const t = useT()
  const router = useRouter()
  return (
    <YStack px="$6" py="$3">
      <Button
        chromeless
        height={40}
        justify="flex-start"
        opacity={0.6}
        accessibilityRole="button"
        accessibilityLabel={t('waNotifications.entry_label')}
        accessibilityHint={t('waNotifications.entry_hint')}
        onPress={() => router.push('/(settings)/notifications')}
      >
        {t('waNotifications.entry_label')}
      </Button>
    </YStack>
  )
}

/** Sibling understated entry into the Telegram opt-in screen (Story 5.5, Task 10). Same low-prominence framing. */
export function TelegramNotificationSettingsEntry() {
  const t = useT()
  const router = useRouter()
  return (
    <YStack px="$6" py="$3">
      <Button
        chromeless
        height={40}
        justify="flex-start"
        opacity={0.6}
        accessibilityRole="button"
        accessibilityLabel={t('telegramNotifications.entry_label')}
        accessibilityHint={t('telegramNotifications.entry_hint')}
        onPress={() => router.push('/(settings)/telegram-notifications')}
      >
        {t('telegramNotifications.entry_label')}
      </Button>
    </YStack>
  )
}
