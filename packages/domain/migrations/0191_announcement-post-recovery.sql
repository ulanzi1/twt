-- Story 5.14 review G1-1/2/3: durable rate-limit timing and tenant-bound alert references; G2-P15: the tightened invite-link CHECKs.
-- Payload metadata only; no name, contact or post text. Existing migration 0190 is preserved.
ALTER TABLE announcement_channel_posts ADD COLUMN retry_not_before timestamptz;
--> statement-breakpoint
ALTER TABLE announcement_channel_posts ADD COLUMN deadline_at timestamptz;
--> statement-breakpoint
GRANT UPDATE (retry_not_before) ON announcement_channel_posts TO twt_app;
--> statement-breakpoint
GRANT INSERT (deadline_at) ON announcement_channel_posts TO twt_app;
--> statement-breakpoint
CREATE UNIQUE INDEX alerts_pariwar_alert_uq ON alerts (pariwar_id, alert_id);
--> statement-breakpoint
ALTER TABLE announcement_channel_posts DROP CONSTRAINT announcement_channel_posts_alert_id_fk;
--> statement-breakpoint
ALTER TABLE announcement_channel_posts ADD CONSTRAINT announcement_channel_posts_alert_id_fk
  FOREIGN KEY (pariwar_id, alert_id) REFERENCES alerts (pariwar_id, alert_id);
--> statement-breakpoint
-- Story 5.14 review G2-P15: the two invite-link CHECKs of 0190 re-added with a NON-EMPTY path holding no whitespace (a bare
-- `https://t.me/` or `https://whatsapp.com/channel/` and an inner space are refused). LOCKSTEP with the domain constants
-- (`schema/pariwar_announcement_channels.ts`) and the contract's regexes (`contracts/src/announcement-channels/channels.ts`).
ALTER TABLE "pariwar_announcement_channels" DROP CONSTRAINT "pariwar_announcement_channels_telegram_url_check";
--> statement-breakpoint
ALTER TABLE "pariwar_announcement_channels" ADD CONSTRAINT "pariwar_announcement_channels_telegram_url_check" CHECK ("telegram_invite_url" IS NULL OR "telegram_invite_url" ~ '^https://t\.me/\S+$');
--> statement-breakpoint
ALTER TABLE "pariwar_announcement_channels" DROP CONSTRAINT "pariwar_announcement_channels_whatsapp_url_check";
--> statement-breakpoint
ALTER TABLE "pariwar_announcement_channels" ADD CONSTRAINT "pariwar_announcement_channels_whatsapp_url_check" CHECK ("whatsapp_channel_url" IS NULL OR "whatsapp_channel_url" ~ '^https://(www\.)?whatsapp\.com/channel/\S+$');
