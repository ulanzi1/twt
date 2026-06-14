-- Migration 0011 — audit_integrity_acknowledgements table + append-only triggers
-- + RLS + grants (Story 1.11b, DD-5).
--
-- ⚠ DO NOT REGENERATE THIS FILE with `db:generate`.
-- The drizzle-kit-emitted statements (CREATE TABLE + FK + index + ENABLE RLS +
-- the single CREATE POLICY from
-- packages/domain/src/policies/audit-integrity-acknowledgements-rls.ts) are
-- hand-supplemented here with the append-only triggers + GRANT + FORCE + self-test
-- DDL that drizzle-kit does not emit. Mirrors migrations 0008
-- (table+triggers) / 0009 (RLS+grants+self-test) for audit_integrity_checks. The
-- table creation + triggers + RLS land in the SAME migration so per-migration
-- atomicity (architecture §1.8 L1003-1005) means a failed step rolls back the
-- whole table. The roles (twt_app / twt_service) already exist from migration 0002
-- — no CREATE ROLE here.
--
-- ── A SEPARATE, append-only table (DD-5) ──────────────────────────────────────
-- AC-5 wants the red banner to persist "until manually acknowledged and an
-- investigation ticket is opened". The acknowledgement is recorded HERE rather
-- than as a mutating UPDATE on audit_integrity_checks, so that verdict ledger
-- stays STRICTLY immutable (its 0008 reject-mutation triggers are untouched). An
-- acknowledgement is itself tamper-evident: INSERT-only, no un-record/rewrite.
--
-- ── GLOBAL verdict-acknowledgement ledger, service-written ────────────────────
-- Like audit_integrity_checks, this table has NO `pariwar_id` dimension — it is a
-- GLOBAL statement about the one global chain's verdicts. So the policy is
-- `USING(true)`: every twt_app reader sees every acknowledgement (the 1.11b banner
-- persistence read path). FORCE RLS is still applied for regime-consistency
-- (Story 1.6 invariant). Hence:
--   - twt_app     : GRANT SELECT only (+ the USING(true) SELECT policy). No
--                   write grant → the read path structurally cannot append/mutate.
--   - twt_service : GRANT INSERT, SELECT. The acknowledge endpoint writes through
--                   deps.servicePool (the BYPASSRLS service role) — the same pool
--                   the on-demand verify endpoint + the integrity-check writer use.
--                   A BYPASSRLS session is exempt from every policy (even under
--                   FORCE), so it needs the table GRANT but NO permissive write
--                   policy (adding one TO twt_service would never be consulted —
--                   identical posture to audit_integrity_checks, W2-CR1.6 echo).
--
-- Idempotency invariant (architecture §1.8) preserved: the snapshot at
-- meta/0011_snapshot.json records only the table-shape view (table + FK + index +
-- ENABLE RLS + the policy); the trigger/GRANT/FORCE/self-test hand-supplements are
-- invisible to `drizzle-kit check`, matching 0002/0004/0007/0008/0009. Every
-- statement is independently idempotent; re-running 0011 is a no-op (drizzle
-- consults __drizzle_migrations).

CREATE TABLE "audit_integrity_acknowledgements" (
	"acknowledgement_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"check_id" uuid NOT NULL,
	"acknowledged_at" timestamp with time zone DEFAULT now() NOT NULL,
	"acknowledged_by" uuid NOT NULL,
	"ticket_ref" text NOT NULL
);
--> statement-breakpoint
ALTER TABLE "audit_integrity_acknowledgements" ADD CONSTRAINT "audit_integrity_acknowledgements_check_id_audit_integrity_checks_check_id_fk" FOREIGN KEY ("check_id") REFERENCES "public"."audit_integrity_checks"("check_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "audit_integrity_acknowledgements_check_id_idx" ON "audit_integrity_acknowledgements" USING btree ("check_id");--> statement-breakpoint
-- Append-only enforcement (DD-5): audit_integrity_acknowledgements is INSERT-only —
-- an acknowledgement is itself tamper-evident and cannot be un-recorded or
-- rewritten after the fact. Structural enforcement at the DB layer: even a raw SQL
-- UPDATE/DELETE/TRUNCATE (including by the BYPASSRLS service role) raises. Mirrors
-- audit_integrity_checks_reject_mutation (migration 0008).
CREATE FUNCTION audit_integrity_acknowledgements_reject_mutation()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION
    'audit_integrity_acknowledgements is append-only — acknowledgements are immutable (Story 1.11b / FR-47)'
    USING ERRCODE = 'integrity_constraint_violation';
END;
$$;
--> statement-breakpoint
CREATE TRIGGER audit_integrity_acknowledgements_no_update
  BEFORE UPDATE ON audit_integrity_acknowledgements
  FOR EACH ROW EXECUTE FUNCTION audit_integrity_acknowledgements_reject_mutation();
--> statement-breakpoint
CREATE TRIGGER audit_integrity_acknowledgements_no_delete
  BEFORE DELETE ON audit_integrity_acknowledgements
  FOR EACH ROW EXECUTE FUNCTION audit_integrity_acknowledgements_reject_mutation();
--> statement-breakpoint
CREATE TRIGGER audit_integrity_acknowledgements_no_truncate
  BEFORE TRUNCATE ON audit_integrity_acknowledgements
  EXECUTE FUNCTION audit_integrity_acknowledgements_reject_mutation();
--> statement-breakpoint
-- (1) Table privileges. twt_app: SELECT only (read-only acknowledgement consumer,
-- the 1.11b UI). twt_service: INSERT + SELECT (the BYPASSRLS writer; see header).
GRANT SELECT ON "audit_integrity_acknowledgements" TO twt_app;--> statement-breakpoint
GRANT INSERT, SELECT ON "audit_integrity_acknowledgements" TO twt_service;--> statement-breakpoint
-- drizzle-kit-emitted: turn RLS on for audit_integrity_acknowledgements.
ALTER TABLE "audit_integrity_acknowledgements" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
-- FORCE applies RLS even to the (non-superuser) table owner — kept adjacent to
-- ENABLE so no window exists where RLS is on without FORCE (W4-CR1.6).
ALTER TABLE "audit_integrity_acknowledgements" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
-- drizzle-kit-emitted: the USING(true) global SELECT carve-out (source of truth:
-- packages/domain/src/policies/audit-integrity-acknowledgements-rls.ts).
-- SELECT-ONLY — there is deliberately no write policy (see header).
CREATE POLICY "audit_integrity_acknowledgements_global_select" ON "audit_integrity_acknowledgements" AS PERMISSIVE FOR SELECT TO "twt_app" USING (true);--> statement-breakpoint
-- Migration-time self-test: fail loudly if twt_app ever regains BYPASSRLS (migration
-- 0007/0009 precedent — the codebase's canonical "RLS regime intact" assertion).
DO $$ BEGIN
  IF (SELECT rolbypassrls FROM pg_roles WHERE rolname = 'twt_app') THEN
    RAISE EXCEPTION 'twt_app role has BYPASSRLS — RLS regime inverted; revert the role-attribute change';
  END IF;
END $$;
-- Migrations are FORWARD-ONLY (architecture §1.8). The precise manual inverse,
-- for operator reference only (e.g. a dev-DB reset outside the runner), is:
--     DROP POLICY IF EXISTS "audit_integrity_acknowledgements_global_select" ON "audit_integrity_acknowledgements";
--     ALTER TABLE "audit_integrity_acknowledgements" NO FORCE ROW LEVEL SECURITY;
--     ALTER TABLE "audit_integrity_acknowledgements" DISABLE ROW LEVEL SECURITY;
--     REVOKE INSERT, SELECT ON "audit_integrity_acknowledgements" FROM twt_service;
--     REVOKE SELECT ON "audit_integrity_acknowledgements" FROM twt_app;
--     DROP TRIGGER IF EXISTS audit_integrity_acknowledgements_no_truncate ON "audit_integrity_acknowledgements";
--     DROP TRIGGER IF EXISTS audit_integrity_acknowledgements_no_delete ON "audit_integrity_acknowledgements";
--     DROP TRIGGER IF EXISTS audit_integrity_acknowledgements_no_update ON "audit_integrity_acknowledgements";
--     DROP FUNCTION IF EXISTS audit_integrity_acknowledgements_reject_mutation();
--     DROP TABLE IF EXISTS "audit_integrity_acknowledgements";
