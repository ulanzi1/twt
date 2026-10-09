// The STAFF EMAIL record of a `-239` suspicion refusal — Story 6.25 (Task 1; AC8), migration 0152 (`2026-10-09-299` RE2, RE4,
// RE5, RE5-bis, RE11) + 0153 (code review round 3 — the `detail` vocabulary CHECKs and the finished-row trigger).
//
//   · `claim_suspicion_staff_emails` — ONE row per (claim, recipient), EVER: `-262` FQ3 A's email to every Pariwar Admin of the
//                                      claim's Pariwar; ONE claim-level `no_target` row (recipient NULL) when ⛔ admin is
//                                      eligible (RE4). What is KNOWN, ⛔ never `delivered` (`accepted` ⛔ means delivered).
//
// A NEW, email-shaped outcome set (RE5 — ⛔ 0138's SMS words). ⛔ Nothing here refuses, closes, approves or decides a claim.
// PII: ⛔ no address and ⛔ no name — the recipient is a `user_id`; `detail` is a fixed vocabulary.
// TENANT-ISOLATED; RLS in policies/claim-suspicion-staff-email-rls.ts.

import { sql } from 'drizzle-orm';
import { boolean, check, foreignKey, index, integer, pgTable, text, timestamp, unique, uuid } from 'drizzle-orm/pg-core';

import type { ClaimId, PariwarId, UserId } from '../ids/index.js';
import { claims } from './claims.js';
import { users } from './users.js';

/** What is KNOWN about one (claim, recipient) email. ⚠ LOCKSTEP with 0152's outcome CHECK (an exact-set spec pins it). */
export const SUSPICION_STAFF_EMAIL_OUTCOMES = ['attempting', 'accepted', 'rejected', 'no_target', 'error'] as const;
export type SuspicionStaffEmailOutcome = (typeof SUSPICION_STAFF_EMAIL_OUTCOMES)[number];

/**
 * ⭐ THE `detail` / `first_detail` GRAMMAR — exactly what `suspicionStaffEmailDetail` builds (⛔ `@`, ⛔ a space, ⛔ free text).
 * ⚠ LOCKSTEP with 0153's two `*_vocabulary_check` CHECKs (a spec pins the catalog's pattern to this string) and asserted by both
 * writers before they UPDATE (code review round 3, Decision 2 A).
 */
export const SUSPICION_STAFF_EMAIL_DETAIL_PATTERN =
  '^(no_pariwar_admin|(transient|held):[A-Za-z0-9_.]{1,64}|rejected:[0-9]{1,3}:[A-Za-z0-9_.]{1,64}|error:(no_address|invalid_address)|exhausted:(attempting_three_days|recheck_(refusal_not_standing|recipient_not_eligible|recipients_exist|claim_has_rows)))$';

export const claimSuspicionStaffEmails = pgTable(
  'claim_suspicion_staff_emails',
  {
    noticeId: uuid('notice_id').defaultRandom().primaryKey(),
    pariwarId: uuid('pariwar_id').notNull().$type<PariwarId>(),
    claimCaseId: uuid('claim_case_id').notNull().$type<ClaimId>(),
    /** The Pariwar Admin emailed — NULL only on the claim-level `no_target` row (RE4). ⛔ Never an address. */
    recipientUserId: uuid('recipient_user_id')
      .$type<UserId>()
      .references(() => users.id),
    outcome: text('outcome').notNull().$type<SuspicionStaffEmailOutcome>(),
    /** SES's `MessageId` or ZeptoMail's `request_id`. */
    providerMessageId: text('provider_message_id'),
    /** A FIXED vocabulary (`suspicionStaffEmailDetail`) — ⛔ never provider message text (it can echo the address). */
    detail: text('detail'),
    /** The FIRST transient detail of a retried attempt (the at-least-once double is recorded, ⛔ never hidden). */
    firstDetail: text('first_detail'),
    attemptCount: integer('attempt_count').notNull().default(1),
    /** RE5 / RE5-bis — an attempt MAY have reached the provider and been accepted. Set TRUE, never back. */
    mayHaveSent: boolean('may_have_sent').notNull().default(false),
    claimedAt: timestamp('claimed_at', { withTimezone: true, mode: 'date' }),
    /** The pg-boss job id that holds an `attempting` row (a retry of the SAME job keeps it). */
    claimedByJob: text('claimed_by_job'),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull().default(sql`clock_timestamp()`),
    /** 0153 — the give-up's anchor (three IST days from here, ⛔ `created_at`); reset when a PARKED row is re-claimed (`-300`). */
    agingSince: timestamp('aging_since', { withTimezone: true, mode: 'date' }).notNull().default(sql`clock_timestamp()`),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }).notNull().default(sql`clock_timestamp()`),
  },
  (t) => [
    foreignKey({
      name: 'claim_suspicion_staff_emails_claim_case_fk',
      columns: [t.pariwarId, t.claimCaseId],
      foreignColumns: [claims.pariwarId, claims.claimCaseId],
    }).onDelete('cascade'),
    // ⚠ A UNIQUE CONSTRAINT (⛔ `uniqueIndex`): in drizzle 0.45 `nullsNotDistinct()` exists ONLY on the constraint builder
    // (`feature_flag_versions.ts`) — and WITHOUT it the NULL-recipient `no_target` row would not be once-ever.
    unique('claim_suspicion_staff_emails_claim_recipient_uq').on(t.pariwarId, t.claimCaseId, t.recipientUserId).nullsNotDistinct(),
    index('claim_suspicion_staff_emails_attempting_idx').on(t.agingSince, t.claimedAt).where(sql`"outcome" = 'attempting'`),
    check(
      'claim_suspicion_staff_emails_outcome_check',
      sql`${t.outcome} IN ('attempting', 'accepted', 'rejected', 'no_target', 'error')`,
    ),
    check('claim_suspicion_staff_emails_no_target_recipient_check', sql`(${t.recipientUserId} IS NULL) = (${t.outcome} = 'no_target')`),
    check('claim_suspicion_staff_emails_attempt_count_check', sql`${t.attemptCount} >= 1`),
    check(
      'claim_suspicion_staff_emails_attempting_claimed_check',
      sql`${t.outcome} <> 'attempting' OR (${t.claimedAt} IS NOT NULL AND ${t.claimedByJob} IS NOT NULL)`,
    ),
    check('claim_suspicion_staff_emails_detail_length_check', sql`${t.detail} IS NULL OR char_length(${t.detail}) <= 200`),
    check(
      'claim_suspicion_staff_emails_first_detail_length_check',
      sql`${t.firstDetail} IS NULL OR char_length(${t.firstDetail}) <= 200`,
    ),
    // 0153 — the vocabulary (+ a BEFORE UPDATE trigger freezing a finished row; ⛔ expressible here).
    check(
      'claim_suspicion_staff_emails_detail_vocabulary_check',
      sql`${t.detail} IS NULL OR ${t.detail} ~ ${sql.raw(`'${SUSPICION_STAFF_EMAIL_DETAIL_PATTERN}'`)}`,
    ),
    check(
      'claim_suspicion_staff_emails_first_detail_vocabulary_check',
      sql`${t.firstDetail} IS NULL OR ${t.firstDetail} ~ ${sql.raw(`'${SUSPICION_STAFF_EMAIL_DETAIL_PATTERN}'`)}`,
    ),
  ],
);

export type ClaimSuspicionStaffEmailRow = typeof claimSuspicionStaffEmails.$inferSelect;
