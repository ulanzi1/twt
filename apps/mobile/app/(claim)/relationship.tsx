// Relationship confirm → intake (Story 6.2, Task 6; AC3).
//
// THE node that emits `claim.intake_initiated` (→ freezes the deceased's account). Ravi picks his
// relationship to the deceased and confirms; the screen calls `claimApi.initiateIntake`, which
// mints the claim_case_id server-side. Idempotent server-side: a re-tap returns the same claim. On
// success it persists the claimCaseId to the draft and advances to the document step.
//
// If the handover-trust elevation has lapsed the server returns 403 `auth.step_up_required` (keyed
// on error.code, NOT bare 403 — the 3.9/3.10 step-up lesson) → route back to the handover-OTP step.

import { useState } from 'react'

import { ApiError } from '@twt/api-client'
import { useRouter } from 'expo-router'
import { Button, Paragraph, Spinner, Text, ToggleGroup, YStack } from 'tamagui'

import { ClaimProxyFlowShell } from '../../components/claim/ClaimProxyFlowShell'
import { claimApi } from '../../lib/claim-api'
import { useClaimT } from '../../lib/claim-i18n'
import { loadClaimDraft, saveClaimDraft } from '../../lib/claim-draft'
import { useSession } from '../../lib/session-context'

const RELATIONSHIPS = ['spouse', 'child', 'parent', 'sibling', 'other'] as const
type Relationship = (typeof RELATIONSHIPS)[number]

export default function RelationshipScreen(): React.ReactElement {
  const t = useClaimT()
  const router = useRouter()
  const { session } = useSession()
  const name = t('member_fallback')
  // Resume: restore a previously-picked relationship instead of always starting unselected (AC6).
  const [relationship, setRelationship] = useState<Relationship | null>(
    () => (session?.memberId && loadClaimDraft(session.memberId).relationship) || null,
  )
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function onConfirm(): Promise<void> {
    if (!relationship) return
    setBusy(true)
    setError(null)
    try {
      const res = await claimApi.initiateIntake({ relationship })
      if (session?.memberId) {
        saveClaimDraft(session.memberId, { relationship, claimCaseId: res.claimCaseId, lastStep: 'relationship' })
      }
      router.push('/(claim)/document')
    } catch (e) {
      // A lapsed handover-trust elevation → return to the OTP step (keyed on the CODE).
      if (e instanceof ApiError && e.code === 'auth.step_up_required') {
        router.replace('/(claim)/handover-otp')
        return
      }
      setError(t('relationship.error'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <ClaimProxyFlowShell deceasedName={name}>
      <YStack gap="$4" pt="$4">
        <Text fontSize="$7" fontWeight="700">
          {t('relationship.title', { name })}
        </Text>
        <Paragraph color="$colorPress">{t('relationship.help')}</Paragraph>
        <ToggleGroup
          type="single"
          orientation="vertical"
          value={relationship ?? ''}
          onValueChange={(v) => setRelationship((v || null) as Relationship | null)}
          disableDeactivation={false}
        >
          {RELATIONSHIPS.map((r) => (
            <ToggleGroup.Item key={r} value={r} aria-label={t(`relationship.${r}`)}>
              <Paragraph>{t(`relationship.${r}`)}</Paragraph>
            </ToggleGroup.Item>
          ))}
        </ToggleGroup>
        {error ? <Text color="#C0392B">{error}</Text> : null}
        <Button theme="accent" disabled={busy || !relationship} onPress={onConfirm}>
          {busy ? <Spinner /> : t('relationship.confirm')}
        </Button>
      </YStack>
    </ClaimProxyFlowShell>
  )
}
