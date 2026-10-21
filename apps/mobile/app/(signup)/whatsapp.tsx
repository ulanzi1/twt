// Signup WhatsApp step — an UNTICKED "Send me WhatsApp messages from TWT" box (Story 5.10; Decision 2026-10-21-375).
//
// Architecture §3.4's ratified onboarding offer, built as its own wizard step immediately before payment (SB2 (d)):
//   loading — the status read (bounded at STATUS_TIMEOUT_MS); WhatsApp not available for the Pariwar, the member already
//             ACTIVE, or a read that fails or hangs → straight on to payment, showing nothing (SB3 (a); I5).
//   ask     — the box, ⛔ ever pre-ticked (I1) and ⛔ bundled with the Terms (I2). Ticked + Continue makes the SAME request as
//             the "WhatsApp notifications" screen — mint a PENDING, then open WhatsApp with the message to send (SB1 (a)).
//             The box only ASKS: the member's own sent message turns WhatsApp on, through the unchanged worker (I3).
//             Unticked + Continue shows ONE reminder (SB4) — a rendered overlay, ⛔ `Alert.alert`, two buttons of identical
//             weight; "Go back" closes it and ⛔ ticks the box; a second unticked Continue goes straight on (I4).
//   sent    — WhatsApp opened: send the message there; "Open WhatsApp again" re-opens the FIRST link (⛔ second mint); the
//             "WhatsApp on another phone?" hint (SB12); Continue → payment. ⛔ Waiting or polling here (SB6).
// Story 5.13 (Decision 2026-10-21-374 option A; build decisions -376 WC6, WC7): when the mint says the code route can work
// (`codeAvailable || liveCode`), the `sent` stage's hint is REPLACED by `OtherPhoneCodeHint` — a WhatsApp code sent to the
// registered number and typed back here; otherwise `OtherPhoneHint` renders exactly as 5.10 built it. On the `ask` stage the code
// link shows ONLY after a mint whose link did ⛔ open (`error === 'link'`, a rare path) under the same condition. A correct code
// sets `activated`: whichever stage body shows is replaced by `waCode.done`, spoken from HERE (the form has unmounted), and the
// `sent` stage's return-to-TWT announcement is ⛔ made after it. Continue → payment as before (AC13 — ⛔ form state blocks it).
// ONE mint per visit: after the first ticked Continue, whatever its outcome, the next Continue goes to payment (SB6). Every
// failure lets the member continue (I5). `t` is ⛔ in any effect's deps (`useT()` returns a fresh closure every render —
// [[project_uset_fresh_closure_memo_trap]]).
//
// ── Accessibility ──────────────────────────────────────────────────────────────────────────────
// The box announces its checked state; the reminder is a window-level RN `Modal`, so the wizard's progress header and the box
// behind it are out of reach while it is open (second review D1 (a)); errors are `AnnouncedText kind='error'`. The step's title
// when the box appears and the reminder's title when it opens are phase changes, spoken through `useAnnounceOnChange` (both
// platforms). The reminder's heading is named by its visible title FOLLOWED by the instruction — spoken whenever the heading is
// read, and readable again (⛔ a hint some members switch off, ⛔ a one-time announcement). ⚠ Un-attested on a device: whether focus moving into
// the Modal's window also reads the heading, so the title is heard twice. The `sent` stage arrives as WhatsApp takes the
// foreground, so it is spoken when the member is back in TWT (second review P1).

import { useCallback, useEffect, useRef, useState } from 'react'
import { AccessibilityInfo, AppState, Linking, Modal, ScrollView, StyleSheet } from 'react-native'

import { ApiError } from '@twt/api-client'
import type { CreateWaOptInResponse } from '@twt/contracts'
import { useT } from '@twt/i18n/react'
import { useFocusEffect, useRouter } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Button, H2, Paragraph, Spinner, View, YStack } from 'tamagui'

import { AnnouncedText, useAnnounceOnChange } from '../../components/peer-request/announce'
import { OtherPhoneCodeHint } from '../../components/notifications/OtherPhoneCodeHint'
import { OtherPhoneHint } from '../../components/notifications/OtherPhoneHint'
import { memberAuth } from '../../lib/member-api'
import { CALL_TIMEOUT_MS, withTimeout } from '../../lib/with-timeout'

/** A hung status read holds the spinner at most this long (the `CLAIM_ENTRY_READ_TIMEOUT_MS` precedent) — SB3. */
const STATUS_TIMEOUT_MS = 5_000
/** If the app never leaves the foreground after WhatsApp "opened", the `sent` stage is spoken after this long instead. */
const SENT_ANNOUNCE_GRACE_MS = 2_000

type Stage = 'loading' | 'ask' | 'sent'
/** `request` — the mint failed or timed out; `link` — WhatsApp did not open. */
type StepError = 'request' | 'link' | null
/** The reminder: never shown, open now, or shown and closed (a further unticked Continue goes straight on). */
type Reminder = 'never' | 'open' | 'shown'

export default function WhatsappStepScreen() {
  const t = useT()
  const router = useRouter()
  const insets = useSafeAreaInsets()

  const [stage, setStage] = useState<Stage>('loading')
  const [checked, setChecked] = useState(false)
  const [reminderOpen, setReminderOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<StepError>(null)
  const [minted, setMinted] = useState<CreateWaOptInResponse | null>(null)
  // Story 5.13 — a typed WhatsApp code switched WhatsApp on (the form called back).
  const [activated, setActivated] = useState(false)
  const activatedRef = useRef(false)
  // Refs, ⛔ state: two presses inside one frame both see the pre-update closure (a double tap must make ONE mint).
  const busyRef = useRef(false)
  // The box's latest tap, for a Continue pressed in the same frame (before `checked` re-renders): the last tap wins.
  const checkedRef = useRef(false)
  const attempted = useRef(false)
  const reminder = useRef<Reminder>('never')
  const leaving = useRef(false)
  const actionVersion = useRef(0)
  /** Where the `sent` stage has been spoken: ⛔ yet, only by the grace (the member may not have heard it), or on a return. */
  const sentSpoken = useRef<'no' | 'grace' | 'return'>('no')

  // A request may finish after navigation blurs or unmounts this step. Invalidate its continuation even if the member
  // returns before the response arrives, so an abandoned request cannot open another app or replace the current route.
  useFocusEffect(useCallback(() => () => { actionVersion.current += 1 }, []))

  const goNext = useCallback(() => {
    if (leaving.current) return
    leaving.current = true
    router.replace('/(signup)/payment')
  }, [router])

  useEffect(() => {
    let cancelled = false
    withTimeout(memberAuth.getWaOptInStatus(), STATUS_TIMEOUT_MS).then(
      (status) => {
        if (cancelled) return
        if (!status.available || status.state === 'ACTIVE') goNext()
        else setStage('ask')
      },
      () => {
        if (!cancelled) goNext()
      },
    )
    return () => {
      cancelled = true
    }
  }, [goNext])

  const closeReminder = useCallback(() => {
    reminder.current = 'shown'
    setReminderOpen(false)
  }, [])

  const onContinue = useCallback(async (): Promise<void> => {
    if (busyRef.current || leaving.current) return
    if (stage === 'sent' || attempted.current) return goNext()
    if (!checkedRef.current) {
      if (reminder.current === 'shown') return goNext()
      reminder.current = 'open'
      setReminderOpen(true)
      return
    }
    busyRef.current = true
    attempted.current = true
    setBusy(true)
    const version = ++actionVersion.current
    const isCurrent = () => actionVersion.current === version && !leaving.current
    try {
      const res = await withTimeout(memberAuth.requestWaOptIn(), CALL_TIMEOUT_MS)
      if (!isCurrent()) return
      setMinted(res)
      try {
        await Linking.openURL(res.deepLink)
      } catch {
        if (!isCurrent()) return
        // The request landed but WhatsApp did not open; its PENDING expires on its own. Continue goes on.
        setError('link')
        return
      }
      if (!isCurrent()) return
      // In the SAME update as the new stage, so the `sent` stage never renders under an old error.
      setError(null)
      setStage('sent')
    } catch (err) {
      if (!isCurrent()) return
      // Already on, or switched off meanwhile: nothing to ask — straight on.
      if (err instanceof ApiError && (err.code === 'wa_opt_in.already_active' || err.code === 'wa_opt_in.channel_unavailable')) {
        goNext()
        return
      }
      setError('request')
    } finally {
      busyRef.current = false
      setBusy(false)
    }
  }, [stage, goNext])

  /** Re-open WhatsApp with the FIRST request's link — ⛔ a second mint (SB6). */
  const onReopen = useCallback(async (): Promise<void> => {
    if (!minted || busyRef.current || leaving.current) return
    busyRef.current = true
    setBusy(true)
    setError(null)
    const version = ++actionVersion.current
    try {
      await Linking.openURL(minted.deepLink)
    } catch {
      if (actionVersion.current === version && !leaving.current) setError('link')
    } finally {
      busyRef.current = false
      setBusy(false)
    }
  }, [minted])

  /** Story 5.13 (WC7) — a correct code: the showing stage body becomes `waCode.done`, any error line clears. */
  const onActivated = useCallback(() => {
    activatedRef.current = true
    setActivated(true)
    setError(null)
  }, [])

  useAnnounceOnChange(stage === 'ask' && !activated ? t('waSignup.title') : null)
  useAnnounceOnChange(reminderOpen ? t('waSignup.popup_title') : null)
  // Story 5.13 — spoken from the step: the form that confirmed the code has unmounted.
  useAnnounceOnChange(activated ? t('waCode.done') : null)

  // `setStage('sent')` lands as WhatsApp takes the foreground (Android resolves `openURL` once the intent starts; iOS after the
  // switch), so an announcement then is lost. Speak it on the member's first return to TWT — or, if the app has not left after
  // a short grace, then. A grace announcement may itself be lost (a slow phone backgrounds late), so it does ⛔ stop the
  // return from speaking once more. At most once on a return, per mount. Unlike `notifications.tsx:149` (5.12 P6), which DROPS
  // an announcement made in the background, this one is DEFERRED to the return. ⚠ Device timing is un-attested.
  const sentTitle = t('waSignup.sent_title')
  useEffect(() => {
    // Story 5.13 — ⛔ "send the message in WhatsApp" once a code has switched WhatsApp on.
    if (stage !== 'sent' || activated || sentSpoken.current === 'return') return
    // Only a real departure counts: an iOS `inactive` blip (Control Centre, a call banner, Face ID) leaves TWT on screen.
    let left = AppState.currentState === 'background'
    // The grace found TWT ⛔ in front (`inactive` — e.g. the app switcher): it waits for the member's return instead.
    let deferred = false
    const sub = AppState.addEventListener('change', (next) => {
      if (next === 'background') left = true
      else if (next === 'active' && (left || deferred) && sentSpoken.current !== 'return' && !activatedRef.current) {
        sentSpoken.current = 'return'
        AccessibilityInfo.announceForAccessibility(sentTitle)
      }
    })
    const grace = setTimeout(() => {
      if (left || sentSpoken.current !== 'no' || activatedRef.current) return
      if (AppState.currentState !== 'active') {
        deferred = true
        return
      }
      sentSpoken.current = 'grace'
      AccessibilityInfo.announceForAccessibility(sentTitle)
    }, SENT_ANNOUNCE_GRACE_MS)
    return () => {
      sub.remove()
      clearTimeout(grace)
    }
  }, [stage, sentTitle, activated])

  if (stage === 'loading') {
    return (
      <YStack flex={1} justify="center" items="center" px="$6" bg="$background">
        <Spinner accessibilityLabel={t('loading')} testID="wa-signup-loading" />
      </YStack>
    )
  }

  // Story 5.13 (WC7, AC1) — the code route, only where it can work.
  const codeRoute = minted !== null && (minted.codeAvailable || minted.liveCode)
  const codeHint = minted !== null && codeRoute ? <OtherPhoneCodeHint minted={minted} onActivated={onActivated} /> : null

  const continueButton = (
    <Button
      theme="accent"
      height={56}
      disabled={busy}
      accessibilityRole="button"
      accessibilityLabel={t('waSignup.continue')}
      accessibilityState={{ disabled: busy }}
      onPress={() => void onContinue()}
      testID="wa-signup-continue"
    >
      {busy ? <Spinner /> : t('waSignup.continue')}
    </Button>
  )

  return (
    <YStack flex={1} bg="$background">
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} testID="wa-signup-content">
        <YStack gap="$4" px="$6" py="$6" bg="$background">
          <H2>{t('waSignup.title')}</H2>
          {activated ? (
            <Paragraph fontWeight="600" testID="wa-code-done">
              {t('waCode.done')}
            </Paragraph>
          ) : stage === 'ask' ? (
            <>
              <Paragraph color="$colorPress" accessibilityRole="text">
                {t('waSignup.intro')}
              </Paragraph>
              {/* The box — UNTICKED on every visit; only the member's own tap ticks it (I1). */}
              <Button
                size="$3"
                theme={checked ? 'accent' : undefined}
                chromeless={!checked}
                justify="flex-start"
                // Locked while the request is in flight: an untick then could not stop WhatsApp opening (second review P3).
                disabled={busy}
                accessibilityRole="checkbox"
                accessibilityLabel={t('waSignup.box_label')}
                accessibilityState={{ checked, disabled: busy }}
                // The ref as well: `disabled` lands only on the next render, and a tap in that frame must not untick the box.
                onPress={() => {
                  if (busyRef.current) return
                  checkedRef.current = !checkedRef.current
                  setChecked(checkedRef.current)
                }}
                testID="wa-signup-box"
              >
                {(checked ? '☑  ' : '☐  ') + t('waSignup.box_label')}
              </Button>
              <Paragraph color="$colorPress" accessibilityRole="text">
                {t('waSignup.box_hint')}
              </Paragraph>
              {/* Story 5.13 — after a mint whose link did ⛔ open (rare: `https://wa.me/…` usually opens a browser), the code route
                  under the same condition; otherwise this stage renders exactly as 5.10 built it (⛔ hint). */}
              {error === 'link' ? codeHint : null}
            </>
          ) : (
            <YStack gap="$3" testID="wa-signup-sent">
              <Paragraph fontWeight="600">{t('waSignup.sent_title')}</Paragraph>
              <Paragraph>{t('waSignup.sent_desc')}</Paragraph>
              <Button
                disabled={busy}
                accessibilityRole="button"
                accessibilityLabel={t('waNotifications.pending_resend')}
                onPress={() => void onReopen()}
                testID="wa-signup-reopen"
              >
                {t('waNotifications.pending_resend')}
              </Button>
              {codeHint ?? (
                <OtherPhoneHint
                  displayPhoneNumber={minted?.displayPhoneNumber ?? null}
                  verificationPhrase={minted?.verificationPhrase ?? null}
                />
              )}
            </YStack>
          )}
          {error === 'request' ? <AnnouncedText kind="error" text={t('waSignup.request_failed')} /> : null}
          {error === 'link' ? <AnnouncedText kind="error" text={t('waSignup.link_failed')} /> : null}
          {continueButton}
        </YStack>
      </ScrollView>

      {/* The reminder — a transparent RN `Modal`, ⛔ Alert.alert (its cancel button is styled differently on each OS). A window of
          its own: it covers the wizard's progress header as well as this screen, assistive tech cannot leave it on either OS,
          and Android's back is its `onRequestClose` = "Go back" (closes it; the box stays as it was). Second review D1 (a). */}
      <Modal transparent visible={reminderOpen} animationType="fade" onRequestClose={closeReminder}>
        <View
          testID="wa-signup-reminder"
          justify="center"
          items="center"
          p="$4"
          // A window of its own reaches under the system bars (edge-to-edge): keep the card clear of them.
          pt={insets.top + 16}
          pb={insets.bottom + 16}
          accessibilityViewIsModal
          // Scrim: a raw style, as in BannerHost — it is ⛔ a themeable Tamagui token here.
          style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.45)' }]}
        >
          <ScrollView
            style={{ maxHeight: '100%', width: '100%', maxWidth: 420, flexGrow: 0 }}
            testID="wa-signup-reminder-scroll"
          >
            <YStack gap="$3" bg="$background" rounded="$4" p="$4">
              {/* Named by its visible title first (second review P4), then the instruction — spoken every time it is read. */}
              <H2
                accessible
                accessibilityLabel={`${t('waSignup.popup_title')} ${t('waSignup.popup_a11y')}`}
                testID="wa-signup-reminder-instruction"
              >
                {t('waSignup.popup_title')}
              </H2>
              <Paragraph>{t('waSignup.popup_body')}</Paragraph>
              {/* Two choices of EQUAL weight (SB4): the same component, size and theme — neither is primary. "Go back"
                  closes the reminder and ⛔ ticks the box (I1 — the member ticks it themselves). */}
              <Button
                height={56}
                accessibilityRole="button"
                accessibilityLabel={t('waSignup.popup_back')}
                onPress={closeReminder}
                testID="wa-signup-reminder-back"
              >
                {t('waSignup.popup_back')}
              </Button>
              <Button
                height={56}
                accessibilityRole="button"
                accessibilityLabel={t('waSignup.popup_proceed')}
                onPress={() => {
                  closeReminder()
                  goNext()
                }}
                testID="wa-signup-reminder-proceed"
              >
                {t('waSignup.popup_proceed')}
              </Button>
            </YStack>
          </ScrollView>
        </View>
      </Modal>
    </YStack>
  )
}
