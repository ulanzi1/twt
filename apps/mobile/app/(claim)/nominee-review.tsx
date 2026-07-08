// Nominee detail review — read-only (Story 6.2, Task 6; AC4) — <NomineeDetailEditor>.
//
// 6.2 renders the PRE-POPULATED READ-ONLY nominee view (relationship + presence flags for the
// encrypted fields — the NON-PII summary the member-nominees status endpoint already returns). The
// Trustee-Panel-gated EDIT + the claim-time dual-bank collection are **Story 6.8** — so this screen
// shows the details read-only + a "details look wrong? Call us" path (never an inline edit). Pattern-4
// dignified copy throughout. No PII is fetched or shown beyond what the non-PII summary carries.

import { useEffect, useState } from 'react'

import type { NomineeStatusResponse } from '@twt/contracts'
import { useRouter } from 'expo-router'
import { Button, Paragraph, Separator, Spinner, Text, XStack, YStack } from 'tamagui'

import { ClaimProxyFlowShell } from '../../components/claim/ClaimProxyFlowShell'
import { CallHelplineCTA } from '../../components/claim/CallHelplineCTA'
import { memberAuth } from '../../lib/member-api'
import { useClaimT } from '../../lib/claim-i18n'
import { saveClaimDraft } from '../../lib/claim-draft'
import { useSession } from '../../lib/session-context'

type NomineeSummary = NomineeStatusResponse['nominees'][number]

/** `null` = still loading; `'error'` = the fetch failed (retriable); `NomineeSummary[]` = loaded
 * (possibly empty — a genuine "no nominees on file" result). Keeping the error case distinct
 * from the empty-array case means a transient network/401/500 failure doesn't get mistaken for
 * "no nominee details are on file yet" and silently routed straight to "call the helpline." */
type NomineeLoadState = 'error' | NomineeSummary[] | null

export default function NomineeReviewScreen(): React.ReactElement {
  const t = useClaimT()
  const router = useRouter()
  const { session } = useSession()
  const name = t('member_fallback')
  const [nominees, setNominees] = useState<NomineeLoadState>(null)

  useEffect(() => {
    let active = true
    memberAuth
      .nomineesStatus()
      .then((res) => {
        if (active) setNominees(res.nominees)
      })
      .catch(() => {
        if (active) setNominees('error')
      })
    return () => {
      active = false
    }
  }, [])

  return (
    <ClaimProxyFlowShell deceasedName={name}>
      <YStack gap="$4" pt="$4">
        <Text fontSize="$7" fontWeight="700">
          {t('nominee.title')}
        </Text>
        <Paragraph color="$colorPress">{t('nominee.help')}</Paragraph>

        {nominees === null ? (
          <Spinner />
        ) : nominees === 'error' ? (
          <>
            <Paragraph>{t('nominee.load_error')}</Paragraph>
            <CallHelplineCTA />
          </>
        ) : nominees.length === 0 ? (
          <>
            <Paragraph>{t('nominee.empty')}</Paragraph>
            <CallHelplineCTA />
          </>
        ) : (
          nominees.map((n, i) => (
            <YStack key={i} gap="$2" py="$2">
              <XStack justify="space-between">
                <Text color="$colorPress">{t(`relationship.${n.relationship}`)}</Text>
                <Text>{`${n.splitPct}%`}</Text>
              </XStack>
              <XStack justify="space-between">
                <Text color="$colorPress">{t('nominee.phone')}</Text>
                <Text>{n.mobilePresent ? t('nominee.present') : t('nominee.absent')}</Text>
              </XStack>
              <Separator />
            </YStack>
          ))
        )}

        <CallHelplineCTA label={t('nominee.wrong')} />
        <Button
          theme="accent"
          onPress={() => {
            if (session?.memberId) saveClaimDraft(session.memberId, { lastStep: 'nominee-review' })
            router.push('/(claim)/acknowledgement')
          }}
        >
          {t('nominee.continue')}
        </Button>
      </YStack>
    </ClaimProxyFlowShell>
  )
}
