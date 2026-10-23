// Story 11b.4 (AC8 / AC10 / MA13 / MA16) — the family learns the outcome, GENTLY, IN THE APP (`-391` Q4 A; ⛔ SMS, ⛔ push,
// ⛔ email — Trap 4). Refetched on mount (the Trust may have decided since).
//   · approved → the text as approved + "it will appear on the Sahyog Vivran page" (⛔ "is visible" — 11b.4a renders it);
//   · approved_with_omissions → the text with each left-out part marked (+ "the photo was left out") and the reasons;
//   · not_approved / approval_withdrawn → the reason; withdrawn → a calm line; with_the_trust → a calm line + Withdraw.
// ⭐ EVERY outcome shows the helpline (for `approved`: the NOMINEE calls it to change or take it down — `-393` M2, `-395`;
// ⛔ take-down button). *"Write again"* shows IFF `canSend` (⛔ on `approved`); on `with_the_trust` it sits beside Withdraw,
// with a line that a new version replaces the one with the Trust. It opens an EMPTY box (Trap 3) — the write screen offers
// *"Start from what I sent"* (the ORIGINAL).

import { useState } from 'react'
import { ScrollView } from 'react-native'
import { useRouter } from 'expo-router'
import { useQueryClient } from '@tanstack/react-query'
import { Button, H2, Paragraph, YStack } from 'tamagui'

import type { MemorialMemberView } from '@twt/contracts'
import { reconstructMemorial } from '@twt/ui'

import { CallHelplineCTA } from '../../components/common/CallHelplineCTA'
import { HandoverCodePanel } from '../../components/memorial-authorship/HandoverCodePanel'
import { MemorialHeader } from '../../components/memorial-authorship/MemorialHeader'
import { MemorialText } from '../../components/memorial-authorship/MemorialText'
import { memorialReasonKey } from '../../components/memorial-authorship/memorial-copy'
import { invalidateMemorialQueries, useMemorialViewQuery } from '../../components/memorial-authorship/useMemorialQueries'
import { memorialApi } from '../../lib/memorial-api'
import { clearMemorialDraft } from '../../lib/memorial-draft'
import { useMemorialT } from '../../lib/memorial-i18n'
import { useSession } from '../../lib/session-context'
import { useHandoverGatedAction } from '../../lib/use-memorial-send'

export default function MemorialOutcomeScreen(): React.ReactElement | null {
  const router = useRouter()
  const { session } = useSession()
  const view = useMemorialViewQuery({ refetchOnMount: 'always' }).data?.memorial ?? null
  if (!view || !session) return null
  return <Outcome view={view} memberId={session.memberId} onWriteAgain={() => router.push('/(memorial)/write')} />
}

function Outcome({
  view,
  memberId,
  onWriteAgain,
}: {
  view: MemorialMemberView
  memberId: string
  onWriteAgain: () => void
}): React.ReactElement {
  const t = useMemorialT()
  const queryClient = useQueryClient()
  const [notice, setNotice] = useState<string | null>(null)
  const state = view.memorialState
  const reason = (r: string | null) => (r === null ? null : t('outcome.reason', { reason: t(memorialReasonKey(r)) }))

  // AC8 — withdraw while with the Trust; a 403 asks the NOMINEE's code (AC7a); `not_withdrawable` ⇒ the outcome is
  // refetched (the Trust decided meanwhile), quietly.
  const withdrawFlow = useHandoverGatedAction(
    async () => {
      if (!view.submissionId) return
      setNotice(null)
      await memorialApi.withdraw(view.submissionId)
      await invalidateMemorialQueries(queryClient)
    },
    (code) => {
      if (code !== 'memorial.not_withdrawable') setNotice(t('send.generic'))
      void invalidateMemorialQueries(queryClient)
    },
  )

  const words =
    view.body === null
      ? null
      : reconstructMemorial(
          { body: view.body, altText: view.altText },
          state === 'approved' || state === 'approved_with_omissions'
            ? { omissions: view.omissions, photoLeftOut: view.photoLeftOut !== null }
            : null,
        )

  return (
    <YStack flex={1}>
      <MemorialHeader showSaved={false} />
      <ScrollView>
        <YStack px="$4" py="$4" gap="$4" testID={`memorial-outcome-${state}`}>
          <H2 accessibilityRole="header">{t('outcome.title')}</H2>
          {view.earlierApprovalWithdrawn !== null ? (
            <YStack gap="$1" testID="memorial-earlier-withdrawn">
              <Paragraph>{t('outcome.earlier_approval_withdrawn')}</Paragraph>
              <Paragraph>{reason(view.earlierApprovalWithdrawn.reasonCode)}</Paragraph>
            </YStack>
          ) : null}
          {view.unavailable !== null ? <Paragraph>{t('outcome.unavailable')}</Paragraph> : null}

          {state === 'with_the_trust' ? <Paragraph>{t('outcome.with_the_trust')}</Paragraph> : null}
          {state === 'withdrawn' ? <Paragraph>{t('outcome.withdrawn')}</Paragraph> : null}
          {state === 'approved' ? <Paragraph>{t('outcome.approved')}</Paragraph> : null}
          {state === 'approved_with_omissions' ? <Paragraph>{t('outcome.approved_with_omissions')}</Paragraph> : null}
          {state === 'not_approved' ? <Paragraph>{t('outcome.not_approved')}</Paragraph> : null}
          {state === 'approval_withdrawn' ? <Paragraph>{t('outcome.approval_withdrawn')}</Paragraph> : null}
          {state === 'not_approved' || state === 'approval_withdrawn' ? <Paragraph>{reason(view.reasonCode)}</Paragraph> : null}

          {words !== null && (state === 'approved' || state === 'approved_with_omissions') ? (
            <MemorialText paragraphs={words.asApproved} testID="memorial-outcome-text" />
          ) : null}
          {state === 'approved_with_omissions' ? (
            <YStack gap="$1">
              {view.photoLeftOut !== null ? <Paragraph>{t('outcome.photo_left_out')}</Paragraph> : null}
              {[...new Set([...view.omissions.map((o) => o.reason), ...(view.photoLeftOut ? [view.photoLeftOut.reason] : [])])].map((r) => (
                <Paragraph key={r}>{reason(r)}</Paragraph>
              ))}
            </YStack>
          ) : null}
          {state === 'approved' ? <Paragraph>{t('outcome.helpline_for_changes')}</Paragraph> : null}

          {view.canWithdraw ? (
            <YStack gap="$2">
              <Button style={{ minHeight: 44 }} accessibilityRole="button" testID="memorial-withdraw" onPress={() => void withdrawFlow.run()}>
                {t('outcome.withdraw')}
              </Button>
              <Paragraph size="$2">{t('outcome.replace_note')}</Paragraph>
              {withdrawFlow.needCode ? (
                <HandoverCodePanel state={withdrawFlow.handover} onConfirm={(code) => void withdrawFlow.confirmCode(code)} />
              ) : null}
              {withdrawFlow.exhausted ? <Paragraph theme="yellow">{t('handover.still_refused')}</Paragraph> : null}
            </YStack>
          ) : null}
          {view.canSend && state !== 'none' ? (
            <Button
              style={{ minHeight: 44 }}
              accessibilityRole="button"
              testID="memorial-write-again"
              onPress={() => {
                clearMemorialDraft(memberId, view.driveId)
                onWriteAgain()
              }}
            >
              {t('outcome.write_again')}
            </Button>
          ) : null}
          {notice !== null ? <Paragraph theme="yellow">{notice}</Paragraph> : null}
          {/* ⭐ The helpline on EVERY outcome. */}
          <Paragraph>{t('outcome.helpline')}</Paragraph>
          <CallHelplineCTA />
        </YStack>
      </ScrollView>
    </YStack>
  )
}
