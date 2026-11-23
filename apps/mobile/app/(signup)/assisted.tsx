// Signup "Did someone help you register?" step (Story 3.15, Task 3; DL7, DL8, DL9; author-commit 2026-11-22-494).
//
// Its own wizard step right after the terms (`tc` → `assisted` → `kyc`):
//   loading — the status read (bounded at STATUS_TIMEOUT_MS); a code already recorded, or a read that fails or hangs → straight
//             on to KYC, showing nothing (N1 — it never blocks or delays a signup).
//   ask     — the question with two buttons of EQUAL weight, Yes / No. No → KYC with ⛔ request (DL5).
//   code    — a 6-digit number box, Continue and "Continue without a code". Continue: not 6 digits → the "6 digits" line, ⛔
//             request; else ONE POST (refs, ⛔ state, so a double tap makes one). 201 / 200 → "saved", then on; 422 → the
//             not-found line under the box (the member may retry or continue without); 400 → the "6 digits" line; 409 / 429 /
//             5xx / timeout → on to KYC with ⛔ message (N1).
// N2 — nothing here names or describes the worker: the server answers only `{ recorded }`.
// Review R1 — while the POST is open a change to the box is ignored (the box stays editable so focus and the keyboard stay —
// Story 3.15a W2 (i)); React Native restores the controlled value, so the box shows the code that was SENT: a capture is
// permanent, so the screen must never say "saved" (or show a not-found line) beside digits other than the ones it SENT.
// ⛔ `disabled` on the box: tamagui maps it to `editable={false}`, which on Android disables the view — focus leaves it and the
// keyboard closes (the 3.15 review W2 (i), confirmed on the emulator).
// Review R2 — every continuation that navigates is bound to FOCUS: the status read and the "saved" timer run only while the step
// is focused, and are cancelled on blur (a route pushed over the still-mounted step must ⛔ be replaced by KYC). On re-focus a
// step still `loading` reads the status again, and a `saved` step shows its line again before moving on — never stuck (N1).
// Review P3 — a POST that settles while the step is blurred keeps its RESULT (the saved line, the error line, or "move on") and only
// its NAVIGATION waits for focus: the capture is permanent, so the screen must never forget that it was made.
// Review P7 — "Continue without a code" stays enabled while the POST is pending (N1): `goNext` sets `leaving`, which drops the
// POST's late result; a capture that still lands is stored, as it is when the POST times out.
// ⛔ a lock-in step (`payment.tsx`'s `LockInGateStep` is unchanged). A skipped step is ⛔ subtracted from "Step N of M" (the
// whatsapp `-375` accepted cost). `t` is ⛔ in any effect's deps ([[project_uset_fresh_closure_memo_trap]]).
//
// ── Accessibility ──────────────────────────────────────────────────────────────────────────────
// The question is spoken when it appears, and so is the code box when Yes reveals it (by its label — review R3)
// (`useAnnounceOnChange`). The not-found and format lines are PLAIN text (`accessibilityRole="alert"` — on Android a role
// description only, ⛔ a live region), SENT ONCE by `announceForAccessibility` on both platforms each time an error is SET,
// once the step is focused (Story 3.15a V1, DL2): as live regions TalkBack re-read them on the edit that cleared them (the 3.15
// device pass; 6.36f D1 — [[project_android_live_region_reread_on_rerender]]). TalkBack drops an announcement identical to one
// it was already sent (3.15a V4), so a REPEAT is sent as different text by the shared `announce()` (`lib/announce.ts`, Story
// 3.15b — trailing no-break spaces, Android only; 3.15a review P1 had its own counter here). The saved line stays `AnnouncedText kind='status'`. The two choice buttons share one component, size and theme. "Continue without a code" is long
// in Hindi: its own `Text` inside a `noTextWrap` button so it wraps ([[project_tamagui_button_text_one_line]] — ⚠ wrapping is
// un-attested on a device).

import { useCallback, useEffect, useRef, useState } from 'react'
import { ScrollView } from 'react-native'

import { ApiError } from '@twt/api-client'
import { useT } from '@twt/i18n/react'
import { useFocusEffect, useRouter } from 'expo-router'
import { Button, H2, Input, Paragraph, Spinner, Text, YStack } from 'tamagui'

import { AnnouncedText, useAnnounceOnChange } from '../../components/peer-request/announce'
import { announce } from '../../lib/announce'
import { memberAuth } from '../../lib/member-api'
import { CALL_TIMEOUT_MS, withTimeout } from '../../lib/with-timeout'

/** A hung status read holds the spinner at most this long (the whatsapp step's bound) — N1. */
const STATUS_TIMEOUT_MS = 5_000
/** How long the "saved" line shows before the step moves on. */
const SAVED_MS = 1_200

const SIX_DIGITS = /^\d{6}$/
type Stage = 'loading' | 'ask' | 'code' | 'saved'
type CodeError = 'format' | 'not_found' | null

export default function AssistedStepScreen() {
  const t = useT()
  const router = useRouter()

  const [stage, setStage] = useState<Stage>('loading')
  const [code, setCode] = useState('')
  const [error, setError] = useState<CodeError>(null)
  // Bumped every time an error is SET (⛔ when cleared): the announcement is keyed on it, so a repeat press answered by the same
  // error is spoken again, and an edit that clears the line speaks nothing (3.15a DL2; the `use-wa-code.ts` `sendCount` shape).
  const [errorSet, setErrorSet] = useState(0)
  const [busy, setBusy] = useState(false)
  const [focused, setFocused] = useState(false)
  // The POST ended in a way that moves the member on (409 / 429 / 5xx / timeout / no network): the move itself waits for focus (P3).
  const [exiting, setExiting] = useState(false)
  // Refs, ⛔ state: two presses inside one frame both see the pre-update closure (a double tap must make ONE request).
  const busyRef = useRef(false)
  const leaving = useRef(false)
  const codeRef = useRef('')
  const exitingRef = useRef(false)
  // The same fact as `focused`, set SYNCHRONOUSLY: the effects that stop a continuation on blur clean up after a render, so a
  // continuation can still run in the instant between the blur and that cleanup (review P3 round 2).
  const focusedRef = useRef(false)

  // The status read and the "saved" timer run only while `focused`, and stop on blur (review R2). Nothing is invalidated here:
  // a request that settles after blur keeps its result (review P3).
  useFocusEffect(
    useCallback(() => {
      focusedRef.current = true
      setFocused(true)
      return () => {
        focusedRef.current = false
        setFocused(false)
      }
    }, []),
  )

  // Only a FOCUSED step moves the member on: a blurred one has another route in front, which KYC must not replace.
  const goNext = useCallback(() => {
    if (leaving.current || !focusedRef.current) return
    leaving.current = true
    router.replace('/(signup)/kyc')
  }, [router])

  // A POST that failed in a way that moves the member on, once the step is focused (immediately when it already is) — P3.
  useEffect(() => {
    if (focused && exiting) goNext()
  }, [focused, exiting, goNext])

  useEffect(() => {
    if (!focused || stage !== 'loading') return
    let cancelled = false
    withTimeout(memberAuth.assistedCodeStatus(), STATUS_TIMEOUT_MS).then(
      (status) => {
        // `focusedRef`: the cleanup that sets `cancelled` runs after a render — an answer in the instant after the blur must ⛔ speak
        // the question over another screen. The effect re-reads at re-focus (stage is still `loading`).
        if (cancelled || !focusedRef.current) return
        if (status.recorded) goNext()
        else setStage('ask')
      },
      () => {
        if (!cancelled) goNext()
      },
    )
    return () => {
      cancelled = true
    }
  }, [focused, stage, goNext])

  // The "saved" line shows briefly, then the step moves on — only while focused (R2).
  useEffect(() => {
    if (!focused || stage !== 'saved') return
    const timer = setTimeout(goNext, SAVED_MS)
    return () => clearTimeout(timer)
  }, [focused, stage, goNext])

  // The not-found / format line is SENT once per time it is set, and only while focused: one set while the step is blurred is
  // spoken at re-focus, ⛔ over another screen (review P3). `focusedRef` too: `focused` is captured at render, so a blur that lands
  // between the line's commit and this effect would still read `true` (3.15a review P2); the `focused` dep re-runs it at re-focus.
  // `t` and `error` are ⛔ deps: `errorSet` changes in the same update as `error`, and a fresh `t` must not re-speak
  // ([[project_uset_fresh_closure_memo_trap]]). A repeat is sent as DIFFERENT text by `announce()` (3.15a review P1, now the
  // shared helper — Story 3.15b) — whether TalkBack speaks it is what the device pass shows, ⛔ this effect.
  useEffect(() => {
    if (!focused || !focusedRef.current || error === null) return
    announce(t(error === 'format' ? 'signup.assisted.format' : 'signup.assisted.not_found'))
  }, [focused, errorSet])

  const showError = useCallback((e: 'format' | 'not_found') => {
    setError(e)
    setErrorSet((n) => n + 1)
  }, [])

  const onContinue = useCallback(async (): Promise<void> => {
    // `exitingRef`: after a failure that moves the member on, Continue is enabled again for the moment before the move — no
    // second request.
    if (busyRef.current || leaving.current || exitingRef.current) return
    const value = codeRef.current.trim()
    if (!SIX_DIGITS.test(value)) {
      showError('format')
      return
    }
    busyRef.current = true
    setBusy(true)
    setError(null)
    try {
      await withTimeout(memberAuth.assistedCodeRecord(value), CALL_TIMEOUT_MS)
      // The member already left (No / Skip): the result is moot. A BLURRED step is ⛔ moot — it keeps the result (P3).
      if (leaving.current) return
      setStage('saved')
    } catch (err) {
      if (leaving.current) return
      if (err instanceof ApiError && err.status === 422) {
        showError('not_found')
        return
      }
      if (err instanceof ApiError && err.status === 400) {
        showError('format')
        return
      }
      // 409 / 429 / 5xx / a timeout / no network — never block the signup (N1): on, with ⛔ message (when focused — P3).
      exitingRef.current = true
      setExiting(true)
    } finally {
      busyRef.current = false
      setBusy(false)
    }
  }, [showError])

  useAnnounceOnChange(
    stage === 'ask' ? t('signup.assisted.title') : stage === 'code' ? t('signup.assisted.code_label') : null,
  )

  if (stage === 'loading') {
    return (
      <YStack flex={1} justify="center" items="center" px="$6" bg="$background">
        {/* `accessible`: a label on a container that is not an accessibility element is never announced (family 13 (a), review P5). */}
        <Spinner accessible accessibilityLabel={t('loading')} testID="assisted-loading" />
      </YStack>
    )
  }

  return (
    <YStack flex={1} bg="$background">
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled" testID="assisted-content">
        <YStack gap="$4" px="$6" py="$6" bg="$background">
          <H2>{t('signup.assisted.title')}</H2>
          <Paragraph color="$colorPress" accessibilityRole="text">
            {t('signup.assisted.body')}
          </Paragraph>

          {stage === 'ask' ? (
            // Two choices of EQUAL weight: the same component, size and theme — neither is primary.
            <YStack gap="$3">
              <Button
                height={56}
                accessibilityRole="button"
                accessibilityLabel={t('signup.assisted.yes')}
                onPress={() => setStage('code')}
                testID="assisted-yes"
              >
                {t('signup.assisted.yes')}
              </Button>
              <Button
                height={56}
                accessibilityRole="button"
                accessibilityLabel={t('signup.assisted.no')}
                onPress={goNext}
                testID="assisted-no"
              >
                {t('signup.assisted.no')}
              </Button>
            </YStack>
          ) : null}

          {stage === 'code' ? (
            <YStack gap="$3">
              <Text accessibilityRole="text">{t('signup.assisted.code_label')}</Text>
              {/* ⛔ `disabled={busy}`: on Android it drops focus and the keyboard (3.15a W2 (i)). R1 is the guard below. */}
              <Input
                value={code}
                onChangeText={(v) => {
                  // R1: the code being recorded is frozen until its answer arrives — the change is ignored and React Native
                  // puts the controlled value (the SENT code) back on screen.
                  if (busyRef.current) return
                  codeRef.current = v
                  setCode(v)
                  setError(null)
                }}
                keyboardType="number-pad"
                maxLength={6}
                accessibilityLabel={t('signup.assisted.code_label')}
                testID="assisted-code"
              />
              {/* The lines show only while FOCUSED, and are spoken by the effect above — ⛔ a live region (3.15a V1). */}
              {error === 'format' && focused ? (
                <Text fontSize="$2" color="$red10" accessibilityRole="alert" testID="assisted-error-format">
                  {t('signup.assisted.format')}
                </Text>
              ) : null}
              {error === 'not_found' && focused ? (
                <Text fontSize="$2" color="$red10" accessibilityRole="alert" testID="assisted-error-not-found">
                  {t('signup.assisted.not_found')}
                </Text>
              ) : null}
              <Button
                theme="accent"
                height={56}
                disabled={busy}
                accessibilityRole="button"
                accessibilityLabel={t('signup.assisted.continue')}
                accessibilityState={{ disabled: busy }}
                onPress={() => void onContinue()}
                testID="assisted-continue"
              >
                {busy ? <Spinner /> : t('signup.assisted.continue')}
              </Button>
              <Button
                height="auto"
                minH={56}
                py="$2"
                noTextWrap
                accessibilityRole="button"
                accessibilityLabel={t('signup.assisted.skip')}
                onPress={goNext}
                testID="assisted-skip"
              >
                <Text shrink={1} text="center">
                  {t('signup.assisted.skip')}
                </Text>
              </Button>
            </YStack>
          ) : null}

          {stage === 'saved' && focused ? <AnnouncedText kind="status" text={t('signup.assisted.saved')} /> : null}
        </YStack>
      </ScrollView>
    </YStack>
  )
}
