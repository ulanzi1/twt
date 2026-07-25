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

/** The resumable console state (Story 9.1 shell fields; Story 9.3 upload-draft fields extend this). */
export interface NomineeConsoleResumeState {
  /** True once the nominee has acknowledged the grief-paced intro (so we don't re-greet them cold). */
  readonly introAcknowledged: boolean
  /** ISO-8601 of the nominee's last console visit, or `null` if this is their first (the welcome-back seam). */
  readonly lastVisitedIso: string | null
}

const DEFAULT_STATE: NomineeConsoleResumeState = { introAcknowledged: false, lastVisitedIso: null }

/** The versioned, per-pool MMKV key. Bump `.v1` to re-seed after a material change. */
export function nomineeConsoleResumeKey(poolCanonicalIdentifier: string): string {
  return `nominee-console.resume.v1.${poolCanonicalIdentifier}`
}

/**
 * Read the persisted resume state for a pool, or the default (never-visited) state. Fail-soft: a corrupt /
 * partial stored value degrades to the default rather than throwing (a bereaved nominee must never hit an
 * error wall because a cache entry was malformed).
 */
export function loadNomineeConsoleResume(poolCanonicalIdentifier: string): NomineeConsoleResumeState {
  const raw = mmkvStorage.getItem(nomineeConsoleResumeKey(poolCanonicalIdentifier))
  if (raw === null) return DEFAULT_STATE
  try {
    const parsed = JSON.parse(raw) as Partial<NomineeConsoleResumeState>
    return {
      introAcknowledged: parsed.introAcknowledged === true,
      lastVisitedIso: typeof parsed.lastVisitedIso === 'string' ? parsed.lastVisitedIso : null,
    }
  } catch {
    return DEFAULT_STATE
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

/** Record that the nominee acknowledged the grief-paced intro (preserving `lastVisitedIso`). */
export function acknowledgeNomineeConsoleIntro(poolCanonicalIdentifier: string): void {
  const prior = loadNomineeConsoleResume(poolCanonicalIdentifier)
  saveNomineeConsoleResume(poolCanonicalIdentifier, { ...prior, introAcknowledged: true })
}
