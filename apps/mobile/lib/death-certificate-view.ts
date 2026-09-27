// PURE death-certificate notice logic — Story 6.21b (D1, D3; BW-C1).
//
// apps/mobile has NO render harness (`vitest.config.ts` is `environment: 'node'`), so every piece
// of this story's logic that CAN be pure lives here and is tested in node — the marker precedence
// (the in-flight overlay's rules 1-4 + the offline case) and the copy-key selection the shepherd
// notice and the replacement screen BOTH render through (D3 — "the SAME pure view function").
//
// ── The server is AUTHORITATIVE; the marker is a client-only DISPLAY OVERLAY (D1) ────────────────
// It is NEVER sent to the server, NEVER read by the helpline, and NEVER turns a server status into
// anything OTHER than `awaiting_review`.

import type { MemberDeathCertificateStatusResponse } from '@twt/contracts'

/** The in-flight marker — written on the upload's 202 only, never on an error (D1). */
export interface DeathCertificatePendingMarker {
  readonly writtenAt: string
  readonly serverStatusAtWrite: MemberDeathCertificateStatusResponse['status']
  readonly tokenAtWrite: string | null
}

/** 24 hours (D1 rule 3). */
export const CERTIFICATE_MARKER_TTL_MS = 24 * 60 * 60 * 1000

/** What the notice renders, AFTER the marker precedence has been applied. */
export interface CertificateNoticeView {
  readonly status: MemberDeathCertificateStatusResponse['status']
  readonly replacementReason: MemberDeathCertificateStatusResponse['replacement_reason']
  readonly reassurance: MemberDeathCertificateStatusResponse['reassurance']
  /** Whether the surface may OFFER an upload control for this (possibly marker-overridden) view. */
  readonly uploadAllowed: boolean
}

export interface CertificateNoticeResolution {
  /** `null` = render NO certificate notice at all (no fresh server read — `-249` §1). */
  readonly notice: CertificateNoticeView | null
  /** `true` when the caller should delete the stored marker (the server has moved on). */
  readonly clearMarker: boolean
}

/**
 * D1's in-flight precedence, evaluated in order, PLUS the offline case (`serverRead === null`).
 * Pure — the caller does the actual marker read/write/clear (I/O).
 */
export function resolveCertificateNotice(
  serverRead: MemberDeathCertificateStatusResponse | null,
  marker: DeathCertificatePendingMarker | null,
  nowMs: number,
): CertificateNoticeResolution {
  // `-249` §1 (B1) — with NO fresh server read (offline, or an error): render NO certificate notice
  // at all. Never serve a cached status (the `-242` defect class: a stale "not refused" on a since-
  // denied claim).
  if (serverRead === null) {
    return { notice: null, clearMarker: false }
  }

  const serverNotice: CertificateNoticeView = {
    status: serverRead.status,
    replacementReason: serverRead.replacement_reason,
    reassurance: serverRead.reassurance,
    uploadAllowed: serverRead.upload_allowed,
  }

  if (marker === null) {
    return { notice: serverNotice, clearMarker: false }
  }

  // Rule 1 — the server status is NOT `replacement_requested` or `missing` ⇒ the server wins.
  if (serverRead.status !== 'replacement_requested' && serverRead.status !== 'missing') {
    return { notice: serverNotice, clearMarker: true }
  }

  // Rule 2 (`-247` §1) — the server's token differs from `tokenAtWrite`, OR its status differs from
  // `serverStatusAtWrite` ⇒ the server wins. Catches "B rejected after A": once B's job lands the
  // token is B's, whatever B's verdict.
  if (serverRead.certificate_token !== marker.tokenAtWrite || serverRead.status !== marker.serverStatusAtWrite) {
    return { notice: serverNotice, clearMarker: true }
  }

  // Rule 3 — the marker is 24h old or more, OR its age is negative (the device clock moved
  // backwards) ⇒ expired.
  const ageMs = nowMs - Date.parse(marker.writtenAt)
  if (Number.isNaN(ageMs) || ageMs < 0 || ageMs >= CERTIFICATE_MARKER_TTL_MS) {
    return { notice: serverNotice, clearMarker: true }
  }

  // Rule 4 — otherwise: show `awaiting_review`, upload button HIDDEN (never upload twice while the
  // first is processing).
  return {
    notice: {
      status: 'awaiting_review',
      replacementReason: null,
      reassurance: null,
      uploadAllowed: false,
    },
    clearMarker: false,
  }
}

/** The copy keys (or `null`) a `CertificateNoticeView` renders through — the SAME function the
 *  shepherd notice and the replacement screen both call (D3). Never decides copy inline. */
export interface CertificateNoticeCopy {
  readonly titleKey: string | null
  readonly bodyKey: string | null
  readonly reassuranceKey: string | null
  readonly showUpload: boolean
  readonly showHelpline: boolean
  /** The upload button's label — non-null EXACTLY when `showUpload` (AC3: the view places it). */
  readonly uploadLabelKey: string | null
  /** The `<CallHelplineCTA>` label — BigDev's line — non-null EXACTLY when `showHelpline` (AC3). */
  readonly helplineLabelKey: string | null
}

const UPLOAD_LABEL_KEY = 'certificate.replacement_upload'
/** BigDev's helpline line (D4) — the ONE constant every helpline CTA on the certificate surfaces carries. */
export const HELPLINE_LABEL_KEY = 'certificate.replacement_helpline'

/** The two action labels follow the two flags — ONE place, so a surface can never show a control
 *  with a label the view did not choose. */
function withLabels(copy: Omit<CertificateNoticeCopy, 'uploadLabelKey' | 'helplineLabelKey'>): CertificateNoticeCopy {
  return {
    ...copy,
    uploadLabelKey: copy.showUpload ? UPLOAD_LABEL_KEY : null,
    helplineLabelKey: copy.showHelpline ? HELPLINE_LABEL_KEY : null,
  }
}

export function certificateNoticeCopy(notice: CertificateNoticeView): CertificateNoticeCopy {
  return withLabels(certificateNoticeFlags(notice))
}

function certificateNoticeFlags(notice: CertificateNoticeView): Omit<CertificateNoticeCopy, 'uploadLabelKey' | 'helplineLabelKey'> {
  switch (notice.status) {
    case 'not_needed':
      return { titleKey: null, bodyKey: null, reassuranceKey: null, showUpload: false, showHelpline: false }
    case 'missing':
      return {
        titleKey: null,
        bodyKey: 'certificate.missing_body',
        reassuranceKey: null,
        showUpload: notice.uploadAllowed,
        showHelpline: notice.uploadAllowed,
      }
    case 'awaiting_review':
      return {
        titleKey: null,
        bodyKey: 'certificate.awaiting_review',
        reassuranceKey: null,
        showUpload: false,
        showHelpline: false,
      }
    case 'accepted':
      return {
        titleKey: null,
        bodyKey: 'certificate.accepted',
        reassuranceKey: null,
        showUpload: false,
        showHelpline: false,
      }
    case 'replacement_requested':
      return {
        titleKey: 'certificate.replacement_title',
        bodyKey: notice.replacementReason === 'future_date' ? 'certificate.replacement_body_future' : 'certificate.replacement_body',
        reassuranceKey: notice.reassurance === 'still_open' ? 'certificate.still_open' : notice.reassurance === 'not_refused' ? 'certificate.not_refused' : null,
        showUpload: notice.uploadAllowed,
        showHelpline: notice.uploadAllowed,
      }
  }
}
