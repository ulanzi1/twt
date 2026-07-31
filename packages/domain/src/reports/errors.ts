// Reports library — typed errors (Story 10.7, Task 2).
//
// Fail-closed signals: an unknown reportType or a duplicate template registration must never let the
// harness produce a silent no-op. The app boundary maps them to HTTP status (the bulk-operations
// UnknownBulkOperationError → 400/404 precedent); the harness itself carries NO HTTP.

/**
 * Thrown by `assembleReport` / `registry.get` when `reportType` has no registered `ReportTemplate`.
 * Fail-closed: an unrecognized report type never silently no-ops (AC1).
 */
export class UnknownReportTypeError extends Error {
  public readonly name = 'UnknownReportTypeError';
  public constructor(public readonly reportType: string) {
    super(
      `[reports] unknown reportType '${reportType}' — no ReportTemplate is registered for it ` +
        '(the report library seeds its v1 templates; a new report type must register first)',
    );
  }
}

/**
 * Thrown by `ReportRegistry.register` when `reportType` is already registered on that registry
 * instance. A silent overwrite of one template by another sharing (or colliding on) the same
 * `reportType` must fail loudly (the bulk-operations DuplicateBulkOperationError precedent).
 */
export class DuplicateReportTemplateError extends Error {
  public readonly name = 'DuplicateReportTemplateError';
  public constructor(public readonly reportType: string) {
    super(
      `[reports] reportType '${reportType}' is already registered — each reportType must be unique ` +
        'per registry instance; registering a second template under the same type would silently ' +
        'overwrite the first',
    );
  }
}
