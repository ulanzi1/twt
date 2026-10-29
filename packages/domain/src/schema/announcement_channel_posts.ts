// `announcement_channel_posts` — the record of the Trust's channel posts (Story 5.14, Task 1; AC1, AC6), migration 0190
// (`2026-10-29-417` FS2 (a), FS15 (a); `-418` item 11, §3).
//
//   · ONE row per (Pariwar, occasion, subject) — `subject_id` is the POOL id for `pool_open`, the ALERT id for `last_day` (I2; the
//     UNIQUE is the ONLY at-most-once guard). The `alert_sms_sends` (0184) lifecycle: begun (committed) BEFORE the Bot API call; only
//     `deferred` (a 429 — DEFINITELY not posted) is re-claimed, with a NEW claim token; every "may have posted" answer and a crash-left
//     `attempting` row past the lease are FINAL `unknown`.
//   · ⛔ The family's name, ⛔ the post text (FS15 (a)) — the row holds ids, states, the no-decrypt pool label and the date.
//
// The hand-authored half (GRANTs, the per-command policies, FORCE RLS, the finished-row trigger) lives in 0190. TENANT-ISOLATED; RLS
// in policies/announcement-channels-rls.ts. ⚠ The job writes it on the BYPASSRLS pool — the accessors filter on `pariwar_id` (I6).

import { sql } from 'drizzle-orm';
import { check, foreignKey, index, integer, pgTable, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core';

import type { AlertId, PariwarId } from '../ids/index.js';
import { alerts } from './alerts.js';

/** FS5 (a) — the two notices (`-417` §5). ⚠ LOCKSTEP with `announcement_channel_posts_occasion_check` (0190). */
export const ANNOUNCEMENT_POST_OCCASIONS = ['pool_open', 'last_day'] as const;
export type AnnouncementPostOccasion = (typeof ANNOUNCEMENT_POST_OCCASIONS)[number];

/**
 * What is KNOWN about a post. `attempting` (begun, committed, the call in flight or crashed); `deferred` (a 429 — DEFINITELY not
 * posted; the ONLY re-claimable state); the finals: `posted` (Telegram's `ok: true` with a `message_id` — I3), `refused` (Telegram
 * said no, or the job gave up), `unknown` (it MAY have posted — ⛔ retried), `skipped` (never attempted). ⚠ LOCKSTEP with
 * `announcement_channel_posts_state_check` (0190).
 */
export const ANNOUNCEMENT_POST_STATES = ['attempting', 'deferred', 'posted', 'refused', 'unknown', 'skipped'] as const;
export type AnnouncementPostState = (typeof ANNOUNCEMENT_POST_STATES)[number];
export type AnnouncementPostFinalState = Exclude<AnnouncementPostState, 'attempting' | 'deferred'>;

/** ⭐ The `detail` vocabulary per state (`-418` §3; minted under `-210` cl.2). ⚠ LOCKSTEP with the `…_detail_*_check`s (0190). */
export const ANNOUNCEMENT_POST_DEFERRED_DETAILS = ['tg_429'] as const;
/** Why a post was never attempted (FS2) — the job's skip checks, in the order it runs them (AC5 (iii)). */
export const ANNOUNCEMENT_POST_SKIPPED_DETAILS = ['switch_off', 'no_chat_id', 'bot_not_configured', 'stale'] as const;
export type AnnouncementPostSkipReason = (typeof ANNOUNCEMENT_POST_SKIPPED_DETAILS)[number];
/**
 * The literal `refused` details; a Telegram 4xx with a code is `tg_<three digits>` ({@link ANNOUNCEMENT_POST_REFUSED_TG_PATTERN}).
 * The four skip reasons arise under `refused` only as a `deferred` row's give-up (a rule of the JOB, ⛔ of the CHECK — `-418` item 11).
 */
export const ANNOUNCEMENT_POST_REFUSED_DETAILS = [
  'tg_429_expired',
  'secret_unresolved',
  'identity_unavailable',
  ...ANNOUNCEMENT_POST_SKIPPED_DETAILS,
] as const;
export type AnnouncementPostRefusedLiteral = (typeof ANNOUNCEMENT_POST_REFUSED_DETAILS)[number];
/** ⚠ LOCKSTEP with the pattern leg of `announcement_channel_posts_detail_refused_check` (0190). */
export const ANNOUNCEMENT_POST_REFUSED_TG_PATTERN = '^tg_[0-9]{3}$';
/** Every way a post MAY have gone out without a `message_id` coming back (FS7 (a)). */
export const ANNOUNCEMENT_POST_UNKNOWN_DETAILS = [
  'timeout_or_network',
  'http_5xx',
  'no_message_id',
  'stale_lease',
  'unclassified',
] as const;
export type AnnouncementPostUnknownDetail = (typeof ANNOUNCEMENT_POST_UNKNOWN_DETAILS)[number];

/** The `last_date` shape (DD-MM-YYYY — `operationalDate`). ⚠ LOCKSTEP with `announcement_channel_posts_last_date_check` (0190). */
export const ANNOUNCEMENT_POST_LAST_DATE_PATTERN = '^[0-9]{2}-[0-9]{2}-[0-9]{4}$';

export const announcementChannelPosts = pgTable(
  'announcement_channel_posts',
  {
    postId: uuid('post_id').defaultRandom().primaryKey(),
    pariwarId: uuid('pariwar_id').notNull().$type<PariwarId>(),
    occasion: text('occasion').notNull().$type<AnnouncementPostOccasion>(),
    /** The pool id (`pool_open`) or the alert id (`last_day`). */
    subjectId: uuid('subject_id').notNull(),
    alertId: uuid('alert_id').notNull().$type<AlertId>(),
    /** `pool_open` only — the NO-DECRYPT label (curated name ?? letter code — F7). ⛔ A family name. */
    poolLabel: text('pool_label'),
    /** `last_day` only — the cycle's last date, DD-MM-YYYY (the day-14 reminder's `date` — AC4). */
    lastDate: text('last_date'),
    /** Last-day payload snapshot for recovery; never a name or post text. */
    deadlineAt: timestamp('deadline_at', { withTimezone: true, mode: 'date' }),
    /** Persisted Telegram rate-limit boundary, enforced by every deferred claim. */
    retryNotBefore: timestamp('retry_not_before', { withTimezone: true, mode: 'date' }),
    state: text('state').notNull().$type<AnnouncementPostState>(),
    detail: text('detail'),
    /** `${job.id}:${retryCount}` of the attempt that holds the row — ⛔ ever on a job payload (T15). */
    claimToken: text('claim_token').notNull(),
    /** Telegram's `message_id` — REQUIRED on `posted` (I3). TEXT, digits only. */
    telegramMessageId: text('telegram_message_id'),
    attemptCount: integer('attempt_count').notNull().default(1),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull().default(sql`clock_timestamp()`),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }).notNull().default(sql`clock_timestamp()`),
  },
  (t) => [
    foreignKey({ name: 'announcement_channel_posts_alert_id_fk', columns: [t.pariwarId, t.alertId], foreignColumns: [alerts.pariwarId, alerts.alertId] }),
    uniqueIndex('announcement_channel_posts_pariwar_occasion_subject_uq').on(t.pariwarId, t.occasion, t.subjectId),
    index('announcement_channel_posts_pariwar_alert_idx').on(t.pariwarId, t.alertId),
    check('announcement_channel_posts_occasion_check', sql`${t.occasion} IN ('pool_open', 'last_day')`),
    check(
      'announcement_channel_posts_state_check',
      sql`${t.state} IN ('attempting', 'deferred', 'posted', 'refused', 'unknown', 'skipped')`,
    ),
    check('announcement_channel_posts_last_day_subject_check', sql`${t.occasion} <> 'last_day' OR ${t.subjectId} = ${t.alertId}`),
    check(
      'announcement_channel_posts_occasion_fields_check',
      sql`(${t.occasion} = 'pool_open' AND ${t.poolLabel} IS NOT NULL AND ${t.lastDate} IS NULL) OR (${t.occasion} = 'last_day' AND ${t.lastDate} IS NOT NULL AND ${t.poolLabel} IS NULL)`,
    ),
    check('announcement_channel_posts_pool_label_check', sql`${t.poolLabel} IS NULL OR char_length(${t.poolLabel}) BETWEEN 1 AND 100`),
    check(
      'announcement_channel_posts_last_date_check',
      sql`${t.lastDate} IS NULL OR ${t.lastDate} ~ ${sql.raw(`'${ANNOUNCEMENT_POST_LAST_DATE_PATTERN}'`)}`,
    ),
    check('announcement_channel_posts_attempt_count_check', sql`${t.attemptCount} >= 1`),
    check('announcement_channel_posts_claim_token_check', sql`char_length(${t.claimToken}) BETWEEN 1 AND 200`),
    check('announcement_channel_posts_posted_message_id_check', sql`${t.state} <> 'posted' OR ${t.telegramMessageId} IS NOT NULL`),
    check('announcement_channel_posts_message_id_check', sql`${t.telegramMessageId} IS NULL OR ${t.telegramMessageId} ~ '^[0-9]{1,20}$'`),
    check('announcement_channel_posts_detail_null_check', sql`${t.state} NOT IN ('attempting', 'posted') OR ${t.detail} IS NULL`),
    check(
      'announcement_channel_posts_detail_deferred_check',
      sql`${t.state} <> 'deferred' OR (${t.detail} IS NOT NULL AND ${t.detail} IN ('tg_429'))`,
    ),
    check(
      'announcement_channel_posts_detail_skipped_check',
      sql`${t.state} <> 'skipped' OR (${t.detail} IS NOT NULL AND ${t.detail} IN ('switch_off', 'no_chat_id', 'bot_not_configured', 'stale'))`,
    ),
    check(
      'announcement_channel_posts_detail_refused_check',
      sql`${t.state} <> 'refused' OR (${t.detail} IS NOT NULL AND (${t.detail} IN ('tg_429_expired', 'secret_unresolved', 'identity_unavailable', 'switch_off', 'no_chat_id', 'bot_not_configured', 'stale') OR ${t.detail} ~ ${sql.raw(`'${ANNOUNCEMENT_POST_REFUSED_TG_PATTERN}'`)}))`,
    ),
    check(
      'announcement_channel_posts_detail_unknown_check',
      sql`${t.state} <> 'unknown' OR (${t.detail} IS NOT NULL AND ${t.detail} IN ('timeout_or_network', 'http_5xx', 'no_message_id', 'stale_lease', 'unclassified'))`,
    ),
  ],
);

export type AnnouncementChannelPostRow = typeof announcementChannelPosts.$inferSelect;
