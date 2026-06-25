// Member login — enter OTP (Story 3.2, Task 10).
//
// Verifies the OTP → full session (sign in + go home), signup-continuation (the
// verified-mobile seam Story 3.6 consumes), or pariwar-select (multi-membership;
// the Passport selection UI defers, R2). Dignified, plain-language errors (UX-DR55):
// we cannot tell expired from wrong (both 401), so we show the generic invalid-code
// message; rate-limit (429) gets its own message.

import { useState } from 'react'

import { ApiError } from '@twt/api-client'
import { useT } from '@twt/i18n/react'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { Button, H2, Input, Paragraph, Spinner, Text, YStack } from 'tamagui'

import { memberAuth } from '../../lib/member-api'
import { getDeviceId } from '../../lib/session'
import { useSession } from '../../lib/session-context'

export default function OtpScreen() {
  const t = useT()
  const router = useRouter()
  const { signIn } = useSession()
  const { mobile } = useLocalSearchParams<{ mobile?: string }>()
  const [otp, setOtp] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function onSubmit(): Promise<void> {
    if (!mobile) return
    setBusy(true)
    setError(null)
    try {
      const deviceId = await getDeviceId()
      const res = await memberAuth.verifyOtp({ mobile, otp, deviceId })
      if (res.sessionType === 'full_session') {
        await signIn(res)
        router.replace('/(tabs)')
      } else if (res.sessionType === 'signup_continuation') {
        // First signup — the wizard (Story 3.6) consumes this continuation token.
        setNotice(t('auth.otp_sent', { mobile }))
      } else {
        // Multi-Pariwar — the Passport scope-selection UI defers (R2).
        setNotice(t('auth.otp_sent', { mobile }))
      }
    } catch (e) {
      setError(
        e instanceof ApiError && e.status === 429
          ? t('auth.otp_error_rate_limit')
          : t('auth.otp_error_invalid'),
      )
    } finally {
      setBusy(false)
    }
  }

  async function onResend(): Promise<void> {
    if (!mobile) return
    setError(null)
    try {
      await memberAuth.requestOtp(mobile)
      setNotice(t('auth.otp_sent', { mobile }))
    } catch {
      setError(t('auth.otp_error_rate_limit'))
    }
  }

  return (
    <YStack flex={1} justify="center" gap="$4" px="$6" bg="$background">
      <H2>{t('auth.otp_prompt')}</H2>
      <Paragraph color="$colorPress">{t('auth.otp_help', { mobile: mobile ?? '' })}</Paragraph>
      <Input
        value={otp}
        onChangeText={setOtp}
        keyboardType="number-pad"
        placeholder="••••••"
        maxLength={8}
        autoFocus
        accessibilityLabel={t('auth.otp_prompt')}
      />
      {error ? <Text color="#C0392B">{error}</Text> : null}
      {notice ? <Text color="#1E8E3E">{notice}</Text> : null}
      <Button theme="accent" disabled={busy} onPress={onSubmit}>
        {busy ? <Spinner /> : t('auth.verify')}
      </Button>
      <Button chromeless onPress={onResend}>
        {t('auth.resend')}
      </Button>
    </YStack>
  )
}
