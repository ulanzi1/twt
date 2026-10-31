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
// The Send's Idempotency-Key is minted when a Send attempt starts with no key kept, and kept HERE until ANY 2xx — so a step-up retry, a lost answer or an app kill after the server committed
// replays the first result instead of creating a second version (AC3). ⭐ An EDIT of the words, the alt text or the photo
// choice drops it (R6): the server replays the first result for a key whatever the payload, so a key kept across an edit
// would discard the edit. ⛔ Nothing else drops it, and ⛔ no clock judges it: since BigDev's 2026-10-24 "key on the row"
// the server keeps the key ON the submission row, so a retry under it replays at ANY age (⛔ no 300 s claim, ⛔ no `409
// idempotency_in_progress`) — the T3 / V3 / W1 mint and post times are gone (a draft saved by an older build may still carry
// `mintedAt` / `firstPostedAt` / `lastPostedAt`: they are ignored).
// ⭐ Z2 — the intro's "did it land?" check compares KEYS, ⛔ submission ids: the member view carries the LATEST version's own
// stored key (`idempotencyKey`), and the Send landed ⇔ it equals the key kept here. The submission id once recorded beside the
// key (`latestSubmissionIdAtSend`) came from a possibly STALE cached view, so an earlier version could read as this Send and
// clear unsent words — it is no longer written, and a draft saved by an older build that still carries it is read tolerantly.

import { File, Paths } from 'expo-file-system'

import { memorialKinshipForSend, type MemorialDraftKinshipRow } from '../components/memorial-authorship/memorial-kinship'

import { newIdempotencyKey } from './idempotency-key'
import { mmkvStorage } from './mmkv'

export interface MemorialPendingSend {
  readonly idempotencyKey: string
}

/** {@link memorialSendKey}'s answer: the key, and whether it is in the phone's storage (Z3 — `false`: the save failed). */
export interface MemorialSendKey extends MemorialPendingSend {
  readonly stored: boolean
}

export interface MemorialDraft {
  body?: string
  altText?: string
  /** The document-directory copy's FILE NAME — ⛔ a URI. */
  photoFileName?: string
  photoMime?: 'image/jpeg' | 'image/png'
  keepPreviousPhoto?: boolean
  /**
   * Story 11b.5a (KL8) — the family list, row by row as the family types it (a row may be unfinished). Optional and additive, so
   * the key stays `v1` (an older draft simply has none). ⛔ Never pre-filled from the nominee record or the claim.
   */
  kinship?: MemorialDraftKinshipRow[]
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

/**
 * What a Send is made OF — the words, the alt text, the photo choice and the family list. (Absent and empty/false are the same
 * content.) ⚠ Every element is a PRIMITIVE (compared with `===` below): the list rides as ONE string — an array here would
 * compare by reference and an edit to the list alone would keep the old Idempotency-Key, replaying the old Send (R6 — 11b.5a
 * Trap 5).
 * ⭐ RP1 — the list part is CANONICAL: it is built from the rows the Send would actually CARRY (`memorialKinshipForSend`, the
 * Send's own function — finished rows only, ticks only with a photo) as `[relation, name, inPhoto]` tuples, so the order of a
 * row's keys, a blank or unfinished row and a tick with no photo to point at cannot change the Idempotency-Key: content that
 * sends identically signs identically (a lost answer, then "Continue without a photo" rebuilding the rows, must still replay).
 */
function sendContent(d: MemorialDraft): readonly (string | boolean)[] {
  // The Send's photo test, read from what the DRAFT holds: the previous photo kept, or a picked photo's file NAME. (`use-memorial-send.ts`
  // asks instead whether that file still RESOLVES. The two differ only when a picked file has vanished — then this signature still
  // sees the ticks the Send strips, and errs on the side of changing the key, never of reusing one for different content.)
  const withPhoto = d.keepPreviousPhoto === true || (d.photoFileName ?? '') !== ''
  return [
    d.body ?? '',
    d.altText ?? '',
    d.photoFileName ?? '',
    d.photoMime ?? '',
    d.keepPreviousPhoto === true,
    JSON.stringify(memorialKinshipForSend(d.kinship, withPhoto).map((e) => [e.relation, e.name, e.inPhoto === true])),
  ]
}

/**
 * A comparable signature of {@link sendContent}. A Send snapshots it BEFORE its request and compares it with the saved draft
 * when the request returns: a draft edited while the request was in flight is a newer draft, ⛔ not the one that was sent, and
 * must survive the 2xx.
 */
export function memorialDraftContentSignature(d: MemorialDraft): string {
  return JSON.stringify(sendContent(d))
}

/**
 * The result of {@link saveMemorialDraft}: the draft as it now stands (in memory) and whether it reached the phone's storage.
 * V9 (a) — a failed write (full storage) is swallowed, so the screen keeps the text in state; `saved: false` tells it the
 * stored draft is now OLDER than what it shows (its focus re-read must then not replace the newer text with the older one).
 */
export interface MemorialDraftSave {
  readonly draft: MemorialDraft
  readonly saved: boolean
}

export function saveMemorialDraft(memberId: string, driveId: string, patch: Partial<MemorialDraft>): MemorialDraftSave {
  const current = loadMemorialDraft(memberId, driveId)
  const merged: MemorialDraft = { ...current, ...patch }
  // R6 — the kept Idempotency-Key belongs to the content it was minted for. The server replays the FIRST result for a key,
  // whatever the payload (`handlers.ts` replay is payload-agnostic), so a key kept across an EDIT would send the new words
  // nowhere and then clear them. Any change to the content therefore drops it: the next Send mints a NEW key and goes as a
  // new version. The patch that MINTS a key (`memorialSendKey`) is the only one that may set `pending` alongside content.
  const mintsKey = patch.pending !== undefined && patch.pending.idempotencyKey !== current.pending?.idempotencyKey
  const sameContent = sendContent(current).every((v, i) => v === sendContent(merged)[i])
  let next: MemorialDraft = merged
  if (!mintsKey && !sameContent) {
    const { pending: _stale, ...rest } = merged
    void _stale
    next = rest
  }
  try {
    mmkvStorage.setItem(memorialDraftKey(memberId, driveId), JSON.stringify(next))
  } catch {
    // best-effort — the screen keeps the text in state (and is told the write failed — V9 (a))
    return { draft: next, saved: false }
  }
  return { draft: next, saved: true }
}

/** Is there anything of the family's in the draft (for *resume / start again*)? */
export function memorialDraftHasContent(d: MemorialDraft): boolean {
  return (
    (d.body ?? '').length > 0 || (d.altText ?? '').length > 0 || d.photoFileName !== undefined || (d.kinship?.length ?? 0) > 0
  )
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

/**
 * The Send's key: the kept one, else a NEW one, kept. A kept key is reused whatever its age (the server replays it at any
 * age). Read tolerantly: a draft saved by an older build may carry extra fields on it (`latestSubmissionIdAtSend`,
 * `mintedAt`, `firstPostedAt`, `lastPostedAt`) — they are dropped from what is returned, never judged.
 * Z3 — `unsavedKey`: a key this screen minted earlier whose SAVE failed (full storage), held in the hook's memory for the
 * screen's life. It is used before minting another (and saved again), so a committed Send whose answer was lost is retried
 * under the SAME key instead of becoming a second version. `stored: false` tells the caller to keep holding it.
 */
export function memorialSendKey(memberId: string, driveId: string, unsavedKey: string | null = null): MemorialSendKey {
  const kept = loadMemorialDraft(memberId, driveId).pending
  if (kept !== undefined && typeof kept.idempotencyKey === 'string' && kept.idempotencyKey !== '') {
    return { idempotencyKey: kept.idempotencyKey, stored: true }
  }
  const pending: MemorialPendingSend = { idempotencyKey: unsavedKey !== null && unsavedKey !== '' ? unsavedKey : newIdempotencyKey() }
  const { saved } = saveMemorialDraft(memberId, driveId, { pending })
  return { idempotencyKey: pending.idempotencyKey, stored: saved }
}

/**
 * The intro, on resume with a kept key (AC3, Z2): the latest version's OWN key (`view.idempotencyKey`) equals the kept key ⇒
 * THIS Send landed (an app kill, or a lost answer, after the commit) — the outcome is shown WITHOUT sending again (a resend
 * would replay, but only after the step-up: a 403 would text the nominee just to learn what the view already says). Any other
 * latest version — older, from another phone, from before 0183 (`null`) — is ⛔ this Send: the kept draft stays.
 */
export function memorialSendLanded(pending: MemorialPendingSend, latestIdempotencyKeyNow: string | null): boolean {
  return typeof pending.idempotencyKey === 'string' && pending.idempotencyKey !== '' && latestIdempotencyKeyNow === pending.idempotencyKey
}

/**
 * Forget the kept key `idempotencyKey` so the next Send mints a fresh one. W6 (c) — ONLY that key: a draft that now holds a
 * DIFFERENT key (edited and sent again meanwhile, from another screen) is left alone. ⚠ No caller in the app since the Y
 * round: the one way a key goes is an EDIT of the content (R6, inside `saveMemorialDraft`) or the draft cleared after a 2xx.
 */
export function dropMemorialSendKey(memberId: string, driveId: string, idempotencyKey: string): void {
  const d = loadMemorialDraft(memberId, driveId)
  if (!d.pending || d.pending.idempotencyKey !== idempotencyKey) return
  const { pending: _drop, ...rest } = d
  void _drop
  try {
    mmkvStorage.setItem(memorialDraftKey(memberId, driveId), JSON.stringify(rest))
  } catch {
    // best-effort
  }
}
