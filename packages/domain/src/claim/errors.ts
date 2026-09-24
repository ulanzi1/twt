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

// ── Nominee name-check write-path + approval-gate guards (Story 6.18, AC3/AC4/AC6) ─────────────
// `2026-09-19-226` cl.3 makes the District Admin the checker and cl.5 forbids the SYSTEM acting on a
// name mismatch. These guards are therefore all about PROCESS, never about names: was the claim in a
// state where a check means anything; was the check made about the data that is live now; does the
// claim have the two accounts cl.7 makes mandatory.
//
// ⛔⛔ NONE of these is ever raised BECAUSE two names differ. A `does_not_match` verdict is a
// perfectly valid recorded check — it simply does not PASS the AC4 gate, so the claim waits and is
// sent back for correction (cl.6). ⛔ A claim is NEVER denied for a name.

/** Thrown when a check is recorded onto a claim whose state is outside the AC3 window. */
export class NomineeNameCheckNotRecordableError extends Error {
  public readonly name = 'NomineeNameCheckNotRecordableError';
  public constructor(
    public readonly claimCaseId: string,
    public readonly currentState: string,
  ) {
    super(
      `[nominee-name-check] claim ${claimCaseId} is '${currentState}' — a name check cannot be recorded in this state`,
    );
  }
}

/** Thrown when the submitted tokens no longer match the live accounts/declaration — the District
 *  Admin judged data that has since changed, so the judgement cannot be accepted (D1, D5). */
export class NomineeNameCheckStaleError extends Error {
  public readonly name = 'NomineeNameCheckStaleError';
  public constructor(
    public readonly claimCaseId: string,
    public readonly detail: string,
  ) {
    super(`[nominee-name-check] claim ${claimCaseId} — ${detail}`);
  }
}

/**
 * Thrown when a submitted name check is MALFORMED — an incoherent verdict/reason pair, duplicate
 * account ranks, or a missing actor display name (code review 2026-09-20 → 400, ⛔ not 409).
 *
 * ⛔ IT IS A BOUNDARY FAULT, NOT A CONFLICT, and keeping it distinct from
 * `NomineeNameCheckStaleError` matters to the person on the other end: "check again" tells a
 * District Admin the data moved under them and asks them to re-read two names; this says the
 * submission itself was never well-formed. Conflating them sent people to re-do work for a client
 * bug.
 *
 * ⭐ WHY THE DOMAIN RAISES IT AT ALL when the route's zod schema already refuses these shapes:
 * `-226` cl.5 (*"District Admin cannot proceed unless reason for name mismatch is selected"*) is the
 * one control this story calls load-bearing, and it held only while the route was the only caller.
 * A JSONB payload carries no CHECK constraint, so the domain function is the last place it can live.
 */
export class NomineeNameCheckInvalidError extends Error {
  public readonly name = 'NomineeNameCheckInvalidError';
  public constructor(
    public readonly claimCaseId: string,
    public readonly detail: string,
  ) {
    super(`[nominee-name-check] claim ${claimCaseId} — ${detail}`);
  }
}

/** Thrown when a claim does not carry its two live bank accounts (`-226` cl.7). ⛔ NOT a denial —
 *  the claim WAITS until they are added. Raised by the check write AND by the AC4 approval gates. */
export class NomineeBankAccountsRequiredError extends Error {
  public readonly name = 'NomineeBankAccountsRequiredError';
  public constructor(
    public readonly claimCaseId: string,
    public readonly liveAccountCount: number,
  ) {
    super(
      `[nominee-name-check] claim ${claimCaseId} has ${liveAccountCount} live bank account(s) — two are required before it can be decided`,
    );
  }
}

/** Thrown by the AC4 approval gates when a claim has no CURRENT, PASSING name check. Covers three
 *  distinct situations on purpose — never checked, checked-then-stale, or checked with a
 *  `does_not_match` — because all three mean the same thing to an approver: the District Admin must
 *  look (again). `reason` distinguishes them for the operator-facing message only. */
export class NomineeNameCheckRequiredError extends Error {
  public readonly name = 'NomineeNameCheckRequiredError';
  public constructor(
    public readonly claimCaseId: string,
    public readonly reason: 'never_checked' | 'stale' | 'does_not_match',
  ) {
    super(
      `[nominee-name-check] claim ${claimCaseId} cannot be approved — the nominee name check is '${reason}'`,
    );
  }
}

// ── Story 6.20 — the nominee declaration history, the lock, the determination, the correction ─────

/** AC2 / D3 — the member's nominee declaration is LOCKED: a claim was filed for them as the deceased
 *  (and ⛔ no innocence finding has released it). Keyed to the DURABLE fact of a claim row — ⛔ never the
 *  `account-frozen` overlay, ⛔ never `getClaimByDeceasedMember` (invariant 3). → 409
 *  `nominee.locked_claim_filed`. */
export class NomineeDeclarationLockedError extends Error {
  public readonly name = 'NomineeDeclarationLockedError';
  public constructor(public readonly memberId: string) {
    super(`[nominee-lock] member ${memberId}'s nominee declaration is locked — a claim was filed`);
  }
}

/** AC5 / D5 / D15 — a claim cannot be APPROVED until the District Admin has recorded a live nominee
 *  determination whose effective declaration is non-empty and coherent. ⛔ Never a denial: the claim
 *  WAITS for a human (invariant 1). → 409 `nominee_determination_required`.
 *   · `never_determined`  — no live determination (a correction may have superseded it — D7);
 *   · `empty_declaration` — every rank is discarded or vacated; nobody stands;
 *   · `unversioned`       — a `member_nominees` row has ⛔ no version (D1 fails closed; ⛔ no backfill);
 *   · `incoherent`        — the standing ranks are not `{1}` or `{1,2}` (D17). */
export class NomineeDeterminationRequiredError extends Error {
  public readonly name = 'NomineeDeterminationRequiredError';
  public constructor(
    public readonly claimCaseId: string,
    public readonly reason: 'never_determined' | 'empty_declaration' | 'unversioned' | 'incoherent',
  ) {
    super(`[nominee-determination] claim ${claimCaseId} cannot be approved — the nominee determination is '${reason}'`);
  }
}

/** D4 / D6 / D17 — the District Admin's determination is refused. A GUARD, ⛔ never a default: the
 *  writer never fixes a mark, it refuses the whole submission (invariant 1). → 409. */
export class NomineeDeterminationRefusedError extends Error {
  public readonly name = 'NomineeDeterminationRefusedError';
  public constructor(
    public readonly claimCaseId: string,
    public readonly reason:
      | 'not_found'
      | 'not_recordable'
      | 'invalid_certificate_date'
      | 'missing_note'
      | 'missing_display'
      | 'unknown_version'
      | 'duplicate_mark'
      | 'too_many_versions'
      | 'missing_item'
      | 'inconsistent_mark'
      | 'stale_watermark'
      | 'stale_supersession'
      | 'incoherent_rank_set'
      | 'unversioned',
    detail: string,
  ) {
    super(`[nominee-determination] claim ${claimCaseId}: ${reason} — ${detail}`);
  }
}

/** D7 — a nominee correction is refused at raise or at a step. → 409 (404 for `not_found`). */
export class NomineeCorrectionRefusedError extends Error {
  public readonly name = 'NomineeCorrectionRefusedError';
  public constructor(
    public readonly subjectId: string,
    public readonly reason:
      | 'not_found'
      | 'claim_not_found'
      | 'outside_state_window'
      | 'relationship_other'
      | 'target_not_standing'
      | 'no_standing_version'
      | 'open_correction_exists'
      | 'same_approver'
      | 'raiser_cannot_approve'
      | 'version_conflict'
      | 'step_conflict'
      | 'missing_note'
      | 'missing_display',
    detail: string,
  ) {
    super(`[nominee-correction] ${subjectId}: ${reason} — ${detail}`);
  }
}

/** AC2 / D17(c) — a Story-6-22 finding cannot be recorded against this claim. → 409. */
export class ClaimNomineeFindingRefusedError extends Error {
  public readonly name = 'ClaimNomineeFindingRefusedError';
  public constructor(
    public readonly claimCaseId: string,
    public readonly reason: 'claim_not_found' | 'duplicate' | 'missing_display',
    detail: string,
  ) {
    super(`[nominee-finding] claim ${claimCaseId}: ${reason} — ${detail}`);
  }
}
