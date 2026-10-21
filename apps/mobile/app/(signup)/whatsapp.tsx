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
// ONE mint per visit: after the first ticked Continue, whatever its outcome, the next Continue goes to payment (SB6). Every
// failure lets the member continue (I5). `t` is ⛔ in any effect's deps (`useT()` returns a fresh closure every render —
// [[project_uset_fresh_closure_memo_trap]]).
//
// ── Accessibility ──────────────────────────────────────────────────────────────────────────────
// The box announces its checked state; the overlay is modal to assistive tech; errors are `AnnouncedText kind='error'`; the
// overlay opening and the `sent` stage are phase changes, spoken through `useAnnounceOnChange` (both platforms).

import { useCallback, useEffect, useRef, useState } from 'react'
import { BackHandler, Linking, ScrollView, StyleSheet } from 'react-native'

import { ApiError } from '@twt/api-client'
import type { CreateWaOptInResponse } from '@twt/contracts'
import { useT } from '@twt/i18n/react'
import { useRouter } from 'expo-router'
import { Button, H2, Paragraph, Spinner, View, YStack } from 'tamagui'

import { AnnouncedText, useAnnounceOnChange } from '../../components/peer-request/announce'
import { OtherPhoneHint } from '../../components/notifications/OtherPhoneHint'
import { memberAuth } from '../../lib/member-api'
import { CALL_TIMEOUT_MS, withTimeout } from '../../lib/with-timeout'

/** A hung status read holds the spinner at most this long (the `CLAIM_ENTRY_READ_TIMEOUT_MS` precedent) — SB3. */
const STATUS_TIMEOUT_MS = 5_000

type Stage = 'loading' | 'ask' | 'sent'
/** `request` — the mint failed or timed out; `link` — WhatsApp did not open. */
type StepError = 'request' | 'link' | null
/** The reminder: never shown, open now, or shown and closed (a further unticked Continue goes straight on). */
type Reminder = 'never' | 'open' | 'shown'

export default function WhatsappStepScreen() {
  const t = useT()
  const router = useRouter()

  const [stage, setStage] = useState<Stage>('loading')
  const [checked, setChecked] = useState(false)
  const [reminderOpen, setReminderOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<StepError>(null)
  const [minted, setMinted] = useState<CreateWaOptInResponse | null>(null)
  // Refs, ⛔ state: two presses inside one frame both see the pre-update closure (a double tap must make ONE mint).
  const busyRef = useRef(false)
  const attempted = useRef(false)
  const reminder = useRef<Reminder>('never')
  const leaving = useRef(false)

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

  // Android's back while the reminder is open = "Go back" (closes it; the box stays as it was).
  useEffect(() => {
    if (!reminderOpen) return
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      closeReminder()
      return true
    })
    return () => sub.remove()
  }, [reminderOpen, closeReminder])

  const onContinue = useCallback(async (): Promise<void> => {
    if (busyRef.current) return
    if (stage === 'sent' || attempted.current) return goNext()
    if (!checked) {
      if (reminder.current === 'shown') return goNext()
      reminder.current = 'open'
      setReminderOpen(true)
      return
    }
    busyRef.current = true
    attempted.current = true
    setBusy(true)
    try {
      const res = await withTimeout(memberAuth.requestWaOptIn(), CALL_TIMEOUT_MS)
      setMinted(res)
      try {
        await Linking.openURL(res.deepLink)
      } catch {
        // The request landed but WhatsApp did not open; its PENDING expires on its own. Continue goes on.
        setError('link')
        return
      }
      // In the SAME update as the new stage, so the `sent` stage never renders under an old error.
      setError(null)
      setStage('sent')
    } catch (err) {
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
  }, [stage, checked, goNext])

  /** Re-open WhatsApp with the FIRST request's link — ⛔ a second mint (SB6). */
  const onReopen = useCallback(async (): Promise<void> => {
    if (!minted || busyRef.current) return
    busyRef.current = true
    setBusy(true)
    setError(null)
    try {
      await Linking.openURL(minted.deepLink)
    } catch {
      setError('link')
    } finally {
      busyRef.current = false
      setBusy(false)
    }
  }, [minted])

  useAnnounceOnChange(reminderOpen ? t('waSignup.popup_title') : null)
  useAnnounceOnChange(stage === 'sent' ? t('waSignup.sent_title') : null)

  if (stage === 'loading') {
    return (
      <YStack flex={1} justify="center" items="center" px="$6" bg="$background">
        <Spinner accessibilityLabel={t('loading')} testID="wa-signup-loading" />
      </YStack>
    )
  }

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
      <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
        <YStack gap="$4" px="$6" py="$6" bg="$background">
          <H2>{t('waSignup.title')}</H2>
          {stage === 'ask' ? (
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
                accessibilityRole="checkbox"
                accessibilityLabel={t('waSignup.box_label')}
                accessibilityState={{ checked }}
                onPress={() => setChecked((v) => !v)}
                testID="wa-signup-box"
              >
                {(checked ? '☑  ' : '☐  ') + t('waSignup.box_label')}
              </Button>
              <Paragraph color="$colorPress" accessibilityRole="text">
                {t('waSignup.box_hint')}
              </Paragraph>
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
              <OtherPhoneHint
                displayPhoneNumber={minted?.displayPhoneNumber ?? null}
                verificationPhrase={minted?.verificationPhrase ?? null}
              />
            </YStack>
          )}
          {error === 'request' ? <AnnouncedText kind="error" text={t('waSignup.request_failed')} /> : null}
          {error === 'link' ? <AnnouncedText kind="error" text={t('waSignup.link_failed')} /> : null}
          {continueButton}
        </YStack>
      </ScrollView>

      {/* The reminder — a rendered overlay, ⛔ Alert.alert (its cancel button is styled differently on each OS). A SIBLING
          of the ScrollView, so it covers the screen, ⛔ only the scroll content. BannerHost's shape, copied ⛔ imported. */}
      {reminderOpen ? (
        <View
          testID="wa-signup-reminder"
          justify="center"
          items="center"
          p="$4"
          accessibilityViewIsModal
          accessibilityLabel={t('waSignup.popup_a11y')}
          // Scrim + stacking: raw styles, as in BannerHost — neither is a themeable Tamagui token here.
          style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.45)', zIndex: 1000 }]}
        >
          <YStack gap="$3" bg="$background" rounded="$4" p="$4" width="100%" style={{ maxWidth: 420 }}>
            <H2>{t('waSignup.popup_title')}</H2>
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
        </View>
      ) : null}
    </YStack>
  )
}
