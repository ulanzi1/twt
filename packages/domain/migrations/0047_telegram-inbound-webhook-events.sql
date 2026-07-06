-- Migration 0047 — telegram_inbound_webhook_events (Story 5.5, Task 2; AC8):
-- The §3.11 dedicated webhook-queue table (mirror wa_inbound_webhook_events). The ingress primitive verifies
-- Telegram's X-Telegram-Bot-Api-Secret-Token header (constant-time compare), persists the raw inbound update
-- here, and ACKs 200 — NO business logic in the handler (AR-44). The async worker (apps/jobs
-- tg-webhook-processor) drains un-processed rows and does the matching / transitions.
--   · TENANT-ISOLATED (mirror wa_inbound_webhook_events): standard inline tenant-isolation RLS on pariwar_id
--     (from the URL path — the secret token is known before the body is trusted).
--   · raw_payload is Telegram-opaque inbound update data (chat id, username, message text — no phone/Aadhaar)
--     → OPERATIONAL, plain jsonb, NOT a Tier-1 envelope column.
--
-- ⚠ DO NOT REGENERATE THIS FILE with `db:generate` (drizzle journal `when`, not SQL hash → skips; snapshots
-- stop at 0020). Hand-authored, mirroring 0043. DO NOT reset via DROP SCHEMA (strips twt_app USAGE).

CREATE TABLE "telegram_inbound_webhook_events" (
	"event_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"pariwar_id" uuid NOT NULL,
	"raw_payload" jsonb NOT NULL,
	"signature_verified" boolean NOT NULL,
	"processed_at" timestamp with time zone,
	"received_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint
-- The worker's drain scan (un-processed events).
CREATE INDEX "telegram_inbound_webhook_events_processed_idx" ON "telegram_inbound_webhook_events" ("processed_at");--> statement-breakpoint
-- GRANT (SELECT drain; INSERT persist; UPDATE mark-processed; DELETE for the processed-row hygiene sweep).
GRANT SELECT, INSERT, UPDATE, DELETE ON "telegram_inbound_webhook_events" TO twt_app;--> statement-breakpoint
ALTER TABLE "telegram_inbound_webhook_events" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "telegram_inbound_webhook_events" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "telegram_inbound_webhook_events_tenant_isolation_select" ON "telegram_inbound_webhook_events" AS PERMISSIVE FOR SELECT TO "twt_app" USING (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "telegram_inbound_webhook_events_tenant_isolation_write" ON "telegram_inbound_webhook_events" AS PERMISSIVE FOR ALL TO "twt_app" USING (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid) WITH CHECK (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid);
