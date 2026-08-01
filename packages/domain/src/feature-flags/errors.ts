// Feature-flag domain error types — Story 10.8.
//
// Typed errors the versioned registry + the capability-bar loader raise. The app boundary maps them
// to HTTP status (the `RoutingPolicyVersionConflictError` → 409 seam precedent); the domain fns
// themselves carry NO HTTP.
//
// ⚠ NOTE WHAT IS ABSENT: there is no "evaluation error". The pure evaluator NEVER throws into the
// caller's request path — an unknown dimension/op resolves to the flag's `fallback_default` with a
// typed REASON on the decision (AC2). A flag evaluation sits on the hot path of real member
// requests; a throwing evaluator would let a malformed cohort rule take down the surface it was
// supposed to gate. Fail closed, keep serving.

/**
 * Thrown when a `(pariwar_id, flag_key, version)` unique-constraint race lands on the write — a
 * CONCURRENT FLIP, not necessarily a duplicate submission: two admins flipping the same flag can
 * independently compute the same stale `nextVersion` from reads a moment apart. The loser should
 * re-read the flag's latest version and retry, NOT assume its change already landed (they may have
 * been flipping to different states). The 409 seam.
 */
export class FlagVersionConflictError extends Error {
  public readonly name = 'FlagVersionConflictError';
  public constructor(
    public readonly flagKey: string,
    public readonly pariwarId: string | null,
    public readonly version: number,
  ) {
    super(
      `feature flag '${flagKey}' version ${String(version)} already exists for ` +
        (pariwarId === null ? 'the GLOBAL scope' : `pariwar ${pariwarId}`) +
        ' — a concurrent flip won the race; re-read the latest version and retry',
    );
  }
}

/**
 * Thrown when a caller-supplied row `id` collides with an EXISTING row's primary key — distinct from
 * {@link FlagVersionConflictError}, which is a `(pariwar_id, flag_key, version)` race. Separating the
 * two matters because the recovery differs and the conflict error's advice actively misleads here:
 * "re-read the latest version and retry" re-sends the same `id` and reproduces the identical failure
 * forever. A duplicate `id` means the caller replayed a request whose row already landed.
 */
export class FlagVersionDuplicateIdError extends Error {
  public readonly name = 'FlagVersionDuplicateIdError';
  public constructor(
    public readonly flagKey: string,
    public readonly id: string,
  ) {
    super(
      `feature flag '${flagKey}': a version row with id ${id} already exists — this is an ` +
        'idempotency replay of a write that already succeeded, not a concurrent-flip race; ' +
        're-read the existing row rather than retrying with the same id',
    );
  }
}

/**
 * Thrown when a flip asks for a state transition the AC7 ladder does not permit. The staged-rollout
 * discipline (`off → canary → rollout → full`, rollback always available) is only real if it is
 * ENFORCED — without this, `off → full` in one flip skips the canary stage the whole mechanism exists
 * to provide. Identity transitions are always legal: re-publishing the same state is how an operator
 * edits a cohort.
 */
export class FlagStateTransitionError extends Error {
  public readonly name = 'FlagStateTransitionError';
  public constructor(
    public readonly flagKey: string,
    public readonly from: string,
    public readonly to: string,
    public readonly allowed: readonly string[],
  ) {
    super(
      `feature flag '${flagKey}': '${from}' → '${to}' is not a legal state transition — ` +
        `from '${from}' the permitted next states are ${allowed.map((s) => `'${s}'`).join(', ')}`,
    );
  }
}

/**
 * Thrown when `governance_boundary.yaml` cannot be READ at all (missing, unreadable, wrong deploy
 * layout) — distinct from {@link CapabilityBarInvalidError}, which means the file was read and its
 * CONTENT failed validation. Separated because the remediation is completely different: this one is a
 * packaging/deploy fault, not a governance-content fault, and the app boundary should not report a
 * missing artifact as an invalid one. Without it, the raw `ENOENT` escapes the write path untyped.
 */
export class CapabilityBarUnavailableError extends Error {
  public readonly name = 'CapabilityBarUnavailableError';
  public constructor(
    public readonly path: string,
    public readonly cause: unknown,
  ) {
    super(
      `governance_boundary.yaml could not be read at ${path} — the capability bar is a RUNTIME ` +
        'dependency of the flag write path, so a deploy that ships the domain package without the ' +
        'repo-root governance artifact cannot flip any flag',
    );
  }
}

/**
 * Thrown when a caller-supplied flag version document is malformed — BEFORE it is persisted. The
 * routing-policy `RoutingPolicyDocumentInvalidError` posture: validate at write time so a bad
 * cohort rule surfaces to the admin who authored it, not to a member whose request it silently
 * mis-gated. Carries every reason at once (not just the first) so one round-trip fixes the form.
 */
export class FlagVersionInvalidError extends Error {
  public readonly name = 'FlagVersionInvalidError';
  public constructor(public readonly reasons: readonly string[]) {
    super(`feature flag version document is invalid: ${reasons.join('; ')}`);
  }
}

/**
 * Thrown when a flip's `effectiveFrom` precedes the flag's latest existing version — which would
 * make the supersession chain inconsistent with effective-window resolution (the newest row would
 * not be the one in force). The `RoutingPolicyEffectiveAtOutOfOrderError` twin.
 */
export class FlagEffectiveFromOutOfOrderError extends Error {
  public readonly name = 'FlagEffectiveFromOutOfOrderError';
  public constructor(
    public readonly flagKey: string,
    public readonly attempted: Date,
    public readonly latest: Date,
  ) {
    super(
      `feature flag '${flagKey}': effectiveFrom ${attempted.toISOString()} precedes the flag's ` +
        `latest version's effectiveFrom ${latest.toISOString()} — versions must be published forward in time`,
    );
  }
}

/**
 * Thrown when a flag key is NOT declared in `governance_boundary.yaml`'s capability bar (AC5 leg a).
 * The bar is an allowlist of flag-toggleable BEHAVIOURS: a key nobody attested is, by construction,
 * a behaviour outside the governance boundary. The CI gate catches this at build time; this error is
 * the runtime backstop for the write path, so the bar cannot be bypassed by adding a flag at runtime.
 */
export class FlagKeyNotAllowlistedError extends Error {
  public readonly name = 'FlagKeyNotAllowlistedError';
  public constructor(public readonly flagKey: string) {
    super(
      `feature flag '${flagKey}' is not declared in governance_boundary.yaml — a flag-toggleable ` +
        'behaviour must be admitted to the capability bar first (a trustee-attested PR with a ' +
        'rationale + ADR reference, and the `count` bumped in the same commit)',
    );
  }
}

/**
 * Thrown when `governance_boundary.yaml` cannot be parsed or fails its own internal consistency
 * checks (unknown `kind`, missing `rationale`/`adr`, a `count` that disagrees with the entry total,
 * or an entry naming an architecturally-FROZEN behaviour). LOUD by design — the `parseFr100Config`
 * posture: a governance artifact that silently degrades to "no entries" is worse than absent,
 * because every conformance check would then pass vacuously.
 */
export class CapabilityBarInvalidError extends Error {
  public readonly name = 'CapabilityBarInvalidError';
  public constructor(public readonly reasons: readonly string[]) {
    super(`governance_boundary.yaml is invalid: ${reasons.join('; ')}`);
  }
}
