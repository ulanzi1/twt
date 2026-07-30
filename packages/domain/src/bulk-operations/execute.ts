// The `bulkExecute` harness — Story 10.6 (Task 2; AC2-AC7, AC7b).
//
// THE PARITY SPINE (Load-Bearing Decision 1). ONE function, `dryRun` gates ONLY (a) whether
// `apply` runs and (b) whether an audit line is written. The per-item scope check
// (`checkPermission`, AC3) and `op.evaluate` (the shared evaluator, AC7) are reached through the
// exact same code path regardless of mode — there is no second evaluator to drift from the first,
// so "looked fine in preview, silently failed in execute" is structurally impossible, not merely
// tested-against.
//
// Closed to modification (Load-Bearing Decision 5, AC7b): this function references ONLY the
// `BulkOperation` contract methods + the registry lookup. It contains NO comparison against a
// specific `operationType` value and NO operation-specific branch — a future operation with
// unusual needs extends the contract, it never adds an `if` here.

import { createHash, randomUUID } from 'node:crypto';

import { canonicalJsonStringify } from '../canonical-json.js';
import { checkPermission } from '../rbac/check.js';
import type { TargetLocator } from '../rbac/scope.js';
import { toCsv } from './csv.js';
import {
  BulkAuditItemRequiredError,
  BulkBatchCapExceededError,
  UnknownBulkOperationError,
} from './errors.js';
import type { BulkOperationRegistry } from './registry.js';
import type {
  BulkActorContext,
  BulkCounts,
  BulkDivergence,
  BulkExecuteOptions,
  BulkItemResult,
  BulkItemStatus,
  BulkOperation,
  BulkResult,
  ItemEvaluation,
} from './types.js';

/** The FR-49 default batch cap. Structural (harness-enforced), not just an API-layer guard
 *  (Load-Bearing Decision 6) — no consuming surface, job, or future direct caller can bypass it. */
export const BULK_BATCH_CAP = 5000;

/** Reason bound for anything the harness derives from a thrown `Error` — keeps a runaway or
 *  unexpectedly verbose error message from ballooning the audit/CSV artifact (Review Findings). */
const MAX_REASON_LENGTH = 512;

function evaluationEquals(a: ItemEvaluation, b: ItemEvaluation): boolean {
  if (a.outcome !== b.outcome) return false;
  if (a.outcome === 'would_succeed') return true;
  return (b as { reason: string }).reason === (a as { reason: string }).reason;
}

function reasonOf(evaluation: ItemEvaluation): string | undefined {
  return evaluation.outcome === 'would_succeed' ? undefined : evaluation.reason;
}

function truncate(message: string, max: number): string {
  return message.length > max ? `${message.slice(0, max - 1)}…` : message;
}

function messageOf(err: unknown): string {
  return truncate(err instanceof Error ? err.message : String(err), MAX_REASON_LENGTH);
}

/**
 * Resolve the item's identity for CSV/audit/divergence-keying (Review Findings, Story 10.6):
 * `op.itemId(item)` when the operation provides it, else the RBAC scope locator's value — with an
 * INDEX-qualified fallback (never a bare constant) so items that share a scope node or otherwise
 * resolve to no value never collide on the same `itemRef`.
 */
function resolveItemRef<TItem, TContext>(
  op: BulkOperation<TItem, TContext>,
  item: TItem,
  locator: TargetLocator,
  index: number,
): string {
  const raw = op.itemId ? op.itemId(item) : locator.value;
  return raw && raw.length > 0 ? raw : `<global-${String(index)}>`;
}

/**
 * Project one item + its outcome into a CSV row via `op.csvRow`. `csvRow` is operation-supplied
 * and runs AFTER the per-item loop (after any `apply` + audit side effects for the batch have
 * already committed) — a throw here must never lose the already-computed `BulkResult`, so it is
 * caught and replaced with a fallback row instead of propagating (Review Findings).
 */
function buildCsvRow<TItem, TContext>(
  op: BulkOperation<TItem, TContext>,
  item: TItem,
  result: BulkItemResult,
): Record<string, string> {
  try {
    return op.csvRow(item, result);
  } catch (err) {
    return {
      item_ref: result.itemRef,
      status: result.status,
      error: `csvRow_failed: ${messageOf(err)}`,
    };
  }
}

/**
 * Run a registered bulk operation against `targetSet` in dry-run (preview) or execute mode
 * (AC1). Throws `UnknownBulkOperationError` for an unregistered `operationType`,
 * `BulkBatchCapExceededError` when `targetSet.length` exceeds the cap, and
 * `BulkAuditItemRequiredError` when `dryRun: false` and no `auditItem` seam was supplied — all
 * BEFORE any item is touched (AC5).
 */
export async function bulkExecute<TItem, TContext>(
  registry: BulkOperationRegistry,
  operationType: string,
  targetSet: readonly TItem[],
  actorContext: BulkActorContext,
  ctx: TContext,
  options: BulkExecuteOptions,
): Promise<BulkResult> {
  const op = registry.get<TItem, TContext>(operationType);
  if (!op) {
    throw new UnknownBulkOperationError(operationType);
  }

  const cap = options.cap ?? BULK_BATCH_CAP;
  if (targetSet.length > cap) {
    throw new BulkBatchCapExceededError(cap, targetSet.length);
  }

  const dryRun = options.dryRun;
  if (!dryRun && !options.auditItem) {
    throw new BulkAuditItemRequiredError();
  }

  const batchId = options.batchId ?? randomUUID();
  const auditItem = options.auditItem;

  const counts: BulkCounts = {
    total: targetSet.length,
    wouldSucceed: 0,
    wouldFail: 0,
    skipped: 0,
    succeeded: 0,
    failed: 0,
  };
  const items: BulkItemResult[] = [];
  const itemsWithSource: { item: TItem; result: BulkItemResult }[] = [];
  const divergences: BulkDivergence[] = [];

  let index = 0;
  for (const item of targetSet) {
    const itemIndex = index;
    index += 1;

    let itemRef: string;
    let evaluation: ItemEvaluation;

    // (1)+(2) Locator + scope check + the SHARED evaluator — never branches on dryRun (AC7
    // parity). Operation-supplied code (`targetLocatorOf`/`evaluate`) is isolated here so a throw
    // from either never aborts the rest of the batch — it surfaces as a would_fail item instead,
    // the same outcome shape `apply`'s own catch below already produces for a thrown mutation.
    try {
      const locator = op.targetLocatorOf(item);
      itemRef = resolveItemRef(op, item, locator, itemIndex);

      const scopeResult = checkPermission({
        actorId: actorContext.actorId,
        grants: actorContext.grants,
        key: op.permissionKey,
        resource: {
          dimension: locator.dimension,
          value: locator.value,
          pariwarId: actorContext.pariwarId,
        },
      });

      // An out-of-scope item is recorded as skipped WITHOUT calling op.evaluate (it was never a
      // candidate for action).
      evaluation = scopeResult.ok
        ? op.evaluate(item, ctx)
        : { outcome: 'skipped', reason: 'out_of_scope' };
    } catch (err) {
      itemRef = `<item-${String(itemIndex)}-evaluation-error>`;
      evaluation = { outcome: 'would_fail', reason: `evaluation_error: ${messageOf(err)}` };
    }

    let status: BulkItemStatus;
    let reason: string | undefined;

    if (dryRun) {
      status = evaluation.outcome;
      reason = reasonOf(evaluation);
    } else if (evaluation.outcome === 'skipped') {
      status = 'skipped';
      reason = evaluation.reason;
    } else if (evaluation.outcome === 'would_fail') {
      // Predicted to fail — apply is never attempted for it (only would_succeed items are).
      status = 'failed';
      reason = evaluation.reason;
    } else {
      // (3) execute + would_succeed: attempt apply. A thrown apply is caught and recorded as
      // failed — it never rolls back the rest of the batch (AC6).
      try {
        await op.apply(item, ctx);
        status = 'succeeded';
      } catch (err) {
        status = 'failed';
        reason = messageOf(err);
      }
    }

    const result: BulkItemResult = { itemRef, status, reason, evaluation };
    items.push(result);
    itemsWithSource.push({ item, result });

    if (evaluation.outcome === 'would_succeed') counts.wouldSucceed += 1;
    else if (evaluation.outcome === 'would_fail') counts.wouldFail += 1;
    else counts.skipped += 1;
    if (status === 'succeeded') counts.succeeded += 1;
    if (status === 'failed') counts.failed += 1;

    // Divergence surfacing (AC7, execute only): diff this item's evaluation against the preview's
    // prediction — the ONLY sanctioned preview↔execute difference (a concurrent state change).
    if (!dryRun && options.expectedOutcomes) {
      const expected = options.expectedOutcomes[itemRef];
      if (expected && !evaluationEquals(expected, evaluation)) {
        divergences.push({
          itemRef,
          expected,
          actual: evaluation,
          reason: 'concurrent state change between preview and execute',
        });
      }
    }

    // (4) Audit — execute only, one line per processed item, shared batch_id (AC4). `auditItem`
    // is guaranteed defined here (the upfront guard above rejects `dryRun: false` without one).
    if (!dryRun && auditItem) {
      let payloadHash: string;
      try {
        payloadHash = createHash('sha256').update(canonicalJsonStringify(item), 'utf8').digest('hex');
      } catch {
        // The item itself isn't canonical-JSON-safe (e.g. a nested Date/BigInt/undefined field) —
        // fall back to hashing the outcome tuple rather than letting a hashing technicality abort
        // the batch after this item's `apply` (and possibly prior items' audit lines) already ran.
        payloadHash = createHash('sha256')
          .update(canonicalJsonStringify({ itemRef, status, reason: reason ?? null }), 'utf8')
          .digest('hex');
      }
      await auditItem({
        pariwarId: actorContext.pariwarId,
        actorId: actorContext.actorId,
        actorRole: actorContext.actorRole,
        action: op.auditAction,
        resourceLocator: itemRef,
        requestPayloadHash: payloadHash,
        responseStatus: status === 'succeeded' ? 200 : status === 'skipped' ? 403 : 422,
        traceId: batchId,
      });
    }
  }

  const previewCsv = dryRun
    ? toCsv(itemsWithSource.map(({ item, result }) => buildCsvRow(op, item, result)))
    : undefined;
  const errorCsv = !dryRun
    ? toCsv(
        itemsWithSource
          .filter(({ result }) => result.status !== 'succeeded')
          .map(({ item, result }) => buildCsvRow(op, item, result)),
      )
    : undefined;

  return {
    batchId,
    mode: dryRun ? 'dry_run' : 'execute',
    counts,
    items,
    previewCsv,
    errorCsv,
    divergences,
  };
}
