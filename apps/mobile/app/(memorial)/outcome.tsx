// Story 11b.4 (AC8 / AC10 / MA13 / MA16) — the family learns the outcome, GENTLY, IN THE APP (`-391` Q4 A; ⛔ SMS, ⛔ push,
// ⛔ email — Trap 4). Refetched on mount (the Trust may have decided since).
//   · approved → the text as approved + "it will appear on the Sahyog Vivran page" (⛔ "is visible" — 11b.4a renders it);
//   · approved_with_omissions → the text with each left-out part marked (+ "the photo was left out") and the reasons;
//   · not_approved / approval_withdrawn → the reason; withdrawn → a calm line; with_the_trust → a calm line + Withdraw.
// ⭐ EVERY outcome shows the helpline (for `approved`: the NOMINEE calls it to change or take it down — `-393` M2, `-395`;
// ⛔ take-down button). *"Write again"* shows IFF `canSend` (⛔ on `approved`); on `with_the_trust` it sits beside Withdraw,
// with a line that a new version replaces the one with the Trust. It opens an EMPTY box (Trap 3) — the write screen offers
// *"Start from what I sent"* (the ORIGINAL).
//   · R10 — for EACH part left out the family reads ITS reason next to it (`-391` Q4 A): beside each marker in the text, on the
//     photo line, and on a line per part of the photo description (never one de-duplicated list of reasons);
//   · R2 — when the NEWEST version is withdrawn or declined while an EARLIER one is still approved, one more sentence says the
//     earlier version stands and how it can be changed (`earlierApprovalStands`). T1 — that sentence never contradicts the
//     *"Write again"* beside it: when the family may send (`canSend`) it says they can write a new version for the Trust to
//     look at, or call the helpline; only when they cannot does it name the helpline alone (UN-ATTESTED copy, AC14 review);
//   · T12 (a) / W7 — a missing view shows progress during a Retry the family tapped (a flag in `MemorialViewMissing`);
//   · W3 / Y — Withdraw is enabled exactly when the handover state machine allows a press (`handover-gate.ts`): ⛔ not while its
//     request is in flight, ⛔ not while the nominee's code is asked for, checked or retried (as Send is);
//   · R5 — a state that appears (the Withdraw that worked, a refusal, the notice) is SPOKEN, not only drawn.

import { useState } from 'react'
import { ScrollView } from 'react-native'
import { useRouter } from 'expo-router'
import { useQueryClient } from '@tanstack/react-query'
import { Button, H2, Paragraph, YStack } from 'tamagui'

import type { MemorialMemberView } from '@twt/contracts'
import { memorialOmittedReasons, reconstructMemorial } from '@twt/ui'

import { CallHelplineCTA } from '../../components/common/CallHelplineCTA'
import { HandoverCodePanel } from '../../components/memorial-authorship/HandoverCodePanel'
import { MemorialHeader } from '../../components/memorial-authorship/MemorialHeader'
import { MemorialText } from '../../components/memorial-authorship/MemorialText'
import { MemorialViewMissing } from '../../components/memorial-authorship/MemorialViewMissing'
import { memorialReasonKey } from '../../components/memorial-authorship/memorial-copy'
import { useMemorialAnnounce } from '../../components/memorial-authorship/useMemorialAnnounce'
import { invalidateMemorialQueries, useMemorialViewQuery } from '../../components/memorial-authorship/useMemorialQueries'
import { memorialApi } from '../../lib/memorial-api'
import { clearMemorialDraft } from '../../lib/memorial-draft'
import { useMemorialT } from '../../lib/memorial-i18n'
import { useSession } from '../../lib/session-context'
import { useHandoverGatedAction } from '../../lib/use-memorial-send'

export default function MemorialOutcomeScreen(): React.ReactElement {
  const router = useRouter()
  const { session } = useSession()
  const query = useMemorialViewQuery({ refetchOnMount: 'always' })
  const view = query.data?.memorial ?? null
  if (!view || !session)
    return (
      <MemorialViewMissing
        loading={query.isPending}
        fetching={query.isError && query.isFetching}
        onRetry={() => query.refetch()}
        variant="outcome"
      />
    )
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
      // X5 — ⛔ not awaited: `invalidateQueries` resolves only after its refetch, and a hung link must not hold Withdraw busy.
      void Promise.resolve(invalidateMemorialQueries(queryClient)).catch(() => undefined)
    },
    (code) => {
      // Nothing is being SENT here and nothing is on this phone: the words are with the Trust, and still are (P2).
      if (code !== 'memorial.not_withdrawable') setNotice(t('outcome.withdraw_failed'))
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
          // T12 (b) — the photo's REASON has ONE source: `view.photoLeftOut.reason`, read on the photo line below (the
          // presenter carries none). It stays shown when the words could not be decrypted (`body === null`).
        )
  // R10 — one line per part of the photo DESCRIPTION the Trust left out, each with its OWN reason (the markers in the text
  // carry theirs; the photo line carries its own below). Duplicates are kept: two parts are two lines.
  const altTextReasons = words?.altText?.asApproved ? memorialOmittedReasons(words.altText.asApproved) : []

  // R2 — the newest version is withdrawn / declined, but an EARLIER one is still the approved version.
  const earlierStands = view.earlierApprovalStands && (state === 'withdrawn' || state === 'not_approved' || state === 'approval_withdrawn')
  // T1 — the same condition as *"Write again"* below (`canSend`), so the sentence and the button always agree.
  const earlierStandsKey = view.canSend ? 'outcome.earlier_approval_stands' : 'outcome.earlier_approval_stands_helpline_only'

  // R5 — what is SPOKEN. The line for the state is swapped in place (no live region beside it), so it is announced on both
  // platforms — but only when it CHANGES after the screen is up (the Withdraw that worked; the Trust deciding meanwhile),
  // since the screen reader reads the screen itself on arrival. The notice and the exhausted line carry their own live
  // regions (Android); iOS is told here.
  const stateKey = state === 'none' ? null : `outcome.${state}`
  // P5 — "the earlier version still stands" can appear in the SAME re-render as the new state (a Withdraw that worked, the
  // Trust deciding meanwhile): it is spoken WITH the state line, as one announcement (two would cut each other off on iOS).
  const spoken = stateKey === null ? null : earlierStands ? `${t(stateKey)} ${t(earlierStandsKey)}` : t(stateKey)
  useMemorialAnnounce(spoken, { hasLiveRegion: false, skipInitial: true })
  // The notice and the helpline line are errors the family must act on: the plan gives their live-region value (`assertive`).
  const noticeLive = useMemorialAnnounce(notice, { hasLiveRegion: true, kind: 'error' })
  const exhaustedLive = useMemorialAnnounce(withdrawFlow.exhausted ? t('handover.still_refused') : null, { hasLiveRegion: true, kind: 'error' })

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
          {earlierStands ? (
            <Paragraph testID="memorial-earlier-stands">{t(earlierStandsKey)}</Paragraph>
          ) : null}

          {words !== null && (state === 'approved' || state === 'approved_with_omissions') ? (
            <MemorialText paragraphs={words.asApproved} testID="memorial-outcome-text" showReasons />
          ) : null}
          {state === 'approved_with_omissions' ? (
            <YStack gap="$1" testID="memorial-left-out">
              {view.photoLeftOut !== null ? (
                <Paragraph testID="memorial-photo-left-out">
                  {t('outcome.photo_left_out')} {reason(view.photoLeftOut.reason)}
                </Paragraph>
              ) : null}
              {altTextReasons.map((r, i) => (
                <Paragraph key={i} testID="memorial-alt-text-left-out">
                  {t('outcome.alt_text_left_out')} {reason(r)}
                </Paragraph>
              ))}
            </YStack>
          ) : null}
          {state === 'approved' ? <Paragraph>{t('outcome.helpline_for_changes')}</Paragraph> : null}

          {view.canWithdraw ? (
            <YStack gap="$2">
              <Button
                style={{ minHeight: 44 }}
                accessibilityRole="button"
                testID="memorial-withdraw"
                disabled={!withdrawFlow.canRun}
                onPress={() => void withdrawFlow.run()}
              >
                {t('outcome.withdraw')}
              </Button>
              <Paragraph size="$2">{t('outcome.replace_note')}</Paragraph>
              {withdrawFlow.needCode ? (
                <HandoverCodePanel
                  state={withdrawFlow.handover}
                  onConfirm={(code) => void withdrawFlow.confirmCode(code)}
                  onResend={() => withdrawFlow.resendCode()}
                />
              ) : null}
              {withdrawFlow.exhausted ? (
                <Paragraph theme="yellow" accessibilityLiveRegion={exhaustedLive}>
                  {t('handover.still_refused')}
                </Paragraph>
              ) : null}
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
          {notice !== null ? (
            <Paragraph theme="yellow" accessibilityLiveRegion={noticeLive} testID="memorial-notice">
              {notice}
            </Paragraph>
          ) : null}
          {/* ⭐ The helpline on EVERY outcome. */}
          <Paragraph>{t('outcome.helpline')}</Paragraph>
          <CallHelplineCTA />
        </YStack>
      </ScrollView>
    </YStack>
  )
}
