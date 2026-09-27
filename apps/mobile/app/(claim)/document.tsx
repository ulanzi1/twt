// Death-certificate upload (Story 6.5, Task 5; AC1/AC7/AC8) — <ClaimDocumentUpload>.
//
// Story 6.2 shipped this as a SEAM (mark `selected` locally, no native picker). Story 6.5 wires the
// REAL capture + upload behind it: the "Take a photo" / "Choose a PDF" buttons launch
// expo-image-picker / expo-document-picker, then upload the file to the claim's death-certificate
// endpoint (which stores it + enqueues the OCR + parity job). The grief-paced posture is PRESERVED:
//   · save-and-resume (documentStage in the draft) survives across app restarts;
//   · the `deferred` ("I'll upload later", 7-day window) path stays — reassurance, NEVER enforced
//     client-side; there are NO countdowns / time-out modals;
//   · an upload failure is dignified (retry, or defer) — never a hard error.
//
// The claim already exists here (relationship.tsx ran intake → claimCaseId is in the draft), so the
// server-side lifecycle guard accepts the upload (intake_converged). If a resume somehow lands here
// without a claimCaseId, the buttons fall back to the local `selected` marker (the 6.2 seam).
//
// ── Story 6.21b (D2) — the picker/upload logic is EXTRACTED into `use-death-certificate-upload.ts` ──
// `(claim)/certificate-replacement.tsx` uses the SAME hook. ⭐ This screen DOES write the in-flight
// marker (D3, BW-C4 — "on EVERY death-certificate 202, the wizard's `document.tsx` included"), so a
// family who just uploaded here is ⛔ not told "not received yet — please upload it" (row 1a) on the
// shepherd screen before the OCR job lands. Its write context is row 1a's (`missing`, no token): the
// wizard makes no fresh read, and if the server had in fact moved on, marker rules 1–2 clear it. The 6.5
// deferral ("generic 'upload failed' message doesn't distinguish…") is NARROWED for the replacement
// screen only (D2) — this screen keeps its one message, unchanged.

import { useEffect, useState } from 'react'

import { useRouter } from 'expo-router'
import { Button, Paragraph, Spinner, Text, YStack } from 'tamagui'

import { ClaimProxyFlowShell } from '../../components/claim/ClaimProxyFlowShell'
import { useClaimT } from '../../lib/claim-i18n'
import { loadClaimDraft, saveClaimDraft, type ClaimDocumentStage } from '../../lib/claim-draft'
import { useSession } from '../../lib/session-context'
import { useDeathCertificateUpload, type CertificateMarkerWriteContext } from '../../lib/use-death-certificate-upload'

/** Row 1a (`-247` §2) — the state a wizard upload is sent against (see the header). */
const WIZARD_MARKER_CONTEXT: CertificateMarkerWriteContext = { statusAtWrite: 'missing', tokenAtWrite: null }

export default function DocumentScreen(): React.ReactElement {
  const t = useClaimT()
  const router = useRouter()
  const { session } = useSession()
  const name = t('member_fallback')
  const memberId = session?.memberId
  const draft = memberId ? loadClaimDraft(memberId) : {}
  const claimCaseId = draft.claimCaseId

  const [stage, setStage] = useState<ClaimDocumentStage>(() => draft.documentStage || 'none')
  const { state: upload, picking, pickPhoto, pickFile, lastPicker } = useDeathCertificateUpload(
    claimCaseId,
    WIZARD_MARKER_CONTEXT,
  )

  function mark(next: ClaimDocumentStage): void {
    setStage(next)
    if (memberId) saveClaimDraft(memberId, { documentStage: next, lastStep: 'document' })
  }

  // No claim yet (defensive — the flow stamps claimCaseId at relationship): keep the 6.2 local seam.
  const noClaimFallback = !claimCaseId
  const uploadSucceeded = upload.phase === 'done' && upload.outcome?.kind === 'success'
  const uploadFailed = upload.phase === 'done' && upload.outcome !== null && upload.outcome.kind !== 'success'
  const busy = upload.phase === 'uploading' || picking

  // Mirrors the pre-6.21b behavior: a completed upload marks the stage as `selected` so "Continue"
  // unlocks and the draft persists — ONCE, on the upload's own outcome. Keyed on the outcome, ⛔ never on
  // `stage`, so a later tap on "defer" is ⛔ not overwritten back to `selected` (code review 2026-09-27).
  useEffect(() => {
    if (uploadSucceeded) mark('selected')
  }, [upload.outcome])

  // The 6.2 no-claim seam: the picker still OPENS, and only an actual pick marks `selected` (as before
  // 6.21b) — ⛔ never "uploaded" on a bare tap or a cancelled pick.
  async function onPickPhoto(): Promise<void> {
    const picked = await pickPhoto()
    if (noClaimFallback && picked) mark('selected')
  }

  async function onPickFile(): Promise<void> {
    const picked = await pickFile()
    if (noClaimFallback && picked) mark('selected')
  }

  return (
    <ClaimProxyFlowShell deceasedName={name}>
      <YStack gap="$4" pt="$4">
        <Text fontSize="$7" fontWeight="700">
          {t('document.title')}
        </Text>
        <Paragraph color="$colorPress">{t('document.help')}</Paragraph>

        <Button disabled={busy} onPress={() => void onPickPhoto()} accessibilityLabel={t('document.pick_photo')}>
          {t('document.pick_photo')}
        </Button>
        <Button disabled={busy} onPress={() => void onPickFile()} accessibilityLabel={t('document.pick_file')}>
          {t('document.pick_file')}
        </Button>
        <Button
          chromeless
          disabled={busy}
          onPress={() => mark('deferred')}
          accessibilityLabel={t('document.defer')}
        >
          {t('document.defer')}
        </Button>

        {upload.phase === 'uploading' ? (
          <YStack gap="$2">
            <Spinner size="small" />
            <Text color="$colorPress">{t('document.uploading')}</Text>
          </YStack>
        ) : null}
        {uploadSucceeded || stage === 'selected' ? <Text color="#1E8E3E">{t('document.uploaded')}</Text> : null}
        {/* A refused camera permission is a NOTICE, ⛔ not a failure — neutral, as before 6.21b. */}
        {upload.permissionNeeded ? <Text color="$colorPress">{t('document.permission_needed')}</Text> : null}
        {uploadFailed ? (
          <YStack gap="$2">
            <Text color="#B00020">{t('document.upload_failed')}</Text>
            <Button
              chromeless
              disabled={busy}
              onPress={() => void (lastPicker === 'photo' ? onPickPhoto() : onPickFile())}
              accessibilityLabel={t('document.retry')}
            >
              {t('document.retry')}
            </Button>
          </YStack>
        ) : null}
        {stage === 'deferred' ? <Text color="$colorPress">{t('document.saved')}</Text> : null}

        <Button
          theme="accent"
          disabled={stage === 'none' || busy}
          onPress={() => router.push('/(claim)/nominee-review')}
        >
          {t('document.continue')}
        </Button>
      </YStack>
    </ClaimProxyFlowShell>
  )
}
