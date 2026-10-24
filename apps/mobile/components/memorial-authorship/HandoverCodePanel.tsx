// Story 11b.4 (AC7a) — the NOMINEE's handover code, asked only after a 403 at Send or Withdraw. All copy is `memorial`
// (⛔ `hook.error`, which carries claim keys — *"…help you file"*). The no-nominee and send-failed results route to the
// helpline with Pattern-4 copy; a code that does not match asks again (⛔ a second SMS round trip).
// ⭐ Z0 (A) (BigDev 2026-10-24) — "Send a new code", so the code panel is never a dead end: offered when the SMS FAILED, or
// once HANDOVER_RESEND_WAIT_MS have passed since the code was sent (the wait is HERE, in the panel — the hooks and the state
// machine stay clock-free), and ⛔ never when there is no nominee (the helpline is the answer there). Pressing it is the
// machine's `resend` event: ONE new SMS, "did not match" cleared, at most three per screen — after that, only the helpline.
// It is a real 44 pt button, and its line is SPOKEN when it appears (family 13 (c)/(d)): on its own after the wait (a
// status); together with "could not send" when the SMS failed (one announcement — two would cut each other off on iOS).
// The copy (`handover.resend`, `handover.resend_note`) is agent-drafted and UN-ATTESTED (the AC14 Hindi review owes it).

import { useEffect, useState } from 'react'
import { Button, H3, Input, Paragraph, Spinner, YStack } from 'tamagui'

import { CallHelplineCTA } from '../common/CallHelplineCTA'
import { useMemorialT } from '../../lib/memorial-i18n'
import { useMemorialAnnounce } from './useMemorialAnnounce'

export interface HandoverPanelState {
  readonly masked: string | null
  readonly sendFailed: boolean
  readonly noNominee: boolean
  readonly notVerified: boolean
  readonly busy: boolean
  /** Z0 (A) — the machine would take "Send a new code" now (the code is asked for; the screen's new codes are not used up). */
  readonly canResend: boolean
  /** Which code request this is (the wait restarts with each). */
  readonly request: number
}

/** Z0 (A) — how long after a code was SENT "Send a new code" is offered (an SMS can take a while; ⛔ a deadline for the family). */
export const HANDOVER_RESEND_WAIT_MS = 60_000

export function HandoverCodePanel({
  state,
  onConfirm,
  onResend,
}: {
  state: HandoverPanelState
  onConfirm: (code: string) => void
  onResend: () => void
}): React.ReactElement {
  const t = useMemorialT()
  const [code, setCode] = useState('')
  // Z0 (A) — the code request whose wait has passed (keyed by request, so each new code starts its own wait).
  const codeShown = !state.noNominee && !state.sendFailed && state.masked !== null
  const [waitedFor, setWaitedFor] = useState<number | null>(null)
  useEffect(() => {
    if (!codeShown) return
    const request = state.request
    const timer = setTimeout(() => setWaitedFor(request), HANDOVER_RESEND_WAIT_MS)
    return () => clearTimeout(timer)
  }, [codeShown, state.request])
  const offerResend = state.canResend && !state.noNominee && (state.sendFailed || (codeShown && waitedFor === state.request))
  // R5 (checklist family 13 (d)) — the panel APPEARS after a 403, and what it says next (the code is asked for · the code
  // could not be sent · no nominee) is SPOKEN: its lines carry a live region (Android), iOS is told here. The two
  // announcements are separate so that a wrong code speaks on its own, and the next attempt does not re-read the first.
  const stateLine = state.noNominee
    ? t('handover.no_nominee')
    : state.sendFailed
      ? t('handover.send_failed')
      : state.masked !== null
        ? t('handover.body', { masked: state.masked })
        : null
  // The live-region VALUE comes from the plan by kind: a code that could not be sent / no nominee / a wrong code are errors
  // the family must act on (`assertive`); "the code was sent, please type it" is a status (`polite`).
  // Z0 (A) — with the SMS failed, "we can send a new code" is spoken WITH the failure (one announcement); after the wait, alone.
  const stateSpoken = stateLine !== null && state.sendFailed && offerResend ? `${stateLine} ${t('handover.resend_note')}` : stateLine
  const stateLive = useMemorialAnnounce(stateSpoken, { hasLiveRegion: true, kind: state.noNominee || state.sendFailed ? 'error' : 'status' })
  const resendLive = useMemorialAnnounce(offerResend && !state.sendFailed ? t('handover.resend_note') : null, { hasLiveRegion: true, kind: 'status' })
  const notVerifiedLive = useMemorialAnnounce(
    state.notVerified && state.masked !== null && !state.noNominee && !state.sendFailed ? t('handover.not_verified') : null,
    { hasLiveRegion: true, kind: 'error' },
  )
  return (
    <YStack gap="$2" testID="memorial-handover">
      <H3>{t('handover.title')}</H3>
      {state.noNominee ? (
        <Paragraph theme="yellow" accessibilityLiveRegion={stateLive} testID="memorial-handover-no-nominee">
          {t('handover.no_nominee')}
        </Paragraph>
      ) : state.sendFailed ? (
        <Paragraph theme="yellow" accessibilityLiveRegion={stateLive} testID="memorial-handover-send-failed">
          {t('handover.send_failed')}
        </Paragraph>
      ) : state.masked !== null ? (
        <YStack gap="$2">
          <Paragraph accessibilityLiveRegion={stateLive} testID="memorial-handover-body">
            {t('handover.body', { masked: state.masked })}
          </Paragraph>
          <Paragraph fontWeight="600">{t('handover.code_label')}</Paragraph>
          <Input
            testID="memorial-handover-code"
            keyboardType="number-pad"
            value={code}
            onChangeText={setCode}
            accessibilityLabel={t('handover.code_label')}
            // The refusal is LINKED to its field (AC13): while a code did not match, the field itself reads it as its hint.
            {...(state.notVerified ? { accessibilityHint: t('handover.not_verified') } : {})}
          />
          {state.notVerified ? (
            <Paragraph theme="yellow" accessibilityLiveRegion={notVerifiedLive} testID="memorial-handover-not-verified">
              {t('handover.not_verified')}
            </Paragraph>
          ) : null}
          <Button
            style={{ minHeight: 44 }}
            accessibilityRole="button"
            testID="memorial-handover-confirm"
            disabled={state.busy || code.trim() === ''}
            onPress={() => onConfirm(code.trim())}
          >
            {t('handover.confirm')}
          </Button>
        </YStack>
      ) : (
        <Spinner />
      )}
      {offerResend ? (
        <YStack gap="$2" testID="memorial-handover-resend-offer">
          <Paragraph accessibilityLiveRegion={resendLive} testID="memorial-handover-resend-note">
            {t('handover.resend_note')}
          </Paragraph>
          <Button
            style={{ minHeight: 44 }}
            accessibilityRole="button"
            testID="memorial-handover-resend"
            disabled={state.busy}
            onPress={() => {
              setCode('') // the typed code was for the code before
              onResend()
            }}
          >
            {t('handover.resend')}
          </Button>
        </YStack>
      ) : null}
      <CallHelplineCTA />
    </YStack>
  )
}
