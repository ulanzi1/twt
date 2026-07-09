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

import { useState } from 'react'

import * as DocumentPicker from 'expo-document-picker'
import * as ImagePicker from 'expo-image-picker'
import { useRouter } from 'expo-router'
import { Button, Paragraph, Spinner, Text, YStack } from 'tamagui'

import { ClaimProxyFlowShell } from '../../components/claim/ClaimProxyFlowShell'
import { claimApi } from '../../lib/claim-api'
import { useClaimT } from '../../lib/claim-i18n'
import { loadClaimDraft, saveClaimDraft, type ClaimDocumentStage } from '../../lib/claim-draft'
import { useSession } from '../../lib/session-context'

type UploadState = 'idle' | 'uploading' | 'uploaded' | 'error'

/** The RN file descriptor FormData accepts for a multipart upload. */
interface PickedFile {
  uri: string
  name: string
  type: string
}

export default function DocumentScreen(): React.ReactElement {
  const t = useClaimT()
  const router = useRouter()
  const { session } = useSession()
  const name = t('member_fallback')
  const memberId = session?.memberId
  const draft = memberId ? loadClaimDraft(memberId) : {}
  const claimCaseId = draft.claimCaseId

  const [stage, setStage] = useState<ClaimDocumentStage>(() => draft.documentStage || 'none')
  const [upload, setUpload] = useState<UploadState>(() => (draft.documentStage === 'selected' ? 'uploaded' : 'idle'))
  const [notice, setNotice] = useState<string | null>(null)
  // Which picker the member last used — so "Try again" reopens the SAME one (a camera failure
  // must not silently redirect to the file picker).
  const [lastPicker, setLastPicker] = useState<'photo' | 'file' | null>(null)

  function mark(next: ClaimDocumentStage): void {
    setStage(next)
    if (memberId) saveClaimDraft(memberId, { documentStage: next, lastStep: 'document' })
  }

  /** Upload a picked file to the claim's death-certificate endpoint, preserving the grief-paced posture. */
  async function uploadFile(file: PickedFile): Promise<void> {
    // No claim yet (defensive — the flow stamps claimCaseId at relationship): keep the 6.2 local seam.
    if (!claimCaseId) {
      mark('selected')
      setUpload('uploaded')
      return
    }
    setNotice(null)
    setUpload('uploading')
    try {
      const form = new FormData()
      // RN multipart: append the { uri, name, type } descriptor (cast — RN's FormData accepts it).
      form.append('file', file as unknown as Blob)
      await claimApi.uploadClaimDocument(claimCaseId, form, 'death_certificate')
      mark('selected')
      setUpload('uploaded')
    } catch {
      // Dignified failure — the member can retry or defer. Never a hard crash / countdown.
      setUpload('error')
      setNotice(t('document.upload_failed'))
    }
  }

  async function pickPhoto(): Promise<void> {
    setLastPicker('photo')
    const perm = await ImagePicker.requestCameraPermissionsAsync()
    if (!perm.granted) {
      setNotice(t('document.permission_needed'))
      return
    }
    const res = await ImagePicker.launchCameraAsync({ quality: 0.8 })
    if (res.canceled || !res.assets[0]) return
    const a = res.assets[0]
    await uploadFile({
      uri: a.uri,
      name: a.fileName ?? `death-certificate-${Date.now()}.jpg`,
      type: a.mimeType ?? 'image/jpeg',
    })
  }

  async function pickFile(): Promise<void> {
    setLastPicker('file')
    const res = await DocumentPicker.getDocumentAsync({
      type: ['application/pdf', 'image/jpeg', 'image/png'],
      copyToCacheDirectory: true,
    })
    if (res.canceled || !res.assets[0]) return
    const a = res.assets[0]
    await uploadFile({
      uri: a.uri,
      name: a.name ?? `death-certificate-${Date.now()}.pdf`,
      type: a.mimeType ?? 'application/pdf',
    })
  }

  const busy = upload === 'uploading'

  return (
    <ClaimProxyFlowShell deceasedName={name}>
      <YStack gap="$4" pt="$4">
        <Text fontSize="$7" fontWeight="700">
          {t('document.title')}
        </Text>
        <Paragraph color="$colorPress">{t('document.help')}</Paragraph>

        <Button disabled={busy} onPress={() => void pickPhoto()} accessibilityLabel={t('document.pick_photo')}>
          {t('document.pick_photo')}
        </Button>
        <Button disabled={busy} onPress={() => void pickFile()} accessibilityLabel={t('document.pick_file')}>
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

        {upload === 'uploading' ? (
          <YStack gap="$2">
            <Spinner size="small" />
            <Text color="$colorPress">{t('document.uploading')}</Text>
          </YStack>
        ) : null}
        {upload === 'uploaded' || stage === 'selected' ? (
          <Text color="#1E8E3E">{t('document.uploaded')}</Text>
        ) : null}
        {upload === 'error' && notice ? (
          <YStack gap="$2">
            <Text color="#B00020">{notice}</Text>
            <Button
              chromeless
              onPress={() => void (lastPicker === 'photo' ? pickPhoto() : pickFile())}
              accessibilityLabel={t('document.retry')}
            >
              {t('document.retry')}
            </Button>
          </YStack>
        ) : null}
        {notice && upload !== 'error' ? <Text color="$colorPress">{notice}</Text> : null}
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
