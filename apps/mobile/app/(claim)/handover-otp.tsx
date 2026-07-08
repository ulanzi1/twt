// Handover-trust OTP (Story 6.2, Task 6; AC2) — <HandoverTrustOTP>.
//
// The step-up leg of the claim (Dev Notes "Step-up OTP requirement"). On mount it sends the OTP to
// the NOMINEE's declared mobile (NOT this phone) and explains that plainly ("code sent to the
// nominee's phone [masked]"). Ravi enters the code from his own phone; a wrong/expired code gets a
// dignified, generic Pattern-4 message (we cannot tell expired from wrong — both are a failed
// verify); a resend affordance is present. On success it advances to relationship-confirm.
//
// Mirrors (auth)/otp.tsx: ApiError code-branching (429 → rate-limit copy), Tamagui primitives.

import { useEffect, useState } from 'react'

import { ApiError } from '@twt/api-client'
import { useRouter } from 'expo-router'
import { Button, Input, Paragraph, Spinner, Text, YStack } from 'tamagui'

import { ClaimProxyFlowShell } from '../../components/claim/ClaimProxyFlowShell'
import { claimApi } from '../../lib/claim-api'
import { useClaimT } from '../../lib/claim-i18n'

export default function HandoverOtpScreen(): React.ReactElement {
  const t = useClaimT()
  const router = useRouter()
  const name = t('member_fallback')
  const [code, setCode] = useState('')
  const [masked, setMasked] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function send(): Promise<void> {
    setError(null)
    try {
      const res = await claimApi.requestHandoverOtp()
      // An empty mask means no reachable nominee → route Ravi to help (existence-defended).
      setMasked(res.nomineeMobileMasked || '')
    } catch (e) {
      setError(
        e instanceof ApiError && e.status === 429 ? t('otp.error_rate_limit') : t('otp.error_invalid'),
      )
    }
  }

  // Send on first mount (grief-paced: no manual "send" step to fumble through).
  useEffect(() => {
    void send()
  }, [])

  async function onVerify(): Promise<void> {
    setBusy(true)
    setError(null)
    try {
      const res = await claimApi.verifyHandoverOtp(code)
      if (res.verified) {
        router.push('/(claim)/relationship')
      } else {
        setError(t('otp.error_invalid'))
      }
    } catch (e) {
      setError(
        e instanceof ApiError && e.status === 429 ? t('otp.error_rate_limit') : t('otp.error_invalid'),
      )
    } finally {
      setBusy(false)
    }
  }

  const noNominee = masked === ''
  return (
    <ClaimProxyFlowShell deceasedName={name}>
      <YStack gap="$4" pt="$4">
        <Text fontSize="$7" fontWeight="700">
          {t('otp.title')}
        </Text>
        {noNominee ? (
          <Paragraph color="$colorPress">{t('otp.no_nominee')}</Paragraph>
        ) : (
          <>
            <Paragraph color="$colorPress">
              {t('otp.help', { mobile: masked ?? '…' })}
            </Paragraph>
            <Input
              value={code}
              onChangeText={setCode}
              keyboardType="number-pad"
              placeholder="••••••"
              maxLength={6}
              autoFocus
              accessibilityLabel={t('otp.prompt')}
            />
            {error ? <Text color="#C0392B">{error}</Text> : null}
            <Button theme="accent" disabled={busy || code.length < 6} onPress={onVerify}>
              {busy ? <Spinner /> : t('otp.verify')}
            </Button>
            <Button chromeless onPress={send}>
              {t('otp.resend')}
            </Button>
          </>
        )}
      </YStack>
    </ClaimProxyFlowShell>
  )
}
