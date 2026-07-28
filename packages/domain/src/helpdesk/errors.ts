// Helpdesk domain error types — Story 10.1.
//
// Typed errors the routing resolver + the versioned registry raise. The app boundary maps them
// to HTTP status (the niyamavali `ClauseIdConflictError` → 409 seam precedent); the domain fns
// themselves carry NO HTTP.

/**
 * Thrown when a routing policy document has no rule that matches the input AND no `other`/
 * `sub_category:null` catch-all to fall through to — a malformed policy (a well-formed policy
 * always ends with a catch-all so every category resolves). Carries the offending category.
 */
export class RoutingUnresolvedError extends Error {
  public readonly name = 'RoutingUnresolvedError';
  public constructor(
    public readonly category: string,
    public readonly subCategory: string | null,
  ) {
    super(
      `no routing rule matched category '${category}'` +
        (subCategory ? ` / sub_category '${subCategory}'` : '') +
        ' and the policy has no `other` catch-all — the policy document is malformed',
    );
  }
}

/**
 * Thrown when a matched rule targets a GEO scope dimension (`state`/`district`/`block`) but the
 * member-scope context supplies no value for that dimension — the resolver refuses to emit a
 * null-value geo scope (which would route a ticket to "everyone in the dimension"). The v1 default
 * policy is pariwar-dimension throughout, so it never triggers this; a Pariwar that adds a
 * geo-dimension override must ensure the subject's geo is resolved.
 */
export class RoutingScopeUnresolvedError extends Error {
  public readonly name = 'RoutingScopeUnresolvedError';
  public constructor(
    public readonly dimension: string,
    public readonly category: string,
  ) {
    super(
      `routing rule for category '${category}' targets scope dimension '${dimension}', but the ` +
        `member-scope context supplies no '${dimension}' value — cannot emit a null-value geo scope`,
    );
  }
}

/**
 * Thrown when a `(pariwar_id, version)` unique-index race lands on the write — a CONCURRENT
 * PUBLISH, not necessarily a duplicate submission of the same content: two different override
 * writes can independently compute the same stale `nextVersion` from a read a moment apart. The
 * loser should re-read the Pariwar's latest version and retry, not assume its content already
 * exists. The 409 seam (the niyamavali `ClauseIdConflictError` precedent). Carries the Pariwar +
 * the version number that raced.
 */
export class RoutingPolicyVersionConflictError extends Error {
  public readonly name = 'RoutingPolicyVersionConflictError';
  public constructor(
    public readonly pariwarId: string,
    public readonly version: number,
  ) {
    super(
      `routing-policy version ${String(version)} for pariwar ${pariwarId} conflicts with a ` +
        `concurrent publish — re-read the Pariwar's latest version and retry (this does not mean ` +
        `your submitted content already exists)`,
    );
  }
}

/**
 * Thrown by {@link import('./registry.js').createRoutingPolicyVersion} when a rules document fails
 * shape validation — an invalid category/scope-dimension, a non-positive SLA budget, or a missing
 * `other`/`sub_category:null` catch-all. Fail LOUD at write time rather than accepting a malformed
 * document that only surfaces as a generic error against a real member's ticket creation later.
 * Carries every violation found (not just the first) so the caller can fix them all at once.
 */
export class RoutingPolicyDocumentInvalidError extends Error {
  public readonly name = 'RoutingPolicyDocumentInvalidError';
  public constructor(public readonly reasons: readonly string[]) {
    super(`routing-policy document is malformed: ${reasons.join('; ')}`);
  }
}

/**
 * Thrown when a routing-policy rule targets the `self` scope dimension. `self` requires
 * `member_scope_context.subject_member_id`, which is ALWAYS null for a `helpline_call`-created
 * ticket (AC1's subject XOR) — and every v1 category is reachable via either `created_via` (no
 * category is member-app-exclusive, see `@twt/contracts/helpdesk/create-ticket.ts`). A `self`-
 * dimension rule would therefore hard-fail ticket creation for any helpline-filed ticket that
 * matches it. Rejected at registry-write time rather than left to fail at ticket-creation time.
 */
export class RoutingPolicySelfScopeUnsupportedError extends Error {
  public readonly name = 'RoutingPolicySelfScopeUnsupportedError';
  public constructor(public readonly category: string) {
    super(
      `routing rule for category '${category}' targets the 'self' scope dimension, which is ` +
        `unresolvable for a helpline_call-created ticket (subject_member_id is always null) — every ` +
        `v1 category is reachable via helpline_call, so 'self' is not a supported target dimension`,
    );
  }
}

/**
 * Thrown when a new routing-policy version's `effectiveAt` would precede the Pariwar's latest
 * existing version's `effectiveAt`. Publishing out of temporal order would let the append-only
 * `supersededByVersion` forward-pointer chain (keyed on creation/version order) diverge from what
 * `routingPolicyVersionInForce`'s `effectiveAt`-based resolution actually picks — corrupting the
 * chain's meaning as an audit trail. Rejecting out-of-order publishes keeps the two orderings
 * (creation order and effective-date order) coincident by construction.
 */
export class RoutingPolicyEffectiveAtOutOfOrderError extends Error {
  public readonly name = 'RoutingPolicyEffectiveAtOutOfOrderError';
  public constructor(
    public readonly pariwarId: string,
    public readonly attemptedEffectiveAt: Date,
    public readonly latestEffectiveAt: Date,
  ) {
    super(
      `routing-policy publish for pariwar ${pariwarId} has effectiveAt ` +
        `${attemptedEffectiveAt.toISOString()}, which precedes the Pariwar's latest existing version's ` +
        `effectiveAt ${latestEffectiveAt.toISOString()} — publishes must be in non-decreasing ` +
        `effective-date order`,
    );
  }
}

interface PgErrorLike {
  code?: string;
  message: string;
}

/**
 * Unwrap drizzle-orm's wrapped pg error (it nests the original on `.cause`) and read the
 * SQLSTATE `.code`. Mirrors `extractPgError` in `pool/errors.ts` / `claim/errors.ts` (kept local —
 * domain cannot import @twt/events).
 */
function extractPgError(err: unknown): PgErrorLike | null {
  if (!(err instanceof Error)) return null;
  const causeRaw = (err as { cause?: unknown }).cause;
  const candidate = causeRaw !== undefined && causeRaw !== null ? causeRaw : err;
  if (typeof candidate !== 'object' || candidate === null) return null;
  const obj = candidate as { code?: unknown; message?: unknown };
  if (typeof obj.message !== 'string') return null;
  return {
    code: typeof obj.code === 'string' ? obj.code : undefined,
    message: obj.message,
  };
}

/** The events_log unique-index name for `(stream_id, event_version)`. Keep IN SYNC with
 *  `schema/events_log.ts` (the same constraint `pool/errors.ts` guards). */
const STREAM_VERSION_CONSTRAINT = 'events_log_stream_id_event_version_uq';

/**
 * Optimistic-concurrency conflict on a ticket's `events_log` stream (the projector's genesis
 * append racing another append at the same `event_version`) — the HELPDESK-namespaced twin of
 * `PoolStreamConcurrencyError`/`AlertStreamConcurrencyError`. Every event-derived-state primitive
 * owns its own error type rather than reusing a sibling domain's (the established member/pool/
 * claim convention); a `pool.` error surfacing from a ticket-genesis race would mislabel the
 * failure for any caller that catches by class/message.
 */
export class HelpdeskStreamConcurrencyError extends Error {
  public readonly name = 'HelpdeskStreamConcurrencyError';
  public constructor(
    public readonly ticketId: string,
    public readonly attemptedVersion: number,
  ) {
    super(`helpdesk ticket stream ${ticketId} concurrency conflict appending event_version ${attemptedVersion}`);
  }
}

/** True iff `err` is the events_log `(stream_id, event_version)` unique-violation. */
export function isHelpdeskStreamVersionConflict(err: unknown): boolean {
  const pgErr = extractPgError(err);
  if (pgErr === null || pgErr.code !== '23505') return false;
  const constraint = (() => {
    if (!(err instanceof Error)) return undefined;
    const cause = (err as { cause?: unknown }).cause;
    const candidate = cause !== undefined && cause !== null ? cause : err;
    if (typeof candidate !== 'object' || candidate === null) return undefined;
    const c = (candidate as { constraint?: unknown }).constraint;
    return typeof c === 'string' ? c : undefined;
  })();
  return constraint === STREAM_VERSION_CONSTRAINT;
}

/**
 * Thrown by `projectTicketGenesis`'s pre-check when a ticket's `events_log` stream is non-empty
 * before the genesis append — a caller re-used a `ticket_id` (a bug — `ticket_id` is a fresh
 * random UUID) or a race the `(stream_id, event_version)` unique index would also catch. A typed
 * signal (not a bare `Error`) so a caller can distinguish this specific corruption condition from
 * an arbitrary internal error.
 */
export class HelpdeskGenesisAlreadyExistsError extends Error {
  public readonly name = 'HelpdeskGenesisAlreadyExistsError';
  public constructor(
    public readonly ticketId: string,
    public readonly existingEventCount: number,
  ) {
    super(
      `[projectTicketGenesis] ticket stream ${ticketId} already has ${String(existingEventCount)} ` +
        `event(s) — genesis is first-and-only`,
    );
  }
}

/**
 * Thrown when the `helpdesk_tickets` row insert itself fails (e.g. the `helpdesk_tickets_subject_xor`
 * CHECK, 23514, or a PK collision) — a typed wrapper so this failure mode is distinguishable from
 * an arbitrary internal error, mirroring how the sibling `events_log` insert a few lines above it
 * is already mapped to a typed error.
 */
export class HelpdeskTicketPersistError extends Error {
  public readonly name = 'HelpdeskTicketPersistError';
  public constructor(
    public readonly ticketId: string,
    public readonly cause: unknown,
  ) {
    super(
      `[projectTicketGenesis] failed to persist ticket row ${ticketId}: ` +
        `${cause instanceof Error ? cause.message : String(cause)}`,
    );
  }
}
