// The thin async I/O wrapper for the claim-entry gate — Story 6.21b (`-249` §2).
//
// Kept SEPARATE from `claim-entry-gate.ts` (BW-C1): that file must stay pure/import-free so its
// decision function is testable in node; `./claim-api` transitively imports `expo-secure-store`,
// which the vitest `environment: 'node'` runner cannot parse.

import { ApiError } from '@twt/api-client'

import { claimApi } from './claim-api'
import { boundClaimEntryRead, type ClaimEntryReadOutcome } from './claim-entry-gate'

/** Fetches a fresh D1 read and classifies it into a `ClaimEntryReadOutcome`. */
export function fetchClaimEntryReadOutcome(claimCaseId: string): Promise<ClaimEntryReadOutcome> {
  // Bounded — a stalled read falls through to the wizard as `offline`, ⛔ never an endless spinner.
  return boundClaimEntryRead(readClaimEntryOutcome(claimCaseId))
}

async function readClaimEntryOutcome(claimCaseId: string): Promise<ClaimEntryReadOutcome> {
  try {
    const data = await claimApi.getDeathCertificateStatus(claimCaseId)
    // Story 6.19c — the routing bit wins: it is true only while the death has ⛔ no live claim.
    if (data.refile_requires_confirmation) return { kind: 'refile_needs_confirmation' }
    return data.claim_live ? { kind: 'live' } : { kind: 'terminal' }
  } catch (err) {
    if (err instanceof ApiError) {
      return err.status === 404 ? { kind: 'not_found' } : { kind: 'error' }
    }
    return { kind: 'offline' }
  }
}
