-- Migration 0004 — role_grants table + scoped tenant-isolation RLS (Story 1.8).
--
-- ⚠ DO NOT REGENERATE THIS FILE with `db:generate`.
-- The drizzle-kit-emitted statements (CREATE TYPE scope_dimension + CREATE TABLE
-- + ENABLE ROW LEVEL SECURITY + CREATE INDEX + the two CREATE POLICY declarations
-- from packages/domain/src/policies/role-grants-rls.ts) are wrapped here with
-- hand-supplemented GRANT + FORCE DDL that drizzle-kit does not emit. Mirrors
-- migrations 0002_events-log-rls.sql and 0003_pariwar-passport.sql.
--
-- SCOPED TABLE (architecture §3.13 L2406-2421): role_grants is tenant-isolated on
-- BOTH read and write — the inverse of the pariwar_passport carve-out. A Pariwar's
-- role grants are private; a cross-Pariwar grant read is a real leak. The roles
-- (twt_app / twt_service) already exist from migration 0002 — no CREATE ROLE here.
--
-- Hand-supplements (relative to the generated DDL):
--   1. GRANT SELECT, INSERT, UPDATE, DELETE on role_grants to twt_app. DELETE IS
--      INCLUDED (unlike the pariwar_passport singleton, which withholds it): role
--      grants are MUTABLE — a Super Admin adds / edits / REVOKES them (FR-44), so
--      revocation (DELETE) is a legitimate app-role operation. Grants only to
--      twt_app (the policies bind TO twt_app; twt_service has no policy on this
--      table so a grant would be inert under FORCE RLS).
--   2. ALTER TABLE role_grants FORCE ROW LEVEL SECURITY — applies RLS even to the
--      (non-superuser) table owner, so no future owner-run migration silently
--      reads/writes grants cross-tenant. ENABLE + FORCE kept adjacent (the 0002
--      breakpoint-atomicity precedent, W4-CR1.6).
--
-- Idempotency invariant (architecture §1.8 + Story 1.2 README §4) preserved: the
-- snapshot at meta/0004_snapshot.json records only the table-shape view (TYPE +
-- TABLE + ENABLE RLS + INDEX + the two policies); the GRANT/FORCE hand-supplements
-- are invisible to `drizzle-kit check`, matching migrations 0002/0003. Re-running
-- 0004 is a no-op (drizzle consults drizzle.__drizzle_migrations to skip applied
-- migrations).
--
-- Migrations are FORWARD-ONLY (architecture §1.8) — there is no down-migration in
-- the apply path. The precise manual inverse, for operator reference only (e.g. a
-- dev-DB reset outside the migration runner), is:
--     DROP POLICY IF EXISTS "role_grants_tenant_isolation_write" ON "role_grants";
--     DROP POLICY IF EXISTS "role_grants_tenant_isolation_select" ON "role_grants";
--     DROP TABLE IF EXISTS "role_grants";
--     DROP TYPE IF EXISTS "scope_dimension";

-- drizzle-kit-emitted: the scope_dimension enum type (canonical ordered set;
-- source of truth: packages/domain/src/rbac/scope.ts SCOPE_DIMENSIONS).
CREATE TYPE "public"."scope_dimension" AS ENUM('global', 'pariwar', 'state', 'district', 'block', 'self');--> statement-breakpoint
-- drizzle-kit-emitted: the role_grants table (source of truth:
-- packages/domain/src/schema/role_grants.ts). user_id + created_by are
-- unconstrained uuid — NO FK (admin/users table lands Story 1.9+).
CREATE TABLE "role_grants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"pariwar_id" uuid NOT NULL,
	"role" text NOT NULL,
	"scope_dimension" "scope_dimension" NOT NULL,
	"scope_value" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid
);
--> statement-breakpoint
-- (1) Table privileges for the app role. SELECT/INSERT/UPDATE/DELETE — DELETE is
-- included because grants are mutable/revocable (see header).
GRANT SELECT, INSERT, UPDATE, DELETE ON "role_grants" TO twt_app;--> statement-breakpoint
-- drizzle-kit-emitted: turn RLS on for role_grants.
ALTER TABLE "role_grants" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
-- (2) FORCE applies RLS even to the (non-superuser) table owner — kept adjacent
-- to ENABLE so no window exists where RLS is on without FORCE.
ALTER TABLE "role_grants" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
-- drizzle-kit-emitted: the actor-grant lookup index (pariwar_id leads — RLS
-- predicate column + tenant key).
CREATE INDEX "role_grants_pariwar_user_idx" ON "role_grants" USING btree ("pariwar_id","user_id");--> statement-breakpoint
-- drizzle-kit-emitted: the two scoped tenant-isolation policies (source of truth:
-- packages/domain/src/policies/role-grants-rls.ts). Both key on pariwar_id via the
-- Story 1.6 closed-failure construct — SELECT + write are tenant-isolated (SCOPED,
-- not a carve-out).
CREATE POLICY "role_grants_tenant_isolation_select" ON "role_grants" AS PERMISSIVE FOR SELECT TO "twt_app" USING (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "role_grants_tenant_isolation_write" ON "role_grants" AS PERMISSIVE FOR ALL TO "twt_app" USING (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid) WITH CHECK (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid);
