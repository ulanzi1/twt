// Filed-claim pointer + offline shepherd cache (Story 6.12, Task 5; AC3 / R3).
//
// R3 pins the <ShepherdContactCard> to (claim)/acknowledgement.tsx AND requires a PERSISTENT post-filing
// entry point so the point-of-contact view is re-reachable after the wizard completes (a one-shot
// end-of-wizard card is not acceptable ongoing visibility). The claim DRAFT is cleared at acknowledgement,
// so we persist the filed claim id SEPARATELY here (keyed per member), and the home-surface
// <ClaimPointOfContactEntry> reads it to re-open the shepherd screen.
//
// Also holds the OFFLINE cache of the last successful shepherd read (UX §Offline "claim status if
// Ravi-mode" — a read-only cached view). NON-sensitive: the shepherd contact is deliberately member-facing
// controlled staff-contact data (that IS the feature). Persisted through the same `mmkvStorage` seam the
// claim draft uses (memory [[project_mmkv_asyncstorage_equivalent]] — the app's AsyncStorage-equivalent).

import type { MemberShepherdResponse } from '@twt/contracts'

import { mmkvStorage } from './mmkv'

const FILED_PREFIX = 'filed-claim:'
const SHEPHERD_CACHE_PREFIX = 'shepherd-cache:'

function filedKey(memberId: string): string {
  return FILED_PREFIX + memberId
}
function shepherdCacheKey(claimCaseId: string): string {
  return SHEPHERD_CACHE_PREFIX + claimCaseId
}

/** Stamp the filed claim id for a member (called at acknowledgement, before the draft is cleared) so the
 *  point-of-contact view stays re-reachable. Best-effort. */
export function setFiledClaimCaseId(memberId: string, claimCaseId: string): void {
  try {
    mmkvStorage.setItem(filedKey(memberId), claimCaseId)
  } catch {
    // Non-fatal — the home entry simply won't surface; the acknowledgement card still worked.
  }
}

/** The member's most-recently filed claim id, or `null` when none is on record. */
export function getFiledClaimCaseId(memberId: string): string | null {
  return mmkvStorage.getItem(filedKey(memberId))
}

/** Cache a successful shepherd read for the offline read-only view. Best-effort. */
export function cacheShepherd(claimCaseId: string, response: MemberShepherdResponse): void {
  try {
    mmkvStorage.setItem(shepherdCacheKey(claimCaseId), JSON.stringify(response))
  } catch {
    // Non-fatal.
  }
}

/** The last cached shepherd read for a claim (the offline fallback), or `null`. */
export function loadCachedShepherd(claimCaseId: string): MemberShepherdResponse | null {
  const raw = mmkvStorage.getItem(shepherdCacheKey(claimCaseId))
  if (raw === null) return null
  try {
    return JSON.parse(raw) as MemberShepherdResponse
  } catch {
    return null
  }
}

/** Drop a cached shepherd read — called on a genuine not-authorized/not-found response, never on a
 *  transient/offline failure (Review Finding: a stale cache must not survive the server saying this claim
 *  is not this member's to see). Best-effort. */
export function clearCachedShepherd(claimCaseId: string): void {
  try {
    mmkvStorage.removeItem(shepherdCacheKey(claimCaseId))
  } catch {
    // Non-fatal.
  }
}
