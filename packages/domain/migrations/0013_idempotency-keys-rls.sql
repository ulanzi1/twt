-- Migration 0013 — idempotency_keys Row-Level Security + role grants (Story 1.12).
--
-- ⚠ DO NOT REGENERATE THIS FILE with `db:generate`.
-- The drizzle-kit-emitted statements (ENABLE ROW LEVEL SECURITY + the single
-- CREATE POLICY from packages/domain/src/policies/idempotency-keys-rls.ts) are
-- wrapped here with hand-supplemented GRANT + FORCE + self-test DDL that
-- drizzle-kit does not emit. Mirrors migration 0009_audit-integrity-checks-rls.sql.
-- The roles (twt_app / twt_service) already exist from migration 0002 — no
-- CREATE ROLE here.
--
-- ── GLOBAL, WRITABLE keyed store (DD-2) ───────────────────────────────────────
-- idempotency_keys has NO `pariwar_id` dimension — it is a GLOBAL infra primitive
-- (DD-2). Unlike the read-only audit_integrity_checks ledger (0009, SELECT-only,
-- USING(true)), twt_app WRITES this table in the apps/api request path
-- (claim / recordResult), so the policy is a permissive ALL with USING(true) AND
-- WITH CHECK(true), and twt_app gets the MUTABLE grant set (the migration 0004
-- `role_grants` pattern). FORCE RLS is still applied for regime-consistency (Story
-- 1.6 invariant: every twt_app table is FORCE-RLS).
--
-- ── Why twt_service ALSO gets the mutable grant (correctness over the story's
--    "inherits via BYPASSRLS" shorthand) ──────────────────────────────────────
-- Background workers (apps/jobs: the TTL vacuum + any worker-path claim/record)
-- connect as a login that is a MEMBER of twt_service and carries BYPASSRLS. But
-- BYPASSRLS waives only RLS POLICY evaluation — it does NOT waive table-PRIVILEGE
-- (GRANT) checks. So the worker still needs SELECT/INSERT/UPDATE/DELETE on the
-- table, exactly as the integrity-check writer needed an explicit twt_service
-- GRANT in 0009. The TTL vacuum's `DELETE … WHERE expires_at < now()` (AC-5) would
-- fail with 42501 otherwise. twt_service gets NO permissive policy (a BYPASSRLS
-- session is exempt from every policy anyway; in dev/CI the service pool falls back
-- to the superuser twt_dev_app, which also bypasses).
--   - twt_app     : GRANT SELECT, INSERT, UPDATE, DELETE (+ the USING/CHECK(true)
--                   ALL policy). The apps/api request-path writer.
--   - twt_service : GRANT SELECT, INSERT, UPDATE, DELETE (the BYPASSRLS worker:
--                   vacuum DELETE + worker-path claim/record). No policy.
--
-- Idempotency invariant (architecture §1.8 + Story 1.2 README §4) preserved: the
-- snapshot at meta/0013_snapshot.json records only the table-shape view (ENABLE
-- RLS + the policy); the GRANT/FORCE/self-test hand-supplements are invisible to
-- `drizzle-kit check`, matching 0002/0004/0007/0009. Every statement is
-- independently idempotent; re-running 0013 is a no-op (drizzle consults
-- __drizzle_migrations).
--
-- Migrations are FORWARD-ONLY (architecture §1.8). The precise manual inverse, for
-- operator reference only (e.g. a dev-DB reset outside the runner), is:
--     DROP POLICY IF EXISTS "idempotency_keys_global_all" ON "idempotency_keys";
--     ALTER TABLE "idempotency_keys" NO FORCE ROW LEVEL SECURITY;
--     ALTER TABLE "idempotency_keys" DISABLE ROW LEVEL SECURITY;
--     REVOKE SELECT, INSERT, UPDATE, DELETE ON "idempotency_keys" FROM twt_service;
--     REVOKE SELECT, INSERT, UPDATE, DELETE ON "idempotency_keys" FROM twt_app;

-- (1) Table privileges. Both roles get the MUTABLE set (recordResult UPDATEs,
-- expired-key reclaim UPDATEs, the TTL vacuum DELETEs). twt_service is the
-- BYPASSRLS worker; it needs the GRANT despite BYPASSRLS (see header).
GRANT SELECT, INSERT, UPDATE, DELETE ON "idempotency_keys" TO twt_app;--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE, DELETE ON "idempotency_keys" TO twt_service;--> statement-breakpoint
-- drizzle-kit-emitted: turn RLS on for idempotency_keys.
ALTER TABLE "idempotency_keys" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
-- (2) FORCE applies RLS even to the (non-superuser) table owner — kept adjacent to
-- ENABLE so no window exists where RLS is on without FORCE (W4-CR1.6).
ALTER TABLE "idempotency_keys" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
-- drizzle-kit-emitted: the USING(true) WITH CHECK(true) global ALL carve-out
-- (source of truth: packages/domain/src/policies/idempotency-keys-rls.ts). Both
-- read AND write are permitted for any twt_app session (global writable infra).
CREATE POLICY "idempotency_keys_global_all" ON "idempotency_keys" AS PERMISSIVE FOR ALL TO "twt_app" USING (true) WITH CHECK (true);--> statement-breakpoint
-- (3) Migration-time self-test: fail loudly if twt_app ever regains BYPASSRLS. A
-- future operator's `ALTER ROLE twt_app BYPASSRLS` fails the next `pnpm
-- db:migrate`. This is the codebase's canonical "RLS regime intact" assertion
-- (migrations 0007/0009 precedent): twt_app must never bypass RLS, so FORCE stays
-- meaningful on every twt_app table.
DO $$ BEGIN
  IF (SELECT rolbypassrls FROM pg_roles WHERE rolname = 'twt_app') THEN
    RAISE EXCEPTION 'twt_app role has BYPASSRLS — RLS regime inverted; revert the role-attribute change';
  END IF;
END $$;
