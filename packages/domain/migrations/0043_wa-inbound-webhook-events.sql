-- Migration 0043 — wa_inbound_webhook_events (Story 5.4, Task 4; AC2):
-- The §3.11 dedicated webhook-queue table. The ingress primitive verifies Meta's X-Hub-Signature-256,
-- persists the raw inbound payload here, and ACKs 200 — NO business logic in the handler (AR-44). The async
-- worker (apps/jobs wa-webhook-processor) drains un-processed rows and does the matching / transitions.
--   · TENANT-ISOLATED (mirror pariwar_wa_config / member_device_tokens): standard inline tenant-isolation RLS
--     on pariwar_id (from the URL path — the signature key is known before the body is trusted).
--   · raw_payload is Meta-opaque inbound webhook data (msisdns appear) → OPERATIONAL, plain jsonb, NOT a
--     Tier-1 envelope column (mirror whatsapp_send_status' "Meta opaque, plain text" posture).
--
-- ⚠ DO NOT REGENERATE THIS FILE with `db:generate` (drizzle journal `when`, not SQL hash → skips; snapshots
-- stop at 0020). Hand-authored, mirroring 0038/0039. DO NOT reset via DROP SCHEMA (strips twt_app USAGE).

CREATE TABLE "wa_inbound_webhook_events" (
	"event_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"pariwar_id" uuid NOT NULL,
	"raw_payload" jsonb NOT NULL,
	"signature_verified" boolean NOT NULL,
	"processed_at" timestamp with time zone,
	"received_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint
-- The worker's drain scan (un-processed events).
CREATE INDEX "wa_inbound_webhook_events_processed_idx" ON "wa_inbound_webhook_events" ("processed_at");--> statement-breakpoint
-- GRANT (SELECT drain; INSERT persist; UPDATE mark-processed; DELETE for the processed-row hygiene sweep).
GRANT SELECT, INSERT, UPDATE, DELETE ON "wa_inbound_webhook_events" TO twt_app;--> statement-breakpoint
ALTER TABLE "wa_inbound_webhook_events" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "wa_inbound_webhook_events" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "wa_inbound_webhook_events_tenant_isolation_select" ON "wa_inbound_webhook_events" AS PERMISSIVE FOR SELECT TO "twt_app" USING (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "wa_inbound_webhook_events_tenant_isolation_write" ON "wa_inbound_webhook_events" AS PERMISSIVE FOR ALL TO "twt_app" USING (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid) WITH CHECK (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid);
