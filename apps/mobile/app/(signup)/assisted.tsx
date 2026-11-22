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
// ⛔ a lock-in step (`payment.tsx`'s `LockInGateStep` is unchanged). A skipped step is ⛔ subtracted from "Step N of M" (the
// whatsapp `-375` accepted cost). `t` is ⛔ in any effect's deps ([[project_uset_fresh_closure_memo_trap]]).
//
// ── Accessibility ──────────────────────────────────────────────────────────────────────────────
// The question is spoken when it appears (`useAnnounceOnChange`); the not-found and format lines are `AnnouncedText kind='error'`,
// the saved line `kind='status'`. The two choice buttons share one component, size and theme. "Continue without a code" is long
// in Hindi: its own `Text` inside a `noTextWrap` button so it wraps ([[project_tamagui_button_text_one_line]] — ⚠ wrapping is
// un-attested on a device).

import { useCallback, useEffect, useRef, useState } from 'react'
import { ScrollView } from 'react-native'

import { ApiError } from '@twt/api-client'
import { useT } from '@twt/i18n/react'
import { useFocusEffect, useRouter } from 'expo-router'
import { Button, H2, Input, Paragraph, Spinner, Text, YStack } from 'tamagui'

import { AnnouncedText, useAnnounceOnChange } from '../../components/peer-request/announce'
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
  const [busy, setBusy] = useState(false)
  // Refs, ⛔ state: two presses inside one frame both see the pre-update closure (a double tap must make ONE request).
  const busyRef = useRef(false)
  const leaving = useRef(false)
  const codeRef = useRef('')
  const actionVersion = useRef(0)

  // A request may finish after navigation blurs or unmounts this step: invalidate its continuation.
  useFocusEffect(useCallback(() => () => { actionVersion.current += 1 }, []))

  const goNext = useCallback(() => {
    if (leaving.current) return
    leaving.current = true
    router.replace('/(signup)/kyc')
  }, [router])

  useEffect(() => {
    let cancelled = false
    withTimeout(memberAuth.assistedCodeStatus(), STATUS_TIMEOUT_MS).then(
      (status) => {
        if (cancelled) return
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
  }, [goNext])

  // The "saved" line shows briefly, then the step moves on.
  useEffect(() => {
    if (stage !== 'saved') return
    const timer = setTimeout(goNext, SAVED_MS)
    return () => clearTimeout(timer)
  }, [stage, goNext])

  const onContinue = useCallback(async (): Promise<void> => {
    if (busyRef.current || leaving.current) return
    const value = codeRef.current.trim()
    if (!SIX_DIGITS.test(value)) {
      setError('format')
      return
    }
    busyRef.current = true
    setBusy(true)
    setError(null)
    const version = ++actionVersion.current
    const isCurrent = () => actionVersion.current === version && !leaving.current
    try {
      await withTimeout(memberAuth.assistedCodeRecord(value), CALL_TIMEOUT_MS)
      if (!isCurrent()) return
      setStage('saved')
    } catch (err) {
      if (!isCurrent()) return
      if (err instanceof ApiError && err.status === 422) {
        setError('not_found')
        return
      }
      if (err instanceof ApiError && err.status === 400) {
        setError('format')
        return
      }
      // 409 / 429 / 5xx / a timeout / no network — never block the signup (N1): on, with ⛔ message.
      goNext()
    } finally {
      busyRef.current = false
      setBusy(false)
    }
  }, [goNext])

  useAnnounceOnChange(stage === 'ask' ? t('signup.assisted.title') : null)

  if (stage === 'loading') {
    return (
      <YStack flex={1} justify="center" items="center" px="$6" bg="$background">
        <Spinner accessibilityLabel={t('loading')} testID="assisted-loading" />
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
              <Input
                value={code}
                onChangeText={(v) => {
                  codeRef.current = v
                  setCode(v)
                  setError(null)
                }}
                keyboardType="number-pad"
                maxLength={6}
                accessibilityLabel={t('signup.assisted.code_label')}
                testID="assisted-code"
              />
              {error === 'format' ? <AnnouncedText kind="error" text={t('signup.assisted.format')} /> : null}
              {error === 'not_found' ? <AnnouncedText kind="error" text={t('signup.assisted.not_found')} /> : null}
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
                disabled={busy}
                accessibilityRole="button"
                accessibilityLabel={t('signup.assisted.skip')}
                accessibilityState={{ disabled: busy }}
                onPress={goNext}
                testID="assisted-skip"
              >
                <Text shrink={1} text="center">
                  {t('signup.assisted.skip')}
                </Text>
              </Button>
            </YStack>
          ) : null}

          {stage === 'saved' ? <AnnouncedText kind="status" text={t('signup.assisted.saved')} /> : null}
        </YStack>
      </ScrollView>
    </YStack>
  )
}
