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

/** Thrown by a ground-inspection writer when the claim is OUTSIDE the inspection write window
 *  (guards a false `scheduled`/`completed` audit fact on a resolved/pre-verification claim).
 *  Story 6.26 GI3 (`2026-10-06-282`, amended by `-283` A1 / A5): the window is the claim REVIEW WINDOW
 *  (`CLAIM_REVIEW_WINDOW_STATES`) plus `state_trustee_approved` while the claim is R9-routed — every state in
 *  which the approval gate's ground-inspection conjunct can refuse, so "waits" always has a way out. The class
 *  name and its wire code (`ground_inspection.not_allowed`) are KEPT — the code literal is a contract. */
export class GroundInspectionClaimNotInVerificationError extends Error {
  public readonly name = 'GroundInspectionClaimNotInVerificationError';
  public constructor(
    public readonly claimCaseId: string,
    public readonly currentState: string,
  ) {
    super(
      `[ground-inspection] claim ${claimCaseId} is '${currentState}', outside the review window — rejected`,
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

// ── Story 6.26a — the inspector's original-certificate record and the dates (`2026-10-06-282` GI4 / GI5) ──

/** GI4 (`-263` FQ11 A) — a completion is missing part of the original-certificate record: ≥1 photo of kind
 *  `original_certificate`, the verdict, or the upload the inspector compared against. → 409
 *  `ground_inspection.original_certificate_required` `{ missing }`. */
export class GroundInspectionOriginalCertificateRequiredError extends Error {
  public readonly name = 'GroundInspectionOriginalCertificateRequiredError';
  public constructor(
    public readonly groundInspectionId: string,
    public readonly missing: 'photo' | 'verdict' | 'compared_certificate',
  ) {
    super(
      `[ground-inspection] assignment ${groundInspectionId} cannot be completed without the original certificate's ${missing}`,
    );
  }
}

/** GI4 — the upload the inspector compared against is ⛔ no longer the claim's CURRENT certificate (re-asserted
 *  under the claim-row lock). → 409 `ground_inspection.certificate_changed`. */
export class GroundInspectionCertificateChangedError extends Error {
  public readonly name = 'GroundInspectionCertificateChangedError';
  public constructor(
    public readonly groundInspectionId: string,
    public readonly comparedUploadId: string,
  ) {
    super(
      `[ground-inspection] assignment ${groundInspectionId} compared upload ${comparedUploadId}, which is no longer the claim's current certificate`,
    );
  }
}

/** GI4 — the claim has ⛔ no current death-certificate upload at all, so there is nothing to compare the original
 *  against (both the completion and the certificate read). → 409 `ground_inspection.no_current_certificate`. */
export class GroundInspectionNoCurrentCertificateError extends Error {
  public readonly name = 'GroundInspectionNoCurrentCertificateError';
  public constructor(public readonly claimCaseId: string) {
    super(`[ground-inspection] claim ${claimCaseId} has no current death certificate upload`);
  }
}

/** GI5 — a completion is missing its date of death (the family's on a full visit, the printed one on a
 *  certificate check). → 409 `ground_inspection.death_date_required`. */
export class GroundInspectionDeathDateRequiredError extends Error {
  public readonly name = 'GroundInspectionDeathDateRequiredError';
  public constructor(public readonly groundInspectionId: string) {
    super(`[ground-inspection] assignment ${groundInspectionId} cannot be completed without a date of death`);
  }
}

/** GI5 (6.21a D4's rule) — the date of death is after the day of completion (India time). → 409
 *  `ground_inspection.death_date_in_future`. */
export class GroundInspectionDeathDateInFutureError extends Error {
  public readonly name = 'GroundInspectionDeathDateInFutureError';
  public constructor(public readonly groundInspectionId: string) {
    super(`[ground-inspection] assignment ${groundInspectionId}: the date of death is after the day of completion`);
  }
}

/** GI5 — a malformed completion input the route's schema should have refused: an unreal calendar date, a time
 *  ⛔ not `HH:MM` 24h, a time on a certificate check, or a date source that does not follow the stage. → 400. */
export class GroundInspectionDeathFactsInvalidError extends Error {
  public readonly name = 'GroundInspectionDeathFactsInvalidError';
  public constructor(
    public readonly groundInspectionId: string,
    public readonly detail: 'invalid_date' | 'invalid_time' | 'time_not_allowed' | 'source_mismatch',
  ) {
    super(`[ground-inspection] assignment ${groundInspectionId}: invalid death facts (${detail})`);
  }
}

/** Story 6.26a GI1 (`-263` FQ9 A) — the approval WAITS: the claim's ground inspection is ⛔ not complete
 *  (`groundInspectionApprovalState`). ⛔ Never a refusal of the claim — every approval handler maps it to 409
 *  `<prefix>.ground_inspection_required` `{ reason }`. */
export class GroundInspectionRequiredError extends Error {
  public readonly name = 'GroundInspectionRequiredError';
  public constructor(
    public readonly claimCaseId: string,
    public readonly reason: 'no_completed_inspection' | 'certificate_check_required',
  ) {
    super(
      reason === 'no_completed_inspection'
        ? `[ground-inspection] claim ${claimCaseId} cannot be approved yet — its ground inspection is not complete`
        : `[ground-inspection] claim ${claimCaseId} cannot be approved yet — an inspector must see the original of the current death certificate`,
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
      | 'unversioned'
      // Story 6.21a D8 — the cutoff must come from the CURRENT, ACCEPTED death certificate. The writer
      // re-asserts the review id under the lock (`certificate_not_accepted`); the HANDLER compares the
      // decrypted dates (⛔ no decrypt in the domain, T5) and the WRITER refuses on its verdict, at its own
      // guard point (`2026-09-26-245` §4): `certificate_date_mismatch`, or `certificate_date_unreadable`
      // when the accepted date could not be read (a decrypt failure), or `certificate_date_anonymized` when it
      // was ERASED (the RTBF sentinel — permanent, `2026-09-26-246` §2).
      | 'certificate_not_accepted'
      | 'certificate_date_mismatch'
      | 'certificate_date_unreadable'
      | 'certificate_date_anonymized',
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

// ── Story 6.21a — the death certificate's clear-date rule ───────────────────────────────────────────

/** D7 — a claim cannot be APPROVED without a CURRENT, ACCEPTED death certificate whose review the live
 *  nominee determination was made against (`2026-09-20-235` Y). ⛔ NEVER a denial (`2026-09-20-236` BB):
 *  the claim WAITS for another certificate or a (re-)determination. → 409
 *  `…death_certificate_acceptance_required`, `details.reason`:
 *   · `no_certificate`      — no `death_certificate` row at all;
 *   · `not_reviewed`        — the current certificate has no live current review (uploaded, not yet judged —
 *                             or a replacement arrived after the last review);
 *   · `rejected`            — the current review is a rejection: the family is asked for another;
 *   · `determination_stale` — the live determination was made against a DIFFERENT review (a re-review or a
 *                             replacement since), or against none at all (a 0119-era NULL link). */
export class DeathCertificateAcceptanceRequiredError extends Error {
  public readonly name = 'DeathCertificateAcceptanceRequiredError';
  public constructor(
    public readonly claimCaseId: string,
    public readonly reason: 'no_certificate' | 'not_reviewed' | 'rejected' | 'determination_stale',
  ) {
    super(`[death-certificate] claim ${claimCaseId} cannot be approved — the death certificate is '${reason}'`);
  }
}

/** D1 / D3 / D4 — the District Admin's accept / reject review is refused. A GUARD, ⛔ never a default: the
 *  writer never turns an accept into a reject (D4). → 409 `death_certificate_review.<reason>` (404 for
 *  `not_found`). */
export class DeathCertificateReviewRefusedError extends Error {
  public readonly name = 'DeathCertificateReviewRefusedError';
  public constructor(
    public readonly claimCaseId: string,
    public readonly reason:
      | 'not_found'
      | 'not_reviewable'
      | 'no_certificate'
      | 'stale_certificate'
      | 'stale_supersession'
      | 'missing_display'
      | 'missing_note'
      | 'invalid_date'
      | 'accept_future_date'
      | 'reason_on_accept'
      | 'missing_reason'
      | 'date_on_reject',
    detail: string,
  ) {
    super(`[death-certificate-review] claim ${claimCaseId}: ${reason} — ${detail}`);
  }
}

// ── Story 6.19a — the claim CONTACT RECORD (D5, D14; W1–W10) ─────────────────────────────────────────

/** D14 — the reasons a claim cannot be APPROVED for want of its contact record, in PRECEDENCE order: when
 *  several apply, the FIRST is reported (6.19a AC1). */
export const CLAIM_CONTACT_REQUIRED_REASONS = [
  'no_record',
  'agreement_withdrawn',
  'nominee_address_missing',
  'claimant_details_missing',
] as const;
export type ClaimContactRequiredReason = (typeof CLAIM_CONTACT_REQUIRED_REASONS)[number];

/** D14 — a claim cannot be APPROVED until the family has given a postal address for each nominee in force
 *  at the death (and the claimant's details when the claimant is none of them) and agreed to be contacted.
 *  ⛔ NEVER a denial: the claim WAITS, and the helpline can supply what is missing in every state from which
 *  an approval can still 409 on it (W3). → 409 `<route>.claim_contact_required`, `details.reason` — ⛔ never
 *  a name or any value. */
export class ClaimContactRequiredError extends Error {
  public readonly name = 'ClaimContactRequiredError';
  public constructor(
    public readonly claimCaseId: string,
    public readonly reason: ClaimContactRequiredReason,
  ) {
    super(`[claim-contact] claim ${claimCaseId} cannot be approved — the contact record is '${reason}'`);
  }
}

/** W1–W8 — a contact-record WRITE is refused. The API maps `status` + `code` verbatim
 *  (`claim_contact.<code>`); ⛔ nothing is written when this is thrown (the writer validates before writing).
 *   · 400 — the request against the declaration, or what a creating write requires: `nominee_set_mismatch`,
 *           `agreement_required`, `claimant_required`, `address_required`;
 *   · 404 — `not_found` (no such claim here, or ⛔ not the member's own — ⛔ never a 403 oracle);
 *   · 409 — the claim's state or a conflict with the stored row: `not_writable`, `add_only`,
 *           `awaiting_determination`. */
export type ClaimContactWriteRefusal =
  | 'not_found'
  | 'not_writable'
  | 'nominee_set_mismatch'
  | 'agreement_required'
  | 'claimant_required'
  | 'address_required'
  | 'add_only'
  | 'awaiting_determination';

const CLAIM_CONTACT_REFUSAL_STATUS: Record<ClaimContactWriteRefusal, 400 | 404 | 409> = {
  not_found: 404,
  not_writable: 409,
  nominee_set_mismatch: 400,
  agreement_required: 400,
  claimant_required: 400,
  address_required: 400,
  add_only: 409,
  awaiting_determination: 409,
};

export class ClaimContactWriteRefusedError extends Error {
  public readonly name = 'ClaimContactWriteRefusedError';
  public readonly status: 400 | 404 | 409;
  public constructor(
    public readonly claimCaseId: string,
    public readonly code: ClaimContactWriteRefusal,
    detail: string,
    /** Non-PII details for the error body (a state name, a count) — ⛔ never a value the filer typed. */
    public readonly details: Readonly<Record<string, unknown>> = {},
  ) {
    super(`[claim-contact] claim ${claimCaseId}: ${code} — ${detail}`);
    this.status = CLAIM_CONTACT_REFUSAL_STATUS[code];
  }
}

// ── Story 6.23a — the nominee-change warnings, the warning reason and the reason list ──────────────

/** NW6 (`-262` FQ2, `-264` FQ12) — approving while a warning shows needs a WARNING REASON from the Pariwar's
 *  list (`missing: 'reason'`) and a note (`missing: 'note'`). ⛔ NEVER a denial: the claim is ⛔ not refused —
 *  the approver chooses a reason and writes a note, or does not approve. → 409
 *  `verifier_decision.warning_reason_required`, `details: { kinds, missing }`. */
export class ApprovalWarningReasonRequiredError extends Error {
  public readonly name = 'ApprovalWarningReasonRequiredError';
  public constructor(
    public readonly claimCaseId: string,
    public readonly kinds: readonly string[],
    public readonly missing: 'reason' | 'note',
  ) {
    super(`[approval-warnings] claim ${claimCaseId} shows ${kinds.join(', ')} — an approval needs a warning reason and a note (${missing} missing)`);
  }
}

/** NW6 (1) — a warning reason was sent for a claim that shows ⛔ no warning: a reason over nothing would put a
 *  false record on the claim. → 409 `verifier_decision.warning_reason_ungrounded`. */
export class WarningReasonUngroundedError extends Error {
  public readonly name = 'WarningReasonUngroundedError';
  public constructor(public readonly claimCaseId: string) {
    super(`[approval-warnings] claim ${claimCaseId} shows no warning — a warning reason has nothing to answer`);
  }
}

/** Trap 16 — the chosen reason is ⛔ not on the Pariwar's ACTIVE list (replaced since the page loaded, or
 *  unknown). ⛔ Never silently mapped to its replacement: the approver chose the words. → 409
 *  `…warning_reason_unavailable`. */
export class WarningReasonUnavailableError extends Error {
  public readonly name = 'WarningReasonUnavailableError';
  public constructor(public readonly warningReasonCode: string) {
    super(`[approval-warnings] warning reason '${warningReasonCode}' is not on the active list — choose again`);
  }
}

/**
 * Story 6.23b EA2 (`-277` Q3 B; `-279` A1) — THE WAIT: a final approval is held because a warning that appeared AFTER
 * the District Admin's approval has ⛔ no District Admin reason yet. ⛔ NOT a refusal and ⛔ NOT a denial — the claim
 * waits until the District Admin (any `claim.approve` holder ⛔ approving it themselves) records one (6.23a NW14).
 * `ownReasonExcluded`: a key is uncovered ONLY because a late reason the approver recorded themselves does ⛔ not count
 * for their own approval. → 409 `<prefix>.late_warning_reason_required`. ⚠ ⛔ Not `LateWarningReasonRefusedError`
 * (NW14 — why a late reason cannot be RECORDED): one word apart, never mapped for each other.
 */
export class LateWarningReasonRequiredError extends Error {
  public readonly name = 'LateWarningReasonRequiredError';
  public constructor(
    public readonly claimCaseId: string,
    public readonly kinds: readonly string[],
    public readonly uncoveredCount: number,
    public readonly ownReasonExcluded: boolean,
  ) {
    super(
      `[approval-warnings] claim ${claimCaseId} waits for the District Admin's reason for ${uncoveredCount} late warning(s) (${kinds.join(', ')})${ownReasonExcluded ? ' — the approver\'s own late reason does not count' : ''}`,
    );
  }
}

/**
 * Story 6.23b EA5 (`-279` A2) — an R9 finalize to `approved` is held: ⛔ every LIVE approve vote's own `r9_vote` record
 * row covers EVERY current warning key (a vote cast before a warning appeared, or before a determination added a
 * post-death key). The voters revise. ⛔ NOT a refusal. → 409 `r9_voting.approve_votes_need_warning_reason`.
 */
export class R9ApproveVotesNeedWarningReasonError extends Error {
  public readonly name = 'R9ApproveVotesNeedWarningReasonError';
  public constructor(
    public readonly claimCaseId: string,
    public readonly voteIds: readonly string[],
    public readonly uncoveredCount: number,
  ) {
    super(
      `[approval-warnings] claim ${claimCaseId}: ${voteIds.length} approve vote(s) do not answer every current warning (${uncoveredCount} key(s)) — the voters revise`,
    );
  }
}

/** NW14 — why a late-warning reason cannot be recorded. Each → 409 (`not_found` → 404). */
export type LateWarningReasonRefusal =
  | 'not_found'
  | 'no_district_admin_approval'
  | 'not_recordable_state'
  | 'determination_required'
  | 'nothing_uncovered'
  | 'missing_display';

/** NW14 — the District Admin's (any `claim.approve` holder's) reason for a warning that appeared AFTER the
 *  approval is refused. A record, ⛔ never a decision: ⛔ no claim is refused by it. */
export class LateWarningReasonRefusedError extends Error {
  public readonly name = 'LateWarningReasonRefusedError';
  public constructor(
    public readonly claimCaseId: string,
    public readonly reason: LateWarningReasonRefusal,
    detail: string,
  ) {
    super(`[approval-warnings] claim ${claimCaseId}: late warning reason refused (${reason}) — ${detail}`);
  }
}

/** NW17 — why the Super Admin's add / replace of a reason is refused. `not_found` → 404, `invalid_text` →
 *  400, the rest → 409. ⛔ There is no refusal for "edit" or "delete": ⛔ no such write exists. */
export const APPROVAL_WARNING_REASON_WRITE_REFUSALS = ['not_found', 'already_replaced', 'invalid_text', 'missing_display', 'code_exhausted'] as const;
export type ApprovalWarningReasonWriteRefusal = (typeof APPROVAL_WARNING_REASON_WRITE_REFUSALS)[number];

const APPROVAL_WARNING_REASON_REFUSAL_STATUS: Record<ApprovalWarningReasonWriteRefusal, 400 | 404 | 409> = {
  not_found: 404,
  already_replaced: 409,
  invalid_text: 400,
  missing_display: 409,
  code_exhausted: 409,
};

export class ApprovalWarningReasonWriteRefusedError extends Error {
  public readonly name = 'ApprovalWarningReasonWriteRefusedError';
  public readonly status: 400 | 404 | 409;
  public constructor(
    public readonly code: ApprovalWarningReasonWriteRefusal,
    detail: string,
    /** Non-PII details (a field name, a term) — ⛔ never the text the Super Admin typed. */
    public readonly details: Readonly<Record<string, unknown>> = {},
  ) {
    super(`[approval-warning-reasons] ${code} — ${detail}`);
    this.status = APPROVAL_WARNING_REASON_REFUSAL_STATUS[code];
  }
}
