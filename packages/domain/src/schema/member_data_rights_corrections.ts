// `member_data_rights_corrections` — Story 10.21 AC-R2 (migration 0104).
//
// The RECORDED, STAFF-EXECUTED correction process ratified by Decision `2026-08-14-109` clause 2:
// three mechanized rights PLUS this record discharge the `termination_access_block` release gate.
//
// ⛔ THIS IS A RECORD, NOT A WRITE PATH. The ruling authorised a recorded PROCESS. It did NOT authorise
// a general admin member-profile editor, which carries its own RBAC surface, its own PII write-audit
// posture, and its own correction-vs-falsification governance question — none of which has been
// analysed or ruled. ⛔ Nothing in this module writes a member profile field, and nothing should.
//
// ⛔ IT RIDES THE HELPDESK SUBSTRATE. `helpdesk_ticket_id` is NOT NULL (unlike the optional provenance
// elsewhere in this story), because the ruling places the process ON a helpdesk ticket. A correction
// record with no ticket would be a correction that happened outside the ruled process.
//
// Both Tier-1 columns are member-related PII and are scrubbed by `anonymizeMember`.

import { index, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

import { piiColumn } from '../encryption/column.js';
import type { HelpdeskTicketId, MemberId, PariwarId } from '../ids/index.js';

/** What the staff actor did about the request. App-layer enum, DB CHECK-constrained. */
export type CorrectionOutcome = 'recorded' | 'applied' | 'declined';

export const memberDataRightsCorrections = pgTable(
  'member_data_rights_corrections',
  {
    correctionId: uuid('correction_id').defaultRandom().primaryKey(),
    memberId: uuid('member_id').notNull().$type<MemberId>(),
    pariwarId: uuid('pariwar_id').notNull().$type<PariwarId>(),
    helpdeskTicketId: uuid('helpdesk_ticket_id').notNull().$type<HelpdeskTicketId>(),
    /** What the member asked to be corrected — member-authored, relayed at intake. Tier-1. */
    requestedChangeCiphertext: piiColumn(1, 'data_rights_correction')('requested_change_ciphertext'),
    /** What the staff actor actually did — staff-authored. Tier-1. */
    actionTakenCiphertext: piiColumn(1, 'data_rights_correction')('action_taken_ciphertext'),
    outcome: text('outcome').notNull().$type<CorrectionOutcome>(),
    recordedByActorId: uuid('recorded_by_actor_id').notNull(),
    /** Snapshot of `users.display_name` at action time — never email-derived, never client-supplied. */
    recordedByDisplay: text('recorded_by_display').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
  },
  (t) => [
    index('member_data_rights_corrections_member_id_idx').on(t.memberId),
    index('member_data_rights_corrections_pariwar_id_idx').on(t.pariwarId),
  ],
);

export type MemberDataRightsCorrectionRow = typeof memberDataRightsCorrections.$inferSelect;
