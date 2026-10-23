// Story 11b.4 (MA3, AC3) — the family's memorial DRAFT lives ONLY on this phone until they send.
//
// `-162` cl.3 makes SENDING the act of authorisation, so ⛔ nothing reaches the server before Send. Saved on EVERY change
// (MMKV is synchronous — the `helpdesk-draft.ts` precedent; a debounce would open a loss window on process death).
// ⭐ Named TTL: NONE — kept until the family sends, or chooses *start again* (fursat; a recorded departure from arch
// §4.13). ⭐ Kept on SIGN-OUT: the key is deliberately ⛔ in `MEMBER_DRAFT_SCREEN_KEYS` (`draft-store.ts`) — days of writing
// must ⛔ not vanish — and it is reachable only inside this deceased member's own session (the key carries `<memberId>`).
// ⚠ The MMKV instance is ⛔ encrypted: these are the family's own unsent words on their own phone (recorded).
//
// The photo: the picker's URI is TRANSIENT, so the picked image is COPIED into the app's document directory and the draft
// stores only that copy's FILE NAME; the path is rebuilt from `Paths.document` on restore (⛔ an absolute URI — the iOS
// app-container path changes on app updates, which would quietly turn every saved photo into "no photo").
//
// The Send's Idempotency-Key is minted once per Send attempt and kept HERE with the latest submission id the view showed
// when Send was pressed, until ANY 2xx — so a step-up retry or an app kill after the server committed replays the first
// result instead of creating a second version (AC3).

import { File, Paths } from 'expo-file-system'

import { newIdempotencyKey } from './idempotency-key'
import { mmkvStorage } from './mmkv'

export interface MemorialPendingSend {
  readonly idempotencyKey: string
  /** The latest submission id the view showed when Send was pressed (`null` before any Send). */
  readonly latestSubmissionIdAtSend: string | null
}

export interface MemorialDraft {
  body?: string
  altText?: string
  /** The document-directory copy's FILE NAME — ⛔ a URI. */
  photoFileName?: string
  photoMime?: 'image/jpeg' | 'image/png'
  keepPreviousPhoto?: boolean
  pending?: MemorialPendingSend
}

export function memorialDraftKey(memberId: string, driveId: string): string {
  return `memorial-draft:v1:${memberId}:${driveId}`
}

export function loadMemorialDraft(memberId: string, driveId: string): MemorialDraft {
  const raw = mmkvStorage.getItem(memorialDraftKey(memberId, driveId))
  if (raw === null) return {}
  try {
    return JSON.parse(raw) as MemorialDraft
  } catch {
    return {}
  }
}

export function saveMemorialDraft(memberId: string, driveId: string, patch: Partial<MemorialDraft>): MemorialDraft {
  const next: MemorialDraft = { ...loadMemorialDraft(memberId, driveId), ...patch }
  try {
    mmkvStorage.setItem(memorialDraftKey(memberId, driveId), JSON.stringify(next))
  } catch {
    // best-effort — the screen keeps the text in state
  }
  return next
}

/** Is there anything of the family's in the draft (for *resume / start again*)? */
export function memorialDraftHasContent(d: MemorialDraft): boolean {
  return (d.body ?? '').length > 0 || (d.altText ?? '').length > 0 || d.photoFileName !== undefined
}

/** Clear the draft AND its photo copy — ONLY after a 2xx from Send (or a refetch showing it landed), or *start again*. */
export function clearMemorialDraft(memberId: string, driveId: string): void {
  const d = loadMemorialDraft(memberId, driveId)
  if (d.photoFileName) deleteMemorialPhotoCopy(d.photoFileName)
  mmkvStorage.removeItem(memorialDraftKey(memberId, driveId))
}

/** Copy a picked image into the document directory; returns the copy's FILE NAME (or `null` if the copy failed). */
export function copyMemorialPhoto(sourceUri: string, mime: 'image/jpeg' | 'image/png'): string | null {
  const name = `memorial-photo-${newIdempotencyKey()}.${mime === 'image/png' ? 'png' : 'jpg'}`
  try {
    new File(sourceUri).copy(new File(Paths.document, name))
    return name
  } catch {
    return null
  }
}

/** The copy's current URI, rebuilt from `Paths.document`; `null` when the file is gone (⇒ "no photo", a gentle line). */
export function memorialPhotoUri(fileName: string | undefined): string | null {
  if (!fileName) return null
  try {
    const file = new File(Paths.document, fileName)
    return file.exists ? file.uri : null
  } catch {
    return null
  }
}

export function deleteMemorialPhotoCopy(fileName: string): void {
  try {
    const file = new File(Paths.document, fileName)
    if (file.exists) file.delete()
  } catch {
    // best-effort
  }
}

/** The Send's key: reuse the kept one, else mint and keep a new one with the latest submission id now shown. */
export function memorialSendKey(
  memberId: string,
  driveId: string,
  latestSubmissionId: string | null,
): MemorialPendingSend {
  const d = loadMemorialDraft(memberId, driveId)
  if (d.pending) return d.pending
  const pending: MemorialPendingSend = { idempotencyKey: newIdempotencyKey(), latestSubmissionIdAtSend: latestSubmissionId }
  saveMemorialDraft(memberId, driveId, { pending })
  return pending
}

/**
 * On resume with a kept key, and on `409 memorial.idempotency_in_progress` (past the claim's 300 s TTL a completed claim
 * reads as in flight): compare the refetched view. A latest submission NEWER than the one recorded ⇒ the Send landed.
 */
export function memorialSendLanded(pending: MemorialPendingSend, latestSubmissionIdNow: string | null): boolean {
  return latestSubmissionIdNow !== null && latestSubmissionIdNow !== pending.latestSubmissionIdAtSend
}

/** Forget a kept key (it can no longer be useful) so the next Send mints a fresh one. */
export function dropMemorialSendKey(memberId: string, driveId: string): void {
  const d = loadMemorialDraft(memberId, driveId)
  if (!d.pending) return
  const { pending: _drop, ...rest } = d
  void _drop
  try {
    mmkvStorage.setItem(memorialDraftKey(memberId, driveId), JSON.stringify(rest))
  } catch {
    // best-effort
  }
}
