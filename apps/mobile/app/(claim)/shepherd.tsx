// Point-of-contact re-entry screen (Story 6.12, Task 5; AC3 / R3).
//
// The persistent, re-reachable shepherd view opened from the home-surface <ClaimPointOfContactEntry>
// (R3 — the acknowledgement card alone is a one-shot end-of-wizard terminal; this makes the point-of-
// contact view reachable AFTER filing). Reads the filed `claimCaseId` from the route params and renders
// the SAME <ShepherdContactCard>. Read-only; grief-mode.
//
// ── Story 6.21b (D3) — the death-certificate notice ──────────────────────────────────────────────
// Beside the shepherd card: a `<DeathCertificateNotice>` fed by the SAME `useDeathCertificateStatus`
// hook the replacement screen uses (D1's marker precedence, pure/tested). REFETCHES ON FOCUS
// (`useFocusEffect`) — `router.back()` from the replacement screen does not remount this screen, so a
// focus-only refetch is the only way the family sees the post-upload state without a manual reload.

import { useCallback, useRef } from 'react'

import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router'
import { Button, H2, Paragraph, YStack } from 'tamagui'

import { DeathCertificateNotice } from '../../components/claim/DeathCertificateNotice'
import { ShepherdContactCard } from '../../components/claim/ShepherdContactCard'
import { useClaimT } from '../../lib/claim-i18n'
import { useDeathCertificateStatus } from '../../lib/use-death-certificate-status'

export default function ShepherdScreen(): React.ReactElement {
  const t = useClaimT()
  const router = useRouter()
  const params = useLocalSearchParams<{ claimCaseId?: string }>()
  const claimCaseId = typeof params.claimCaseId === 'string' ? params.claimCaseId : undefined
  // Re-read on foreground too (a shepherd can sit open in the background — `-249` §1's class).
  const certificate = useDeathCertificateStatus(claimCaseId, { refetchOnForeground: true })

  // ONE replacement screen per press — a double tap would push two, and after the top one's upload the
  // lower one's stale read would still offer the picker (a second upload while the first is processing,
  // D1 rule 4's case). Re-armed whenever this screen regains focus (code review 2026-09-27).
  const openingRef = useRef(false)
  const refetchCertificate = certificate.refetch
  useFocusEffect(
    useCallback(() => {
      openingRef.current = false
      void refetchCertificate()
    }, [refetchCertificate]),
  )

  return (
    <YStack flex={1} p="$4" gap="$4" pt="$6">
      <H2>{t('shepherd.screen_title')}</H2>
      {claimCaseId ? (
        <>
          <ShepherdContactCard claimCaseId={claimCaseId} />
          {certificate.notice ? (
            <DeathCertificateNotice
              notice={certificate.notice}
              onUploadPress={() => {
                if (openingRef.current) return
                openingRef.current = true
                router.push(`/(claim)/certificate-replacement?claimCaseId=${encodeURIComponent(claimCaseId)}`)
              }}
            />
          ) : null}
        </>
      ) : (
        <Paragraph color="$colorPress">{t('shepherd.not_assigned')}</Paragraph>
      )}
      <Button size="$4" chromeless onPress={() => router.replace('/(tabs)')}>
        {t('shepherd.back_home')}
      </Button>
    </YStack>
  )
}
