// Bulk-operations shared types — Story 10.6 (AC1).
//
// The `BulkOperation<TItem, TContext>` contract is what a consuming surface (10.10 member
// moderation, 10.12 custom fields, the notification family) implements to register into the
// harness. `bulkExecute` (execute.ts) depends ONLY on these contract methods + the registry
// lookup — never on a specific `operationType` (Load-Bearing Decision 5, AC7b).

import type { AuditEntryInput } from '../audit/write.js';
import type { EffectiveGrant } from '../rbac/check.js';
import type { ScopeDimension, TargetLocator } from '../rbac/scope.js';

/**
 * The shared evaluator's per-item verdict. Returned by the SAME `op.evaluate` call reached
 * identically in both dry-run and execute (the parity invariant, AC7) — `dryRun` never changes
 * how an item is evaluated, only whether `apply` runs and whether an audit line is written.
 */
export type ItemEvaluation =
  | { outcome: 'would_succeed' }
  | { outcome: 'would_fail'; reason: string }
  | { outcome: 'skipped'; reason: string };

/** Runtime tuple backing `ItemEvaluation['outcome']` — the contracts↔domain sync-guard target
 *  (the helpdesk `HELPDESK_CATEGORIES` tuple precedent, [[project_story_validate_footguns]]). */
export const ITEM_EVALUATION_OUTCOMES = ['would_succeed', 'would_fail', 'skipped'] as const;

/**
 * The final per-item status after `bulkExecute` runs. In dry-run this mirrors `evaluation.outcome`
 * 1:1 (`would_succeed` / `would_fail` / `skipped`). In execute, `would_succeed` resolves to
 * `succeeded` (apply ran clean) or `failed` (apply threw); `would_fail` resolves directly to
 * `failed` (apply is never attempted for a predicted failure); `skipped` stays `skipped`.
 */
export const BULK_ITEM_STATUSES = [
  'would_succeed',
  'would_fail',
  'skipped',
  'succeeded',
  'failed',
] as const;
export type BulkItemStatus = (typeof BULK_ITEM_STATUSES)[number];

/** One item's outcome in a `BulkResult` — the row a `csvRow` projection renders. */
export interface BulkItemResult {
  /** The item's identity for CSV/audit/divergence-keying — `op.itemId(item)` when the operation
   *  provides it, else falls back to the RBAC scope locator's value (`op.targetLocatorOf(item)
   *  .value ?? '<global>'`), which is NOT guaranteed unique per item (Review Findings, Story 10.6). */
  itemRef: string;
  status: BulkItemStatus;
  /** Present whenever `status` is not `succeeded` (or dry-run's `would_succeed`). */
  reason?: string;
  /** The shared evaluator's verdict this status was derived from (the AC7 byte-identical field). */
  evaluation: ItemEvaluation;
}

/** A preview↔execute mismatch — the ONLY sanctioned divergence: a concurrent state change between
 *  preview time and execute time (AC7). Surfaced, never silently absorbed. */
export interface BulkDivergence {
  itemRef: string;
  expected: ItemEvaluation;
  actual: ItemEvaluation;
  reason: string;
}

/** Aggregate counts over a batch. `wouldSucceed`/`wouldFail`/`skipped` reflect the shared
 *  evaluator's verdicts (identical in both modes, AC7); `succeeded`/`failed` are execute-only
 *  (always 0 in dry-run — `apply` never runs, AC2). */
export interface BulkCounts {
  total: number;
  wouldSucceed: number;
  wouldFail: number;
  skipped: number;
  succeeded: number;
  failed: number;
}

/** The result `bulkExecute` returns in either mode. */
export interface BulkResult {
  batchId: string;
  mode: 'dry_run' | 'execute';
  counts: BulkCounts;
  items: BulkItemResult[];
  /** Populated in dry-run only (one row per item via `op.csvRow`). */
  previewCsv?: string;
  /** Populated in execute only — every item that did NOT succeed (failed + skipped), AC6. */
  errorCsv?: string;
  /** Execute-only; empty unless `options.expectedOutcomes` was supplied (AC7). */
  divergences: BulkDivergence[];
}

/**
 * What a `BulkOperation` contributes to the harness (AC1). `evaluate` is PURE — no I/O, no
 * side effects — so it can run identically (and cheaply) in both dry-run and execute. `apply` is
 * the execute-only mutation; `csvRow` projects an item + its outcome into the CSV row shape.
 */
export interface BulkOperation<TItem, TContext> {
  /** The registry key. Never compared against inside `bulkExecute` itself (AC7b). */
  readonly operationType: string;
  /** The RBAC permission key `checkPermission` validates per item (Load-Bearing Decision 2). */
  readonly permissionKey: string;
  /** The operation's DECLARED scope dimension (AC1) — static metadata for introspection/tooling.
   *  The harness itself validates each item's ACTUAL dimension via `targetLocatorOf(item)
   *  .dimension` (Review Findings: using this static field for the per-item `checkPermission` call
   *  would silently discard a locator whose per-item dimension legitimately differs). */
  readonly scopeDimension: ScopeDimension;
  /** Dotted lowercase `resource.action` — must match `writeAuditEntry`'s `action` regex. */
  readonly auditAction: string;
  /** Where in the RBAC scope tree this item sits. */
  targetLocatorOf(item: TItem): TargetLocator;
  /** Optional per-item identity, distinct from the (possibly non-unique) RBAC scope locator —
   *  used as `itemRef` for audit `resourceLocator`/`requestPayloadHash` and as the
   *  `expectedOutcomes` divergence key. A safe harness-side default (fall back to the scope
   *  locator's value) applies when omitted, per the Open/Closed contract-extension pattern
   *  (Load-Bearing Decision 5) — operations whose items don't share a scope node with siblings
   *  can skip this; any operation where they can MUST implement it. */
  itemId?(item: TItem): string;
  /** The shared, PURE per-item evaluator (AC7's load-bearing single code path). */
  evaluate(item: TItem, ctx: TContext): ItemEvaluation;
  /** The execute-only mutation. Thrown errors are caught by the harness and recorded as `failed`
   *  — a thrown `apply` never rolls back the rest of the batch (AC6). */
  apply(item: TItem, ctx: TContext): Promise<void>;
  /** Projects one item + its final outcome into a CSV row (preview or error). */
  csvRow(item: TItem, outcome: BulkItemResult): Record<string, string>;
}

/** The acting subject + their effective grants — what `checkPermission` needs per item. */
export interface BulkActorContext {
  actorId: string;
  actorRole: string | null;
  pariwarId: string;
  grants: readonly EffectiveGrant[];
}

/** `bulkExecute`'s mode + wiring options (AC1). */
export interface BulkExecuteOptions {
  dryRun: boolean;
  /** Shared batch correlator (`traceId` on every execute audit line, AC4). Generated if omitted. */
  batchId?: string;
  /** The injected audit-write seam (AC4). Default: a no-op (safe for dry-run-only callers/tests);
   *  execute mode with a real audit trail MUST supply `(input) => writeAuditEntry(servicePool, input)`. */
  auditItem?: (input: AuditEntryInput) => Promise<void>;
  /** The preview's predicted per-item outcomes, keyed by `itemRef` (`op.itemId(item)` when the
   *  operation provides it, else the scope locator's value) — execute diffs against these to
   *  surface `divergences[]` (AC7). Ignored in dry-run. */
  expectedOutcomes?: Readonly<Record<string, ItemEvaluation>>;
  /** Explicit override for `BULK_BATCH_CAP` (AC5) — e.g. a Pariwar config lowering it. The
   *  DEFAULT (no override) never silently exceeds `BULK_BATCH_CAP`; raising it requires this
   *  explicit param, never an implicit path. */
  cap?: number;
}
