-- Migration 0190 — the Trust's announcement channels (Story 5.14, Task 1; `2026-10-29-417` FS1–FS3, FS15, as amended by `-418`
-- items 11 and §3; AC1). Hand-authored — ⛔ never regenerate (`db:generate` diffs against the 0020 snapshot). NUMBER: 0189 is 6.32's
-- (on `main`); the `when` sits above every sibling journal entry (a later `when` applied first makes drizzle skip the other —
-- [[project_sibling_migration_when_order_shared_db]]).
--
-- ⭐ TWO TABLES, BOTH PER PARIWAR (FS1 (a) — for v1 the one Pariwar's channels ARE "the Trust's"; G6):
--   · `pariwar_announcement_channels` — the config a Pariwar admin fills in: the two invite links, the Telegram channel's chat id and
--     ONE "channels live" switch that STARTS OFF (I1). While it is off nothing is posted and the member read returns no link. A
--     Telegram invite link is never stored without a chat id, and a chat id never without a link (the pairing CHECK — I7: a link is
--     never shown to a channel nothing can post to). The bot is the Pariwar's EXISTING one (`pariwar_telegram_config`); ⛔ a token
--     column here. ⛔ DELETE for `twt_app` — the row is switched off, never deleted (a deliberate narrowing of 0045's S/I/U/D).
--   · `announcement_channel_posts` — at most ONE row per (Pariwar, occasion, subject): `subject_id` is the POOL id for `pool_open`, the
--     ALERT id for `last_day` (I2 — the UNIQUE is the ONLY at-most-once guard; `singletonKey` dedupes nothing). The `alert_sms_sends`
--     (0184) lifecycle, copied: the row is begun (committed) BEFORE the Bot API call; only `deferred` (a 429 — DEFINITELY not posted)
--     is ever re-claimed, with a NEW `claim_token`; an `attempting` row past the lease and every "may have posted" answer are FINAL
--     `unknown`, ⛔ re-posted. ⛔ The family's name, ⛔ the post text (FS15 (a) — the words are rebuilt at read): the row holds ids,
--     states, the no-decrypt pool label and the date.
-- ⭐ A FINISHED ROW IS FROZEN (0184's shape): the trigger refuses ANY update of a row whose state is neither `attempting` nor
-- `deferred`, and moves a `deferred` row only to `deferred` / `attempting` / `refused` (the give-up). INSERT is unguarded by the
-- trigger: a never-attempted final row (`skipped:*`, `refused:secret_unresolved`, `refused:identity_unavailable`) is INSERTed as
-- `attempting` and compare-and-set to final in ONE short transaction (`-418` item 11 — the `recordLadderDeliveredAlertSmsSend` shape;
-- the INSERT grant has ⛔ `detail`). The trigger binds every role at DEFAULT session settings.
-- ⭐ `detail` per state (`-418` §3 — minted under `-210` cl.2), CHECK-paired: `attempting` / `posted` ⇒ NULL; `deferred` ⇒ `tg_429`;
-- `skipped` ⇒ `switch_off` | `no_chat_id` | `bot_not_configured` | `stale`; `refused` ⇒ `tg_<three digits>` | `tg_429_expired` |
-- `secret_unresolved` | `identity_unavailable` | `switch_off` | `no_chat_id` | `bot_not_configured` | `stale` (the last four only as a
-- `deferred` row's give-up — a rule of the JOB, ⛔ of the CHECK); `unknown` ⇒ `timeout_or_network` | `http_5xx` | `no_message_id` |
-- `stale_lease` | `unclassified`. ⚠ LOCKSTEP with the constants in `schema/announcement_channel_posts.ts`.
-- ⚠ TENANCY (I6): the grants and policies bind `twt_app` only (the API's request role). The JOB runs on the BYPASSRLS service pool and
-- `withPariwarScope` only sets the GUC, so its isolation is an EXPLICIT `pariwar_id = $1` predicate in every accessor (roster Row 26,
-- the 2026-10-29 note). The CHECKs and the trigger bind EVERY role.
-- PII: ⛔ name, ⛔ text, ⛔ member id. RTBF: ids only — ⛔ an erasure column ([[project_append_only_guard_names_erasure_columns]]).

CREATE TABLE "pariwar_announcement_channels" (
	"pariwar_id" uuid PRIMARY KEY NOT NULL,
	"enabled" boolean DEFAULT false NOT NULL,
	"telegram_channel_chat_id" text,
	"telegram_invite_url" text,
	"whatsapp_channel_url" text,
	"updated_by_actor" uuid,
	"created_at" timestamp with time zone DEFAULT clock_timestamp() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT clock_timestamp() NOT NULL
);--> statement-breakpoint
-- ⚠ LOCKSTEP with `ANNOUNCEMENT_TELEGRAM_CHAT_ID_PATTERN` / `ANNOUNCEMENT_TELEGRAM_INVITE_URL_PATTERN` /
-- `ANNOUNCEMENT_WHATSAPP_CHANNEL_URL_PATTERN` (schema/pariwar_announcement_channels.ts) and the contract's PUT refinements. A channel
-- `chat_id` is `@username` or the `-100…` numeric id — TEXT end to end (T9: it exceeds 2^31).
ALTER TABLE "pariwar_announcement_channels" ADD CONSTRAINT "pariwar_announcement_channels_chat_id_check" CHECK ("telegram_channel_chat_id" IS NULL OR "telegram_channel_chat_id" ~ '^(@[A-Za-z][A-Za-z0-9_]{4,31}|-100[0-9]{1,16})$');--> statement-breakpoint
ALTER TABLE "pariwar_announcement_channels" ADD CONSTRAINT "pariwar_announcement_channels_telegram_url_check" CHECK ("telegram_invite_url" IS NULL OR "telegram_invite_url" ~ '^https://t\.me/');--> statement-breakpoint
ALTER TABLE "pariwar_announcement_channels" ADD CONSTRAINT "pariwar_announcement_channels_whatsapp_url_check" CHECK ("whatsapp_channel_url" IS NULL OR "whatsapp_channel_url" ~ '^https://(www\.)?whatsapp\.com/channel/');--> statement-breakpoint
-- I7 — a Telegram link is never shown with nowhere to post (and a chat id is never posted to with no link to show).
ALTER TABLE "pariwar_announcement_channels" ADD CONSTRAINT "pariwar_announcement_channels_telegram_pairing_check" CHECK (("telegram_invite_url" IS NULL) = ("telegram_channel_chat_id" IS NULL));--> statement-breakpoint
-- A bound on the two links (a URL a member's phone opens; ⛔ an unbounded string in a config row).
ALTER TABLE "pariwar_announcement_channels" ADD CONSTRAINT "pariwar_announcement_channels_url_length_check" CHECK ((("telegram_invite_url" IS NULL) OR char_length("telegram_invite_url") <= 300) AND (("whatsapp_channel_url" IS NULL) OR char_length("whatsapp_channel_url") <= 300));--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE ON "pariwar_announcement_channels" TO twt_app;--> statement-breakpoint
ALTER TABLE "pariwar_announcement_channels" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "pariwar_announcement_channels" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "pariwar_announcement_channels_tenant_isolation_select" ON "pariwar_announcement_channels" AS PERMISSIVE FOR SELECT TO "twt_app" USING (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "pariwar_announcement_channels_tenant_isolation_insert" ON "pariwar_announcement_channels" AS PERMISSIVE FOR INSERT TO "twt_app" WITH CHECK (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "pariwar_announcement_channels_tenant_isolation_update" ON "pariwar_announcement_channels" AS PERMISSIVE FOR UPDATE TO "twt_app" USING (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid) WITH CHECK (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid);--> statement-breakpoint
CREATE TABLE "announcement_channel_posts" (
	"post_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"pariwar_id" uuid NOT NULL,
	"occasion" text NOT NULL,
	"subject_id" uuid NOT NULL,
	"alert_id" uuid NOT NULL,
	"pool_label" text,
	"last_date" text,
	"state" text NOT NULL,
	"detail" text,
	"claim_token" text NOT NULL,
	"telegram_message_id" text,
	"attempt_count" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT clock_timestamp() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT clock_timestamp() NOT NULL
);--> statement-breakpoint
ALTER TABLE "announcement_channel_posts" ADD CONSTRAINT "announcement_channel_posts_alert_id_fk" FOREIGN KEY ("alert_id") REFERENCES "public"."alerts"("alert_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
-- ⚠ LOCKSTEP with `ANNOUNCEMENT_POST_OCCASIONS` / `ANNOUNCEMENT_POST_STATES` and the five `ANNOUNCEMENT_POST_*_DETAILS` constants.
ALTER TABLE "announcement_channel_posts" ADD CONSTRAINT "announcement_channel_posts_occasion_check" CHECK ("occasion" IN ('pool_open', 'last_day'));--> statement-breakpoint
ALTER TABLE "announcement_channel_posts" ADD CONSTRAINT "announcement_channel_posts_state_check" CHECK ("state" IN ('attempting', 'deferred', 'posted', 'refused', 'unknown', 'skipped'));--> statement-breakpoint
-- A `last_day` post's subject IS its alert (one post per cycle — FS5 (a)).
ALTER TABLE "announcement_channel_posts" ADD CONSTRAINT "announcement_channel_posts_last_day_subject_check" CHECK ("occasion" <> 'last_day' OR "subject_id" = "alert_id");--> statement-breakpoint
-- What each occasion records (FS15 (a)): a pool opening its no-decrypt pool label, a last day its date (DD-MM-YYYY — `operationalDate`).
ALTER TABLE "announcement_channel_posts" ADD CONSTRAINT "announcement_channel_posts_occasion_fields_check" CHECK (("occasion" = 'pool_open' AND "pool_label" IS NOT NULL AND "last_date" IS NULL) OR ("occasion" = 'last_day' AND "last_date" IS NOT NULL AND "pool_label" IS NULL));--> statement-breakpoint
ALTER TABLE "announcement_channel_posts" ADD CONSTRAINT "announcement_channel_posts_pool_label_check" CHECK ("pool_label" IS NULL OR char_length("pool_label") BETWEEN 1 AND 100);--> statement-breakpoint
ALTER TABLE "announcement_channel_posts" ADD CONSTRAINT "announcement_channel_posts_last_date_check" CHECK ("last_date" IS NULL OR "last_date" ~ '^[0-9]{2}-[0-9]{2}-[0-9]{4}$');--> statement-breakpoint
ALTER TABLE "announcement_channel_posts" ADD CONSTRAINT "announcement_channel_posts_attempt_count_check" CHECK ("attempt_count" >= 1);--> statement-breakpoint
ALTER TABLE "announcement_channel_posts" ADD CONSTRAINT "announcement_channel_posts_claim_token_check" CHECK (char_length("claim_token") BETWEEN 1 AND 200);--> statement-breakpoint
-- I3 — ⛔ a post reported made without Telegram's `message_id`.
ALTER TABLE "announcement_channel_posts" ADD CONSTRAINT "announcement_channel_posts_posted_message_id_check" CHECK ("state" <> 'posted' OR "telegram_message_id" IS NOT NULL);--> statement-breakpoint
ALTER TABLE "announcement_channel_posts" ADD CONSTRAINT "announcement_channel_posts_message_id_check" CHECK ("telegram_message_id" IS NULL OR "telegram_message_id" ~ '^[0-9]{1,20}$');--> statement-breakpoint
-- ⭐ `detail` per state (`-418` §3). A NULL detail fails every non-NULL leg (`detail IS NOT NULL AND …` — ⛔ a bare `IN`, which a NULL passes).
ALTER TABLE "announcement_channel_posts" ADD CONSTRAINT "announcement_channel_posts_detail_null_check" CHECK ("state" NOT IN ('attempting', 'posted') OR "detail" IS NULL);--> statement-breakpoint
ALTER TABLE "announcement_channel_posts" ADD CONSTRAINT "announcement_channel_posts_detail_deferred_check" CHECK ("state" <> 'deferred' OR ("detail" IS NOT NULL AND "detail" IN ('tg_429')));--> statement-breakpoint
ALTER TABLE "announcement_channel_posts" ADD CONSTRAINT "announcement_channel_posts_detail_skipped_check" CHECK ("state" <> 'skipped' OR ("detail" IS NOT NULL AND "detail" IN ('switch_off', 'no_chat_id', 'bot_not_configured', 'stale')));--> statement-breakpoint
ALTER TABLE "announcement_channel_posts" ADD CONSTRAINT "announcement_channel_posts_detail_refused_check" CHECK ("state" <> 'refused' OR ("detail" IS NOT NULL AND ("detail" IN ('tg_429_expired', 'secret_unresolved', 'identity_unavailable', 'switch_off', 'no_chat_id', 'bot_not_configured', 'stale') OR "detail" ~ '^tg_[0-9]{3}$')));--> statement-breakpoint
ALTER TABLE "announcement_channel_posts" ADD CONSTRAINT "announcement_channel_posts_detail_unknown_check" CHECK ("state" <> 'unknown' OR ("detail" IS NOT NULL AND "detail" IN ('timeout_or_network', 'http_5xx', 'no_message_id', 'stale_lease', 'unclassified')));--> statement-breakpoint
-- ⭐ THE once-only key (I2).
CREATE UNIQUE INDEX "announcement_channel_posts_pariwar_occasion_subject_uq" ON "announcement_channel_posts" USING btree ("pariwar_id", "occasion", "subject_id");--> statement-breakpoint
-- The admin "Posts" list and the recovery sweep read a Pariwar's rows by alert.
CREATE INDEX "announcement_channel_posts_pariwar_alert_idx" ON "announcement_channel_posts" USING btree ("pariwar_id", "alert_id");--> statement-breakpoint
-- INSERT — EXACTLY what `beginAnnouncementPost` / `recordUnattemptedAnnouncementPost` write (⛔ `post_id`, `detail`, `attempt_count`,
-- `telegram_message_id`, `created_at`, `updated_at`).
GRANT SELECT ON "announcement_channel_posts" TO twt_app;--> statement-breakpoint
GRANT INSERT ("pariwar_id", "occasion", "subject_id", "alert_id", "pool_label", "last_date", "state", "claim_token") ON "announcement_channel_posts" TO twt_app;--> statement-breakpoint
-- ⚠ Column-narrowed: the post's IDENTITY (`pariwar_id`, `occasion`, `subject_id`, `alert_id`), what it records (`pool_label`,
-- `last_date`) and `created_at` are ⛔ ever rewritten.
GRANT UPDATE ("state", "detail", "claim_token", "telegram_message_id", "attempt_count", "updated_at") ON "announcement_channel_posts" TO twt_app;--> statement-breakpoint
ALTER TABLE "announcement_channel_posts" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "announcement_channel_posts" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "announcement_channel_posts_tenant_isolation_select" ON "announcement_channel_posts" AS PERMISSIVE FOR SELECT TO "twt_app" USING (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "announcement_channel_posts_tenant_isolation_insert" ON "announcement_channel_posts" AS PERMISSIVE FOR INSERT TO "twt_app" WITH CHECK (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "announcement_channel_posts_tenant_isolation_update" ON "announcement_channel_posts" AS PERMISSIVE FOR UPDATE TO "twt_app" USING (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid) WITH CHECK (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid);--> statement-breakpoint
CREATE FUNCTION announcement_channel_posts_guard_update()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF OLD.state NOT IN ('attempting', 'deferred') THEN
    RAISE EXCEPTION
      'announcement_channel_posts: a finished row (%) is never updated — at most one post per (Pariwar, occasion, subject) (Story 5.14, -417 FS2)', OLD.state
      USING ERRCODE = 'integrity_constraint_violation';
  END IF;
  -- A deferred row is re-claimed (→ `attempting`) or given up (→ `refused`) — ⛔ posted / skipped / unknown without a send in between.
  IF OLD.state = 'deferred' AND NEW.state NOT IN ('deferred', 'attempting', 'refused') THEN
    RAISE EXCEPTION
      'announcement_channel_posts: a deferred row moves only to attempting or refused (Story 5.14, -417 FS2)'
      USING ERRCODE = 'integrity_constraint_violation';
  END IF;
  RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER announcement_channel_posts_guard_update
  BEFORE UPDATE ON announcement_channel_posts
  FOR EACH ROW EXECUTE FUNCTION announcement_channel_posts_guard_update();
