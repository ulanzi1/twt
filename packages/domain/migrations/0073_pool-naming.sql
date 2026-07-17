-- Migration 0073 — pool naming (Story 7.2, Tasks 3 + 5; AC1/AC5). Two tables:
--   · pool_canonical_counters — the per-(pariwar_id, period) monotonic sequence behind the
--     canonical `P-YYYY-MM-###` allocator (the cohort_invalidation_epochs counter shape).
--   · pool_names              — the per-Pariwar curated pool-name registry (the
--     pariwar_wa_templates ordered-list shape).
-- Both tenant-isolated (ENABLE + FORCE RLS + the two tenant-isolation policies from
-- src/policies/pool-canonical-counters-rls.ts + src/policies/pool-names-rls.ts).
--
-- ⚠ pool_names SHIPS EMPTY — this migration seeds NO names, deliberately. TWT-Bihar's
-- registry is empty at launch (its pools display letter codes); the UX amendment vetoed the
-- culture-name overlay and adversarial review M-10 gates any curated seed list on a
-- religious-balance + omen-sensitivity review that has not happened. The TABLE is a
-- capability for a future tenant. See src/schema/pool_names.ts's header.
--
-- ⚠ DO NOT REGENERATE THIS FILE with `db:generate` (same discipline as 0021–0072). The
-- drizzle snapshot baseline is frozen at 0020. HAND-AUTHORED: it carries ONLY this story's
-- DDL, wrapped with the hand-supplemented GRANTs + FORCE DDL (mirrors 0071/0072).
--
-- The twt_app role already exists (migration 0002). No FKs: pariwar_id is unFK'd across the
-- pool substrate (the pre-Epic-3 posture — there is no pariwars table). No snapshot file is
-- emitted (baseline frozen at 0020; mirror 0021–0072).

CREATE TABLE "pool_canonical_counters" (
	"pariwar_id" uuid NOT NULL,
	"period" text NOT NULL,
	"next_sequence" integer DEFAULT 1 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "pool_canonical_counters_pariwar_id_period_pk" PRIMARY KEY("pariwar_id","period"),
	CONSTRAINT "pool_canonical_counters_next_sequence_positive_ck" CHECK ("pool_canonical_counters"."next_sequence" >= 1)
);
--> statement-breakpoint
-- SELECT/INSERT/UPDATE: the allocator UPSERTs this row (INSERT … ON CONFLICT DO UPDATE).
-- No DELETE — a counter is never rolled back to re-issue a sequence an audit line may
-- already cite.
GRANT SELECT, INSERT, UPDATE ON "pool_canonical_counters" TO twt_app;--> statement-breakpoint
ALTER TABLE "pool_canonical_counters" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
-- FORCE applies RLS even to the (non-superuser) table owner — kept adjacent to ENABLE.
ALTER TABLE "pool_canonical_counters" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "pool_canonical_counters_tenant_isolation_select" ON "pool_canonical_counters" AS PERMISSIVE FOR SELECT TO "twt_app" USING (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "pool_canonical_counters_tenant_isolation_write" ON "pool_canonical_counters" AS PERMISSIVE FOR ALL TO "twt_app" USING (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid) WITH CHECK (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid);--> statement-breakpoint

CREATE TABLE "pool_names" (
	"pool_name_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"pariwar_id" uuid NOT NULL,
	"position_in_ordered_list" integer NOT NULL,
	"display_name_en" text NOT NULL,
	"display_name_hi" text NOT NULL,
	"cultural_lineage_note" text,
	"approval_status" text DEFAULT 'pending' NOT NULL,
	"created_by_actor" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "pool_names_pariwar_position_uq" UNIQUE("pariwar_id","position_in_ordered_list"),
	CONSTRAINT "pool_names_approval_status_ck" CHECK ("pool_names"."approval_status" IN ('pending', 'approved', 'retired')),
	CONSTRAINT "pool_names_position_non_negative_ck" CHECK ("pool_names"."position_in_ordered_list" >= 0)
);
--> statement-breakpoint
-- SELECT/INSERT/UPDATE/DELETE: the registry is trustee-curated configuration — a name added
-- in error must be removable before it is ever reserved (unlike an audit row or a snapshot).
GRANT SELECT, INSERT, UPDATE, DELETE ON "pool_names" TO twt_app;--> statement-breakpoint
ALTER TABLE "pool_names" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "pool_names" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE INDEX "pool_names_reserve_idx" ON "pool_names" USING btree ("pariwar_id","approval_status","position_in_ordered_list");--> statement-breakpoint
CREATE POLICY "pool_names_tenant_isolation_select" ON "pool_names" AS PERMISSIVE FOR SELECT TO "twt_app" USING (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "pool_names_tenant_isolation_write" ON "pool_names" AS PERMISSIVE FOR ALL TO "twt_app" USING (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid) WITH CHECK (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid);
