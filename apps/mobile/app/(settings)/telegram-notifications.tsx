// Telegram notification settings — the Telegram opt-in surface (Story 5.5, Task 10; AC4/AC10).
//
// ONE server-state-driven screen for the "Receive notifications via Telegram" choice (a sibling to the
// WhatsApp opt-in screen):
//   unavailable — the Pariwar has Telegram disabled / no bot → an explanatory line, no toggle.
//   off / null / REVOKED — a "Want Telegram notifications? Tap here to enable" CTA → POST mints a PENDING and
//                 opens the t.me `/start` deep-link.
//   pending     — "Waiting for you to start the bot…" + a re-open CTA (the tg-webhook-processor worker
//                 advances PENDING → ACTIVE out-of-band on the bot `/start`; this screen reflects it on read).
//   active      — a confirmation + a revoke control (independently revocable).
//   blocked / expired — a dignified line + an "opt in again" CTA (a fresh PENDING; no inferred re-consent —
//                 the member must start the bot again with a new code).
//
// Bilingual copy via @twt/i18n (hi/en parity). No AsyncStorage — the state is server-driven; MMKV is the app's
// local-persistence primitive if any were ever needed ([[project_mmkv_asyncstorage_equivalent]]).

import { useCallback, useEffect, useState } from 'react'
import { Linking, ScrollView } from 'react-native'

import { useT } from '@twt/i18n/react'
import type { TelegramOptInStatusResponse } from '@twt/contracts'
import { Stack } from 'expo-router'
import { Button, H2, Paragraph, Spinner, Text, YStack } from 'tamagui'

import { memberAuth } from '../../lib/member-api'

type OptInState = TelegramOptInStatusResponse['state']

export default function TelegramNotificationSettingsScreen() {
  const t = useT()
  const [status, setStatus] = useState<TelegramOptInStatusResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async (): Promise<void> => {
    setLoading(true)
    setError(null)
    try {
      setStatus(await memberAuth.getTelegramOptInStatus())
    } catch {
      setError(t('telegramNotifications.error'))
    } finally {
      setLoading(false)
    }
  }, [t])

  useEffect(() => {
    void load()
  }, [load])

  /** Mint (or re-use) a PENDING opt-in, then open Telegram at the bot `/start` deep-link. */
  const onEnable = useCallback(async (): Promise<void> => {
    setBusy(true)
    setError(null)
    try {
      const res = await memberAuth.requestTelegramOptIn()
      try {
        await Linking.openURL(res.deepLink)
      } catch {
        // The PENDING mint already succeeded server-side even if opening Telegram failed (e.g. not
        // installed) — still refresh so the screen shows the re-open CTA instead of the stale "off" state.
        setError(t('telegramNotifications.error'))
      }
      await load()
    } catch {
      setError(t('telegramNotifications.error'))
    } finally {
      setBusy(false)
    }
  }, [load, t])

  /** Re-open Telegram for an outstanding PENDING (re-use its deep-link). */
  const onReopen = useCallback(async (): Promise<void> => {
    if (!status?.deepLink) return
    setBusy(true)
    setError(null)
    try {
      await Linking.openURL(status.deepLink)
    } catch {
      // No app can handle the t.me URL (e.g. Telegram not installed) — surface it rather than failing silently.
      setError(t('telegramNotifications.error'))
    } finally {
      setBusy(false)
    }
  }, [status, t])

  const onRevoke = useCallback(async (): Promise<void> => {
    setBusy(true)
    setError(null)
    try {
      await memberAuth.revokeTelegramOptIn()
      await load()
    } catch {
      setError(t('telegramNotifications.error'))
    } finally {
      setBusy(false)
    }
  }, [load, t])

  return (
    <ScrollView>
      <Stack.Screen options={{ title: t('telegramNotifications.title') }} />
      <YStack gap="$3" px="$6" py="$6" bg="$background">
        <H2>{t('telegramNotifications.title')}</H2>
        {loading ? (
          <Spinner testID="telegram-opt-in-loading" />
        ) : (
          <OptInBody
            state={status?.state ?? null}
            available={status?.available ?? false}
            busy={busy}
            t={t}
            onEnable={onEnable}
            onReopen={onReopen}
            onRevoke={onRevoke}
          />
        )}
        {error ? (
          <Text role="alert" color="$red10" testID="telegram-opt-in-error">
            {error}
          </Text>
        ) : null}
      </YStack>
    </ScrollView>
  )
}

interface OptInBodyProps {
  state: OptInState
  available: boolean
  busy: boolean
  t: ReturnType<typeof useT>
  onEnable: () => void | Promise<void>
  onReopen: () => void | Promise<void>
  onRevoke: () => void | Promise<void>
}

function OptInBody({ state, available, busy, t, onEnable, onReopen, onRevoke }: OptInBodyProps) {
  if (!available) {
    return <Paragraph testID="telegram-opt-in-unavailable">{t('telegramNotifications.unavailable')}</Paragraph>
  }

  if (state === 'PENDING') {
    return (
      <YStack gap="$2" testID="telegram-opt-in-pending">
        <Paragraph fontWeight="600">{t('telegramNotifications.pending_title')}</Paragraph>
        <Paragraph>{t('telegramNotifications.pending_desc')}</Paragraph>
        <Button disabled={busy} onPress={() => void onReopen()} testID="telegram-opt-in-reopen">
          {t('telegramNotifications.pending_resend')}
        </Button>
      </YStack>
    )
  }

  if (state === 'ACTIVE') {
    return (
      <YStack gap="$2" testID="telegram-opt-in-active">
        <Paragraph fontWeight="600">{t('telegramNotifications.active_title')}</Paragraph>
        <Paragraph>{t('telegramNotifications.active_desc')}</Paragraph>
        <Button disabled={busy} onPress={() => void onRevoke()} testID="telegram-opt-in-revoke">
          {t('telegramNotifications.revoke_cta')}
        </Button>
      </YStack>
    )
  }

  // BLOCKED → a dignified line + a fresh opt-in CTA (no inferred re-consent).
  if (state === 'BLOCKED') {
    return (
      <YStack gap="$2" testID="telegram-opt-in-retry">
        <Paragraph fontWeight="600">{t('telegramNotifications.blocked_title')}</Paragraph>
        <Paragraph>{t('telegramNotifications.blocked_desc')}</Paragraph>
        <Button disabled={busy} onPress={() => void onEnable()} testID="telegram-opt-in-enable">
          {t('telegramNotifications.retry_cta')}
        </Button>
      </YStack>
    )
  }

  // EXPIRED → a dignified line acknowledging the earlier attempt + a fresh opt-in CTA (no inferred re-consent).
  if (state === 'EXPIRED') {
    return (
      <YStack gap="$2" testID="telegram-opt-in-expired">
        <Paragraph fontWeight="600">{t('telegramNotifications.expired_title')}</Paragraph>
        <Paragraph>{t('telegramNotifications.expired_desc')}</Paragraph>
        <Button disabled={busy} onPress={() => void onEnable()} testID="telegram-opt-in-enable">
          {t('telegramNotifications.retry_cta')}
        </Button>
      </YStack>
    )
  }

  // null / REVOKED → the initial opt-in CTA.
  return (
    <YStack gap="$2" testID="telegram-opt-in-off">
      <Paragraph>{t('telegramNotifications.enable_hint')}</Paragraph>
      <Button disabled={busy} onPress={() => void onEnable()} testID="telegram-opt-in-enable">
        {t('telegramNotifications.enable_cta')}
      </Button>
    </YStack>
  )
}
