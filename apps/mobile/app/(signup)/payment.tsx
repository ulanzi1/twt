// Signup payment step — pay the ₹110 Vyawastha Shulk via UPI Intent + self-attest the UTR (Story
// 3.6b, Task 8; AC5). REPLACES the 3.6a placeholder. The wizard's FINAL step — it closes the signup
// loop: on success the member enters `lock-in` and lands on the home tabs (Story 3.7's clock renders there).
//
// Flow: fetch the server-built UPI Intent on mount (the amount + VPA are server-authoritative — the
// client never names them; R4) → "Pay via UPI" opens the OS UPI app via Linking.openURL → on return
// the member pastes the UTR (long-press paste; permissive — the server validates) + an OPTIONAL 6-digit
// Reference Code (D2 port seam) → "Confirm payment" posts /confirm. On lockInEntered → home; on
// outstanding steps → surface which is incomplete; on 503 lock_in.policy_unavailable → graceful retry
// (the receipt is already saved; re-confirm completes once provisioned — mirror 3.5/3.6a loadFailed+retry).
//
// ── Accessibility (AC5 / P0-2c) ─────────────────────────────────────────────────────────────────
// Every control carries accessibilityLabel + accessibilityHint; the action labels NAME THE ACTION
// (WCAG 2.5.3 Label-in-Name — 3.6a P7); payment status + outstanding-step messages are announced
// (polite live region); errors are announced (role=alert). ScrollView-wrapped so the CTA isn't clipped
// on small devices (3.5/3.6a patch). Bilingual via @twt/i18n; the amount/VPA come from the server
// (server-authoritative — NOT i18n). Mobile build/test are repo no-ops → verified by typecheck + lint.

import { useEffect, useState } from 'react'
import { Linking, ScrollView } from 'react-native'

import { useT } from '@twt/i18n/react'
import { useRouter } from 'expo-router'
import { Button, H2, Input, Paragraph, Spinner, Text, YStack } from 'tamagui'

import { memberAuth } from '../../lib/member-api'

type LockInGateStep = 'kyc' | 'nominees' | 'medical' | 'tc'

interface Intent {
  upiUrl: string
  tr: string
  amountInr: number
  vpa: string
}

export default function PaymentScreen() {
  const t = useT()
  const router = useRouter()

  const [intent, setIntent] = useState<Intent | null>(null)
  const [loadFailed, setLoadFailed] = useState(false)
  const [retryCount, setRetryCount] = useState(0)
  const [utr, setUtr] = useState('')
  const [referenceCode, setReferenceCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [outstanding, setOutstanding] = useState<LockInGateStep[]>([])

  // Fetch the server-built UPI Intent on mount (or retry). A 503 (unconfigured VPA) or any other
  // failure renders the graceful unavailable state (the screen cannot proceed without the intent).
  useEffect(() => {
    let active = true
    setLoadFailed(false)
    void (async () => {
      try {
        const data = await memberAuth.vyawasthaShulkIntent()
        if (active) setIntent(data)
      } catch {
        if (active) setLoadFailed(true)
      }
    })()
    return () => {
      active = false
    }
  }, [retryCount])

  function stepLabel(step: LockInGateStep): string {
    switch (step) {
      case 'kyc':
        return t('payment.step_kyc')
      case 'nominees':
        return t('payment.step_nominees')
      case 'medical':
        return t('payment.step_medical')
      case 'tc':
        return t('payment.step_tc')
    }
  }

  async function onPay(): Promise<void> {
    if (!intent) return
    setError(null)
    try {
      await Linking.openURL(intent.upiUrl)
    } catch {
      // No UPI app installed / the OS rejected the deep link — keep the member on-screen with the
      // UTR field so they can still attest a payment made another way.
      setError(t('payment.error_generic'))
    }
  }

  async function onConfirm(): Promise<void> {
    if (!intent) return
    if (!utr.trim()) {
      setError(t('payment.utr_required'))
      return
    }
    setBusy(true)
    setError(null)
    setOutstanding([])
    try {
      const res = await memberAuth.vyawasthaShulkConfirm({
        tr: intent.tr,
        utr: utr.trim(),
        ...(referenceCode.trim() ? { referenceCode: referenceCode.trim() } : {}),
      })
      if (res.lockInEntered) {
        // Lock-in entered — the signup loop is closed. Story 3.7's clock widget renders on the tabs.
        router.replace('/(tabs)')
        return
      }
      // Receipt saved, but an earlier step is incomplete — surface which (announced live region).
      setOutstanding(res.outstanding)
    } catch (err) {
      // The receipt is persisted server-side regardless; a 503 lock_in.policy_unavailable means the
      // Pariwar's lock-in policy isn't provisioned yet — a graceful, idempotent retry completes it.
      if ((err as { code?: string }).code === 'lock_in.policy_unavailable') {
        setError(t('payment.policy_unavailable'))
      } else {
        setError(t('payment.error_generic'))
      }
    } finally {
      setBusy(false)
    }
  }

  const errorBanner = error ? (
    <Text color="#C0392B" accessibilityRole="alert" accessibilityLiveRegion="assertive">
      {error}
    </Text>
  ) : null

  // The intent could not be built (503 unconfigured, or transient) — graceful unavailable state.
  if (loadFailed) {
    return (
      <YStack flex={1} justify="center" gap="$4" px="$6" bg="$background">
        <H2>{t('payment.title')}</H2>
        <Paragraph color="$colorPress" accessibilityRole="text" accessibilityLiveRegion="polite">
          {t('payment.unconfigured')}
        </Paragraph>
        <Button
          theme="accent"
          height={56}
          accessibilityRole="button"
          accessibilityLabel={t('payment.retry')}
          accessibilityHint={t('payment.retry_hint')}
          onPress={() => setRetryCount((n) => n + 1)}
        >
          {t('payment.retry')}
        </Button>
      </YStack>
    )
  }

  // Still building the intent.
  if (!intent) {
    return (
      <YStack flex={1} justify="center" items="center" gap="$4" px="$6" bg="$background">
        <Spinner accessibilityLabel={t('loading')} />
      </YStack>
    )
  }

  return (
    <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
      <YStack gap="$4" px="$6" py="$6" bg="$background">
        <H2>{t('payment.title')}</H2>
        <Paragraph color="$colorPress" accessibilityRole="text">
          {t('payment.intro')}
        </Paragraph>

        {/* Amount due — server-authoritative (NOT i18n); the label is i18n, the figure is from the server. */}
        <Text fontWeight="600" accessibilityRole="text">
          {`${t('payment.amount_label')}: ₹${intent.amountInr}`}
        </Text>

        {/* Pay via UPI — hands off to the OS UPI app. The label NAMES the action (WCAG 2.5.3). */}
        <Button
          theme="accent"
          height={56}
          accessibilityRole="button"
          accessibilityLabel={t('payment.pay_cta')}
          accessibilityHint={t('payment.pay_hint')}
          onPress={onPay}
        >
          {t('payment.pay_cta')}
        </Button>

        {/* UTR self-attest — permissive client hint; the server validates (12-digit or 22-char). */}
        <Text accessibilityRole="text">{t('payment.utr_label')}</Text>
        <Input
          value={utr}
          onChangeText={(v) => {
            setError(null)
            setUtr(v)
          }}
          autoCapitalize="characters"
          accessibilityLabel={t('payment.utr_label')}
          accessibilityHint={t('payment.utr_help')}
        />
        <Text color="$colorPress" accessibilityRole="text">
          {t('payment.utr_help')}
        </Text>

        {/* Optional 6-digit Reference Code (D2 port seam) — skippable. */}
        <Text accessibilityRole="text">{t('payment.reference_code_label')}</Text>
        <Input
          value={referenceCode}
          onChangeText={setReferenceCode}
          keyboardType="number-pad"
          maxLength={6}
          accessibilityLabel={t('payment.reference_code_label')}
          accessibilityHint={t('payment.reference_code_help')}
        />
        <Text color="$colorPress" accessibilityRole="text">
          {t('payment.reference_code_help')}
        </Text>

        {/* Outstanding-step list — announced when the receipt saved but a prior step is incomplete.
            Includes a "Go back" CTA so users aren't stranded without a path to fix the step. */}
        {outstanding.length > 0 ? (
          <YStack gap="$2" accessibilityLiveRegion="polite">
            <Text color="$colorPress" accessibilityRole="text">
              {t('payment.outstanding_intro')}
            </Text>
            {outstanding.map((step) => (
              <Text key={step} accessibilityRole="text">
                {`• ${stepLabel(step)}`}
              </Text>
            ))}
            <Button
              height={48}
              accessibilityRole="button"
              accessibilityLabel={t('payment.go_back')}
              accessibilityHint={t('payment.go_back_hint')}
              onPress={() => router.back()}
            >
              {t('payment.go_back')}
            </Button>
          </YStack>
        ) : null}

        {errorBanner}

        <Button
          theme="accent"
          height={56}
          disabled={busy || !utr.trim()}
          accessibilityRole="button"
          accessibilityLabel={t('payment.confirm_cta')}
          accessibilityHint={t('payment.confirm_hint')}
          accessibilityState={{ disabled: busy || !utr.trim() }}
          onPress={onConfirm}
        >
          {busy ? <Spinner /> : t('payment.confirm_cta')}
        </Button>
      </YStack>
    </ScrollView>
  )
}
