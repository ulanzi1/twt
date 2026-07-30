// Bulk-operations contract tests — Story 10.6 (Task 6; AC1, AC2, AC6, AC8).
//
// TWO jobs: (1) the test-only sync-guard binding the contract enums + the batch-cap mirror to the
// @twt/domain source of truth (contracts cannot import domain in SHIPPED files — the RN bundle
// boundary — so this test, which never ships, is the mechanical drift guard, per
// [[project_contracts_domain_bundle_boundary]]); (2) the `.strict()` round-trip behavior of every
// bulk-operations DTO.

import { bulkOperations } from '@twt/domain';
import { describe, expect, it } from 'vitest';

import {
  BULK_BATCH_CAP,
  BULK_ITEM_EVALUATION_OUTCOMES,
  BULK_ITEM_STATUSES,
  BulkCounts,
  BulkDivergence,
  BulkExecuteRequest,
  BulkItemEvaluation,
  BulkItemOutcome,
  BulkPreviewResponse,
  BulkResultResponse,
} from '../../src/bulk-operations/index.js';

describe('bulk-operations contracts ↔ @twt/domain sync-guard', () => {
  it('BULK_ITEM_EVALUATION_OUTCOMES matches the domain ITEM_EVALUATION_OUTCOMES tuple exactly', () => {
    expect([...BULK_ITEM_EVALUATION_OUTCOMES]).toEqual([...bulkOperations.ITEM_EVALUATION_OUTCOMES]);
  });

  it('BULK_ITEM_STATUSES matches the domain BULK_ITEM_STATUSES tuple exactly', () => {
    expect([...BULK_ITEM_STATUSES]).toEqual([...bulkOperations.BULK_ITEM_STATUSES]);
  });

  it('the contracts BULK_BATCH_CAP mirror matches the domain harness-enforced constant', () => {
    expect(BULK_BATCH_CAP).toBe(bulkOperations.BULK_BATCH_CAP);
  });
});

describe('BulkExecuteRequest', () => {
  it('accepts a well-formed request', () => {
    const parsed = BulkExecuteRequest.parse({
      operation_type: 'member.moderate',
      target_set: [{ member_id: 'abc' }, { member_id: 'def' }],
      dry_run: true,
    });
    expect(parsed.target_set).toHaveLength(2);
  });

  it('rejects an unknown field (.strict())', () => {
    expect(() =>
      BulkExecuteRequest.parse({
        operation_type: 'member.moderate',
        target_set: [],
        dry_run: true,
        extra: 'nope',
      }),
    ).toThrow();
  });

  it('rejects a target_set beyond the batch-cap mirror', () => {
    const oversized = Array.from({ length: BULK_BATCH_CAP + 1 }, () => ({}));
    expect(() =>
      BulkExecuteRequest.parse({ operation_type: 'x.y', target_set: oversized, dry_run: false }),
    ).toThrow();
  });
});

describe('BulkItemEvaluation / BulkItemOutcome / BulkDivergence', () => {
  it('round-trips a would_fail evaluation with a reason', () => {
    const parsed = BulkItemEvaluation.parse({ outcome: 'would_fail', reason: 'out_of_scope' });
    expect(parsed).toEqual({ outcome: 'would_fail', reason: 'out_of_scope' });
  });

  it('round-trips a would_succeed evaluation with no reason', () => {
    const parsed = BulkItemEvaluation.parse({ outcome: 'would_succeed' });
    expect(parsed).toEqual({ outcome: 'would_succeed' });
  });

  it('rejects an unknown outcome literal', () => {
    expect(() => BulkItemEvaluation.parse({ outcome: 'maybe' })).toThrow();
  });

  // Review Findings: `reason` is now REQUIRED for would_fail/skipped (matching the domain
  // `ItemEvaluation` discriminated union) and FORBIDDEN for would_succeed — the schema previously
  // left it unconditionally optional, silently accepting a would_fail/skipped evaluation with no
  // reason at all despite the DTO's own doc comment claiming otherwise.
  it('rejects a would_fail evaluation with no reason', () => {
    expect(() => BulkItemEvaluation.parse({ outcome: 'would_fail' })).toThrow();
  });

  it('rejects a would_succeed evaluation carrying a reason', () => {
    expect(() => BulkItemEvaluation.parse({ outcome: 'would_succeed', reason: 'nope' })).toThrow();
  });

  it('round-trips a BulkItemOutcome for every status literal, reason present only where required', () => {
    const REASON_REQUIRED = new Set(['would_fail', 'skipped', 'failed']);
    for (const status of BULK_ITEM_STATUSES) {
      const payload = REASON_REQUIRED.has(status)
        ? { item_ref: 'item-1', status, reason: 'r' }
        : { item_ref: 'item-1', status };
      const parsed = BulkItemOutcome.parse(payload);
      expect(parsed.status).toBe(status);
    }
  });

  it('rejects a would_fail/skipped/failed BulkItemOutcome with no reason', () => {
    for (const status of ['would_fail', 'skipped', 'failed'] as const) {
      expect(() => BulkItemOutcome.parse({ item_ref: 'item-1', status })).toThrow();
    }
  });

  it('rejects a would_succeed/succeeded BulkItemOutcome carrying a reason', () => {
    for (const status of ['would_succeed', 'succeeded'] as const) {
      expect(() => BulkItemOutcome.parse({ item_ref: 'item-1', status, reason: 'nope' })).toThrow();
    }
  });

  it('round-trips a BulkDivergence', () => {
    const parsed = BulkDivergence.parse({
      item_ref: 'item-1',
      expected: { outcome: 'would_succeed' },
      actual: { outcome: 'skipped', reason: 'out_of_scope' },
      reason: 'concurrent state change',
    });
    expect(parsed.actual.outcome).toBe('skipped');
  });
});

describe('BulkCounts', () => {
  it('round-trips a full counts object', () => {
    const parsed = BulkCounts.parse({
      total: 10,
      would_succeed: 5,
      would_fail: 3,
      skipped: 2,
      succeeded: 5,
      failed: 0,
    });
    expect(parsed.total).toBe(10);
  });

  it('rejects a negative count', () => {
    expect(() =>
      BulkCounts.parse({
        total: -1,
        would_succeed: 0,
        would_fail: 0,
        skipped: 0,
        succeeded: 0,
        failed: 0,
      }),
    ).toThrow();
  });
});

describe('BulkPreviewResponse / BulkResultResponse', () => {
  const counts = {
    total: 1,
    would_succeed: 1,
    would_fail: 0,
    skipped: 0,
    succeeded: 0,
    failed: 0,
  };

  it('round-trips a dry-run preview response', () => {
    const parsed = BulkPreviewResponse.parse({
      batch_id: 'batch-1',
      counts,
      items: [{ item_ref: 'item-1', status: 'would_succeed' }],
      preview_csv: 'item_ref,status\r\nitem-1,would_succeed\r\n',
      divergences: [],
    });
    expect(parsed.items).toHaveLength(1);
  });

  it('round-trips an execute result response', () => {
    const parsed = BulkResultResponse.parse({
      batch_id: 'batch-1',
      counts: { ...counts, would_succeed: 0, succeeded: 1 },
      items: [{ item_ref: 'item-1', status: 'succeeded' }],
      error_csv: '',
      divergences: [],
    });
    expect(parsed.items[0]?.status).toBe('succeeded');
  });

  it('rejects an unknown field on the response (.strict())', () => {
    expect(() =>
      BulkResultResponse.parse({
        batch_id: 'batch-1',
        counts,
        items: [],
        error_csv: '',
        divergences: [],
        extra: 'nope',
      }),
    ).toThrow();
  });
});
