// Acknowledgement (Story 6.2, Task 6) — UX Journey 2 `Ack`.
//
// The dignified close of the Ravi-mode flow: "Verification usually takes 2–3 weeks; a field worker
// will visit." No countdown, no next-action pressure — the claim is filed and the account is frozen
// server-side (irreversible-by-client). Clears the local claim draft (the flow is complete) and
// returns Ravi home. Bereaved register throughout.

import { useEffect, useState } from 'react'

import { useRouter } from 'expo-router'
import { Button, H2, Paragraph, YStack } from 'tamagui'

import { ClaimProxyFlowShell } from '../../components/claim/ClaimProxyFlowShell'
import { ShepherdContactCard } from '../../components/claim/ShepherdContactCard'
import { useClaimT } from '../../lib/claim-i18n'
import { clearClaimDraft, loadClaimDraft } from '../../lib/claim-draft'
import { setFiledClaimCaseId } from '../../lib/filed-claim'
import { useSession } from '../../lib/session-context'

export default function AcknowledgementScreen(): React.ReactElement {
  const t = useClaimT()
  const router = useRouter()
  const { session } = useSession()
  const name = t('member_fallback')
  const [claimCaseId, setClaimCaseId] = useState<string | undefined>(undefined)

  // The flow is complete — capture the filed claim id (R3: keep the point-of-contact view re-reachable)
  // BEFORE clearing the local draft (the intake is already durable server-side).
  useEffect(() => {
    if (!session?.memberId) return
    const filedId = loadClaimDraft(session.memberId).claimCaseId
    if (filedId) {
      setClaimCaseId(filedId)
      setFiledClaimCaseId(session.memberId, filedId)
    }
    clearClaimDraft(session.memberId)
  }, [session?.memberId])

  return (
    <ClaimProxyFlowShell deceasedName={name}>
      <YStack flex={1} justify="center" gap="$4" pt="$4">
        <H2>{t('ack.title')}</H2>
        <Paragraph color="$colorPress">{t('ack.body')}</Paragraph>
        {/* Story 6.12 — the named-human point of contact (pre-verification: a reassuring not-yet state). */}
        {claimCaseId ? <ShepherdContactCard claimCaseId={claimCaseId} /> : null}
        <Button theme="accent" size="$5" onPress={() => router.replace('/(tabs)')}>
          {t('ack.done')}
        </Button>
      </YStack>
    </ClaimProxyFlowShell>
  )
}
