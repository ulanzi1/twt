// `memorial_withdrawals` — a memorial version taken back (Story 11b.4, migration 0182; `#decision-2026-10-24-398` MA9 /
// MA15 / MA16).
//
// ONE row per submission (the PK), under the pool-keyed advisory lock (MA9):
//   · `family` — the family withdrew a version while it was WITH THE TRUST (before review; ⛔ a reason, ⛔ a note);
//   · `trust`  — the Trust withdrew its own approval of the chain's latest approved version (MA16), on one of MA6's
//     four reasons (`reason_code` NOT NULL iff `trust` — a CHECK), with an optional Tier-1 internal note.
//   · `helpline` — the operator's take-down at the nominee's request (Story 11b.4a, migrations 0186 / 0187, `-412` MP8): written
//     on EVERY un-withdrawn version of the chain; ⛔ no reason, ⛔ no note (CHECKs); `takedown_request_id` NOT NULL iff `helpline`.
//
// APPEND-ONLY save MA15's column grant on `internal_note_ciphertext`. `actor_id` is the member (family) or the staff
// user (trust, helpline); `actor_display` is the staff display-name snapshot, NULL for a family withdrawal.

import { sql } from 'drizzle-orm';
import { foreignKey, pgEnum, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

import { MEMORIAL_FIELD_CLASS } from '../encryption/field-classes.js';
import { piiColumn } from '../encryption/column.js';
import type { PariwarId } from '../ids/index.js';
import { MEMORIAL_WITHDRAWAL_ACTORS } from '../memorial/vocab.js';
import { memorialReviewReasonEnum } from './memorial_review_decisions.js';
import { memorialSubmissions } from './memorial_submissions.js';
import { memorialTakedownRequests } from './memorial_takedown_requests.js';

export const memorialWithdrawalActorEnum = pgEnum('memorial_withdrawal_actor', MEMORIAL_WITHDRAWAL_ACTORS);

export const memorialWithdrawals = pgTable(
  'memorial_withdrawals',
  {
    submissionId: uuid('submission_id').primaryKey(),
    pariwarId: uuid('pariwar_id').notNull().$type<PariwarId>(),
    withdrawnBy: memorialWithdrawalActorEnum('withdrawn_by').notNull(),
    reasonCode: memorialReviewReasonEnum('reason_code'),
    internalNoteCiphertext: piiColumn(1, MEMORIAL_FIELD_CLASS)('internal_note_ciphertext'),
    actorId: uuid('actor_id').notNull(),
    actorDisplay: text('actor_display'),
    /** 0187 — the take-down request a `helpline` withdrawal carries out (NOT NULL iff `helpline`). */
    takedownRequestId: uuid('takedown_request_id'),
    withdrawnAt: timestamp('withdrawn_at', { withTimezone: true, mode: 'date' })
      .notNull()
      .default(sql`clock_timestamp()`),
  },
  (t) => [
    foreignKey({
      name: 'memorial_withdrawals_submission_fk',
      columns: [t.pariwarId, t.submissionId],
      foreignColumns: [memorialSubmissions.pariwarId, memorialSubmissions.submissionId],
    }),
    foreignKey({
      name: 'memorial_withdrawals_takedown_request_fk',
      columns: [t.pariwarId, t.takedownRequestId],
      foreignColumns: [memorialTakedownRequests.pariwarId, memorialTakedownRequests.requestId],
    }),
  ],
);

export type MemorialWithdrawalRow = typeof memorialWithdrawals.$inferSelect;
export type MemorialWithdrawalInsert = typeof memorialWithdrawals.$inferInsert;
