// Understated entry point into the voluntary-withdrawal flow (Story 3.10, Task 8; AC2).
//
// Deliberately LOW-prominence — withdrawal is a considered, member-initiated action, NOT something we
// encourage (contrast the always-available Life Events link). Placed at the very bottom of the home
// tab (the app has no dedicated profile/settings screen yet); chromeless + muted so it reads as a quiet
// account action, never a CTA. No scarcity/retention framing. The dignified explanation lives on the
// acknowledgment screen it navigates to (never here).

import { useT } from '@twt/i18n/react'
import { useRouter } from 'expo-router'
import { Button, YStack } from 'tamagui'

export function WithdrawalEntry() {
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
        accessibilityLabel={t('withdrawal.entry_label')}
        accessibilityHint={t('withdrawal.entry_hint')}
        onPress={() => router.push('/(withdrawal)')}
      >
        {t('withdrawal.entry_label')}
      </Button>
    </YStack>
  )
}
