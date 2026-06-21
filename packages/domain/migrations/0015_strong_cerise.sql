-- Migration 0015 — Niyamavali draft store (clause_drafts) + tenant-isolation RLS
-- + the deferred Story 2.3→2.4 migration items (AC7 immutability trigger, AC8 De2
-- cross-tenant amendment guard, AC8 De4 list index) (Story 2.4, Task 1).
--
-- ⚠ DO NOT REGENERATE THIS FILE with `db:generate`.
-- drizzle-kit skips an already-applied migration by journal `when` (NOT by SQL
-- hash), so a regenerate-after-apply silently drops the hand-supplements and can
-- raise 42P07 on re-run. The drizzle-kit-emitted statements (the two CREATE TYPEs
-- + CREATE TABLE clause_drafts + ENABLE RLS + FK + the three indexes incl. the
-- partial-unique + the two CREATE POLICY declarations from
-- packages/domain/src/policies/clause-drafts-rls.ts) are wrapped here with
-- hand-supplemented GRANT + FORCE DDL + the deferred triggers/index that
-- drizzle-kit does not emit. Mirrors 0014 (GRANT + FORCE) and 0001 (trigger DDL).
--
-- Hand-supplements (relative to the generated DDL):
--   1. GRANT SELECT, INSERT, UPDATE on clause_drafts to twt_app. NOT DELETE: a
--      draft is `discarded` via a status transition, never row-deleted (the
--      lifecycle is auditable; the published draft is the historical record).
--      Grants only to twt_app (the policies bind TO twt_app; twt_service has no
--      policy here so a grant would be inert under FORCE RLS — the 0014 rationale).
--   2. ALTER TABLE clause_drafts FORCE ROW LEVEL SECURITY — applies RLS even to the
--      (non-superuser) table owner, so no future owner-run migration silently
--      reads/writes cross-tenant. ENABLE + FORCE kept adjacent.
--   3. (AC7) clause_versions BEFORE UPDATE column-restricted immutability trigger:
--      rejects any UPDATE that changes payload / clause_id / version (the three
--      historically-immutable columns), while ALLOWING UPDATE of
--      superseded_by_version / deprecated_at / audit_id (the legitimately-mutable
--      columns — amendClause points the prior row forward; the publish path back-
--      fills audit_id; deprecateClause stamps deprecated_at). Story 2.3 deferred
--      this to "when the audited write path is established" — that path is 2.4.
--      [deferred-work.md L32; 2.3 §"clause_versions is NOT fully append-only"]
--   4. (AC8 De2) niyamavali_amendments BEFORE INSERT cross-tenant guard: rejects an
--      amendment whose pariwar_id ≠ the pariwar_id of its FK'd from/to
--      clause_versions rows. SECURITY INVOKER (default): under the legitimate
--      scoped write path the referenced rows are same-tenant + visible, so the
--      guard confirms the match; a direct-SQL cross-tenant attempt observed from a
--      RLS-bypassing context (superuser / the De2 test) reads the true mismatching
--      pariwar_id and is rejected. The guard SKIPS the not-visible case (NULL) so a
--      genuinely non-existent reference falls through to the FK constraint (23503)
--      rather than this trigger — preserving the 2.3 FK-integrity test contract.
--      [deferred-work.md L10]
--   5. (AC8 De4) niyamavali_amendments (pariwar_id, created_at) index — supports the
--      time-ordered list-amendments read the 2.4 admin surface adds. [deferred-work.md L12]
--
-- The roles (twt_app / twt_service) already exist from migration 0002 — no CREATE
-- ROLE here. Idempotency invariant preserved: the snapshot at
-- meta/0015_snapshot.json records only the table-shape view (TYPEs + TABLE + ENABLE
-- RLS + FK + indexes + policies); the GRANT/FORCE/trigger hand-supplements are
-- invisible to `drizzle-kit check`, matching 0001/0002/0014.

CREATE TYPE "public"."clause_draft_operation" AS ENUM('create', 'amend');--> statement-breakpoint
CREATE TYPE "public"."clause_draft_status" AS ENUM('draft', 'in_review', 'signed_off', 'published', 'discarded');--> statement-breakpoint
CREATE TABLE "clause_drafts" (
	"draft_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"pariwar_id" uuid NOT NULL,
	"clause_id" text NOT NULL,
	"operation" "clause_draft_operation" NOT NULL,
	"payload" jsonb NOT NULL,
	"effective_date" timestamp with time zone NOT NULL,
	"benefit_mechanism" "benefit_mechanism" NOT NULL,
	"affected_member_scope" jsonb,
	"status" "clause_draft_status" DEFAULT 'draft' NOT NULL,
	"authored_by_actor" uuid NOT NULL,
	"tone_reviewed_by" uuid,
	"tone_reviewed_at" timestamp with time zone,
	"tone_review_content_hash" text,
	"published_clause_version_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"audit_id" uuid
);
--> statement-breakpoint
-- (1) Table privileges for the app role on clause_drafts (SELECT/INSERT/UPDATE,
-- NOT DELETE — a draft is discarded via a status transition, never row-deleted).
GRANT SELECT, INSERT, UPDATE ON "clause_drafts" TO twt_app;--> statement-breakpoint
-- drizzle-kit-emitted: turn RLS on for clause_drafts.
ALTER TABLE "clause_drafts" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
-- (2) FORCE applies RLS even to the (non-superuser) table owner — kept adjacent to ENABLE.
ALTER TABLE "clause_drafts" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "clause_drafts" ADD CONSTRAINT "clause_drafts_audit_id_audit_log_entries_audit_id_fk" FOREIGN KEY ("audit_id") REFERENCES "public"."audit_log_entries"("audit_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "clause_drafts_pariwar_status_idx" ON "clause_drafts" USING btree ("pariwar_id","status");--> statement-breakpoint
CREATE INDEX "clause_drafts_pariwar_clause_idx" ON "clause_drafts" USING btree ("pariwar_id","clause_id");--> statement-breakpoint
CREATE UNIQUE INDEX "clause_drafts_pariwar_clause_open_uq" ON "clause_drafts" USING btree ("pariwar_id","clause_id") WHERE status IN ('draft', 'in_review', 'signed_off');--> statement-breakpoint
CREATE POLICY "clause_drafts_tenant_isolation_select" ON "clause_drafts" AS PERMISSIVE FOR SELECT TO "twt_app" USING (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "clause_drafts_tenant_isolation_write" ON "clause_drafts" AS PERMISSIVE FOR ALL TO "twt_app" USING (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid) WITH CHECK (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid);--> statement-breakpoint
-- (3) AC7 — clause_versions column-restricted immutability trigger (deferred from
-- Story 2.3). payload / clause_id / version are historically immutable; amendments
-- INSERT a new version row instead of mutating one. superseded_by_version /
-- deprecated_at / audit_id remain mutable (the legitimate UPDATE columns).
CREATE FUNCTION clause_versions_reject_immutable_update()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.payload IS DISTINCT FROM OLD.payload
     OR NEW.clause_id IS DISTINCT FROM OLD.clause_id
     OR NEW.version IS DISTINCT FROM OLD.version THEN
    RAISE EXCEPTION
      'clause_versions.payload / clause_id / version are immutable — amendments INSERT a new version (Story 2.4 AC7)'
      USING ERRCODE = 'integrity_constraint_violation';
  END IF;
  RETURN NEW;
END;
$$;--> statement-breakpoint
CREATE TRIGGER clause_versions_no_immutable_update
  BEFORE UPDATE ON clause_versions
  FOR EACH ROW EXECUTE FUNCTION clause_versions_reject_immutable_update();--> statement-breakpoint
-- (4) AC8 De2 — niyamavali_amendments cross-tenant guard (deferred from Story 2.3).
-- An amendment's pariwar_id must match the pariwar_id of the clause_versions rows
-- it links. The guard skips the not-visible case (NULL) so a non-existent reference
-- falls through to the FK constraint (23503), preserving the 2.3 FK-integrity test.
CREATE FUNCTION niyamavali_amendments_assert_same_tenant()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  from_pariwar uuid;
  to_pariwar uuid;
BEGIN
  SELECT pariwar_id INTO from_pariwar FROM clause_versions WHERE clause_version_id = NEW.from_clause_version_id;
  SELECT pariwar_id INTO to_pariwar FROM clause_versions WHERE clause_version_id = NEW.to_clause_version_id;
  IF (from_pariwar IS NOT NULL AND from_pariwar <> NEW.pariwar_id)
     OR (to_pariwar IS NOT NULL AND to_pariwar <> NEW.pariwar_id) THEN
    RAISE EXCEPTION
      'niyamavali_amendments.pariwar_id must match the pariwar_id of its from/to clause_versions (Story 2.4 AC8 De2 cross-tenant guard)'
      USING ERRCODE = 'integrity_constraint_violation';
  END IF;
  RETURN NEW;
END;
$$;--> statement-breakpoint
CREATE TRIGGER niyamavali_amendments_assert_same_tenant_insert
  BEFORE INSERT ON niyamavali_amendments
  FOR EACH ROW EXECUTE FUNCTION niyamavali_amendments_assert_same_tenant();--> statement-breakpoint
-- (5) AC8 De4 — time-ordered list-amendments index (deferred from Story 2.3).
CREATE INDEX "niyamavali_amendments_pariwar_created_at_idx" ON "niyamavali_amendments" USING btree ("pariwar_id","created_at");
