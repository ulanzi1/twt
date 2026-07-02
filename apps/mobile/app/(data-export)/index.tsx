// DPDPA data export — the request → poll → step-up → download flow (Story 3.11, Task 7; AC1/AC3).
//
// ONE screen, driven by the export's server-side status:
//   idle     — an explanatory line (data-portability right) + "Prepare my data" CTA (session only).
//   preparing— after requesting, poll GET :id until `ready` (calm "preparing your data…" state). The
//              Epic-3 payload is sub-second but we design for the wait (Epic 7/8 will grow it).
//   ready    — a "Download" CTA that drives step-up ('data_export' context) → on success hands the ZIP
//              to the OS (write to cache + share). The download is one-time + 24h — a consumed/expired
//              export surfaces its dignified copy and offers a fresh prepare.
//   saved    — success confirmation after saveAndShareExport resolves; offers a fresh prepare CTA.
//   failed   — a calm failure + retry.
//
// Calm/neutral register — the export is a RIGHT, framed without urgency. ScrollView wraps the content
// (3.5 clipping lesson). The downloaded bytes are handed straight to the OS (never MMKV/a draft — the
// 3.9 PII-in-draft lesson). Step-up 403 is detected by error.code (useStepUpGate), not the bare 403.

import { useEffect, useRef, useState } from 'react'
import { ScrollView } from 'react-native'

import { useT } from '@twt/i18n/react'
import { ApiError } from '@twt/api-client'
import { Stack } from 'expo-router'
import { Button, H2, Input, Paragraph, Spinner, Text, YStack } from 'tamagui'

import { memberAuth } from '../../lib/member-api'
import { saveAndShareExport } from '../../lib/save-export'
import { useStepUpGate } from '../../components/life-events/useStepUpGate'

type Phase = 'idle' | 'preparing' | 'ready' | 'saved' | 'failed'

/** Poll cadence for the status GET while an export is being generated. */
const POLL_INTERVAL_MS = 1500

export default function DataExportScreen() {
  const t = useT()
  const stepUp = useStepUpGate('data_export')

  const [phase, setPhase] = useState<Phase>('idle')
  const [exportId, setExportId] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  function stopPolling(): void {
    if (pollRef.current !== null) {
      clearInterval(pollRef.current)
      pollRef.current = null
    }
  }

  // Clear the poll timer on unmount.
  useEffect(() => stopPolling, [])

  /** Request (or resume) an export, then start polling its status. */
  async function onPrepare(): Promise<void> {
    setBusy(true)
    setError(null)
    try {
      const res = await memberAuth.requestDataExport()
      setExportId(res.exportId)
      if (res.status === 'ready') {
        setPhase('ready')
      } else if (res.status === 'failed') {
        setPhase('failed')
      } else {
        setPhase('preparing')
        startPolling(res.exportId)
      }
    } catch {
      setError(t('dataExport.error_generic'))
    } finally {
      setBusy(false)
    }
  }

  function startPolling(id: string): void {
    stopPolling()
    pollRef.current = setInterval(() => {
      void (async () => {
        try {
          const status = await memberAuth.getDataExportStatus(id)
          if (status.status === 'ready') {
            stopPolling()
            setPhase('ready')
          } else if (status.status === 'failed' || status.status === 'expired' || status.status === 'consumed') {
            stopPolling()
            if (status.status === 'consumed') setError(t('dataExport.consumed'))
            setPhase('failed')
          }
        } catch {
          stopPolling()
          setError(t('dataExport.error_generic'))
          setPhase('failed')
        }
      })()
    }, POLL_INTERVAL_MS)
  }

  /** Map a download ApiError to the right dignified copy. */
  function downloadErrorMessage(err: unknown): string {
    if (err instanceof ApiError) {
      if (err.code === 'data_export.consumed') return t('dataExport.consumed')
      if (err.code === 'data_export.expired') return t('dataExport.expired')
    }
    return t('dataExport.error_generic')
  }

  /** Run the download; on step-up demand the OTP loop reveals the input (guard returns undefined). */
  async function onDownload(): Promise<void> {
    if (!exportId) return
    setBusy(true)
    setError(null)
    try {
      const bytes = await stepUp.guard(() => memberAuth.downloadDataExport(exportId))
      if (bytes !== undefined) {
        await saveAndShareExport(exportId, bytes)
        setPhase('saved')
      }
    } catch (err) {
      const errCode = err instanceof ApiError ? err.code : ''
      setError(downloadErrorMessage(err))
      // consumed/expired: the one-time token is gone — no point keeping the Download button.
      if (errCode === 'data_export.consumed' || errCode === 'data_export.expired') {
        setPhase('failed')
      }
    } finally {
      setBusy(false)
    }
  }

  /** Verify the step-up OTP, then retry the SAME download (now elevated) and hand it to the OS. */
  async function onVerifyOtp(): Promise<void> {
    if (!exportId) return
    setBusy(true)
    setError(null)
    let verifySucceeded = false
    try {
      const bytes = await stepUp.verifyAndRetry(() => {
        verifySucceeded = true
        return memberAuth.downloadDataExport(exportId)
      })
      await saveAndShareExport(exportId, bytes)
      setPhase('saved')
    } catch (err) {
      const errCode = err instanceof ApiError ? err.code : ''
      setError(downloadErrorMessage(err))
      if (verifySucceeded) {
        if (errCode === 'data_export.consumed' || errCode === 'data_export.expired') {
          // One-time token gone (concurrent download or server-side expiry) — no Download to restore.
          setPhase('failed')
        } else {
          // Elevation is live but download/save failed — restore the Download button.
          stepUp.reset()
        }
      }
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <Stack.Screen options={{ title: t('dataExport.title') }} />
      <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
        <YStack flex={1} gap="$4" px="$6" py="$6" bg="$background">
          <H2>{t('dataExport.title')}</H2>
          <Paragraph color="$colorPress">{t('dataExport.intro')}</Paragraph>

          {error ? (
            <Text color="#C0392B" accessibilityLiveRegion="polite">
              {error}
            </Text>
          ) : null}

          {phase === 'idle' ? (
            <Button
              theme="accent"
              height={56}
              disabled={busy}
              accessibilityRole="button"
              accessibilityLabel={t('dataExport.request_cta')}
              onPress={onPrepare}
            >
              {busy ? <Spinner /> : t('dataExport.request_cta')}
            </Button>
          ) : null}

          {phase === 'preparing' ? (
            <YStack gap="$3" accessibilityLiveRegion="polite">
              <Spinner />
              <Text>{t('dataExport.preparing')}</Text>
              <Paragraph color="$colorPress">{t('dataExport.preparing_hint')}</Paragraph>
            </YStack>
          ) : null}

          {phase === 'ready' ? (
            <YStack gap="$4">
              <H2>{t('dataExport.ready_title')}</H2>
              <Paragraph color="$colorPress">{t('dataExport.ready_hint')}</Paragraph>
              {stepUp.needsOtp ? (
                <YStack gap="$3">
                  <Text accessibilityRole="text" accessibilityLiveRegion="polite">
                    {t('dataExport.step_up_required')}
                  </Text>
                  <Input
                    value={stepUp.otp}
                    onChangeText={stepUp.setOtp}
                    keyboardType="number-pad"
                    maxLength={6}
                    height={48}
                    accessibilityLabel={t('dataExport.step_up_required')}
                    accessibilityHint={t('dataExport.step_up_hint')}
                  />
                  <Button
                    theme="accent"
                    height={56}
                    disabled={busy || !stepUp.otp.trim()}
                    accessibilityRole="button"
                    accessibilityLabel={t('auth.verify')}
                    onPress={onVerifyOtp}
                  >
                    {busy ? <Spinner /> : t('auth.verify')}
                  </Button>
                  <Button
                    chromeless
                    height={40}
                    accessibilityRole="button"
                    accessibilityLabel={t('dataExport.step_up_cancel')}
                    onPress={stepUp.reset}
                  >
                    {t('dataExport.step_up_cancel')}
                  </Button>
                </YStack>
              ) : (
                <Button
                  theme="accent"
                  height={56}
                  disabled={busy}
                  accessibilityRole="button"
                  accessibilityLabel={t('dataExport.download_cta')}
                  onPress={onDownload}
                >
                  {busy ? <Spinner /> : t('dataExport.download_cta')}
                </Button>
              )}
            </YStack>
          ) : null}

          {phase === 'saved' ? (
            <YStack gap="$4" accessibilityLiveRegion="polite">
              <Paragraph color="$colorPress">{t('dataExport.saved')}</Paragraph>
              <Button
                chromeless
                height={40}
                accessibilityRole="button"
                accessibilityLabel={t('dataExport.retry')}
                onPress={() => {
                  stepUp.reset()
                  setPhase('idle')
                  setExportId(null)
                  setError(null)
                }}
              >
                {t('dataExport.retry')}
              </Button>
            </YStack>
          ) : null}

          {phase === 'failed' ? (
            <YStack gap="$4">
              {!error ? <Paragraph color="$colorPress">{t('dataExport.failed')}</Paragraph> : null}
              <Button
                theme="accent"
                height={56}
                disabled={busy}
                accessibilityRole="button"
                accessibilityLabel={t('dataExport.retry')}
                onPress={() => {
                  stepUp.reset()
                  setPhase('idle')
                  setExportId(null)
                  setError(null)
                }}
              >
                {t('dataExport.retry')}
              </Button>
            </YStack>
          ) : null}
        </YStack>
      </ScrollView>
    </>
  )
}
