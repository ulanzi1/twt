// <BankStatementUpload> pure view-resolver unit tests (Story 9.3, Task 6; AC1/AC2). DB-free, node-testable —
// the mobile app has no render harness, so the surface's render decisions live in upload-view.ts and are
// pinned here (the 9.1 console-view.test.ts precedent).

import { describe, expect, it } from 'vitest'

import { ApiError } from '@twt/api-client'
import type { BankStatementUploadResponse, ParseResultSummary } from '@twt/contracts'

import {
  fallbackReasonCopyKey,
  resolveUploadOutcomeView,
  stageForOutcome,
  summaryCounts,
  uploadErrorNoticeKey,
} from '../../components/nominee-console/upload-view'

const summary: ParseResultSummary = {
  bank_code: 'sbi',
  rows_parsed: 12,
  rows_rejected: 2,
  rejected_breakdown: {
    'unparseable-date': 1,
    'missing-amount': 1,
    'empty-row': 0,
    'ambiguous-direction': 0,
    'ambiguous-amount': 0,
  },
  parser_version: 'sbi@1',
}

describe('resolveUploadOutcomeView', () => {
  it('a parsed outcome → parse-success view carrying the summary + a copy key (never a raw count)', () => {
    const res: BankStatementUploadResponse = { outcome: 'parsed', summary }
    const view = resolveUploadOutcomeView(res)
    expect(view.kind).toBe('parse-success')
    if (view.kind === 'parse-success') {
      expect(view.summary.rows_parsed).toBe(12)
      expect(view.parsedRowsLabelKey).toBe('upload.success.rows')
    }
    expect(stageForOutcome(res)).toBe('parse-success')
  })

  it('a fallback outcome → parse-failure view with a dignified reason copy key + the SLA (never "error")', () => {
    const res: BankStatementUploadResponse = {
      outcome: 'fallback',
      fallback: { reason: 'unsupported_file', slaHours: 48 },
    }
    const view = resolveUploadOutcomeView(res)
    expect(view.kind).toBe('parse-failure')
    if (view.kind === 'parse-failure') {
      expect(view.reasonCopyKey).toBe('upload.fallback.reason_unsupported')
      expect(view.slaHours).toBe(48)
      expect(view.summary).toBeNull()
      // The copy key never leaks a raw machine token / the word "error".
      expect(view.reasonCopyKey).not.toMatch(/error|invalid|failed[^_]/i)
    }
    expect(stageForOutcome(res)).toBe('parse-failure')
  })

  it('a parse_failed fallback carries the summary through so the surface can still explain "0 of N read"', () => {
    const zero: ParseResultSummary = { ...summary, rows_parsed: 0, rows_rejected: 5 }
    const res: BankStatementUploadResponse = {
      outcome: 'fallback',
      fallback: { reason: 'parse_failed', slaHours: 48, summary: zero },
    }
    const view = resolveUploadOutcomeView(res)
    expect(view.kind).toBe('parse-failure')
    if (view.kind === 'parse-failure') {
      expect(view.summary?.rows_parsed).toBe(0)
      expect(view.reasonCopyKey).toBe('upload.fallback.reason_parse_failed')
    }
  })
})

describe('fallbackReasonCopyKey — every reason maps to a Pattern-4 key (dignified, never "error")', () => {
  it.each([
    ['unsupported_file', 'upload.fallback.reason_unsupported'],
    ['unknown_bank', 'upload.fallback.reason_unknown_bank'],
    ['parse_failed', 'upload.fallback.reason_parse_failed'],
    ['anything-else', 'upload.fallback.reason_requested'], // total (unknown → the neutral default)
  ])('%s → %s', (reason, key) => {
    expect(fallbackReasonCopyKey(reason)).toBe(key)
  })
})

describe('summaryCounts', () => {
  it('surfaces the SERVER counts verbatim (the client never recomputes)', () => {
    expect(summaryCounts(summary)).toEqual({ parsed: 12, rejected: 2 })
  })
})

describe('uploadErrorNoticeKey — each server error.code gets its own dignified copy (never one generic message for everything)', () => {
  it.each([
    ['reconciliation.too_large', 'upload.error.too_large'],
    ['reconciliation.file_quarantined', 'upload.error.quarantined'],
    ['reconciliation.storage_unavailable', 'upload.error.unavailable'],
    ['reconciliation.empty', 'upload.error.generic'], // a recognized ApiError with no dedicated copy yet
    ['some-future-code', 'upload.error.generic'], // forward-compat: an unrecognized code never crashes
  ])('ApiError(%s) → %s', (code, key) => {
    expect(uploadErrorNoticeKey(new ApiError(400, code, 'message'))).toBe(key)
  })

  it('a non-ApiError failure (e.g. a network error) falls back to the generic dignified copy', () => {
    expect(uploadErrorNoticeKey(new TypeError('Network request failed'))).toBe('upload.error.generic')
  })

  it('a virus-quarantined file never gets the same copy as a transient storage outage', () => {
    const quarantined = uploadErrorNoticeKey(new ApiError(400, 'reconciliation.file_quarantined', 'x'))
    const unavailable = uploadErrorNoticeKey(new ApiError(503, 'reconciliation.storage_unavailable', 'x'))
    expect(quarantined).not.toBe(unavailable)
  })
})
