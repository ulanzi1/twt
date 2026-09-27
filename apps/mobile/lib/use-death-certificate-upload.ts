// The shared death-certificate picker/upload hook — Story 6.21b (D2).
//
// Extracted from `(claim)/document.tsx` so BOTH it and the new `(claim)/certificate-replacement.tsx`
// use ONE upload path — never a second copy. The PURE error→outcome mapping lives in
// `death-certificate-upload-outcome.ts` (tested in node, BW-C1); this hook is the thin React
// wrapper around it plus the native picker calls and the in-flight marker write.

import { useCallback, useRef, useState } from 'react'

import * as DocumentPicker from 'expo-document-picker'
import * as ImagePicker from 'expo-image-picker'

import type { MemberDeathCertificateStatusResponse } from '@twt/contracts'

import { claimApi } from './claim-api'
import {
  mapDeathCertificateUploadError,
  type DeathCertificateUploadOutcome,
} from './death-certificate-upload-outcome'
import { writeCertificatePendingMarker } from './filed-claim'

/** The RN file descriptor FormData accepts for a multipart upload (the document.tsx precedent). */
export interface PickedFile {
  uri: string
  name: string
  type: string
}

export interface DeathCertificateUploadState {
  readonly phase: 'idle' | 'uploading' | 'done'
  readonly outcome: DeathCertificateUploadOutcome | null
  /** The picker itself failed (camera permission) — a hook-local concern, ⛔ not an upload outcome. */
  readonly permissionNeeded: boolean
}

/** The fresh D1 read the screen made before it offered the upload — the marker's write context (D1). */
export interface CertificateMarkerWriteContext {
  readonly statusAtWrite: MemberDeathCertificateStatusResponse['status']
  readonly tokenAtWrite: string | null
}

export interface UseDeathCertificateUploadResult {
  readonly state: DeathCertificateUploadState
  /** A native picker is OPEN — the surfaces count it as busy (⛔ a second picker while one is open). */
  readonly picking: boolean
  readonly lastPicker: 'photo' | 'file' | null
  /** Resolves `true` when a file was actually picked (the picker was ⛔ not cancelled or refused). */
  pickPhoto: () => Promise<boolean>
  pickFile: () => Promise<boolean>
  /** Re-send the LAST picked file (after a successful step-up verify) — NEVER re-prompts the picker. */
  retryWithPickedFile: () => Promise<void>
  reset: () => void
}

export function useDeathCertificateUpload(
  claimCaseId: string | undefined,
  writeContext: CertificateMarkerWriteContext | null,
): UseDeathCertificateUploadResult {
  const [state, setState] = useState<DeathCertificateUploadState>({
    phase: 'idle',
    outcome: null,
    permissionNeeded: false,
  })
  const [lastPicker, setLastPicker] = useState<'photo' | 'file' | null>(null)
  const [picking, setPicking] = useState(false)
  const pickedFileRef = useRef<PickedFile | null>(null)

  const doUpload = useCallback(
    async (file: PickedFile): Promise<void> => {
      // No claim (the wizard's defensive 6.2 seam): nothing to send — the caller marks the pick locally.
      if (!claimCaseId) return
      pickedFileRef.current = file
      setState({ phase: 'uploading', outcome: null, permissionNeeded: false })
      try {
        const form = new FormData()
        // RN multipart: append the { uri, name, type } descriptor (cast — RN's FormData accepts it).
        form.append('file', file as unknown as Blob)
        await claimApi.uploadClaimDocument(claimCaseId, form, 'death_certificate')
        if (writeContext) {
          writeCertificatePendingMarker(claimCaseId, {
            writtenAt: new Date().toISOString(),
            serverStatusAtWrite: writeContext.statusAtWrite,
            tokenAtWrite: writeContext.tokenAtWrite,
          })
        }
        setState({ phase: 'done', outcome: { kind: 'success' }, permissionNeeded: false })
      } catch (err) {
        setState({ phase: 'done', outcome: mapDeathCertificateUploadError(err), permissionNeeded: false })
      }
    },
    [claimCaseId, writeContext],
  )

  /** Run a native picker; a THROWING picker (no camera, "picking in progress", …) is a dignified
   *  generic failure — ⛔ never an unhandled rejection with nothing on screen. */
  const runPicker = useCallback(async (open: () => Promise<PickedFile | null | 'denied'>): Promise<boolean> => {
    setPicking(true)
    let picked: PickedFile | null | 'denied'
    try {
      picked = await open()
    } catch {
      setState({ phase: 'done', outcome: { kind: 'generic_failure' }, permissionNeeded: false })
      return false
    } finally {
      setPicking(false)
    }
    if (picked === 'denied') {
      setState({ phase: 'done', outcome: null, permissionNeeded: true })
      return false
    }
    if (picked === null) return false
    await doUpload(picked)
    return true
  }, [doUpload])

  const pickPhoto = useCallback(async (): Promise<boolean> => {
    setLastPicker('photo')
    return runPicker(async () => {
      const perm = await ImagePicker.requestCameraPermissionsAsync()
      if (!perm.granted) return 'denied'
      const res = await ImagePicker.launchCameraAsync({ quality: 0.8 })
      if (res.canceled || !res.assets[0]) return null
      const a = res.assets[0]
      return { uri: a.uri, name: a.fileName ?? `death-certificate-${Date.now()}.jpg`, type: a.mimeType ?? 'image/jpeg' }
    })
  }, [runPicker])

  const pickFile = useCallback(async (): Promise<boolean> => {
    setLastPicker('file')
    return runPicker(async () => {
      const res = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'image/jpeg', 'image/png'],
        copyToCacheDirectory: true,
      })
      if (res.canceled || !res.assets[0]) return null
      const a = res.assets[0]
      return { uri: a.uri, name: a.name ?? `death-certificate-${Date.now()}.pdf`, type: a.mimeType ?? 'application/pdf' }
    })
  }, [runPicker])

  const retryWithPickedFile = useCallback(async (): Promise<void> => {
    // ⛔ Never make the family pick again — the SAME file, re-sent after a successful step-up verify.
    if (pickedFileRef.current) await doUpload(pickedFileRef.current)
  }, [doUpload])

  const reset = useCallback((): void => {
    setState({ phase: 'idle', outcome: null, permissionNeeded: false })
  }, [])

  return { state, picking, lastPicker, pickPhoto, pickFile, retryWithPickedFile, reset }
}
