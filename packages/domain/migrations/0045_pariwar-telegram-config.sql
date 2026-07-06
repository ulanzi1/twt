-- Migration 0045 — pariwar_telegram_config (Story 5.5, Task 2; AC1/AC3):
-- The per-Pariwar Telegram Bot config substrate that gates + parameterizes Telegram delivery (mirror
-- pariwar_wa_config).
--   · 1:1 with a Pariwar (PK = pariwar_id): the FR-58C v1 `enabled` toggle (the "feature flag" — disabled by
--     default; the full per-cohort flag engine is Epic 10), the member-facing bot username (for the
--     `t.me/<bot>?start=` deep-link), and the bot-token + webhook-secret-token Secret-Manager NAME pointers
--     (NEVER the values; NULL bot_token_secret_name ⇒ fixture; NULL webhook_secret_token_secret_name ⇒ the
--     webhook receiver fails-closed).
--   · TENANT-ISOLATED (mirror pariwar_wa_config): a Pariwar's bot credentials must NOT be cross-tenant
--     readable — so STANDARD inline tenant-isolation RLS on pariwar_id, NOT a public cross-tenant carve-out.
--     Story 1.6 closed-failure construct: unset scope → '' → nullif → NULL → 0 rows (quiet fail-closed).
--
-- ⚠ DO NOT REGENERATE THIS FILE with `db:generate` (drizzle journal `when`, not SQL hash → skips; snapshots
-- stop at 0020). Hand-authored, mirroring 0038. DO NOT reset via DROP SCHEMA (strips twt_app USAGE → 42P01).

CREATE TABLE "pariwar_telegram_config" (
	"pariwar_id" uuid PRIMARY KEY NOT NULL,
	-- The FR-58C v1 flag — the ADMIN gate. Default false: v1 ships DISABLED by default.
	"enabled" boolean DEFAULT false NOT NULL,
	-- Member-facing bot username for the `t.me/<bot_username>?start=<code>` deep-link. Nullable until provisioned.
	"bot_username" text,
	-- Secret-Manager NAME (a POINTER), never the bot-token value. NULL ⇒ fixture (opt-in-real). Plain text.
	"bot_token_secret_name" text,
	-- Secret-Manager NAME for the X-Telegram-Bot-Api-Secret-Token compare, never the value. NULL ⇒ webhook fails-closed.
	"webhook_secret_token_secret_name" text,
	"updated_by_actor" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
-- GRANT (SELECT read config; INSERT/UPDATE upsert; DELETE for completeness/RTBF-adjacent cleanup).
GRANT SELECT, INSERT, UPDATE, DELETE ON "pariwar_telegram_config" TO twt_app;--> statement-breakpoint
ALTER TABLE "pariwar_telegram_config" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "pariwar_telegram_config" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
-- Tenant-isolation policies (mirror pariwar_wa_config). Unset scope fails closed to 0 rows.
CREATE POLICY "pariwar_telegram_config_tenant_isolation_select" ON "pariwar_telegram_config" AS PERMISSIVE FOR SELECT TO "twt_app" USING (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "pariwar_telegram_config_tenant_isolation_write" ON "pariwar_telegram_config" AS PERMISSIVE FOR ALL TO "twt_app" USING (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid) WITH CHECK (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid);
