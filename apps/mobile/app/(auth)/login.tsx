// Member login — enter mobile (Story 3.2, Task 10).
//
// Bilingual (Hindi-default via the @twt/i18n LocaleProvider; Epic 3 intro line 1575).
// UX Pattern 4 "dignified validation" (UX-DR55): inline, plain-language errors — no
// blame, no jargon. Phone+OTP is transferable by design (Ravi-mode) — no identity
// binding beyond the phone here.
//
// Story 6.35 (2026-10-23, LS6 (a) / LS7) — a one-line language switch at the foot: it shows only the OTHER language's
// endonym ("English" on a Hindi screen, "हिन्दी" on an English one), changes the app at once and saves it on this phone
// as a pending choice with ⛔ member (`chooseLanguage(…, null)` — ⛔ API call here; it is recorded only if a member signs
// in during THIS app process — LS5, I1). The error line is CLEARED on a switch: it is a string already translated into
// state (T5 / F22), which would otherwise stay in the old language.

import { useState } from 'react'

import { ApiError } from '@twt/api-client'
import { useLocale, useT } from '@twt/i18n/react'
import { useRouter } from 'expo-router'
import { Button, H2, Input, Paragraph, Spinner, Text, YStack } from 'tamagui'

import { chooseLanguage } from '../../lib/app-language'
import { memberAuth } from '../../lib/member-api'

const INDIAN_MOBILE = /^[6-9]\d{9}$/

export default function LoginScreen() {
  const t = useT()
  const { locale, setLocale } = useLocale()
  const router = useRouter()
  const [mobile, setMobile] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  // Strip separators + a country/trunk prefix to the 10-digit core for validation.
  const core = mobile.replace(/\D/g, '').replace(/^(?:91|0)/, '').slice(-10)
  const valid = INDIAN_MOBILE.test(core)

  async function onSubmit(): Promise<void> {
    if (!valid) {
      setError(t('auth.mobile_error_invalid'))
      return
    }
    setBusy(true)
    setError(null)
    try {
      await memberAuth.requestOtp(core)
      router.push({ pathname: '/(auth)/otp', params: { mobile: core } })
    } catch (e) {
      setError(
        e instanceof ApiError && e.status === 429
          ? t('auth.otp_error_rate_limit')
          : t('auth.mobile_error_invalid'),
      )
    } finally {
      setBusy(false)
    }
  }

  const otherLanguage = locale === 'en' ? 'hi' : 'en'
  function onSwitchLanguage(): void {
    setError(null)
    setLocale(otherLanguage)
    void chooseLanguage(otherLanguage, null)
  }
  const otherLanguageName = otherLanguage === 'hi' ? t('language.option_hi') : t('language.option_en')

  return (
    <YStack flex={1} justify="center" gap="$4" px="$6" bg="$background">
      <H2>{t('auth.mobile_prompt')}</H2>
      <Paragraph color="$colorPress">{t('auth.mobile_help')}</Paragraph>
      <Input
        value={mobile}
        onChangeText={setMobile}
        keyboardType="phone-pad"
        placeholder="98765 43210"
        maxLength={16}
        autoFocus
        accessibilityLabel={t('auth.mobile_prompt')}
      />
      {error ? <Text color="#C0392B">{error}</Text> : null}
      <Button theme="accent" disabled={busy} onPress={onSubmit}>
        {busy ? <Spinner /> : t('auth.send_otp')}
      </Button>
      <Button
        chromeless
        size="$3"
        self="center"
        mt="$6"
        accessibilityRole="button"
        accessibilityLabel={otherLanguageName}
        accessibilityHint={t('language.switch_hint')}
        onPress={onSwitchLanguage}
        testID="login-language-switch"
      >
        {otherLanguageName}
      </Button>
    </YStack>
  )
}
