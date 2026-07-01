// Save-and-resume affordance (Story 3.9, Task 8; UX-DR50 / UX-DR56 Pattern 5).
//
// A calm banner shown at the top of a grief-paced Life Events form when a persisted draft exists.
// It offers "Continue" (keep the restored draft) and "Start fresh" (discard it). Calm register — no
// urgency, no scarcity framing (UX-DR55 Pattern 4). Announced politely to assistive tech.

import { useT } from '@twt/i18n/react'
import { Button, Paragraph, XStack, YStack } from 'tamagui'

export interface SaveAndResumeAffordanceProps {
  /** Called when the member chooses to keep the restored draft. */
  onContinue: () => void
  /** Called when the member chooses to discard the draft and start fresh. */
  onStartFresh: () => void
}

export function SaveAndResumeAffordance({
  onContinue,
  onStartFresh,
}: SaveAndResumeAffordanceProps) {
  const t = useT()
  return (
    <YStack
      gap="$3"
      p="$4"
      rounded="$4"
      borderWidth={1}
      borderColor="$borderColor"
      accessibilityRole="summary"
    >
      <Paragraph color="$colorPress" accessibilityRole="text" accessibilityLiveRegion="polite">
        {t('lifeEvents.resume_available')}
      </Paragraph>
      <XStack gap="$3">
        <Button
          theme="accent"
          height={48}
          flex={1}
          accessibilityRole="button"
          accessibilityLabel={t('lifeEvents.resume_cta')}
          onPress={onContinue}
        >
          {t('lifeEvents.resume_cta')}
        </Button>
        <Button
          chromeless
          height={48}
          flex={1}
          accessibilityRole="button"
          accessibilityLabel={t('lifeEvents.resume_discard')}
          onPress={onStartFresh}
        >
          {t('lifeEvents.resume_discard')}
        </Button>
      </XStack>
    </YStack>
  )
}
