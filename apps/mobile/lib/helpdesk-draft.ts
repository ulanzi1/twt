// Helpdesk ticket-filing save-and-resume draft store (Story 10.2, Task 6; AC1/AC4).
//
// The dignified, no-time-pressure filing flow (UX-DR55) lets a member start a request, leave, and
// return WITHOUT losing their typed text. This persists the in-progress "new ticket" draft to the
// app's LOCAL synchronous store, keyed per member, and restores it on re-entry; the flow clears it
// on a successful submit. Attachments are NOT persisted (file URIs are transient; the member re-adds
// them) — only the category + subject + body text.
//
// ── Storage backend (memory [[project_mmkv_asyncstorage_equivalent]]) ──────────────────────────
// The app standardized on MMKV (architecture §4.5 — the AsyncStorage-equivalent), so we persist
// through the existing `mmkvStorage` seam rather than adding AsyncStorage (the claim-draft precedent).
// Drafts are NON-sensitive free text; no tokens or PII keys live here.

import { mmkvStorage } from './mmkv'

const DRAFT_PREFIX = 'helpdesk-draft:'

/** The in-progress new-ticket draft persisted per member. All fields optional — it accretes as the
 *  member types. Attachments are deliberately excluded (transient file URIs). */
export interface HelpdeskDraft {
  category?: string
  subCategory?: string
  subject?: string
  body?: string
}

function draftKey(memberId: string): string {
  return DRAFT_PREFIX + memberId
}

/** Load the persisted draft, or `{}` when none exists / it cannot be parsed. */
export function loadHelpdeskDraft(memberId: string): HelpdeskDraft {
  const raw = mmkvStorage.getItem(draftKey(memberId))
  if (raw === null) return {}
  try {
    return JSON.parse(raw) as HelpdeskDraft
  } catch {
    return {}
  }
}

/** Merge a partial update into the persisted draft (best-effort; a serialize failure is swallowed). */
export function saveHelpdeskDraft(memberId: string, patch: Partial<HelpdeskDraft>): HelpdeskDraft {
  const next = { ...loadHelpdeskDraft(memberId), ...patch }
  try {
    mmkvStorage.setItem(draftKey(memberId), JSON.stringify(next))
  } catch {
    // Non-fatal — a dropped draft simply means the member re-types that field.
  }
  return next
}

/** Clear the draft (on a successful submit). */
export function clearHelpdeskDraft(memberId: string): void {
  mmkvStorage.removeItem(draftKey(memberId))
}
