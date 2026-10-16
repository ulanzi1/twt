// The frame every home reminder card shares (Story 6.36c, Task 6.2; AC6): a title, an optional line, its actions, and
// *"Not now"* (dismissed for 30 days on this phone — `lib/home-card-dismissals.ts`). Presentational only.

import type { ReactNode } from 'react'

import { Button, Text, YStack } from 'tamagui'

export function HomeReminderCard({
  title,
  body,
  children,
  dismissLabel,
  onDismiss,
}: {
  title: string
  body?: string
  children?: ReactNode
  dismissLabel: string
  onDismiss: () => void
}) {
  return (
    <YStack gap="$2" px={16} py={12}>
      <Text accessible accessibilityRole="header" fontFamily="$body" fontSize="$4" fontWeight="500" color="$color">
        {title}
      </Text>
      {body !== undefined ? (
        <Text fontFamily="$body" fontSize="$2" color="$colorPress">
          {body}
        </Text>
      ) : null}
      {children}
      {/* Fix-review — an explicit accessibilityLabel (⛔ relying on the child Text alone) and a larger touch target
          (8px → 16px padding, plus hitSlop) for an action that suppresses a reminder for 30 days. */}
      <Button
        unstyled
        accessibilityRole="button"
        accessibilityLabel={dismissLabel}
        onPress={onDismiss}
        py={16}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Text fontFamily="$body" fontSize="$2" color="$colorPress">
          {dismissLabel}
        </Text>
      </Button>
    </YStack>
  )
}
