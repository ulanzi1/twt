// Bulk-operations typed errors — Story 10.6.
//
// All three are fail-closed, before-any-work signals: an unknown operationType, an over-cap
// target set, or a missing audit seam in execute mode must never let bulkExecute touch a single
// item (Load-Bearing Decisions 5/6; Review Findings for the third). The app boundary maps them to
// HTTP status (the niyamavali ClauseIdConflictError → 409 seam precedent); the harness itself
// carries NO HTTP.

/**
 * Thrown by `bulkExecute` when `operationType` has no registered `BulkOperation` (the registry
 * ships seeded EMPTY — Load-Bearing Decision 2/5; real operations register in their own stories).
 * Fail-closed: an unrecognized operation never silently no-ops.
 */
export class UnknownBulkOperationError extends Error {
  public readonly name = 'UnknownBulkOperationError';
  public constructor(public readonly operationType: string) {
    super(
      `[bulkExecute] unknown operationType '${operationType}' — no BulkOperation is registered ` +
        'for it (the registry ships empty; the consuming surface must register its operation first)',
    );
  }
}

/**
 * Thrown by `bulkExecute` when `targetSet.length` exceeds the batch cap (`BULK_BATCH_CAP` or a
 * caller-supplied `options.cap` override) — BEFORE any item is scope-checked, evaluated, applied,
 * or audited, in BOTH dry-run and execute modes (AC5, Load-Bearing Decision 6). The cap lives in
 * the harness so no consuming surface — a route, a job, a future direct caller — can bypass it.
 */
export class BulkBatchCapExceededError extends Error {
  public readonly name = 'BulkBatchCapExceededError';
  public constructor(
    public readonly cap: number,
    public readonly actual: number,
  ) {
    super(
      `[bulkExecute] target set of ${String(actual)} items exceeds the batch cap of ${String(cap)} ` +
        '— split the set by the caller before invoking bulkExecute (no partial execution)',
    );
  }
}

/**
 * Thrown by `bulkExecute` when `options.dryRun` is `false` and no `options.auditItem` seam was
 * supplied — BEFORE any item is touched. A silent no-op default would let execute mode run to
 * completion with zero audit trail, violating AC4 without any error surfaced (Review Findings,
 * Story 10.6). Dry-run mode never audits, so this check does not apply there.
 */
export class BulkAuditItemRequiredError extends Error {
  public readonly name = 'BulkAuditItemRequiredError';
  public constructor() {
    super(
      '[bulkExecute] execute mode (dryRun: false) requires options.auditItem — a real audit ' +
        'writer must be injected (e.g. `(input) => writeAuditEntry(servicePool, input)`) so every ' +
        'executed item gets an audit line (AC4); it is never defaulted to a silent no-op',
    );
  }
}

/**
 * Thrown by `BulkOperationRegistry.register` when `operationType` is already registered on that
 * registry instance. Several future stories (10.10/10.12/the notification family) each register
 * their own operation into what may become a shared registry — a silent overwrite of one
 * operation by another sharing (or colliding on) the same `operationType` string must fail loudly
 * rather than silently discard the first registration (Review Findings, Story 10.6).
 */
export class DuplicateBulkOperationError extends Error {
  public readonly name = 'DuplicateBulkOperationError';
  public constructor(public readonly operationType: string) {
    super(
      `[BulkOperationRegistry] operationType '${operationType}' is already registered — each ` +
        'operationType must be unique per registry instance; registering a second operation under ' +
        'the same type would silently overwrite the first',
    );
  }
}
