// Death-certificate upload seam (Story 6.2, Task 6; AC4) — <ClaimDocumentUpload>.
//
// 6.2 provides the UPLOAD AFFORDANCE + the save-and-resume / defer-7-days state ONLY. The real OCR
// parity background job + the object-storage backend are **Story 6.5** — so the "Take a photo" /
// "Choose a PDF" buttons here are the UI SEAM: they mark the draft as `selected` (a local, non-
// authoritative marker) without a native picker (expo-image-picker / expo-document-picker are NOT
// yet dependencies — adding them is 6.5's call). "I'll upload later" marks `deferred`. Both advance
// to the nominee review. Flagged loudly so 6.5 wires the real capture + storage into THIS seam.
//
// No countdowns, no time pressure — the 7-day window is stated as reassurance, never enforced client-side.

import { useState } from 'react'

import { useRouter } from 'expo-router'
import { Button, Paragraph, Text, YStack } from 'tamagui'

import { ClaimProxyFlowShell } from '../../components/claim/ClaimProxyFlowShell'
import { useClaimT } from '../../lib/claim-i18n'
import { loadClaimDraft, saveClaimDraft, type ClaimDocumentStage } from '../../lib/claim-draft'
import { useSession } from '../../lib/session-context'

export default function DocumentScreen(): React.ReactElement {
  const t = useClaimT()
  const router = useRouter()
  const { session } = useSession()
  const name = t('member_fallback')
  // Resume: restore a previously-marked stage instead of always starting at 'none' (AC6).
  const [stage, setStage] = useState<ClaimDocumentStage>(() =>
    (session?.memberId && loadClaimDraft(session.memberId).documentStage) || 'none',
  )

  function mark(next: ClaimDocumentStage): void {
    setStage(next)
    if (session?.memberId) saveClaimDraft(session.memberId, { documentStage: next, lastStep: 'document' })
  }

  return (
    <ClaimProxyFlowShell deceasedName={name}>
      <YStack gap="$4" pt="$4">
        <Text fontSize="$7" fontWeight="700">
          {t('document.title')}
        </Text>
        <Paragraph color="$colorPress">{t('document.help')}</Paragraph>

        {/* SEAM (Story 6.5 owns the real picker + OCR + storage): these mark local intent only. */}
        <Button onPress={() => mark('selected')} accessibilityLabel={t('document.pick_photo')}>
          {t('document.pick_photo')}
        </Button>
        <Button onPress={() => mark('selected')} accessibilityLabel={t('document.pick_file')}>
          {t('document.pick_file')}
        </Button>
        <Button chromeless onPress={() => mark('deferred')} accessibilityLabel={t('document.defer')}>
          {t('document.defer')}
        </Button>

        {stage === 'selected' ? <Text color="#1E8E3E">{t('document.selected')}</Text> : null}
        {stage === 'deferred' ? <Text color="$colorPress">{t('document.saved')}</Text> : null}

        <Button
          theme="accent"
          disabled={stage === 'none'}
          onPress={() => router.push('/(claim)/nominee-review')}
        >
          {t('document.continue')}
        </Button>
      </YStack>
    </ClaimProxyFlowShell>
  )
}
