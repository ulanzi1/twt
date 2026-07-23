// Contribution Note placeholder route (Story 8.6, AC3/D4 — the reserved seam Story 8.7 fills). The
// Yogdaan Bahi's Note-link affordance (`YogdaanBahiRow`) always navigates here today; the real
// `Yogdaan Pratigya` PDF (watermark, `clause_version_id`, legal-reviewed copy) is Story 8.7's — this
// screen only holds the route so AC3's "resolves to the reserved Note route/placeholder" is literally
// true pre-8.7. 8.7 replaces this screen's body with the real Note; the route path is unchanged.

import { useT } from '@twt/i18n/react'
import { Stack } from 'expo-router'
import { Text, YStack } from 'tamagui'

const NS = { namespace: 'contribution' } as const

export default function ContributionNoteScreen() {
  const t = useT()

  return (
    <>
      <Stack.Screen options={{ title: t('yogdaan.note.link', undefined, NS) }} />
      <YStack flex={1} items="center" justify="center" px="$5" gap="$2" bg="$background">
        <Text
          fontFamily="$body"
          fontSize="$4"
          color="$colorPress"
          text="center"
          accessibilityRole="text"
          accessibilityLabel={t('yogdaan.note.unavailable_a11y', undefined, NS)}
        >
          {t('yogdaan.note.unavailable_a11y', undefined, NS)}
        </Text>
      </YStack>
    </>
  )
}
