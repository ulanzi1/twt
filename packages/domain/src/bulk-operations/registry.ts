// Bulk-operations registry — Story 10.6 (AC1).
//
// Keyed by `operationType`, seeded EMPTY (the operations are surface-owned — 10.10/10.12/the
// notification family register into it in their own stories; the 10.1 routing-policy registry is
// the "registry with a code-DATA default" precedent, but here the default set is intentionally
// nothing, since a bulk operation's real behavior belongs to its consuming surface, not this
// primitive). `bulkExecute` looks operations up here and throws `UnknownBulkOperationError` on a
// miss — it never special-cases a specific operationType (Load-Bearing Decision 5).

import { DuplicateBulkOperationError } from './errors.js';
import type { BulkOperation } from './types.js';

export interface BulkOperationRegistry {
  /** Throws `DuplicateBulkOperationError` if `op.operationType` is already registered on this
   *  instance (Review Findings) — a silent overwrite would let a second story's operation
   *  displace a first's with no error. */
  register<TItem, TContext>(op: BulkOperation<TItem, TContext>): void;
  get<TItem = unknown, TContext = unknown>(
    operationType: string,
  ): BulkOperation<TItem, TContext> | undefined;
}

/** A fresh, empty registry. Each caller (a consuming surface's composition root) owns its own
 *  instance — there is no shared process-wide singleton, matching the routing-policy registry's
 *  per-Pariwar-independence posture (here, per-composition-root independence). */
export function createBulkOperationRegistry(): BulkOperationRegistry {
  const operations = new Map<string, BulkOperation<unknown, unknown>>();

  return {
    register<TItem, TContext>(op: BulkOperation<TItem, TContext>): void {
      if (operations.has(op.operationType)) {
        throw new DuplicateBulkOperationError(op.operationType);
      }
      operations.set(op.operationType, op as unknown as BulkOperation<unknown, unknown>);
    },
    get<TItem, TContext>(operationType: string): BulkOperation<TItem, TContext> | undefined {
      return operations.get(operationType) as BulkOperation<TItem, TContext> | undefined;
    },
  };
}
