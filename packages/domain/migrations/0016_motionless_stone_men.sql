-- Migration 0016 — T&C version registry (terms_and_conditions_versions) + the
-- FK-enforced clause-pinning junction (terms_and_conditions_pinned_clauses) +
-- tenant-isolation RLS (Story 2.6, Task 1).
--
-- ⚠ DO NOT REGENERATE THIS FILE with `db:generate`.
-- drizzle-kit skips an already-applied migration by journal `when` (NOT by SQL
-- hash), so a regenerate-after-apply silently drops the hand-supplements and can
-- raise 42P07 on re-run. The drizzle-kit-emitted statements (CREATE TYPE
-- tc_legal_review_status + the two CREATE TABLEs + ENABLE RLS + the three FKs +
-- the indexes incl. the partial-unique `(pariwar_id) WHERE effective_until IS NULL`
-- + the four CREATE POLICY declarations from
-- packages/domain/src/policies/terms-and-conditions-{versions,pinned-clauses}-rls.ts)
-- are wrapped here with hand-supplemented GRANT + FORCE DDL that drizzle-kit does
-- not emit. Mirrors 0014/0015 (GRANT + FORCE).
--
-- Hand-supplements (relative to the generated DDL):
--   1. GRANT SELECT, INSERT, UPDATE on terms_and_conditions_versions to twt_app.
--      NOT DELETE: a version is `superseded` (status flip + effective_until), never
--      row-deleted — the superseded row stays queryable for AC8 historical
--      attestation. UPDATE is legitimate (approve flips legal_review_status + sets
--      legal_reviewer_actor_id; supersede sets effective_until). Grants only to
--      twt_app (the policies bind TO twt_app; twt_service has no policy here so a
--      grant would be inert under FORCE RLS — the 0014 rationale).
--   2. GRANT SELECT, INSERT on terms_and_conditions_pinned_clauses to twt_app.
--      NOT UPDATE/DELETE: pins are written ONCE in the same tx as the parent T&C
--      version (createTcVersion) and are immutable thereafter — 2.6 has no T&C
--      draft/edit cycle (contrast clause_drafts), so the link set is insert-only
--      (niyamavali_amendments append-only grant precedent). The FK cascade-delete
--      from a (never-deleted) parent version is owner-level, not a twt_app DELETE.
--   3. ALTER TABLE ... FORCE ROW LEVEL SECURITY on BOTH tables — applies RLS even
--      to the (non-superuser) table owner, so no future owner-run migration
--      silently reads/writes cross-tenant. ENABLE + FORCE kept adjacent.
--
-- The roles (twt_app / twt_service) already exist from migration 0002 — no CREATE
-- ROLE here. Idempotency invariant preserved: the snapshot at
-- meta/0016_snapshot.json records only the table-shape view (TYPE + TABLEs + ENABLE
-- RLS + FKs + indexes + policies); the GRANT/FORCE hand-supplements are invisible
-- to `drizzle-kit check`, matching migrations 0014/0015.

CREATE TYPE "public"."tc_legal_review_status" AS ENUM('pending', 'under-review', 'reviewed-with-changes-required', 'approved', 'superseded');--> statement-breakpoint
CREATE TABLE "terms_and_conditions_versions" (
	"tc_version_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"pariwar_id" uuid NOT NULL,
	"version" integer NOT NULL,
	"body_markdown" text NOT NULL,
	"body_html_rendered" text NOT NULL,
	"effective_from" timestamp with time zone NOT NULL,
	"effective_until" timestamp with time zone,
	"legal_review_status" "tc_legal_review_status" DEFAULT 'pending' NOT NULL,
	"legal_reviewer_actor_id" uuid,
	"authored_by_actor" uuid,
	"authored_at" timestamp with time zone DEFAULT now() NOT NULL,
	"audit_id" uuid,
	CONSTRAINT "terms_and_conditions_versions_version_positive" CHECK ("terms_and_conditions_versions"."version" >= 1)
);
--> statement-breakpoint
-- (1) Table privileges for the app role on terms_and_conditions_versions
-- (SELECT/INSERT/UPDATE, NOT DELETE — a version is superseded, never row-deleted).
GRANT SELECT, INSERT, UPDATE ON "terms_and_conditions_versions" TO twt_app;--> statement-breakpoint
-- drizzle-kit-emitted: turn RLS on for terms_and_conditions_versions.
ALTER TABLE "terms_and_conditions_versions" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
-- (3) FORCE applies RLS even to the (non-superuser) table owner — kept adjacent to ENABLE.
ALTER TABLE "terms_and_conditions_versions" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "terms_and_conditions_pinned_clauses" (
	"tc_version_id" uuid NOT NULL,
	"clause_version_id" uuid NOT NULL,
	"pariwar_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "terms_and_conditions_pinned_clauses_tc_version_id_clause_version_id_pk" PRIMARY KEY("tc_version_id","clause_version_id")
);
--> statement-breakpoint
-- (2) Table privileges for the app role on terms_and_conditions_pinned_clauses
-- (SELECT/INSERT only — pins are written once with the parent version, immutable thereafter).
GRANT SELECT, INSERT ON "terms_and_conditions_pinned_clauses" TO twt_app;--> statement-breakpoint
-- drizzle-kit-emitted: turn RLS on for terms_and_conditions_pinned_clauses.
ALTER TABLE "terms_and_conditions_pinned_clauses" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
-- (3) FORCE applies RLS even to the (non-superuser) table owner.
ALTER TABLE "terms_and_conditions_pinned_clauses" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "terms_and_conditions_versions" ADD CONSTRAINT "terms_and_conditions_versions_audit_id_audit_log_entries_audit_id_fk" FOREIGN KEY ("audit_id") REFERENCES "public"."audit_log_entries"("audit_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "terms_and_conditions_pinned_clauses" ADD CONSTRAINT "terms_and_conditions_pinned_clauses_tc_version_id_terms_and_conditions_versions_tc_version_id_fk" FOREIGN KEY ("tc_version_id") REFERENCES "public"."terms_and_conditions_versions"("tc_version_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "terms_and_conditions_pinned_clauses" ADD CONSTRAINT "terms_and_conditions_pinned_clauses_clause_version_id_clause_versions_clause_version_id_fk" FOREIGN KEY ("clause_version_id") REFERENCES "public"."clause_versions"("clause_version_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "terms_and_conditions_versions_pariwar_version_uq" ON "terms_and_conditions_versions" USING btree ("pariwar_id","version");--> statement-breakpoint
CREATE INDEX "terms_and_conditions_versions_pariwar_effective_from_desc_idx" ON "terms_and_conditions_versions" USING btree ("pariwar_id","effective_from" DESC NULLS LAST);--> statement-breakpoint
CREATE UNIQUE INDEX "terms_and_conditions_versions_pariwar_current_uq" ON "terms_and_conditions_versions" USING btree ("pariwar_id") WHERE effective_until IS NULL;--> statement-breakpoint
CREATE INDEX "terms_and_conditions_pinned_clauses_pariwar_tc_idx" ON "terms_and_conditions_pinned_clauses" USING btree ("pariwar_id","tc_version_id");--> statement-breakpoint
CREATE POLICY "terms_and_conditions_versions_tenant_isolation_select" ON "terms_and_conditions_versions" AS PERMISSIVE FOR SELECT TO "twt_app" USING (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "terms_and_conditions_versions_tenant_isolation_write" ON "terms_and_conditions_versions" AS PERMISSIVE FOR ALL TO "twt_app" USING (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid) WITH CHECK (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "terms_and_conditions_pinned_clauses_tenant_isolation_select" ON "terms_and_conditions_pinned_clauses" AS PERMISSIVE FOR SELECT TO "twt_app" USING (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "terms_and_conditions_pinned_clauses_tenant_isolation_write" ON "terms_and_conditions_pinned_clauses" AS PERMISSIVE FOR ALL TO "twt_app" USING (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid) WITH CHECK (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid);
