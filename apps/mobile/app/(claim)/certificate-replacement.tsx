// The death-certificate REPLACEMENT screen — Story 6.21b (D2).
//
// Opened from the shepherd notice's upload button. A FRESH D1 read runs before the screen shows
// anything (the entry gate), and the gate reads the MARKER-RESOLVED notice (D1 rule 4 — ⛔ never
// upload twice while the first is still processing), ⛔ not the raw read:
//   · no upload offered ⇒ the server's row through the SAME notice component, NO button — or, when that
//     row renders nothing (`not_needed`), straight back to the shepherd screen (BW-J6 — ⛔ never a blank
//     screen, never "failed", never a "not refused" line the server no longer supports);
//   · an upload offered ⇒ the SAME view function's title/body/reassurance (D3 — so a certificate put off
//     at filing is ⛔ never called "a NEW certificate"), the picker, and the shared upload hook
//     (`use-death-certificate-upload.ts`, the SAME one `document.tsx` uses — never a second copy).
// A `step_up_required` outcome runs the HANDOVER OTP (the nominee's, ⛔ never `useStepUpGate` — the wrong
// phone) via `use-handover-otp.ts`; after a successful verify the upload RETRIES with the file already
// picked (⛔ never re-picked).
//
// Leaving: `router.back()` when there is a screen to go back to (the shepherd pushed us, and it refetches
// on focus), else `router.replace` — ⛔ never a second shepherd stacked on the first (code review
// 2026-09-27; D3's letter said `replace`, recorded as a deviation in the story file).
//
// A SETTLED outcome (sent, or the two 409s "already waiting"/"already accepted") shows ONLY its line, then
// leaves like a success. Every announced line (load error, outcome, picker permission, OTP error, the
// helpline-only line) is spoken
// on BOTH platforms through `announcementPlan` — its live-region value AND its iOS announce (V2) — ⛔
// never a hard-coded live-region value.
//
// ⛔ Chrome: a plain `YStack`, like `shepherd.tsx` — NOT `<ClaimProxyFlowShell>` (it would render the
// filing wizard's save-and-resume affordance, V3). ⛔ Not added to `CLAIM_STEPS` — no "Step N of M".
// ⛔ None of `document.help` / `.defer` / `.saved` ever renders here (invariant 2 — no deadline copy).

import { useEffect, useRef, useState } from 'react'

import { useLocalSearchParams, useRouter } from 'expo-router'
import { AccessibilityInfo, Platform } from 'react-native'
import { Button, Input, Paragraph, Spinner, Text, YStack } from 'tamagui'

import { CallHelplineCTA } from '../../components/common/CallHelplineCTA'
import { DeathCertificateNotice } from '../../components/claim/DeathCertificateNotice'
import { useClaimT } from '../../lib/claim-i18n'
import { announcementPlan } from '../../lib/death-certificate-announce'
import { isSettledOutcome } from '../../lib/death-certificate-upload-outcome'
import { certificateNoticeCopy, HELPLINE_LABEL_KEY } from '../../lib/death-certificate-view'
import { useDeathCertificateStatus } from '../../lib/use-death-certificate-status'
import { useDeathCertificateUpload } from '../../lib/use-death-certificate-upload'
import { useHandoverOtp } from '../../lib/use-handover-otp'

/** The 6.18 `nominee-review.tsx` precedent — long enough for the live region to be read before nav. */
const OUTCOME_ANNOUNCEMENT_DELAY_MS = 1200

export default function CertificateReplacementScreen(): React.ReactElement {
  const t = useClaimT()
  const router = useRouter()
  const params = useLocalSearchParams<{ claimCaseId?: string }>()
  const claimCaseId = typeof params.claimCaseId === 'string' ? params.claimCaseId : undefined
  const mountedRef = useRef(true)
  useEffect(
    () => () => {
      mountedRef.current = false
    },
    [],
  )

  const status = useDeathCertificateStatus(claimCaseId)
  // The marker-resolved view decides whether an upload is OFFERED (rule 4); the RAW read is only the
  // marker's write context.
  const uploadOffered = status.phase === 'ready' && status.notice !== null && status.notice.uploadAllowed
  const writeContext =
    uploadOffered && status.freshRead
      ? { statusAtWrite: status.freshRead.status, tokenAtWrite: status.freshRead.certificate_token }
      : null
  const uploadHook = useDeathCertificateUpload(claimCaseId, writeContext)
  const otp = useHandoverOtp()
  const [otpCode, setOtpCode] = useState('')
  const [otpMode, setOtpMode] = useState(false)
  // The step-up is tried ONCE after a verify: a verified code whose retry is STILL refused (the gate maps
  // a DB error to `step_up_required`) goes to the helpline, ⛔ never another SMS round trip (code review
  // 2026-09-27).
  const stepUpRetriedRef = useRef(false)
  const [stepUpExhausted, setStepUpExhausted] = useState(false)

  const outcome = uploadHook.state.phase === 'done' ? uploadHook.state.outcome : null
  // Sent, or the server already has one (the two 409s): the matter is settled for now — show ONLY the
  // outcome line (⛔ never the stale "a new certificate is needed" copy above "we have it"), hold, leave.
  const settled = outcome !== null && isSettledOutcome(outcome)
  const failed =
    outcome?.kind === 'too_large' || outcome?.kind === 'unsupported_media_type' || outcome?.kind === 'generic_failure'
  // The i18n key an OUTCOME (⛔ not the picker's own permission failure) is announced/shown with —
  // `null` for outcomes with no direct message (`step_up_required`, `upload_not_allowed`).
  const outcomeMessageKey: string | null =
    outcome?.kind === 'certificate_accepted'
      ? 'certificate.accepted'
      : outcome?.kind === 'certificate_awaiting_review' || outcome?.kind === 'success'
        ? 'certificate.awaiting_review'
        : failed
          ? 'document.upload_failed'
          : null
  const outcomePlan = announcementPlan(Platform.OS, failed ? 'error' : 'status')
  const errorPlan = announcementPlan(Platform.OS, 'error')

  // What is spoken right now, if anything — ONE place, so every announced state reaches VoiceOver too.
  // Keyed on the KEYS/strings, ⛔ never on `t` ([[project_uset_fresh_closure_memo_trap]]).
  const permissionNeeded = uploadHook.state.permissionNeeded
  const helplineOnly = otpMode && (otp.noNominee || stepUpExhausted)
  const spokenKey: string | null =
    status.phase === 'error'
      ? 'relationship.error'
      : otpMode
        ? helplineOnly
          ? HELPLINE_LABEL_KEY
          : null
        : (outcomeMessageKey ?? (permissionNeeded ? 'document.permission_needed' : null))
  useEffect(() => {
    if (spokenKey === null) return
    if (announcementPlan(Platform.OS).iosAnnounce) AccessibilityInfo.announceForAccessibility(t(spokenKey))
  }, [spokenKey, outcome])
  // The OTP error is already a resolved string (the hook translates it).
  useEffect(() => {
    if (otp.error === null) return
    if (announcementPlan(Platform.OS).iosAnnounce) AccessibilityInfo.announceForAccessibility(otp.error)
  }, [otp.error])

  // ONE leave per screen — the `upload_not_allowed` refetch and the `leaveBlank` effect can both ask.
  const leftRef = useRef(false)
  function leaveToShepherd(): void {
    if (!claimCaseId || leftRef.current || !mountedRef.current) return
    leftRef.current = true
    if (router.canGoBack()) router.back()
    else router.replace(`/(claim)/shepherd?claimCaseId=${encodeURIComponent(claimCaseId)}`)
  }

  // Enter OTP mode on a step-up-required outcome; send the OTP on entry. `otp.send` closes over
  // `useClaimT()`'s fresh-per-render `t` ([[project_uset_fresh_closure_memo_trap]]) — keyed on
  // `outcome`/`otpMode` only, never on `otp.send` itself.
  useEffect(() => {
    if (outcome?.kind === 'step_up_required' && !otpMode) {
      setOtpMode(true)
      if (stepUpRetriedRef.current) setStepUpExhausted(true)
      else void otp.send()
    }
  }, [outcome, otpMode])

  // `upload_not_allowed` — the claim left the window between the read and the upload: refetch D1,
  // and if an upload is no longer offered, go back to the shepherd screen, which renders the server's
  // fresh row through the SAME notice component (BW-J6).
  useEffect(() => {
    if (outcome?.kind !== 'upload_not_allowed' || !claimCaseId) return
    let cancelled = false
    void status.refetch().then((next) => {
      if (cancelled || !mountedRef.current) return
      if (!next.notice?.uploadAllowed) leaveToShepherd()
      else uploadHook.reset() // still offered (the state moved back) — offer the picker again, ⛔ no dead end
    })
    return () => {
      cancelled = true
    }
  }, [outcome, claimCaseId])

  // Settled (sent, or already waiting/accepted): hold long enough for the announcement above to be read,
  // then return to the shepherd screen (which renders the fresh server row through the SAME notice).
  useEffect(() => {
    if (!settled || !claimCaseId) return
    const timer = setTimeout(() => {
      if (!mountedRef.current) return
      leaveToShepherd()
    }, OUTCOME_ANNOUNCEMENT_DELAY_MS)
    return () => clearTimeout(timer)
  }, [outcome, claimCaseId])

  // The entry read offers no upload AND its row renders nothing (`not_needed` — the claim left the
  // window between the shepherd's read and this one): back to the shepherd, ⛔ never a blank screen.
  const noticeCopy = status.notice ? certificateNoticeCopy(status.notice) : null
  const rendersNothing = noticeCopy !== null && noticeCopy.titleKey === null && noticeCopy.bodyKey === null
  const leaveBlank = status.phase === 'ready' && !uploadOffered && rendersNothing
  useEffect(() => {
    if (leaveBlank) leaveToShepherd()
  }, [leaveBlank])

  async function onVerify(): Promise<void> {
    const verified = await otp.verify(otpCode)
    if (verified) {
      stepUpRetriedRef.current = true
      setOtpMode(false)
      setOtpCode('')
      await uploadHook.retryWithPickedFile()
    }
  }

  const busy = uploadHook.state.phase === 'uploading' || uploadHook.picking || otp.busy

  // ── The entry gate: a fresh read is required before ANYTHING renders past loading ──────────────
  if (status.phase === 'loading' || leaveBlank) {
    return (
      <YStack flex={1} p="$4" pt="$6" testID="certificate-replacement-loading">
        <Spinner size="small" />
      </YStack>
    )
  }
  if (status.phase === 'error' || !status.freshRead || !status.notice || !claimCaseId) {
    return (
      <YStack flex={1} p="$4" gap="$3" pt="$6" testID="certificate-replacement-error">
        <Text accessibilityRole="alert" accessibilityLiveRegion={errorPlan.liveRegion}>
          {t('relationship.error')}
        </Text>
        <Button onPress={() => void status.refetch()} accessibilityLabel={t('document.retry')}>
          {t('document.retry')}
        </Button>
        <CallHelplineCTA label={t(HELPLINE_LABEL_KEY)} />
      </YStack>
    )
  }
  if (!uploadOffered) {
    return (
      <YStack flex={1} p="$4" gap="$4" pt="$6" testID="certificate-replacement-not-allowed">
        <DeathCertificateNotice notice={status.notice} onUploadPress={null} />
      </YStack>
    )
  }

  const copy = certificateNoticeCopy(status.notice)
  const otherPicker = uploadHook.lastPicker === 'file' ? 'photo' : 'file'

  return (
    <YStack flex={1} p="$4" gap="$4" pt="$6" testID="certificate-replacement-screen">
      {/* The entry read's ask ("a new certificate is needed…") — ⛔ never beside a settled outcome. */}
      {!settled && copy.titleKey ? (
        <Text fontSize="$7" fontWeight="700" accessibilityRole="header">
          {t(copy.titleKey)}
        </Text>
      ) : null}
      {!settled && copy.bodyKey ? <Paragraph>{t(copy.bodyKey)}</Paragraph> : null}
      {!settled && copy.reassuranceKey ? <Paragraph color="$colorPress">{t(copy.reassuranceKey)}</Paragraph> : null}

      {otpMode ? (
        helplineOnly ? (
          // V4 (BW-J3) — the step-up can never be passed with no reachable nominee, or its one retry was
          // refused again. ⛔ Never `otp.no_nominee` (it says "we'll help you file", false on a filed
          // claim). The helpline is the only way out — announced (family 13(d)), ⛔ not merely shown.
          <YStack accessibilityLiveRegion={errorPlan.liveRegion}>
            <CallHelplineCTA label={t(HELPLINE_LABEL_KEY)} />
          </YStack>
        ) : (
          <YStack gap="$3">
            <Paragraph color="$colorPress">{t('otp.help', { mobile: otp.masked ?? '…' })}</Paragraph>
            <Input
              value={otpCode}
              onChangeText={setOtpCode}
              keyboardType="number-pad"
              placeholder="••••••"
              maxLength={6}
              autoFocus
              accessibilityLabel={t('otp.prompt')}
            />
            {otp.error ? (
              <Text accessibilityRole="alert" accessibilityLiveRegion={errorPlan.liveRegion}>
                {otp.error}
              </Text>
            ) : null}
            <Button
              theme="accent"
              disabled={busy || otpCode.length < 6}
              onPress={() => void onVerify()}
              accessibilityLabel={t('otp.verify')}
              accessibilityState={{ busy, disabled: busy || otpCode.length < 6 }}
            >
              {busy ? <Spinner /> : t('otp.verify')}
            </Button>
            <Button chromeless disabled={busy} onPress={() => void otp.send()} accessibilityLabel={t('otp.resend')}>
              {t('otp.resend')}
            </Button>
            {/* The code may never arrive, or keep hitting the rate limit — the helpline stays in reach. */}
            <CallHelplineCTA label={t(HELPLINE_LABEL_KEY)} />
          </YStack>
        )
      ) : (
        <>
          {outcomeMessageKey !== null ? (
            <Text
              accessibilityRole={failed ? 'alert' : undefined}
              accessibilityLiveRegion={outcomePlan.liveRegion}
            >
              {t(outcomeMessageKey)}
            </Text>
          ) : permissionNeeded ? (
            <Text accessibilityRole="alert" accessibilityLiveRegion={errorPlan.liveRegion}>
              {t('document.permission_needed')}
            </Text>
          ) : null}

          {outcome === null ? (
            <>
              <Button disabled={busy} onPress={() => void uploadHook.pickPhoto()} accessibilityLabel={t('document.pick_photo')}>
                {t('document.pick_photo')}
              </Button>
              <Button disabled={busy} onPress={() => void uploadHook.pickFile()} accessibilityLabel={t('document.pick_file')}>
                {t('document.pick_file')}
              </Button>
              {uploadHook.state.phase === 'uploading' ? (
                <YStack gap="$2">
                  <Spinner size="small" />
                  <Text color="$colorPress">{t('document.uploading')}</Text>
                </YStack>
              ) : null}
            </>
          ) : failed ? (
            // Retry REOPENS the picker the family last used (BW-J9 — ⛔ never re-sends a file that would
            // fail again), and the OTHER picker sits beside it, so a too-large photo can be swapped for
            // a file (code review 2026-09-27).
            <YStack gap="$2">
              <Button
                disabled={busy}
                onPress={() => void (uploadHook.lastPicker === 'file' ? uploadHook.pickFile() : uploadHook.pickPhoto())}
                accessibilityLabel={t('document.retry')}
              >
                {t('document.retry')}
              </Button>
              <Button
                chromeless
                disabled={busy}
                onPress={() => void (otherPicker === 'file' ? uploadHook.pickFile() : uploadHook.pickPhoto())}
                accessibilityLabel={t(otherPicker === 'file' ? 'document.pick_file' : 'document.pick_photo')}
              >
                {t(otherPicker === 'file' ? 'document.pick_file' : 'document.pick_photo')}
              </Button>
            </YStack>
          ) : null}

          {!settled && copy.helplineLabelKey ? <CallHelplineCTA label={t(copy.helplineLabelKey)} /> : null}
        </>
      )}
    </YStack>
  )
}
