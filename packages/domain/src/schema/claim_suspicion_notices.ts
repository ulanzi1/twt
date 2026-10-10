// The SUSPICION NOTICE record — Story 6.24b (Task 1; AC7b), migration 0151 (`2026-10-07-292` RF11 / RF12,
// `2026-10-07-293` item 1 B, `2026-10-08-295` RB2 / RB3); Story 6.29, migration 0155 (`2026-10-10-302` RN3, RN5, RN6, RN8 — the
// give-up anchor, the hold park, the `detail` grammar, the finished-row trigger, the INSERT grant narrowed).
//
//   · `claim_suspicion_notices` — ONE row per (claim, purpose), EVER: the once-ever texts of a `-239` suspicion refusal
//                                 (FQ7 B's notice to the nominee in place at the death, `-291` Q2 B's closure text, and
//                                 `-293` item 1 B's text to the refused person). What is KNOWN, ⛔ never `delivered`.
//
// The vocabulary is 0138's (6.19d) — invent ⛔ none (RB2). ⛔ Nothing here refuses, closes, approves or time-limits a
// claim (invariant 7). PII: ⛔ no number and ⛔ no name — only a KEYED hash of the number (`recipient_number_hash`).
// TENANT-ISOLATED; RLS in policies/claim-suspicion-notice-rls.ts.

import { sql } from 'drizzle-orm';
import { check, foreignKey, index, integer, pgTable, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core';

import type { ClaimId, NomineeVersionId, PariwarId } from '../ids/index.js';
import { CERTIFICATE_REMINDER_OUTCOMES } from './claim_certificate_reminder.js';
import { claims } from './claims.js';
import { memberNomineeVersions } from './member_nominee_versions.js';

/** What a notice is FOR — one text each, once per claim, ever. ⚠ LOCKSTEP with 0151's purpose CHECK. */
export const SUSPICION_NOTICE_PURPOSES = ['suspicion_refusal', 'closed_after_appeal', 'refusal_appeal_notice'] as const;
export type SuspicionNoticePurpose = (typeof SUSPICION_NOTICE_PURPOSES)[number];

/**
 * What is KNOWN about the attempt — 0138's eight values, RE-EXPORTED (⛔ a hand copy; RB2). `recorded` stays unused
 * here. ⚠ LOCKSTEP with 0151's outcome CHECK.
 */
export const SUSPICION_NOTICE_OUTCOMES = CERTIFICATE_REMINDER_OUTCOMES;
export type SuspicionNoticeOutcome = (typeof SUSPICION_NOTICE_OUTCOMES)[number];

/**
 * ⭐ `-302` RN5 — the GRAMMAR of `detail` / `first_detail`: every value `suspicionNoticeDetail` builds, ⛔ anything else (⛔ a space,
 * ⛔ `+`, ⛔ a run of 7+ digits anywhere — a bare phone number). A gateway `<code>` is `[A-Za-z0-9_.-]{1,64}` (sanitised by the
 * builder). ⚠ LOCKSTEP with 0155's two `*_vocabulary_check` CHECKs (a spec pins the catalog's pattern to this string) and asserted
 * by the writers (`suspicion-notice.ts`). ⛔ Backslashes — the same string must read the same in a JS `RegExp` and a PG ARE.
 */
export const SUSPICION_NOTICE_DETAIL_PATTERN =
  '^(?!.*[0-9]{7})(exhausted:(attempting_three_days|recheck_(not_standing|not_closed_by_appeal|appeal_(time_limit_passed|open|upheld_final)))|no_target:(not_effective|no_contact_record|no_sendable_number|closed_no_determination)|excluded:claimant_discarded_version|name:(none|erased|unresolvable)|decrypt_failed:(kyc|tier1)|hash_failed:tier1|config_unavailable:secret_manager|config:(dlt_template_id_missing|helpline_number_missing|sms_gateway_unconfigured|sms_messaging_unavailable|secret_manager_[A-Za-z0-9_]{1,64})|(invalid_number|carrier_reject|rate_limited|api_unavailable|dlt_template_not_approved|auth|unknown):[A-Za-z0-9_.-]{1,64})$';

export const claimSuspicionNotices = pgTable(
  'claim_suspicion_notices',
  {
    noticeId: uuid('notice_id').defaultRandom().primaryKey(),
    pariwarId: uuid('pariwar_id').notNull().$type<PariwarId>(),
    claimCaseId: uuid('claim_case_id').notNull().$type<ClaimId>(),
    purpose: text('purpose').notNull().$type<SuspicionNoticePurpose>(),
    outcome: text('outcome').notNull().$type<SuspicionNoticeOutcome>(),
    /** The nominee version whose number was used — null for a non-nominee claimant (`refusal_appeal_notice`). */
    recipientVersionId: uuid('recipient_version_id')
      .$type<NomineeVersionId>()
      .references(() => memberNomineeVersions.versionId),
    /** A KEYED hash of the E.164 number. ⛔ Never the number. */
    recipientNumberHash: text('recipient_number_hash'),
    providerMessageId: text('provider_message_id'),
    /** The classified error, `'<class>:<code>'`, or why the notice finished without a send. ⛔ Never PII. */
    detail: text('detail'),
    /** The FIRST transient detail of a retried attempt (the at-least-once double is recorded, ⛔ never hidden). */
    firstDetail: text('first_detail'),
    attemptCount: integer('attempt_count').notNull().default(1),
    claimedAt: timestamp('claimed_at', { withTimezone: true, mode: 'date' }),
    /** The pg-boss job id that holds an `attempting` row (a retry of the SAME job keeps it). */
    claimedByJob: text('claimed_by_job'),
    /**
     * ⭐ The give-up's anchor (0155, `-302` RN3): three IST days count from here; re-claiming a PARKED row moves it FORWARD by the
     * time it sat parked (0155's trigger lets it move ONLY that way). ⛔ In the INSERT grant (its DEFAULT).
     */
    agingSince: timestamp('aging_since', { withTimezone: true, mode: 'date' }).notNull().default(sql`clock_timestamp()`),
    /** When a HELD sweep parked the row (`claimed_by_job` = `'sweep:held'`); cleared by the re-claim (0155, `-302` RN2). */
    parkedAt: timestamp('parked_at', { withTimezone: true, mode: 'date' }),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull().default(sql`clock_timestamp()`),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }).notNull().default(sql`clock_timestamp()`),
  },
  (t) => [
    foreignKey({
      name: 'claim_suspicion_notices_claim_case_fk',
      columns: [t.pariwarId, t.claimCaseId],
      foreignColumns: [claims.pariwarId, claims.claimCaseId],
    }).onDelete('cascade'),
    uniqueIndex('claim_suspicion_notices_claim_purpose_uq').on(t.pariwarId, t.claimCaseId, t.purpose),
    index('claim_suspicion_notices_attempting_idx').on(t.agingSince, t.claimedAt).where(sql`"outcome" = 'attempting'`),
    check(
      'claim_suspicion_notices_purpose_check',
      sql`${t.purpose} IN ('suspicion_refusal', 'closed_after_appeal', 'refusal_appeal_notice')`,
    ),
    check(
      'claim_suspicion_notices_outcome_check',
      sql`${t.outcome} IN ('attempting', 'accepted', 'rejected_invalid_number', 'rejected_unreachable', 'no_target', 'error', 'skipped_superseded', 'recorded')`,
    ),
    check('claim_suspicion_notices_attempt_count_check', sql`${t.attemptCount} >= 1`),
    // 0155 (`-302` RN8 (a)) — an in-flight row also names its holder.
    check(
      'claim_suspicion_notices_attempting_claimed_check',
      sql`${t.outcome} <> 'attempting' OR (${t.claimedAt} IS NOT NULL AND ${t.claimedByJob} IS NOT NULL)`,
    ),
    check(
      'claim_suspicion_notices_parked_check',
      sql`${t.outcome} <> 'attempting' OR ((${t.claimedByJob} = 'sweep:held') = (${t.parkedAt} IS NOT NULL))`,
    ),
    check('claim_suspicion_notices_detail_length_check', sql`${t.detail} IS NULL OR char_length(${t.detail}) <= 200`),
    check('claim_suspicion_notices_first_detail_length_check', sql`${t.firstDetail} IS NULL OR char_length(${t.firstDetail}) <= 200`),
    check(
      'claim_suspicion_notices_detail_vocabulary_check',
      sql`${t.detail} IS NULL OR ${t.detail} ~ ${sql.raw(`'${SUSPICION_NOTICE_DETAIL_PATTERN}'`)}`,
    ),
    check(
      'claim_suspicion_notices_first_detail_vocabulary_check',
      sql`${t.firstDetail} IS NULL OR ${t.firstDetail} ~ ${sql.raw(`'${SUSPICION_NOTICE_DETAIL_PATTERN}'`)}`,
    ),
  ],
);

export type ClaimSuspicionNoticeRow = typeof claimSuspicionNotices.$inferSelect;
