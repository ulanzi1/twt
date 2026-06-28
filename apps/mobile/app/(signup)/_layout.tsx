// The (signup) route GROUP — the signup-wizard chrome (Story 3.6a, Task 6; AC4).
//
// Story 3.2/3.3b/3.4/3.5 each shipped a step screen with the wizard chrome deferred to "Story 3.6".
// 3.6a assembles it: the new-member entry (from (auth)/otp.tsx after signup_continuation) drops the
// member into this group, which renders an ordered, resumable step flow with a progress indicator:
//   tc → kyc → nominees → medical → [payment hand-off]
// The progress header derives the active step from the current route segment (resumable: re-entering
// any step within the session shows the right position). Headers stay hidden (like (auth)); the
// shared progress header sits ABOVE the Stack. Payment is a 3.6a PLACEHOLDER — Story 3.6b replaces
// payment.tsx with the real UPI + lock-in flow.
//
// ── Accessibility (AC4 / P0-2c) ───────────────────────────────────────────────────────────────
// The "Step N of M" label is a polite live region (announced on step change); the segmented bar is
// decorative (hidden from assistive tech). Bilingual via @twt/i18n.

import { Stack, useSegments } from 'expo-router'

import { useT } from '@twt/i18n/react'
import { Text, XStack, YStack } from 'tamagui'

import { WIZARD_STEPS } from '../../lib/wizard-steps'

export default function SignupLayout() {
  const t = useT()
  const segments = useSegments()
  // The active (signup) sub-route is the trailing segment (e.g. 'tc', 'kyc', …).
  const current = segments[segments.length - 1] as (typeof WIZARD_STEPS)[number]
  const idx = WIZARD_STEPS.indexOf(current)
  const total = WIZARD_STEPS.length
  const stepNumber = idx >= 0 ? idx + 1 : 1
  const progressLabel = t('wizard.step_progress', { current: stepNumber, total })

  return (
    <YStack flex={1} bg="$background">
      {idx >= 0 ? (
        <YStack px="$6" pt="$6" pb="$2" gap="$2">
          <Text
            accessibilityRole="text"
            accessibilityLiveRegion="polite"
            accessibilityLabel={progressLabel}
            color="$colorPress"
          >
            {progressLabel}
          </Text>
          {/* Decorative segmented progress bar — N of M filled (hidden from assistive tech). */}
          <XStack gap="$1.5" importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
            {WIZARD_STEPS.map((s, i) => (
              <YStack key={s} flex={1} height={4} rounded={2} bg="$color" opacity={i <= idx ? 1 : 0.2} />
            ))}
          </XStack>
        </YStack>
      ) : null}
      <Stack screenOptions={{ headerShown: false }} />
    </YStack>
  )
}
