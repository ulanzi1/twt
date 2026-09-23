// Story 6.20 (AC7, AC8) — the member-facing copy key for a refused nominee-correction request.
// ⭐ `other` gets its OWN message (`-237` cl.2 forecloses the correction — the member is told why and
// pointed at the helpline); an absent claim is a 404; every other typed refusal (outside the claim's
// window, nothing standing yet, a request already open) is "not open right now, call the helpline".

import { ApiError } from '@twt/api-client'

export function correctionErrorKey(err: unknown): string {
  if (err instanceof ApiError) {
    if (err.code === 'nominee_correction.relationship_other') return 'nominee_correction.error_other'
    if (err.status === 404) return 'nominee_correction.no_claim'
    if (err.status === 409) return 'nominee_correction.error_not_open'
  }
  return 'nominee_correction.error_generic'
}
