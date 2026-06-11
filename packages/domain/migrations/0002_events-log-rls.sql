-- Migration 0002 — events_log Row-Level Security (Story 1.6).
--
-- ⚠ DO NOT REGENERATE THIS FILE with `db:generate`.
-- The drizzle-kit-emitted statements (ENABLE ROW LEVEL SECURITY + the two
-- CREATE POLICY declarations from packages/domain/src/policies/events-log-rls.ts)
-- are wrapped here with hand-supplemented role + grant + force + self-test DDL
-- that drizzle-kit does not emit. Per architecture §1.2 line 717-770 this is the
-- typed-constraint enforcement of Cross-Cutting #1 (multi-tenant isolation).
--
-- Hand-supplements (in apply order):
--   1. Idempotent CREATE ROLE twt_app / twt_service (NOLOGIN groups). These MUST
--      exist before the CREATE POLICY ... TO twt_app statements below.
--   2. Explicit ALTER ROLE ... NOBYPASSRLS — defensive even though CREATE ROLE
--      defaults to NOBYPASSRLS; this is the authoritative declarative surface
--      that closes Story 1.2 deferred W1 (BYPASSRLS not asserted in Terraform —
--      Cloud SQL's google_sql_user cannot express role-attribute flags, so the
--      migration is the cleaner home).
--   3. GRANT membership of both group roles to the Cloud SQL login role
--      (twt_dev_app per Story 1.2 Terraform) + table privileges to the group
--      roles. The membership grant lets RLS policies `TO twt_app` apply to
--      twt_dev_app; the table grants let a `SET ROLE twt_app` session (the
--      production non-superuser posture) actually read/write events_log.
--      ⚠ `GRANT twt_service TO twt_dev_app` is dev/CI-only — production wires a
--      separate twt_service-login role with its own credentials (deferred
--      D9-1.6 / Story 1.10). In local Docker + CI the single login role
--      (twt_dev_app = POSTGRES_USER = superuser) plays every part.
--   4. ALTER TABLE events_log FORCE ROW LEVEL SECURITY — applies RLS even to the
--      table owner (a non-superuser owner in production), so no future
--      owner-run migration silently reads cross-tenant rows.
--   5. Migration-time self-test — RAISE EXCEPTION if either group role ever
--      regains BYPASSRLS. A future operator's manual `ALTER ROLE twt_app
--      BYPASSRLS` (an ill-advised "let me debug" moment) fails the next
--      `pnpm db:migrate`. The cheapest RLS-posture regression detector.
--
-- The USING/WITH CHECK expression is `pariwar_id = nullif(current_setting(
-- 'app.pariwar_id', true), '')::uuid`. The `nullif(…, '')` maps an unset session
-- variable (empty string) to NULL so the comparison yields "no match" → 0 rows,
-- rather than a `''::uuid` cast error that would abort the statement (verified at
-- dev-time). A non-empty non-UUID value still fails the cast (defense-in-depth);
-- that path is closed upstream by setPariwarScope's UUID_REGEX guard.
--
-- Idempotency invariant (architecture §1.8 line 1003-1005 + Story 1.2 README §4)
-- preserved: re-running migration 0002 is a no-op — drizzle consults
-- drizzle.__drizzle_migrations to skip applied migrations, and every statement
-- below is independently idempotent (DO-block guards for CREATE ROLE; ENABLE /
-- FORCE / NOBYPASSRLS / GRANT are no-ops when already in the target state).
-- The snapshot at meta/0002_snapshot.json records only the table-shape view
-- (ENABLE RLS + the two policies); the role/grant/force/self-test hand-
-- supplements are invisible to `drizzle-kit check`, matching migration 0001.

-- (1) Idempotent role creation — must precede the CREATE POLICY ... TO twt_app.
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'twt_app') THEN
    CREATE ROLE twt_app NOLOGIN NOBYPASSRLS;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'twt_service') THEN
    CREATE ROLE twt_service NOLOGIN NOBYPASSRLS;
  END IF;
END $$;--> statement-breakpoint
-- (2) Explicit defensive NOBYPASSRLS (idempotent — no-op when already set).
ALTER ROLE twt_app NOBYPASSRLS;--> statement-breakpoint
ALTER ROLE twt_service NOBYPASSRLS;--> statement-breakpoint
-- (3) Membership + table privileges (idempotent — GRANT is a no-op if present).
GRANT twt_app TO twt_dev_app;--> statement-breakpoint
GRANT twt_service TO twt_dev_app;--> statement-breakpoint
GRANT SELECT, INSERT ON events_log TO twt_app;--> statement-breakpoint
GRANT SELECT, INSERT ON events_log TO twt_service;--> statement-breakpoint
-- drizzle-kit-emitted: turn RLS on for events_log (inert without policies).
ALTER TABLE "events_log" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
-- drizzle-kit-emitted: the two tenant-isolation policies (source of truth:
-- packages/domain/src/policies/events-log-rls.ts).
CREATE POLICY "events_log_tenant_isolation_select" ON "events_log" AS PERMISSIVE FOR SELECT TO "twt_app" USING (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "events_log_tenant_isolation_write" ON "events_log" AS PERMISSIVE FOR ALL TO "twt_app" USING (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid) WITH CHECK (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid);--> statement-breakpoint
-- (4) FORCE applies RLS even to the (non-superuser) table owner.
ALTER TABLE "events_log" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
-- (5) Migration-time self-test: fail loudly if a role regains BYPASSRLS.
DO $$ BEGIN
  IF (SELECT rolbypassrls FROM pg_roles WHERE rolname = 'twt_app') THEN
    RAISE EXCEPTION 'twt_app role has BYPASSRLS — Story 1.2 W1 deferral inverted; revert the role-attribute change';
  END IF;
  IF (SELECT rolbypassrls FROM pg_roles WHERE rolname = 'twt_service') THEN
    RAISE EXCEPTION 'twt_service role has BYPASSRLS — Story 1.2 W1 deferral inverted; revert the role-attribute change';
  END IF;
END $$;
