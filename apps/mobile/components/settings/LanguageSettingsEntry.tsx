// Understated entry point into the app-language screen (Story 6.35, Task 4.3; AC7; LS6 (a), LS7; Decision 2026-10-23-387).
//
// Mounted on the home tab directly above `NotificationSettingsEntry` (the app has no profile/settings screen yet — F4),
// the same low-prominence chromeless button. Its label is the bilingual "भाषा / Language" in BOTH catalogs, so a reader of
// either language can find it (LS7 — a recorded departure from UX `:554`, argued under `:1126`). ⛔ `accessibilityHint` by
// choice: the bilingual label is self-describing (AC10).

import { useT } from '@twt/i18n/react'
import { useRouter } from 'expo-router'
import { Button, YStack } from 'tamagui'

export function LanguageSettingsEntry() {
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
        accessibilityLabel={t('language.entry')}
        onPress={() => router.push('/(settings)/language')}
        testID="language-settings-entry"
      >
        {t('language.entry')}
      </Button>
    </YStack>
  )
}
