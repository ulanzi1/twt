-- Migration 0087 — feature_flag_versions (Story 10.8, Task 1; AC1).
--
-- The per-cohort feature-flag primitive: immutable, versioned, tenant-scoped, audit-anchored rows.
-- Mirrors 0084's helpdesk_routing_policy_versions body (the versioned-registry half of that
-- migration), NOT its helpdesk_tickets half.
--
-- ⚠ THIS IS NOT A 6TH EVENT-DERIVED-STATE PRIMITIVE (Story 10.8 Decision 3). There is deliberately
-- NO projector-only `current_state`, NO state-writer guard trigger, and NO state-invariant CI gate
-- here. The five existing state primitives (members/claims/pools/alerts/helpdesk_tickets) each carry
-- that machinery because an EXTERNAL event stream moves their state and a writer could diverge from
-- the projector. Nothing outside the admin write path ever moves a flag: an admin authors a version
-- and the version IS the state. `state` is an authored column. Replay-safety is delivered by the
-- IMMUTABLE VERSION ROWS + the (pariwar_id, flag_key, version) pin, which is exactly what
-- architecture.md:214-216 asks for. Adding a sixth state gate here would buy no property and would
-- dilute what the five existing state gates signal.
--
-- ⚠ DO NOT REGENERATE THIS FILE with `db:generate`.
-- drizzle-kit skips an already-applied migration by journal `when` (NOT by SQL hash), and the meta/
-- snapshots stop at 0020 (0021+ are hand-authored, snapshot-absent — known drift, NOT gate-blocking).
-- A `db:generate` would diff CURRENT schema against 0020_snapshot.json and wrongly re-emit applied
-- migrations → 42P07. HAND-AUTHORED, carrying ONLY this story's DDL. No snapshot emitted. The roles
-- (twt_app / twt_service) already exist from migration 0002 — no CREATE ROLE.
--
-- ── ⚠ `pariwar_id` IS NULLABLE — the one deliberate deviation, with three forced carve-outs ────────
-- NULL = the GLOBAL flag row (the catalog default applying to every Pariwar); non-NULL = that
-- Pariwar's OVERRIDE. `flagVersionInForce` prefers an override over the global row, else the code
-- default. The three consequences below are DELIBERATE and TESTED — do not "fix" them:
--
--   (a) The SELECT policy carries an explicit `OR pariwar_id IS NULL` leg so every tenant can read
--       the global catalog. Without it the two-tier registry collapses to "override or nothing".
--       INSERT/UPDATE deliberately have NO null leg: a tenant-scoped caller may publish its own
--       override but can never author or supersede a global row (that is a service-pool/seed path).
--       An UNSET scope still reads only globals and writes nothing (Story 1.6 closed failure).
--
--   (b) The unique index is `NULLS NOT DISTINCT` (PG15+; this cluster is PG16). Under the DEFAULT
--       null-distinct semantics a unique index over (pariwar_id, flag_key, version) would place NO
--       constraint at all on global rows — every (NULL, 'k', 1) counts as distinct from every other
--       — so the 23505 that createFlagVersion's conflict detection (→ FlagVersionConflictError →
--       409) depends on would silently never fire for the global half of the table.
--
--   (c) There is NO composite self-FK on (pariwar_id, flag_key, superseded_by_version), unlike
--       0084's helpdesk_routing_policy_versions_superseded_by_fk. A composite FK is MATCH SIMPLE by
--       default, which is trivially SATISFIED whenever any referencing column is NULL — it would
--       therefore silently not apply to exactly the global half of the table. A constraint that
--       quietly covers half its rows reads as a guarantee while providing none; the append-only
--       trigger below is the real backstop, and it covers every row.
--
-- Hand-supplements (relative to what drizzle-kit would emit):
--   1. GRANT SELECT, INSERT, UPDATE to twt_app. NOT DELETE: a version row is append-only (only the
--      superseded_by_version forward-pointer is ever UPDATEd) — the flag's history is the audit
--      trail AC3/AC4 rest on, so nothing may row-delete it.
--   2. ENABLE + FORCE ROW LEVEL SECURITY (FORCE applies even to the non-superuser table owner).
--   3. The append-only immutability trigger (the clause_versions / 0084 routing-policy posture):
--      BEFORE UPDATE, RAISE if any column other than superseded_by_version changes. A comment alone
--      does not stop a buggy or malicious UPDATE from rewriting a supposedly-immutable historical
--      flag version — and "historical flag states are queryable for past evaluations"
--      (architecture.md:214-216) is only true if history cannot be rewritten.

CREATE TYPE "public"."feature_flag_state" AS ENUM('off', 'canary', 'rollout', 'full', 'rolled_back');--> statement-breakpoint
CREATE TABLE "feature_flag_versions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"flag_key" text NOT NULL,
	"pariwar_id" uuid,
	"version" integer NOT NULL,
	"cohort_definition" jsonb NOT NULL,
	"state" "feature_flag_state" NOT NULL,
	"fallback_default" boolean NOT NULL,
	"owner" text NOT NULL,
	"dead_by" timestamp with time zone NOT NULL,
	"audit_id" uuid,
	"effective_from" timestamp with time zone NOT NULL,
	"effective_until" timestamp with time zone,
	"actor_who_flipped" uuid,
	"rationale" text NOT NULL,
	"superseded_by_version" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
-- (1) Table privileges for the app role (SELECT/INSERT/UPDATE, NOT DELETE — see the header).
GRANT SELECT, INSERT, UPDATE ON "feature_flag_versions" TO twt_app;--> statement-breakpoint
-- (2) Turn RLS on, then FORCE it.
ALTER TABLE "feature_flag_versions" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "feature_flag_versions" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
-- ⚠ NULLS NOT DISTINCT — see header carve-out (b). Without it the global rows are unconstrained.
-- A UNIQUE CONSTRAINT (not the bare unique INDEX the sibling registries use) so the drizzle schema
-- declaration can express the null semantics: in drizzle 0.45 `nullsNotDistinct()` exists only on
-- the `unique()` constraint builder, and a declaration that cannot state it would misdescribe the DB.
ALTER TABLE "feature_flag_versions" ADD CONSTRAINT "feature_flag_versions_scope_key_version_uq" UNIQUE NULLS NOT DISTINCT ("pariwar_id","flag_key","version");--> statement-breakpoint
CREATE INDEX "feature_flag_versions_key_scope_effective_idx" ON "feature_flag_versions" USING btree ("flag_key","pariwar_id","effective_from");--> statement-breakpoint
-- Tenant isolation. ⚠ The SELECT leg's `OR pariwar_id IS NULL` is the deliberate global-row carve-out
-- (header (a)); INSERT/UPDATE deliberately omit it so a tenant can never author/supersede a global row.
CREATE POLICY "feature_flag_versions_tenant_isolation_select" ON "feature_flag_versions" AS PERMISSIVE FOR SELECT TO "twt_app" USING (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid OR pariwar_id IS NULL);--> statement-breakpoint
CREATE POLICY "feature_flag_versions_tenant_isolation_insert" ON "feature_flag_versions" AS PERMISSIVE FOR INSERT TO "twt_app" WITH CHECK (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "feature_flag_versions_tenant_isolation_update" ON "feature_flag_versions" AS PERMISSIVE FOR UPDATE TO "twt_app" USING (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid) WITH CHECK (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid);--> statement-breakpoint
-- (3) Append-only immutability trigger — the SOLE legitimately-mutable column on an existing row is
-- superseded_by_version (the forward-pointer). Covers EVERY row including the globals (unlike a
-- MATCH SIMPLE composite FK — header (c)).
CREATE FUNCTION feature_flag_versions_reject_mutation()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.flag_key IS DISTINCT FROM OLD.flag_key
     OR NEW.pariwar_id IS DISTINCT FROM OLD.pariwar_id
     OR NEW.version IS DISTINCT FROM OLD.version
     OR NEW.cohort_definition IS DISTINCT FROM OLD.cohort_definition
     OR NEW.state IS DISTINCT FROM OLD.state
     OR NEW.fallback_default IS DISTINCT FROM OLD.fallback_default
     OR NEW.owner IS DISTINCT FROM OLD.owner
     OR NEW.dead_by IS DISTINCT FROM OLD.dead_by
     OR NEW.audit_id IS DISTINCT FROM OLD.audit_id
     OR NEW.effective_from IS DISTINCT FROM OLD.effective_from
     OR NEW.effective_until IS DISTINCT FROM OLD.effective_until
     OR NEW.actor_who_flipped IS DISTINCT FROM OLD.actor_who_flipped
     OR NEW.rationale IS DISTINCT FROM OLD.rationale
     OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
    RAISE EXCEPTION
      'feature_flag_versions immutable-column write rejected — only superseded_by_version may be updated on an existing flag version row (Story 10.8 AC1, the clause_versions posture); attempted a change to flag_key/pariwar_id/version/cohort_definition/state/fallback_default/owner/dead_by/audit_id/effective_from/effective_until/actor_who_flipped/rationale/created_at on version % of flag "%" for pariwar %',
      OLD.version, OLD.flag_key, OLD.pariwar_id
      USING ERRCODE = 'P0001';
  END IF;
  RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER feature_flag_versions_immutability_guard
  BEFORE UPDATE ON feature_flag_versions
  FOR EACH ROW EXECUTE FUNCTION feature_flag_versions_reject_mutation();
