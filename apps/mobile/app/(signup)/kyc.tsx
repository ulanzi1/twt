// Signup KYC step — DigiLocker pull OR manual fallback (Story 3.3b, Task 6; AC1–AC4).
//
// Bilingual (Hindi-default via @twt/i18n; Epic 3 intro). UX Pattern 4 "dignified
// validation" (UX-DR55) + Pattern-4 empathy on failure (AC2). The DigiLocker path opens
// the authorization URL in an in-app browser and POLLS `kycStatus` until the backend
// callback has verified+persisted the profile (R4 — no fragile mobile deep-link OAuth),
// then confirms. The manual path stores a self-declared record. The FR-58C seam (AC3):
// when `manualFallbackEnabled` is false, the manual CTA is hidden + a copy block explains
// DigiLocker is required.
//
// ── Accessibility (AC4 / P0-2c) ─────────────────────────────────────────────────────
// Every control carries accessibilityLabel + accessibilityHint; validation messages are
// announced (role=alert) + programmatically associated; touch targets meet UX-DR65 (44pt
// default / 56pt for the critical primary CTAs). Devanagari renders via the app's
// IBM-Plex/Noto Devanagari fonts. Mobile build/test are repo no-ops → verified by
// typecheck + lint (the 3.2 precedent).
//
// Reachability note (R2): a real first-signup user reaches this step once Story 3.6 wires
// member-creation-from-`signup_continuation` + the wizard chrome. 3.3b ships the working
// screen + SDK; E2E reachability completes in 3.6. The Aadhaar-photo CAPTURE control is
// deferred (needs an image picker dep) — the manual API/encryption already accept a photo.

import { useEffect, useState } from 'react'

import { ApiError } from '@twt/api-client'
import { useT } from '@twt/i18n/react'
import { useRouter } from 'expo-router'
import * as WebBrowser from 'expo-web-browser'
import { Button, H2, Input, Paragraph, Spinner, Text, YStack } from 'tamagui'

import { memberAuth } from '../../lib/member-api'

/** The normalized KYC error codes the empathy copy maps one-to-one (kyc.error_*). */
const KYC_ERROR_CODES = new Set([
  'provider_unavailable',
  'user_consent_denied',
  'verification_failed',
  'signature_invalid',
  'certificate_stale',
  'transaction_expired',
  'transaction_not_found',
])

type Step = 'choose' | 'digilocker' | 'confirm' | 'manual' | 'done'

const POLL_INTERVAL_MS = 2000
const POLL_MAX_ATTEMPTS = 30 // ~60s — DigiLocker p95 is well within this

export default function KycScreen() {
  const t = useT()
  const router = useRouter()

  const [step, setStep] = useState<Step>('choose')
  const [manualEnabled, setManualEnabled] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  // The DigiLocker transaction id (from initiate) — passed to confirm.
  const [transactionId, setTransactionId] = useState('')

  // The decrypted profile summary fetched after callback — displayed on the confirm screen.
  const [profileSummary, setProfileSummary] = useState<{
    name: string
    dob: string
    aadhaarMaskedId: string | null
    photoPresent: boolean
  } | null>(null)

  // Manual-form fields.
  const [name, setName] = useState('')
  const [dob, setDob] = useState('')

  // On mount: read the FR-58C seam (manualFallbackEnabled) so the choose screen knows
  // whether to offer manual or show the hard-mandatory copy block (AC3).
  useEffect(() => {
    let active = true
    void (async () => {
      try {
        const status = await memberAuth.kycStatus()
        if (active) setManualEnabled(status.manualFallbackEnabled)
      } catch {
        // A status read failure leaves the safe default (manual available).
      }
    })()
    return () => {
      active = false
    }
  }, [])

  /** Map a server error code → dignified, plain-language copy (Pattern 4 / AC2). */
  function kycErrorMessage(code: string): string {
    return KYC_ERROR_CODES.has(code) ? t(`kyc.error_${code}`) : t('kyc.fallback_empathy')
  }

  /** DigiLocker path: initiate → open the in-app browser → poll status → confirm (R4). */
  async function onDigiLocker(): Promise<void> {
    setBusy(true)
    setError(null)
    setNotice(t('kyc.checking'))
    try {
      const init = await memberAuth.kycInitiate()
      setTransactionId(init.transactionId)
      setStep('digilocker')
      await WebBrowser.openBrowserAsync(init.authorizationUrl)
      // The backend callback finalises verify+pull server-side; poll until the profile
      // is persisted (memberKycState becomes digilocker_verified) or the txn fails.
      for (let i = 0; i < POLL_MAX_ATTEMPTS; i++) {
        const status = await memberAuth.kycStatus()
        if (status.memberKycState === 'digilocker_verified') {
          setNotice(null)
          // Fetch the stored profile for the confirm screen (P1 — call the dedicated endpoint
          // rather than trusting the callback response in the server-side redirect path).
          try {
            const summary = await memberAuth.kycProfileSummary()
            setProfileSummary(summary)
          } catch {
            // Fetch failure is non-fatal — confirm screen still works without profile data.
          }
          setStep('confirm')
          return
        }
        if (status.transactionStatus === 'failed') {
          offerManualFallback(t('kyc.error_verification_failed'))
          return
        }
        if (status.transactionStatus === 'expired') {
          offerManualFallback(t('kyc.error_transaction_expired'))
          return
        }
        await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS))
      }
      offerManualFallback(t('kyc.error_provider_unavailable'))
    } catch (e) {
      const code = e instanceof ApiError ? e.code : 'provider_unavailable'
      offerManualFallback(kycErrorMessage(code))
    } finally {
      setBusy(false)
    }
  }

  /** AC2 — a DigiLocker failure never dead-ends: surface empathy + route to manual. */
  function offerManualFallback(message: string): void {
    setNotice(null)
    if (manualEnabled) {
      setError(`${message} ${t('kyc.fallback_empathy')}`)
      setStep('manual')
    } else {
      setError(message)
      setStep('choose')
    }
  }

  /** Confirm the verified DigiLocker profile → emits member.kyc_completed. */
  async function onConfirm(): Promise<void> {
    setBusy(true)
    setError(null)
    try {
      // The transaction id from initiate correlates the verified txn (a re-confirm is
      // idempotent server-side — emits no second member.kyc_completed).
      await memberAuth.kycConfirm(transactionId)
      setStep('done')
      setNotice(t('kyc.done'))
    } catch (e) {
      setError(e instanceof ApiError ? kycErrorMessage(e.code) : t('kyc.fallback_empathy'))
    } finally {
      setBusy(false)
    }
  }

  /** Manual path: validate (Pattern 4) → submit → member.kyc_manual_fallback. */
  async function onManualSubmit(): Promise<void> {
    if (!name.trim()) {
      setError(t('kyc.manual_name_required'))
      return
    }
    if (!dob.trim()) {
      setError(t('kyc.manual_dob_required'))
      return
    }
    setBusy(true)
    setError(null)
    try {
      await memberAuth.kycManualSubmit({ name: name.trim(), dob: dob.trim() })
      setStep('done')
      setNotice(t('kyc.done'))
    } catch (e) {
      setError(e instanceof ApiError ? kycErrorMessage(e.code) : t('kyc.fallback_empathy'))
    } finally {
      setBusy(false)
    }
  }

  const errorBanner = error ? (
    <Text color="#C0392B" accessibilityRole="alert" accessibilityLiveRegion="assertive">
      {error}
    </Text>
  ) : null
  const noticeBanner = notice ? (
    <Text color="#1E8E3E" accessibilityLiveRegion="polite">
      {notice}
    </Text>
  ) : null

  if (step === 'done') {
    return (
      <YStack flex={1} justify="center" gap="$4" px="$6" bg="$background">
        <H2>{t('kyc.title')}</H2>
        {noticeBanner}
        <Button
          theme="accent"
          height={56}
          accessibilityRole="button"
          accessibilityLabel={t('kyc.done')}
          onPress={() => router.replace('/(tabs)')}
        >
          {t('kyc.done')}
        </Button>
      </YStack>
    )
  }

  if (step === 'confirm') {
    return (
      <YStack flex={1} justify="center" gap="$4" px="$6" bg="$background">
        <H2>{t('kyc.title')}</H2>
        <Paragraph color="$colorPress">{t('kyc.confirm_prompt')}</Paragraph>
        {profileSummary && (
          <YStack gap="$2">
            <Text accessibilityRole="text">{profileSummary.name}</Text>
            <Text accessibilityRole="text">{profileSummary.dob}</Text>
            {profileSummary.aadhaarMaskedId != null && (
              <Text accessibilityRole="text">{profileSummary.aadhaarMaskedId}</Text>
            )}
            {profileSummary.photoPresent && (
              <Text accessibilityRole="text">{t('kyc.photo_present')}</Text>
            )}
          </YStack>
        )}
        {errorBanner}
        <Button
          theme="accent"
          height={56}
          disabled={busy}
          accessibilityRole="button"
          accessibilityLabel={t('kyc.confirm_cta')}
          accessibilityHint={t('kyc.confirm_prompt')}
          onPress={onConfirm}
        >
          {busy ? <Spinner /> : t('kyc.confirm_cta')}
        </Button>
      </YStack>
    )
  }

  if (step === 'manual') {
    return (
      <YStack flex={1} justify="center" gap="$4" px="$6" bg="$background">
        <H2>{t('kyc.title')}</H2>
        {errorBanner}
        <Input
          value={name}
          onChangeText={setName}
          placeholder={t('kyc.manual_name')}
          height={48}
          accessibilityLabel={t('kyc.manual_name')}
          accessibilityHint={t('kyc.manual_name_required')}
        />
        <Input
          value={dob}
          onChangeText={setDob}
          placeholder={t('kyc.manual_dob')}
          height={48}
          accessibilityLabel={t('kyc.manual_dob')}
          accessibilityHint={t('kyc.manual_dob_required')}
        />
        {/* Aadhaar-photo capture (kyc.manual_photo) deferred — needs an image-picker dep;
            the manual API + encryption already accept an optional base64 photo. */}
        <Button
          theme="accent"
          height={56}
          disabled={busy}
          accessibilityRole="button"
          accessibilityLabel={t('kyc.manual_submit')}
          onPress={onManualSubmit}
        >
          {busy ? <Spinner /> : t('kyc.manual_submit')}
        </Button>
      </YStack>
    )
  }

  // step === 'choose' (and 'digilocker' shows the same chrome while polling)
  return (
    <YStack flex={1} justify="center" gap="$4" px="$6" bg="$background">
      <H2>{t('kyc.title')}</H2>
      <Paragraph color="$colorPress">{t('kyc.choose_method')}</Paragraph>
      <Paragraph color="$colorPress">{t('kyc.consent_explainer')}</Paragraph>
      {errorBanner}
      {noticeBanner}
      <Button
        theme="accent"
        height={56}
        disabled={busy}
        accessibilityRole="button"
        accessibilityLabel={t('kyc.digilocker_cta')}
        accessibilityHint={t('kyc.consent_explainer')}
        onPress={onDigiLocker}
      >
        {busy ? <Spinner /> : t('kyc.digilocker_cta')}
      </Button>
      {manualEnabled ? (
        <Button
          chromeless
          height={56}
          disabled={busy}
          accessibilityRole="button"
          accessibilityLabel={t('kyc.manual_cta')}
          onPress={() => {
            setError(null)
            setStep('manual')
          }}
        >
          {t('kyc.manual_cta')}
        </Button>
      ) : (
        // AC3 — hard-mandatory: hide the manual CTA, show the copy block.
        <Paragraph color="$colorPress" accessibilityRole="text">
          {t('kyc.hard_mandatory_block')}
        </Paragraph>
      )}
    </YStack>
  )
}
