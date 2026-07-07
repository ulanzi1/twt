-- Migration 0050 — pariwar_degraded_mode_declarations (Story 5.8, Task 1; AC1):
-- The per-Pariwar degraded-mode declaration substrate that backs the AR-20 cycle-open SMS bridge. A trustee
-- declares degraded mode (in-app push infra down / WA unavailable system-wide / "treat all cycle-open as
-- critical") so the bridge can force SMS for cycle-open (`alert_published`) alerts, bypassing cost-opt.
--   · mode CHECK IN ('cycle_open_sms_bridge') — v1, extensible (mirror pariwar_wa_templates' CHECK shape).
--   · effective_from (inclusive) + expires_at (exclusive, NULLABLE = open-ended until manual revocation).
--   · revoked_at / revoked_by_actor (NULLABLE — manual revocation is a STATE TRANSITION, not a row delete).
--   · "Active" is a COMPUTED predicate (revoked_at IS NULL AND effective_from<=at AND (expires_at IS NULL OR
--     expires_at>at)) — there is NO is_active column. Single-active-per-Pariwar is enforced by the
--     application transaction (advisory lock + auto-revoke-on-declare in degraded-mode/declarations.ts),
--     NOT a DB EXCLUDE/range-overlap constraint (that would enforce a stronger "no overlap ever" rule than
--     this story defines — see AC1 #2).
--
--   · TENANT-ISOLATED (mirror pariwar_wa_config / member_device_tokens): a Pariwar's degraded-mode state
--     must NOT be cross-tenant readable — so STANDARD inline tenant-isolation RLS on pariwar_id, NOT
--     pariwar_passport's public cross-tenant-READ carve-out. Story 1.6 closed-failure construct: unset scope
--     → '' → nullif → NULL → 0 rows (quiet fail-closed).
--
-- ⚠ DO NOT REGENERATE THIS FILE with `db:generate`.
-- drizzle-kit skips an already-applied migration by journal `when` (NOT by SQL hash), and the meta/
-- snapshots stop at 0020 (0021+ are hand-authored, snapshot-absent — known drift, NOT gate-blocking). A
-- `db:generate` now would diff CURRENT schema against 0020_snapshot.json and wrongly re-emit applied
-- 0021-0049 → 42P07. So this file is HAND-AUTHORED, mirroring 0038_pariwar-wa-config (inline RLS in the
-- SAME file — no separate *-rls.sql). Roles (twt_app) exist from 0002. No snapshot emitted (matching
-- 0021+); `drizzle-kit check` tolerates it. DO NOT reset via DROP SCHEMA (strips twt_app USAGE → 42P01).

-- ── pariwar_degraded_mode_declarations (per-Pariwar degraded-mode window) ────────────────
CREATE TABLE "pariwar_degraded_mode_declarations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"pariwar_id" uuid NOT NULL,
	"mode" text NOT NULL,
	"effective_from" timestamp with time zone NOT NULL,
	"expires_at" timestamp with time zone,
	"revoked_at" timestamp with time zone,
	"revoked_by_actor" uuid,
	"declared_by_actor" uuid,
	"reason" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "pariwar_degraded_mode_declarations_mode_ck" CHECK ("mode" IN ('cycle_open_sms_bridge'))
);
--> statement-breakpoint
-- Backs the active-declaration lookup (pariwar_id + effective_from window filter / ordering).
CREATE INDEX "pariwar_degraded_mode_declarations_active_idx" ON "pariwar_degraded_mode_declarations" ("pariwar_id", "effective_from");--> statement-breakpoint
-- GRANT (SELECT read active; INSERT declare; UPDATE auto-revoke + manual revoke; DELETE for completeness).
-- Policies bind TO twt_app, so grants go only to twt_app.
GRANT SELECT, INSERT, UPDATE, DELETE ON "pariwar_degraded_mode_declarations" TO twt_app;--> statement-breakpoint
ALTER TABLE "pariwar_degraded_mode_declarations" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "pariwar_degraded_mode_declarations" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
-- Tenant-isolation policies (mirror pariwar_wa_config). Unset scope fails closed to 0 rows.
CREATE POLICY "pariwar_degraded_mode_declarations_tenant_isolation_select" ON "pariwar_degraded_mode_declarations" AS PERMISSIVE FOR SELECT TO "twt_app" USING (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "pariwar_degraded_mode_declarations_tenant_isolation_write" ON "pariwar_degraded_mode_declarations" AS PERMISSIVE FOR ALL TO "twt_app" USING (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid) WITH CHECK (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid);
