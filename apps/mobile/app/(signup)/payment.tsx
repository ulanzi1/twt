// Signup payment-step PLACEHOLDER — Story 3.6a (Task 6; AC4(d) / AC5 scope guard).
//
// The wizard's final hand-off. 3.6a deliberately STOPS here: it does NOT build the ₹110 Vyawastha
// Shulk UPI flow, the receipt, the reference-code seam, or the lock-in entry gate — ALL of that is
// Story 3.6b, which REPLACES this file with the real payment + lock-in screen. A member reaching this
// step has been created (pending-kyc), progressed through KYC (→ pending-fee), and recorded
// nominees + medical + T&C; the lifecycle does not advance past pending-fee until 3.6b.
//
// ── Accessibility (AC4 / P0-2c) ───────────────────────────────────────────────────────────────
// The placeholder copy is announced (polite live region); the continue CTA is labelled. Bilingual.

import { useRouter } from 'expo-router'

import { useT } from '@twt/i18n/react'
import { Button, H2, Paragraph, YStack } from 'tamagui'

export default function PaymentPlaceholderScreen() {
  const t = useT()
  const router = useRouter()

  return (
    <YStack flex={1} justify="center" gap="$4" px="$6" bg="$background">
      <H2>{t('wizard.payment_pending_title')}</H2>
      <Paragraph color="$colorPress" accessibilityRole="text" accessibilityLiveRegion="polite">
        {t('wizard.payment_pending_body')}
      </Paragraph>
      <Button
        theme="accent"
        height={56}
        accessibilityRole="button"
        accessibilityLabel={t('tc.continue')}
        accessibilityHint={t('payment.continue_hint')}
        onPress={() => router.replace('/(tabs)')}
      >
        {t('tc.continue')}
      </Button>
    </YStack>
  )
}
