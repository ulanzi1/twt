// Notification settings — the WhatsApp opt-in surface (Story 5.4, Task 6; AC1/AC4).
//
// ONE server-state-driven screen for the "Receive notifications via WhatsApp" choice:
//   unavailable — the Pariwar has WA disabled / no number → an explanatory line; a standing yes can still be withdrawn.
//   off / null  — a "Want WhatsApp notifications? Tap here to enable" CTA → POST mints a PENDING and
//                 opens the wa.me Send-Hello deep-link (pre-filled with the verification phrase).
//   pending     — "Waiting for your WhatsApp message…" + a re-open-WhatsApp CTA (the inbound-webhook
//                 worker advances PENDING → ACTIVE out-of-band; this screen reflects it on next read).
//   active      — a confirmation + a revoke control (independently revocable). Story 5.12 (`-364` option A): a yes lasts
//                 until the member takes it back, so the control renders for EVERY ACTIVE response — ⛔ conditioned on
//                 `windowExpiresAt` (Meta's free-form window end, ⛔ the opt-in's end).
//   blocked / unconfirmed — a dignified line + a "turn on again" retry CTA (a fresh PENDING; no inferred
//                 re-consent — the member must send a new WhatsApp message). EXPIRED_24H_WINDOW now means only "a request
//                 never confirmed" (Story 5.12, LY3/LY10) — the screen never says "expired" (condition 1).
//
// Story 5.12 (F13a) — one initial load, then focus/foreground refresh and polling while PENDING. Errors are a flag
// translated at render, so no callback depends on `t` (`useT()`
// returns a fresh closure every render — a `[t]` dependency re-fetched on every render, endlessly).
//
// Bilingual copy via @twt/i18n (hi/en parity). No AsyncStorage — the state is server-driven; MMKV is the
// app's local-persistence primitive if any were ever needed ([[project_mmkv_asyncstorage_equivalent]]).

import { useCallback, useEffect, useRef, useState } from 'react'
import { AppState, Linking, ScrollView } from 'react-native'

import { useT } from '@twt/i18n/react'
import type { WaOptInStatusResponse } from '@twt/contracts'
import { Stack, useFocusEffect } from 'expo-router'
import { Button, H2, Paragraph, Spinner, Text, YStack } from 'tamagui'

import { memberAuth } from '../../lib/member-api'

type OptInState = WaOptInStatusResponse['state']

export default function NotificationSettingsScreen() {
  const t = useT()
  const [status, setStatus] = useState<WaOptInStatusResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(false)
  const fetching = useRef<Promise<void> | null>(null)

  const load = useCallback(async (background = false): Promise<void> => {
    // Background callers share an in-flight read. After a mutation, wait for that older read and then
    // fetch again: its response may predate the withdrawal and must not leave the screen ACTIVE.
    if (background && fetching.current) return fetching.current
    while (fetching.current) await fetching.current
    const pending = (async () => {
      if (!background) setLoading(true)
      setError(false)
      try {
        setStatus(await memberAuth.getWaOptInStatus())
      } catch {
        setError(true)
      } finally {
        setLoading(false)
      }
    })()
    fetching.current = pending
    try {
      await pending
    } finally {
      fetching.current = null
    }
  }, [])

  useFocusEffect(useCallback(() => {
    void load(true)
  }, [load]))

  useEffect(() => {
    let previous = AppState.currentState
    const subscription = AppState.addEventListener('change', (next) => {
      if (next === 'active' && previous !== 'active') void load(true)
      previous = next
    })
    return () => subscription.remove()
  }, [load])

  useEffect(() => {
    if (status?.state !== 'PENDING') return
    // Returning from WhatsApp can precede the webhook by a minute. Poll only this transitional state,
    // and keep its controls visible during refresh. Foreground refresh also handles ACTIVE → STOP.
    const timer = setInterval(() => {
      if (AppState.currentState !== 'background' && AppState.currentState !== 'inactive') void load(true)
    }, 5000)
    return () => clearInterval(timer)
  }, [status?.state, load])

  /** Mint (or re-use) a PENDING opt-in, then open WhatsApp pre-filled with the verification phrase. */
  const onEnable = useCallback(async (): Promise<void> => {
    setBusy(true)
    setError(false)
    try {
      const res = await memberAuth.requestWaOptIn()
      await Linking.openURL(res.deepLink)
      await load()
    } catch {
      setError(true)
    } finally {
      setBusy(false)
    }
  }, [load])

  /** Re-open WhatsApp for an outstanding PENDING (re-use its deep-link). */
  const onReopen = useCallback(async (): Promise<void> => {
    if (!status?.deepLink) return
    setBusy(true)
    setError(false)
    try {
      await Linking.openURL(status.deepLink)
    } catch {
      // No app can handle the wa.me URL (e.g. WhatsApp not installed) — surface it rather than failing silently.
      setError(true)
    } finally {
      setBusy(false)
    }
  }, [status])

  const onRevoke = useCallback(async (): Promise<void> => {
    setBusy(true)
    setError(false)
    try {
      await memberAuth.revokeWaOptIn()
      await load()
    } catch {
      setError(true)
    } finally {
      setBusy(false)
    }
  }, [load])

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
            {t('waNotifications.error')}
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
  if (state === 'ACTIVE') {
    return (
      <YStack gap="$2" testID="wa-opt-in-active">
        {available ? (
          <>
            <Paragraph fontWeight="600">{t('waNotifications.active_title')}</Paragraph>
            <Paragraph>{t('waNotifications.active_desc')}</Paragraph>
          </>
        ) : (
          <Paragraph testID="wa-opt-in-unavailable">{t('waNotifications.unavailable')}</Paragraph>
        )}
        <Button disabled={busy} onPress={() => void onRevoke()} testID="wa-opt-in-revoke">
          {t('waNotifications.revoke_cta')}
        </Button>
      </YStack>
    )
  }

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

  // BLOCKED_BY_META (Meta 131050 — the member's own opt-out, Story 5.12 LY8) / EXPIRED_24H_WINDOW (a request never
  // confirmed — LY3) → a dignified line + a fresh opt-in CTA (no inferred re-consent).
  if (state === 'BLOCKED_BY_META' || state === 'EXPIRED_24H_WINDOW') {
    const isBlocked = state === 'BLOCKED_BY_META'
    return (
      <YStack gap="$2" testID="wa-opt-in-retry">
        <Paragraph fontWeight="600">
          {isBlocked ? t('waNotifications.blocked_title') : t('waNotifications.unconfirmed_title')}
        </Paragraph>
        <Paragraph>{isBlocked ? t('waNotifications.blocked_desc') : t('waNotifications.unconfirmed_desc')}</Paragraph>
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
