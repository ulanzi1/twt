-- Migration 0007 — audit_log_entries Row-Level Security + service-role wiring (Story 1.10).
--
-- ⚠ DO NOT REGENERATE THIS FILE with `db:generate`.
-- The drizzle-kit-emitted statements (ENABLE ROW LEVEL SECURITY + the single
-- CREATE POLICY from packages/domain/src/policies/audit-log-entries-rls.ts) are
-- wrapped here with hand-supplemented GRANT + FORCE + self-test DDL that
-- drizzle-kit does not emit. Mirrors migrations 0002_events-log-rls.sql /
-- 0004_role-grants.sql. The roles (twt_app / twt_service) already exist from
-- migration 0002 — no CREATE ROLE here.
--
-- ── Read-isolated, service-written (AC-8 + DD-2/DD-3) ──────────────────────────
-- audit_log_entries is a SCOPED table for READS (tenant-isolated on pariwar_id,
-- Story 1.6 invariant). It is NOT written by tenants: the hash-chain writer
-- (packages/domain/src/audit/write.ts) runs under the BYPASSRLS service role so
-- it can read the GLOBAL chain tail across all tenants and serialize inserts via
-- pg_advisory_xact_lock. Hence:
--   - twt_app  : GRANT SELECT only (+ the SELECT tenant-isolation policy). No
--                INSERT/UPDATE/DELETE grant → tenants structurally cannot write
--                or mutate audit lines (the append-only triggers from 0006 are
--                the second guard).
--   - twt_service : GRANT INSERT, SELECT. The writer's role.
--
-- ── W2-CR1.6 — why twt_service has grants but NO permissive write policy ───────
-- A naive reading flags "twt_service can INSERT but there is no RLS policy
-- permitting it → deny-all". That is intentional. In PRODUCTION the writer
-- connects as a DISTINCT login role that is a MEMBER of twt_service and carries
-- the BYPASSRLS attribute (DD-3). BYPASSRLS is a role attribute (not inherited
-- via membership and not gated by policies): a BYPASSRLS session is exempt from
-- every RLS policy, INCLUDING under FORCE ROW LEVEL SECURITY. So the writer needs
-- the table GRANT (privilege) but needs NO permissive policy — it bypasses RLS
-- entirely to read the cross-tenant tail. Adding a write policy `TO twt_service`
-- would be misleading (it would never be consulted) AND would wrongly suggest a
-- non-BYPASSRLS path can append audit lines. In dev/CI the writer's service pool
-- falls back to the superuser login (twt_dev_app), which likewise bypasses RLS,
-- so these grants are inert-but-harmless locally and the integration tests stay
-- green (DD-3).
--
-- ── DD-3 — production service-login role (shape lands here; credential deferred) ─
-- Production provisions a login role, e.g. `twt_service_login`, as:
--     CREATE ROLE twt_service_login LOGIN BYPASSRLS PASSWORD <from Secret Manager>;
--     GRANT twt_service TO twt_service_login;   -- inherits the table GRANTs
-- The actual credential is provisioned via Terraform + Secret Manager (Task 8 /
-- infra), live-apply-deferrable per the Story 1.5 D1-1.5 precedent — only the
-- SHAPE + the explanatory contract land in this migration. The application wires
-- a second pg.Pool (the "service pool") bound to this login's connection string;
-- in dev/CI that string falls back to the same superuser DATABASE_URL
-- (documented). The twt_service GROUP itself stays NOLOGIN NOBYPASSRLS (asserted
-- by migration 0002's self-test); only the login MEMBER carries BYPASSRLS.
--
-- Idempotency invariant (architecture §1.8 + Story 1.2 README §4) preserved: the
-- snapshot at meta/0007_snapshot.json records only the table-shape view (ENABLE
-- RLS + the policy); the GRANT/FORCE/self-test hand-supplements are invisible to
-- `drizzle-kit check`, matching 0002/0004. Every statement is independently
-- idempotent; re-running 0007 is a no-op (drizzle consults __drizzle_migrations).
--
-- Migrations are FORWARD-ONLY (architecture §1.8). The precise manual inverse,
-- for operator reference only (e.g. a dev-DB reset outside the runner), is:
--     DROP POLICY IF EXISTS "audit_log_entries_tenant_isolation_select" ON "audit_log_entries";
--     ALTER TABLE "audit_log_entries" NO FORCE ROW LEVEL SECURITY;
--     ALTER TABLE "audit_log_entries" DISABLE ROW LEVEL SECURITY;
--     REVOKE INSERT, SELECT ON "audit_log_entries" FROM twt_service;
--     REVOKE SELECT ON "audit_log_entries" FROM twt_app;

-- (1) Table privileges. twt_app: SELECT only (read-isolated, never writes audit
-- lines). twt_service: INSERT + SELECT (the BYPASSRLS writer; see W2-CR1.6 above).
GRANT SELECT ON "audit_log_entries" TO twt_app;--> statement-breakpoint
GRANT INSERT, SELECT ON "audit_log_entries" TO twt_service;--> statement-breakpoint
-- drizzle-kit-emitted: turn RLS on for audit_log_entries.
ALTER TABLE "audit_log_entries" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
-- (2) FORCE applies RLS even to the (non-superuser) table owner — kept adjacent
-- to ENABLE so no window exists where RLS is on without FORCE (W4-CR1.6).
ALTER TABLE "audit_log_entries" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
-- drizzle-kit-emitted: the SELECT tenant-isolation policy (source of truth:
-- packages/domain/src/policies/audit-log-entries-rls.ts). SELECT-ONLY — there is
-- deliberately no write policy (see header).
CREATE POLICY "audit_log_entries_tenant_isolation_select" ON "audit_log_entries" AS PERMISSIVE FOR SELECT TO "twt_app" USING (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid);--> statement-breakpoint
-- (3) Migration-time self-test: fail loudly if twt_app ever regains BYPASSRLS. A
-- future operator's `ALTER ROLE twt_app BYPASSRLS` (an ill-advised "let me debug"
-- moment) fails the next `pnpm db:migrate`. NOTE: this asserts ONLY twt_app —
-- the production twt_service-login MEMBER intentionally carries BYPASSRLS (DD-3),
-- so asserting NOBYPASSRLS on the writer path would be wrong. The twt_service
-- GROUP's NOBYPASSRLS invariant is already asserted by migration 0002's self-test.
DO $$ BEGIN
  IF (SELECT rolbypassrls FROM pg_roles WHERE rolname = 'twt_app') THEN
    RAISE EXCEPTION 'twt_app role has BYPASSRLS — tenant isolation inverted; revert the role-attribute change';
  END IF;
END $$;
