// ClaimProxyFlowShell — the Ravi-mode proxy-flow chrome (Story 6.2, Task 5; AC1/AC5/AC6).
//
// Wraps every claim-flow step with the load-bearing shell: a "Filing on behalf of [Name]" banner
// (bereaved register — black-bordered FuneralFrame motif, no marketing surfaces, no countdowns,
// UX §7), an always-present <SaveAndResumeAffordance>, and an always-one-tap <CallHelplineCTA>
// (AR-61 staff-fallback). Tenant-agnostic internal name (UX §component-naming line 1751-1754 —
// "Ravi Mode Shell" is a UX LABEL only, never a code identifier).

import type { ReactNode } from 'react'
import { H3, Paragraph, Separator, YStack } from 'tamagui'

import { useClaimT } from '../../lib/claim-i18n'
import { CallHelplineCTA } from './CallHelplineCTA'
import { SaveAndResumeAffordance } from './SaveAndResumeAffordance'

/** The bereaved-register frame border colour (FuneralFrame motif, UX §7). */
const FUNERAL_FRAME_BORDER = '#1A1A1A'

export function ClaimProxyFlowShell(props: {
  /** The deceased member's display name for the banner (falls back to a dignified generic). */
  deceasedName: string
  children: ReactNode
}): React.ReactElement {
  const t = useClaimT()
  return (
    <YStack flex={1} bg="$background">
      {/* Bereaved-register banner — black-bordered frame, grief cadence, no marketing. */}
      <YStack
        borderColor={FUNERAL_FRAME_BORDER}
        borderWidth={2}
        rounded="$4"
        m="$4"
        px="$4"
        py="$3"
        accessibilityRole="header"
      >
        <H3>{t('shell.banner', { name: props.deceasedName })}</H3>
      </YStack>

      {/* The step content. */}
      <YStack flex={1} px="$4">
        {props.children}
      </YStack>

      {/* Always-present footer affordances (AC1/AC5): save-and-resume + one-tap helpline. */}
      <Separator />
      <YStack px="$4" py="$3" gap="$2">
        <SaveAndResumeAffordance />
        <Paragraph size="$2" color="$colorPress" text="center">
          {t('shell.saved')}
        </Paragraph>
        <CallHelplineCTA />
      </YStack>
    </YStack>
  )
}
