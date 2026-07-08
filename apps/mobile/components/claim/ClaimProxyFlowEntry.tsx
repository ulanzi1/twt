// ClaimProxyFlowEntry — the home-screen Ravi-mode entry (Story 6.2, Task 5; AC1).
//
// An understated home-screen affordance (the LifeEventsEntry / WithdrawalEntry precedent) that opens
// the claim proxy flow. On a valid member session (Ravi is on the deceased's phone), tapping it routes
// to the (claim)/index gate, which asks "Are you family of [member name]?" with a "No — continue as
// [member]" escape. This organic home entry is the ONLY entry surface in 6.2 — the helpline deep-link
// handover (Story 6.3) is explicitly NOT built (Dev Notes "Scope boundary"). Bereaved register: no
// marketing framing, no urgency.

import { useRouter } from 'expo-router'
import { Button, YStack } from 'tamagui'

import { CallHelplineCTA } from './CallHelplineCTA'
import { useClaimT } from '../../lib/claim-i18n'
import { useSession } from '../../lib/session-context'

export function ClaimProxyFlowEntry(): React.ReactElement | null {
  const t = useClaimT()
  const router = useRouter()
  const { session } = useSession()
  // Only surfaced on a valid member session (self-suppresses otherwise, like the other entries).
  if (!session) return null
  return (
    <YStack px="$4" py="$3" gap="$2">
      <Button
        chromeless
        size="$4"
        accessibilityRole="button"
        accessibilityLabel={t('entry.yes')}
        onPress={() => router.push('/(claim)')}
      >
        {t('entry.yes')}
      </Button>
      <CallHelplineCTA />
    </YStack>
  )
}
