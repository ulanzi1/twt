// The (claim) route GROUP — the Ravi-mode claim-flow chrome (Story 6.2, Task 5; AC1/AC6).
//
// The grief-paced intake wizard chrome (mirror (signup)/_layout.tsx). Renders an ordered, resumable
// "Step N of M" progress header ABOVE the Stack, derived from lib/claim-steps.ts. Headers stay hidden
// (like (auth)/(signup)). The entry gate ((claim)/index) is NOT a numbered step, so the progress
// header self-suppresses there. NO time-out modals, NO countdowns (UX §7 grief register / AC6).
//
// ── Accessibility ─────────────────────────────────────────────────────────────────────────────
// The "Step N of M" label is a polite live region (announced on step change); the segmented bar is
// decorative (hidden from assistive tech). Bilingual via the `claim` i18n namespace.

import { Stack, useSegments } from 'expo-router'
import { Text, XStack, YStack } from 'tamagui'

import { CLAIM_STEPS, claimStepProgress } from '../../lib/claim-steps'

export default function ClaimLayout(): React.ReactElement {
  const segments = useSegments()
  const current = segments[segments.length - 1] as string
  const idx = (CLAIM_STEPS as readonly string[]).indexOf(current)
  const { current: stepNumber, total } = claimStepProgress(current)

  return (
    <YStack flex={1} bg="$background">
      {idx >= 0 ? (
        <YStack px="$6" pt="$6" pb="$2" gap="$2">
          <Text
            accessibilityRole="text"
            accessibilityLiveRegion="polite"
            accessibilityLabel={`${stepNumber} / ${total}`}
            color="$colorPress"
          >
            {stepNumber} / {total}
          </Text>
          {/* Decorative segmented progress bar — N of M filled (hidden from assistive tech). */}
          <XStack gap="$1.5" importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
            {CLAIM_STEPS.map((s, i) => (
              <YStack key={s} flex={1} height={4} rounded={2} bg="$color" opacity={i <= idx ? 1 : 0.2} />
            ))}
          </XStack>
        </YStack>
      ) : null}
      <Stack screenOptions={{ headerShown: false }} />
    </YStack>
  )
}
