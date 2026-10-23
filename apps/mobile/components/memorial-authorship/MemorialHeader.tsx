// Story 11b.4 (AC2) — the sticky header every memorial screen carries: an always-visible *"Save and come back"*
// (UX-DR50/56). The draft is ALREADY saved on every change (MA3), so this simply leaves — ⛔ "incomplete" language,
// ⛔ progress, ⛔ step counter.

import { useRouter } from 'expo-router'
import { Button, Paragraph, XStack } from 'tamagui'

import { useMemorialT } from '../../lib/memorial-i18n'

export function MemorialHeader({ showSaved = true }: { showSaved?: boolean }): React.ReactElement {
  const t = useMemorialT()
  const router = useRouter()
  return (
    <XStack px="$4" py="$2" gap="$3" items="center" justify="space-between" testID="memorial-header">
      {showSaved ? <Paragraph size="$2">{t('draft.saved_on_phone')}</Paragraph> : <XStack />}
      <Button
        chromeless
        size="$3"
        style={{ minHeight: 44 }}
        accessibilityRole="button"
        accessibilityLabel={t('header.save_and_come_back_a11y')}
        onPress={() => router.replace('/(tabs)')}
      >
        {t('header.save_and_come_back')}
      </Button>
    </XStack>
  )
}
