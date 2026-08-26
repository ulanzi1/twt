// Claim-time DPDPA consent (Story 6.9, Task 5; AC1/AC4/D3) — the reserved (claim)/consent step.
//
// FOUR GRANULAR, INDEPENDENT, explicit-opt-in consent checkboxes (UX-DR2), all UNCHECKED by default:
//   (a) claim_time_dpdpa          — the trust's processing of PII (REQUIRED to continue — D3a default);
//   (b) sahyog_vivran_publication — Sahyog Vivran contributor-list/verifier publication (OPTIONAL);
//   (c) in_memoriam_listing       — In Memoriam appearance (OPTIONAL);
//   (d) sahyog_drive_publication  — the deceased member's NAME on the public Sahyog Drive (OPTIONAL)
//       — Story 11b.1 / D4(b) / Decision 2026-08-24-159 cl.6.
// Declining (b)/(c)/(d) NEVER blocks the claim (D3 — private processing must not compromise disbursement):
// they carry a dignified "you can choose private processing — this will not affect the claim" reassurance.
//
// ⭐⛔ WHY (d) IS ASKED HERE AND NOT LATER — it is the ONLY moment it can be asked. Consent is
// recordable only in the five PRE-ADJUDICATION claim states, and a pool (the thing Sahyog Drive lists)
// spawns one per APPROVED claim. ⇒ by the time the drive exists, this window has shut for good. A
// family not asked HERE can never be asked, and their drive can never carry the name.
// ⚠ Declining (d) removes a NAME, never a DRIVE: the drive still appears publicly with its code,
// district, close date and confirmed contribution count.
//
// The screen submits ONLY the box selections + the active locale — the SERVER resolves the canonical
// consent copy written as evidence (consent-copy integrity, D2). The displayed checkbox copy (the
// `dpdpa.*` claim i18n keys) is the SAME canonical text the server persists — single source per locale.
// NO PII is persisted to the local draft (only the lastStep marker); current grants are re-hydrated
// from the server on re-entry (the save-and-resume thread). The CallHelplineCTA fallback is preserved.

import { useEffect, useState } from 'react'

import { ApiError } from '@twt/api-client'
import { useLocale } from '@twt/i18n/react'
import { useRouter } from 'expo-router'
import { Button, Paragraph, Spinner, Text, XStack, YStack } from 'tamagui'

import { CallHelplineCTA } from '../../components/claim/CallHelplineCTA'
import { ClaimProxyFlowShell } from '../../components/claim/ClaimProxyFlowShell'
import { claimApi } from '../../lib/claim-api'
import { useClaimT } from '../../lib/claim-i18n'
import { loadClaimDraft, saveClaimDraft } from '../../lib/claim-draft'
import { useSession } from '../../lib/session-context'

/**
 * One grief-register consent row — a pressable checkbox with dignified copy, unchecked by default.
 * `label` is the SERVER-canonical consent text (single source per locale — the (b)/(c) copy already
 * carries the "you can decline without affecting the claim" reassurance, so there is no separate
 * reassurance line to drift from the evidence copy).
 */
function ConsentRow(props: {
  checked: boolean
  onToggle: () => void
  label: string
}): React.ReactElement {
  return (
    <XStack
      gap="$3"
      items="flex-start"
      onPress={props.onToggle}
      pressStyle={{ opacity: 0.7 }}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: props.checked }}
      accessibilityLabel={props.label}
    >
      <YStack
        width={26}
        height={26}
        rounded="$2"
        borderWidth={1.5}
        borderColor={props.checked ? '$accentBackground' : '$borderColor'}
        bg={props.checked ? '$accentBackground' : 'transparent'}
        items="center"
        justify="center"
      >
        {props.checked ? (
          <Text color="white" fontWeight="800" fontSize="$4">
            ✓
          </Text>
        ) : null}
      </YStack>
      <Paragraph flex={1}>{props.label}</Paragraph>
    </XStack>
  )
}

export default function ConsentScreen(): React.ReactElement {
  const t = useClaimT()
  const router = useRouter()
  const { locale } = useLocale()
  const { session } = useSession()
  const name = t('member_fallback')
  const memberId = session?.memberId
  const claimCaseId = memberId ? loadClaimDraft(memberId).claimCaseId : undefined

  // All FOUR boxes default UNCHECKED (explicit opt-in — UX-DR2; never pre-ticked).
  const [claimTimeDpdpa, setClaimTimeDpdpa] = useState(false)
  const [sahyogVivran, setSahyogVivran] = useState(false)
  const [inMemoriam, setInMemoriam] = useState(false)
  const [sahyogDrive, setSahyogDrive] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  // Re-entry: re-hydrate the currently-granted consents from the server (the save-and-resume thread).
  // Best-effort — a failure leaves the boxes at their unchecked default (never a hard error).
  useEffect(() => {
    if (!claimCaseId) return
    let active = true
    void (async () => {
      try {
        const status = await claimApi.dpdpaConsentStatus(claimCaseId)
        if (!active) return
        setClaimTimeDpdpa(status.granted.includes('claim_time_dpdpa'))
        setSahyogVivran(status.granted.includes('sahyog_vivran_publication'))
        setInMemoriam(status.granted.includes('in_memoriam_listing'))
        setSahyogDrive(status.granted.includes('sahyog_drive_publication'))
      } catch {
        // Absence-is-a-signal — leave the boxes unchecked.
      }
    })()
    return () => {
      active = false
    }
  }, [claimCaseId])

  async function onContinue(): Promise<void> {
    // (a) is required to proceed (D3a) — the button is disabled until it is checked, but guard anyway.
    if (!claimTimeDpdpa) return
    // Code review (2026-07-11): unlike document.tsx's defensive claimCaseId fallback (which only
    // affects an optional local marker), THIS screen enforces the one hard "required to proceed"
    // consent invariant (D3a) — silently advancing without a claimCaseId would let the family
    // continue believing they consented when no consent_records row was ever written server-side.
    // Surface an error instead and let the CallHelplineCTA below offer a path forward.
    if (!claimCaseId) {
      setError(t('dpdpa.error_missing_claim'))
      return
    }
    setBusy(true)
    setError(null)
    try {
      await claimApi.recordDpdpaConsent(claimCaseId, {
        claimTimeDpdpa,
        sahyogVivranPublication: sahyogVivran,
        inMemoriamListing: inMemoriam,
        sahyogDrivePublication: sahyogDrive,
        locale,
      })
      if (memberId) saveClaimDraft(memberId, { lastStep: 'consent' })
      router.push('/(claim)/document')
    } catch (e) {
      // A lapsed elevation is not expected here (no step-up on consent), but key on the code anyway.
      if (e instanceof ApiError && e.code === 'auth.step_up_required') {
        router.replace('/(claim)/handover-otp')
        return
      }
      setError(t('dpdpa.error'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <ClaimProxyFlowShell deceasedName={name}>
      <YStack gap="$4" pt="$4">
        <Text fontSize="$7" fontWeight="700">
          {t('dpdpa.title')}
        </Text>
        <Paragraph color="$colorPress">{t('dpdpa.help')}</Paragraph>

        <YStack gap="$4" pt="$2">
          <ConsentRow
            checked={claimTimeDpdpa}
            onToggle={() => setClaimTimeDpdpa((v) => !v)}
            label={t('dpdpa.processing')}
          />
          <ConsentRow
            checked={sahyogVivran}
            onToggle={() => setSahyogVivran((v) => !v)}
            label={t('dpdpa.sahyog_vivran')}
          />
          <ConsentRow
            checked={inMemoriam}
            onToggle={() => setInMemoriam((v) => !v)}
            label={t('dpdpa.in_memoriam')}
          />
          <ConsentRow
            checked={sahyogDrive}
            onToggle={() => setSahyogDrive((v) => !v)}
            label={t('dpdpa.sahyog_drive')}
          />
        </YStack>

        {error ? <Text color="#C0392B">{error}</Text> : null}

        <Button theme="accent" disabled={busy || !claimTimeDpdpa} onPress={() => void onContinue()}>
          {busy ? <Spinner /> : t('dpdpa.continue')}
        </Button>
        {!claimTimeDpdpa ? (
          <Paragraph size="$2" color="$colorPress">
            {t('dpdpa.processing_required_hint')}
          </Paragraph>
        ) : null}

        <CallHelplineCTA />
      </YStack>
    </ClaimProxyFlowShell>
  )
}
