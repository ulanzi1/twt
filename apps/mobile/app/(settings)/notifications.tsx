// Notification settings — the WhatsApp opt-in surface (Story 5.4, Task 6; AC1/AC4).
//
// ONE server-state-driven screen for the "Receive notifications via WhatsApp" choice:
//   unavailable — the Pariwar has WA disabled / no number → an explanatory line, no toggle.
//   off / null  — a "Want WhatsApp notifications? Tap here to enable" CTA → POST mints a PENDING and
//                 opens the wa.me Send-Hello deep-link (pre-filled with the verification phrase).
//   pending     — "Waiting for your WhatsApp message…" + a re-open-WhatsApp CTA (the inbound-webhook
//                 worker advances PENDING → ACTIVE out-of-band; this screen reflects it on next read).
//   active      — a confirmation + a revoke control (independently revocable).
//   blocked / expired — a dignified line + a "opt in again" retry CTA (a fresh PENDING; no inferred
//                 re-consent — the member must send a new WhatsApp message).
//
// Bilingual copy via @twt/i18n (hi/en parity). No AsyncStorage — the state is server-driven; MMKV is the
// app's local-persistence primitive if any were ever needed ([[project_mmkv_asyncstorage_equivalent]]).

import { useCallback, useEffect, useState } from 'react'
import { Linking, ScrollView } from 'react-native'

import { useT } from '@twt/i18n/react'
import type { WaOptInStatusResponse } from '@twt/contracts'
import { Stack } from 'expo-router'
import { Button, H2, Paragraph, Spinner, Text, YStack } from 'tamagui'

import { memberAuth } from '../../lib/member-api'

type OptInState = WaOptInStatusResponse['state']

export default function NotificationSettingsScreen() {
  const t = useT()
  const [status, setStatus] = useState<WaOptInStatusResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async (): Promise<void> => {
    setLoading(true)
    setError(null)
    try {
      setStatus(await memberAuth.getWaOptInStatus())
    } catch {
      setError(t('waNotifications.error'))
    } finally {
      setLoading(false)
    }
  }, [t])

  useEffect(() => {
    void load()
  }, [load])

  /** Mint (or re-use) a PENDING opt-in, then open WhatsApp pre-filled with the verification phrase. */
  const onEnable = useCallback(async (): Promise<void> => {
    setBusy(true)
    setError(null)
    try {
      const res = await memberAuth.requestWaOptIn()
      await Linking.openURL(res.deepLink)
      await load()
    } catch {
      setError(t('waNotifications.error'))
    } finally {
      setBusy(false)
    }
  }, [load, t])

  /** Re-open WhatsApp for an outstanding PENDING (re-use its deep-link). */
  const onReopen = useCallback(async (): Promise<void> => {
    if (!status?.deepLink) return
    setBusy(true)
    setError(null)
    try {
      await Linking.openURL(status.deepLink)
    } catch {
      // No app can handle the wa.me URL (e.g. WhatsApp not installed) — surface it rather than failing silently.
      setError(t('waNotifications.error'))
    } finally {
      setBusy(false)
    }
  }, [status, t])

  const onRevoke = useCallback(async (): Promise<void> => {
    setBusy(true)
    setError(null)
    try {
      await memberAuth.revokeWaOptIn()
      await load()
    } catch {
      setError(t('waNotifications.error'))
    } finally {
      setBusy(false)
    }
  }, [load, t])

  return (
    <ScrollView>
      <Stack.Screen options={{ title: t('waNotifications.title') }} />
      <YStack gap="$3" px="$6" py="$6" bg="$background">
        <H2>{t('waNotifications.title')}</H2>
        {loading ? (
          <Spinner testID="wa-opt-in-loading" />
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
          <Text role="alert" color="$red10" testID="wa-opt-in-error">
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
    return <Paragraph testID="wa-opt-in-unavailable">{t('waNotifications.unavailable')}</Paragraph>
  }

  if (state === 'PENDING') {
    return (
      <YStack gap="$2" testID="wa-opt-in-pending">
        <Paragraph fontWeight="600">{t('waNotifications.pending_title')}</Paragraph>
        <Paragraph>{t('waNotifications.pending_desc')}</Paragraph>
        <Button disabled={busy} onPress={() => void onReopen()} testID="wa-opt-in-reopen">
          {t('waNotifications.pending_resend')}
        </Button>
      </YStack>
    )
  }

  if (state === 'ACTIVE') {
    return (
      <YStack gap="$2" testID="wa-opt-in-active">
        <Paragraph fontWeight="600">{t('waNotifications.active_title')}</Paragraph>
        <Paragraph>{t('waNotifications.active_desc')}</Paragraph>
        <Button disabled={busy} onPress={() => void onRevoke()} testID="wa-opt-in-revoke">
          {t('waNotifications.revoke_cta')}
        </Button>
      </YStack>
    )
  }

  // BLOCKED_BY_META / EXPIRED_24H_WINDOW → a dignified line + a fresh opt-in CTA (no inferred re-consent).
  if (state === 'BLOCKED_BY_META' || state === 'EXPIRED_24H_WINDOW') {
    const isBlocked = state === 'BLOCKED_BY_META'
    return (
      <YStack gap="$2" testID="wa-opt-in-retry">
        <Paragraph fontWeight="600">
          {isBlocked ? t('waNotifications.blocked_title') : t('waNotifications.expired_title')}
        </Paragraph>
        <Paragraph>{isBlocked ? t('waNotifications.blocked_desc') : t('waNotifications.expired_desc')}</Paragraph>
        <Button disabled={busy} onPress={() => void onEnable()} testID="wa-opt-in-enable">
          {t('waNotifications.retry_cta')}
        </Button>
      </YStack>
    )
  }

  // null / REVOKED → the initial opt-in CTA.
  return (
    <YStack gap="$2" testID="wa-opt-in-off">
      <Paragraph>{t('waNotifications.enable_hint')}</Paragraph>
      <Button disabled={busy} onPress={() => void onEnable()} testID="wa-opt-in-enable">
        {t('waNotifications.enable_cta')}
      </Button>
    </YStack>
  )
}
