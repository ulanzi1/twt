// The "a claim cannot be filed" state — Story 6.38 (DL10; `2026-10-30-423` Q3 B, `2026-10-31-424` Q3 B).
//
// The claim door refused the filing: when the death was first reported the person was ⛔ a member of the Trust (never
// finished joining, never paid the joining fee, had left, had been removed, or had been erased). ⛔ Claim record is kept,
// and there is ⛔ appeal. This screen says so calmly with ONE general reason — ⛔ which case it was — and puts the helpline
// ONE tap away for a QUESTION (<CallHelplineCTA>, the prominent rendering). Reached from the wizard's submit only
// (`relationship.tsx`, the 409 `claim.intake_refused`).
//
// ⛔ Chrome: a plain `YStack` (the `refile-helpline.tsx` precedent) — ⛔ `<ClaimProxyFlowShell>`. ⛔ Not added to `CLAIM_STEPS`.
// ⚠ With ⛔ record kept, each re-entry walks the wizard back to the submit before this shows — accepted (Q3 B's ⛔ record).
// Accessibility: the message is ONE labelled container (`accessible={true}`) and is ANNOUNCED on arrival; the effect depends
// on the RESOLVED strings, ⛔ on `t` (`useClaimT()` returns a fresh closure every render); both buttons have real handlers.

import { useEffect } from 'react'

import { useRouter } from 'expo-router'
import { AccessibilityInfo } from 'react-native'
import { Button, H2, Paragraph, YStack } from 'tamagui'

import { CallHelplineCTA } from '../../components/common/CallHelplineCTA'
import { CANNOT_FILE_COPY } from '../../lib/cannot-file-copy'
import { useClaimT } from '../../lib/claim-i18n'

export default function CannotFileScreen(): React.ReactElement {
  const t = useClaimT()
  const router = useRouter()
  const title = t(CANNOT_FILE_COPY.title)
  const body = t(CANNOT_FILE_COPY.body)

  useEffect(() => {
    AccessibilityInfo.announceForAccessibility(`${title}. ${body}`)
  }, [title, body])

  return (
    <YStack flex={1} justify="center" gap="$4" px="$6" bg="$background" testID="claim-cannot-file">
      <YStack gap="$3" accessible={true} accessibilityLabel={`${title}. ${body}`}>
        <H2>{title}</H2>
        <Paragraph>{body}</Paragraph>
      </YStack>
      <CallHelplineCTA label={t(CANNOT_FILE_COPY.call)} chromeless={false} theme="accent" height={56} />
      <Button chromeless accessibilityLabel={t(CANNOT_FILE_COPY.back)} onPress={() => router.replace('/(tabs)')}>
        {t(CANNOT_FILE_COPY.back)}
      </Button>
    </YStack>
  )
}
