// Annual Vyawastha Shulk renewal payment screen — Story 3.8, D1 patch.
//
// Reached from the home-screen RenewalStatusWidget CTA (`router.push('/(renewal)/payment')`).
// Mirrors the signup (signup)/payment.tsx flow but stripped of signup-only concerns:
//   · NO reference-code port seam (renewal-only — field-worker attribution is signup-only)
//   · NO lock-in gate echo (`renewed` boolean is sufficient)
//   · NO wizard progress bar (a returning member, not a new signup)
// On success, invalidates ['member', 'renewal-status'] and navigates back to the home tab.

import { useEffect, useState } from 'react'
import { Linking, ScrollView } from 'react-native'

import { useT } from '@twt/i18n/react'
import { useQueryClient } from '@tanstack/react-query'
import { Stack, useRouter } from 'expo-router'
import { Button, H2, Input, Paragraph, Spinner, Text, YStack } from 'tamagui'

import { memberAuth } from '../../lib/member-api'

interface IntentData {
  upiUrl: string
  tr: string
  amountInr: number
}

export default function RenewalPaymentScreen() {
  const t = useT()
  const router = useRouter()
  const queryClient = useQueryClient()

  const [intent, setIntent] = useState<IntentData | null>(null)
  const [loadFailed, setLoadFailed] = useState(false)
  const [retryCount, setRetryCount] = useState(0)
  const [utr, setUtr] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    setLoadFailed(false)
    void (async () => {
      try {
        const data = await memberAuth.vyawasthaShulkRenewIntent()
        if (active) setIntent({ upiUrl: data.upiUrl, tr: data.tr, amountInr: data.amountInr })
      } catch {
        if (active) setLoadFailed(true)
      }
    })()
    return () => {
      active = false
    }
  }, [retryCount])

  async function onPay(): Promise<void> {
    if (!intent) return
    setError(null)
    try {
      await Linking.openURL(intent.upiUrl)
    } catch {
      setError(t('payment.error_generic'))
    }
  }

  async function onConfirm(): Promise<void> {
    if (!intent) return
    const trimmedUtr = utr.trim()
    if (!trimmedUtr) {
      setError(t('payment.utr_required'))
      return
    }
    setBusy(true)
    setError(null)
    try {
      await memberAuth.vyawasthaShulkRenewConfirm({ tr: intent.tr, utr: trimmedUtr })
      await queryClient.invalidateQueries({ queryKey: ['member', 'renewal-status'] })
      router.replace('/(tabs)')
    } catch {
      setError(t('payment.error_generic'))
    } finally {
      setBusy(false)
    }
  }

  if (loadFailed) {
    return (
      <>
        <Stack.Screen options={{ title: t('renewal.title') }} />
        <YStack flex={1} justify="center" gap="$4" px="$6" bg="$background">
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
      </>
    )
  }

  if (!intent) {
    return (
      <>
        <Stack.Screen options={{ title: t('renewal.title') }} />
        <YStack flex={1} justify="center" items="center" bg="$background">
          <Spinner accessibilityLabel={t('loading')} />
        </YStack>
      </>
    )
  }

  return (
    <>
      <Stack.Screen options={{ title: t('renewal.title') }} />
      <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
        <YStack gap="$4" px="$6" py="$6" bg="$background">
          <H2 accessibilityRole="header">{t('renewal.title')}</H2>

          <Paragraph color="$colorPress" accessibilityRole="text">
            {t('renewal.due_soon')}
          </Paragraph>

          <Text fontWeight="600" accessibilityRole="text">
            {`${t('payment.amount_label')}: ₹${intent.amountInr}`}
          </Text>

          <Button
            theme="accent"
            height={56}
            accessibilityRole="button"
            accessibilityLabel={t('renewal.renew_cta_a11y')}
            accessibilityHint={t('renewal.renew_cta_hint')}
            onPress={onPay}
          >
            {t('renewal.renew_cta')}
          </Button>

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
          <Text color="$colorPress" fontSize="$2" accessibilityRole="text">
            {t('payment.utr_help')}
          </Text>

          {error ? (
            <Text color="#C0392B" accessibilityRole="alert" accessibilityLiveRegion="assertive">
              {error}
            </Text>
          ) : null}

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
    </>
  )
}
