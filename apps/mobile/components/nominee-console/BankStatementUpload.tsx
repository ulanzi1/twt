// <BankStatementUpload> — Sunita's daily reconciliation upload surface (Story 9.3, Task 6; AC1/AC2/AC5).
//
// Fills the Story 9.1 `{available:false}` upload-queue slot in <NomineeConsole> with the REAL transport:
// pick the bank + a file → POST to /member/reconciliation/statements → render the ~5s parse-success
// summary OR the dignified "Hum aapke liye padh lenge" human fallback (Decision D1 — a PDF/image/unparseable
// file takes the human path, there is NO OCR in v1). The render DECISIONS are the pure `upload-view.ts`
// resolver (node-tested); this component is a thin projection + the UX-DR50 save-and-resume draft.
//
// ── Grief-paced + a11y + i18n (AC5) ─────────────────────────────────────────────────────────────────
// Holds NO literal copy — every string routes through `useT('nominee-console')` (the `fursat-pressure`
// tone-gate + Hindi-first/English-parity guard cover it). Every affordance has a role/label/hint; the
// failure path is dignified (never "error"). Save-and-resume persists a paused pick across restarts (MMKV,
// the 9.1 console-resume store); a restore that cannot complete falls to the resume-failed helpline state.
// The resume-link (SMS/email) delivery UX-DR50 also specifies is a DEFERRED forward seam — no live dispatch
// wiring exists yet ([[project_channels_no_live_dispatch_yet]]), so it is not rendered as dead UI.

import { useT } from '@twt/i18n/react'
import * as DocumentPicker from 'expo-document-picker'
import { useState } from 'react'
import { StyleSheet } from 'react-native'
import { Button, Paragraph, Spinner, Text, XStack, YStack } from 'tamagui'

import { CallHelplineCTA } from '../common/CallHelplineCTA'
import { memberAuth } from '../../lib/member-api'
import {
  clearNomineeConsoleUploadDraft,
  loadNomineeConsoleUploadDraft,
  saveNomineeConsoleUploadDraft,
} from './console-resume'
import {
  resolveUploadOutcomeView,
  summaryCounts,
  uploadErrorNoticeKey,
  type BankStatementUploadStage,
  type UploadOutcomeView,
} from './upload-view'

const NS = { namespace: 'nominee-console' } as const

/** The 5 v1 allowlisted banks (the bank the nominee declares drives parser selection server-side). */
const BANKS = ['sbi', 'pnb', 'bob', 'boi', 'cooperative'] as const
type BankCode = (typeof BANKS)[number]

/** The RN file descriptor FormData accepts for a multipart upload. */
interface PickedFile {
  uri: string
  name: string
  type: string
}

export function BankStatementUpload({
  poolCanonicalIdentifier,
}: {
  poolCanonicalIdentifier: string
}): React.ReactElement {
  const t = useT()
  const rawDraft = loadNomineeConsoleUploadDraft(poolCanonicalIdentifier)
  // A 'corrupt' draft means something WAS paused but couldn't be restored — the resume-failed helpline
  // state, never silently treated as if she'd never started (P11).
  const draft = rawDraft === 'corrupt' ? null : rawDraft

  const [bank, setBank] = useState<BankCode | null>((draft?.bankCode as BankCode) ?? null)
  const [stage, setStage] = useState<BankStatementUploadStage>(
    rawDraft === 'corrupt' ? 'resume-failed' : draft ? 'save-and-resume' : 'default',
  )
  const [outcome, setOutcome] = useState<UploadOutcomeView | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  /** Auto-save the paused draft (UX-DR50) — a restart resumes here rather than cold. */
  function persistDraft(nextStage: BankStatementUploadStage, file: PickedFile | null): void {
    saveNomineeConsoleUploadDraft(poolCanonicalIdentifier, {
      pickedFileName: file?.name ?? null,
      pickedFileType: file?.type ?? null,
      bankCode: bank,
      stage: nextStage,
      savedIso: new Date().toISOString(),
    })
  }

  async function upload(file: PickedFile, bankCode: BankCode): Promise<void> {
    setNotice(null)
    setStage('upload-in-progress')
    persistDraft('upload-in-progress', file)
    try {
      const form = new FormData()
      // RN multipart: append the { uri, name, type } descriptor (cast — RN's FormData accepts it).
      form.append('file', file as unknown as Blob)
      setStage('parse-processing')
      const res = await memberAuth.memberUploadBankStatement(form, bankCode)
      const view = resolveUploadOutcomeView(res)
      setOutcome(view)
      setStage(view.kind) // 'parse-success' | 'parse-failure'
      // A resolved upload (parsed OR routed to the human fallback) ends the paused draft — the nominee is
      // never stranded, and there is nothing to resume.
      clearNomineeConsoleUploadDraft(poolCanonicalIdentifier)
    } catch (err) {
      // Dignified failure — retry, never a hard crash/countdown. The draft stays so a return resumes.
      setStage('default')
      persistDraft('default', file)
      setNotice(t(uploadErrorNoticeKey(err), undefined, NS))
    }
  }

  async function pickAndUpload(bankCode: BankCode): Promise<void> {
    let res: DocumentPicker.DocumentPickerResult
    try {
      res = await DocumentPicker.getDocumentAsync({
        // "Accepts PDF or CSV" (AC1) at the UI — a CSV parses inline, a PDF/image takes the human fallback.
        type: ['text/csv', 'text/comma-separated-values', 'application/vnd.ms-excel', 'application/pdf', 'image/*'],
        copyToCacheDirectory: true,
      })
    } catch {
      // A picker-level failure (permissions, OS cancellation) — dignified, never a silent stuck screen.
      setNotice(t('upload.error.generic', undefined, NS))
      return
    }
    if (res.canceled || !res.assets[0]) return
    const a = res.assets[0]
    // No extension is fabricated when the OS omits a name — the server decides CSV-vs-fallback from the
    // uploaded bytes/MIME, never the client-supplied filename (P9: a hardcoded .csv would misrepresent a
    // PDF/image pick in the "resume this upload?" draft display).
    await upload(
      { uri: a.uri, name: a.name ?? `statement-${Date.now()}`, type: a.mimeType ?? 'application/octet-stream' },
      bankCode,
    )
  }

  const busy = stage === 'upload-in-progress' || stage === 'parse-processing'

  return (
    <YStack
      px="$5"
      py="$4"
      gap="$3"
      borderWidth={StyleSheet.hairlineWidth}
      borderColor="$borderColor"
      rounded="$4"
      bg="$background"
      accessible={false}
    >
      <Text fontFamily="$body" fontSize="$5" color="$color" accessibilityRole="header">
        {t('upload.title', undefined, NS)}
      </Text>
      <Paragraph fontFamily="$body" fontSize="$3" color="$colorPress">
        {t('upload.intro', undefined, NS)}
      </Paragraph>

      {/* Save-and-resume (UX-DR50): a paused draft was noted, but raw file bytes are never persisted
          client-side, so there is nothing to actually continue from — one honest "start again" action
          (P16; a "continue sharing" choice that behaved identically was a false choice, removed). The
          resume-link (SMS/email) affordance from UX-DR50 has no real dispatch wired yet — deferred
          (P17, [[project_channels_no_live_dispatch_yet]]) rather than shipped as dead UI. */}
      {stage === 'save-and-resume' && draft ? (
        <YStack
          gap="$2"
          accessible
          accessibilityRole="summary"
          accessibilityLabel={t('upload.resume.prompt', undefined, NS)}
        >
          <Paragraph fontFamily="$body" fontSize="$3" color="$colorPress">
            {t('upload.resume.prompt', undefined, NS)}
          </Paragraph>
          <Button
            size="$3"
            accessibilityLabel={t('upload.resume.discard', undefined, NS)}
            onPress={() => {
              clearNomineeConsoleUploadDraft(poolCanonicalIdentifier)
              setStage('default')
            }}
          >
            {t('upload.resume.discard', undefined, NS)}
          </Button>
        </YStack>
      ) : null}

      {/* The bank chooser + file picker (default state). */}
      {stage === 'default' ? (
        <YStack gap="$2">
          <Text fontFamily="$body" fontSize="$3" color="$color" accessibilityRole="header">
            {t('upload.bank_prompt', undefined, NS)}
          </Text>
          <XStack gap="$2" flexWrap="wrap">
            {BANKS.map((b) => (
              <Button
                key={b}
                size="$3"
                chromeless={bank !== b}
                accessibilityLabel={t(`bank.${b}`, undefined, NS)}
                accessibilityState={{ selected: bank === b }}
                onPress={() => setBank(b)}
              >
                {t(`bank.${b}`, undefined, NS)}
              </Button>
            ))}
          </XStack>
          <Button
            size="$4"
            disabled={bank === null}
            accessibilityLabel={t('upload.choose_file_a11y', undefined, NS)}
            accessibilityState={{ disabled: bank === null }}
            onPress={() => bank && pickAndUpload(bank)}
          >
            {t('upload.choose_file', undefined, NS)}
          </Button>
        </YStack>
      ) : null}

      {/* Upload / parse in-progress — announces progress (AC5 a11y). */}
      {busy ? (
        <XStack
          gap="$2"
          items="center"
          accessible
          accessibilityRole="progressbar"
          accessibilityLabel={t(
            stage === 'parse-processing' ? 'upload.processing_a11y' : 'upload.in_progress_a11y',
            undefined,
            NS,
          )}
        >
          <Spinner size="small" />
          <Paragraph fontFamily="$body" fontSize="$3" color="$colorPress">
            {t(stage === 'parse-processing' ? 'upload.processing' : 'upload.in_progress', undefined, NS)}
          </Paragraph>
        </XStack>
      ) : null}

      {/* Parse-success — the summary preview (server-authoritative counts). */}
      {stage === 'parse-success' && outcome?.kind === 'parse-success' ? (
        <YStack
          gap="$2"
          accessible
          accessibilityRole="summary"
          accessibilityLabel={t('upload.success.a11y', undefined, NS)}
        >
          <Text fontFamily="$body" fontSize="$4" color="$color" accessibilityRole="header">
            {t('upload.success.title', undefined, NS)}
          </Text>
          <Paragraph fontFamily="$body" fontSize="$3" color="$colorPress">
            {t('upload.success.rows', summaryCounts(outcome.summary), NS)}
          </Paragraph>
          <Paragraph fontFamily="$body" fontSize="$3" color="$colorPress">
            {t('upload.success.body', undefined, NS)}
          </Paragraph>
        </YStack>
      ) : null}

      {/* Parse-failure — the dignified "Hum aapke liye padh lenge" fallback + the two AC2 paths. */}
      {stage === 'parse-failure' && outcome?.kind === 'parse-failure' ? (
        <YStack
          gap="$2"
          px="$4"
          py="$3"
          bg="$backgroundHover"
          rounded="$4"
          accessible
          accessibilityRole="summary"
          accessibilityLabel={t('upload.fallback.a11y', undefined, NS)}
        >
          <Text fontFamily="$body" fontSize="$4" color="$color" accessibilityRole="header">
            {t('upload.fallback.title', undefined, NS)}
          </Text>
          <Paragraph fontFamily="$body" fontSize="$3" color="$colorPress">
            {t(outcome.reasonCopyKey, undefined, NS)}
          </Paragraph>
          <Paragraph fontFamily="$body" fontSize="$3" color="$colorPress">
            {t('upload.fallback.body', undefined, NS)}
          </Paragraph>
          {/* Path (a): retry with a different file (no data lost — the fallback task is already raised). */}
          <Button
            size="$3"
            accessibilityLabel={t('upload.fallback.retry', undefined, NS)}
            onPress={() => {
              setOutcome(null)
              setStage('default')
            }}
          >
            {t('upload.fallback.retry', undefined, NS)}
          </Button>
        </YStack>
      ) : null}

      {/* Resume-failed — the helpline fallback (UX-DR50). */}
      {stage === 'resume-failed' ? (
        <YStack gap="$2" accessible accessibilityRole="summary" accessibilityLabel={t('upload.resume_failed.a11y', undefined, NS)}>
          <Text fontFamily="$body" fontSize="$4" color="$color" accessibilityRole="header">
            {t('upload.resume_failed.title', undefined, NS)}
          </Text>
          <Paragraph fontFamily="$body" fontSize="$3" color="$colorPress">
            {t('upload.resume_failed.body', undefined, NS)}
          </Paragraph>
          <CallHelplineCTA />
        </YStack>
      ) : null}

      {notice ? (
        <Paragraph fontFamily="$body" fontSize="$3" color="$colorPress" accessibilityRole="text">
          {notice}
        </Paragraph>
      ) : null}
    </YStack>
  )
}
