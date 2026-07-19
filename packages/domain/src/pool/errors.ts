// Pool lifecycle typed domain errors — Story 7.1 (Task 4; AC5). Twin of
// claim/errors.ts + member/errors.ts.
//
// `PoolStateDirectWriteError` is the application-layer counterpart to the DB
// write-rejection trigger (migration 0071). The trigger RAISEs `ERRCODE = 'P0001'`
// with the message prefix `pools.current_state direct write rejected` when any code
// path other than the projector tries to set/change `pools.current_state`. A BEFORE
// INSERT OR UPDATE trigger that RAISEs aborts its own transaction, so it CANNOT
// durably write the P0 architectural-violation audit line — that is the job of the
// application boundary that CATCHES the trigger error (mirror how @twt/events
// appendEvent catches `23505` → ConcurrencyError).
//
// Surfaced at the @twt/domain top-level barrel (../index.ts) so a future apps/api
// error-mapping middleware imports the class AND the code constant directly — it
// matches on the code constant, not the class instance. Story 7.1 has no live pool-
// mutating route (Story 7.3 spawn saga is first); it provides the typed error + the
// SQLSTATE/message detector so the future boundary maps the trigger rejection → this
// error, emits the P0 audit line, and returns the right HTTP code. Match by PREFIX
// with `.startsWith()` (NOT `.includes()` — the Story 3.1/6.1 review discipline).

import type { ErrorResponseShape } from '../errors.js';

/** Namespaced error code for a rejected direct write to `pools.current_state`. */
export const POOL_STATE_DIRECT_WRITE_CODE = 'pool.state_direct_write_rejected';

/**
 * The trigger's RAISE message prefix. The detector matches on this because the
 * trigger uses the default `RAISE EXCEPTION` SQLSTATE `P0001` (`raise_exception`),
 * which — unlike `23505` (concurrency) or `23xxx` (integrity) — is generic, so the
 * message prefix is the discriminator. Keep IN SYNC with the trigger DDL in
 * migration 0071.
 */
export const POOL_STATE_DIRECT_WRITE_MESSAGE_PREFIX = 'pools.current_state direct write rejected';

/** The SQLSTATE the trigger RAISEs with (default `RAISE EXCEPTION` class). */
export const POOL_STATE_DIRECT_WRITE_SQLSTATE = 'P0001';

/**
 * Thrown by the application boundary when a write to `pools.current_state` is rejected
 * by the DB trigger — i.e. a code path OTHER than the projector attempted to mutate the
 * replay-derived state cache (an architectural violation, AC5). The boundary emits a P0
 * audit line alongside throwing this.
 */
export class PoolStateDirectWriteError extends Error {
  public readonly name = 'PoolStateDirectWriteError';
  public readonly code = POOL_STATE_DIRECT_WRITE_CODE;

  public constructor(public readonly detail: string) {
    super(`${POOL_STATE_DIRECT_WRITE_MESSAGE_PREFIX}: ${detail}`);
  }

  public toErrorResponse(requestId: string): ErrorResponseShape {
    return {
      error: {
        code: this.code,
        message: this.message,
        details: {},
        request_id: requestId,
      },
    };
  }
}

interface PgErrorLike {
  code?: string;
  message: string;
}

/**
 * Unwrap drizzle-orm's wrapped pg error (it nests the original on `.cause`) and read
 * the SQLSTATE `.code` + `.message`. Mirrors `extractPgError` in claim/errors.ts
 * (kept local — domain cannot import @twt/events).
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

/**
 * True iff `err` is the `pools.current_state` write-rejection raised by the DB trigger
 * (SQLSTATE `P0001` + the message prefix). The catching boundary uses this to map a raw
 * DB rejection → `PoolStateDirectWriteError`. Prefix match via `.startsWith()`.
 */
export function isPoolStateDirectWriteError(err: unknown): boolean {
  const pgErr = extractPgError(err);
  return (
    pgErr !== null &&
    pgErr.code === POOL_STATE_DIRECT_WRITE_SQLSTATE &&
    pgErr.message.startsWith(POOL_STATE_DIRECT_WRITE_MESSAGE_PREFIX)
  );
}

// ── Optimistic-concurrency on the pool's event stream (projector) ─────────────
// The projector appends the next event at `head_version + 1`; the events_log unique
// index `(stream_id, event_version)` is the backstop. A concurrent projector landing
// the same version raises `23505` → this typed error (mirror @twt/events
// ConcurrencyError, which domain cannot import). An EXPECTED failure — the caller
// re-reads and retries; NOT surfaced at the top-level barrel (pool namespace only).

/** The events_log unique-index name for `(stream_id, event_version)`. Keep IN SYNC
 * with schema/events_log.ts. */
const STREAM_VERSION_CONSTRAINT = 'events_log_stream_id_event_version_uq';

export class PoolStreamConcurrencyError extends Error {
  public readonly name = 'PoolStreamConcurrencyError';
  public constructor(
    public readonly poolId: string,
    public readonly attemptedVersion: number,
  ) {
    super(`pool stream ${poolId} concurrency conflict appending event_version ${attemptedVersion}`);
  }
}

/** True iff `err` is the events_log `(stream_id, event_version)` unique-violation. */
export function isPoolStreamVersionConflict(err: unknown): boolean {
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

// ── Fixed-amount schedule + emergency-override errors — Story 7.5 (Task 2) ─────
// The typed transport seams for the effective-dated fixed-amount schedule (fixed-amount.ts).
// Each carries a namespaced `code` + `toErrorResponse` so the apps/api error-mapping boundary
// translates it to the right HTTP status without matching on the class instance (the
// PoolStateDirectWriteError precedent above). Homed here (pool/errors.ts) so they ride the pool
// namespace barrel; the module itself lives under pool/ (support-category-token-free, gate-scanned).

/** Base for the fixed-amount typed errors — carries a `code` + a uniform error-response body. */
abstract class PoolFixedAmountError extends Error {
  public abstract readonly code: string;
  public toErrorResponse(requestId: string): ErrorResponseShape {
    return {
      error: {
        code: this.code,
        message: this.message,
        details: {},
        request_id: requestId,
      },
    };
  }
}

export const POOL_FIXED_AMOUNT_NOT_CONFIGURED_CODE = 'pool.fixed_amount_not_configured';

/**
 * No fixed-amount schedule entry is effective at the requested instant — a trustee CONFIG GAP
 * surfaced LOUDLY (the PoolNameListExhaustedError philosophy), never a silent fallback to a magic
 * number. Thrown by `getEffectiveFixedAmount` on the spawn path; a correctly-provisioned Pariwar
 * carries a genesis-seed row (D5) so this never fires in practice.
 */
export class PoolFixedAmountNotConfiguredError extends PoolFixedAmountError {
  public readonly name = 'PoolFixedAmountNotConfiguredError';
  public readonly code = POOL_FIXED_AMOUNT_NOT_CONFIGURED_CODE;
  public constructor(
    public readonly pariwarId: string,
    public readonly asOf: string,
  ) {
    super(
      `no fixed_amount schedule entry effective for pariwar ${pariwarId} at ${asOf} — ` +
        `the Pariwar has no configured contribution amount (a trustee config gap)`,
    );
  }
}

export const POOL_FIXED_AMOUNT_NOTICE_TOO_SHORT_CODE = 'pool.fixed_amount_notice_too_short';

/**
 * A STANDARD change whose `effective_from` violates the 12-month (365-day) notice floor,
 * evaluated against DB-authoritative `now()` (D6 — the hostile-trustee cooling-off control).
 * An emergency override bypasses this floor (its own path, no floor check).
 */
export class PoolFixedAmountNoticeTooShortError extends PoolFixedAmountError {
  public readonly name = 'PoolFixedAmountNoticeTooShortError';
  public readonly code = POOL_FIXED_AMOUNT_NOTICE_TOO_SHORT_CODE;
  public constructor(public readonly effectiveFrom: string) {
    super(
      `standard fixed_amount change requires effective_from >= now() + 365 days ` +
        `(the 12-month notice); got ${effectiveFrom}. Use the emergency override to bypass the notice.`,
    );
  }
}

export const POOL_FIXED_AMOUNT_REASON_REQUIRED_CODE = 'pool.fixed_amount_reason_required';

/** An emergency override with no (or blank) `documented_reason` — the reason is MANDATORY (AC3b). */
export class PoolFixedAmountReasonRequiredError extends PoolFixedAmountError {
  public readonly name = 'PoolFixedAmountReasonRequiredError';
  public readonly code = POOL_FIXED_AMOUNT_REASON_REQUIRED_CODE;
  public constructor() {
    super(
      `emergency fixed_amount override requires a non-empty documented_reason ` +
        `(policy/operational justification — never member-specific)`,
    );
  }
}

export const POOL_FIXED_AMOUNT_ATTESTATION_REQUIRED_CODE = 'pool.fixed_amount_attestation_required';

/** An emergency override with an empty panel roster — a State-Trustee panel attestation is MANDATORY (AC3a). */
export class PoolFixedAmountAttestationRequiredError extends PoolFixedAmountError {
  public readonly name = 'PoolFixedAmountAttestationRequiredError';
  public readonly code = POOL_FIXED_AMOUNT_ATTESTATION_REQUIRED_CODE;
  public constructor() {
    super(`emergency fixed_amount override requires a non-empty State-Trustee panel attestation`);
  }
}

export const POOL_FIXED_AMOUNT_PANEL_TOO_SMALL_CODE = 'pool.fixed_amount_panel_too_small';

/**
 * A non-empty panel roster below the minimum size (review-hardening: a lone-actor "panel" is not a
 * panel — it lets a single admin be their own sole attester). Distinct from
 * {@link PoolFixedAmountAttestationRequiredError} (an EMPTY roster) so the two failure modes are
 * separately diagnosable.
 */
export class PoolFixedAmountPanelTooSmallError extends PoolFixedAmountError {
  public readonly name = 'PoolFixedAmountPanelTooSmallError';
  public readonly code = POOL_FIXED_AMOUNT_PANEL_TOO_SMALL_CODE;
  public constructor(
    public readonly received: number,
    public readonly minimum: number,
  ) {
    super(
      `emergency fixed_amount override requires an attesting panel of at least ${minimum} distinct ` +
        `State-Trustees; got ${received}`,
    );
  }
}

export const POOL_FIXED_AMOUNT_PANEL_DUPLICATE_ACTOR_CODE = 'pool.fixed_amount_panel_duplicate_actor';

/** An emergency panel roster listing the same actor id more than once — inflates apparent consensus. */
export class PoolFixedAmountPanelDuplicateActorError extends PoolFixedAmountError {
  public readonly name = 'PoolFixedAmountPanelDuplicateActorError';
  public readonly code = POOL_FIXED_AMOUNT_PANEL_DUPLICATE_ACTOR_CODE;
  public constructor() {
    super(`emergency fixed_amount override panel roster must not list the same actor more than once`);
  }
}

export const POOL_FIXED_AMOUNT_INVALID_CODE = 'pool.fixed_amount_invalid';

/** A non-positive / non-integer / over-ceiling amount — INR rupees must be a strictly-positive
 *  integer within the guard-rail ceiling (the pools.fixed_amount unit; see MAX_POOL_FIXED_AMOUNT_INR). */
export class PoolFixedAmountInvalidError extends PoolFixedAmountError {
  public readonly name = 'PoolFixedAmountInvalidError';
  public readonly code = POOL_FIXED_AMOUNT_INVALID_CODE;
  public constructor(public readonly received: number) {
    super(`fixed_amount must be a strictly-positive integer (whole INR) within the guard-rail ceiling; got ${String(received)}`);
  }
}

export const POOL_FIXED_AMOUNT_VERSION_CONFLICT_CODE = 'pool.fixed_amount_version_conflict';

/**
 * A concurrent write raced this one on the `(pariwar_id, version)` or the partial-unique
 * open-head index (23505) — an EXPECTED optimistic-concurrency failure the caller re-reads and
 * retries (the TcVersionConflictError precedent).
 */
export class PoolFixedAmountVersionConflictError extends PoolFixedAmountError {
  public readonly name = 'PoolFixedAmountVersionConflictError';
  public readonly code = POOL_FIXED_AMOUNT_VERSION_CONFLICT_CODE;
  public constructor(public readonly pariwarId: string) {
    super(`concurrent fixed_amount schedule write conflict for pariwar ${pariwarId} — re-read and retry`);
  }
}

/** True iff `err` is a Postgres unique-violation (23505) on the fixed-amount schedule/attestation tables. */
export function isFixedAmountUniqueViolation(err: unknown): boolean {
  return extractPgError(err)?.code === '23505';
}

// ── Pool-bound-payment binding-resolution errors — Story 7.6 (Task 5) ──────────
// The typed fail-loud seams for the member-cycle → assigned-pool + collection-binding resolver
// (contribution-binding.ts, AC1). Both are INTEGRITY violations — states that MUST NOT occur if the
// spawn saga + assignment engine are correct — so they fail loudly rather than degrade to a guess
// (a silent pick would misroute real money / make wrong-pool detection ambiguous). Each rides
// pool/errors.ts so it travels the pool namespace barrel; each carries a namespaced `code` +
// `toErrorResponse` (the PoolFixedAmountError precedent) so the apps/api boundary maps it without
// matching on the class instance. NOTE: a member with NO assignment in the cycle is NOT an error —
// it is a first-class "not assigned" ABSENCE signal the resolver returns (AC1.4), never a throw.

/** Base for the pool-bound-payment binding errors — carries a `code` + a uniform error-response body.
 *  Restores the `Error` prototype chain explicitly (`instanceof` across subclasses is otherwise
 *  transpilation-target-dependent) and exposes structured `details` from each subclass's typed public
 *  fields — these are internal identifiers (UUIDs), not member PII, so surfacing them at the API
 *  boundary aids debugging (the consent/errors.ts + niyamavali/errors.ts precedent). */
abstract class PoolContributionBindingError extends Error {
  public abstract readonly code: string;
  public constructor(message: string) {
    super(message);
    Object.setPrototypeOf(this, new.target.prototype);
  }
  protected toErrorDetails(): Record<string, unknown> {
    return {};
  }
  public toErrorResponse(requestId: string): ErrorResponseShape {
    return {
      error: {
        code: this.code,
        message: this.message,
        details: this.toErrorDetails(),
        request_id: requestId,
      },
    };
  }
}

export const WRONG_POOL_BINDING_AMBIGUOUS_CODE = 'pool.wrong_pool_binding_ambiguous';

/**
 * Two pools within one cycle share the same `claim_case_id` (hence the same claim-scoped nominee bank
 * accounts) — so a deposit's destination account maps to more than one pool and wrong-pool detection is
 * AMBIGUOUS (AC1.3 / D5). Pool→claim is 1:1 (one pool per approved claim), and there is no
 * `(cycle_id, claim_case_id)` uniqueness constraint on `pools` today, so a spawn bug producing two pools
 * for ONE claim is the case this claim-keyed guard catches. NOTE the scope: two DIFFERENT claims whose
 * nominee accounts reuse the same real bank account (e.g. two losses in one family) have DISTINCT
 * `claim_case_id`s and so do NOT trip this guard — that account-level cross-claim collision is
 * undetectable at this decryption-free layer (Tier-1 ciphertext) and is Epic 9's reconciliation matcher's
 * responsibility (deposit → pool by destination account). The resolver FAILS LOUD here rather than
 * silently picking a pool.
 */
export class WrongPoolBindingAmbiguousError extends PoolContributionBindingError {
  public readonly name = 'WrongPoolBindingAmbiguousError';
  public readonly code = WRONG_POOL_BINDING_AMBIGUOUS_CODE;
  public constructor(
    public readonly cycleId: string,
    public readonly claimCaseId: string,
    public readonly poolIds: readonly string[],
  ) {
    super(
      `wrong-pool binding ambiguous in cycle ${cycleId}: pools [${poolIds.join(', ')}] share claim ` +
        `${claimCaseId} (hence the same collection accounts) — a deposit cannot be attributed to a ` +
        `unique pool. Distinct claim_case_id per pool is required for well-defined wrong-pool detection.`,
    );
  }
  protected override toErrorDetails(): Record<string, unknown> {
    return { cycle_id: this.cycleId, claim_case_id: this.claimCaseId, pool_ids: this.poolIds };
  }
}

export const MEMBER_POOL_ASSIGNMENT_INTEGRITY_CODE = 'pool.member_pool_assignment_integrity';

/**
 * A member appears in the LATEST snapshot of MORE THAN ONE pool for the same cycle (AC1.4). The
 * deterministic assignment places each member in EXACTLY one pool, so ≥2 memberships is an integrity
 * violation (a corrupt/duplicated snapshot, a spawn bug) — never a legitimate state. Fail loud; the
 * resolver must not pick one arbitrarily (that would misroute the member's contribution).
 */
export class MemberPoolAssignmentIntegrityError extends PoolContributionBindingError {
  public readonly name = 'MemberPoolAssignmentIntegrityError';
  public readonly code = MEMBER_POOL_ASSIGNMENT_INTEGRITY_CODE;
  public constructor(
    public readonly memberId: string,
    public readonly poolIds: readonly string[],
  ) {
    super(
      `member ${memberId} is assigned to ${String(poolIds.length)} pools [${poolIds.join(', ')}] in ` +
        `the same cycle — deterministic assignment places a member in EXACTLY one pool, so this is an ` +
        `integrity violation (corrupt snapshot / spawn bug), not a resolvable state.`,
    );
  }
  protected override toErrorDetails(): Record<string, unknown> {
    return { member_id: this.memberId, pool_ids: this.poolIds };
  }
}

export const CLAIM_NOMINEE_BANK_ACCOUNTS_COUNT_INTEGRITY_CODE =
  'pool.claim_nominee_bank_accounts_count_integrity';

/**
 * A claim's `claim_nominee_bank_accounts` rows number neither 0 (not yet collected) nor 2 (#1 primary /
 * #2 secondary) — the collection-binding contract (contribution-binding.ts) requires exactly one of
 * those two counts, never a partial set. A partial write (e.g. only #1 persisted) would silently produce
 * a binding violating the documented "`[]` or EXACTLY TWO" invariant, so the resolver fails loud instead.
 */
export class ClaimNomineeBankAccountsCountIntegrityError extends PoolContributionBindingError {
  public readonly name = 'ClaimNomineeBankAccountsCountIntegrityError';
  public readonly code = CLAIM_NOMINEE_BANK_ACCOUNTS_COUNT_INTEGRITY_CODE;
  public constructor(
    public readonly claimCaseId: string,
    public readonly accountCount: number,
  ) {
    super(
      `claim ${claimCaseId} has ${String(accountCount)} nominee bank account row(s) — the collection ` +
        `binding contract requires exactly 0 (not yet collected) or 2 (#1 primary / #2 secondary), never ` +
        `a partial set. A corrupt/partial write to claim_nominee_bank_accounts, not a resolvable state.`,
    );
  }
  protected override toErrorDetails(): Record<string, unknown> {
    return { claim_case_id: this.claimCaseId, account_count: this.accountCount };
  }
}
