// The Trust's announcement channels — the per-Pariwar config accessors (Story 5.14, Task 1; `2026-10-29-417` FS3 (a), FS12 (a); AC1,
// AC2, AC3, AC5 (iii)). Migration 0190's `pariwar_announcement_channels`, read and written in RAW SQL on a caller-supplied `pg` handle:
// the API's scope transaction (`twt_app`, RLS applies) or the job's service pool (BYPASSRLS — the explicit `pariwar_id = $1` is the
// isolation, I6). A transport-free PRIMITIVE: ⛔ Secret-Manager resolution, ⛔ Telegram call — the bot's secret NAME is read (whether it
// is set), never its value.

import type { Queryable } from './posts.js';

/** The config as the admin form reads and writes it (FS3 (a)). */
export interface AnnouncementChannelsConfig {
  readonly enabled: boolean;
  readonly telegramChannelChatId: string | null;
  readonly telegramInviteUrl: string | null;
  readonly whatsappChannelUrl: string | null;
}

/** A Pariwar with no row is OFF with nothing set (⛔ a 404 — AC2). */
export const ANNOUNCEMENT_CHANNELS_DEFAULT_CONFIG: AnnouncementChannelsConfig = Object.freeze({
  enabled: false,
  telegramChannelChatId: null,
  telegramInviteUrl: null,
  whatsappChannelUrl: null,
});

/**
 * ⭐ The ONE read both the job (AT POST TIME — I1, T13) and the member read use: the config, and whether the Pariwar's EXISTING bot
 * has a token NAME (`pariwar_telegram_config.bot_token_secret_name` non-blank — FS3 (a), FS12 (a)). `botTokenSecretName` is the NAME
 * (a pointer, ⛔ a secret) — the API reads only whether it is set (AC2: ⛔ ever returned). Both reads filter on `pariwar_id = $1` (I6).
 */
export interface AnnouncementChannelsState {
  readonly config: AnnouncementChannelsConfig;
  readonly botTokenSecretName: string | null;
}

interface ConfigRow {
  enabled: boolean;
  telegram_channel_chat_id: string | null;
  telegram_invite_url: string | null;
  whatsapp_channel_url: string | null;
}

function toConfig(r: ConfigRow | undefined): AnnouncementChannelsConfig {
  if (r === undefined) return ANNOUNCEMENT_CHANNELS_DEFAULT_CONFIG;
  return {
    enabled: r.enabled,
    telegramChannelChatId: r.telegram_channel_chat_id,
    telegramInviteUrl: r.telegram_invite_url,
    whatsappChannelUrl: r.whatsapp_channel_url,
  };
}

/** The Pariwar's config, or the OFF default when no row exists. */
export async function getAnnouncementChannelsConfig(q: Queryable, pariwarId: string): Promise<AnnouncementChannelsConfig> {
  const { rows } = await q.query<ConfigRow>(
    `SELECT enabled, telegram_channel_chat_id, telegram_invite_url, whatsapp_channel_url
       FROM pariwar_announcement_channels WHERE pariwar_id = $1`,
    [pariwarId],
  );
  return toConfig(rows[0]);
}

/** {@link AnnouncementChannelsState} — the config and the bot's token NAME, read together (two explicit predicates — I6). */
export async function readAnnouncementChannelsState(q: Queryable, pariwarId: string): Promise<AnnouncementChannelsState> {
  const { rows } = await q.query<Omit<ConfigRow, 'enabled'> & { enabled: boolean | null; bot_token_secret_name: string | null }>(
    `SELECT c.enabled, c.telegram_channel_chat_id, c.telegram_invite_url, c.whatsapp_channel_url,
            (SELECT t.bot_token_secret_name FROM pariwar_telegram_config t WHERE t.pariwar_id = $1) AS bot_token_secret_name
       FROM (SELECT $1::uuid AS pariwar_id) p
       LEFT JOIN pariwar_announcement_channels c ON c.pariwar_id = p.pariwar_id`,
    [pariwarId],
  );
  const r = rows[0];
  // No config row ⇒ the LEFT JOIN's `enabled` is NULL ⇒ the OFF default.
  const config = r === undefined || r.enabled === null ? ANNOUNCEMENT_CHANNELS_DEFAULT_CONFIG : toConfig({ ...r, enabled: r.enabled });
  return { config, botTokenSecretName: r?.bot_token_secret_name ?? null };
}

/** A token NAME counts only when non-blank (F3 — a blank name is the fixture). */
export function hasBotTokenName(state: AnnouncementChannelsState): boolean {
  return (state.botTokenSecretName ?? '').trim() !== '';
}

/**
 * ⭐ FS12 (a) — the links a MEMBER is shown: BOTH null while the switch is off (I1); the Telegram link only with a chat id AND a bot
 * token name (I7 — never a link to a channel nothing can post to).
 */
export function memberVisibleAnnouncementLinks(state: AnnouncementChannelsState): {
  readonly whatsappChannelUrl: string | null;
  readonly telegramChannelUrl: string | null;
} {
  const c = state.config;
  if (!c.enabled) return { whatsappChannelUrl: null, telegramChannelUrl: null };
  const telegramPostable = c.telegramInviteUrl !== null && c.telegramChannelChatId !== null && hasBotTokenName(state);
  return { whatsappChannelUrl: c.whatsappChannelUrl, telegramChannelUrl: telegramPostable ? c.telegramInviteUrl : null };
}

/**
 * The admin PUT (AC2) — an upsert on the caller's scope transaction (`twt_app`; RLS + the key). Returns the row as written. The
 * CHECKs are the backstop for the contract's refinements. ⛔ DELETE (0190 grants none).
 */
export async function upsertAnnouncementChannelsConfig(
  q: Queryable,
  input: AnnouncementChannelsConfig & { readonly pariwarId: string; readonly updatedByActor: string | null },
): Promise<AnnouncementChannelsConfig> {
  const { rows } = await q.query<ConfigRow>(
    `INSERT INTO pariwar_announcement_channels
            (pariwar_id, enabled, telegram_channel_chat_id, telegram_invite_url, whatsapp_channel_url, updated_by_actor)
     VALUES ($1, $2, $3, $4, $5, $6)
     ON CONFLICT (pariwar_id) DO UPDATE
        SET enabled = EXCLUDED.enabled,
            telegram_channel_chat_id = EXCLUDED.telegram_channel_chat_id,
            telegram_invite_url = EXCLUDED.telegram_invite_url,
            whatsapp_channel_url = EXCLUDED.whatsapp_channel_url,
            updated_by_actor = EXCLUDED.updated_by_actor,
            updated_at = clock_timestamp()
     RETURNING enabled, telegram_channel_chat_id, telegram_invite_url, whatsapp_channel_url`,
    [input.pariwarId, input.enabled, input.telegramChannelChatId, input.telegramInviteUrl, input.whatsappChannelUrl, input.updatedByActor],
  );
  return toConfig(rows[0]);
}
