// packages/contracts/tests/reconciliation.test.ts — Story 9.2 (Task 5).
//
// Guards the parse-result summary contract: `.strict()`, the local BankCodeSchema stays in
// lockstep with @twt/domain's `BANK_CODES` (test-only cross-package import — the bundle
// boundary rule forbids it at SOURCE, [[project_contracts_domain_bundle_boundary]]), and the
// no-shadow discipline (the summary carries NO full BankStatementEntry / UTR / sender data).

import { bankStatement } from '@twt/domain';
import { describe, expect, it } from 'vitest';
import { assertStrict } from '../src/_common/strict.js';
import {
  BankCodeSchema,
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
