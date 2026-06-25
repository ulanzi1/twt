-- Migration 0019 — member mobile+OTP auth substrate (Story 3.2, Tasks 1-3, 7, R5):
-- member_identities (tenant-isolated mobile Tier-1 envelope + blind index) + the
-- GLOBAL member-identity/auth carve-out tables (member_auth_otps, member_refresh_tokens,
-- member_trusted_devices, member_step_up_elevations, member_signup_continuations) +
-- the member_otp_intent enum + tenant-isolation / carve-out RLS.
--
-- ⚠ DO NOT REGENERATE THIS FILE with `db:generate`.
-- drizzle-kit skips an already-applied migration by journal `when` (NOT by SQL hash),
-- so a regenerate-after-apply silently drops the hand-supplements and can raise 42P07.
-- The drizzle-kit-emitted statements (the CREATE TYPE + the six CREATE TABLE + ENABLE
-- RLS + FK + indexes + the seven CREATE POLICY declarations from
-- policies/member-identities-rls.ts + policies/member-auth-rls.ts) are wrapped here
-- with hand-supplemented GRANT + FORCE + CHECK + trigger DDL (mirrors 0005 + 0018).
--
-- Hand-supplements (relative to the generated DDL):
--   1. GRANT SELECT/INSERT/UPDATE/DELETE on every member-auth table to twt_app.
--      DELETE included: OTP/continuation reaping, refresh-token revocation, trusted-
--      device eviction (3rd-drops-oldest), elevation cleanup, and member_identities
--      RTBF-erase-in-place (Story 3.12). Grants only to twt_app (the policies bind
--      TO twt_app; twt_service has no policy here — the 0005/0018 rationale).
--   2. ALTER TABLE ... FORCE ROW LEVEL SECURITY — applies RLS even to the (non-
--      superuser) table owner. ENABLE + FORCE kept adjacent.
--   3. Non-negative CHECK on member_auth_otps.attempts (the abuse/rate budget must
--      never go negative — mirrors step_up_otps_attempts_chk in 0005).
--   4. set_member_identities_updated_at BEFORE UPDATE trigger — reuses set_updated_at()
--      from migration 0003 (mirrors users/admin_credentials in 0005).
--
-- The roles (twt_app / twt_service) already exist from migration 0002 — no CREATE ROLE.
-- Idempotency invariant preserved: meta/0019_snapshot.json records only the table-shape
-- view; the GRANT/FORCE/CHECK/trigger hand-supplements are invisible to `drizzle-kit
-- check`, matching 0005 (triggers/grants) + 0018 (grants/trigger).

CREATE TYPE "public"."member_otp_intent" AS ENUM('login', 'step_up');--> statement-breakpoint
CREATE TABLE "member_identities" (
	"member_id" uuid PRIMARY KEY NOT NULL,
	"pariwar_id" uuid NOT NULL,
	"mobile_ciphertext" text NOT NULL,
	"mobile_blind_index" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "member_identities" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "member_auth_otps" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"mobile_blind_index" text NOT NULL,
	"member_id" uuid,
	"intent" "member_otp_intent" NOT NULL,
	"action_context" text,
	"otp_hash" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"consumed_at" timestamp with time zone,
	"attempts" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "member_auth_otps" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "member_refresh_tokens" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"member_id" uuid NOT NULL,
	"device_id" text NOT NULL,
	"token_hash" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"rotated_at" timestamp with time zone,
	"revoked_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "member_refresh_tokens" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "member_trusted_devices" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"member_id" uuid NOT NULL,
	"device_id" text NOT NULL,
	"pariwar_id" uuid,
	"device_label" text,
	"bound_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_seen_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "member_trusted_devices" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "member_step_up_elevations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"member_id" uuid NOT NULL,
	"action_context" text NOT NULL,
	"elevated_until" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "member_step_up_elevations" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "member_signup_continuations" (
	"jti" uuid PRIMARY KEY NOT NULL,
	"mobile_blind_index" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"consumed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "member_signup_continuations" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "member_identities" ADD CONSTRAINT "member_identities_member_id_members_member_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("member_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "member_identities_mobile_blind_index_idx" ON "member_identities" USING btree ("mobile_blind_index");--> statement-breakpoint
CREATE UNIQUE INDEX "member_identities_pariwar_mobile_uq" ON "member_identities" USING btree ("pariwar_id","mobile_blind_index");--> statement-breakpoint
CREATE INDEX "member_auth_otps_mobile_intent_idx" ON "member_auth_otps" USING btree ("mobile_blind_index","intent");--> statement-breakpoint
CREATE UNIQUE INDEX "member_refresh_tokens_token_hash_uq" ON "member_refresh_tokens" USING btree ("token_hash");--> statement-breakpoint
CREATE INDEX "member_refresh_tokens_member_idx" ON "member_refresh_tokens" USING btree ("member_id");--> statement-breakpoint
CREATE INDEX "member_refresh_tokens_member_device_idx" ON "member_refresh_tokens" USING btree ("member_id","device_id");--> statement-breakpoint
CREATE INDEX "member_trusted_devices_member_idx" ON "member_trusted_devices" USING btree ("member_id");--> statement-breakpoint
CREATE UNIQUE INDEX "member_trusted_devices_member_device_uq" ON "member_trusted_devices" USING btree ("member_id","device_id");--> statement-breakpoint
CREATE INDEX "member_step_up_elevations_member_action_idx" ON "member_step_up_elevations" USING btree ("member_id","action_context");--> statement-breakpoint
CREATE POLICY "member_identities_tenant_isolation_select" ON "member_identities" AS PERMISSIVE FOR SELECT TO "twt_app" USING (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "member_identities_tenant_isolation_write" ON "member_identities" AS PERMISSIVE FOR ALL TO "twt_app" USING (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid) WITH CHECK (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "member_auth_otps_global_access" ON "member_auth_otps" AS PERMISSIVE FOR ALL TO "twt_app" USING (true) WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "member_refresh_tokens_global_access" ON "member_refresh_tokens" AS PERMISSIVE FOR ALL TO "twt_app" USING (true) WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "member_trusted_devices_global_access" ON "member_trusted_devices" AS PERMISSIVE FOR ALL TO "twt_app" USING (true) WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "member_step_up_elevations_global_access" ON "member_step_up_elevations" AS PERMISSIVE FOR ALL TO "twt_app" USING (true) WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "member_signup_continuations_global_access" ON "member_signup_continuations" AS PERMISSIVE FOR ALL TO "twt_app" USING (true) WITH CHECK (true);--> statement-breakpoint
-- ── Hand-supplements (NOT drizzle-kit-emitted; invisible to db:check) ──────────
-- (1) Table privileges for the app role on every member-auth table (DELETE included —
-- see header rationale). member_identities is tenant-isolated; the rest are the global
-- carve-out. The policies bind TO twt_app, so grants go only to twt_app.
GRANT SELECT, INSERT, UPDATE, DELETE ON "member_identities" TO twt_app;--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE, DELETE ON "member_auth_otps" TO twt_app;--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE, DELETE ON "member_refresh_tokens" TO twt_app;--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE, DELETE ON "member_trusted_devices" TO twt_app;--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE, DELETE ON "member_step_up_elevations" TO twt_app;--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE, DELETE ON "member_signup_continuations" TO twt_app;--> statement-breakpoint
-- (2) FORCE RLS even for the (non-superuser) table owner — kept adjacent to ENABLE.
ALTER TABLE "member_identities" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "member_auth_otps" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "member_refresh_tokens" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "member_trusted_devices" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "member_step_up_elevations" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "member_signup_continuations" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
-- (3) Non-negative CHECK on the OTP attempt counter (mirror step_up_otps_attempts_chk).
ALTER TABLE "member_auth_otps" ADD CONSTRAINT "member_auth_otps_attempts_chk" CHECK (attempts >= 0);--> statement-breakpoint
-- (4) updated_at maintenance trigger on member_identities (reuse set_updated_at(), 0003).
CREATE TRIGGER set_member_identities_updated_at
  BEFORE UPDATE ON "member_identities"
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();