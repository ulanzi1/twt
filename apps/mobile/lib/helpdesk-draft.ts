// Helpdesk ticket-filing save-and-resume draft store (Story 10.2, Task 6; AC1/AC4).
//
// The dignified, no-time-pressure filing flow (UX-DR55) lets a member start a request, leave, and
// return WITHOUT losing their typed text. This persists the in-progress "new ticket" draft to the
// app's LOCAL synchronous store, keyed per member, and restores it on re-entry; the flow clears it
// on a successful submit. Attachments are NOT persisted (file URIs are transient; the member re-adds
// them) — only the category + subject + body text, and (Story 10.29) the data-rights staff-mediation
// tick, so a member who steps away mid-filing does not silently lose the one field the delivery gate
// later reads.
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
  /**
   * Story 10.29 — whether the member ticked "I am asking staff to hand my records over to me"
   * (element 1 of the ratified three-part gate, captured at intake — Decision `2026-08-15-120` cl.1).
   * ⛔ A BOOLEAN, never an instant: the SERVER stamps the time when the ticket is actually filed. A
   * timestamp persisted on the device would be a client-authored `..._at`, which is the defect this
   * story removes.
   * ⚠ Non-sensitive, like every other field here — it records an intention typed into a form, not a
   * filed request. Nothing acts on it until the member submits.
   */
  staffMediation?: boolean
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
