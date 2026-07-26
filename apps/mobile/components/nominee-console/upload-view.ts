// <BankStatementUpload> — the PURE view-decision logic (Story 9.3, Task 6; AC1/AC2/AC5).
//
// The mobile app has NO component-render harness (vitest = node-testable PURE logic only), so the upload
// surface's states + the parse-outcome → view mapping live HERE as pure functions the unit tests pin, and
// the `<BankStatementUpload>` component is a thin projection of them (the 9.1 console-view.ts precedent).
//
// Server-authoritative (Decision D1): the client resolves NOTHING about whether a file parses — it POSTs
// the bytes and maps the discriminated `BankStatementUploadResponse` to a view. A `parsed` outcome shows
// the summary; a `fallback` outcome shows the dignified "Hum aapke liye padh lenge" state + the two AC2
// paths (retry / accept the human help). NEVER "Error/Invalid/Failed" copy — every reason maps to a
// Pattern-4 i18n key.

import { ApiError } from '@twt/api-client'
import type { BankStatementUploadResponse, ParseResultSummary } from '@twt/contracts'

/**
 * The upload flow stages (UX-DR36, adapted to the CSV-first-with-fallback reality — no OCR path, D1):
 *   · `default`            — nothing picked yet (the file-source chooser).
 *   · `upload-in-progress` — the multipart POST is in flight.
 *   · `parse-processing`   — the server is parsing inline (~5s; the same request, a UI sub-phase).
 *   · `parse-success`      — an allowlisted-bank CSV normalized → the summary preview.
 *   · `parse-failure`      — the file could not be parsed → the dignified fallback + the two AC2 paths.
 *   · `save-and-resume`    — a paused/partial upload restored from the MMKV draft (UX-DR50).
 *   · `resume-failed`      — the local draft could not be restored → the helpline fallback (UX-DR50).
 */
export type BankStatementUploadStage =
  | 'default'
  | 'upload-in-progress'
  | 'parse-processing'
  | 'parse-success'
  | 'parse-failure'
  | 'save-and-resume'
  | 'resume-failed'

/** The view the surface renders after an upload resolves — success (summary) or the human fallback. */
export type UploadOutcomeView =
  | { readonly kind: 'parse-success'; readonly summary: ParseResultSummary; readonly parsedRowsLabelKey: string }
  | {
      readonly kind: 'parse-failure'
      /** The i18n key for the dignified reason line (Pattern-4 — never "error"). */
      readonly reasonCopyKey: string
      /** The staff-transcription SLA in hours (the surface renders the 24–48h range from it). */
      readonly slaHours: number
      /** Present when a CSV parsed to zero usable rows — the surface can still show "0 of N read". */
      readonly summary: ParseResultSummary | null
    }

/** Map a fallback reason to its dignified i18n copy key (never a raw machine token in the UI). The
 *  `default` branch is a defensive neutral fallback for a reason token this client build doesn't
 *  recognize (forward-compat with a server ahead of the client) — not a distinct reachable reason today. */
export function fallbackReasonCopyKey(reason: string): string {
  switch (reason) {
    case 'unsupported_file':
      return 'upload.fallback.reason_unsupported'
    case 'unknown_bank':
      return 'upload.fallback.reason_unknown_bank'
    case 'parse_failed':
      return 'upload.fallback.reason_parse_failed'
    default:
      return 'upload.fallback.reason_requested'
  }
}

/**
 * Map the server's discriminated upload response to the outcome view. A `parsed` outcome → the summary
 * preview; a `fallback` outcome → the dignified human-fallback view + the reason copy key + the SLA. Total
 * over the union (the `.strict()` discriminated response makes this exhaustive).
 */
export function resolveUploadOutcomeView(response: BankStatementUploadResponse): UploadOutcomeView {
  if (response.outcome === 'parsed') {
    return {
      kind: 'parse-success',
      summary: response.summary,
      parsedRowsLabelKey: 'upload.success.rows',
    }
  }
  return {
    kind: 'parse-failure',
    reasonCopyKey: fallbackReasonCopyKey(response.fallback.reason),
    slaHours: response.fallback.slaHours,
    summary: response.fallback.summary ?? null,
  }
}

/** Map an upload-request failure to a dignified i18n copy key (Pattern-4 — never "Error/Invalid/Failed").
 *  Keys on the server's `error.code` (the api-client doc contract for this endpoint: a 413/400/503
 *  surfaces as `ApiError`) so a quarantined file, an oversized file, and a storage outage each get their
 *  own honest copy instead of one generic "try again" that would invite resubmitting a rejected file.
 *  Anything unrecognized (a network failure, a code this client build doesn't know) falls back to the
 *  generic dignified retry copy. */
export function uploadErrorNoticeKey(err: unknown): string {
  if (err instanceof ApiError) {
    switch (err.code) {
      case 'reconciliation.too_large':
        return 'upload.error.too_large'
      case 'reconciliation.file_quarantined':
        return 'upload.error.quarantined'
      case 'reconciliation.storage_unavailable':
        return 'upload.error.unavailable'
      default:
        return 'upload.error.generic'
    }
  }
  return 'upload.error.generic'
}

/** The stage a resolved outcome drives (`parse-success` vs `parse-failure`). */
export function stageForOutcome(response: BankStatementUploadResponse): BankStatementUploadStage {
  return response.outcome === 'parsed' ? 'parse-success' : 'parse-failure'
}

/**
 * The interpolation values for the success summary line ("{parsed} rows read, {rejected} set aside"). The
 * numbers come STRAIGHT from the server summary — the client never recomputes a count (server-authoritative).
 */
export function summaryCounts(summary: ParseResultSummary): { parsed: number; rejected: number } {
  return { parsed: summary.rows_parsed, rejected: summary.rows_rejected }
}
