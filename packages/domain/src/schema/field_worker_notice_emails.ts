// `field_worker_notice_emails` — the email of a Story 13.1d move-request notice (Story 13.1g, migration 0206; decision `2026-11-12-463`
// AD2; ADR-0045). The Panel's `-443` Q1 A: "Both District Admins are told by email and in the admin console".
//
// ⭐ THE SAME SHAPE AS `memorial_takedown_approver_emails` (0187 — states, CHECKs, the finished-row trigger, the column grants), keyed on the
// NOTICE: `notice_id` is the PRIMARY KEY with ⛔ no default (it IS the notice's id), so a notice is emailed at most ONCE, EVER. ⛔ A
// recipient column: the recipient is the notice row's (I6). `skipped` = the recipient was not eligible (Q4) at a FIRST claim, nothing
// tried. What is KNOWN, ⛔ never `delivered`.
// PII: ⛔ no address and ⛔ no name — ids only; `detail` is a fixed vocabulary. TENANT-ISOLATED; RLS in
// policies/field-worker-notice-emails-rls.ts. Grants `twt_app` ONLY (AD13 — the production jobs login is Row 26's).

import { sql } from 'drizzle-orm';
import { boolean, check, foreignKey, index, integer, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

import type { FieldWorkerNoticeId, PariwarId } from '../ids/index.js';
import { fieldWorkerNotices } from './field_worker_notices.js';

/** What is KNOWN about one notice's email. ⚠ LOCKSTEP with 0206's outcome CHECK. */
export const FIELD_WORKER_NOTICE_EMAIL_OUTCOMES = ['attempting', 'accepted', 'rejected', 'skipped', 'error'] as const;
export type FieldWorkerNoticeEmailOutcome = (typeof FIELD_WORKER_NOTICE_EMAIL_OUTCOMES)[number];

/**
 * ⭐ THE `detail` / `first_detail` GRAMMAR — exactly what `fieldWorkerNoticeEmailDetail` builds (⛔ no `@`, ⛔ no space, ⛔ no free
 * text). ⚠ LOCKSTEP with 0206's two `*_vocabulary_check` CHECKs (a spec pins the catalog's pattern to this string).
 */
export const FIELD_WORKER_NOTICE_EMAIL_DETAIL_PATTERN =
  '^(skipped:not_eligible|(transient|held):[A-Za-z0-9_.]{1,64}|rejected:[0-9]{1,3}:[A-Za-z0-9_.]{1,64}|error:(no_address|invalid_address)|exhausted:(attempting_three_days|recheck_not_eligible))$';

export const fieldWorkerNoticeEmails = pgTable(
  'field_worker_notice_emails',
  {
    /** The notice's own id (⛔ a default) — once per notice, ever. */
    noticeId: uuid('notice_id').primaryKey().$type<FieldWorkerNoticeId>(),
    pariwarId: uuid('pariwar_id').notNull().$type<PariwarId>(),
    outcome: text('outcome').notNull().$type<FieldWorkerNoticeEmailOutcome>(),
    providerMessageId: text('provider_message_id'),
    /** A FIXED vocabulary (`fieldWorkerNoticeEmailDetail`) — ⛔ never provider message text (it can echo the address). */
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
      name: 'field_worker_notice_emails_notice_fk',
      columns: [t.pariwarId, t.noticeId],
      foreignColumns: [fieldWorkerNotices.pariwarId, fieldWorkerNotices.noticeId],
    }),
    index('field_worker_notice_emails_attempting_idx').on(t.agingSince, t.claimedAt).where(sql`"outcome" = 'attempting'`),
    check('field_worker_notice_emails_outcome_check', sql`${t.outcome} IN ('attempting', 'accepted', 'rejected', 'skipped', 'error')`),
    check(
      'field_worker_notice_emails_skipped_detail_check',
      sql`(${t.outcome} = 'skipped') = (${t.detail} IS NOT NULL AND ${t.detail} LIKE 'skipped:%')`,
    ),
    check('field_worker_notice_emails_attempt_count_check', sql`${t.attemptCount} >= 1`),
    check(
      'field_worker_notice_emails_attempting_claimed_check',
      sql`${t.outcome} <> 'attempting' OR (${t.claimedAt} IS NOT NULL AND ${t.claimedByJob} IS NOT NULL)`,
    ),
    check('field_worker_notice_emails_detail_length_check', sql`${t.detail} IS NULL OR char_length(${t.detail}) <= 200`),
    check('field_worker_notice_emails_first_detail_length_check', sql`${t.firstDetail} IS NULL OR char_length(${t.firstDetail}) <= 200`),
    // 0206 — the vocabulary (+ a BEFORE UPDATE trigger freezing a finished row; ⛔ expressible here).
    check(
      'field_worker_notice_emails_detail_vocabulary_check',
      sql`${t.detail} IS NULL OR ${t.detail} ~ ${sql.raw(`'${FIELD_WORKER_NOTICE_EMAIL_DETAIL_PATTERN}'`)}`,
    ),
    check(
      'field_worker_notice_emails_first_detail_vocabulary_check',
      sql`${t.firstDetail} IS NULL OR ${t.firstDetail} ~ ${sql.raw(`'${FIELD_WORKER_NOTICE_EMAIL_DETAIL_PATTERN}'`)}`,
    ),
    check(
      'field_worker_notice_emails_parked_check',
      sql`${t.outcome} <> 'attempting' OR ((${t.claimedByJob} = 'sweep:held') = (${t.parkedAt} IS NOT NULL))`,
    ),
  ],
);

export type FieldWorkerNoticeEmailRow = typeof fieldWorkerNoticeEmails.$inferSelect;
