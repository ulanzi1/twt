// Geo-tree domain error types — Story 1.18.
//
// Typed errors the versioned registry raises. The app boundary maps them to HTTP status (the
// niyamavali `ClauseIdConflictError` → 409 seam precedent, via its `RoutingPolicyVersionConflictError`
// twin); the domain functions themselves carry NO HTTP.

/**
 * Thrown when a `(pariwar_id, version)` unique-index race lands on the write — a CONCURRENT
 * PUBLISH, not necessarily a duplicate submission of the same content: two different tree writes
 * can independently compute the same stale `nextVersion` from a read a moment apart. The loser
 * should re-read the Pariwar's latest version and retry, not assume its content already exists.
 * The 409 seam. Carries the Pariwar + the version number that raced.
 *
 * Deliberately shaped exactly like `RoutingPolicyVersionConflictError` (`helpdesk/errors.ts`) —
 * same posture, same registry idiom, so an app-boundary mapper handles both identically.
 */
export class GeoTreeVersionConflictError extends Error {
  public readonly name = 'GeoTreeVersionConflictError';
  public constructor(
    public readonly pariwarId: string,
    public readonly version: number,
  ) {
    super(
      `geo-tree version ${String(version)} already exists for pariwar '${pariwarId}' — a concurrent ` +
        'publish won the race. Re-read the latest version and retry; do NOT assume the content was ' +
        'already written (two different documents can compute the same stale next version).',
    );
  }
}

/**
 * Thrown when a caller-authored tree document fails validation BEFORE it is persisted. Carries
 * EVERY reason, not just the first — a publisher fixing a tree wants the whole list, and a document
 * with three broken edges should not require three round-trips to discover that.
 *
 * ⛔ Validation is structural only. It rejects cycles, rank inversions, dangling parents, duplicate
 * nodes and malformed values. It CANNOT reject a factually wrong edge: `Patna ∈ Kerala` is
 * structurally valid and will be accepted. That risk is accepted and recorded in ADR-0038 — the
 * mitigation is that publication is an explicit, versioned, append-only act, not an inferred one.
 */
export class GeoTreeDocumentInvalidError extends Error {
  public readonly name = 'GeoTreeDocumentInvalidError';
  public constructor(public readonly reasons: readonly string[]) {
    super(`geo-tree document is invalid: ${reasons.join('; ')}`);
  }
}

/**
 * Thrown when a publish's `effectiveAt` precedes the Pariwar's latest existing version — which
 * would leave the creation-order `superseded_by_version` chain inconsistent with `effective_at`-based
 * in-force resolution. The `RoutingPolicyEffectiveAtOutOfOrderError` twin.
 */
export class GeoTreeEffectiveAtOutOfOrderError extends Error {
  public readonly name = 'GeoTreeEffectiveAtOutOfOrderError';
  public constructor(
    public readonly pariwarId: string,
    public readonly attempted: Date,
    public readonly latestExisting: Date,
  ) {
    super(
      `geo-tree effectiveAt ${attempted.toISOString()} precedes the latest existing version's ` +
        `${latestExisting.toISOString()} for pariwar '${pariwarId}' — publishing it would make the ` +
        'supersession chain disagree with effective_at-based in-force resolution',
    );
  }
}
