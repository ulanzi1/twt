// packages/contracts/tests/reconciliation.test.ts — Story 9.2 (Task 5).
//
// Guards the parse-result summary contract: `.strict()`, the local BankCodeSchema stays in
// lockstep with @twt/domain's `BANK_CODES` (test-only cross-package import — the bundle
// boundary rule forbids it at SOURCE, [[project_contracts_domain_bundle_boundary]]), and the
// no-shadow discipline (the summary carries NO full BankStatementEntry / UTR / sender data).

import { bankStatement, reconciliation } from '@twt/domain';
import { describe, expect, it } from 'vitest';
import { assertStrict } from '../src/_common/strict.js';
import {
  BankCodeSchema,
  BankStatementFallbackAck,
  BankStatementFallbackReason,
  BankStatementUploadRequest,
  BankStatementUploadResponse,
  ParseResultSummary,
  RejectedRowBreakdown,
} from '../src/reconciliation/index.js';

describe('reconciliation parse-result contract', () => {
  const valid = {
    bank_code: 'sbi',
    rows_parsed: 48,
    rows_rejected: 2,
    rejected_breakdown: {
      'unparseable-date': 1,
      'missing-amount': 1,
      'empty-row': 0,
      'ambiguous-direction': 0,
      'ambiguous-amount': 0,
    },
    parser_version: 'sbi@1',
  };

  it('accepts a well-formed summary', () => {
    expect(ParseResultSummary.parse(valid)).toBeTruthy();
  });

  it('is .strict() (summary + breakdown)', () => {
    expect(() => assertStrict(ParseResultSummary)).not.toThrow();
    expect(() => assertStrict(RejectedRowBreakdown)).not.toThrow();
    expect(() => ParseResultSummary.parse({ ...valid, surprise: 1 })).toThrow();
  });

  it('rejects a negative / non-integer count', () => {
    expect(() => ParseResultSummary.parse({ ...valid, rows_parsed: -1 })).toThrow();
    expect(() => ParseResultSummary.parse({ ...valid, rows_rejected: 1.5 })).toThrow();
  });

  it('BankCodeSchema is value-aligned with @twt/domain BANK_CODES (lockstep guard)', () => {
    expect([...BankCodeSchema.options].sort()).toEqual([...bankStatement.BANK_CODES].sort());
  });

  it('NO-SHADOW teeth: the summary carries no full-entry / PII field', () => {
    for (const field of ['entries', 'raw_row', 'transaction_id_utr', 'sender_name', 'sender_vpa', 'amount']) {
      expect(() => ParseResultSummary.parse({ ...valid, [field]: 'x' })).toThrow();
    }
  });
});

// ── Story 9.3 — the upload-transport shapes ───────────────────────────────────────────────────────────
describe('reconciliation upload-transport contract (Story 9.3)', () => {
  const validSummary = {
    bank_code: 'sbi',
    rows_parsed: 48,
    rows_rejected: 2,
    rejected_breakdown: {
      'unparseable-date': 1,
      'missing-amount': 1,
      'empty-row': 0,
      'ambiguous-direction': 0,
      'ambiguous-amount': 0,
    },
    parser_version: 'sbi@1',
  };

  it('the upload request is .strict() — bank_code required, claim_case_id optional (staff path)', () => {
    expect(() => assertStrict(BankStatementUploadRequest)).not.toThrow();
    expect(BankStatementUploadRequest.parse({ bank_code: 'sbi' })).toBeTruthy();
    expect(
      BankStatementUploadRequest.parse({ bank_code: 'pnb', claim_case_id: '11111111-1111-1111-1111-111111111111' }),
    ).toBeTruthy();
    expect(() => BankStatementUploadRequest.parse({ bank_code: 'nope' })).toThrow();
    expect(() => BankStatementUploadRequest.parse({ bank_code: 'sbi', surprise: 1 })).toThrow();
  });

  it('the upload response is a discriminated union — parsed carries the summary, fallback the ack', () => {
    const parsed = BankStatementUploadResponse.parse({ outcome: 'parsed', summary: validSummary });
    expect(parsed.outcome).toBe('parsed');
    const fb = BankStatementUploadResponse.parse({
      outcome: 'fallback',
      fallback: { reason: 'unsupported_file', slaHours: 48 },
    });
    expect(fb.outcome).toBe('fallback');
    // A parsed arm may not carry a fallback (and vice-versa) — the discriminant + .strict() enforce it.
    expect(() =>
      BankStatementUploadResponse.parse({ outcome: 'parsed', summary: validSummary, fallback: {} }),
    ).toThrow();
  });

  it('the fallback ack is .strict(); slaHours must be a positive integer', () => {
    expect(() => assertStrict(BankStatementFallbackAck)).not.toThrow();
    expect(() => BankStatementFallbackAck.parse({ reason: 'parse_failed', slaHours: 0 })).toThrow();
    expect(() =>
      BankStatementFallbackAck.parse({ reason: 'parse_failed', slaHours: 48, surprise: 1 }),
    ).toThrow();
  });

  it('LOCKSTEP: the contracts BankStatementFallbackReason matches the domain ReconciliationFallbackReason', () => {
    // Contracts cannot import @twt/domain at SOURCE (the bundle boundary), so the enum is re-declared and
    // kept in lockstep by THIS test-only cross-import (the BankCode precedent, [[project_contracts_domain_bundle_boundary]]).
    expect([...BankStatementFallbackReason.options].sort()).toEqual(
      [...reconciliation.ReconciliationFallbackReason.options].sort(),
    );
  });
});
