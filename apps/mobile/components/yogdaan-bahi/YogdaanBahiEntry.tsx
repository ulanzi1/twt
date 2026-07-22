// <YogdaanBahiEntry> — the understated ≥44pt "View Yogdaan Bahi" affordance in the home stack (Story 8.6,
// Task 4 / D9). Replaces the P0-5 prototype's inline <YogdaanBahi/> mount: the passbook now lives on its
// OWN full-height screen (app/(contribution)/yogdaan) where the FlatList owns the scroll (AC4/D5), and
// this quiet entry navigates in. Always present (the passbook is the member's always-available record —
// UX §5 "Sushil's Profile → contribution history"); it does not self-suppress on an empty history (an
// empty passbook is a dignified first-run state, not an error).

import { useT } from '@twt/i18n/react'
import { useRouter } from 'expo-router'
import { Button } from 'tamagui'

const NS = { namespace: 'contribution' } as const

export function YogdaanBahiEntry() {
  const t = useT()
  const router = useRouter()

  return (
    <Button
      height={44}
      chromeless
      justify="flex-start"
      accessibilityRole="button"
      accessibilityLabel={t('yogdaan.entry_a11y', undefined, NS)}
      accessibilityHint={t('yogdaan.entry_hint', undefined, NS)}
      onPress={() => router.push('/(contribution)/yogdaan')}
    >
      {t('yogdaan.entry_cta', undefined, NS)}
    </Button>
  )
}
