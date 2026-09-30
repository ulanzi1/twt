// The correction-return CHASE — Story 6.19b (Task 1; AC2, AC3, AC4, AC5, AC16). Four tables, migrations 0126–0129:
//
//   · `claim_correction_marks`     — WHO MUST ACT on a return (`2026-09-27-258`; D25, `set_by_role` per `-270`).
//                                     Append-only; the LATEST row per return wins.
//   · `claim_correction_runs`      — a reminder RUN (`-266` §1 as amended by `-267` §1/§3): its kind, the mark or
//                                     direction that opened it, its IST day 0 and how it ended. ⭐ ONE open run
//                                     per CLAIM.
//   · `claim_correction_reminders` — ONE row per attempt at a (run, slot, recipient, purpose, person): what is
//                                     KNOWN, ⛔ never `delivered` for an accept (T1).
//   · `claim_correction_letters`   — the posted letters of a run, ≤ 2 per person (D6, D20, D31).
//
// ⭐ The run is the unit, ⛔ not the return (slice trap S1): the dead-number marker, "≤ 2 letters" and 6.19c's
// "reached" all key on `run_id`. ⛔ Nothing here approves, refuses or closes a claim (invariant 1) — these are the
// INPUTS 6.19c's closure predicate reads, through the ONE resolver in `claim/correction-chase.ts`.
//
// PII: the mark's note and a letter's tracking number are Tier-1 (encrypted in the API handler before insert, read
// back only by the authorized route). A reminder row carries ⛔ no number — only a KEYED hash of it
// (`recipient_number_hash`, field class `claim_contact_mobile`). ⛔ No name anywhere.
// TENANT-ISOLATED; RLS in policies/claim-correction-{mark,run,reminder,letter}-rls.ts.

import { sql } from 'drizzle-orm';
import {
  boolean,
  check,
  date,
  index,
  integer,
  pgTable,
  smallint,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';

import { piiColumn } from '../encryption/column.js';
import type { ClaimId, NomineeVersionId, PariwarId, TrusteeDecisionId } from '../ids/index.js';
import { claims } from './claims.js';
import { claimStateTrusteeDecisions } from './claim_state_trustee_decisions.js';
import { memberNomineeVersions } from './member_nominee_versions.js';

// ── The vocabularies (⚠ LOCKSTEP with the migrations' CHECKs) ──────────────────────────────────────────────────

/** `-258` — who must put the bank details right. ⚠ LOCKSTEP with 0126. */
export const CORRECTION_MUST_ACT = ['family', 'staff'] as const;
export type CorrectionMustAct = (typeof CORRECTION_MUST_ACT)[number];

/** The role whose grant authorised a mark (`-270` adds `super_admin`). ⚠ LOCKSTEP with 0126. */
export const CORRECTION_MARK_ROLES = ['pariwar_admin', 'district_admin', 'super_admin'] as const;
export type CorrectionMarkRole = (typeof CORRECTION_MARK_ROLES)[number];

/** A run's kind (`-266` §1). 6.19d adds its own by its own migration. ⚠ LOCKSTEP with 0127. */
export const CORRECTION_RUN_KINDS = ['family', 'staff', 'direction'] as const;
export type CorrectionRunKind = (typeof CORRECTION_RUN_KINDS)[number];

/** How a run ended — ⛔ never `resubmitted` (`-267` §3: resubmission PAUSES). ⚠ LOCKSTEP with 0127. */
export const CORRECTION_RUN_END_REASONS = ['superseded', 'day_90', 'mark_changed', 'decided'] as const;
export type CorrectionRunEndReason = (typeof CORRECTION_RUN_END_REASONS)[number];

/** What a reminder row is FOR. 6.19c extends it by its own migration. ⚠ LOCKSTEP with 0128. */
export const CORRECTION_REMINDER_PURPOSES = [
  'family_sms',
  'staff_reminder',
  'staff_push',
  'letter_chase',
  'letter_second_due',
  'replacement_reminder',
  'escalation',
] as const;
export type CorrectionReminderPurpose = (typeof CORRECTION_REMINDER_PURPOSES)[number];

/**
 * What is KNOWN about an attempt. `delivered` is ⛔ not a state (only `delivered_at`, from a real signal); `late` is a
 * separate boolean. A staff row sends nothing itself (the queue is the channel), so its outcome is `recorded`.
 * ⚠ LOCKSTEP with 0128.
 */
export const CORRECTION_REMINDER_OUTCOMES = [
  'attempting',
  'accepted',
  'rejected_invalid_number',
  'rejected_unreachable',
  'no_target',
  'error',
  'skipped_superseded',
  'recorded',
] as const;
export type CorrectionReminderOutcome = (typeof CORRECTION_REMINDER_OUTCOMES)[number];

// ── claim_correction_marks ─────────────────────────────────────────────────────────────────────────────────────

export const claimCorrectionMarks = pgTable(
  'claim_correction_marks',
  {
    markId: uuid('mark_id').defaultRandom().primaryKey(),
    claimCaseId: uuid('claim_case_id')
      .notNull()
      .$type<ClaimId>()
      .references(() => claims.claimCaseId, { onDelete: 'cascade' }),
    pariwarId: uuid('pariwar_id').notNull().$type<PariwarId>(),
    // D25 — keyed on the RETURN: a second return starts its own marks.
    returnDecisionId: uuid('return_decision_id')
      .notNull()
      .$type<TrusteeDecisionId>()
      .references(() => claimStateTrusteeDecisions.decisionId, { onDelete: 'cascade' }),
    mustAct: text('must_act').notNull().$type<CorrectionMustAct>(),
    // The return's own mark (written in the return's transaction; its note IS the return's rationale).
    isReturnMark: boolean('is_return_mark').notNull().default(false),
    setByActor: text('set_by_actor').notNull(),
    // The acting staff member's display name, SNAPSHOTTED at the act ([[project_admin_display_name_attribution]]).
    setByActorDisplay: text('set_by_actor_display').notNull(),
    setByRole: text('set_by_role').notNull().$type<CorrectionMarkRole>(),
    noteCiphertext: piiColumn(1, 'claim_correction_mark')('note_ciphertext'),
    setAt: timestamp('set_at', { withTimezone: true, mode: 'date' }).notNull().default(sql`clock_timestamp()`),
  },
  (t) => [
    uniqueIndex('claim_correction_marks_return_mark_uq').on(t.returnDecisionId).where(sql`"is_return_mark"`),
    index('claim_correction_marks_return_set_at_idx').on(t.returnDecisionId, t.setAt),
    index('claim_correction_marks_pariwar_claim_idx').on(t.pariwarId, t.claimCaseId),
    check('claim_correction_marks_must_act_check', sql`${t.mustAct} IN ('family', 'staff')`),
    check(
      'claim_correction_marks_set_by_role_check',
      sql`${t.setByRole} IN ('pariwar_admin', 'district_admin', 'super_admin')`,
    ),
    check('claim_correction_marks_set_by_actor_check', sql`length(btrim(${t.setByActor})) > 0`),
    check('claim_correction_marks_set_by_actor_display_check', sql`length(btrim(${t.setByActorDisplay})) > 0`),
    check('claim_correction_marks_note_required_check', sql`${t.isReturnMark} OR ${t.noteCiphertext} IS NOT NULL`),
  ],
);

export type ClaimCorrectionMarkRow = typeof claimCorrectionMarks.$inferSelect;

// ── claim_correction_runs ──────────────────────────────────────────────────────────────────────────────────────

export const claimCorrectionRuns = pgTable(
  'claim_correction_runs',
  {
    runId: uuid('run_id').defaultRandom().primaryKey(),
    claimCaseId: uuid('claim_case_id')
      .notNull()
      .$type<ClaimId>()
      .references(() => claims.claimCaseId, { onDelete: 'cascade' }),
    pariwarId: uuid('pariwar_id').notNull().$type<PariwarId>(),
    returnDecisionId: uuid('return_decision_id')
      .notNull()
      .$type<TrusteeDecisionId>()
      .references(() => claimStateTrusteeDecisions.decisionId, { onDelete: 'cascade' }),
    kind: text('kind').notNull().$type<CorrectionRunKind>(),
    // The mark (family / staff) or the direction (6.19c) that opened the run. ⛔ No FK — a direction is 6.19c's.
    anchorId: uuid('anchor_id').notNull(),
    /** IST calendar date, `YYYY-MM-DD`. ⛔ Nothing is sent on day 0 (`-260` G4). */
    day0: date('day0', { mode: 'string' }).notNull(),
    openedAt: timestamp('opened_at', { withTimezone: true, mode: 'date' }).notNull().default(sql`clock_timestamp()`),
    endedAt: timestamp('ended_at', { withTimezone: true, mode: 'date' }),
    endReason: text('end_reason').$type<CorrectionRunEndReason>(),
  },
  (t) => [
    uniqueIndex('claim_correction_runs_one_open_per_claim_uq').on(t.claimCaseId).where(sql`"ended_at" IS NULL`),
    index('claim_correction_runs_open_idx').on(t.openedAt).where(sql`"ended_at" IS NULL`),
    index('claim_correction_runs_ended_idx').on(t.endedAt).where(sql`"ended_at" IS NOT NULL`),
    index('claim_correction_runs_pariwar_claim_idx').on(t.pariwarId, t.claimCaseId),
    index('claim_correction_runs_return_idx').on(t.returnDecisionId),
    check('claim_correction_runs_kind_check', sql`${t.kind} IN ('family', 'staff', 'direction')`),
    check(
      'claim_correction_runs_end_reason_check',
      sql`${t.endReason} IS NULL OR ${t.endReason} IN ('superseded', 'day_90', 'mark_changed', 'decided')`,
    ),
    check('claim_correction_runs_ended_pair_check', sql`(${t.endedAt} IS NULL) = (${t.endReason} IS NULL)`),
  ],
);

export type ClaimCorrectionRunRow = typeof claimCorrectionRuns.$inferSelect;

// ── claim_correction_reminders ─────────────────────────────────────────────────────────────────────────────────

export const claimCorrectionReminders = pgTable(
  'claim_correction_reminders',
  {
    reminderId: uuid('reminder_id').defaultRandom().primaryKey(),
    runId: uuid('run_id')
      .notNull()
      .references(() => claimCorrectionRuns.runId, { onDelete: 'cascade' }),
    claimCaseId: uuid('claim_case_id')
      .notNull()
      .$type<ClaimId>()
      .references(() => claims.claimCaseId, { onDelete: 'cascade' }),
    pariwarId: uuid('pariwar_id').notNull().$type<PariwarId>(),
    /** The RUN's day number of the slot (`-267` §4), ⛔ never a calendar date. */
    slotDay: integer('slot_day').notNull(),
    /** The IST date the row was written for (the staff-push and D34 day keys). */
    sentOn: date('sent_on', { mode: 'string' }).notNull(),
    /** `nominee:<chain root>` | `claimant` | `staff:<user_id>` | `staff:unassigned`. */
    recipientKey: text('recipient_key').notNull(),
    purpose: text('purpose').notNull().$type<CorrectionReminderPurpose>(),
    /** The chased PERSON for `letter_chase` / `letter_second_due` / the letter-chase `escalation`; else `''`. */
    subjectKey: text('subject_key').notNull().default(''),
    outcome: text('outcome').notNull().$type<CorrectionReminderOutcome>(),
    late: boolean('late').notNull().default(false),
    /** `family_sms` only — the effective nominee version whose number was used (null for the claimant block). */
    recipientVersionId: uuid('recipient_version_id')
      .$type<NomineeVersionId>()
      .references(() => memberNomineeVersions.versionId),
    /** `family_sms` only — a KEYED hash of the E.164 number sent to (`-271` §1). ⛔ Never the number. */
    recipientNumberHash: text('recipient_number_hash'),
    providerMessageId: text('provider_message_id'),
    /** The classified error, `'<class>:<code>'`, or the reason a slot was skipped. ⛔ Never PII. */
    detail: text('detail'),
    /** The FIRST transient detail of a retried attempt (the at-least-once double is recorded, ⛔ never hidden). */
    firstDetail: text('first_detail'),
    attemptCount: integer('attempt_count').notNull().default(1),
    claimedAt: timestamp('claimed_at', { withTimezone: true, mode: 'date' }),
    /** The pg-boss job id that holds an `attempting` row (a retry of the SAME job keeps it). */
    claimedByJob: text('claimed_by_job'),
    /** ⭐ ONLY from a real delivery signal (T1) — ⛔ none exists in v1, so this stays null. */
    deliveredAt: timestamp('delivered_at', { withTimezone: true, mode: 'date' }),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull().default(sql`clock_timestamp()`),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }).notNull().default(sql`clock_timestamp()`),
  },
  (t) => [
    uniqueIndex('claim_correction_reminders_slot_uq').on(t.runId, t.slotDay, t.recipientKey, t.purpose, t.subjectKey),
    uniqueIndex('claim_correction_reminders_staff_push_day_uq')
      .on(t.claimCaseId, t.recipientKey, t.sentOn)
      .where(sql`"purpose" = 'staff_push'`),
    uniqueIndex('claim_correction_reminders_staff_reminder_day_uq')
      .on(t.claimCaseId, t.recipientKey, t.sentOn)
      .where(sql`"purpose" = 'staff_reminder'`),
    // D34, extended to the per-person staff-side purposes: a same-day mark-switch supersession must not double a
    // letter chase, its second-letter reminder, or its escalation for the SAME chased person either.
    uniqueIndex('claim_correction_reminders_letter_chase_day_uq')
      .on(t.claimCaseId, t.recipientKey, t.subjectKey, t.sentOn)
      .where(sql`"purpose" IN ('letter_chase', 'letter_second_due', 'escalation')`),
    index('claim_correction_reminders_attempting_idx').on(t.claimedAt).where(sql`"outcome" = 'attempting'`),
    index('claim_correction_reminders_pariwar_claim_idx').on(t.pariwarId, t.claimCaseId),
    index('claim_correction_reminders_run_idx').on(t.runId, t.recipientKey),
    check(
      'claim_correction_reminders_purpose_check',
      sql`${t.purpose} IN ('family_sms', 'staff_reminder', 'staff_push', 'letter_chase', 'letter_second_due', 'replacement_reminder', 'escalation')`,
    ),
    check(
      'claim_correction_reminders_outcome_check',
      sql`${t.outcome} IN ('attempting', 'accepted', 'rejected_invalid_number', 'rejected_unreachable', 'no_target', 'error', 'skipped_superseded', 'recorded')`,
    ),
    check('claim_correction_reminders_slot_day_check', sql`${t.slotDay} >= 0`),
    check('claim_correction_reminders_attempt_count_check', sql`${t.attemptCount} >= 1`),
    check('claim_correction_reminders_recipient_key_check', sql`length(btrim(${t.recipientKey})) > 0`),
    check(
      'claim_correction_reminders_attempting_claimed_check',
      sql`${t.outcome} <> 'attempting' OR ${t.claimedAt} IS NOT NULL`,
    ),
    check(
      'claim_correction_reminders_delivered_only_accepted_check',
      sql`${t.deliveredAt} IS NULL OR ${t.outcome} = 'accepted'`,
    ),
  ],
);

export type ClaimCorrectionReminderRow = typeof claimCorrectionReminders.$inferSelect;

// ── claim_correction_letters ───────────────────────────────────────────────────────────────────────────────────

export const claimCorrectionLetters = pgTable(
  'claim_correction_letters',
  {
    letterId: uuid('letter_id').defaultRandom().primaryKey(),
    runId: uuid('run_id')
      .notNull()
      .references(() => claimCorrectionRuns.runId, { onDelete: 'cascade' }),
    claimCaseId: uuid('claim_case_id')
      .notNull()
      .$type<ClaimId>()
      .references(() => claims.claimCaseId, { onDelete: 'cascade' }),
    pariwarId: uuid('pariwar_id').notNull().$type<PariwarId>(),
    /** The person the letter went to — `nominee:<chain root>` | `claimant` (the reminder `recipient_key` form). */
    personKey: text('person_key').notNull(),
    /** 1 or 2 — D20: at most two letters per person per run. */
    sequence: smallint('sequence').notNull(),
    postedOn: date('posted_on', { mode: 'string' }).notNull(),
    trackingNumberCiphertext: piiColumn(1, 'claim_correction_letter')('tracking_number_ciphertext').notNull(),
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
    uniqueIndex('claim_correction_letters_person_sequence_uq').on(t.runId, t.personKey, t.sequence),
    index('claim_correction_letters_pariwar_claim_idx').on(t.pariwarId, t.claimCaseId),
    check('claim_correction_letters_sequence_check', sql`${t.sequence} IN (1, 2)`),
    check('claim_correction_letters_person_key_check', sql`length(btrim(${t.personKey})) > 0`),
    check(
      'claim_correction_letters_recorded_by_check',
      sql`length(btrim(${t.recordedByActor})) > 0 AND length(btrim(${t.recordedByDisplay})) > 0`,
    ),
    check(
      'claim_correction_letters_delivered_after_posted_check',
      sql`${t.deliveredOn} IS NULL OR ${t.deliveredOn} >= ${t.postedOn}`,
    ),
  ],
);

export type ClaimCorrectionLetterRow = typeof claimCorrectionLetters.$inferSelect;
