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
// Story 5.12 second review (2026-10-21): every read and mutation is bounded (P1 — the transport has no timeout, so a hung
// call froze the controls); a background refresh never clears an action's error unless the body it shows changed (P3); a
// failed action re-reads fresh (P4); polling and the foreground listener run only while the screen is focused (P5); a later
// state change is announced while the screen is in front (P6 — the body is replaced, so a screen-reader user would not
// hear the withdraw control appear or go).
//
// Bilingual copy via @twt/i18n (hi/en parity). No AsyncStorage — the state is server-driven; MMKV is the
// app's local-persistence primitive if any were ever needed ([[project_mmkv_asyncstorage_equivalent]]).

import { useCallback, useEffect, useRef, useState } from 'react'
import { AccessibilityInfo, AppState, Linking, ScrollView } from 'react-native'

import { useT } from '@twt/i18n/react'
import type { WaOptInStatusResponse } from '@twt/contracts'
import { Stack, useFocusEffect } from 'expo-router'
import { Button, H2, Paragraph, Spinner, Text, YStack } from 'tamagui'

import { memberAuth } from '../../lib/member-api'

type OptInState = WaOptInStatusResponse['state']
/** `load` — a status read failed; `action` — enable / re-open / withdraw failed (a background refresh keeps it). */
type ErrorSource = 'load' | 'action' | null

/**
 * `foreground` — spinner, clears every error; `background` — joins an in-flight read; `refresh` — no spinner, but waits for
 * any older read and fetches fresh (after a failed action, whose effect that older read may predate).
 */
type LoadMode = 'foreground' | 'background' | 'refresh'

/** A call that never settles must not freeze the screen: the api-client transport has no timeout. */
const CALL_TIMEOUT_MS = 15_000
const PENDING_POLL_MS = 5000

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('wa-opt-in call timed out')), ms)
    promise.then(
      (value) => {
        clearTimeout(timer)
        resolve(value)
      },
      (err: unknown) => {
        clearTimeout(timer)
        reject(err)
      },
    )
  })
}

/**
 * What a screen reader is told when a later read changes the body: whether the yes is on, waiting, ended by WhatsApp, or not
 * on — ⛔ availability alone (an ACTIVE yes stays withdrawable while sending is disabled; anything else is "not on").
 */
function announcementKey(state: OptInState, available: boolean) {
  if (state === 'ACTIVE') return 'waNotifications.active_title'
  if (available && state === 'PENDING') return 'waNotifications.pending_title'
  if (available && state === 'BLOCKED_BY_META') return 'waNotifications.blocked_title'
  return 'waNotifications.unconfirmed_title'
}

export default function NotificationSettingsScreen() {
  const t = useT()
  const [status, setStatus] = useState<WaOptInStatusResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<ErrorSource>(null)
  const [focused, setFocused] = useState(false)
  const fetching = useRef<Promise<void> | null>(null)
  /** The announcement key of the body last shown — `null` until the first read lands. */
  const shownKey = useRef<string | null>(null)

  const load = useCallback(async (mode: LoadMode = 'foreground'): Promise<void> => {
    // Background callers share an in-flight read. After a mutation, wait for that older read and then
    // fetch again: its response may predate the withdrawal and must not leave the screen ACTIVE.
    // Every read is bounded by CALL_TIMEOUT_MS, so this wait is too.
    if (mode === 'background' && fetching.current) return fetching.current
    while (fetching.current) await fetching.current
    const pending = (async () => {
      if (mode === 'foreground') setLoading(true)
      setError((current) => (mode !== 'foreground' && current === 'action' ? current : null))
      try {
        const next = await withTimeout(memberAuth.getWaOptInStatus(), CALL_TIMEOUT_MS)
        // A read that changes what the screen shows supersedes an earlier action's error (a 409 "already off" now shows
        // off) — in the SAME update, so the new body never renders under the old error.
        const changed = shownKey.current !== null && shownKey.current !== announcementKey(next.state, next.available)
        setStatus(next)
        if (changed) setError((current) => (current === 'action' ? null : current))
      } catch {
        setError((current) => current ?? 'load')
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
    setFocused(true)
    void load('background')
    return () => setFocused(false)
  }, [load]))

  useEffect(() => {
    if (!focused) return
    let previous = AppState.currentState
    const subscription = AppState.addEventListener('change', (next) => {
      if (next === 'active' && previous !== 'active') void load('background')
      previous = next
    })
    return () => subscription.remove()
  }, [focused, load])

  useEffect(() => {
    if (!focused || status?.state !== 'PENDING') return
    // Returning from WhatsApp can precede the webhook by a minute. Poll only this transitional state,
    // and keep its controls visible during refresh. Foreground refresh also handles ACTIVE → STOP.
    const timer = setInterval(() => {
      if (AppState.currentState !== 'background' && AppState.currentState !== 'inactive') void load('background')
    }, PENDING_POLL_MS)
    return () => clearInterval(timer)
  }, [focused, status?.state, load])

  // The first read IS the screen; a later one that changes the body (PENDING → ACTIVE from polling, an external STOP) is
  // announced while the screen is in front, so the withdraw control appearing or going reaches a screen-reader user too.
  const shownState = status ? announcementKey(status.state, status.available) : null
  const announcement = shownState ? t(shownState) : null
  useEffect(() => {
    if (shownState === null) return
    const previous = shownKey.current
    shownKey.current = shownState
    if (previous === null || previous === shownState) return
    if (focused && AppState.currentState === 'active' && announcement) AccessibilityInfo.announceForAccessibility(announcement)
  }, [shownState, announcement, focused])

  /** Mint (or re-use) a PENDING opt-in, then open WhatsApp pre-filled with the verification phrase. */
  const onEnable = useCallback(async (): Promise<void> => {
    setBusy(true)
    setError(null)
    try {
      const res = await withTimeout(memberAuth.requestWaOptIn(), CALL_TIMEOUT_MS)
      await Linking.openURL(res.deepLink)
      await load()
    } catch {
      // The screen may be stale (a 409 — already on) or the mint may have landed before WhatsApp failed to open: re-read.
      setError('action')
      void load('refresh')
    } finally {
      setBusy(false)
    }
  }, [load])

  /** Re-open WhatsApp for an outstanding PENDING (re-use its deep-link). */
  const onReopen = useCallback(async (): Promise<void> => {
    if (!status?.deepLink) return
    setBusy(true)
    setError(null)
    try {
      await Linking.openURL(status.deepLink)
    } catch {
      // No app can handle the wa.me URL (e.g. WhatsApp not installed) — surface it rather than failing silently.
      setError('action')
    } finally {
      setBusy(false)
    }
  }, [status])

  const onRevoke = useCallback(async (): Promise<void> => {
    setBusy(true)
    setError(null)
    try {
      await withTimeout(memberAuth.revokeWaOptIn(), CALL_TIMEOUT_MS)
      await load()
    } catch {
      // A 409 means the yes already ended elsewhere (a STOP, a trustee, Meta): re-read rather than keep a stale ACTIVE body.
      setError('action')
      void load('refresh')
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
        ) : status === null ? null : (
          // ⛔ a body until a read succeeds: `available` would default to false and say "not available for your Pariwar".
          <OptInBody
            state={status.state}
            available={status.available}
            busy={busy}
            t={t}
            onEnable={onEnable}
            onReopen={onReopen}
            onRevoke={onRevoke}
          />
        )}
        {error !== null ? (
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
