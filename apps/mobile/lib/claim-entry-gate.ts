// PURE claim-entry redirect decision — Story 6.21b (`-249` §2; Task 2; BW-B2).
//
// ⚠ BLIND VALIDATE B2 (`2026-09-26-249`): the recommendation as FIRST written — "a filed claim on
// record always opens the shepherd screen" — would have BLOCKED `-239` (b)'s Trustee-ratified refile
// (a terminal, e.g. `denied`, claim must still be re-filable through the wizard). NARROWED here:
// only a LIVE filed claim redirects; a terminal one, an offline read, an error, or a 404 all fall
// through to today's wizard entry, UNCHANGED.
//
// ⭐ PURE ONLY (BW-C1) — zero imports. `fetch-claim-entry-outcome.ts` holds the thin async I/O
// wrapper SEPARATELY: `./claim-api` transitively imports `expo-secure-store`, which the vitest
// `environment: 'node'` runner cannot parse, so importing it here would make this file (and this
// story's whole pure-tested claim) untestable in node.

/** A fresh `GET .../death-certificate` read's outcome, as far as the entry gate cares. */
export type ClaimEntryReadOutcome =
  | { readonly kind: 'live' }
  | { readonly kind: 'terminal' }
  | { readonly kind: 'offline' }
  | { readonly kind: 'error' }
  | { readonly kind: 'not_found' }

export type ClaimEntryDecision = { readonly kind: 'shepherd' } | { readonly kind: 'wizard' }

/**
 * `hasFiledClaimPointer` — the MMKV filed-claim pointer (`getFiledClaimCaseId`) is on record.
 * `outcome` — `null` when there was no pointer to read against (never fetched).
 */
export function resolveClaimEntryDecision(
  hasFiledClaimPointer: boolean,
  outcome: ClaimEntryReadOutcome | null,
): ClaimEntryDecision {
  if (!hasFiledClaimPointer || outcome === null) return { kind: 'wizard' }
  if (outcome.kind === 'live') return { kind: 'shepherd' }
  // terminal | offline | error | not_found — all fall through, unchanged.
  return { kind: 'wizard' }
}

/** How long the entry gate waits for the fresh read before treating it as `offline` (⇒ the wizard,
 *  unchanged). The api-client has no timeout of its own, so a stalled connection would otherwise hold
 *  the claim entry on a spinner until the OS gives up (code review 2026-09-27). */
export const CLAIM_ENTRY_READ_TIMEOUT_MS = 5000

/** Resolves with `read`'s outcome, or with `offline` once `ms` has passed — whichever comes first.
 *  Pure (timers only), so the bound is testable in node. */
export function boundClaimEntryRead(
  read: Promise<ClaimEntryReadOutcome>,
  ms: number = CLAIM_ENTRY_READ_TIMEOUT_MS,
): Promise<ClaimEntryReadOutcome> {
  let timer: ReturnType<typeof setTimeout> | undefined
  const timeout = new Promise<ClaimEntryReadOutcome>((resolve) => {
    timer = setTimeout(() => resolve({ kind: 'offline' }), ms)
  })
  return Promise.race([read, timeout]).finally(() => clearTimeout(timer))
}
