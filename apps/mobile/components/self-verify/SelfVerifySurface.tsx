// <SelfVerifySurface> — the member's yellow/red-stuck RECOVERY node (Story 9.7, Task 6; AC2/AC5).
//
// The UX-DR28 / UX §11 recovery surface: a plain-language explanation of WHY the contribution is still
// pending (empathy copy mapped from the machine reason-code — Pattern-4, NEVER "Error/Invalid/Failed"), the
// FR-32 screenshot-upload affordance (image OR PDF), and the always-reachable Story 8.11 `<CallHelplineCTA>`.
// It reads its own default / uploaded / resolved state via `useSelfVerifyQuery` and consumes the 9.6
// `<StatusPill status="red">` for the mismatch state.
//
// ── PURE RECOVERY, never adjudication (AC4) ──────────────────────────────────────────────────────────
// The upload is EVIDENCE INTAKE: it stores the screenshot + records the evidence event and advances the
// surface to `uploaded` — it NEVER greens the member. Only the Story 9.4 matcher or the Story 9.8 trustee
// flow confirms (`resolved`). The surface says so honestly ("our team is looking into it").
//
// ── Two entry points (the yellow-stuck-vs-red gap, Dev Notes) ────────────────────────────────────────
//   (a) the RED `<ActiveContributionCard>` "Fix this" affordance (a live mismatch — `wrong_pool` /
//       `amount_mismatch`); and
//   (b) the FR-32 hidden "Trouble with UTR?" disclosure in the YELLOW (still-verifying) card state, where a
//       member who paid but sees no confirmation can self-serve without a red flip (`fallback: true`).
// The push deep-link (`contributions/:pool_id`) lands on the card, which routes here when the pill is red.
//
// ── Grief-paced + a11y + i18n (AC5) ──────────────────────────────────────────────────────────────────
// Holds NO literal copy — every string routes through `useT('contribution')` (the tone-gate + Hindi-first /
// English-parity guard cover it). ≥56pt touch targets; the state-change is announced via
// `accessibilityLiveRegion="polite"`; the red pill conveys state via text+icon+ARIA (not colour alone, the
// 9.6 `<StatusPill>` contract). Devanagari renders without clipping at 360px (the $body/$heading fonts).

import { ApiError } from '@twt/api-client'
import { useT } from '@twt/i18n/react'
import type { ContributionMismatchReasonCode } from '@twt/contracts'
import * as DocumentPicker from 'expo-document-picker'
import * as ImagePicker from 'expo-image-picker'
import { useState } from 'react'
import { StyleSheet } from 'react-native'
import { Button, Paragraph, Spinner, Text, XStack, YStack } from 'tamagui'

import { CallHelplineCTA } from '../common/CallHelplineCTA'
import { StatusPill } from '../status-pill/StatusPill'
import { memberAuth } from '../../lib/member-api'
import { useSelfVerifyQuery } from './useSelfVerifyQuery'

const NS = { namespace: 'contribution' } as const

/** ≥56pt touch targets (UX-DR26 / AC5) — the same minimum the card's CTAs use. */
const TOUCH_TARGET = 56

/** The RN file descriptor FormData accepts for a multipart upload (the 9.3 BankStatementUpload precedent). */
interface PickedFile {
  uri: string
  name: string
  type: string
}

/**
 * Map the machine reason-code → the dignified explanation copy keys (Pattern-4). The reason bodies
 * (`wrong_pool.*` / `amount_mismatch.*` / `no_statement_entry.*`) pre-exist in the `contribution` catalog;
 * an unrecognised reason (or none — the "Trouble with UTR?" fallback) falls back to the generic copy, never
 * the raw enum. Story 9.11 (AC4): an `amount_mismatch` whose derived direction is `over` (the server sets
 * `overpayment`) renders the `amount_mismatch_over.*` variant ("you paid ₹X more…"); the generic
 * `amount_mismatch.*` copy stays for an under-payment / unknown-direction.
 */
function reasonCopyKeys(
  reason: ContributionMismatchReasonCode | null,
  isOverpayment: boolean,
): { title: string; body: string } {
  switch (reason) {
    case 'wrong_pool':
      return { title: 'wrong_pool.title', body: 'wrong_pool.body' }
    case 'amount_mismatch':
      return isOverpayment
        ? { title: 'amount_mismatch_over.title', body: 'amount_mismatch_over.body' }
        : { title: 'amount_mismatch.title', body: 'amount_mismatch.body' }
    case 'no_statement_entry':
      return { title: 'no_statement_entry.title', body: 'no_statement_entry.body' }
    default:
      return { title: 'selfVerify.generic.title', body: 'selfVerify.generic.body' }
  }
}

/**
 * Map an upload failure → the dignified Pattern-4 copy key (the `upi_intent.*` differentiated-error
 * precedent). Keys on `error.code`, never the raw message. Falls back to the generic retry copy for any
 * code without a dedicated dignified message (or a non-`ApiError` failure, e.g. a network drop).
 */
function uploadErrorKey(err: unknown): string {
  if (err instanceof ApiError) {
    switch (err.code) {
      case 'self_verify.too_large':
        return 'selfVerify.upload_error_too_large'
      case 'self_verify.unsupported_type':
        return 'selfVerify.upload_error_unsupported_type'
      case 'self_verify.file_quarantined':
        return 'selfVerify.upload_error_quarantined'
      case 'self_verify.storage_unavailable':
      case 'self_verify.upload_read_failed':
      case 'self_verify.append_retry_exhausted':
        return 'selfVerify.upload_error_unavailable'
      default:
        return 'selfVerify.upload_error'
    }
  }
  return 'selfVerify.upload_error'
}

export function SelfVerifySurface({
  poolId,
  fallback = false,
}: {
  poolId: string
  /** The FR-32 "Trouble with UTR?" entry — lets a still-verifying (yellow) member upload with no live mismatch. */
  fallback?: boolean
}): React.ReactElement | null {
  const t = useT()
  const { data, refetch } = useSelfVerifyQuery(poolId)
  const [uploading, setUploading] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)

  async function upload(file: PickedFile): Promise<void> {
    setNotice(null)
    setUploading(true)
    try {
      const form = new FormData()
      // RN multipart: append the { uri, name, type } descriptor (cast — RN's FormData accepts it).
      form.append('file', file as unknown as Blob)
      await memberAuth.memberUploadSelfVerifyScreenshot(form, poolId, { fallback })
    } catch (err) {
      // Dignified, differentiated failure copy — retry, never a hard crash. The pre-existing evidence
      // (if any) is untouched.
      setNotice(t(uploadErrorKey(err), undefined, NS))
      setUploading(false)
      return
    }
    setUploading(false)
    // Re-read so the surface advances to `uploaded` from the server's own state (never a client guess).
    // The upload already SUCCEEDED at this point — a refetch hiccup is soft; it must never overwrite the
    // success with a false "failed" notice (which would risk a needless duplicate re-upload).
    try {
      await refetch()
    } catch {
      /* the upload succeeded; a stale surface just means the member's next open re-reads it */
    }
  }

  async function pickImageAndUpload(): Promise<void> {
    let res: ImagePicker.ImagePickerResult
    try {
      res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.8 })
    } catch {
      setNotice(t('selfVerify.upload_error', undefined, NS))
      return
    }
    if (res.canceled || !res.assets[0]) return
    const a = res.assets[0]
    await upload({ uri: a.uri, name: a.fileName ?? `screenshot-${Date.now()}.jpg`, type: a.mimeType ?? 'image/jpeg' })
  }

  async function pickPdfAndUpload(): Promise<void> {
    let res: DocumentPicker.DocumentPickerResult
    try {
      // PDF only — the image picker above already covers photos. Matching the server's exact allowlist
      // (image/jpeg, image/png, application/pdf) here avoids a confusing "accepted then rejected" round
      // trip for an image format the picker would otherwise let through (HEIC/GIF/WebP/…) but the server
      // does not accept.
      res = await DocumentPicker.getDocumentAsync({ type: ['application/pdf'], copyToCacheDirectory: true })
    } catch {
      setNotice(t('selfVerify.upload_error', undefined, NS))
      return
    }
    if (res.canceled || !res.assets[0]) return
    const a = res.assets[0]
    await upload({ uri: a.uri, name: a.name ?? `screenshot-${Date.now()}`, type: a.mimeType ?? 'application/octet-stream' })
  }

  const status = data?.status ?? 'default'
  const reason = data?.reason ?? null
  // Story 9.11 (AC4) — the over-payment variant. The server sets `overpayment` ONLY for an amount_mismatch
  // whose canonical direction is `over`; render the empathy variant with the excess (paise → ₹) interpolated.
  const overpayment = data?.overpayment ?? null
  const copyKeys = reasonCopyKeys(reason, overpayment !== null)
  const overExcessInr = overpayment ? (overpayment.excessPaise / 100).toLocaleString('en-IN') : undefined

  return (
    <YStack
      px="$5"
      py="$4"
      gap="$3"
      borderWidth={StyleSheet.hairlineWidth}
      borderColor="$borderColor"
      rounded="$4"
      bg="$background"
    >
      <Text fontFamily="$body" fontSize="$5" color="$color" accessibilityRole="header">
        {t('selfVerify.title', undefined, NS)}
      </Text>

      {/* RESOLVED — the member advanced to green (only the matcher / trustee flow can reach here, AC4). */}
      {status === 'resolved' ? (
        <YStack gap="$2" accessible accessibilityRole="summary" accessibilityLiveRegion="polite" accessibilityLabel={t('selfVerify.resolved_a11y', undefined, NS)}>
          <Text fontFamily="$body" fontSize="$4" color="$color" accessibilityRole="header">
            {t('selfVerify.resolved.title', undefined, NS)}
          </Text>
          <Paragraph fontFamily="$body" fontSize="$3" color="$colorPress">
            {t('selfVerify.resolved.body', undefined, NS)}
          </Paragraph>
          <CallHelplineCTA height={TOUCH_TARGET} />
        </YStack>
      ) : status === 'uploaded' ? (
        /* UPLOADED — awaiting Story 9.8 staff review. STILL red/pending (AC4) — honest "we're looking into it". */
        <YStack gap="$2" accessible accessibilityRole="summary" accessibilityLiveRegion="polite" accessibilityLabel={t('selfVerify.uploaded_a11y', undefined, NS)}>
          {data?.mismatch ? <StatusPill status="red" size="default" /> : null}
          <Text fontFamily="$body" fontSize="$4" color="$color" accessibilityRole="header">
            {t('selfVerify.uploaded.title', undefined, NS)}
          </Text>
          <Paragraph fontFamily="$body" fontSize="$3" color="$colorPress">
            {t('selfVerify.uploaded.body', undefined, NS)}
          </Paragraph>
          <CallHelplineCTA height={TOUCH_TARGET} />
        </YStack>
      ) : (
        /* DEFAULT — the mismatch explanation (or the fallback prompt) + the screenshot-upload affordance. */
        <YStack gap="$3">
          <YStack gap="$2" accessible accessibilityRole="summary" accessibilityLiveRegion="polite" accessibilityLabel={t(copyKeys.body, overExcessInr ? { amount: overExcessInr } : undefined, NS)}>
            {/* The red pill conveys state via text + icon + ARIA (not colour alone) when there's a live mismatch. */}
            {data?.mismatch ? <StatusPill status="red" size="default" /> : null}
            <Text fontFamily="$body" fontSize="$4" color="$color" accessibilityRole="header">
              {t(copyKeys.title, undefined, NS)}
            </Text>
            <Paragraph fontFamily="$body" fontSize="$3" color="$colorPress">
              {t(copyKeys.body, overExcessInr ? { amount: overExcessInr } : undefined, NS)}
            </Paragraph>
          </YStack>

          {uploading ? (
            <XStack gap="$2" items="center" accessible accessibilityRole="progressbar" accessibilityLabel={t('selfVerify.uploading', undefined, NS)}>
              <Spinner size="small" />
              <Paragraph fontFamily="$body" fontSize="$3" color="$colorPress">
                {t('selfVerify.uploading', undefined, NS)}
              </Paragraph>
            </XStack>
          ) : (
            <YStack gap="$2">
              {/* The FR-32 screenshot-upload affordance — a photo (image picker) OR a file/PDF (doc picker),
                  matching UX §11 "photo-only mobile / file picker". Both ≥56pt. */}
              <Button
                height={TOUCH_TARGET}
                theme="red"
                accessibilityRole="button"
                accessibilityLabel={t('selfVerify.upload_photo_cta_a11y', undefined, NS)}
                accessibilityHint={t('selfVerify.upload_cta_hint', undefined, NS)}
                onPress={pickImageAndUpload}
              >
                {t('selfVerify.upload_photo_cta', undefined, NS)}
              </Button>
              <Button
                height={TOUCH_TARGET}
                chromeless
                accessibilityRole="button"
                accessibilityLabel={t('selfVerify.upload_file_cta_a11y', undefined, NS)}
                onPress={pickPdfAndUpload}
              >
                {t('selfVerify.upload_file_cta', undefined, NS)}
              </Button>
            </YStack>
          )}

          {/* The always-reachable third-tier recovery helpline (Story 8.11 / UX-DR62). */}
          <CallHelplineCTA height={TOUCH_TARGET} />
        </YStack>
      )}

      {notice ? (
        <Paragraph fontFamily="$body" fontSize="$3" color="$colorPress" accessibilityRole="text" accessibilityLiveRegion="polite">
          {notice}
        </Paragraph>
      ) : null}
    </YStack>
  )
}
