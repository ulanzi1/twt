-- Migration 0038 — pariwar_wa_config + pariwar_wa_templates (Story 5.3, Task 1; AC3):
-- The per-Pariwar WhatsApp Business config substrate that gates + parameterizes WA delivery.
--   · pariwar_wa_config — 1:1 with a Pariwar (PK = pariwar_id, the pariwar_passport singleton shape):
--     the FR-72 admin `enabled` toggle, the member-facing display number, Meta's phone_number_id / waba_id
--     send addressing, the access-token Secret-Manager NAME pointer (NEVER the value; NULL ⇒ fixture), and
--     the pinned graph_api_version (a Meta version bump is a config change, not a redeploy).
--   · pariwar_wa_templates — per-(pariwar_id, alert_category) UTILITY template mapping: template_name,
--     language_code, approval_status (Meta lifecycle). A category with no `approved` row is NOT WA-eligible.
--     FK → pariwar_wa_config ON DELETE CASCADE (templates never orphan; dropping a config sweeps them).
--
--   · TENANT-ISOLATED (mirror member_device_tokens / member_nominees): WA config/credentials must NOT be
--     cross-tenant readable — so STANDARD inline tenant-isolation RLS on pariwar_id, NOT pariwar_passport's
--     public cross-tenant-READ carve-out. Story 1.6 closed-failure construct: unset scope → '' → nullif →
--     NULL → 0 rows (quiet fail-closed).
--
-- ⚠ DO NOT REGENERATE THIS FILE with `db:generate`.
-- drizzle-kit skips an already-applied migration by journal `when` (NOT by SQL hash), and the meta/
-- snapshots stop at 0020 (0021+ are hand-authored, snapshot-absent — known drift, NOT gate-blocking). A
-- `db:generate` now would diff CURRENT schema against 0020_snapshot.json and wrongly re-emit applied
-- 0021-0037 → 42P07. So this file is HAND-AUTHORED, mirroring 0037_member-device-tokens / 0025_member-
-- nominees (inline RLS in the SAME file — no separate *-rls.sql). Roles (twt_app) exist from 0002. No
-- snapshot emitted (matching 0021-0037); `drizzle-kit check` tolerates it. DO NOT reset via DROP SCHEMA
-- (strips twt_app USAGE → 42P01).

-- ── pariwar_wa_config (1:1 per-Pariwar WA Business config singleton) ────────────────────
-- No enums: graph_api_version is free text (defaulted); enabled is a plain boolean.
CREATE TABLE "pariwar_wa_config" (
	"pariwar_id" uuid PRIMARY KEY NOT NULL,
	"enabled" boolean DEFAULT false NOT NULL,
	"display_phone_number" text,
	"phone_number_id" text,
	"waba_id" text,
	-- Secret-Manager NAME (a POINTER), never the token value. NULL ⇒ fixture (opt-in-real). Plain text —
	-- a NAME is not a secret (unlike member_device_tokens.token_ciphertext, which IS the secret).
	"access_token_secret_name" text,
	"graph_api_version" text DEFAULT 'v21.0' NOT NULL,
	"updated_by_actor" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
-- GRANT (SELECT read config; INSERT/UPDATE upsert; DELETE for completeness/RTBF-adjacent cleanup). Policies
-- bind TO twt_app, so grants go only to twt_app.
GRANT SELECT, INSERT, UPDATE, DELETE ON "pariwar_wa_config" TO twt_app;--> statement-breakpoint
ALTER TABLE "pariwar_wa_config" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "pariwar_wa_config" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
-- Tenant-isolation policies (mirror member_device_tokens). Unset scope fails closed to 0 rows.
CREATE POLICY "pariwar_wa_config_tenant_isolation_select" ON "pariwar_wa_config" AS PERMISSIVE FOR SELECT TO "twt_app" USING (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "pariwar_wa_config_tenant_isolation_write" ON "pariwar_wa_config" AS PERMISSIVE FOR ALL TO "twt_app" USING (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid) WITH CHECK (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid);--> statement-breakpoint

-- ── pariwar_wa_templates (per-(pariwar, alert_category) UTILITY template registry) ───────
CREATE TABLE "pariwar_wa_templates" (
	"template_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"pariwar_id" uuid NOT NULL,
	"alert_category" text NOT NULL,
	"template_name" text NOT NULL,
	"language_code" text NOT NULL,
	"approval_status" text DEFAULT 'pending' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "pariwar_wa_templates_pariwar_category_uq" UNIQUE("pariwar_id","alert_category"),
	CONSTRAINT "pariwar_wa_templates_approval_status_ck" CHECK ("approval_status" IN ('pending', 'approved', 'rejected', 'paused')),
	CONSTRAINT "pariwar_wa_templates_alert_category_ck" CHECK ("alert_category" IN ('alert_published', 'deadline_reminder', 'contribution_confirmed', 'contribution_mismatch', 'claim_status_change', 'helpdesk_reply', 'module_new', 'step_up_otp', 'niyamavali_amended'))
);
--> statement-breakpoint
-- FK → pariwar_wa_config.pariwar_id (ON DELETE CASCADE: dropping a Pariwar's config sweeps its templates).
ALTER TABLE "pariwar_wa_templates" ADD CONSTRAINT "pariwar_wa_templates_pariwar_id_pariwar_wa_config_pariwar_id_fk" FOREIGN KEY ("pariwar_id") REFERENCES "public"."pariwar_wa_config"("pariwar_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
-- Backs resolveApprovedTemplate's (pariwar_id, alert_category, approval_status) lookup.
CREATE INDEX "pariwar_wa_templates_resolve_idx" ON "pariwar_wa_templates" ("pariwar_id", "alert_category", "approval_status");--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE, DELETE ON "pariwar_wa_templates" TO twt_app;--> statement-breakpoint
ALTER TABLE "pariwar_wa_templates" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "pariwar_wa_templates" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "pariwar_wa_templates_tenant_isolation_select" ON "pariwar_wa_templates" AS PERMISSIVE FOR SELECT TO "twt_app" USING (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "pariwar_wa_templates_tenant_isolation_write" ON "pariwar_wa_templates" AS PERMISSIVE FOR ALL TO "twt_app" USING (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid) WITH CHECK (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid);
