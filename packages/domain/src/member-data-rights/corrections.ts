// Story 10.21 AC-R2 — the recorded, staff-executed correction process.
//
// ⛔ A RECORD, NOT A WRITE PATH. Decision `2026-08-14-109` clause 2 ratified that three mechanized
// rights PLUS a recorded, staff-executed correction process carried on a helpdesk ticket discharge the
// `termination_access_block` release gate. It did NOT authorise a general admin member-profile editor —
// that carries its own RBAC surface, its own PII write-audit posture, and its own
// correction-vs-falsification governance question, none of which has been analysed or ruled.
// ⛔ Nothing in this module writes a member profile field, and nothing added to it should.

import { desc, eq } from 'drizzle-orm';

import type { Db } from '../db.js';
import type { HelpdeskTicketId, MemberId, PariwarId } from '../ids/index.js';
import {
  type CorrectionOutcome,
  type MemberDataRightsCorrectionRow,
  memberDataRightsCorrections,
} from '../schema/member_data_rights_corrections.js';

export interface RecordCorrectionInput {
  readonly memberId: MemberId;
  readonly pariwarId: PariwarId;
  /** ⛔ REQUIRED. The ruling places this process ON the helpdesk substrate; a correction with no
   *  ticket is a correction that happened outside the ruled process. */
  readonly helpdeskTicketId: HelpdeskTicketId;
  /** Tier-1, encrypted by the caller — what the member asked to be corrected. */
  readonly requestedChangeCiphertext: string;
  /** Tier-1, encrypted by the caller — what the staff actor actually did. */
  readonly actionTakenCiphertext: string;
  readonly outcome: CorrectionOutcome;
  readonly recordedByActorId: string;
  /** Snapshot of `users.display_name` at action time — ⛔ never email-derived, never client-supplied. */
  readonly recordedByDisplay: string;
}

/** Append a correction record. Append-only by convention: a later correction is a NEW row, never an
 *  edit of an earlier one — the same posture as every other record-of-an-act in this system. */
export async function recordCorrection(
  db: Db,
  input: RecordCorrectionInput,
): Promise<MemberDataRightsCorrectionRow> {
  const [row] = await db
    .insert(memberDataRightsCorrections)
    .values({
      memberId: input.memberId,
      pariwarId: input.pariwarId,
      helpdeskTicketId: input.helpdeskTicketId,
      requestedChangeCiphertext: input.requestedChangeCiphertext,
      actionTakenCiphertext: input.actionTakenCiphertext,
      outcome: input.outcome,
      recordedByActorId: input.recordedByActorId,
      recordedByDisplay: input.recordedByDisplay,
    })
    .returning();
  if (!row) throw new Error('recordCorrection: INSERT returning produced no row');
  return row;
}

/** A member's correction history, newest first. ⛔ Keyed on `member_id` — never on the ticket (AC4). */
export async function listCorrectionsForMember(
  db: Db,
  memberId: MemberId,
): Promise<MemberDataRightsCorrectionRow[]> {
  return db
    .select()
    .from(memberDataRightsCorrections)
    .where(eq(memberDataRightsCorrections.memberId, memberId))
    .orderBy(desc(memberDataRightsCorrections.createdAt));
}
