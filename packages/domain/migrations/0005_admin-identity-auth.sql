-- Migration 0005 — global identity (`users`) + admin-auth tables + the
-- identity/auth carve-out RLS family + the retro FKs (Story 1.9, AC-7).
--
-- ⚠ DO NOT REGENERATE THIS FILE with `db:generate`.
-- The drizzle-kit-emitted statements (CREATE TYPE identity_type/user_status +
-- CREATE TABLE users/admin_credentials/webauthn_credentials/recovery_codes/
-- admin_sessions/step_up_otps + ENABLE RLS + the FKs + indexes + the six
-- USING(true) carve-out policies from packages/domain/src/policies/
-- identity-auth-rls.ts) are wrapped here with hand-supplemented GRANT + FORCE DDL
-- that drizzle-kit does not emit. Mirrors migrations 0002/0003/0004.
--
-- THE IDENTITY/AUTH CARVE-OUT FAMILY (Reconciliation R2, architecture confirmation
-- pending — see Story 1.9 ADR-0009): these tables are GLOBAL, NOT pariwar-scoped.
-- Login executes BEFORE any `app.pariwar_id` is set — so the `role_grants` scoped
-- construct would make every login return 0 rows. Modeled alongside
-- pariwar_passport (the cross-tenant carve-out precedent) with ENABLE+FORCE RLS +
-- a permissive USING(true)/WITH CHECK(true) policy per table (defense-in-depth +
-- explicit/auditable), accessed via the narrow apps/api auth repo. Stored secrets
-- are hardened regardless: email Tier-1 ciphertext + Tier-2 blind index, password
-- Argon2id+pepper, recovery codes + OTPs hashed. The roles (twt_app / twt_service)
-- already exist from migration 0002 — no CREATE ROLE here.
--
-- RETRO FKs (now that `users` exists): role_grants.user_id → users.id (D4-1.8) +
-- pariwar_passport.created_by → users.id (D4-1.7) — both the FK the no-FK columns
-- deferred "until Story 1.9+". drizzle-kit orders the CREATE TABLE users before
-- the ALTER TABLE ... ADD CONSTRAINT, so the references resolve.
--
-- Hand-supplements (relative to the generated DDL):
--   1. GRANT SELECT, INSERT, UPDATE, DELETE on every identity/auth table to
--      twt_app. DELETE IS INCLUDED: sessions are revoked by row delete (§2.4),
--      webauthn devices are removable, OTPs/recovery rows are reaped. Grants only
--      to twt_app (the policies bind TO twt_app; twt_service has no policy here).
--   2. ALTER TABLE ... FORCE ROW LEVEL SECURITY on each — applies RLS even to the
--      (non-superuser) table owner; kept adjacent in intent to the generated ENABLE.
--
-- Idempotency invariant (architecture §1.8 + Story 1.2 README §4) preserved: the
-- snapshot at meta/0005_snapshot.json records only the table-shape view (TYPES +
-- TABLES + ENABLE RLS + FKs + indexes + policies); the GRANT/FORCE hand-supplements
-- are invisible to `drizzle-kit check`, matching 0002/0003/0004. Re-running 0005 is
-- a no-op (drizzle consults drizzle.__drizzle_migrations).
--
-- Migrations are FORWARD-ONLY (architecture §1.8). The precise manual inverse, for
-- operator reference only (e.g. a dev-DB reset outside the migration runner), is:
--     ALTER TABLE "role_grants" DROP CONSTRAINT IF EXISTS "role_grants_user_id_users_id_fk";
--     ALTER TABLE "pariwar_passport" DROP CONSTRAINT IF EXISTS "pariwar_passport_created_by_users_id_fk";
--     DROP TABLE IF EXISTS "step_up_otps", "recovery_codes", "webauthn_credentials",
--       "admin_sessions", "admin_credentials", "users" CASCADE;
--     DROP TYPE IF EXISTS "user_status"; DROP TYPE IF EXISTS "identity_type";

CREATE TYPE "public"."identity_type" AS ENUM('admin');--> statement-breakpoint
CREATE TYPE "public"."user_status" AS ENUM('active', 'suspended', 'disabled');--> statement-breakpoint
CREATE TABLE "admin_credentials" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"email_ciphertext" text NOT NULL,
	"email_blind_index" text NOT NULL,
	"password_hash" text NOT NULL,
	"failed_attempts" integer DEFAULT 0 NOT NULL,
	"locked_until" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "admin_credentials" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "admin_sessions" (
	"sid" text PRIMARY KEY NOT NULL,
	"sess" jsonb NOT NULL,
	"expire" timestamp with time zone NOT NULL
);
--> statement-breakpoint
ALTER TABLE "admin_sessions" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"identity_type" "identity_type" DEFAULT 'admin' NOT NULL,
	"status" "user_status" DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid
);
--> statement-breakpoint
ALTER TABLE "users" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "webauthn_credentials" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"credential_id" text NOT NULL,
	"public_key" text NOT NULL,
	"counter" bigint DEFAULT 0 NOT NULL,
	"transports" text,
	"device_label" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "webauthn_credentials" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "recovery_codes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"code_hash" text NOT NULL,
	"consumed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "recovery_codes" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "step_up_otps" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"otp_hash" text NOT NULL,
	"action_context" text NOT NULL,
	"pariwar_id" uuid,
	"expires_at" timestamp with time zone NOT NULL,
	"consumed_at" timestamp with time zone,
	"attempts" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "step_up_otps" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "admin_credentials" ADD CONSTRAINT "admin_credentials_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "webauthn_credentials" ADD CONSTRAINT "webauthn_credentials_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recovery_codes" ADD CONSTRAINT "recovery_codes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "step_up_otps" ADD CONSTRAINT "step_up_otps_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "admin_credentials_email_blind_index_uq" ON "admin_credentials" USING btree ("email_blind_index");--> statement-breakpoint
CREATE INDEX "admin_sessions_expire_idx" ON "admin_sessions" USING btree ("expire");--> statement-breakpoint
CREATE UNIQUE INDEX "webauthn_credentials_credential_id_uq" ON "webauthn_credentials" USING btree ("credential_id");--> statement-breakpoint
CREATE INDEX "webauthn_credentials_user_idx" ON "webauthn_credentials" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "recovery_codes_user_idx" ON "recovery_codes" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "step_up_otps_user_idx" ON "step_up_otps" USING btree ("user_id");--> statement-breakpoint
ALTER TABLE "pariwar_passport" ADD CONSTRAINT "pariwar_passport_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "role_grants" ADD CONSTRAINT "role_grants_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE POLICY "admin_credentials_global_access" ON "admin_credentials" AS PERMISSIVE FOR ALL TO "twt_app" USING (true) WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "admin_sessions_global_access" ON "admin_sessions" AS PERMISSIVE FOR ALL TO "twt_app" USING (true) WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "users_global_access" ON "users" AS PERMISSIVE FOR ALL TO "twt_app" USING (true) WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "webauthn_credentials_global_access" ON "webauthn_credentials" AS PERMISSIVE FOR ALL TO "twt_app" USING (true) WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "recovery_codes_global_access" ON "recovery_codes" AS PERMISSIVE FOR ALL TO "twt_app" USING (true) WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "step_up_otps_global_access" ON "step_up_otps" AS PERMISSIVE FOR ALL TO "twt_app" USING (true) WITH CHECK (true);--> statement-breakpoint
-- ── Hand-supplements (NOT drizzle-kit-emitted; invisible to db:check) ──────────
-- (1) Table privileges for the app role. SELECT/INSERT/UPDATE/DELETE on every
-- identity/auth table — DELETE included (session revocation, device removal, OTP/
-- recovery reaping). Grants only to twt_app (the carve-out policies bind here).
GRANT SELECT, INSERT, UPDATE, DELETE ON "users" TO twt_app;--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE, DELETE ON "admin_credentials" TO twt_app;--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE, DELETE ON "webauthn_credentials" TO twt_app;--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE, DELETE ON "recovery_codes" TO twt_app;--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE, DELETE ON "admin_sessions" TO twt_app;--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE, DELETE ON "step_up_otps" TO twt_app;--> statement-breakpoint
-- (2) FORCE applies RLS even to the (non-superuser) table owner — kept adjacent in
-- intent to the generated ENABLE so no window exists where RLS is on without FORCE.
ALTER TABLE "users" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "admin_credentials" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "webauthn_credentials" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "recovery_codes" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "admin_sessions" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "step_up_otps" FORCE ROW LEVEL SECURITY;
