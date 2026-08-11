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
        // First signup (Story 3.6a) — create the member from the continuation token, store the full
        // session it returns, and enter the wizard at the first step (T&C). No second OTP. A failure
        // here is its own dignified message (the OTP WAS valid — only member-creation failed).
        setNotice(t('signup.creating'))
        try {
          const full = await memberAuth.signupCreate(res.signupContinuationToken, { mobile, deviceId })
          await signIn(full)
          router.replace('/(signup)/tc')
        } catch (createErr) {
          setNotice(null)
          // Story 3.10 — a withdrawn identity inside its 12-month rejoin window is blocked with
          // auth.rejoin_locked (keyed on error.code, NOT bare 403). Route to the dignified date-block
          // surface carrying the withdrawn/rejoin dates (error.details), NOT a generic toast.
          if (createErr instanceof ApiError && createErr.code === 'auth.rejoin_locked') {
            const d = (createErr.details ?? {}) as {
              withdrawn_at?: string
              rejoin_permitted_at?: string
            }
            router.replace({
              pathname: '/(auth)/rejoin-locked',
              params: {
                ...(d.withdrawn_at ? { withdrawnDate: d.withdrawn_at } : {}),
                ...(d.rejoin_permitted_at ? { rejoinDate: d.rejoin_permitted_at } : {}),
              },
            })
          } else {
            setError(t('signup.error_generic'))
          }
        }
      } else {
        // Multi-Pariwar — the Passport scope-selection UI defers (R2).
        setNotice(t('auth.otp_sent', { mobile }))
      }
    } catch (e) {
      // ── Story 10.19 (AC10) — a terminated member must NOT be told their correct code was wrong ──
      //
      // ⚠ THIS IS THE OUTER CATCH, AND THAT IS THE POINT. The `auth.rejoin_locked` precedent above
      // sits in the INNER `catch (createErr)` around `signupCreate` — the SIGNUP path.
      // `auth.member_terminated` is thrown by `completeMemberLogin` on the VERIFY path, so it lands
      // here. A branch added to the inner catch would never be reached by this response.
      //
      // Keyed on `ApiError.code`, never a bare 403 — the technique the rejoin-locked precedent
      // establishes. Placed AHEAD of the 429/generic ternary, which otherwise resolves this to
      // `auth.otp_error_invalid`: "invalid code", to a member whose code was correct. That is the
      // copy-truth defect class this story closes.
      //
      // ⛔ Not "login failed". OTP verification SUCCEEDED and identity was verified; session issuance
      // was denied (Decision `2026-08-10-098` clause 3).
      if (e instanceof ApiError && e.code === 'auth.member_terminated') {
        // The structured notice (AC4). `summary` is deliberately not forwarded — it is
        // `{ available: false }` until Story 10.20, and the surface renders no element for it.
        //
        // Runtime-validated, not just cast: `details` crosses an HTTP boundary, so a malformed or
        // unexpected shape must degrade to "absent" rather than pass a non-string into a router
        // param (which the terminated screen would then render or format as-is).
        const raw = e.details && typeof e.details === 'object' ? (e.details as Record<string, unknown>) : {}
        const groundLabelKey = typeof raw.ground_label_key === 'string' ? raw.ground_label_key : undefined
        const effectiveAt = typeof raw.effective_at === 'string' ? raw.effective_at : undefined
        // `further_communication` (AC10) — forwarded as a presence flag, not hardcoded on the
        // terminated screen: an absent element must render nothing there, never placeholder text.
        const hasFurtherCommunication =
          raw.further_communication !== null &&
          typeof raw.further_communication === 'object' &&
          raw.further_communication !== undefined
        router.replace({
          pathname: '/(auth)/terminated',
          params: {
            ...(groundLabelKey ? { groundLabelKey } : {}),
            ...(effectiveAt ? { effectiveAt } : {}),
            ...(hasFurtherCommunication ? { hasFurtherCommunication: 'true' } : {}),
          },
        })
        return
      }
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
