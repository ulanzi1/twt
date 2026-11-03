// Attribution-code typed domain errors — Story 13.2 (Task 1.2).
//
// @twt/domain owns these typed errors; the HTTP mapping lands at the CONSUMER route (Story 13.1's "Add Field Worker",
// 13.3's "my code", 13.8's signup wiring). ⛔ A consumer names `attributionCode.*` — the reach fence forbids it (AT8 v2
// ii): the API door `apps/api/src/modules/field-worker/attribution-code-access.ts` re-exports these six classes BY NAME,
// and a caller `instanceof`s them from there. The unset / malformed scope errors are REUSED from `../errors.js`
// (`PariwarScopeMissingError`, `InvalidPariwarScopeError`) — ⛔ a copy here.

/** A code that is not exactly six ASCII digits, or is on the deny-list (AT5). Thrown BEFORE any statement is sent. */
export class InvalidAttributionCodeError extends Error {
  public readonly name = 'InvalidAttributionCodeError';
  public readonly code = 'attribution_code.invalid';
  public constructor(public readonly reason: 'format' | 'denylisted') {
    super(
      reason === 'format'
        ? 'an attribution code is exactly six ASCII digits'
        : 'the attribution code is on the guessable-code deny-list',
    );
  }
}

/**
 * The connection's `app.pariwar_id` is not the Pariwar the call names (AT8 v2 i), or the API door's `ScopeTx` is scoped to a
 * Pariwar other than the request's authenticated one (AT8 v2 iii). Either way the lookup would have run under the wrong
 * Pariwar — it is refused instead.
 */
export class AttributionPariwarScopeMismatchError extends Error {
  public readonly name = 'AttributionPariwarScopeMismatchError';
  public readonly code = 'attribution_code.pariwar_scope_mismatch';
  public constructor(
    public readonly expectedPariwarId: string,
    public readonly scopedPariwarId: string,
  ) {
    super('the transaction is scoped to a different Pariwar than the attribution-code call names');
  }
}

/** The field worker already holds a code — one per worker, ever (I2). ⛔ Retried. */
export class FieldWorkerAlreadyHasAttributionCodeError extends Error {
  public readonly name = 'FieldWorkerAlreadyHasAttributionCodeError';
  public readonly code = 'attribution_code.field_worker_already_has_code';
  public constructor(
    public readonly pariwarId: string,
    public readonly fieldWorkerId: string,
  ) {
    super('this field worker already holds an attribution code');
  }
}

/**
 * Every draw clashed (AT6). The caller writes the durable trustee-review flag in a SEPARATE committed transaction (the API
 * door's `flagAllocationExhaustedForRequest` — AT7, C1) and rethrows.
 */
export class AttributionCodeAllocationExhaustedError extends Error {
  public readonly name = 'AttributionCodeAllocationExhaustedError';
  public readonly code = 'attribution_code.allocation_exhausted';
  public constructor(
    public readonly pariwarId: string,
    public readonly attempts: number,
  ) {
    super(`no free attribution code was found in ${String(attempts)} attempts`);
  }
}

/**
 * The handle is not ONE checked-out connection inside a transaction block (AT8 v2 i): a `pg.Pool` (each statement may run on a
 * different connection), or a client with ⛔ `BEGIN` (the SAVEPOINT probe raised `25P01`).
 */
export class AttributionCodeRequiresTransactionError extends Error {
  public readonly name = 'AttributionCodeRequiresTransactionError';
  public readonly code = 'attribution_code.requires_transaction';
  public constructor(public readonly reason: 'not_a_client' | 'no_transaction') {
    super(
      reason === 'not_a_client'
        ? 'attribution-code functions take one checked-out pg client, never a pool'
        : 'attribution-code functions run inside a transaction block',
    );
  }
}

/**
 * `resolveAttribution`'s `{ captureId }` names no `member_attribution` row in the Pariwar, or a row whose
 * `attribution_source` is not the code being resolved (AT4 (c)).
 */
export class AttributionCaptureMismatchError extends Error {
  public readonly name = 'AttributionCaptureMismatchError';
  public readonly code = 'attribution_code.capture_mismatch';
  public constructor(
    public readonly pariwarId: string,
    public readonly captureId: string,
  ) {
    super('the named capture is not a capture of this code in this Pariwar');
  }
}
