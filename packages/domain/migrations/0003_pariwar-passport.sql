-- Migration 0003 — pariwar_passport table + cross-Pariwar carve-out RLS (Story 1.7).
--
-- ⚠ DO NOT REGENERATE THIS FILE with `db:generate`.
-- The drizzle-kit-emitted statements (CREATE TYPE locale + CREATE TABLE +
-- ENABLE ROW LEVEL SECURITY + the two CREATE POLICY declarations from
-- packages/domain/src/policies/pariwar-passport-rls.ts) are wrapped here with
-- hand-supplemented GRANT + FORCE + updated_at-trigger DDL that drizzle-kit does
-- not emit. Mirrors migration 0002_events-log-rls.sql.
--
-- THE CARVE-OUT (architecture §1.2 line 726-729, D3-1.6): the SELECT policy is
-- `USING (true)` — cross-Pariwar readable — DELIBERATELY, because a Pariwar's
-- public identity + branding is readable across tenants. Writes stay tenant-scoped
-- via the Story 1.6 closed-failure construct. The roles (twt_app / twt_service)
-- already exist from migration 0002 — no CREATE ROLE here.
--
-- Hand-supplements (relative to the generated DDL):
--   1. GRANT SELECT, INSERT, UPDATE on pariwar_passport to twt_app. NOT DELETE:
--      a Passport is a 1:1 singleton identity document and must not be deletable
--      by the app role at v1 (defense in depth — even though the write policy is
--      `for: 'all'`, withholding the DELETE privilege blocks deletion at the
--      privilege layer). Grants only to twt_app (the policies bind TO twt_app;
--      twt_service has no policy on this table so a grant would be inert under
--      FORCE RLS).
--   2. ALTER TABLE pariwar_passport FORCE ROW LEVEL SECURITY — applies RLS even to
--      the (non-superuser) table owner, so no future owner-run migration silently
--      reads/writes cross-tenant. ENABLE + FORCE kept adjacent (the 0002
--      breakpoint-atomicity precedent, W4-CR1.6).
--   3. updated_at auto-update trigger. Without this, `updated_at` would only ever
--      equal `created_at` and AC-3's freshness-timestamp / stale-while-revalidate
--      marker (architecture §1.10 line 1068-1070) would be silently broken. The
--      `set_updated_at()` function is a reusable utility (CREATE OR REPLACE);
--      the trigger is dropped-if-exists first for idempotency.
--
-- Idempotency invariant (architecture §1.8 + Story 1.2 README §4) preserved: the
-- snapshot at meta/0003_snapshot.json records only the table-shape view (TYPE +
-- TABLE + ENABLE RLS + the two policies); the GRANT/FORCE/trigger hand-supplements
-- are invisible to `drizzle-kit check`, matching migrations 0001/0002.

-- drizzle-kit-emitted: the locale enum type backing locale_default.
CREATE TYPE "public"."locale" AS ENUM('hi', 'en');--> statement-breakpoint
-- drizzle-kit-emitted: the pariwar_passport table (source of truth:
-- packages/domain/src/schema/pariwar_passport.ts).
CREATE TABLE "pariwar_passport" (
	"pariwar_id" uuid PRIMARY KEY NOT NULL,
	"display_name_en" text NOT NULL,
	"display_name_hi" text NOT NULL,
	"legal_name" text NOT NULL,
	"trust_registration_id" text,
	"branding_bundle" jsonb NOT NULL,
	"locale_default" "locale" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
-- (1) Table privileges for the app role. SELECT/INSERT/UPDATE only — DELETE is
-- intentionally withheld (singleton identity document; see header).
GRANT SELECT, INSERT, UPDATE ON "pariwar_passport" TO twt_app;--> statement-breakpoint
-- drizzle-kit-emitted: turn RLS on for pariwar_passport.
ALTER TABLE "pariwar_passport" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
-- (2) FORCE applies RLS even to the (non-superuser) table owner — kept adjacent
-- to ENABLE so no window exists where RLS is on without FORCE.
ALTER TABLE "pariwar_passport" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
-- drizzle-kit-emitted: THE CARVE-OUT. cross-Pariwar-readable SELECT (USING true)
-- + tenant-isolated write (source of truth:
-- packages/domain/src/policies/pariwar-passport-rls.ts).
CREATE POLICY "pariwar_passport_cross_readable_select" ON "pariwar_passport" AS PERMISSIVE FOR SELECT TO "twt_app" USING (true);--> statement-breakpoint
CREATE POLICY "pariwar_passport_tenant_isolation_write" ON "pariwar_passport" AS PERMISSIVE FOR ALL TO "twt_app" USING (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid) WITH CHECK (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid);--> statement-breakpoint
-- (3) updated_at auto-update trigger — the AC-3 freshness-timestamp marker.
CREATE OR REPLACE FUNCTION set_updated_at()
  RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;--> statement-breakpoint
DROP TRIGGER IF EXISTS pariwar_passport_set_updated_at ON pariwar_passport;--> statement-breakpoint
CREATE TRIGGER pariwar_passport_set_updated_at
  BEFORE UPDATE ON pariwar_passport
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
