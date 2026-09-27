// PURE upload-error → outcome mapper — Story 6.21b (D2, AC2; BW-C1). Every code the hook can see,
// including 413/415 (both the named `.code` and the bare-status fallback).

import { ApiError } from '@twt/api-client'
import { describe, expect, it } from 'vitest'

import { isSettledOutcome, mapDeathCertificateUploadError, type DeathCertificateUploadOutcome } from '../../lib/death-certificate-upload-outcome'

function err(status: number, code: string): ApiError {
  return new ApiError(status, code, 'test error')
}

describe('mapDeathCertificateUploadError', () => {
  it('auth.step_up_required', () => {
    expect(mapDeathCertificateUploadError(err(403, 'auth.step_up_required'))).toEqual({ kind: 'step_up_required' })
  })

  it('claim_document.certificate_accepted (409)', () => {
    expect(mapDeathCertificateUploadError(err(409, 'claim_document.certificate_accepted'))).toEqual({
      kind: 'certificate_accepted',
    })
  })

  it('claim_document.certificate_awaiting_review (409)', () => {
    expect(mapDeathCertificateUploadError(err(409, 'claim_document.certificate_awaiting_review'))).toEqual({
      kind: 'certificate_awaiting_review',
    })
  })

  it('claim_document.upload_not_allowed (409)', () => {
    expect(mapDeathCertificateUploadError(err(409, 'claim_document.upload_not_allowed'))).toEqual({
      kind: 'upload_not_allowed',
    })
  })

  it('claim_document.too_large (413), by code', () => {
    expect(mapDeathCertificateUploadError(err(413, 'claim_document.too_large'))).toEqual({ kind: 'too_large' })
  })

  it('413 by bare status, unrecognized code', () => {
    expect(mapDeathCertificateUploadError(err(413, 'http.413'))).toEqual({ kind: 'too_large' })
  })

  it('claim_document.unsupported_media_type (415), by code', () => {
    expect(mapDeathCertificateUploadError(err(415, 'claim_document.unsupported_media_type'))).toEqual({
      kind: 'unsupported_media_type',
    })
  })

  it('415 by bare status, unrecognized code', () => {
    expect(mapDeathCertificateUploadError(err(415, 'http.415'))).toEqual({ kind: 'unsupported_media_type' })
  })

  it('an unrecognized ApiError code/status ⇒ generic_failure', () => {
    expect(mapDeathCertificateUploadError(err(500, 'http.500'))).toEqual({ kind: 'generic_failure' })
  })

  it('a non-ApiError (network failure) ⇒ generic_failure', () => {
    expect(mapDeathCertificateUploadError(new TypeError('Network request failed'))).toEqual({ kind: 'generic_failure' })
  })
})

describe('isSettledOutcome — the outcomes after which the screen holds and leaves (code review 2026-09-27)', () => {
  const ALL: DeathCertificateUploadOutcome['kind'][] = [
    'success',
    'step_up_required',
    'certificate_accepted',
    'certificate_awaiting_review',
    'upload_not_allowed',
    'too_large',
    'unsupported_media_type',
    'generic_failure',
  ]
  it('EXACTLY success and the two 409s that say the server already has one', () => {
    const settled = ALL.filter((kind) => isSettledOutcome({ kind } as DeathCertificateUploadOutcome))
    expect(settled).toEqual(['success', 'certificate_accepted', 'certificate_awaiting_review'])
  })
})
