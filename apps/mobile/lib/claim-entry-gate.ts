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
  /** ⭐ Story 6.19c (`-273` §9) — the server's `refile_requires_confirmation` routing bit (D19's guard): the death's
   *  latest claim was CLOSED for no response and ⛔ no re-file confirmation waits. ⛔ Never shown as such. */
  | { readonly kind: 'refile_needs_confirmation' }
  /** ⭐ Story 6.24a (`2026-10-07-292` RF12 v1.3) — the server's `claim_closed` routing bit: the filed claim was CLOSED
   *  because another claim for the same death won its appeal. ⛔ Never shown as such. */
  | { readonly kind: 'closed' }
  | { readonly kind: 'offline' }
  | { readonly kind: 'error' }
  | { readonly kind: 'not_found' }

/** `refile_helpline` — the calm "please call the helpline" state: ⛔ never the wizard (it would only 409), ⛔ never a
 *  bare error. */
export type ClaimEntryDecision =
  | { readonly kind: 'shepherd' }
  | { readonly kind: 'wizard' }
  | { readonly kind: 'refile_helpline' }
  /** ⭐ Story 6.24a (RF12 v1.3) — the calm "this claim has been closed — please call the helpline" screen. ⛔ Never the
   *  wizard: a filing would converge onto the reversed claim only inside the 30-day look-back, else MINT a third claim
   *  for the death — which the helpline should prevent, ⛔ not the app invite. */
  | { readonly kind: 'closed_helpline' }

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
  // ⭐ Story 6.19c (`-273` §9) narrows `-249` §2's "a terminal claim falls through to the wizard, UNCHANGED" for ONE
  // terminal claim only: one CLOSED for no response while no confirmation is recorded. Once a District Admin or the
  // helpline records one the bit is false and the wizard is open again; once a new claim is live it is false too
  // (the old pointer ⛔ never traps the family).
  if (outcome.kind === 'refile_needs_confirmation') return { kind: 'refile_helpline' }
  // ⭐ Story 6.24a (RF12 v1.3) narrows `-249` §2 for ONE more terminal claim: a CLOSED one goes to its helpline screen.
  if (outcome.kind === 'closed') return { kind: 'closed_helpline' }
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
