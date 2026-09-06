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

/**
 * The deterministic assignment's post-balancing ≤1 invariant was violated (AI-7-2 / Story 7.4 D4). A
 * TYPED signal (not a bare `Error`) so the spawn-saga worker can recognise this specific CORRUPTION
 * condition — a logic bug in the capacity/placement math that would persist a silently-unbalanced cycle
 * — and alarm on it distinctly (P0), rather than treating it as an ordinary transient spawn failure.
 * Carries the offending `m`/`n` for the alarm. Worker-internal only (never surfaced at an API boundary),
 * so it needs no `code`/`toErrorResponse`. Unreachable while rosters were empty (`m=0`); AI-7-2 wires a
 * real roster in, making the throw reachable — hence the explicit handling this class enables.
 */
export class PoolAssignmentBalancingError extends Error {
  public readonly name = 'PoolAssignmentBalancingError';
  public constructor(
    public readonly memberCount: number,
    public readonly poolCount: number,
    public readonly maxSize: number,
    public readonly minSize: number,
  ) {
    super(
      `[assignMembersToPools] post-balancing invariant violated: max(${String(maxSize)}) - ` +
        `min(${String(minSize)}) > 1 (m=${String(memberCount)}, n=${String(poolCount)})`,
    );
    // Restores the `Error` prototype chain explicitly (`instanceof` across subclasses is otherwise
    // transpilation-target-dependent) — the P0 alarm predicate below depends on `instanceof` holding.
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/** True iff `err` is a {@link PoolAssignmentBalancingError} — the assignment-corruption alarm signal.
 *  A predicate (not just `instanceof` at the call site) so cross-package callers match it robustly. */
export function isPoolAssignmentBalancingError(err: unknown): err is PoolAssignmentBalancingError {
  return err instanceof PoolAssignmentBalancingError;
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
 * A STANDARD change whose `effective_from` violates the 90-day notice floor,
 * evaluated against DB-authoritative `now()` (D6 — the hostile-trustee cooling-off control).
 * An emergency override bypasses this floor (its own path, no floor check).
 */
export class PoolFixedAmountNoticeTooShortError extends PoolFixedAmountError {
  public readonly name = 'PoolFixedAmountNoticeTooShortError';
  public readonly code = POOL_FIXED_AMOUNT_NOTICE_TOO_SHORT_CODE;
  public constructor(public readonly effectiveFrom: string) {
    super(
      `standard fixed_amount change requires effective_from >= now() + 90 days ` +
        `(the 90-day notice); got ${effectiveFrom}. Use the emergency override to bypass the notice.`,
    );
  }
}

export const POOL_FIXED_AMOUNT_EMERGENCY_BACKDATED_BEFORE_HEAD_CODE =
  'pool.fixed_amount_emergency_backdated_before_head';

/**
 * An EMERGENCY override whose `effective_from` precedes the effective_from of the amount currently
 * IN FORCE.
 *
 * Decision `2026-08-16-124` clause 6 (Story 7.11, Q1 option (b)), as clarified by Decision
 * `2026-08-16-125`: the bound is measured against the amount IN FORCE at DB `now()`, NOT against the
 * open-ended head row — those two diverge exactly when a standard change is already scheduled ahead
 * (the open head is future-dated; the row actually in force is the prior one). The emergency path
 * deliberately has NO notice floor — it may take effect immediately or in the past — but it may not
 * reach BEHIND the amount it is superseding. Without this bound a backdated emergency could land
 * between an already-committed cycle-freeze and its RETRIED spawn resolution, changing what that
 * retry resolves (Story 7.5's replay concern). An emergency superseding a PENDING future standard
 * change remains legal — see Decision `2026-08-16-125` clause 2.
 *
 * ⚠ This is a BACKDATING bound, not a notice floor. Do not describe it as one: the emergency path
 * still bypasses the 90-day notice entirely (clause 8).
 *
 * ⛔ Vacuous at genesis — a Pariwar with no amount in force has nothing to reach behind.
 */
export class PoolFixedAmountEmergencyBackdatedBeforeHeadError extends PoolFixedAmountError {
  public readonly name = 'PoolFixedAmountEmergencyBackdatedBeforeHeadError';
  public readonly code = POOL_FIXED_AMOUNT_EMERGENCY_BACKDATED_BEFORE_HEAD_CODE;
  public constructor(
    public readonly effectiveFrom: string,
    public readonly inForceEffectiveFrom: string,
  ) {
    super(
      `emergency fixed_amount override requires effective_from >= the effective_from of the amount ` +
        `currently in force (${inForceEffectiveFrom}); got ${effectiveFrom}.`,
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

/** An emergency override with an empty panel roster — an attesting trustee panel is MANDATORY (AC3a).
 *  ⚠ Story 10.13 re-labelled the COPY from "State-Trustee" (Decision `2026-08-16-123` clause 10): a
 *  literal `state_trustee` is ineligible BY ARITHMETIC — a `state`-ceiling grant can never satisfy the
 *  `pariwar`-dimension check this panel is gated at — so the old wording named a body that could never
 *  sit on it. ⛔ The stored `panel` column and the `panel_actor_ids` wire field are NOT renamed. */
export class PoolFixedAmountAttestationRequiredError extends PoolFixedAmountError {
  public readonly name = 'PoolFixedAmountAttestationRequiredError';
  public readonly code = POOL_FIXED_AMOUNT_ATTESTATION_REQUIRED_CODE;
  public constructor() {
    super(`emergency fixed_amount override requires a non-empty attesting trustee panel`);
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
        `trustees; got ${received}`,
    );
  }
}

export const POOL_FIXED_AMOUNT_PANEL_MEMBER_UNAUTHORIZED_CODE =
  'pool.fixed_amount_panel_member_unauthorized';

/**
 * ⭐ Story 10.13 (AC3) — a submitted attesting-panel member who does NOT hold
 * `pool.fixed_amount_emergency` at this Pariwar. Decision `2026-08-16-123` clause 2 (Q2.1 option (a),
 * key-as-credential). Thrown by `assertFixedAmountPanelAuthorized`, fail-closed on the FIRST
 * ineligible member.
 *
 * ⚠ SEPARATE from the three arithmetic guards it sits beside: {@link PoolFixedAmountAttestationRequiredError}
 * (empty roster), {@link PoolFixedAmountPanelTooSmallError} (below the floor) and
 * {@link PoolFixedAmountPanelDuplicateActorError} (same actor twice) all count attestors; this one is
 * the only guard that asks WHO they are. Eligibility is an ADDITIONAL predicate, never a replacement —
 * the arithmetic guards stay exactly where they are.
 *
 * ⚠ A cross-tenant holder — an actor holding the key in a DIFFERENT Pariwar — lands here too, because
 * `role_grants` is RLS-scoped and their grants are invisible to the scoped query, folding to "no
 * grants". That is the case the pre-10.13 code let through, and it is the case the test suite pins.
 *
 * ⚠ `actorId` is a system identifier, not member PII, and is safe in the rejection audit line.
 */
export class PoolFixedAmountPanelMemberUnauthorizedError extends PoolFixedAmountError {
  public readonly name = 'PoolFixedAmountPanelMemberUnauthorizedError';
  public readonly code = POOL_FIXED_AMOUNT_PANEL_MEMBER_UNAUTHORIZED_CODE;
  public constructor(public readonly actorId: string) {
    super(
      `attesting panel member ${actorId} does not hold pool.fixed_amount_emergency in this Pariwar — ` +
        `an emergency adjustment record may only name actors eligible to attest it`,
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

// ── Per-Pariwar DRIVE TARGET errors — Story 11b.13 (Task 3; AC2, AC3, AC4) ──────────────────────
// Governance of record: `2026-09-04-190` cl.7 (Trustee-ratified) · `2026-09-04-189` cl.3 ·
// `2026-09-05-201` (the two concurrency controls) · `2026-09-06-203` (the keys and the records).
//
// ⭐ They ride pool/errors.ts so they travel the pool namespace barrel, and each carries a
// namespaced `code` + `toErrorResponse` — the `PoolFixedAmountError` precedent — so the apps/api
// boundary maps them WITHOUT matching on a class name.
// ⛔⛔ AND THAT MAPPING IS ⛔ NOT OPTIONAL. `2026-09-05-201` cl.4 rules the version conflict must be
// a **409 with its own REGISTERED code**, ⛔ never a bare `23505` and ⛔ never the opaque 500 that
// `UngovernedNomineeBankMaskingChangeError` reaches the wire as (chunk G2's finding on the
// precedent). Every class below is registered in `apps/api/src/middleware/error-mapping/index.ts`.

/** Base for the drive-target typed errors — carries a `code` + a uniform error-response body. */
abstract class PoolDriveTargetError extends Error {
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

export const DRIVE_TARGET_UNGOVERNED_CODE = 'pariwar.drive_target_ungoverned_change';

/**
 * A drive-target change arrived without the governance record `2026-09-04-190` cl.7 requires — a
 * blank rationale, a missing audit anchor, an actor with no display-name snapshot, or grants that do
 * not carry the key.
 *
 * ⚠ The `pariwar_drive_target_schedule` attribution columns are NULLABLE at the DB, so this class is
 * the ONLY thing standing between a governed act and a bare value swap. ⛔ Do not relax it because
 * the schema permits nulls — the schema permits them for the unconfigured/system-write cases, ⛔ not
 * for an attributed change.
 */
export class UngovernedDriveTargetChangeError extends PoolDriveTargetError {
  public readonly name = 'UngovernedDriveTargetChangeError';
  public readonly code = DRIVE_TARGET_UNGOVERNED_CODE;
  public constructor(missing: string) {
    super(
      `drive-target change rejected — missing ${missing}. Recording what a Pariwar's drives aim to ` +
        `raise is a GOVERNED ACT (2026-09-04-190 cl.7), not a value swap. ⛔ Do not relax this ` +
        `check; record the change.`,
    );
  }
}

export const DRIVE_TARGET_INVALID_CODE = 'pariwar.drive_target_invalid';

/**
 * The submitted target is not whole INR, is not STRICTLY POSITIVE, or exceeds the sanity ceiling.
 *
 * ⛔⛔ `0` LANDS HERE, and that is deliberate: Story 11b.14's meter is `amountRaisedInr / target`, so
 * a ₹0 target is a DIVISION BY ZERO — and it is a DIFFERENT state from *"no target set"*, which is
 * the ABSENCE of a schedule row. ⛔ Never treat `0` as unset.
 */
export class DriveTargetInvalidError extends PoolDriveTargetError {
  public readonly name = 'DriveTargetInvalidError';
  public readonly code = DRIVE_TARGET_INVALID_CODE;
  public constructor(public readonly received: unknown) {
    super(
      `drive target must be a whole number of rupees, strictly greater than 0 and within the ` +
        `sanity ceiling — received ${JSON.stringify(received)}. ⛔ 0 is NOT "unset": an unset ` +
        `target is the absence of a schedule row, and a 0 target is a division by zero for the ` +
        `progress meter.`,
    );
  }
}

export const DRIVE_TARGET_VERSION_CONFLICT_CODE = 'pariwar.drive_target_version_conflict';

/**
 * ⭐⭐ `2026-09-05-201` cl.4's LOST-UPDATE GUARD, on this story's own write path from day one.
 *
 * The caller's `expectedVersion` does not match the Pariwar's current open head. ⇒ somebody else
 * changed the target since the caller last read it, and proceeding would **silently overwrite their
 * change with the caller's rationale recorded as its justification**.
 *
 * ⚠⛔ WHY THIS EXISTS HERE AND ⛔ NOT ON THE PRECEDENT. `-201` records that the masking module's
 * advisory lock — added by a review pass so a losing writer would stop hitting the unique index with
 * a bare `23505` → opaque 500 — **removed the only collision that was preventing a silent
 * overwrite**, converting a race into a QUEUE in which both writers succeed as N and N+1 and the
 * second never learns the first happened. ⭐ This control takes the SAME advisory lock (it is still
 * needed, for the serialized path's 23505) and therefore owes the SAME guard.
 * ⇒ mapped to **409** with this REGISTERED code — ⛔ never a bare 23505, ⛔ never an opaque 500.
 */
export class DriveTargetVersionConflictError extends PoolDriveTargetError {
  public readonly name = 'DriveTargetVersionConflictError';
  public readonly code = DRIVE_TARGET_VERSION_CONFLICT_CODE;
  public constructor(
    public readonly pariwarId: string,
    public readonly expectedVersion: number | null,
    public readonly actualVersion: number | null,
  ) {
    super(
      `drive-target version conflict for pariwar ${pariwarId} — you last saw version ` +
        `${expectedVersion === null ? 'none (no schedule yet)' : String(expectedVersion)}, but the ` +
        `current head is ` +
        `${actualVersion === null ? 'none (no schedule yet)' : String(actualVersion)}. Somebody ` +
        `else changed it. Re-read the current target and re-submit if you still want your change.`,
    );
  }
}

export const DRIVE_TARGET_VISIBILITY_INVALID_CODE = 'pariwar.drive_target_visibility_invalid';

/**
 * ⭐⭐ `2026-09-04-189` **cl.3** (*member ≥ public*), REFUSED AT THE WRITE PATH.
 *
 * Public-revealed while members are hidden would show the unauthenticated internet MORE than a
 * member of the Pariwar the figure belongs to. ⚠ AC4 requires this **ENFORCED, ⛔ not documented** —
 * so it is refused here AND by `pariwar_drive_target_visibility_member_ge_public` at the DB.
 * ⛔ The DB CHECK is the backstop; THIS is the readable error an operator's 4xx is built from — the
 * masking module's *"the domain throw is the backstop, the contract is the boundary"* discipline.
 *
 * ⚠ ONE-WAY: members-revealed-while-public-hidden is the ordinary case and is ⛔ never refused.
 */
export class DriveTargetVisibilityInvalidError extends PoolDriveTargetError {
  public readonly name = 'DriveTargetVisibilityInvalidError';
  public readonly code = DRIVE_TARGET_VISIBILITY_INVALID_CODE;
  public constructor() {
    super(
      `a drive target cannot be revealed to the public while it is hidden from members — that ` +
        `would show the public more than a member of the Pariwar the figure belongs to ` +
        `(2026-09-04-189 cl.3). Reveal it to members first, or reveal it to neither.`,
    );
  }
}
