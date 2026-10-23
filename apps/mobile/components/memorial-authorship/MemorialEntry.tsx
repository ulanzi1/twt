// Story 11b.4 (AC1) — the home entry into the family memorial. Driven by the NON-decrypting `entry` probe; shown ONLY when
// there is a drive to write about. ⛔ No badge, ⛔ no count, ⛔ no reminder (fursat). ⚠ `(tabs)/shradhanjali.tsx` is a live
// tab on P0-5 SAMPLE data and is ⛔ the entry.

import { useRouter } from 'expo-router'
import { Button, Paragraph, YStack } from 'tamagui'

import { useMemorialT } from '../../lib/memorial-i18n'
import { useSession } from '../../lib/session-context'
import { useMemorialEntryQuery } from './useMemorialQueries'

export function MemorialEntry(): React.ReactElement | null {
  const t = useMemorialT()
  const router = useRouter()
  const { session } = useSession()
  const entry = useMemorialEntryQuery(session !== null)
  if (!session || entry.data?.memorialEntry !== true) return null
  return (
    <YStack px="$4" py="$3" gap="$2">
      <Paragraph>{t('entry.body')}</Paragraph>
      <Button
        chromeless
        size="$4"
        style={{ minHeight: 44 }}
        accessibilityRole="button"
        accessibilityLabel={t('entry.a11y')}
        onPress={() => router.push('/(memorial)')}
      >
        {t('entry.title')}
      </Button>
    </YStack>
  )
}
