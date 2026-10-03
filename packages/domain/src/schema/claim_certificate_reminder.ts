// The REPLACEMENT-CERTIFICATE REMINDER — Story 6.19d (Task 1; AC1–AC5, AC8). Three tables, migrations 0137–0139
// (`2026-10-03-276` CR1 — ⛔ never a kind on `claim_correction_runs`; it SUPERSEDES `-266` §1's two 6.19d sentences):
//
//   · `claim_certificate_reminder_runs`    — ONE wait for a certificate: `rejected` (anchored on the rejected upload +
//                                            the review that rejected it) or `missing`; its IST day 0 and how it
//                                            ended. ⭐ ONE open run per CLAIM; ONE run per rejected upload; ONE
//                                            `missing` run per claim, ever.
//   · `claim_certificate_reminders`        — ONE row per attempt at a (run, slot, recipient, purpose, person): what is
//                                            KNOWN, ⛔ never `delivered` for an accept.
//   · `claim_certificate_reminder_letters` — the ONE posted letter per person per CLAIM (`-259` detail 1; `-275` Q1 A).
//
// ⭐ The days are the Panel's: `-250` #5's correction days to 84 (through `-259` cl.1), then 120, 150, 180 (`-260` G6).
// ⛔ Nothing here refuses, closes, approves or time-limits a claim (invariant 1), and ⛔ no 6.19b/6.19c reader reads
// these tables — a certificate reminder ⛔ never counts toward the correction closure (CR12).
// PII: a letter's tracking number is Tier-1 (encrypted in the API handler). A reminder row carries ⛔ no number — only a
// KEYED hash of it (`recipient_number_hash`, field class `claim_contact_mobile`). ⛔ No name anywhere.
// TENANT-ISOLATED; RLS in policies/claim-certificate-reminder-rls.ts.

import { sql } from 'drizzle-orm';
import { boolean, check, date, index, integer, pgTable, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core';

import { piiColumn } from '../encryption/column.js';
import type {
  ClaimId,
  DeathCertificateReviewId,
  DeathCertificateUploadId,
  NomineeVersionId,
  PariwarId,
} from '../ids/index.js';
import { claims } from './claims.js';
import { claimDeathCertificateReviews } from './claim_death_certificate_reviews.js';
import { claimDeathCertificateUploads } from './claim_death_certificate_uploads.js';
import { memberNomineeVersions } from './member_nominee_versions.js';

// ── The vocabularies (⚠ LOCKSTEP with the migrations' CHECKs) ──────────────────────────────────────────────────

/** Why the family is waiting (CR2). ⚠ LOCKSTEP with 0137. */
export const CERTIFICATE_RUN_CAUSES = ['rejected', 'missing'] as const;
export type CertificateRunCause = (typeof CERTIFICATE_RUN_CAUSES)[number];

/** How a run ended (CR5). A PAUSE is ⛔ not an end. ⚠ LOCKSTEP with 0137. */
export const CERTIFICATE_RUN_END_REASONS = ['certificate_received', 'superseded', 'completed'] as const;
export type CertificateRunEndReason = (typeof CERTIFICATE_RUN_END_REASONS)[number];

/**
 * What a reminder row is FOR (CR1, CR10). ⛔ Never 6.19b's `replacement_reminder` (D21's reserved value — Trap 7).
 * ⚠ LOCKSTEP with 0138.
 */
export const CERTIFICATE_REMINDER_PURPOSES = ['family_sms', 'letter_chase', 'letter_escalation'] as const;
export type CertificateReminderPurpose = (typeof CERTIFICATE_REMINDER_PURPOSES)[number];

/** What is KNOWN about an attempt — the same eight values as 0128's. ⚠ LOCKSTEP with 0138. */
export const CERTIFICATE_REMINDER_OUTCOMES = [
  'attempting',
  'accepted',
  'rejected_invalid_number',
  'rejected_unreachable',
  'no_target',
  'error',
  'skipped_superseded',
  'recorded',
] as const;
export type CertificateReminderOutcome = (typeof CERTIFICATE_REMINDER_OUTCOMES)[number];

// ── claim_certificate_reminder_runs (0137) ─────────────────────────────────────────────────────────────────────

export const claimCertificateReminderRuns = pgTable(
  'claim_certificate_reminder_runs',
  {
    runId: uuid('run_id').defaultRandom().primaryKey(),
    claimCaseId: uuid('claim_case_id')
      .notNull()
      .$type<ClaimId>()
      .references(() => claims.claimCaseId, { onDelete: 'cascade' }),
    pariwarId: uuid('pariwar_id').notNull().$type<PariwarId>(),
    cause: text('cause').notNull().$type<CertificateRunCause>(),
    /** `rejected` only — the rejected upload (Trap 4: a re-review of it ⛔ never restarts the 180 days). */
    anchorUploadId: uuid('anchor_upload_id')
      .$type<DeathCertificateUploadId>()
      .references(() => claimDeathCertificateUploads.uploadId, { onDelete: 'cascade' }),
    /** `rejected` only — the review that rejected it and opened the run (its `decided_at` is day 0). */
    anchorReviewId: uuid('anchor_review_id')
      .$type<DeathCertificateReviewId>()
      .references(() => claimDeathCertificateReviews.reviewId, { onDelete: 'cascade' }),
    /** IST calendar date, `YYYY-MM-DD` (CR3). ⛔ Nothing is sent on day 0; ⛔ never re-dated (`-275` Q2). */
    day0: date('day0', { mode: 'string' }).notNull(),
    openedAt: timestamp('opened_at', { withTimezone: true, mode: 'date' }).notNull().default(sql`clock_timestamp()`),
    endedAt: timestamp('ended_at', { withTimezone: true, mode: 'date' }),
    endReason: text('end_reason').$type<CertificateRunEndReason>(),
  },
  (t) => [
    uniqueIndex('claim_certificate_reminder_runs_one_open_per_claim_uq')
      .on(t.claimCaseId)
      .where(sql`"ended_at" IS NULL`),
    uniqueIndex('claim_certificate_reminder_runs_rejected_upload_uq')
      .on(t.claimCaseId, t.anchorUploadId)
      .where(sql`"cause" = 'rejected'`),
    uniqueIndex('claim_certificate_reminder_runs_missing_uq').on(t.claimCaseId).where(sql`"cause" = 'missing'`),
    index('claim_certificate_reminder_runs_open_idx').on(t.runId).where(sql`"ended_at" IS NULL`),
    index('claim_certificate_reminder_runs_pariwar_claim_idx').on(t.pariwarId, t.claimCaseId),
    check('claim_certificate_reminder_runs_cause_check', sql`${t.cause} IN ('rejected', 'missing')`),
    check(
      'claim_certificate_reminder_runs_end_reason_check',
      sql`${t.endReason} IS NULL OR ${t.endReason} IN ('certificate_received', 'superseded', 'completed')`,
    ),
    check('claim_certificate_reminder_runs_ended_pair_check', sql`(${t.endedAt} IS NULL) = (${t.endReason} IS NULL)`),
    check(
      'claim_certificate_reminder_runs_anchor_check',
      sql`(${t.anchorUploadId} IS NULL) = (${t.anchorReviewId} IS NULL)
        AND (${t.cause} = 'rejected') = (${t.anchorUploadId} IS NOT NULL)`,
    ),
  ],
);

export type ClaimCertificateReminderRunRow = typeof claimCertificateReminderRuns.$inferSelect;

// ── claim_certificate_reminders (0138) ─────────────────────────────────────────────────────────────────────────

export const claimCertificateReminders = pgTable(
  'claim_certificate_reminders',
  {
    reminderId: uuid('reminder_id').defaultRandom().primaryKey(),
    runId: uuid('run_id')
      .notNull()
      .references(() => claimCertificateReminderRuns.runId, { onDelete: 'cascade' }),
    claimCaseId: uuid('claim_case_id')
      .notNull()
      .$type<ClaimId>()
      .references(() => claims.claimCaseId, { onDelete: 'cascade' }),
    pariwarId: uuid('pariwar_id').notNull().$type<PariwarId>(),
    /** The RUN's day number of the slot, ⛔ never a calendar date. */
    slotDay: integer('slot_day').notNull(),
    /** The IST date the row was written for (the staff day key). */
    sentOn: date('sent_on', { mode: 'string' }).notNull(),
    /** `nominee:<chain root>` | `claimant` | `staff:<user_id>` | `staff:unassigned`. */
    recipientKey: text('recipient_key').notNull(),
    purpose: text('purpose').notNull().$type<CertificateReminderPurpose>(),
    /** The chased PERSON on a staff row; `''` on a `family_sms` row (⛔ never null — a CHECK pins both). */
    subjectKey: text('subject_key').notNull().default(''),
    outcome: text('outcome').notNull().$type<CertificateReminderOutcome>(),
    late: boolean('late').notNull().default(false),
    /** `family_sms` only — the chain-head nominee version whose number was used (null for the claimant block). */
    recipientVersionId: uuid('recipient_version_id')
      .$type<NomineeVersionId>()
      .references(() => memberNomineeVersions.versionId),
    /** `family_sms` only — a KEYED hash of the E.164 number, written on the `attempting` row (CR7). ⛔ Never the number. */
    recipientNumberHash: text('recipient_number_hash'),
    providerMessageId: text('provider_message_id'),
    /** The classified error, `'<class>:<code>'`, or why a slot was skipped. ⛔ Never PII. */
    detail: text('detail'),
    /** The FIRST transient detail of a retried attempt (the at-least-once double is recorded, ⛔ never hidden). */
    firstDetail: text('first_detail'),
    attemptCount: integer('attempt_count').notNull().default(1),
    claimedAt: timestamp('claimed_at', { withTimezone: true, mode: 'date' }),
    /** The pg-boss job id that holds an `attempting` row (a retry of the SAME job keeps it). */
    claimedByJob: text('claimed_by_job'),
    /** ⭐ ONLY from a real delivery signal — ⛔ none exists in v1, so this stays null. */
    deliveredAt: timestamp('delivered_at', { withTimezone: true, mode: 'date' }),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull().default(sql`clock_timestamp()`),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }).notNull().default(sql`clock_timestamp()`),
  },
  (t) => [
    uniqueIndex('claim_certificate_reminders_slot_uq').on(t.runId, t.slotDay, t.recipientKey, t.purpose, t.subjectKey),
    // CR10 — ONE staff row per (claim, recipient, chased person, purpose, IST day); `purpose` in the key (0130's lesson).
    uniqueIndex('claim_certificate_reminders_staff_day_uq')
      .on(t.claimCaseId, t.recipientKey, t.subjectKey, t.purpose, t.sentOn)
      .where(sql`"purpose" IN ('letter_chase', 'letter_escalation')`),
    index('claim_certificate_reminders_attempting_idx').on(t.claimedAt).where(sql`"outcome" = 'attempting'`),
    index('claim_certificate_reminders_pariwar_claim_idx').on(t.pariwarId, t.claimCaseId),
    index('claim_certificate_reminders_run_idx').on(t.runId, t.recipientKey),
    check(
      'claim_certificate_reminders_purpose_check',
      sql`${t.purpose} IN ('family_sms', 'letter_chase', 'letter_escalation')`,
    ),
    check(
      'claim_certificate_reminders_outcome_check',
      sql`${t.outcome} IN ('attempting', 'accepted', 'rejected_invalid_number', 'rejected_unreachable', 'no_target', 'error', 'skipped_superseded', 'recorded')`,
    ),
    check('claim_certificate_reminders_slot_day_check', sql`${t.slotDay} >= 0`),
    check('claim_certificate_reminders_attempt_count_check', sql`${t.attemptCount} >= 1`),
    check('claim_certificate_reminders_recipient_key_check', sql`length(btrim(${t.recipientKey})) > 0`),
    check('claim_certificate_reminders_subject_key_check', sql`(${t.purpose} = 'family_sms') = (${t.subjectKey} = '')`),
    check(
      'claim_certificate_reminders_attempting_claimed_check',
      sql`${t.outcome} <> 'attempting' OR ${t.claimedAt} IS NOT NULL`,
    ),
    check(
      'claim_certificate_reminders_delivered_only_accepted_check',
      sql`${t.deliveredAt} IS NULL OR ${t.outcome} = 'accepted'`,
    ),
  ],
);

export type ClaimCertificateReminderRow = typeof claimCertificateReminders.$inferSelect;

// ── claim_certificate_reminder_letters (0139) ──────────────────────────────────────────────────────────────────

export const claimCertificateReminderLetters = pgTable(
  'claim_certificate_reminder_letters',
  {
    letterId: uuid('letter_id').defaultRandom().primaryKey(),
    /** The run the letter was recorded in — provenance only (the rule is per CLAIM). */
    runId: uuid('run_id')
      .notNull()
      .references(() => claimCertificateReminderRuns.runId, { onDelete: 'cascade' }),
    claimCaseId: uuid('claim_case_id')
      .notNull()
      .$type<ClaimId>()
      .references(() => claims.claimCaseId, { onDelete: 'cascade' }),
    pariwarId: uuid('pariwar_id').notNull().$type<PariwarId>(),
    /** `nominee:<correction-chain root>` | `claimant` — the reminder `recipient_key` form. */
    personKey: text('person_key').notNull(),
    postedOn: date('posted_on', { mode: 'string' }).notNull(),
    trackingNumberCiphertext: piiColumn(1, 'claim_certificate_letter')('tracking_number_ciphertext').notNull(),
    recordedByActor: text('recorded_by_actor').notNull(),
    recordedByDisplay: text('recorded_by_display').notNull(),
    deliveredOn: date('delivered_on', { mode: 'string' }),
    screenshotStorageKey: text('screenshot_storage_key'),
    screenshotContentType: text('screenshot_content_type'),
    screenshotSizeBytes: integer('screenshot_size_bytes'),
    deliveryRecordedByActor: text('delivery_recorded_by_actor'),
    deliveryRecordedByDisplay: text('delivery_recorded_by_display'),
    deliveryRecordedAt: timestamp('delivery_recorded_at', { withTimezone: true, mode: 'date' }),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull().default(sql`clock_timestamp()`),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }).notNull().default(sql`clock_timestamp()`),
  },
  (t) => [
    // ⭐ `-275` Q1 A — ONE letter per person per CLAIM, ever.
    uniqueIndex('claim_certificate_reminder_letters_person_uq').on(t.claimCaseId, t.personKey),
    index('claim_certificate_reminder_letters_pariwar_claim_idx').on(t.pariwarId, t.claimCaseId),
    check('claim_certificate_reminder_letters_person_key_check', sql`length(btrim(${t.personKey})) > 0`),
    check(
      'claim_certificate_reminder_letters_recorded_by_check',
      sql`length(btrim(${t.recordedByActor})) > 0 AND length(btrim(${t.recordedByDisplay})) > 0`,
    ),
    // A delivery is recorded WITH its screenshot and its attribution, or ⛔ not at all (D6) — 0139's CHECK.
    check(
      'claim_certificate_reminder_letters_delivery_complete_check',
      sql`(
        ${t.deliveredOn} IS NULL
        AND ${t.screenshotStorageKey} IS NULL
        AND ${t.screenshotContentType} IS NULL
        AND ${t.screenshotSizeBytes} IS NULL
        AND ${t.deliveryRecordedByActor} IS NULL
        AND ${t.deliveryRecordedByDisplay} IS NULL
        AND ${t.deliveryRecordedAt} IS NULL
      ) OR (
        ${t.deliveredOn} IS NOT NULL
        AND ${t.screenshotStorageKey} IS NOT NULL
        AND ${t.screenshotContentType} IS NOT NULL
        AND ${t.screenshotSizeBytes} IS NOT NULL
        AND ${t.deliveryRecordedByActor} IS NOT NULL
        AND ${t.deliveryRecordedByDisplay} IS NOT NULL
        AND ${t.deliveryRecordedAt} IS NOT NULL
      )`,
    ),
    check(
      'claim_certificate_reminder_letters_delivered_after_posted_check',
      sql`${t.deliveredOn} IS NULL OR ${t.deliveredOn} >= ${t.postedOn}`,
    ),
  ],
);

export type ClaimCertificateReminderLetterRow = typeof claimCertificateReminderLetters.$inferSelect;
