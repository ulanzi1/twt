// The District Admin's MEMBERSHIP CHECK writer — Story 6.39 (Task 3.2; DL1, DL2, DL3, DL4, DL8, DL11; AC4, AC9).
// Transport-free.
//
// `2026-10-31-424` Q1 (a) C: an identity nobody has checked *"is checked first, by staff, from the death documents
// and the details on record, before any drive opens."* `2026-10-31-430` Q1 B: *"staff compare the date of death on
// the certificate with the date the fee was paid, and ⛔ drive opens if the fee was paid after the death."*
// The API handler COMPUTES the fee comparison (it opens the certificate's date) and passes the outcome with the
// two ids it was computed from; the staff member JUDGES the identity. This writer VALIDATES and RECORDS; it ⛔ never
// decides, and it ⛔ never turns a failing check into a denial (N5).
//
// ── The order ────────────────────────────────────────────────────────────────────────────────────────────────────
//   (0) the SHAPE — display; `not_confirmed` ⇔ a reason AND a note: refused before any read;
//   (1) the claim-row `FOR UPDATE` lock — the ONE lock, as the certificate review writer takes it, so a review, a
//       check and an approval of one claim are serialized;
//   (2) the WINDOW — `CLAIM_REVIEW_WINDOW_STATES`, the certificate review's own window (DL10);
//   (3) the CERTIFICATE — the claim's current review must be ACCEPTED, and be the one the comparison was computed
//       against (N4): re-asserted HERE, under the lock (the 6.21a D8 pattern);
//   (4) the RECEIPT — the joining receipt must still be the one the comparison was computed against (DL3);
//   (5) the IDENTITY — re-read under the lock (DL4): an unchecked identity must be judged, a checked one must not;
//   (6) supersede the live check (`re_checked`), insert the new one, and emit `claim.membership_checked` — ONE
//       transaction.
//
// ⛔ PII (N7): the note arrives ALREADY ENCRYPTED; ⛔ date reaches this file at all — only the comparison's outcome
// code. ⛔ No ciphertext is opened here (the no-comparison fence, this story's `it` block).

import { and, eq, isNull, sql } from 'drizzle-orm';
import type pg from 'pg';

import { bindScopedDb } from '../db.js';
import type {
  ClaimId,
  ClaimMembershipCheckId,
  DeathCertificateReviewId,
  PariwarId,
  VyawasthaShulkReceiptId,
} from '../ids/index.js';
import {
  type MembershipCheckFeeOutcome,
  type MembershipCheckIdentityOutcome,
  type MembershipCheckIdentityReason,
  MEMBERSHIP_CHECK_FEE_OUTCOMES,
  MEMBERSHIP_CHECK_IDENTITY_OUTCOMES,
  MEMBERSHIP_CHECK_IDENTITY_REASONS,
  claimMembershipChecks,
} from '../schema/claim_membership_checks.js';
import { claims } from '../schema/claims.js';
import { deathCertificateStatus, readDeathCertificateSnapshot } from './death-certificate-approval.js';
import { MembershipCheckRefusedError } from './errors.js';
import type { ClaimEventActor } from './events.js';
import { isIdentityCheckRequired, readDeceasedKycStanding } from './membership-check-approval.js';
import { readJoiningFeeReceipt } from './membership-check-read.js';
import { projectClaimState } from './project.js';
import { CLAIM_REVIEW_WINDOW_STATES } from './review-window.js';

/**
 * DL10 — the states in which a membership check may be recorded: the certificate review's own window (the check is
 * computed against an accepted review, so it is only useful where a review can still be made or stand).
 */
export const MEMBERSHIP_CHECK_RECORDABLE_STATES = CLAIM_REVIEW_WINDOW_STATES;

/** Is the claim in the membership check's window? */
export function isInMembershipCheckWindow(claimState: string): boolean {
  return (MEMBERSHIP_CHECK_RECORDABLE_STATES as readonly string[]).includes(claimState);
}

export interface RecordMembershipCheckInput {
  readonly claimCaseId: ClaimId;
  readonly pariwarId: PariwarId;
  /** The ACCEPTED certificate review the handler computed the comparison against — re-asserted under the lock. */
  readonly computedAgainstReviewId: string;
  /** The joining receipt the handler compared — re-asserted under the lock. */
  readonly feeReceiptId: string;
  /** The comparison's outcome, computed by the handler (N3). ⛔ Never from the request. */
  readonly feeOutcome: MembershipCheckFeeOutcome;
  /** The staff member's judgment — or `not_required` when the identity is already checked. */
  readonly identityOutcome: MembershipCheckIdentityOutcome;
  /** `not_confirmed` only. */
  readonly identityReason: MembershipCheckIdentityReason | null;
  /** The note, Tier-1-encrypted by the handler — required for `not_confirmed`, optional otherwise. */
  readonly noteCiphertext: string | null;
  readonly actorId: string;
  /** Snapshotted server-side by the caller — ⛔ never email-derived, ⛔ never from the request. */
  readonly actorDisplay: string;
  readonly actor: ClaimEventActor;
  readonly auditId?: string;
}

export interface RecordMembershipCheckResult {
  readonly checkId: ClaimMembershipCheckId;
  readonly deathCertificateReviewId: DeathCertificateReviewId;
  readonly feeReceiptId: VyawasthaShulkReceiptId;
  readonly feeOutcome: MembershipCheckFeeOutcome;
  readonly identityRequired: boolean;
  readonly identityOutcome: MembershipCheckIdentityOutcome;
  readonly identityReason: MembershipCheckIdentityReason | null;
  readonly supersededCheckId: ClaimMembershipCheckId | null;
  readonly eventVersion: number;
}

/** The parts of a check that can be judged before any read (step 0). */
export type MembershipCheckShape = Pick<
  RecordMembershipCheckInput,
  'claimCaseId' | 'actorDisplay' | 'identityOutcome' | 'identityReason' | 'noteCiphertext'
> & {
  /** Absent when the API handler runs this check BEFORE it has computed the comparison; the writer always passes it. */
  readonly feeOutcome?: MembershipCheckFeeOutcome;
};

/**
 * Step (0) — the SHAPE, refused before any read: a named District Admin; known outcome codes; `not_confirmed` ⇔ one
 * of the four reasons AND a note. Exported so the API handler runs the SAME check FIRST (before it opens the
 * certificate's date), keeping ONE refusal order on the wire.
 *
 * @throws MembershipCheckRefusedError (`missing_display` | `invalid_outcome`)
 */
export function assertMembershipCheckShape(input: MembershipCheckShape): void {
  const refuse = (reason: ConstructorParameters<typeof MembershipCheckRefusedError>[1], detail: string) =>
    new MembershipCheckRefusedError(input.claimCaseId, reason, detail);
  if (input.actorDisplay.trim() === '') {
    throw refuse('missing_display', 'a check is attributed to a named District Admin or not recorded');
  }
  if (
    (input.feeOutcome !== undefined && !(MEMBERSHIP_CHECK_FEE_OUTCOMES as readonly string[]).includes(input.feeOutcome)) ||
    !(MEMBERSHIP_CHECK_IDENTITY_OUTCOMES as readonly string[]).includes(input.identityOutcome)
  ) {
    throw refuse('invalid_outcome', 'an unknown outcome');
  }
  if (input.identityOutcome === 'not_confirmed') {
    if (
      input.identityReason === null ||
      !(MEMBERSHIP_CHECK_IDENTITY_REASONS as readonly string[]).includes(input.identityReason)
    ) {
      throw refuse('invalid_outcome', 'an identity that is not confirmed needs one of the four reasons');
    }
    // Plaintext non-emptiness is the handler's check — this catches a caller that passed no note at all.
    if (input.noteCiphertext === null || input.noteCiphertext.trim() === '') {
      throw refuse('invalid_outcome', 'an identity that is not confirmed needs a note');
    }
  } else if (input.identityReason !== null) {
    throw refuse('invalid_outcome', 'a reason is recorded only when the identity is not confirmed');
  }
  if (input.noteCiphertext !== null && input.noteCiphertext.trim() === '') {
    throw refuse('invalid_outcome', 'an empty note is not a note');
  }
}

/**
 * Record the District Admin's membership check of a claim. See the header for the order of every guard.
 *
 * @throws MembershipCheckRefusedError (→ 409; `not_found` → 404; `invalid_outcome` → 400)
 */
export async function recordMembershipCheck(
  client: pg.PoolClient,
  input: RecordMembershipCheckInput,
): Promise<RecordMembershipCheckResult> {
  const refuse = (reason: ConstructorParameters<typeof MembershipCheckRefusedError>[1], detail: string) =>
    new MembershipCheckRefusedError(input.claimCaseId, reason, detail);

  // (0) The shape.
  assertMembershipCheckShape(input);

  const db = bindScopedDb(client);
  // Ids are lower-cased: the contract's `z.string().uuid()` is unbranded, and stored ids are lower-case.
  const computedAgainst = input.computedAgainstReviewId.toLowerCase();
  const comparedReceipt = input.feeReceiptId.toLowerCase();

  // (1) The claim-row lock.
  const [claimRow] = await db
    .select()
    .from(claims)
    .where(and(eq(claims.pariwarId, input.pariwarId), eq(claims.claimCaseId, input.claimCaseId)))
    .for('update');
  if (!claimRow) throw refuse('not_found', 'no such claim in this Pariwar');
  const state = claimRow.currentState as string;

  // (2) The window.
  if (!isInMembershipCheckWindow(state)) {
    throw refuse('window_closed', `a membership check cannot be recorded while the claim is '${state}'`);
  }

  // (3) The certificate — accepted, and still the one the comparison was computed against (N4).
  const snapshot = await readDeathCertificateSnapshot(db, input.pariwarId, input.claimCaseId);
  if (deathCertificateStatus(snapshot) !== 'accepted') {
    throw refuse('certificate_not_accepted', 'the claim has no current accepted death certificate to compare against');
  }
  const currentReviewId = snapshot.currentReview!.reviewId;
  if ((currentReviewId as string).toLowerCase() !== computedAgainst) {
    throw refuse('stale', 'the death certificate was reviewed again after the check was opened — open it again');
  }

  // (4) The joining receipt — still the one the comparison used (DL3).
  const receipt = await readJoiningFeeReceipt(db, input.pariwarId, claimRow.deceasedMemberId);
  if (receipt === null) {
    throw refuse('no_fee_receipt', "the member's joining receipt cannot be identified");
  }
  if ((receipt.receiptId as string).toLowerCase() !== comparedReceipt) {
    throw refuse('stale', 'the joining receipt changed after the check was opened — open it again');
  }

  // (5) The identity half — re-read under the lock (DL4): judged iff nobody has checked it.
  const identityRequired = isIdentityCheckRequired(
    await readDeceasedKycStanding(db, input.pariwarId, claimRow.deceasedMemberId),
  );
  if (identityRequired && input.identityOutcome === 'not_required') {
    throw refuse('invalid_outcome', 'nobody has checked this identity — it must be confirmed or not confirmed');
  }
  if (!identityRequired && input.identityOutcome !== 'not_required') {
    throw refuse('invalid_outcome', 'this identity is already checked — there is nothing to judge');
  }

  // (6) Supersede the live check, insert the new one, emit the identity annotation.
  const superseded = await db
    .update(claimMembershipChecks)
    .set({ supersededAt: sql`now()`, supersededReason: 're_checked' })
    .where(
      and(
        eq(claimMembershipChecks.pariwarId, input.pariwarId),
        eq(claimMembershipChecks.claimCaseId, input.claimCaseId),
        isNull(claimMembershipChecks.supersededAt),
      ),
    )
    .returning({ id: claimMembershipChecks.checkId });
  const supersededCheckId = superseded[0]?.id ?? null;

  const identityReason = input.identityOutcome === 'not_confirmed' ? input.identityReason : null;
  const [row] = await db
    .insert(claimMembershipChecks)
    .values({
      claimCaseId: input.claimCaseId,
      pariwarId: input.pariwarId,
      deceasedMemberId: claimRow.deceasedMemberId,
      deathCertificateReviewId: currentReviewId,
      feeReceiptId: receipt.receiptId,
      feeOutcome: input.feeOutcome,
      identityRequired,
      identityOutcome: input.identityOutcome,
      identityReason,
      noteCiphertext: input.noteCiphertext,
      decidedByActorId: input.actorId,
      decidedByDisplay: input.actorDisplay,
    })
    .returning({ checkId: claimMembershipChecks.checkId });
  const checkId = row!.checkId;

  const projected = await projectClaimState(client, {
    claimCaseId: input.claimCaseId,
    pariwarId: input.pariwarId,
    deceasedMemberId: claimRow.deceasedMemberId,
    intakeChannels: claimRow.intakeChannels,
    claimantActorId: claimRow.claimantActorId,
    eventType: 'claim.membership_checked',
    payload: {
      from_state: state,
      to_state: state,
      trigger: 'membership_check',
      actor: input.actor,
      check_id: checkId,
      death_certificate_review_id: currentReviewId,
      fee_outcome: input.feeOutcome,
      identity_required: identityRequired,
      identity_outcome: input.identityOutcome,
      identity_reason: identityReason,
    },
    actorId: input.actorId,
    ...(input.auditId !== undefined ? { auditId: input.auditId } : {}),
  });

  return {
    checkId,
    deathCertificateReviewId: currentReviewId,
    feeReceiptId: receipt.receiptId,
    feeOutcome: input.feeOutcome,
    identityRequired,
    identityOutcome: input.identityOutcome,
    identityReason,
    supersededCheckId,
    eventVersion: projected.eventVersion,
  };
}
