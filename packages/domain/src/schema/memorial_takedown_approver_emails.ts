// `memorial_takedown_approver_emails` — the approver email of a memorial take-down (Story 11b.4a, migration 0187;
// `#decision-2026-10-27-412` MP10 (b) / MP11; ADR-0043).
//
// `-392` item 5 (Trustee-ratified, kept by `-395`): the approver is emailed when a memorial is taken down; MP10 (b): every distinct
// approver of every approved version the take-down withdrew; `-411` item 5: an approver who has left is ⛔ not emailed and ⛔ no
// one else is told. ⭐ THE SAME SHAPE AS `claim_suspicion_staff_emails` (0152 + 0153 + 0154 — states, grants, CHECKs, the
// finished-row trigger), keyed on the request: ONE row per (request, approver), EVER; ONE request-level `no_target` row
// (recipient NULL) when ⛔ no approver is eligible. What is KNOWN, ⛔ never `delivered`.
// PII: ⛔ no address and ⛔ no name — the recipient is a `user_id`; `detail` is a fixed vocabulary.
// TENANT-ISOLATED; RLS in policies/memorial-takedown-rls.ts.

import { sql } from 'drizzle-orm';
import { boolean, check, foreignKey, index, integer, pgTable, text, timestamp, unique, uuid } from 'drizzle-orm/pg-core';

import type { PariwarId, UserId } from '../ids/index.js';
import { memorialTakedownRequests } from './memorial_takedown_requests.js';
import { users } from './users.js';

/** What is KNOWN about one (request, recipient) email. ⚠ LOCKSTEP with 0187's outcome CHECK. */
export const MEMORIAL_TAKEDOWN_APPROVER_EMAIL_OUTCOMES = ['attempting', 'accepted', 'rejected', 'no_target', 'error'] as const;
export type MemorialTakedownApproverEmailOutcome = (typeof MEMORIAL_TAKEDOWN_APPROVER_EMAIL_OUTCOMES)[number];

/**
 * ⭐ THE `detail` / `first_detail` GRAMMAR — exactly what `memorialTakedownApproverEmailDetail` builds (⛔ no `@`, ⛔ no space,
 * ⛔ no free text). ⚠ LOCKSTEP with 0187's two `*_vocabulary_check` CHECKs (a spec pins the catalog's pattern to this string).
 */
export const MEMORIAL_TAKEDOWN_APPROVER_EMAIL_DETAIL_PATTERN =
  '^(no_approver|(transient|held):[A-Za-z0-9_.]{1,64}|rejected:[0-9]{1,3}:[A-Za-z0-9_.]{1,64}|error:(no_address|invalid_address)|exhausted:(attempting_three_days|recheck_(not_taken_down|recipient_not_eligible|recipients_exist|request_has_rows)))$';

export const memorialTakedownApproverEmails = pgTable(
  'memorial_takedown_approver_emails',
  {
    noticeId: uuid('notice_id').defaultRandom().primaryKey(),
    pariwarId: uuid('pariwar_id').notNull().$type<PariwarId>(),
    requestId: uuid('request_id').notNull(),
    /** The approver emailed — NULL only on the request-level `no_target` row (MP11). ⛔ Never an address. */
    recipientUserId: uuid('recipient_user_id')
      .$type<UserId>()
      .references(() => users.id),
    outcome: text('outcome').notNull().$type<MemorialTakedownApproverEmailOutcome>(),
    providerMessageId: text('provider_message_id'),
    /** A FIXED vocabulary (`memorialTakedownApproverEmailDetail`) — ⛔ never provider message text (it can echo the address). */
    detail: text('detail'),
    firstDetail: text('first_detail'),
    attemptCount: integer('attempt_count').notNull().default(1),
    mayHaveSent: boolean('may_have_sent').notNull().default(false),
    claimedAt: timestamp('claimed_at', { withTimezone: true, mode: 'date' }),
    claimedByJob: text('claimed_by_job'),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull().default(sql`clock_timestamp()`),
    agingSince: timestamp('aging_since', { withTimezone: true, mode: 'date' }).notNull().default(sql`clock_timestamp()`),
    parkedAt: timestamp('parked_at', { withTimezone: true, mode: 'date' }),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }).notNull().default(sql`clock_timestamp()`),
  },
  (t) => [
    foreignKey({
      name: 'memorial_takedown_approver_emails_request_fk',
      columns: [t.pariwarId, t.requestId],
      foreignColumns: [memorialTakedownRequests.pariwarId, memorialTakedownRequests.requestId],
    }),
    // ⚠ A UNIQUE CONSTRAINT with NULLS NOT DISTINCT — else the NULL-recipient `no_target` row would not be once-ever.
    unique('memorial_takedown_approver_emails_request_recipient_uq').on(t.pariwarId, t.requestId, t.recipientUserId).nullsNotDistinct(),
    index('memorial_takedown_approver_emails_attempting_idx').on(t.agingSince, t.claimedAt).where(sql`"outcome" = 'attempting'`),
    check(
      'memorial_takedown_approver_emails_outcome_check',
      sql`${t.outcome} IN ('attempting', 'accepted', 'rejected', 'no_target', 'error')`,
    ),
    check('memorial_takedown_approver_emails_no_target_recipient_check', sql`(${t.recipientUserId} IS NULL) = (${t.outcome} = 'no_target')`),
    check('memorial_takedown_approver_emails_attempt_count_check', sql`${t.attemptCount} >= 1`),
    check(
      'memorial_takedown_approver_emails_attempting_claimed_check',
      sql`${t.outcome} <> 'attempting' OR (${t.claimedAt} IS NOT NULL AND ${t.claimedByJob} IS NOT NULL)`,
    ),
    check('memorial_takedown_approver_emails_detail_length_check', sql`${t.detail} IS NULL OR char_length(${t.detail}) <= 200`),
    check(
      'memorial_takedown_approver_emails_first_detail_length_check',
      sql`${t.firstDetail} IS NULL OR char_length(${t.firstDetail}) <= 200`,
    ),
    check(
      'memorial_takedown_approver_emails_parked_check',
      sql`${t.outcome} <> 'attempting' OR ((${t.claimedByJob} = 'sweep:held') = (${t.parkedAt} IS NOT NULL))`,
    ),
  ],
);

export type MemorialTakedownApproverEmailRow = typeof memorialTakedownApproverEmails.$inferSelect;
