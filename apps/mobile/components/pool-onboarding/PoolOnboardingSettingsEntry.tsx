// Understated home entry into the pool-engine onboarding tutorial (Story 7.10, Task 4; AC2/AC4).
//
// The LIVE re-view path this story ships: the tutorial is re-viewable anytime, not only on first entry.
// Mirrors the NotificationSettingsEntry idiom — chromeless, low-prominence, ≥44pt, accessibilityRole
// "button" + label/hint — placed near the other bottom-of-home entries (the app has no dedicated
// profile/settings screen yet). Opening it pushes the modal (pool-onboarding) route group.

import { useCallback, useRef } from 'react'

import { useT } from '@twt/i18n/react'
import { useRouter } from 'expo-router'
import { Button, YStack } from 'tamagui'

/** Tutorial copy lives in the `pool-onboarding` i18n namespace (not the default `common`). */
const NS = { namespace: 'pool-onboarding' } as const

export function PoolOnboardingSettingsEntry() {
  const t = useT()
  const router = useRouter()
  // Debounces a rapid double-tap so the modal route isn't pushed twice before the first navigation
  // lands. This entry stays mounted underneath the modal (it's not unmounted by the push), so the
  // guard resets on a short delay rather than latching permanently — the member can still re-open the
  // tutorial normally after it closes.
  const lastPressAtRef = useRef(0)

  const onPress = useCallback((): void => {
    const now = Date.now()
    if (now - lastPressAtRef.current < 800) return
    lastPressAtRef.current = now
    router.push('/(pool-onboarding)')
  }, [router])

  return (
    <YStack px="$6" py="$3">
      <Button
        chromeless
        height={44}
        justify="flex-start"
        opacity={0.6}
        accessibilityRole="button"
        accessibilityLabel={t('entry_label', undefined, NS)}
        accessibilityHint={t('entry_hint', undefined, NS)}
        onPress={onPress}
      >
        {t('entry_label', undefined, NS)}
      </Button>
    </YStack>
  )
}
