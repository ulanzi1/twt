-- Migration 0072 — pool_snapshots table (the HOT snapshot tier) + tenant-isolation RLS
-- (Story 7.1, Task 6; AC3). A SEPARATE migration from 0071 (pools): 0071 was already
-- applied, so per the never-regenerate-an-applied-migration discipline the hot-snapshot
-- table lands in its own file (the Epic-6 0063→0067 multi-migration-per-story precedent).
--
-- ⚠ DO NOT REGENERATE THIS FILE with `db:generate` (same discipline as 0021–0071). The
-- drizzle snapshot baseline is frozen at 0020. HAND-AUTHORED: it carries ONLY the
-- pool_snapshots DDL (the CREATE TABLE + the FK to pools + ENABLE/FORCE RLS + the two
-- indexes + the two CREATE POLICY declarations from
-- packages/domain/src/policies/pool-snapshots-rls.ts), wrapped with the hand-supplemented
-- GRANT (SELECT/INSERT, NOT UPDATE/DELETE — a snapshot row is immutable append-only) +
-- FORCE DDL (mirrors 0071). NO write-rejection trigger — this is a plain append table,
-- not an event-derived state cache.
--
-- The pools table + roles (twt_app) already exist (migrations 0071 / 0002). The FK is
-- emitted inline. No snapshot file is emitted (baseline frozen at 0020; mirror 0021–0071).

CREATE TABLE "pool_snapshots" (
	"snapshot_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"pool_id" uuid NOT NULL,
	"pariwar_id" uuid NOT NULL,
	"format_version" integer NOT NULL,
	"schema_version" text NOT NULL,
	"integrity_hash" text NOT NULL,
	"state_event_version" bigint NOT NULL,
	"snapshot" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "pool_snapshots_pool_id_pools_pool_id_fk" FOREIGN KEY ("pool_id") REFERENCES "public"."pools"("pool_id") ON DELETE no action ON UPDATE no action
);
--> statement-breakpoint
-- Table privileges for the app role on pool_snapshots (SELECT/INSERT — a snapshot row is
-- immutable append-only history; never UPDATEd or row-deleted by the app. Retention/GC of
-- rows older than 12–18 months is a future infra/jobs concern via the service role).
GRANT SELECT, INSERT ON "pool_snapshots" TO twt_app;--> statement-breakpoint
ALTER TABLE "pool_snapshots" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
-- FORCE applies RLS even to the (non-superuser) table owner — kept adjacent to ENABLE.
ALTER TABLE "pool_snapshots" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE INDEX "pool_snapshots_pariwar_id_idx" ON "pool_snapshots" USING btree ("pariwar_id");--> statement-breakpoint
CREATE INDEX "pool_snapshots_pool_id_created_at_idx" ON "pool_snapshots" USING btree ("pool_id","created_at" DESC);--> statement-breakpoint
CREATE POLICY "pool_snapshots_tenant_isolation_select" ON "pool_snapshots" AS PERMISSIVE FOR SELECT TO "twt_app" USING (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "pool_snapshots_tenant_isolation_write" ON "pool_snapshots" AS PERMISSIVE FOR ALL TO "twt_app" USING (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid) WITH CHECK (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid);
