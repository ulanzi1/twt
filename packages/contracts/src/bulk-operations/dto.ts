// Bulk-operations transport DTOs — Story 10.6 (Task 5; AC1, AC2, AC6).
//
// Pure-Zod, `.strict()`, snake_case wire. NO `@twt/domain` import in this shipped file
// ([[project_contracts_domain_bundle_boundary]]). No `apps/api` route ships this story (the Scope
// Boundary) — these DTOs are the wire shape a FUTURE consuming surface's route will use.

import { z } from 'zod';

import { BULK_BATCH_CAP } from './enums.js';

/**
 * One target-set item. Deliberately a loose JSON record, NOT a fixed shape: `bulkExecute` is
 * operation-agnostic (Load-Bearing Decision 5) and each registered `BulkOperation` interprets its
 * own item shape (a member id for moderation, a custom-field target for 10.12, …) — this DTO only
 * bounds it to "a JSON object", not to any one operation's fields.
 */
export const BulkTargetItem = z.record(z.string(), z.unknown());
export type BulkTargetItem = z.output<typeof BulkTargetItem>;

/** The bulk-execute request. `target_set.max()` mirrors `BULK_BATCH_CAP` (AC5) — defense in depth
 *  only; the harness-enforced cap is the structural guarantee (Load-Bearing Decision 6). */
export const BulkExecuteRequest = z
  .object({
    operation_type: z.string().min(1).max(128),
    target_set: z.array(BulkTargetItem).max(BULK_BATCH_CAP),
    dry_run: z.boolean(),
  })
  .strict();
export type BulkExecuteRequest = z.output<typeof BulkExecuteRequest>;

/** The shared evaluator's per-item verdict (AC2/AC7) — `reason` is REQUIRED for every outcome
 *  except `would_succeed` (matching the domain `ItemEvaluation` discriminated union exactly;
 *  Review Findings — the schema previously left `reason` unconditionally optional, silently
 *  accepting a `would_fail`/`skipped` evaluation with no reason despite this doc comment). */
export const BulkItemEvaluation = z.discriminatedUnion('outcome', [
  z.object({ outcome: z.literal('would_succeed') }).strict(),
  z.object({ outcome: z.literal('would_fail'), reason: z.string().max(512) }).strict(),
  z.object({ outcome: z.literal('skipped'), reason: z.string().max(512) }).strict(),
]);
export type BulkItemEvaluation = z.output<typeof BulkItemEvaluation>;

/** One item's final outcome — the row a CSV/JSON list renders (AC2/AC6). `reason` is REQUIRED for
 *  every status except the two success states (`would_succeed` dry-run, `succeeded` execute) —
 *  matching the domain shape (Review Findings). */
export const BulkItemOutcome = z.discriminatedUnion('status', [
  z.object({ item_ref: z.string().min(1).max(256), status: z.literal('would_succeed') }).strict(),
  z.object({ item_ref: z.string().min(1).max(256), status: z.literal('succeeded') }).strict(),
  z
    .object({
      item_ref: z.string().min(1).max(256),
      status: z.literal('would_fail'),
      reason: z.string().max(512),
    })
    .strict(),
  z
    .object({
      item_ref: z.string().min(1).max(256),
      status: z.literal('skipped'),
      reason: z.string().max(512),
    })
    .strict(),
  z
    .object({
      item_ref: z.string().min(1).max(256),
      status: z.literal('failed'),
      reason: z.string().max(512),
    })
    .strict(),
]);
export type BulkItemOutcome = z.output<typeof BulkItemOutcome>;

/** A preview↔execute mismatch — the ONLY sanctioned divergence (a concurrent state change, AC7). */
export const BulkDivergence = z
  .object({
    item_ref: z.string().min(1).max(256),
    expected: BulkItemEvaluation,
    actual: BulkItemEvaluation,
    reason: z.string().max(512),
  })
  .strict();
export type BulkDivergence = z.output<typeof BulkDivergence>;

/** Aggregate batch counts (AC2/AC6). `succeeded`/`failed` are always 0 in a preview response. */
export const BulkCounts = z
  .object({
    total: z.number().int().min(0),
    would_succeed: z.number().int().min(0),
    would_fail: z.number().int().min(0),
    skipped: z.number().int().min(0),
    succeeded: z.number().int().min(0),
    failed: z.number().int().min(0),
  })
  .strict();
export type BulkCounts = z.output<typeof BulkCounts>;

/** Dry-run preview response (AC2) — zero side effects; `divergences` is always empty (execute-only). */
export const BulkPreviewResponse = z
  .object({
    batch_id: z.string().min(1).max(256),
    counts: BulkCounts,
    items: z.array(BulkItemOutcome),
    preview_csv: z.string(),
    divergences: z.array(BulkDivergence),
  })
  .strict();
export type BulkPreviewResponse = z.output<typeof BulkPreviewResponse>;

/** Execute response (AC4/AC6/AC7) — `error_csv` lists every item that did NOT succeed. */
export const BulkResultResponse = z
  .object({
    batch_id: z.string().min(1).max(256),
    counts: BulkCounts,
    items: z.array(BulkItemOutcome),
    error_csv: z.string(),
    divergences: z.array(BulkDivergence),
  })
  .strict();
export type BulkResultResponse = z.output<typeof BulkResultResponse>;
