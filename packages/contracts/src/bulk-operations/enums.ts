// Bulk-operations wire enums — Story 10.6 (Task 5; AC1, AC2, AC6).
//
// Re-declared (not imported) for the bundle-boundary reason every contracts enum is
// ([[project_contracts_domain_bundle_boundary]] — @twt/domain must never appear in a SHIPPED
// contracts file, it leaks `pg` into the RN Metro bundle). `packages/domain/src/bulk-operations/
// types.ts` owns the source tuples; the TEST-only sync-guard in
// packages/contracts/tests/bulk-operations/ asserts they match.

import { z } from 'zod';

/** The shared evaluator's per-item outcome (AC2/AC7) — mirrors domain `ITEM_EVALUATION_OUTCOMES`. */
export const BULK_ITEM_EVALUATION_OUTCOMES = ['would_succeed', 'would_fail', 'skipped'] as const;
export const BulkItemEvaluationOutcome = z.enum(BULK_ITEM_EVALUATION_OUTCOMES);
export type BulkItemEvaluationOutcome = z.output<typeof BulkItemEvaluationOutcome>;

/** The final per-item status (AC2/AC6) — mirrors domain `BULK_ITEM_STATUSES`. */
export const BULK_ITEM_STATUSES = [
  'would_succeed',
  'would_fail',
  'skipped',
  'succeeded',
  'failed',
] as const;
export const BulkItemStatus = z.enum(BULK_ITEM_STATUSES);
export type BulkItemStatus = z.output<typeof BulkItemStatus>;

/** Mirrors domain `BULK_BATCH_CAP` (execute.ts) — the `.max()` mirror on `target_set` (AC5). This
 *  is defense-in-depth ONLY; the harness-enforced cap is the structural guarantee (Load-Bearing
 *  Decision 6). Kept in sync by the TEST-only cross-import sync-guard. */
export const BULK_BATCH_CAP = 5000;
