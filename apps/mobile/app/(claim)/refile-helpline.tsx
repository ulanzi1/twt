// The RE-FILE state — "please call the helpline" — Story 6.19c (AC15, AC8c, `-273` §9).
//
// The death's most recent claim was CLOSED because the corrected bank details never reached us, and ⛔ no re-file
// confirmation is recorded: a new claim is filed only after a District Admin or the helpline records one (D19). This
// screen says so calmly and puts the helpline ONE tap away (<CallHelplineCTA>, the prominent rendering). Reached from
// the claim-entry gate (`index.tsx`) and the wizard's submit (`relationship.tsx`, the 409) — ONE state, ⛔ two copies.
//
// ⛔ Chrome: a plain `YStack` (the `certificate-replacement.tsx` precedent) — ⛔ `<ClaimProxyFlowShell>` (its
// save-and-resume affordance belongs to the wizard). ⛔ Not added to `CLAIM_STEPS`. The copy names the closure
// CATEGORY (no response reached the correction) — ⛔ no case-specific note or date from the closed claim is shown.
// Clarified 2026-10-02 (code review, Decision 2) — this comment previously said "no reason," which overstated what's
// withheld; the copy was human-reviewed and accepted as written (commit `45449354`).
// Accessibility (family 13): the message is ONE labelled container (`accessible={true}`) and is ANNOUNCED on arrival;
// both buttons have real handlers.

import { useEffect } from 'react'

import { useRouter } from 'expo-router'
import { AccessibilityInfo } from 'react-native'
import { Button, H2, Paragraph, YStack } from 'tamagui'

import { CallHelplineCTA } from '../../components/common/CallHelplineCTA'
import { useClaimT } from '../../lib/claim-i18n'
import { REFILE_HELPLINE_COPY } from '../../lib/refile-helpline-copy'

export default function RefileHelplineScreen(): React.ReactElement {
  const t = useClaimT()
  const router = useRouter()
  const title = t(REFILE_HELPLINE_COPY.title)
  const body = t(REFILE_HELPLINE_COPY.body)

  useEffect(() => {
    AccessibilityInfo.announceForAccessibility(`${title}. ${body}`)
  }, [title, body])

  return (
    <YStack flex={1} justify="center" gap="$4" px="$6" bg="$background" testID="claim-refile-helpline">
      <YStack gap="$3" accessible={true} accessibilityLabel={`${title}. ${body}`}>
        <H2>{title}</H2>
        <Paragraph>{body}</Paragraph>
      </YStack>
      <CallHelplineCTA label={t(REFILE_HELPLINE_COPY.call)} chromeless={false} theme="accent" height={56} />
      <Button chromeless accessibilityLabel={t(REFILE_HELPLINE_COPY.back)} onPress={() => router.replace('/(tabs)')}>
        {t(REFILE_HELPLINE_COPY.back)}
      </Button>
    </YStack>
  )
}
