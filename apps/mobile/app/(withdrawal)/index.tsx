// Voluntary withdrawal — the staged flow (Story 3.10, Task 8; AC1/AC2). ONE screen, four internal
// stages so the free-text reason (Tier-1 PII) never leaves component state (never a route param, never
// a draft — the 3.9 PII-in-draft lesson):
//   ack     — AC1a: states plainly what withdrawal does (forfeit ₹110, history retained then
//             anonymised, 12-month rejoin lock). Dignified Pattern-4 copy (AC2) — NO retention theater.
//   reason  — AC1b: an OPTIONAL bounded reason (radio-style, non-PII WithdrawalReasonCode) + an
//             OPTIONAL free-text note. A member may continue with neither.
//   confirm — AC1d: an EXPLICIT confirm distinct from the acknowledgment (two-step intent). The confirm
//             call is step-up gated ('withdrawal') — the OTP loop is driven by useStepUpGate (AC1c).
//   done    — the withdrawn confirmation showing the rejoin-permitted date (AC1e result).
//
// Calm register throughout; ScrollView wraps every stage (3.5 review lesson — bare flex clips CTAs on
// small devices). On success the member is withdrawn → "Return home" signs out (the auth guard then
// routes to login; the refresh gate already blocks a withdrawn member server-side).

import { useState } from 'react'
import { ScrollView } from 'react-native'

import { useLocale, useT } from '@twt/i18n/react'
import { Stack, useRouter } from 'expo-router'
import { Button, H2, Input, Paragraph, Spinner, Text, YStack } from 'tamagui'

import { memberAuth } from '../../lib/member-api'
import { useStepUpGate } from '../../components/life-events/useStepUpGate'
import { formatWithdrawalDate } from '../../components/withdrawal/format-date'
import { useSession } from '../../lib/session-context'

/** The bounded, NON-PII reason codes (value-aligned with contracts `WithdrawalReasonCode`). */
const REASON_CODES = ['financial', 'relocation', 'dissatisfied', 'personal', 'other'] as const

type Stage = 'ack' | 'reason' | 'confirm' | 'done'

export default function WithdrawalScreen() {
  const t = useT()
  const { locale } = useLocale()
  const router = useRouter()
  const { signOut } = useSession()
  const stepUp = useStepUpGate('withdrawal')

  const [stage, setStage] = useState<Stage>('ack')
  const [reasonCode, setReasonCode] = useState<string | null>(null)
  const [reasonText, setReasonText] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [rejoinDate, setRejoinDate] = useState<string | null>(null)

  /** Build the confirm body — only send fields the member actually provided (both optional). */
  function confirmBody() {
    const trimmed = reasonText.trim()
    return {
      ...(reasonCode ? { reasonCode: reasonCode as (typeof REASON_CODES)[number] } : {}),
      ...(trimmed ? { reasonText: trimmed } : {}),
    }
  }

  async function onConfirm(): Promise<void> {
    setBusy(true)
    setError(null)
    try {
      const result = await stepUp.guard(() => memberAuth.withdrawMember(confirmBody()))
      // undefined ⇒ step-up was requested; the OTP input is now shown (do NOT advance yet).
      if (result !== undefined) {
        setRejoinDate(result.rejoinPermittedAt)
        setStage('done')
      }
    } catch {
      setError(t('withdrawal.error_generic'))
    } finally {
      setBusy(false)
    }
  }

  async function onVerifyOtp(): Promise<void> {
    setBusy(true)
    setError(null)
    let verifySucceeded = false
    try {
      const result = await stepUp.verifyAndRetry(() => {
        verifySucceeded = true
        return memberAuth.withdrawMember(confirmBody())
      })
      setRejoinDate(result.rejoinPermittedAt)
      setStage('done')
    } catch {
      setError(t('withdrawal.error_generic'))
      // If OTP verify succeeded but the withdrawal mutation failed, verifyAndRetry cleared the
      // OTP field leaving the Verify button permanently disabled. Reset to restore the Confirm
      // button — the server elevation is still live so the member can retry without re-OTP.
      if (verifySucceeded) {
        stepUp.reset()
      }
    } finally {
      setBusy(false)
    }
  }

  async function onDone(): Promise<void> {
    // The member is now withdrawn — end the session; the root auth guard routes to login.
    await signOut()
  }

  return (
    <>
      <Stack.Screen options={{ title: t('withdrawal.ack_title') }} />
      <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
        <YStack flex={1} gap="$4" px="$6" py="$6" bg="$background">
          {stage === 'ack' ? (
            <YStack gap="$4">
              <H2>{t('withdrawal.ack_title')}</H2>
              <Paragraph color="$colorPress">{t('withdrawal.ack_body')}</Paragraph>
              <Button
                theme="accent"
                height={56}
                accessibilityRole="button"
                accessibilityLabel={t('withdrawal.ack_continue')}
                onPress={() => setStage('reason')}
              >
                {t('withdrawal.ack_continue')}
              </Button>
              <Button
                chromeless
                height={44}
                accessibilityRole="button"
                accessibilityLabel={t('withdrawal.ack_back')}
                onPress={() => router.back()}
              >
                {t('withdrawal.ack_back')}
              </Button>
            </YStack>
          ) : null}

          {stage === 'reason' ? (
            <YStack gap="$4">
              <H2>{t('withdrawal.reason_title')}</H2>
              <Paragraph color="$colorPress">{t('withdrawal.reason_intro')}</Paragraph>
              <Text>{t('withdrawal.reason_dropdown_label')}</Text>
              <YStack gap="$2">
                {REASON_CODES.map((code) => {
                  const selected = reasonCode === code
                  return (
                    <Button
                      key={code}
                      theme={selected ? 'accent' : undefined}
                      height={48}
                      justify="flex-start"
                      accessibilityRole="button"
                      accessibilityState={{ selected }}
                      accessibilityLabel={t(`withdrawal.reason.${code}`)}
                      onPress={() => setReasonCode(selected ? null : code)}
                    >
                      {t(`withdrawal.reason.${code}`)}
                    </Button>
                  )
                })}
              </YStack>
              <Input
                value={reasonText}
                onChangeText={setReasonText}
                placeholder={t('withdrawal.reason_placeholder')}
                multiline
                numberOfLines={3}
                maxLength={1000}
                height={80}
                accessibilityLabel={t('withdrawal.reason_placeholder')}
              />
              <Button
                theme="accent"
                height={56}
                accessibilityRole="button"
                accessibilityLabel={t('withdrawal.reason_continue')}
                onPress={() => setStage('confirm')}
              >
                {t('withdrawal.reason_continue')}
              </Button>
            </YStack>
          ) : null}

          {stage === 'confirm' ? (
            <YStack gap="$4">
              <H2>{t('withdrawal.confirm_title')}</H2>
              <Paragraph color="$colorPress">{t('withdrawal.confirm_body')}</Paragraph>
              {error ? (
                <Text color="#C0392B" accessibilityLiveRegion="polite">
                  {error}
                </Text>
              ) : null}
              {stepUp.needsOtp ? (
                <YStack gap="$3">
                  <Text accessibilityRole="text" accessibilityLiveRegion="polite">
                    {t('lifeEvents.step_up_required')}
                  </Text>
                  <Input
                    value={stepUp.otp}
                    onChangeText={stepUp.setOtp}
                    keyboardType="number-pad"
                    maxLength={6}
                    height={48}
                    accessibilityLabel={t('lifeEvents.step_up_required')}
                    accessibilityHint={t('lifeEvents.step_up_hint')}
                  />
                  <Button
                    theme="accent"
                    height={56}
                    disabled={busy || !stepUp.otp.trim()}
                    accessibilityRole="button"
                    accessibilityLabel={t('auth.verify')}
                    onPress={onVerifyOtp}
                  >
                    {busy ? <Spinner /> : t('auth.verify')}
                  </Button>
                  <Button
                    chromeless
                    height={40}
                    accessibilityRole="button"
                    accessibilityLabel={t('lifeEvents.step_up_cancel')}
                    onPress={stepUp.reset}
                  >
                    {t('lifeEvents.step_up_cancel')}
                  </Button>
                </YStack>
              ) : (
                <YStack gap="$3">
                  <Button
                    theme="accent"
                    height={56}
                    disabled={busy}
                    accessibilityRole="button"
                    accessibilityLabel={t('withdrawal.confirm_cta')}
                    onPress={onConfirm}
                  >
                    {busy ? <Spinner /> : t('withdrawal.confirm_cta')}
                  </Button>
                  <Button
                    chromeless
                    height={44}
                    accessibilityRole="button"
                    accessibilityLabel={t('withdrawal.confirm_back')}
                    onPress={() => setStage('reason')}
                  >
                    {t('withdrawal.confirm_back')}
                  </Button>
                </YStack>
              )}
            </YStack>
          ) : null}

          {stage === 'done' ? (
            <YStack gap="$4">
              <H2>{t('withdrawal.done_title')}</H2>
              <Paragraph color="$colorPress">
                {t('withdrawal.done_body', {
                  date: rejoinDate ? formatWithdrawalDate(rejoinDate, locale) : '',
                })}
              </Paragraph>
              <Button
                theme="accent"
                height={56}
                accessibilityRole="button"
                accessibilityLabel={t('withdrawal.done_home')}
                onPress={onDone}
              >
                {t('withdrawal.done_home')}
              </Button>
            </YStack>
          ) : null}
        </YStack>
      </ScrollView>
    </>
  )
}
