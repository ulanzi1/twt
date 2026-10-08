// The CLOSED claim — "please call the helpline" — Story 6.24a (`2026-10-07-292` RF12 v1.3).
//
// The family's filed claim was CLOSED because another claim for the same death won its appeal (`-262` FQ5 A). This screen
// says only that, calmly, with the helpline ONE tap away (<CallHelplineCTA>, the prominent rendering) — ⛔ no reason,
// ⛔ no other claim, ⛔ no name. Reached from the claim-entry gate (`index.tsx`) — ⛔ never the wizard (a new filing would
// converge onto the reversed claim only inside the 30-day look-back, else mint a third claim for the death; the helpline
// guides the family instead). The `refile-helpline.tsx` precedent: a plain `YStack`, ⛔ `<ClaimProxyFlowShell>`, ⛔ not in
// `CLAIM_STEPS`. Accessibility: ONE labelled container, ANNOUNCED on arrival; both buttons have real handlers.

import { useEffect } from 'react'

import { useRouter } from 'expo-router'
import { AccessibilityInfo } from 'react-native'
import { Button, H2, Paragraph, YStack } from 'tamagui'

import { CallHelplineCTA } from '../../components/common/CallHelplineCTA'
import { useClaimT } from '../../lib/claim-i18n'
import { CLOSED_HELPLINE_COPY } from '../../lib/closed-helpline-copy'

export default function ClosedHelplineScreen(): React.ReactElement {
  const t = useClaimT()
  const router = useRouter()
  const title = t(CLOSED_HELPLINE_COPY.title)
  const body = t(CLOSED_HELPLINE_COPY.body)

  useEffect(() => {
    AccessibilityInfo.announceForAccessibility(`${title}. ${body}`)
  }, [title, body])

  return (
    <YStack flex={1} justify="center" gap="$4" px="$6" bg="$background" testID="claim-closed-helpline">
      <YStack gap="$3" accessible={true} accessibilityLabel={`${title}. ${body}`}>
        <H2>{title}</H2>
        <Paragraph>{body}</Paragraph>
      </YStack>
      <CallHelplineCTA label={t(CLOSED_HELPLINE_COPY.call)} chromeless={false} theme="accent" height={56} />
      <Button chromeless accessibilityLabel={t(CLOSED_HELPLINE_COPY.back)} onPress={() => router.replace('/(tabs)')}>
        {t(CLOSED_HELPLINE_COPY.back)}
      </Button>
    </YStack>
  )
}
