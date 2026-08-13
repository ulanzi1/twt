-- Migration 0101 — geo_tree_versions (Story 1.18, Task 3; AC1, AC7).
--
-- ⚠ DO NOT REGENERATE with `db:generate` (same discipline as 0021–0100): the drizzle snapshot
-- baseline is frozen at 0020, so a regenerate emits a bloated catch-up migration and can raise
-- 42P07. This file is HAND-AUTHORED, carrying ONLY this one new table. No snapshot file is emitted.
--
-- ── WHAT THIS TABLE IS ─────────────────────────────────────────────────────────────────────────
-- The versioned per-Pariwar organizational-tree registry behind `rbac.scopeContains`' injectable
-- geo-tree resolver seam — the seam ADR-0008 Decision 4 committed and deferred to "Epic 3", a
-- deferral that expired unowned for seven epics. Mirrors 0084's helpdesk_routing_policy_versions
-- exactly: table + GRANT + ENABLE/FORCE RLS + indexes + composite self-FK + CREATE POLICY (from
-- policies/geo-tree-versions-rls.ts) + the append-only immutability trigger.
--
-- ── ⭐ THERE IS NO CODE DEFAULT, AND NO SEED ROW IS INSERTED HERE ───────────────────────────────
-- Unlike routing policy (whose version 1 is a code constant), there is NO default geography
-- (ADR-0038 / Decision 2026-08-12-102). This migration creates an EMPTY table on purpose. A Pariwar
-- with no row has NO tree: the loader returns null, no resolver is passed, and
-- `denyDeeperGeoResolver` applies. ⇒ APPLYING THIS MIGRATION CHANGES NO AUTHORIZATION OUTCOME
-- ANYWHERE. Behaviour changes only when a Pariwar publishes a tree, which is a deliberate act that
-- WIDENS authorization (a Pariwar publishing `Patna ∈ Bihar` thereby lets every `state=Bihar` grant
-- reach Patna-scoped targets). A wrong tree silently GRANTS; an absent tree merely denies. Do not
-- "helpfully" seed a geography in a future migration.
--
-- ── ⛔ THIS TABLE IS AN AUTHORIZATION INPUT, NOT REFERENCE DATA ─────────────────────────────────
-- A leaked org tree is a leaked authorization input, so it carries the same tenant isolation as
-- role_grants and joins the adversarial cross-Pariwar must-return-0 set. NOT cross-readable: each
-- Pariwar owns its own subtree (GEO_RANK puts `pariwar` ABOVE `state` — the Pariwar is the tenant,
-- the geography sits inside it), so there is no cross-tenant sentinel row to carve out.
--
-- ── The two constraints worth stating explicitly ────────────────────────────────────────────────
--   1. NO DELETE grant. The table is append-only-by-design (the clause_versions immutability
--      posture); a DELETE would break the superseded_by_version supersession chain.
--   2. The append-only trigger: BEFORE UPDATE, RAISEs if any column other than
--      superseded_by_version changes. A comment alone doesn't stop a buggy or malicious UPDATE from
--      rewriting a supposedly-immutable historical tree version — and rewriting one silently
--      re-decides past authorization questions. This is the DB-level backstop.

CREATE TABLE "geo_tree_versions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"pariwar_id" uuid NOT NULL,
	"version" integer NOT NULL,
	"effective_at" timestamp with time zone NOT NULL,
	"tree_document" jsonb NOT NULL,
	"authored_by_actor" uuid,
	"audit_id" uuid,
	"superseded_by_version" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
-- (1) Table privileges for the app role (SELECT/INSERT/UPDATE, NOT DELETE — see the header).
GRANT SELECT, INSERT, UPDATE ON "geo_tree_versions" TO twt_app;--> statement-breakpoint
-- (2) Turn RLS on, then FORCE it (applies even to the non-superuser table owner).
ALTER TABLE "geo_tree_versions" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "geo_tree_versions" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE UNIQUE INDEX "geo_tree_versions_pariwar_version_uq" ON "geo_tree_versions" USING btree ("pariwar_id","version");--> statement-breakpoint
CREATE INDEX "geo_tree_versions_pariwar_effective_idx" ON "geo_tree_versions" USING btree ("pariwar_id","effective_at");--> statement-breakpoint
-- (3) The supersession forward-pointer can only ever point at a version that really exists for the
-- SAME Pariwar (composite FK against the unique index above). Safe given the write order
-- (geo-tree/registry.ts createGeoTreeVersion): the new version row is INSERTed first, THEN the
-- prior row's superseded_by_version is UPDATEd to point at it — the referenced row already exists.
ALTER TABLE "geo_tree_versions"
  ADD CONSTRAINT "geo_tree_versions_superseded_by_fk"
  FOREIGN KEY ("pariwar_id", "superseded_by_version")
  REFERENCES "geo_tree_versions" ("pariwar_id", "version");--> statement-breakpoint
-- (4) Tenant isolation (from policies/geo-tree-versions-rls.ts). No DELETE policy — see (1).
CREATE POLICY "geo_tree_versions_tenant_isolation_select" ON "geo_tree_versions" AS PERMISSIVE FOR SELECT TO "twt_app" USING (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "geo_tree_versions_tenant_isolation_insert" ON "geo_tree_versions" AS PERMISSIVE FOR INSERT TO "twt_app" WITH CHECK (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "geo_tree_versions_tenant_isolation_update" ON "geo_tree_versions" AS PERMISSIVE FOR UPDATE TO "twt_app" USING (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid) WITH CHECK (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid);--> statement-breakpoint
-- (5) The append-only immutability trigger — the clause_versions posture, and the
-- helpdesk_routing_policy_versions_reject_mutation twin. A tree version row is INSERT-only; the
-- SOLE legitimately-mutable column on an existing row is superseded_by_version (the
-- forward-pointer). Rewriting a historical tree_document would silently re-decide past
-- authorization questions, which is why this is a DB-level backstop and not a code convention.
CREATE FUNCTION geo_tree_versions_reject_mutation()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.id IS DISTINCT FROM OLD.id
     OR NEW.pariwar_id IS DISTINCT FROM OLD.pariwar_id
     OR NEW.version IS DISTINCT FROM OLD.version
     OR NEW.effective_at IS DISTINCT FROM OLD.effective_at
     OR NEW.tree_document IS DISTINCT FROM OLD.tree_document
     OR NEW.authored_by_actor IS DISTINCT FROM OLD.authored_by_actor
     OR NEW.audit_id IS DISTINCT FROM OLD.audit_id
     OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
    RAISE EXCEPTION
      'geo_tree_versions immutable-column write rejected — only superseded_by_version may be updated on an existing version row (Story 1.18 AC1, the clause_versions posture); attempted a change to id/pariwar_id/version/effective_at/tree_document/authored_by_actor/audit_id/created_at on version % for pariwar %',
      OLD.version, OLD.pariwar_id
      USING ERRCODE = 'P0001';
  END IF;
  RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER geo_tree_versions_immutability_guard
  BEFORE UPDATE ON geo_tree_versions
  FOR EACH ROW EXECUTE FUNCTION geo_tree_versions_reject_mutation();
