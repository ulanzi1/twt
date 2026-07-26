// Nominee Console — the UX-DR50 save-and-resume store (Story 9.1, Task 4).
//
// A tiny MMKV-backed, per-pool store that preserves the nominee's place on the console across returns, so
// the grief-paced surface never greets a returning nominee cold and never loses their progress on a
// multi-step flow. Auto-save on visit; restore on return. MMKV via the shared `mmkvStorage` seam
// ([[project_mmkv_asyncstorage_equivalent]] — the app's AsyncStorage-equivalent), the same pattern as
// pool-onboarding-gate.ts + claim-draft.ts — never a new AsyncStorage dependency.
//
// ── Scope for Story 9.1 (a SHELL) ───────────────────────────────────────────────────────────────────────
// 9.1 has no bank-statement upload flow yet (that is Story 9.3). So the resumable state this shell owns is
// its OWN: whether the grief-paced intro has been acknowledged (so a returning nominee is not re-greeted),
// and when the console was last visited (the "welcome back" affordance). When Story 9.3 lands the upload
// multi-step flow, its per-step draft persists through THIS same store shape (add fields to
// `NomineeConsoleResumeState`) — the save-and-resume seam is built here, not deferred.
//
// ── Per-pool + versioned key ────────────────────────────────────────────────────────────────────────────
// Keyed by the pool's canonical identifier so a nominee reconciling more than one pool resumes each
// independently. The `.v1` suffix lets a future material change re-seed everyone by bumping the version
// (a new key ⇒ fresh state) without migrating the old value. Pure + node-testable (no React).

import { mmkvStorage } from '../../lib/mmkv'

/**
 * A paused bank-statement upload draft (Story 9.3, UX-DR50). Persists the nominee's place in the upload
 * flow across app restarts so a returning bereaved nominee resumes rather than starting cold. Holds ONLY
 * a non-sensitive descriptor of the picked file (the display name + the picker MIME + the declared bank)
 * and the flow stage — NEVER the file bytes (those are never persisted client-side). `stage` mirrors the
 * pure `BankStatementUploadStage` (upload-view.ts) at the point the flow was paused.
 */
export interface NomineeConsoleUploadDraft {
  /** The picked file's display name (for the "resume this upload?" affordance), or null if none picked yet. */
  readonly pickedFileName: string | null
  /** The picker-reported MIME (so resume re-offers the right retry hint), or null. */
  readonly pickedFileType: string | null
  /** The bank the nominee declared for this upload, or null if not chosen yet. */
  readonly bankCode: string | null
  /** The flow stage at pause-time (a `BankStatementUploadStage` value). */
  readonly stage: string
  /** ISO-8601 of when the draft was saved (staleness/"paused a while ago" affordance). */
  readonly savedIso: string
}

/** The resumable console state (Story 9.1 shell fields + Story 9.3 upload-draft field). */
export interface NomineeConsoleResumeState {
  /** True once the nominee has acknowledged the grief-paced intro (so we don't re-greet them cold). */
  readonly introAcknowledged: boolean
  /** ISO-8601 of the nominee's last console visit, or `null` if this is their first (the welcome-back seam). */
  readonly lastVisitedIso: string | null
  /** A paused upload draft (Story 9.3, UX-DR50); `null` if no upload is in progress; `'corrupt'` if a
   *  draft WAS stored but could not be restored (distinguishes "nothing to resume" from "something to
   *  resume that we lost" — the caller routes the latter to the resume-failed helpline state, never
   *  silently to the same screen as a first-time visit). */
  readonly uploadDraft: NomineeConsoleUploadDraft | null | 'corrupt'
}

const DEFAULT_STATE: NomineeConsoleResumeState = {
  introAcknowledged: false,
  lastVisitedIso: null,
  uploadDraft: null,
}

/** Parse a stored upload draft — never throws. Returns `null` when nothing was ever stored (a legitimate
 *  empty state), or `'corrupt'` when something WAS stored but couldn't be restored (the caller surfaces
 *  the resume-failed state rather than silently treating it as never-started). */
function parseUploadDraft(raw: unknown): NomineeConsoleUploadDraft | null | 'corrupt' {
  if (raw === null || raw === undefined) return null
  if (typeof raw !== 'object') return 'corrupt'
  const d = raw as Partial<NomineeConsoleUploadDraft>
  if (typeof d.stage !== 'string' || typeof d.savedIso !== 'string') return 'corrupt'
  return {
    pickedFileName: typeof d.pickedFileName === 'string' ? d.pickedFileName : null,
    pickedFileType: typeof d.pickedFileType === 'string' ? d.pickedFileType : null,
    bankCode: typeof d.bankCode === 'string' ? d.bankCode : null,
    stage: d.stage,
    savedIso: d.savedIso,
  }
}

/** The versioned, per-pool MMKV key. Bump `.v1` to re-seed after a material change. */
export function nomineeConsoleResumeKey(poolCanonicalIdentifier: string): string {
  return `nominee-console.resume.v1.${poolCanonicalIdentifier}`
}

/**
 * Read the persisted resume state for a pool, or the default (never-visited) state. Fail-soft: never
 * throws because a cache entry was malformed. A whole-blob parse failure still means SOMETHING was stored,
 * so `introAcknowledged`/`lastVisitedIso` degrade to the default (nothing to recover there) but
 * `uploadDraft` is flagged `'corrupt'` rather than `null` — a bereaved nominee who had a paused upload sees
 * the dignified resume-failed state, not a screen that silently pretends she never started.
 */
export function loadNomineeConsoleResume(poolCanonicalIdentifier: string): NomineeConsoleResumeState {
  const raw = mmkvStorage.getItem(nomineeConsoleResumeKey(poolCanonicalIdentifier))
  if (raw === null) return DEFAULT_STATE
  try {
    const parsed = JSON.parse(raw) as Partial<NomineeConsoleResumeState>
    return {
      introAcknowledged: parsed.introAcknowledged === true,
      lastVisitedIso: typeof parsed.lastVisitedIso === 'string' ? parsed.lastVisitedIso : null,
      uploadDraft: parseUploadDraft(parsed.uploadDraft),
    }
  } catch {
    return { ...DEFAULT_STATE, uploadDraft: 'corrupt' }
  }
}

/** Persist a full resume state for a pool (auto-save). Best-effort — a write failure never blocks render. */
export function saveNomineeConsoleResume(
  poolCanonicalIdentifier: string,
  state: NomineeConsoleResumeState,
): void {
  mmkvStorage.setItem(nomineeConsoleResumeKey(poolCanonicalIdentifier), JSON.stringify(state))
}

/**
 * Record a console visit (auto-save on mount): stamp `lastVisitedIso` to `now`, preserving the existing
 * `introAcknowledged`. Returns the state as it was BEFORE this visit (so the caller can render a
 * welcome-back affordance using the prior `lastVisitedIso`).
 */
export function recordNomineeConsoleVisit(
  poolCanonicalIdentifier: string,
  nowIso: string,
): NomineeConsoleResumeState {
  const prior = loadNomineeConsoleResume(poolCanonicalIdentifier)
  saveNomineeConsoleResume(poolCanonicalIdentifier, { ...prior, lastVisitedIso: nowIso })
  return prior
}

/** Record that the nominee acknowledged the grief-paced intro (preserving the rest of the state). */
export function acknowledgeNomineeConsoleIntro(poolCanonicalIdentifier: string): void {
  const prior = loadNomineeConsoleResume(poolCanonicalIdentifier)
  saveNomineeConsoleResume(poolCanonicalIdentifier, { ...prior, introAcknowledged: true })
}

/**
 * Auto-save a paused upload draft (UX-DR50) — called when the nominee picks a file / advances the flow, so
 * a restart resumes where they were. Preserves the rest of the resume state. Best-effort; never blocks.
 */
export function saveNomineeConsoleUploadDraft(
  poolCanonicalIdentifier: string,
  draft: NomineeConsoleUploadDraft,
): void {
  const prior = loadNomineeConsoleResume(poolCanonicalIdentifier)
  saveNomineeConsoleResume(poolCanonicalIdentifier, { ...prior, uploadDraft: draft })
}

/** Read the paused upload draft for a pool — `null` (nothing to resume), `'corrupt'` (something was there
 *  but couldn't be restored — route to resume-failed), or the draft (the "resume this upload?" affordance). */
export function loadNomineeConsoleUploadDraft(
  poolCanonicalIdentifier: string,
): NomineeConsoleUploadDraft | null | 'corrupt' {
  return loadNomineeConsoleResume(poolCanonicalIdentifier).uploadDraft
}

/** Clear the paused upload draft (on a completed upload / an explicit discard). Preserves the rest. */
export function clearNomineeConsoleUploadDraft(poolCanonicalIdentifier: string): void {
  const prior = loadNomineeConsoleResume(poolCanonicalIdentifier)
  saveNomineeConsoleResume(poolCanonicalIdentifier, { ...prior, uploadDraft: null })
}
