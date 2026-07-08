// Ravi-mode claim save-and-resume draft store (Story 6.2, Task 7; AC6 / UX §12).
//
// The grief-paced claim-intake flow must let Ravi start, leave, and return WITHOUT losing work
// and WITHOUT any time pressure (no countdowns, no time-out modals). This persists the in-progress
// claim-draft to the app's LOCAL synchronous store, keyed per DECEASED member, and restores it on
// re-entry; the flow clears it on submit.
//
// ── Storage backend note (memory [[project_mmkv_asyncstorage_equivalent]]) ────────────────────
// UX §12 says "AsyncStorage"; this app standardized on MMKV (architecture §4.5 — the app's
// AsyncStorage-equivalent), so we persist through the existing `mmkvStorage` seam rather than
// adding an AsyncStorage dependency (the life-events/draft-store.ts precedent). Drafts are NON-
// sensitive (a relationship label + a document-stage marker); tokens stay in secure-store.
//
// ── Key namespace ─────────────────────────────────────────────────────────────────────────────
// Keyed by `deceasedMemberId` to prevent cross-account draft leakage on a shared device. Format:
// `claim-draft:<deceasedMemberId>`. `clearClaimDraft` is called on submit; a signOut purge can add
// this prefix later if needed (the flow lives entirely within one member session in v1).

import { mmkvStorage } from './mmkv'
import type { ClaimStep } from './claim-steps'

const DRAFT_PREFIX = 'claim-draft:'

/** The document-upload seam state (Story 6.5 owns the real OCR/storage backend). */
export type ClaimDocumentStage = 'none' | 'selected' | 'deferred'

/** The in-progress claim draft persisted per deceased member. All fields optional — the draft
 * accretes as Ravi moves through the flow. `claimCaseId` is stamped once intake succeeds so a
 * resume after intake skips straight past the freeze-firing step (idempotent server-side anyway). */
export interface ClaimDraft {
  relationship?: 'spouse' | 'child' | 'parent' | 'sibling' | 'other'
  documentStage?: ClaimDocumentStage
  claimCaseId?: string
  lastStep?: ClaimStep
}

function draftKey(deceasedMemberId: string): string {
  return DRAFT_PREFIX + deceasedMemberId
}

/** Load the persisted claim draft, or `{}` when none exists / it cannot be parsed. */
export function loadClaimDraft(deceasedMemberId: string): ClaimDraft {
  const raw = mmkvStorage.getItem(draftKey(deceasedMemberId))
  if (raw === null) return {}
  try {
    return JSON.parse(raw) as ClaimDraft
  } catch {
    return {}
  }
}

/** Merge a partial update into the persisted draft (best-effort; a serialize failure is swallowed). */
export function saveClaimDraft(deceasedMemberId: string, patch: Partial<ClaimDraft>): ClaimDraft {
  const next = { ...loadClaimDraft(deceasedMemberId), ...patch }
  try {
    mmkvStorage.setItem(draftKey(deceasedMemberId), JSON.stringify(next))
  } catch {
    // Non-fatal — a dropped draft simply means Ravi re-enters that step's input.
  }
  return next
}

/** Clear the claim draft (on successful submit / acknowledgement). */
export function clearClaimDraft(deceasedMemberId: string): void {
  mmkvStorage.removeItem(draftKey(deceasedMemberId))
}
