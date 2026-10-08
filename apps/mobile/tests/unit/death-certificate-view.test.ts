// PURE death-certificate notice logic — Story 6.21b (D1, D3; BW-C1: apps/mobile has NO render
// harness, so every precedence rule + the offline case + the copy-key selection is tested here in
// node against an injected clock).

import { describe, expect, it } from 'vitest'

import type { MemberDeathCertificateStatusResponse } from '@twt/contracts'

import {
  certificateNoticeCopy,
  resolveCertificateNotice,
  CERTIFICATE_MARKER_TTL_MS,
  type DeathCertificatePendingMarker,
} from '../../lib/death-certificate-view'

const NOW = Date.parse('2026-09-26T12:00:00.000Z')

function read(over: Partial<MemberDeathCertificateStatusResponse> = {}): MemberDeathCertificateStatusResponse {
  return {
    status: 'not_needed',
    replacement_reason: null,
    replacement_allowed: false,
    upload_allowed: false,
    certificate_token: null,
    claim_live: true,
    reassurance: null,
    // Story 6.19c's two routing fields and Story 6.24a's `claim_closed` (RF12) — the full wire shape.
    closed_no_response: false,
    refile_requires_confirmation: false,
    claim_closed: false,
    ...over,
  }
}

function marker(over: Partial<DeathCertificatePendingMarker> = {}): DeathCertificatePendingMarker {
  return {
    writtenAt: new Date(NOW).toISOString(),
    serverStatusAtWrite: 'missing',
    tokenAtWrite: 'token-a',
    ...over,
  }
}

describe('resolveCertificateNotice — the offline case (`-249` §1, B1)', () => {
  it('no fresh server read ⇒ no notice at all, regardless of any marker', () => {
    const r = resolveCertificateNotice(null, marker(), NOW)
    expect(r.notice).toBeNull()
    expect(r.clearMarker).toBe(false)
  })

  it('no fresh read, no marker either ⇒ still no notice', () => {
    const r = resolveCertificateNotice(null, null, NOW)
    expect(r.notice).toBeNull()
  })
})

describe('resolveCertificateNotice — no marker on record', () => {
  it('the server status renders as-is', () => {
    const r = resolveCertificateNotice(read({ status: 'accepted' }), null, NOW)
    expect(r.notice?.status).toBe('accepted')
    expect(r.clearMarker).toBe(false)
  })
})

describe('resolveCertificateNotice — precedence rule 1: the server has moved past replacement_requested/missing', () => {
  for (const status of ['not_needed', 'awaiting_review', 'accepted'] as const) {
    it(`server status ${status} ⇒ the server wins, marker cleared`, () => {
      const r = resolveCertificateNotice(read({ status }), marker({ serverStatusAtWrite: 'missing' }), NOW)
      expect(r.notice?.status).toBe(status)
      expect(r.clearMarker).toBe(true)
    })
  }
})

describe('resolveCertificateNotice — precedence rule 2 (`-247` §1): token or status differs from write time', () => {
  it('the token differs ⇒ the server wins (B rejected after A)', () => {
    // A rejected (marker written for A, status `replacement_requested`) → B uploaded → B's job
    // lands and B is ALSO rejected: the server still says `replacement_requested`, but the token is
    // now B's, not A's. The family must be told again, ⛔ not shown "we have it".
    const m = marker({ serverStatusAtWrite: 'replacement_requested', tokenAtWrite: 'upload-a' })
    const server = read({ status: 'replacement_requested', certificate_token: 'upload-b' })
    const r = resolveCertificateNotice(server, m, NOW)
    expect(r.notice?.status).toBe('replacement_requested')
    expect(r.clearMarker).toBe(true)
  })

  it('the status differs from serverStatusAtWrite (even with the same token) ⇒ the server wins', () => {
    const m = marker({ serverStatusAtWrite: 'missing', tokenAtWrite: null })
    const server = read({ status: 'replacement_requested', certificate_token: null })
    const r = resolveCertificateNotice(server, m, NOW)
    expect(r.clearMarker).toBe(true)
  })

  it('SAME token AND same status ⇒ rule 2 does not fire (falls to rule 3/4)', () => {
    const m = marker({ serverStatusAtWrite: 'missing', tokenAtWrite: null, writtenAt: new Date(NOW).toISOString() })
    const server = read({ status: 'missing', certificate_token: null })
    const r = resolveCertificateNotice(server, m, NOW)
    expect(r.clearMarker).toBe(false)
    expect(r.notice?.status).toBe('awaiting_review')
  })
})

describe('resolveCertificateNotice — precedence rule 3: 24h expiry (incl. a negative age)', () => {
  it('just under 24h ⇒ NOT expired, marker still governs', () => {
    const writtenAt = new Date(NOW - (CERTIFICATE_MARKER_TTL_MS - 1000)).toISOString()
    const m = marker({ writtenAt, serverStatusAtWrite: 'missing', tokenAtWrite: null })
    const r = resolveCertificateNotice(read({ status: 'missing', certificate_token: null }), m, NOW)
    expect(r.clearMarker).toBe(false)
    expect(r.notice?.status).toBe('awaiting_review')
  })

  it('exactly 24h or more ⇒ expired, the server wins', () => {
    const writtenAt = new Date(NOW - CERTIFICATE_MARKER_TTL_MS).toISOString()
    const m = marker({ writtenAt, serverStatusAtWrite: 'missing', tokenAtWrite: null })
    const r = resolveCertificateNotice(read({ status: 'missing', certificate_token: null }), m, NOW)
    expect(r.clearMarker).toBe(true)
    expect(r.notice?.status).toBe('missing')
  })

  it('a NEGATIVE age (the device clock moved backwards) ⇒ also expired', () => {
    const writtenAt = new Date(NOW + 60_000).toISOString() // written "in the future"
    const m = marker({ writtenAt, serverStatusAtWrite: 'missing', tokenAtWrite: null })
    const r = resolveCertificateNotice(read({ status: 'missing', certificate_token: null }), m, NOW)
    expect(r.clearMarker).toBe(true)
  })
})

describe('resolveCertificateNotice — precedence rule 4: otherwise, awaiting_review with the button hidden', () => {
  it('a fresh marker inside 24h, matching token+status ⇒ forces awaiting_review, uploadAllowed false', () => {
    const m = marker({ serverStatusAtWrite: 'missing', tokenAtWrite: null, writtenAt: new Date(NOW).toISOString() })
    const server = read({ status: 'missing', certificate_token: null, upload_allowed: true })
    const r = resolveCertificateNotice(server, m, NOW)
    expect(r.notice).toEqual({
      status: 'awaiting_review',
      replacementReason: null,
      reassurance: null,
      uploadAllowed: false,
    })
    expect(r.clearMarker).toBe(false)
  })
})

describe('certificateNoticeCopy — the copy-key selection (D3, AC3)', () => {
  it('not_needed renders nothing', () => {
    expect(certificateNoticeCopy({ status: 'not_needed', replacementReason: null, reassurance: null, uploadAllowed: false })).toEqual({
      titleKey: null,
      bodyKey: null,
      reassuranceKey: null,
      showUpload: false,
      showHelpline: false,
      uploadLabelKey: null,
      helplineLabelKey: null,
    })
  })

  it('missing renders missing_body + button + helpline when uploadAllowed', () => {
    const copy = certificateNoticeCopy({ status: 'missing', replacementReason: null, reassurance: null, uploadAllowed: true })
    expect(copy.bodyKey).toBe('certificate.missing_body')
    expect(copy.showUpload).toBe(true)
    expect(copy.showHelpline).toBe(true)
    expect(copy.titleKey).toBeNull()
  })

  it('missing with uploadAllowed false shows neither button nor helpline', () => {
    const copy = certificateNoticeCopy({ status: 'missing', replacementReason: null, reassurance: null, uploadAllowed: false })
    expect(copy.showUpload).toBe(false)
    expect(copy.showHelpline).toBe(false)
  })

  it('awaiting_review renders exactly one line, no button, no helpline', () => {
    const copy = certificateNoticeCopy({ status: 'awaiting_review', replacementReason: null, reassurance: null, uploadAllowed: false })
    expect(copy.bodyKey).toBe('certificate.awaiting_review')
    expect(copy.showUpload).toBe(false)
    expect(copy.showHelpline).toBe(false)
  })

  it('accepted renders exactly one line', () => {
    const copy = certificateNoticeCopy({ status: 'accepted', replacementReason: null, reassurance: null, uploadAllowed: false })
    expect(copy.bodyKey).toBe('certificate.accepted')
  })

  it('replacement_requested + unclear_date ⇒ the unclear body, ⛔ never the future body', () => {
    const copy = certificateNoticeCopy({
      status: 'replacement_requested',
      replacementReason: 'unclear_date',
      reassurance: 'not_refused',
      uploadAllowed: true,
    })
    expect(copy.titleKey).toBe('certificate.replacement_title')
    expect(copy.bodyKey).toBe('certificate.replacement_body')
    expect(copy.reassuranceKey).toBe('certificate.not_refused')
    expect(copy.showUpload).toBe(true)
    expect(copy.showHelpline).toBe(true)
  })

  it('AC3 — the VIEW places BigDev\'s helpline line as the CTA label, and the upload label, EXACTLY when each control shows', () => {
    for (const status of ['not_needed', 'missing', 'awaiting_review', 'accepted', 'replacement_requested'] as const) {
      for (const uploadAllowed of [true, false]) {
        const copy = certificateNoticeCopy({ status, replacementReason: null, reassurance: null, uploadAllowed })
        expect(copy.helplineLabelKey, `${status}/${uploadAllowed}`).toBe(copy.showHelpline ? 'certificate.replacement_helpline' : null)
        expect(copy.uploadLabelKey, `${status}/${uploadAllowed}`).toBe(copy.showUpload ? 'certificate.replacement_upload' : null)
      }
    }
  })

  it('replacement_requested + future_date ⇒ the future body, ⛔ never the unclear body', () => {
    const copy = certificateNoticeCopy({
      status: 'replacement_requested',
      replacementReason: 'future_date',
      reassurance: 'not_refused',
      uploadAllowed: true,
    })
    expect(copy.bodyKey).toBe('certificate.replacement_body_future')
  })

  it('a reversed claim shows still_open, ⛔ never not_refused', () => {
    const copy = certificateNoticeCopy({
      status: 'replacement_requested',
      replacementReason: 'unclear_date',
      reassurance: 'still_open',
      uploadAllowed: true,
    })
    expect(copy.reassuranceKey).toBe('certificate.still_open')
  })

  it('no status but replacement_requested shows EITHER reassurance line', () => {
    for (const status of ['not_needed', 'missing', 'awaiting_review', 'accepted'] as const) {
      const copy = certificateNoticeCopy({ status, replacementReason: null, reassurance: null, uploadAllowed: true })
      expect(copy.reassuranceKey, status).toBeNull()
    }
  })
})
