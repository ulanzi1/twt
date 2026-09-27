// PURE upload-error → outcome mapper — Story 6.21b (D2, AC2; BW-C1).
//
// `useDeathCertificateUpload`'s only job past this point is to CALL the upload and hand the error
// (or nothing, on a 202) here. Keying on `.code` first (the 3.9/3.10 step-up lesson), `.status` as
// the 413/415 fallback.

import { ApiError } from '@twt/api-client'

export type DeathCertificateUploadOutcome =
  | { kind: 'success' }
  | { kind: 'step_up_required' }
  /** 409 — the claim's certificate was ALREADY accepted; nothing more to do (D2). */
  | { kind: 'certificate_accepted' }
  /** 409 — one is already waiting to be reviewed; nothing more to do (D2). */
  | { kind: 'certificate_awaiting_review' }
  /** 409 — the claim left the window between the fresh read and the upload; refetch D1 (D2). */
  | { kind: 'upload_not_allowed' }
  | { kind: 'too_large' }
  | { kind: 'unsupported_media_type' }
  | { kind: 'generic_failure' }

/** Maps an upload FAILURE to its outcome. Never called for a success — the caller returns
 *  `{ kind: 'success' }` itself once the upload call resolves. */
export function mapDeathCertificateUploadError(err: unknown): DeathCertificateUploadOutcome {
  if (err instanceof ApiError) {
    switch (err.code) {
      case 'auth.step_up_required':
        return { kind: 'step_up_required' }
      case 'claim_document.certificate_accepted':
        return { kind: 'certificate_accepted' }
      case 'claim_document.certificate_awaiting_review':
        return { kind: 'certificate_awaiting_review' }
      case 'claim_document.upload_not_allowed':
        return { kind: 'upload_not_allowed' }
      case 'claim_document.too_large':
        return { kind: 'too_large' }
      case 'claim_document.unsupported_media_type':
        return { kind: 'unsupported_media_type' }
      default:
        break
    }
    if (err.status === 413) return { kind: 'too_large' }
    if (err.status === 415) return { kind: 'unsupported_media_type' }
  }
  return { kind: 'generic_failure' }
}

/**
 * An outcome that SETTLES the matter for now — the certificate is sent, or the server already has one
 * waiting or accepted (the two 409s). The screen shows ONLY the outcome line (⛔ never the stale
 * "a new certificate is needed" copy above "we have it"), announces it, holds, and leaves (code
 * review 2026-09-27). Pure, so the set is pinned without a render harness.
 */
export function isSettledOutcome(outcome: DeathCertificateUploadOutcome): boolean {
  return (
    outcome.kind === 'success' ||
    outcome.kind === 'certificate_accepted' ||
    outcome.kind === 'certificate_awaiting_review'
  )
}
