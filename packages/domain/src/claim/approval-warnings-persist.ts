// The District Admin's reason for a LATE warning — Story 6.23a (Task 4; NW14; `-277` Q3 B, the District Admin's half;
// fact 3; AC7). Transport-free.
//
// `-277` Q3 B: a warning that first appears AFTER the District Admin approved (a re-reviewed certificate moves the date
// of death; a redetermination discards a version) needs the District Admin's reason and note too — and 6.23b makes the
// final approval WAIT for it (⛔ never a refusal). THIS module is the record half.
//
// ⭐ Its OWN record (fact 3) — ⛔ never a revision: `reversed` is outside `reviseDecision`'s window, a warned approval
// is ⛔ never revised (NW7), and a note is ⛔ never replaced (NW18). ⇒ each late reason is a NEW
// `district_admin_late_reason` row covering ALL current keys, with its own note; the earlier rows stay.
// ⛔ No event, ⛔ no state change, ⛔ no decision row (the `return_to_district_admin` metadata-only shape).
//
// Recordable in `verifier_approved`, `reversed` (District Admin approved → final vote denied → appeal reversed —
// appeals ⛔ never touch `claim_verifier_decisions`, so the approval is still live), defensively `state_trustee_freeze`
// (⛔ never a resting state), and `state_trustee_approved` (`-280` — an R9 session routed from there is voted by the
// very people who record late reasons; without it such an approval could stall with ⛔ no one able to answer).
//
// ⭐ `nothing_uncovered` is judged FOR THE RECORDER (`-279` A1) — see `lateWarningNothingUncoveredFor`.
// ⚠ ACCEPTED RESIDUAL (round 4): this module knows ⛔ nothing of R9, so a live R9 approve voter may record — their
// reason ⛔ never counts at finalize (6.23b); in a Pariwar where EVERY `claim.approve` holder at the district is a live
// approve voter or the finalizer, ⛔ nobody can answer — the exit is a changed vote or a re-run session (6.23b's
// deferred item). A late-reason recorder is ⛔ not excluded from reviewing the family's appeal (`-279` A11).

import type pg from 'pg';

import { bindScopedDb } from '../db.js';
import type { ClaimId, PariwarId } from '../ids/index.js';
import { lockActiveApprovalWarningReason } from './approval-warning-reasons.js';
import {
  type ApprovalWarningKind,
  insertClaimWarningApprovalRecord,
  lateWarningNothingUncoveredFor,
  readClaimApprovalWarnings,
} from './approval-warnings.js';
import { assertDeathCertificateAcceptedForApproval } from './death-certificate-approval.js';
import {
  ApprovalWarningReasonRequiredError,
  LateWarningReasonRefusedError,
  WarningReasonUnavailableError,
} from './errors.js';
import { acquireDecisionLock, getLiveDecision, lockClaim } from './verifier-decision-persist.js';

/** NW14's states (`-280` added the fourth). */
export const LATE_WARNING_REASON_RECORDABLE_STATES = [
  'verifier_approved',
  'reversed',
  'state_trustee_freeze',
  'state_trustee_approved',
] as const;

export interface RecordLateWarningReasonInput {
  readonly claimCaseId: ClaimId;
  readonly pariwarId: PariwarId;
  readonly warningReasonCode: string;
  /** ALREADY-ENCRYPTED Tier-1 note (field class `claim_warning_approval`) — the caller encrypts first. */
  readonly noteCiphertext: string;
  readonly actorId: string;
  /** The recorder's display name, resolved server-side ([[project_admin_display_name_attribution]]). */
  readonly actorDisplay: string;
}

export interface RecordLateWarningReasonResult {
  readonly recordId: string;
  readonly coveredKeyCount: number;
  readonly kinds: readonly ApprovalWarningKind[];
}

/**
 * NW14 — record a reason and a note for the warnings that appeared after the District Admin's approval. Under the
 * verifier advisory lock + the claim row lock (the `adjudicateClaim` order, through its exported helpers). Refused
 * (typed → 409), in order: ⛔ claim (`not_found` → 404); the live verifier decision ⛔ `approved`
 * (`no_district_admin_approval`); a state outside the four (`not_recordable_state`); the certificate / determination
 * ⛔ current (`assertDeathCertificateAcceptedForApproval`'s own 409); ⛔ live determination (`determination_required`
 * — Trap 2: the certificate gate PASSES with none); the reason ⛔ active (Trap 16); `nothing_uncovered` for THIS recorder.
 */
export async function recordLateWarningReason(
  client: pg.PoolClient,
  input: RecordLateWarningReasonInput,
): Promise<RecordLateWarningReasonResult> {
  if (input.actorDisplay.trim() === '') {
    // Typed, ⛔ not a raw `Error` (re-review 2026-10-05) — matches the sibling guard for the identical
    // condition, `assertWriter` in `approval-warning-reasons.ts`. Unreachable via the only wired caller
    // (the API resolves display name first, [[project_admin_display_name_attribution]]) — a backstop.
    throw new LateWarningReasonRefusedError(input.claimCaseId, 'missing_display', 'a late reason is attributed to a named person');
  }
  // The backstop — the contract's 400 is the real enforcement.
  if (input.noteCiphertext.trim() === '') throw new ApprovalWarningReasonRequiredError(input.claimCaseId, [], 'note');
  await acquireDecisionLock(client, input.pariwarId, input.claimCaseId);
  const db = bindScopedDb(client);
  const claimRow = await lockClaim(db, input.pariwarId, input.claimCaseId);
  if (!claimRow) throw new LateWarningReasonRefusedError(input.claimCaseId, 'not_found', 'no such claim in this Pariwar');

  const live = await getLiveDecision(db, input.pariwarId, input.claimCaseId);
  if (!live || live.outcome !== 'approved') {
    throw new LateWarningReasonRefusedError(
      input.claimCaseId,
      'no_district_admin_approval',
      'the District Admin\'s approval is not the live decision on this claim',
    );
  }
  if (!(LATE_WARNING_REASON_RECORDABLE_STATES as readonly string[]).includes(claimRow.currentState)) {
    throw new LateWarningReasonRefusedError(
      input.claimCaseId,
      'not_recordable_state',
      `a late reason is recorded in ${LATE_WARNING_REASON_RECORDABLE_STATES.join(', ')} — the claim is '${claimRow.currentState}'`,
    );
  }
  await assertDeathCertificateAcceptedForApproval(db, input.pariwarId, input.claimCaseId);
  const warnings = await readClaimApprovalWarnings(db, input.pariwarId, input.claimCaseId);
  if (warnings.postDeath === 'awaiting_determination') {
    throw new LateWarningReasonRefusedError(
      input.claimCaseId,
      'determination_required',
      'the nominee determination must be recorded against the accepted death certificate first',
    );
  }
  const reason = await lockActiveApprovalWarningReason(db, input.pariwarId, input.warningReasonCode);
  if (reason === null) throw new WarningReasonUnavailableError(input.warningReasonCode);
  if (lateWarningNothingUncoveredFor(warnings, input.actorId)) {
    throw new LateWarningReasonRefusedError(
      input.claimCaseId,
      'nothing_uncovered',
      'every warning that appeared after the approval is already answered by your own record',
    );
  }

  const { recordId } = await insertClaimWarningApprovalRecord(db, {
    pariwarId: input.pariwarId,
    claimCaseId: input.claimCaseId,
    deceasedMemberId: claimRow.deceasedMemberId,
    step: 'district_admin_late_reason',
    verifierDecisionId: live.decisionId,
    reason,
    keys: warnings.keys,
    noteCiphertext: input.noteCiphertext,
    actorId: input.actorId,
    actorDisplay: input.actorDisplay,
  });
  return { recordId, coveredKeyCount: warnings.keys.length, kinds: warnings.kinds };
}
