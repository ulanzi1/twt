-- Migration 0039 — whatsapp_send_status (Story 5.3, Task 3; AC5):
-- The per-send WA delivery-status substrate, keyed by the Meta `wamid`. Story 5.3 ships this persistence
-- seam + the pure mapMetaStatus mapping; Story 5.4's webhook receiver CONSUMES them (calls upsertWaSendStatus
-- with the mapped state). 5.3 builds NO webhook route.
--   · TENANT-ISOLATED (mirror member_device_tokens / pariwar_wa_config): standard inline tenant-isolation
--     RLS on pariwar_id (Story 1.6 closed-failure construct — unset scope → 0 rows).
--   · wamid is a Meta opaque id (NOT PII) → plain text primary key.
--
-- ⚠ DO NOT REGENERATE THIS FILE with `db:generate` (drizzle journal `when`, not SQL hash → 42P07; snapshots
-- stop at 0020). Hand-authored, mirroring 0037/0038. DO NOT reset via DROP SCHEMA (strips twt_app USAGE →
-- 42P01).

CREATE TABLE "whatsapp_send_status" (
	"wamid" text PRIMARY KEY NOT NULL,
	"pariwar_id" uuid NOT NULL,
	"state" text NOT NULL,
	"meta_status" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
-- Backs the tenant-scoped read of a Pariwar's send statuses (the 5.4 webhook writes; observability reads).
CREATE INDEX "whatsapp_send_status_pariwar_idx" ON "whatsapp_send_status" ("pariwar_id");--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE, DELETE ON "whatsapp_send_status" TO twt_app;--> statement-breakpoint
ALTER TABLE "whatsapp_send_status" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "whatsapp_send_status" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "whatsapp_send_status_tenant_isolation_select" ON "whatsapp_send_status" AS PERMISSIVE FOR SELECT TO "twt_app" USING (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "whatsapp_send_status_tenant_isolation_write" ON "whatsapp_send_status" AS PERMISSIVE FOR ALL TO "twt_app" USING (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid) WITH CHECK (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid);
