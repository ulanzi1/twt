// Claim lifecycle typed domain errors — Story 6.1 (Tasks 4 + 6; AC3). Twin of
// member/errors.ts.
//
// `ClaimStateDirectWriteError` is the application-layer counterpart to the DB
// write-rejection trigger (migration). The trigger RAISEs `ERRCODE = 'P0001'` with
// the message prefix `claims.current_state direct write rejected` when any code path
// other than the projector tries to change `claims.current_state`. A `BEFORE UPDATE`
// trigger that RAISEs aborts its own transaction, so it CANNOT durably write the P0
// architectural-violation audit line — that is the job of the application boundary
// that CATCHES the trigger error (mirror how @twt/events appendEvent catches `23505`
// → ConcurrencyError).
//
// Surfaced at the @twt/domain top-level barrel (../index.ts) so the apps/api
// error-mapping middleware imports the class AND the code constant directly — it
// matches on the code constant, not the class instance. Story 6.1 has no route; it
// provides the typed error + the SQLSTATE/message detector so the future boundary
// (Story 6.2 intake) maps the trigger rejection → this error, emits the P0 audit line,
// and returns the right HTTP code. Match by PREFIX with `.startsWith()` (NOT
// `.includes()` — a Story 3.1 review defect carried forward as a fix, not a bug).

import type { ErrorResponseShape } from '../errors.js';

/** Namespaced error code for a rejected direct write to `claims.current_state`. */
export const CLAIM_STATE_DIRECT_WRITE_CODE = 'claim.state_direct_write_rejected';

/**
 * The trigger's RAISE message prefix. The detector matches on this because the
 * trigger uses the default `RAISE EXCEPTION` SQLSTATE `P0001` (`raise_exception`),
 * which — unlike `23505` (concurrency) or `23xxx` (integrity) — is generic, so the
 * message prefix is the discriminator. Keep IN SYNC with the trigger DDL in the
 * claims migration.
 */
export const CLAIM_STATE_DIRECT_WRITE_MESSAGE_PREFIX = 'claims.current_state direct write rejected';

/** The SQLSTATE the trigger RAISEs with (default `RAISE EXCEPTION` class). */
export const CLAIM_STATE_DIRECT_WRITE_SQLSTATE = 'P0001';

/**
 * Thrown by the application boundary when a write to `claims.current_state` is
 * rejected by the DB trigger — i.e. a code path OTHER than the projector attempted to
 * mutate the replay-derived state cache (an architectural violation, AC3). The
 * boundary emits a P0 audit line alongside throwing this.
 */
export class ClaimStateDirectWriteError extends Error {
  public readonly name = 'ClaimStateDirectWriteError';
  public readonly code = CLAIM_STATE_DIRECT_WRITE_CODE;

  public constructor(public readonly detail: string) {
    super(`${CLAIM_STATE_DIRECT_WRITE_MESSAGE_PREFIX}: ${detail}`);
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
 * the SQLSTATE `.code` + `.message`. Mirrors `extractPgError` in member/errors.ts
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
 * True iff `err` is the `claims.current_state` write-rejection raised by the DB
 * trigger (SQLSTATE `P0001` + the message prefix). The catching boundary uses this to
 * map a raw DB rejection → `ClaimStateDirectWriteError`. Prefix match via
 * `.startsWith()` (Story 3.1 review finding — NOT `.includes()`).
 */
export function isClaimStateDirectWriteError(err: unknown): boolean {
  const pgErr = extractPgError(err);
  return (
    pgErr !== null &&
    pgErr.code === CLAIM_STATE_DIRECT_WRITE_SQLSTATE &&
    pgErr.message.startsWith(CLAIM_STATE_DIRECT_WRITE_MESSAGE_PREFIX)
  );
}

// ── Optimistic-concurrency on the claim's event stream (projector) ────────────
// The projector appends the next event at `head_version + 1`; the events_log unique
// index `(stream_id, event_version)` is the backstop. A concurrent projector landing
// the same version raises `23505` → this typed error (mirror @twt/events
// ConcurrencyError, which domain cannot import). An EXPECTED failure — the caller
// re-reads and retries; NOT surfaced at the top-level barrel (claim namespace only).

/** The events_log unique-index name for `(stream_id, event_version)`. Keep IN SYNC
 * with schema/events_log.ts. */
const STREAM_VERSION_CONSTRAINT = 'events_log_stream_id_event_version_uq';

export class ClaimStreamConcurrencyError extends Error {
  public readonly name = 'ClaimStreamConcurrencyError';
  public constructor(
    public readonly claimCaseId: string,
    public readonly attemptedVersion: number,
  ) {
    super(
      `claim stream ${claimCaseId} concurrency conflict appending event_version ${attemptedVersion}`,
    );
  }
}

// ── Ground-inspection write-path guards (Story 6.7) ───────────────────────────
// These mirror the 6.6 lesson: an identity annotation event (ground_inspection_scheduled/
// _completed) is semantically identity ONLY from `verification_in_progress`; the reducer
// stays total (never throws — replay-robustness), so the WRITE PATH must guard against
// appending a `scheduled`/`completed` event onto a resolved or pre-verification claim (a
// false evidentiary trail). NOTE the 6.6 precedent class `PeerMeshClaimNotInVerificationError`
// lives in peer-mesh-persist.ts, NOT here — these three NEW ground-inspection errors are
// consolidated here alongside `ClaimStreamConcurrencyError`. NOT surfaced at the top-level
// barrel (claim namespace only); the route maps them to stable 4xx codes.

/** Thrown by a ground-inspection writer when the claim has left `verification_in_progress`
 *  (guards a false `scheduled`/`completed` audit fact on a resolved/pre-verification claim). */
export class GroundInspectionClaimNotInVerificationError extends Error {
  public readonly name = 'GroundInspectionClaimNotInVerificationError';
  public constructor(
    public readonly claimCaseId: string,
    public readonly currentState: string,
  ) {
    super(
      `[ground-inspection] claim ${claimCaseId} is '${currentState}', not 'verification_in_progress' — rejected`,
    );
  }
}

/** Thrown by `completeGroundInspection` when the active assignment has ZERO persisted photos
 *  (D6/AC4 — ≥1 photo is MANDATORY completion evidence; the no-photo case is the refusal
 *  disposition, not a completion). Verified transactionally under the assignment row lock. */
export class GroundInspectionPhotoRequiredError extends Error {
  public readonly name = 'GroundInspectionPhotoRequiredError';
  public constructor(public readonly groundInspectionId: string) {
    super(
      `[ground-inspection] assignment ${groundInspectionId} cannot be completed without ≥ 1 persisted photo`,
    );
  }
}

/** Thrown when a mutating verb (reschedule/findings/complete/refusal/photo) targets an
 *  assignment that is no longer `scheduled` — a terminal assignment (`completed`/`superseded`/
 *  `photo_refused`/`evidence_unavailable`) is IMMUTABLE (the assignment state-transition matrix,
 *  enforced under the row lock). */
export class GroundInspectionNotActiveError extends Error {
  public readonly name = 'GroundInspectionNotActiveError';
  public constructor(
    public readonly groundInspectionId: string,
    public readonly status: string,
  ) {
    super(
      `[ground-inspection] assignment ${groundInspectionId} is '${status}', not 'scheduled' — mutation rejected`,
    );
  }
}

// ── Nominee-bank write-path guard (Story 6.8, D3 — three-tier edit governance) ─
// Claim-time nominee bank collection is an editable annotation (D2). The edit rights are
// role-and-state-differentiated (governance decision, BigDev 2026-07-11):
//   1. NOMINEE (member-app Ravi-mode + helpline-as-proxy) — freely record/edit BOTH accounts
//      any time BEFORE the verifier approves (through `verifier_review`); permanently read-only
//      for the nominee once the claim reaches `verifier_approved`.
//   2. AUTHORIZED ADMIN CORRECTION — after `verifier_approved` but BEFORE the claim/cycle freeze
//      (`state_trustee_freeze`), an authorized admin (helpline) may make an audited, REASON-required,
//      step-up-protected correction. NOT open to the nominee.
//   3. EVERYTHING ELSE (pre-converged; frozen/published `state_trustee_freeze` onward; AND the
//      `reversed` / `appeal_stage_*` states) — CLOSED to both nominee edits and routine admin
//      corrections in v1. Any bank-detail change there requires the separately governed EMERGENCY
//      or APPEAL-REMEDIATION workflow (OUT OF SCOPE — the writer simply rejects). Reopening a
//      correction window on those states is a FUTURE story that must first define re-verification,
//      approval invalidation, downstream-readiness invalidation, audit, and notification semantics
//      (BigDev, 2026-07-11) — do NOT widen `NOMINEE_BANK_ADMIN_CORRECTION_STATES` without them.
// The reducer stays total (identity from any state); the WRITE PATH re-reads the claim's state
// INSIDE the scope-tx and enforces the tier for the caller's authority. NOT surfaced at the
// top-level barrel (claim namespace only); the route maps these to stable 4xx codes.

/** Tier-1 (nominee) window: the filer may record/edit both accounts before verifier approval. */
export const NOMINEE_BANK_COLLECTABLE_STATES = [
  'intake_converged',
  'documents_pending',
  'verification_in_progress',
  'verifier_review',
] as const;

/** Tier-2 (admin correction) window: after verifier approval, before the claim/cycle freeze — an
 *  authorized admin may make an audited, reason-required correction. NOT open to the nominee.
 *  DELIBERATELY `verifier_approved` ONLY — `reversed`/`appeal_stage_*` are v1-closed (tier-3), NOT
 *  correction windows; widening this set is a future story with re-verification/invalidation/audit/
 *  notification semantics (BigDev, 2026-07-11). */
export const NOMINEE_BANK_ADMIN_CORRECTION_STATES = ['verifier_approved'] as const;

/** Thrown when bank details are not editable for the claim in its current state under the caller's
 *  authority (a pre-converged claim; a post-approval claim for a NON-admin caller; or a frozen/
 *  published claim, whose changes require the separately governed emergency correction workflow). */
export class NomineeBankClaimNotCollectableError extends Error {
  public readonly name = 'NomineeBankClaimNotCollectableError';
  public constructor(
    public readonly claimCaseId: string,
    public readonly currentState: string,
  ) {
    super(
      `[nominee-bank] claim ${claimCaseId} is '${currentState}' — bank details are not editable in this state`,
    );
  }
}

/** Thrown when an authorized-admin correction (the post-approval window) is attempted WITHOUT the
 *  mandatory reason — corrections are audited + reason-required (governance decision). */
export class NomineeBankCorrectionReasonRequiredError extends Error {
  public readonly name = 'NomineeBankCorrectionReasonRequiredError';
  public constructor(public readonly claimCaseId: string) {
    super(`[nominee-bank] a correction after verifier approval requires a reason`);
  }
}

// ── Claim-time DPDPA consent write-path guard (Story 6.9, AC5) ─────────────────
// Consent RECORDING happens inside the intake wizard (the (claim)/consent step sits between
// relationship and document), so the claim is in an early PRE-ADJUDICATION state. The write path
// re-reads the claim's state INSIDE the scope-tx (under the row lock) and rejects recording onto an
// adjudicated / terminal claim (the 6.8 write-path-guard discipline). REVOCATION, by contrast, is
// allowed at ANY later state — the whole point of AC3 is a post-settlement takedown — so this window
// gates RECORD only, never revoke. `verifier_approved` onward (adjudication complete), the trustee
// freeze/approval/settled terminals, and the denied/appeal/reversed states are all CLOSED to
// recording: consent captured after adjudication would be evidentially meaningless for the claim it
// was supposed to gate. (Note: the literal `under_verification` / `intake_initiated` are NOT states —
// the real initial state is `intake_pending`; `claim.intake_initiated` is the EVENT type. 6.8 D2 note.)

/** The pre-adjudication states in which claim-time DPDPA consent may be RECORDED (AC5). Mirrors the
 *  shape of NOMINEE_BANK_COLLECTABLE_STATES but includes `intake_pending` — the consent wizard step
 *  runs immediately post-intake, before ICP convergence may have advanced the claim. */
export const DPDPA_CONSENT_RECORDABLE_STATES = [
  'intake_pending',
  'intake_converged',
  'documents_pending',
  'verification_in_progress',
  'verifier_review',
] as const;

/** True iff `err` is the events_log `(stream_id, event_version)` unique-violation. */
export function isClaimStreamVersionConflict(err: unknown): boolean {
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
