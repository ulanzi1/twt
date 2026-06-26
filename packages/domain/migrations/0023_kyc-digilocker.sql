-- Migration 0023 — DigiLocker KYC provider substrate (Story 3.3a, Task 3):
--   · digilocker_public_certs — GLOBAL issuer public-certificate cache (member-auth
--     carve-out RLS posture: ENABLE+FORCE + a `USING(true)` global-access policy; the
--     cert cache has no tenant dimension and the daily refresh job runs unscoped).
--   · kyc_transactions       — TENANT-ISOLATED provider OAuth/PKCE state (mirror
--     consent_records tenant-isolation; stores NO eAadhaar PII — only OAuth `state`,
--     PKCE `code_verifier`, `status`, timestamps).
--
-- ⚠ DO NOT REGENERATE THIS FILE with `db:generate`.
-- drizzle-kit skips an already-applied migration by journal `when` (NOT by SQL hash),
-- and the meta/ snapshots stop at 0020 (0021/0022 are hand-authored, snapshot-absent —
-- known drift, NOT gate-blocking). A `db:generate` now would diff the CURRENT schema
-- against 0020_snapshot.json and wrongly re-emit otp_rate_buckets + member_pariwar_selects
-- (already applied) → 42P07. So this file is HAND-AUTHORED, mirroring the 0021/0022
-- member-auth carve-out pattern + the 0017 consent tenant-isolation pattern. No snapshot
-- is emitted (matching 0021/0022); `drizzle-kit check` tolerates the absence.
--
-- Hand-supplements relative to a hypothetical generated DDL: the GRANT + FORCE DDL
-- drizzle-kit does not emit (mirror 0017/0019/0022). Roles (twt_app) exist from 0002.

-- ── digilocker_public_certs (GLOBAL issuer-cert cache) ──────────────────────────────
CREATE TABLE "digilocker_public_certs" (
	"cert_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"key_id" text NOT NULL,
	"subject" text,
	"pem" text NOT NULL,
	"fetched_at" timestamp with time zone DEFAULT now() NOT NULL,
	"not_before" timestamp with time zone,
	"not_after" timestamp with time zone NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
-- GRANT (SELECT/INSERT/UPDATE — the refresh upsert + the compromise-deactivation UPDATE;
-- no DELETE: a compromised cert is deactivated via is_active, never row-deleted).
GRANT SELECT, INSERT, UPDATE ON "digilocker_public_certs" TO twt_app;--> statement-breakpoint
ALTER TABLE "digilocker_public_certs" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "digilocker_public_certs" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE UNIQUE INDEX "digilocker_public_certs_key_id_uq" ON "digilocker_public_certs" USING btree ("key_id");--> statement-breakpoint
CREATE INDEX "digilocker_public_certs_active_idx" ON "digilocker_public_certs" USING btree ("is_active");--> statement-breakpoint
-- GLOBAL access (no tenant dimension — see schema header): the member-auth carve-out posture.
CREATE POLICY "digilocker_public_certs_global_access" ON "digilocker_public_certs" AS PERMISSIVE FOR ALL TO "twt_app" USING (true) WITH CHECK (true);--> statement-breakpoint

-- ── kyc_transactions (TENANT-ISOLATED provider OAuth/PKCE state) ─────────────────────
CREATE TABLE "kyc_transactions" (
	"transaction_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"member_id" uuid NOT NULL,
	"pariwar_id" uuid NOT NULL,
	"provider" text NOT NULL,
	"intent" text NOT NULL,
	"state" text NOT NULL,
	"code_verifier" text NOT NULL,
	"redirect_uri" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
-- GRANT (SELECT/INSERT/UPDATE/DELETE — initiate INSERT, verify-outcome UPDATE, future
-- TTL-cleanup DELETE; the ephemeral OAuth state has no compliance-retention need).
GRANT SELECT, INSERT, UPDATE, DELETE ON "kyc_transactions" TO twt_app;--> statement-breakpoint
ALTER TABLE "kyc_transactions" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "kyc_transactions" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE UNIQUE INDEX "kyc_transactions_state_uq" ON "kyc_transactions" USING btree ("state");--> statement-breakpoint
CREATE INDEX "kyc_transactions_pariwar_state_idx" ON "kyc_transactions" USING btree ("pariwar_id","state");--> statement-breakpoint
CREATE POLICY "kyc_transactions_tenant_isolation_select" ON "kyc_transactions" AS PERMISSIVE FOR SELECT TO "twt_app" USING (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "kyc_transactions_tenant_isolation_write" ON "kyc_transactions" AS PERMISSIVE FOR ALL TO "twt_app" USING (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid) WITH CHECK (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid);
