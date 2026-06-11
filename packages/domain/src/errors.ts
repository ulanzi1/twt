// Domain-level error types for the pariwar-scope session-variable contract.
//
// @twt/domain owns these typed errors; transport-level mapping to an HTTP 500
// (or 4xx where appropriate) lives at apps/api per architecture §3.2 line
// 1819-1830 + Story 1.4's _common/errors.ts ErrorResponse envelope. Keeping
// the error types in @twt/domain lets every consumer (apps/api middleware at
// Story 1.9, apps/jobs at Story 1.12, integration tests) catch the same class.

/** Thrown when application code reads/receives a pariwar_id that is not a valid UUID. */
export class InvalidPariwarScopeError extends Error {
  public readonly name = 'InvalidPariwarScopeError';
  public constructor(public readonly received: string) {
    super(`Invalid pariwar_id scope value: ${JSON.stringify(received)}`);
  }
}

/** Thrown when assertPariwarScopeSet() finds the `app.pariwar_id` session variable unset. */
export class PariwarScopeMissingError extends Error {
  public readonly name = 'PariwarScopeMissingError';
  public constructor() {
    super(
      'app.pariwar_id session variable is unset — the scope-resolution middleware ' +
        'did not run, or this connection was opened outside the named ' +
        'cross-tenant operations module (packages/domain/src/cross-tenant/).',
    );
  }
}
