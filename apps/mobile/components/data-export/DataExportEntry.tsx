// Understated entry point into the DPDPA data-export flow (Story 3.11, Task 7).
//
// Placed near WithdrawalEntry at the bottom of the home tab (the app has no dedicated profile/settings
// screen yet — deferred W4). Low-prominence + chromeless: data export is a member RIGHT, framed
// neutrally — never a CTA, no urgency. The explanatory copy lives on the screen it navigates to.

import { useT } from '@twt/i18n/react'
import { useRouter } from 'expo-router'
import { Button, YStack } from 'tamagui'

export function DataExportEntry() {
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
        accessibilityLabel={t('dataExport.entry_label')}
        accessibilityHint={t('dataExport.entry_hint')}
        onPress={() => router.push('/(data-export)')}
      >
        {t('dataExport.entry_label')}
      </Button>
    </YStack>
  )
}
