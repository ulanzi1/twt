// Home-tab entry point into the Life Events panel (Story 3.9, Task 8). A calm, always-available link
// (life changes can happen at any lifecycle stage — no self-suppression) that navigates to the panel
// index. Understated register (chromeless), bilingual, accessible.

import { useT } from '@twt/i18n/react'
import { useRouter } from 'expo-router'
import { Button, YStack } from 'tamagui'

export function LifeEventsEntry() {
  const t = useT()
  const router = useRouter()
  return (
    <YStack px="$6" py="$3">
      <Button
        chromeless
        height={48}
        justify="flex-start"
        accessibilityRole="button"
        accessibilityLabel={t('lifeEvents.title')}
        accessibilityHint={t('lifeEvents.intro')}
        onPress={() => router.push('/(life-events)')}
      >
        {t('lifeEvents.title')}
      </Button>
    </YStack>
  )
}
