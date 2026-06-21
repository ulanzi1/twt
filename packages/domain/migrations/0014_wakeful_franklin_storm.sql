-- Migration 0014 — Niyamavali rule registry: clause_versions + niyamavali_amendments
-- + tenant-isolation RLS + the amendments append-only triggers (Story 2.3).
--
-- ⚠ DO NOT REGENERATE THIS FILE with `db:generate`.
-- The drizzle-kit-emitted statements (CREATE TYPE benefit_mechanism + the two
-- CREATE TABLEs + ENABLE ROW LEVEL SECURITY + the FK constraints + the indexes +
-- the four CREATE POLICY declarations from
-- packages/domain/src/policies/{clause-versions,niyamavali-amendments}-rls.ts) are
-- wrapped here with hand-supplemented GRANT + FORCE + append-only-trigger DDL that
-- drizzle-kit does not emit. Mirrors migrations 0002_events-log-rls.sql (GRANT +
-- FORCE) and 0001_events-log.sql (append-only triggers).
--
-- Hand-supplements (relative to the generated DDL):
--   1. GRANT SELECT, INSERT, UPDATE on clause_versions to twt_app. NOT DELETE:
--      registry rows are never deleted — amendments INSERT a new version and the
--      only UPDATEs touch superseded_by_version / deprecated_at (the two
--      legitimately-mutable columns). Grants only to twt_app (the policies bind
--      TO twt_app; twt_service has no policy here so a grant would be inert under
--      FORCE RLS — the pariwar_passport 0003 rationale).
--   2. GRANT SELECT, INSERT on niyamavali_amendments to twt_app. NOT UPDATE/DELETE:
--      the amendment ledger is FULLY append-only (events_log precedent).
--   3. ALTER TABLE ... FORCE ROW LEVEL SECURITY on BOTH tables — applies RLS even
--      to the (non-superuser) table owner, so no future owner-run migration
--      silently reads/writes cross-tenant. ENABLE + FORCE kept adjacent.
--   4. niyamavali_amendments append-only triggers (BEFORE UPDATE/DELETE/TRUNCATE
--      → RAISE) — the events_log 0001 precedent. clause_versions is NOT fully
--      append-only (superseded_by_version + deprecated_at are mutable), so it gets
--      NO block-all trigger here; historical immutability of payload/clause_id/
--      version is enforced at the domain layer for 2.3 (a column-restricted
--      trigger is deferred to Story 2.4 — deferred-work.md).
--
-- The roles (twt_app / twt_service) already exist from migration 0002 — no
-- CREATE ROLE here. Idempotency invariant preserved: the snapshot at
-- meta/0014_snapshot.json records only the table-shape view (TYPE + TABLEs +
-- ENABLE RLS + FKs + indexes + policies); the GRANT/FORCE/trigger hand-
-- supplements are invisible to `drizzle-kit check`, matching migrations 0001/0002/0003.

CREATE TYPE "public"."benefit_mechanism" AS ENUM('pool', 'reserve');--> statement-breakpoint
CREATE TABLE "clause_versions" (
	"clause_version_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"clause_id" text NOT NULL,
	"pariwar_id" uuid NOT NULL,
	"version" integer NOT NULL,
	"effective_date" timestamp with time zone NOT NULL,
	"payload" jsonb NOT NULL,
	"benefit_mechanism" "benefit_mechanism" NOT NULL,
	"predecessor_clause_ids" text[] DEFAULT '{}' NOT NULL,
	"superseded_by_version" uuid,
	"deprecated_at" timestamp with time zone,
	"authored_by_actor" uuid,
	"authored_at" timestamp with time zone DEFAULT now() NOT NULL,
	"audit_id" uuid,
	CONSTRAINT "clause_versions_version_positive" CHECK ("clause_versions"."version" >= 1)
);
--> statement-breakpoint
-- (1) Table privileges for the app role on clause_versions (SELECT/INSERT/UPDATE,
-- NOT DELETE — registry rows are never deleted).
GRANT SELECT, INSERT, UPDATE ON "clause_versions" TO twt_app;--> statement-breakpoint
-- drizzle-kit-emitted: turn RLS on for clause_versions.
ALTER TABLE "clause_versions" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
-- (3) FORCE applies RLS even to the (non-superuser) table owner — kept adjacent to ENABLE.
ALTER TABLE "clause_versions" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "niyamavali_amendments" (
	"amendment_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"pariwar_id" uuid NOT NULL,
	"from_clause_version_id" uuid NOT NULL,
	"to_clause_version_id" uuid NOT NULL,
	"diff_document" jsonb NOT NULL,
	"affected_member_scope" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"audit_id" uuid
);
--> statement-breakpoint
-- (2) Table privileges for the app role on niyamavali_amendments (SELECT/INSERT
-- only — the ledger is fully append-only).
GRANT SELECT, INSERT ON "niyamavali_amendments" TO twt_app;--> statement-breakpoint
-- drizzle-kit-emitted: turn RLS on for niyamavali_amendments.
ALTER TABLE "niyamavali_amendments" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
-- (3) FORCE applies RLS even to the (non-superuser) table owner.
ALTER TABLE "niyamavali_amendments" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "clause_versions" ADD CONSTRAINT "clause_versions_superseded_by_version_clause_versions_clause_version_id_fk" FOREIGN KEY ("superseded_by_version") REFERENCES "public"."clause_versions"("clause_version_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "clause_versions" ADD CONSTRAINT "clause_versions_audit_id_audit_log_entries_audit_id_fk" FOREIGN KEY ("audit_id") REFERENCES "public"."audit_log_entries"("audit_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "niyamavali_amendments" ADD CONSTRAINT "niyamavali_amendments_from_clause_version_id_clause_versions_clause_version_id_fk" FOREIGN KEY ("from_clause_version_id") REFERENCES "public"."clause_versions"("clause_version_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "niyamavali_amendments" ADD CONSTRAINT "niyamavali_amendments_to_clause_version_id_clause_versions_clause_version_id_fk" FOREIGN KEY ("to_clause_version_id") REFERENCES "public"."clause_versions"("clause_version_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "niyamavali_amendments" ADD CONSTRAINT "niyamavali_amendments_audit_id_audit_log_entries_audit_id_fk" FOREIGN KEY ("audit_id") REFERENCES "public"."audit_log_entries"("audit_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "clause_versions_pariwar_clause_version_uq" ON "clause_versions" USING btree ("pariwar_id","clause_id","version");--> statement-breakpoint
CREATE INDEX "clause_versions_pariwar_clause_version_desc_idx" ON "clause_versions" USING btree ("pariwar_id","clause_id","version" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "clause_versions_pariwar_effective_date_idx" ON "clause_versions" USING btree ("pariwar_id","effective_date");--> statement-breakpoint
CREATE INDEX "niyamavali_amendments_pariwar_from_idx" ON "niyamavali_amendments" USING btree ("pariwar_id","from_clause_version_id");--> statement-breakpoint
CREATE INDEX "niyamavali_amendments_pariwar_to_idx" ON "niyamavali_amendments" USING btree ("pariwar_id","to_clause_version_id");--> statement-breakpoint
CREATE POLICY "clause_versions_tenant_isolation_select" ON "clause_versions" AS PERMISSIVE FOR SELECT TO "twt_app" USING (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "clause_versions_tenant_isolation_write" ON "clause_versions" AS PERMISSIVE FOR ALL TO "twt_app" USING (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid) WITH CHECK (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "niyamavali_amendments_tenant_isolation_select" ON "niyamavali_amendments" AS PERMISSIVE FOR SELECT TO "twt_app" USING (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "niyamavali_amendments_tenant_isolation_write" ON "niyamavali_amendments" AS PERMISSIVE FOR ALL TO "twt_app" USING (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid) WITH CHECK (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid);--> statement-breakpoint
-- (4) niyamavali_amendments append-only enforcement — the amendment ledger is
-- immutable (append-only diff records). Mirrors events_log 0001: a new amendment
-- is a NEW row; existing rows are NEVER mutated. Structural enforcement at the DB
-- layer — the @twt/domain write path provides no UPDATE/DELETE on this table.
CREATE FUNCTION niyamavali_amendments_reject_mutation()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION
    'niyamavali_amendments is append-only — amendments are immutable diff records (Story 2.3 AC4)'
    USING ERRCODE = 'integrity_constraint_violation';
END;
$$;--> statement-breakpoint
CREATE TRIGGER niyamavali_amendments_no_update
  BEFORE UPDATE ON niyamavali_amendments
  FOR EACH ROW EXECUTE FUNCTION niyamavali_amendments_reject_mutation();--> statement-breakpoint
CREATE TRIGGER niyamavali_amendments_no_delete
  BEFORE DELETE ON niyamavali_amendments
  FOR EACH ROW EXECUTE FUNCTION niyamavali_amendments_reject_mutation();--> statement-breakpoint
CREATE TRIGGER niyamavali_amendments_no_truncate
  BEFORE TRUNCATE ON niyamavali_amendments
  EXECUTE FUNCTION niyamavali_amendments_reject_mutation();
