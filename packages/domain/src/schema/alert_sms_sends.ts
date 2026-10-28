// The ALERT SMS send record — Story 5.11b (Task 1; AC1, AC3), migration 0184 (`2026-10-25-404` FS6 (a), FS8 (d), FS22); widened
// by Story 5.8b, migration 0188 (`2026-10-28-415` FS8 (a)) to the degraded-mode bridge's text (occasion `cycle_open`).
//
//   · `alert_sms_sends` — ONE row per (alert, member, OCCASION): the three contribution texts `-390` Q1 B owes a member the app
//                         (and WhatsApp, where used) could not reach. AT MOST ONCE: the row is begun (committed) BEFORE the
//                         gateway call; only `deferred` (a `rate_limited` answer) is ever re-claimed. What is KNOWN, ⛔ never
//                         `delivered` (that is `sms_send_deliveries`, through the CRQID kind `as`).
//
// The hand-authored half (GRANTs, the per-command policies, FORCE RLS, the finished-row trigger) lives in 0184. PII: ⛔ number,
// ⛔ name, ⛔ hash. TENANT-ISOLATED; RLS in policies/alert-sms-send-rls.ts.

import { sql } from 'drizzle-orm';
import { check, foreignKey, index, integer, pgTable, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core';

import type { AlertId, MemberId, PariwarId } from '../ids/index.js';
import { alerts } from './alerts.js';

/**
 * ⭐ FS6 / FS8 (d) — the OCCASIONS a text is owed on: the keyed store's own scope for the three lit kinds (day 10, the escalated
 * pending match, and one per EMITTABLE mismatch reason — `matcher-worker.ts` `EMITTABLE_MISMATCH_REASONS`) — and, Story 5.8b
 * (FS8 (a), `2026-10-28-415`), `cycle_open`: the degraded-mode bridge's text (the cycle-open child's scope). SEVEN per member per
 * real cycle (was six — `-404`'s cap superseded in part). ⚠ LOCKSTEP with `alert_sms_sends_occasion_check` (0184, replaced by
 * 0188); the CHECK is the boundary (the producer builds the scope from a raw payload string). `cycle_open` ⇔ the message
 * `cycle_open_bridge` (`alert_sms_sends_bridge_pairing_check`, 0188).
 */
export const ALERT_SMS_SEND_OCCASIONS = [
  'day_10',
  'pending_match_escalated',
  'mismatch:wrong_pool',
  'mismatch:amount_mismatch',
  'mismatch:entry_already_claimed',
  'mismatch:sender_vpa_mismatch',
  'cycle_open',
] as const;
export type AlertSmsSendOccasion = (typeof ALERT_SMS_SEND_OCCASIONS)[number];

/**
 * The lit messages (the contract's `AlertSmsMessage`) — the three per-member notices and, Story 5.8b, the bridge's
 * `cycle_open_bridge`. ⚠ LOCKSTEP with `alert_sms_sends_message_check` (0184, replaced by 0188).
 */
export const ALERT_SMS_SEND_MESSAGES = [
  'deadline_not_recorded',
  'payment_not_matched',
  'payment_not_confirmed',
  'cycle_open_bridge',
] as const;
export type AlertSmsSendMessage = (typeof ALERT_SMS_SEND_MESSAGES)[number];

/** ⚠ LOCKSTEP with 0184's `alert_sms_sends_locale_check`. */
export const ALERT_SMS_SEND_LOCALES = ['hi', 'en'] as const;
export type AlertSmsSendLocale = (typeof ALERT_SMS_SEND_LOCALES)[number];

/**
 * What is KNOWN about the send. `attempting` (begun, committed, the gateway call in flight or crashed); `deferred` (the gateway
 * answered `rate_limited` — DEFINITELY not taken; the ONLY re-claimable state); the finals. `refused` is in the vocabulary
 * (FS6) and unused while FS8 (d) keeps ⛔ counter. ⚠ LOCKSTEP with 0184's `alert_sms_sends_outcome_check`.
 */
export const ALERT_SMS_SEND_OUTCOMES = [
  'attempting',
  'deferred',
  'accepted',
  'rejected_invalid_number',
  'rejected_unreachable',
  'refused',
  'error',
] as const;
export type AlertSmsSendOutcome = (typeof ALERT_SMS_SEND_OUTCOMES)[number];

/**
 * ⭐ The GRAMMAR of `detail`: every value the alert SMS seam writes, ⛔ anything else (⛔ a space, ⛔ `+`, ⛔ a run of 7+ digits).
 * A gateway `<code>` is `[A-Za-z0-9_.-]{1,64}` (`sanitizeSmsGatewayCode`). `exhausted:ladder_delivered` (Story 5.8b, code review
 * 2026-10-28 (second pass)) — the terminal bridge row written when the ladder delivered and no send row existed. ⚠ LOCKSTEP with
 * `alert_sms_sends_detail_vocabulary_check` (0184, replaced by 0188; the policy spec pins the two equal) and asserted by the
 * writers. ⛔ Backslashes — the same string must read the same in a JS `RegExp` and a PG ARE.
 */
export const ALERT_SMS_SEND_DETAIL_PATTERN =
  '^(?!.*[0-9]{7})(exhausted:outcome_unknown(:(api_unavailable|unknown):[A-Za-z0-9_.-]{1,64})?|(exhausted:)?rate_limited:[A-Za-z0-9_.-]{1,64}|exhausted:config_unavailable:secret_manager|exhausted:ladder_delivered|config:sms_messaging_unavailable|(invalid_number|carrier_reject|auth|dlt_template_not_approved):[A-Za-z0-9_.-]{1,64})$';

export const alertSmsSends = pgTable(
  'alert_sms_sends',
  {
    /** The CRQID's row id (kind `as` — DR3). */
    sendId: uuid('send_id').defaultRandom().primaryKey(),
    pariwarId: uuid('pariwar_id').notNull().$type<PariwarId>(),
    alertId: uuid('alert_id').notNull().$type<AlertId>(),
    memberId: uuid('member_id').notNull().$type<MemberId>(),
    occasion: text('occasion').notNull().$type<AlertSmsSendOccasion>(),
    message: text('message').notNull().$type<AlertSmsSendMessage>(),
    /** The language the text was sent in — the member's (FS5 (a)); a `deferred → attempting` re-claim re-sets it to THIS attempt's. */
    locale: text('locale').notNull().$type<AlertSmsSendLocale>(),
    outcome: text('outcome').notNull().$type<AlertSmsSendOutcome>(),
    /** `<class>:<code>` or `exhausted:…` — {@link ALERT_SMS_SEND_DETAIL_PATTERN}. ⛔ Never PII, ⛔ provider free text. */
    detail: text('detail'),
    /** MSG91's request id — REQUIRED on `accepted` (the correlator matches the report by it). */
    providerMessageId: text('provider_message_id'),
    /** `${job.id}:${retryCount}` of the attempt that holds the row (⛔ the bare job id — pg-boss keeps it across retries). */
    claimToken: text('claim_token').notNull(),
    attemptCount: integer('attempt_count').notNull().default(1),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull().default(sql`clock_timestamp()`),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }).notNull().default(sql`clock_timestamp()`),
  },
  (t) => [
    foreignKey({ name: 'alert_sms_sends_alert_id_fk', columns: [t.alertId], foreignColumns: [alerts.alertId] }),
    uniqueIndex('alert_sms_sends_alert_member_occasion_uq').on(t.alertId, t.memberId, t.occasion),
    index('alert_sms_sends_accepted_idx').on(t.updatedAt).where(sql`"outcome" = 'accepted'`),
    index('alert_sms_sends_pariwar_idx').on(t.pariwarId),
    check(
      'alert_sms_sends_occasion_check',
      sql`${t.occasion} IN ('day_10', 'pending_match_escalated', 'mismatch:wrong_pool', 'mismatch:amount_mismatch', 'mismatch:entry_already_claimed', 'mismatch:sender_vpa_mismatch', 'cycle_open')`,
    ),
    check(
      'alert_sms_sends_message_check',
      sql`${t.message} IN ('deadline_not_recorded', 'payment_not_matched', 'payment_not_confirmed', 'cycle_open_bridge')`,
    ),
    // 0188 (code review 2026-10-28 (second pass)) — the bridge occasion carries the bridge message, and only it does.
    check('alert_sms_sends_bridge_pairing_check', sql`(${t.occasion} = 'cycle_open') = (${t.message} = 'cycle_open_bridge')`),
    check('alert_sms_sends_locale_check', sql`${t.locale} IN ('hi', 'en')`),
    check(
      'alert_sms_sends_outcome_check',
      sql`${t.outcome} IN ('attempting', 'deferred', 'accepted', 'rejected_invalid_number', 'rejected_unreachable', 'refused', 'error')`,
    ),
    check('alert_sms_sends_attempt_count_check', sql`${t.attemptCount} >= 1`),
    check('alert_sms_sends_claim_token_check', sql`char_length(${t.claimToken}) BETWEEN 1 AND 200`),
    check('alert_sms_sends_accepted_provider_id_check', sql`${t.outcome} <> 'accepted' OR ${t.providerMessageId} IS NOT NULL`),
    check('alert_sms_sends_detail_length_check', sql`${t.detail} IS NULL OR char_length(${t.detail}) <= 200`),
    check(
      'alert_sms_sends_detail_vocabulary_check',
      sql`${t.detail} IS NULL OR ${t.detail} ~ ${sql.raw(`'${ALERT_SMS_SEND_DETAIL_PATTERN}'`)}`,
    ),
  ],
);

export type AlertSmsSendRow = typeof alertSmsSends.$inferSelect;
