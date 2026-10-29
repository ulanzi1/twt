// `pariwar_announcement_channels` — the Trust's announcement channels, per Pariwar (Story 5.14, Task 1; AC1), migration 0190
// (`2026-10-29-417` FS1 (a), FS3 (a)).
//
// 1:1 with a Pariwar (the `pariwar_telegram_config` singleton shape — `pariwar_id` is BOTH the primary key AND the tenant key). For v1
// the one Pariwar's row IS "the Trust's" channels (G6). It holds the two invite links, the Telegram channel's chat id and ONE "channels
// live" switch that STARTS OFF (I1): while it is off nothing is posted, the member read returns no link, and the admin "Posts" list
// shows states only. The poster uses the Pariwar's EXISTING bot credential (`pariwar_telegram_config.bot_token_secret_name`) — ⛔ a
// token here, and ⛔ the per-member mirror's `enabled` (F3).
//
// The hand-authored half (GRANTs — ⛔ DELETE —, the per-command policies, FORCE RLS) lives in 0190. TENANT-ISOLATED; RLS in
// policies/announcement-channels-rls.ts. ⚠ The job reads it on the BYPASSRLS pool — the accessors filter on `pariwar_id` (I6).

import { sql } from 'drizzle-orm';
import { boolean, check, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

import type { PariwarId, UserId } from '../ids/index.js';

/**
 * A Telegram channel `chat_id`: `@username` (5–32 characters) or the `-100…` numeric id. TEXT end to end — the numeric id exceeds
 * 2^31 (T9). ⚠ LOCKSTEP with `pariwar_announcement_channels_chat_id_check` (0190) and the contract's PUT refinement.
 */
export const ANNOUNCEMENT_TELEGRAM_CHAT_ID_PATTERN = '^(@[A-Za-z][A-Za-z0-9_]{4,31}|-100[0-9]{1,16})$';
/**
 * ⚠ LOCKSTEP with `pariwar_announcement_channels_telegram_url_check` (0190, re-added by 0191). `https://` only — ⛔ `tg://` (F11); a
 * NON-EMPTY path with no whitespace (review G2-P15 — ⛔ a bare `https://t.me/`).
 */
export const ANNOUNCEMENT_TELEGRAM_INVITE_URL_PATTERN = '^https://t\\.me/\\S+$';
/**
 * ⚠ LOCKSTEP with `pariwar_announcement_channels_whatsapp_url_check` (0190, re-added by 0191) — the observed invite form (F12; Meta
 * publishes no spec), with a non-empty, whitespace-free path (G2-P15).
 */
export const ANNOUNCEMENT_WHATSAPP_CHANNEL_URL_PATTERN = '^https://(www\\.)?whatsapp\\.com/channel/\\S+$';
/** ⚠ LOCKSTEP with `pariwar_announcement_channels_url_length_check` (0190). */
export const ANNOUNCEMENT_CHANNEL_URL_MAX_LENGTH = 300;

export const pariwarAnnouncementChannels = pgTable(
  'pariwar_announcement_channels',
  {
    pariwarId: uuid('pariwar_id').$type<PariwarId>().primaryKey(),
    /** ⭐ The ONE "channels live" switch (I1) — Telegram posting, the links shown, the WhatsApp words offered. Starts OFF. */
    enabled: boolean('enabled').notNull().default(false),
    telegramChannelChatId: text('telegram_channel_chat_id'),
    telegramInviteUrl: text('telegram_invite_url'),
    whatsappChannelUrl: text('whatsapp_channel_url'),
    /** The admin who last wrote the row (audit provenance; the audit line carries the actor). FK-free, as `pariwar_telegram_config`. */
    updatedByActor: uuid('updated_by_actor').$type<UserId>(),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull().default(sql`clock_timestamp()`),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }).notNull().default(sql`clock_timestamp()`),
  },
  (t) => [
    check(
      'pariwar_announcement_channels_chat_id_check',
      sql`${t.telegramChannelChatId} IS NULL OR ${t.telegramChannelChatId} ~ ${sql.raw(`'${ANNOUNCEMENT_TELEGRAM_CHAT_ID_PATTERN}'`)}`,
    ),
    check(
      'pariwar_announcement_channels_telegram_url_check',
      sql`${t.telegramInviteUrl} IS NULL OR ${t.telegramInviteUrl} ~ ${sql.raw(`'${ANNOUNCEMENT_TELEGRAM_INVITE_URL_PATTERN}'`)}`,
    ),
    check(
      'pariwar_announcement_channels_whatsapp_url_check',
      sql`${t.whatsappChannelUrl} IS NULL OR ${t.whatsappChannelUrl} ~ ${sql.raw(`'${ANNOUNCEMENT_WHATSAPP_CHANNEL_URL_PATTERN}'`)}`,
    ),
    // I7 — a Telegram link only with somewhere to post, and a chat id only with a link to show.
    check(
      'pariwar_announcement_channels_telegram_pairing_check',
      sql`(${t.telegramInviteUrl} IS NULL) = (${t.telegramChannelChatId} IS NULL)`,
    ),
    check(
      'pariwar_announcement_channels_url_length_check',
      sql`((${t.telegramInviteUrl} IS NULL) OR char_length(${t.telegramInviteUrl}) <= 300) AND ((${t.whatsappChannelUrl} IS NULL) OR char_length(${t.whatsappChannelUrl}) <= 300)`,
    ),
  ],
);

export type PariwarAnnouncementChannelsRow = typeof pariwarAnnouncementChannels.$inferSelect;
