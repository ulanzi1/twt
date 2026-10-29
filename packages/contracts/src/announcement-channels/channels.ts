// The Trust's announcement channels — the HTTP DTOs (Story 5.14, Task 2; `2026-10-29-417` FS3 (a), FS4 (a), FS12 (a), FS15 (a); AC2,
// AC3). Three surfaces:
//   · GET / PUT  /api/v1/p/{pariwarId}/admin/announcement-channels       — the per-Pariwar config (`pariwar.configure_channels`).
//   · GET        /api/v1/p/{pariwarId}/admin/announcement-channels/posts — the "Posts" list (an AUDITED read; the words only while ON).
//   · GET        /api/v1/member/announcement-channels                    — the links a member is shown (both null while OFF — I1).
// ⛔ The bot's secret NAME or value is ever carried (AC2). ⚠ The patterns below are LOCKSTEP with the CHECKs (0190; the two link
// CHECKs re-added by 0191) and the domain constants (`schema/pariwar_announcement_channels.ts`) — duplicated, ⛔ imported: this file
// ships in the mobile bundle, and a source import of `@twt/domain` would pull `pg` into Metro
// ([[project_contracts_domain_bundle_boundary]]); a contracts test pins them equal.

import { z } from 'zod';

/** ⚠ LOCKSTEP with `ANNOUNCEMENT_TELEGRAM_CHAT_ID_PATTERN` (domain) and `pariwar_announcement_channels_chat_id_check` (0190). */
export const ANNOUNCEMENT_TELEGRAM_CHAT_ID_REGEX = /^(@[A-Za-z][A-Za-z0-9_]{4,31}|-100[0-9]{1,16})$/;
/**
 * ⚠ LOCKSTEP with `ANNOUNCEMENT_TELEGRAM_INVITE_URL_PATTERN` (domain) — `https://` only, ⛔ `tg://` (F11); a NON-EMPTY path with no
 * whitespace (review G2-P15 — migration 0191 re-adds the CHECK; ⛔ a bare `https://t.me/`).
 */
export const ANNOUNCEMENT_TELEGRAM_INVITE_URL_REGEX = /^https:\/\/t\.me\/\S+$/;
/** ⚠ LOCKSTEP with `ANNOUNCEMENT_WHATSAPP_CHANNEL_URL_PATTERN` (domain) — a non-empty, whitespace-free path (G2-P15, 0191). */
export const ANNOUNCEMENT_WHATSAPP_CHANNEL_URL_REGEX = /^https:\/\/(www\.)?whatsapp\.com\/channel\/\S+$/;
/** ⚠ LOCKSTEP with `pariwar_announcement_channels_url_length_check` (0190). */
export const ANNOUNCEMENT_CHANNEL_URL_MAX_LENGTH = 300;

/** A blank form field is "not set" (⛔ an empty string in the row). */
const blankToNull = (v: unknown): unknown => (typeof v === 'string' && v.trim() === '' ? null : v);

const optionalField = (regex: RegExp, message: string, max: number) =>
  z.preprocess(blankToNull, z.string().trim().max(max).regex(regex, message).nullable());

/**
 * The config — request (PUT) and response (GET) share this shape. `enabled` is the ONE "channels live" switch (I1): Telegram posting,
 * the links shown to members, and the WhatsApp words offered to the admin. The refinements equal the CHECKs (AC2) — incl. the pairing
 * (I7: a Telegram link only with a chat id, and a chat id only with a link).
 */
export const AnnouncementChannelsConfigDto = z
  .object({
    enabled: z.boolean(),
    telegramChannelChatId: optionalField(ANNOUNCEMENT_TELEGRAM_CHAT_ID_REGEX, 'must be a channel @username or its -100… id', 33),
    telegramInviteUrl: optionalField(ANNOUNCEMENT_TELEGRAM_INVITE_URL_REGEX, 'must be an https://t.me/ link', ANNOUNCEMENT_CHANNEL_URL_MAX_LENGTH),
    whatsappChannelUrl: optionalField(
      ANNOUNCEMENT_WHATSAPP_CHANNEL_URL_REGEX,
      'must be an https://whatsapp.com/channel/ link',
      ANNOUNCEMENT_CHANNEL_URL_MAX_LENGTH,
    ),
  })
  .strict()
  .superRefine((v, ctx) => {
    if ((v.telegramInviteUrl === null) !== (v.telegramChannelChatId === null)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: [v.telegramInviteUrl === null ? 'telegramInviteUrl' : 'telegramChannelChatId'],
        message: 'the Telegram link and the channel id are set together (or both left blank)',
      });
    }
  });
export type AnnouncementChannelsConfigDto = z.output<typeof AnnouncementChannelsConfigDto>;

/** GET (and the PUT's answer) — the config, and whether a row exists (`false` ⇒ the OFF defaults; ⛔ a 404). */
export const AnnouncementChannelsConfigResponse = z
  .object({
    configured: z.boolean(),
    config: AnnouncementChannelsConfigDto,
  })
  .strict();
export type AnnouncementChannelsConfigResponse = z.output<typeof AnnouncementChannelsConfigResponse>;

/** PUT — upsert the config. */
export const AnnouncementChannelsConfigUpsertRequest = AnnouncementChannelsConfigDto;
export type AnnouncementChannelsConfigUpsertRequest = z.output<typeof AnnouncementChannelsConfigUpsertRequest>;

/** FS4 (a) / FS15 (a) — the two notices. */
export const AnnouncementPostOccasion = z.enum(['pool_open', 'last_day']);
export type AnnouncementPostOccasion = z.output<typeof AnnouncementPostOccasion>;

/**
 * The Telegram state the admin list SHOWS (AC2): the record's state, with an `attempting` row past the lease shown `unknown` and a
 * `deferred` row past its max age shown `refused`; `not_attempted` ⇒ no row (a dropped enqueue — I9).
 */
export const AnnouncementPostTelegramState = z.enum(['posted', 'deferred', 'refused', 'unknown', 'skipped', 'attempting', 'not_attempted']);
export type AnnouncementPostTelegramState = z.output<typeof AnnouncementPostTelegramState>;

/**
 * The literal reasons a post row records (`-418` §3's `detail` vocabulary — ⛔ a new mint, `-419` §3). ⚠ LOCKSTEP with the domain's
 * `ANNOUNCEMENT_POST_{DEFERRED,REFUSED,UNKNOWN}_DETAILS` (and so 0190's `…_detail_*_check`s) — duplicated, ⛔ imported (the bundle
 * boundary above); a contracts test pins them equal. A Telegram 4xx is `tg_<three digits>` ({@link ANNOUNCEMENT_POST_TG_REASON_REGEX}).
 */
export const ANNOUNCEMENT_POST_REASON_CODES = [
  'tg_429',
  'tg_429_expired',
  'secret_unresolved',
  'identity_unavailable',
  'switch_off',
  'no_chat_id',
  'bot_not_configured',
  'stale',
  'timeout_or_network',
  'http_5xx',
  'no_message_id',
  'stale_lease',
  'unclassified',
] as const;
/** ⚠ LOCKSTEP with `ANNOUNCEMENT_POST_REFUSED_TG_PATTERN` (domain). */
export const ANNOUNCEMENT_POST_TG_REASON_REGEX = /^tg_[0-9]{3}$/;

/**
 * `-419` item 6 (c) — WHY a row is in its shown state: the row's recorded `detail`, or — where the list itself moves the shown state
 * (AC2) — the reason the job gives that move: `stale_lease` (an `attempting` row past the lease), `tg_429_expired` (a `deferred` row
 * past its max age), `stale` (a `last_day` row still `deferred` at its deadline). `null` ⇒ none (`posted`, `attempting`, no row). A
 * code, ⛔ text — the admin page words it (admin-only English, `-419` §3), and it never carries a name.
 */
export const AnnouncementPostReason = z.union([z.enum(ANNOUNCEMENT_POST_REASON_CODES), z.string().regex(ANNOUNCEMENT_POST_TG_REASON_REGEX)]);
export type AnnouncementPostReason = z.output<typeof AnnouncementPostReason>;

/**
 * One entry of the "Posts" list: a pool opening (its pool label) or a cycle's last day (its date), the Telegram state and its `reason`,
 * and — ONLY while the switch is ON and the cycle's alert is `live` (`-419` item 6 (b)) — the exact bilingual words to copy into the
 * WhatsApp Channel (`words`; `null` otherwise). `wordsUnavailable` ⇒ the words were due but could not be built (the name or the pool
 * label could not be read — FS15, ⛔ a 500). `poolLabel` is `null` for a last day, or for a pool whose label cannot be built (G2-P14).
 * Nothing else (⛔ a member field).
 */
export const AnnouncementPostEntry = z
  .object({
    occasion: AnnouncementPostOccasion,
    alertId: z.string().uuid(),
    subjectId: z.string().uuid(),
    poolLabel: z.string().nullable(),
    lastDate: z.string().nullable(),
    telegramState: AnnouncementPostTelegramState,
    reason: AnnouncementPostReason.nullable(),
    words: z.string().nullable(),
    wordsUnavailable: z.boolean(),
  })
  .strict();
export type AnnouncementPostEntry = z.output<typeof AnnouncementPostEntry>;

/**
 * GET …/posts — a NAMED array (`posts`), bounded BY HAND in the domain read (raw SQL: at most 20 cycles, at most 500 pools per cycle —
 * ⛔ checked by `domain-accessor-invariants`, which sees only Drizzle `.limit()`; review G2-P8). `enabled` tells the page why words are
 * absent.
 */
export const AnnouncementPostsResponse = z
  .object({
    enabled: z.boolean(),
    posts: z.array(AnnouncementPostEntry),
  })
  .strict();
export type AnnouncementPostsResponse = z.output<typeof AnnouncementPostsResponse>;

/**
 * GET /api/v1/member/announcement-channels — the member's OWN Pariwar's links (FS12 (a)): BOTH null while the switch is off (I1);
 * `telegramChannelUrl` only when a chat id and the bot's token name are set (I7).
 */
export const AnnouncementChannelsMemberResponse = z
  .object({
    whatsappChannelUrl: z.string().nullable(),
    telegramChannelUrl: z.string().nullable(),
  })
  .strict();
export type AnnouncementChannelsMemberResponse = z.output<typeof AnnouncementChannelsMemberResponse>;
