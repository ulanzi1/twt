// Claim-time DPDPA consent (Story 6.9, Task 5; AC1/AC4/D3) — the reserved (claim)/consent step.
//
// ⭐ ONE explicit-opt-in consent checkbox (UX-DR2), UNCHECKED by default:
//   (a) claim_time_dpdpa — the trust's processing of PII (REQUIRED to continue — D3a default).
//
// ⚠⛔ IT USED TO BE FOUR, AND THE OTHER THREE WERE RETIRED BY RULING — ⛔ NOT LOST, ⛔ NOT A
// REGRESSION, AND ⛔ NOT TO BE RESTORED AS A "MISSING FEATURE" (Story 11b.9; `2026-08-28-162` cl.2,
// `-160` cl.5-6). The retired boxes were:
//   ⛔ (b) sahyog_vivran_publication — Sahyog Vivran contributor-list/verifier publication;
//   ⛔ (c) in_memoriam_listing       — In Memoriam appearance;
//   ⛔ (d) sahyog_drive_publication  — the deceased member's NAME on the public Sahyog Drive.
//
// ⭐⭐ WHY (d) WENT: the authority for publishing a deceased member's name is now the MEMBER'S OWN
// accepted versioned T&C, carrying an express post-death publication clause (`-160` cl.3-4). The
// member already answered while alive, so ⛔ the family is not asked to speak for them at the worst
// moment of their life — and the family gets ⛔ NO VETO over the member's own name (cl.6). ⚠ The old
// gate is DE-AUTHORISED, ⛔ not ANDed and ⛔ not ORed with the new one.
// ⭐⭐ WHY (b)/(c) WENT: `-162` cl.2 retired them too, and REJECTED the alternative of re-wording
// them to cover family-owned content on the record — *"a control that survives by having its meaning
// quietly rewritten is worse than no control"*, because the family reasons about it using the OLD
// meaning. ⛔ RETIRED, ⛔ not reinterpreted.
//
// ⛔⛔ AND RETIRING A BOX IS ⛔ NOT DELETING A TYPE. The three `consent_type` enum values, migrations
// 0058 and 0112, and every `consent_records` row already written are all PRESERVED BY RULING
// (`-160` cl.5, `-162` cl.5). ⇒ ⛔ no new rows of those types are written, but a family who granted
// one BEFORE this story can still SEE it (the GET presence view) and still WITHDRAW it (both revoke
// routes) — those survive deliberately. ⛔ Removing them would be a rights regression wearing a
// cleanup's clothes.
//
// ⚠ (a) IS UNCHANGED, byte for byte: still required, still the basis for claim-time processing, and
// its `processing_required_hint` below is a REQUIRED-box hint — ⛔ not an optional-box reassurance,
// and ⛔ not something the retirement takes with it.
//
// The screen submits ONLY the box selection + the active locale — the SERVER resolves the canonical
// consent copy written as evidence (consent-copy integrity, D2). The displayed checkbox copy (the
// `dpdpa.*` claim i18n keys) is the SAME canonical text the server persists — single source per locale.
// NO PII is persisted to the local draft (only the lastStep marker); the current grant is re-hydrated
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
 * `label` is the SERVER-canonical consent text (single source per locale).
 *
 * ⚠ Still a REUSABLE row though only one caller remains: the retired optional boxes carried their
 * own "you can decline without affecting the claim" reassurance INSIDE their label strings, so that
 * reassurance left with them. ⛔ Do not re-add a standalone reassurance line for (a) — (a) is
 * REQUIRED, and telling a family they may decline it would be false.
 */
function ConsentRow(props: {
  checked: boolean
  onToggle: () => void
  label: string
}): React.ReactElement {
  return (
    // ⭐⛔ `accessible` IS EXPLICIT, AND IT IS LOAD-BEARING — load-bearing-invariant family 13(a)
    // (Review finding, 2026-08-27).
    //
    // ⚠ A container carrying `accessibilityLabel` that is NOT itself an accessibility element is
    // ⛔ NEVER ANNOUNCED. RN sets `accessible={true}` on `Pressable` BY DEFAULT — that default is
    // the only reason the pattern works elsewhere in this app — but a Tamagui `XStack` is ⛔ not a
    // `Pressable`, so the role, the label and the checked STATE were all being dropped: a
    // screen-reader user heard the label text as prose, with no role and ⛔ no indication of
    // whether the box was ticked.
    // ⛔ On the one screen where a family decides whether their deceased relative's name is
    // published to the open internet.
    //
    // ⭐ The worked example this follows deliberately:
    // `apps/mobile/components/panchayat/PinnedItem.tsx` — *"Dropping the `Pressable` drops the
    // mechanism, so the unit is re-established EXPLICITLY."*
    // ⛔ Do not remove this prop to "clean up": nothing in CI catches its absence — family 13 is
    // un-mechanized BY RULING (BigDev 2026-08-23, revisit at 11b.8), so a missed check here leaves
    // ⛔ no trace at all.
    <XStack
      gap="$3"
      items="flex-start"
      onPress={props.onToggle}
      pressStyle={{ opacity: 0.7 }}
      accessible={true}
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

  // The box defaults UNCHECKED (explicit opt-in — UX-DR2; never pre-ticked).
  const [claimTimeDpdpa, setClaimTimeDpdpa] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  // Re-entry: re-hydrate the current grant from the server (the save-and-resume thread).
  // Best-effort — a failure leaves the box at its unchecked default (never a hard error).
  // ⚠ The status response still LISTS the retired types when a family granted one before Story
  // 11b.9 — the GET presence view is preserved on purpose (see header). ⛔ This screen simply has no
  // box to hydrate from them any more; ⛔ do not re-add one to "use" the data.
  useEffect(() => {
    if (!claimCaseId) return
    let active = true
    void (async () => {
      try {
        const status = await claimApi.dpdpaConsentStatus(claimCaseId)
        if (!active) return
        setClaimTimeDpdpa(status.granted.includes('claim_time_dpdpa'))
      } catch {
        // Absence-is-a-signal — leave the box unchecked.
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
          {/* ⛔ ONE box. The three optional publication boxes that stood here were RETIRED by
              ruling (see header) — ⛔ do not re-add one without a decision that says so. */}
          <ConsentRow
            checked={claimTimeDpdpa}
            onToggle={() => setClaimTimeDpdpa((v) => !v)}
            label={t('dpdpa.processing')}
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
