// Home-tab entry point into the member-facing `<MemberStatusPanel>` (Story 4.7, Task 6; D6-A). A calm,
// always-available link (a member can check their standing at any lifecycle stage — no self-suppression)
// that navigates to the Membership Status surface. Understated register (chromeless), bilingual (Hindi-
// first via @twt/i18n), accessible.

import { useT } from '@twt/i18n/react'
import { useRouter } from 'expo-router'
import { Button, YStack } from 'tamagui'

export function MembershipStatusEntry() {
  const t = useT()
  const router = useRouter()
  return (
    <YStack px="$6" py="$3">
      <Button
        chromeless
        height={48}
        justify="flex-start"
        accessibilityRole="button"
        accessibilityLabel={t('memberStatus.entryLabel')}
        accessibilityHint={t('memberStatus.entryHint')}
        onPress={() => router.push('/(membership)')}
      >
        {t('memberStatus.entryLabel')}
      </Button>
    </YStack>
  )
}
