-- Migration 0009 — audit_integrity_checks Row-Level Security + role grants (Story 1.11a).
--
-- ⚠ DO NOT REGENERATE THIS FILE with `db:generate`.
-- The drizzle-kit-emitted statements (ENABLE ROW LEVEL SECURITY + the single
-- CREATE POLICY from packages/domain/src/policies/audit-integrity-checks-rls.ts)
-- are wrapped here with hand-supplemented GRANT + FORCE + self-test DDL that
-- drizzle-kit does not emit. Mirrors migration 0007_audit-log-entries-rls.sql.
-- The roles (twt_app / twt_service) already exist from migration 0002 — no
-- CREATE ROLE here.
--
-- ── GLOBAL verdict ledger, service-written (DD-3) ──────────────────────────────
-- audit_integrity_checks has NO `pariwar_id` dimension — it is a GLOBAL statement
-- about the one global audit chain. So unlike audit_log_entries (tenant-isolated
-- SELECT), the policy is `USING(true)`: every twt_app reader sees every verdict
-- (the 1.11b trustee UI). FORCE RLS is still applied for regime-consistency
-- (Story 1.6 invariant: every twt_app table is FORCE-RLS) — the USING(true)
-- carve-out is the visible, auditable line that says "global table, nothing to
-- scope". Hence:
--   - twt_app     : GRANT SELECT only (+ the USING(true) SELECT policy). No
--                   INSERT/UPDATE/DELETE grant → readers structurally cannot
--                   write or mutate verdicts (the append-only triggers from 0008
--                   are the second guard).
--   - twt_service : GRANT INSERT, SELECT. The integrity-check writer's role.
--
-- ── Why twt_service has grants but NO permissive write policy (W2-CR1.6 echo) ───
-- Identical posture to audit_log_entries (migration 0007). The integrity-check
-- writer connects in PRODUCTION as a DISTINCT login role that is a MEMBER of
-- twt_service and carries BYPASSRLS (DD-1/DD-3) so it can read the GLOBAL chain
-- across all tenants. A BYPASSRLS session is exempt from every policy (even under
-- FORCE), so the writer needs the table GRANT but needs NO permissive write
-- policy — adding one `TO twt_service` would never be consulted and would wrongly
-- suggest a non-BYPASSRLS path can append verdicts. In dev/CI the service pool
-- falls back to the superuser login (twt_dev_app), which likewise bypasses RLS.
--
-- Idempotency invariant (architecture §1.8 + Story 1.2 README §4) preserved: the
-- snapshot at meta/0009_snapshot.json records only the table-shape view (ENABLE
-- RLS + the policy); the GRANT/FORCE/self-test hand-supplements are invisible to
-- `drizzle-kit check`, matching 0002/0004/0007. Every statement is independently
-- idempotent; re-running 0009 is a no-op (drizzle consults __drizzle_migrations).
--
-- Migrations are FORWARD-ONLY (architecture §1.8). The precise manual inverse,
-- for operator reference only (e.g. a dev-DB reset outside the runner), is:
--     DROP POLICY IF EXISTS "audit_integrity_checks_global_select" ON "audit_integrity_checks";
--     ALTER TABLE "audit_integrity_checks" NO FORCE ROW LEVEL SECURITY;
--     ALTER TABLE "audit_integrity_checks" DISABLE ROW LEVEL SECURITY;
--     REVOKE INSERT, SELECT ON "audit_integrity_checks" FROM twt_service;
--     REVOKE SELECT ON "audit_integrity_checks" FROM twt_app;

-- (1) Table privileges. twt_app: SELECT only (read-only verdict consumer, the
-- 1.11b UI). twt_service: INSERT + SELECT (the BYPASSRLS writer; see above).
GRANT SELECT ON "audit_integrity_checks" TO twt_app;--> statement-breakpoint
GRANT INSERT, SELECT ON "audit_integrity_checks" TO twt_service;--> statement-breakpoint
-- drizzle-kit-emitted: turn RLS on for audit_integrity_checks.
ALTER TABLE "audit_integrity_checks" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
-- (2) FORCE applies RLS even to the (non-superuser) table owner — kept adjacent
-- to ENABLE so no window exists where RLS is on without FORCE (W4-CR1.6).
ALTER TABLE "audit_integrity_checks" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
-- drizzle-kit-emitted: the USING(true) global SELECT carve-out (source of truth:
-- packages/domain/src/policies/audit-integrity-checks-rls.ts). SELECT-ONLY — there
-- is deliberately no write policy (see header).
CREATE POLICY "audit_integrity_checks_global_select" ON "audit_integrity_checks" AS PERMISSIVE FOR SELECT TO "twt_app" USING (true);--> statement-breakpoint
-- (3) Migration-time self-test: fail loudly if twt_app ever regains BYPASSRLS. A
-- future operator's `ALTER ROLE twt_app BYPASSRLS` fails the next `pnpm
-- db:migrate`. This is the codebase's canonical "RLS regime intact" assertion
-- (migration 0007 precedent): twt_app must never bypass RLS, so FORCE stays
-- meaningful on every twt_app table. The twt_service GROUP's NOBYPASSRLS
-- invariant is already asserted by migration 0002's self-test (the production
-- service-login MEMBER intentionally carries BYPASSRLS — DD-1/DD-3).
DO $$ BEGIN
  IF (SELECT rolbypassrls FROM pg_roles WHERE rolname = 'twt_app') THEN
    RAISE EXCEPTION 'twt_app role has BYPASSRLS — RLS regime inverted; revert the role-attribute change';
  END IF;
END $$;
