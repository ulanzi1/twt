// The frame every home reminder card shares (Story 6.36c, Task 6.2; AC6): a title, an optional line, its actions, and
// *"Not now"* — dismissed for 30 days on this phone (`lib/home-card-dismissals.ts`), EXCEPT card (c), the suggestion,
// whose "Not now" lasts for this app session only (round 1; the header comment corrected by code review round 2).
// Story 5.14 (FS10 (a)) — and EXCEPT the announcement channels card, whose "Not now" (or an opened link) hides it FOR GOOD on this phone
// for that account (`lib/announcement-channels-dismissal.ts` — ⛔ expiry).
// Presentational only.
// ⚠ Code review round 2 (family 13 (c) / (d)) — `dismissDisabled`: while the suggestion's answer is in flight "Not now"
// is a real DISABLED button (`disabled` + `accessibilityState`, as posting.tsx's "I have been transferred"), ⛔ an
// enabled control whose press silently does nothing.

import type { ReactNode } from 'react'

import { Button, Text, YStack } from 'tamagui'

export function HomeReminderCard({
  title,
  body,
  children,
  dismissLabel,
  onDismiss,
  dismissDisabled = false,
}: {
  title: string
  body?: string
  children?: ReactNode
  dismissLabel: string
  onDismiss: () => void
  /** Code review round 2 — "Not now" is disabled (and says so to a screen reader) while this is `true`. */
  dismissDisabled?: boolean
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
          (8px → 16px padding, plus hitSlop) for an action that suppresses a reminder (for 30 days, or — card (c) — for
          this app session; code review round 2). */}
      <Button
        unstyled
        accessibilityRole="button"
        accessibilityLabel={dismissLabel}
        disabled={dismissDisabled}
        accessibilityState={{ disabled: dismissDisabled }}
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
