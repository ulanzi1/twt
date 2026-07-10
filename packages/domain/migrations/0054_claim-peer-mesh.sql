-- Migration 0054 — claim peer-mesh: deterministic 5-nearest selection + ping intents (Story 6.6, Task 3).
-- TWO NET-NEW tables + one NEW enum + tenant-isolation RLS, in ONE hand-authored file:
--   · claim_peer_mesh_selections — ONE row per claim (the audit-replay source: the frozen
--     candidate snapshot + the ordered 5 output ids + the metric identity). Immutable
--     selection, mutable disposition (only `outcome` / `response_window_expires_at` / `skip_reason`).
--   · claim_peer_mesh_pings — ONE delivery-neutral ping intent per selected member
--     (Decision D1: recorded, NOT dispatched — no dispatch-status columns; the
--     dispatch-composition story adds those via its own migration when it wires fan-out).
--
-- Amended post-review (code review of 6.6, 2026-07-10, before merge — file still hand-edited
-- in place, NOT regenerated): added `deceased_district` / `deceased_created_at` (persist the
-- comparator's deceased-side reference point for AC2/AC5 byte-identical replay — was
-- previously re-derived live at replay time) + a `selected_member_ids` cardinality CHECK
-- (<=5; 0 is legal — the zero-candidate disposition persists an empty selection).
--
-- ⚠ DO NOT REGENERATE THIS FILE with `db:generate` (same discipline as 0051/0052/0053): the
-- drizzle snapshot baseline is frozen at 0020, so a regenerate emits a bloated catch-up
-- migration and drizzle-kit skips an already-applied migration by journal `when` (NOT SQL
-- hash), silently dropping the hand-supplements + risking 42P07 on re-run. HAND-AUTHORED:
-- carries ONLY the peer-mesh DDL (the CREATE TYPE enum + the two CREATE TABLEs + the two FKs
-- + ENABLE/FORCE RLS + the indexes + the four CREATE POLICY declarations from
-- packages/domain/src/policies/claim-peer-mesh-selections-rls.ts), wrapped with the
-- hand-supplemented GRANT (SELECT/INSERT/UPDATE, NOT DELETE) + FORCE DDL (mirrors 0051/0052/0053).
--
-- Hand-supplements (relative to a generated DDL):
--   1. GRANT SELECT, INSERT, UPDATE on both tables to twt_app.
--      NOT DELETE: a selection is an immutable audit record; the window-expiry job + operator
--      only UPDATE `outcome` / `response_window_expires_at` / `skip_reason`. A ping intent is
--      likewise retained (the dispatch-composition story reads it). Row purge is a future concern.
--   2. ALTER TABLE ... FORCE ROW LEVEL SECURITY — applies RLS even to the (non-superuser)
--      table owner. ENABLE + FORCE kept adjacent (mirror 0051/0052/0053).
--
-- ⚠ NO claims.current_state-style write-rejection trigger here: neither table is an
-- event-sourced state cache — `outcome` is an ordinary tenant-isolated column. The claim's
-- own lifecycle state stays trigger-guarded on `claims.current_state` (migration 0051); the
-- select job advances it ONLY via `claim.projectClaimState` (`claim.peer_mesh_pinged`),
-- never by writing these tables.
--
-- The claims table + roles (twt_app) already exist (migrations 0051 / 0002). The FKs
-- (claim_peer_mesh_selections.claim_case_id → claims; claim_peer_mesh_pings.selection_id →
-- claim_peer_mesh_selections; both ON DELETE CASCADE) are emitted inline. No snapshot file
-- is emitted (baseline frozen at 0020; mirror 0021–0053).

CREATE TYPE "public"."peer_mesh_outcome" AS ENUM('pending', 'sufficient', 'insufficient_responses_fallback', 'skipped');--> statement-breakpoint
CREATE TABLE "claim_peer_mesh_selections" (
	"selection_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"claim_case_id" uuid NOT NULL,
	"pariwar_id" uuid NOT NULL,
	"deceased_member_id" uuid NOT NULL,
	"deceased_district" text,
	"deceased_created_at" timestamp with time zone NOT NULL,
	"metric_id" text NOT NULL,
	"metric_version" integer NOT NULL,
	"selected_member_ids" uuid[] NOT NULL,
	"candidate_snapshot" jsonb NOT NULL,
	"response_window_expires_at" timestamp with time zone NOT NULL,
	"outcome" "peer_mesh_outcome" DEFAULT 'pending' NOT NULL,
	"skip_reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "claim_peer_mesh_selections_claim_case_id_uq" UNIQUE("claim_case_id"),
	CONSTRAINT "claim_peer_mesh_selections_selected_member_ids_max5" CHECK (cardinality("selected_member_ids") <= 5)
);
--> statement-breakpoint
CREATE TABLE "claim_peer_mesh_pings" (
	"ping_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"selection_id" uuid NOT NULL,
	"pariwar_id" uuid NOT NULL,
	"member_id" uuid NOT NULL,
	"message_key" text DEFAULT 'peer_mesh_verification_request_v1' NOT NULL,
	"constructed_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "claim_peer_mesh_pings_selection_member_uq" UNIQUE("selection_id","member_id")
);
--> statement-breakpoint
ALTER TABLE "claim_peer_mesh_selections" ADD CONSTRAINT "claim_peer_mesh_selections_claim_case_id_fk" FOREIGN KEY ("claim_case_id") REFERENCES "public"."claims"("claim_case_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "claim_peer_mesh_pings" ADD CONSTRAINT "claim_peer_mesh_pings_selection_id_fk" FOREIGN KEY ("selection_id") REFERENCES "public"."claim_peer_mesh_selections"("selection_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
-- (1) Table privileges for the app role (SELECT/INSERT/UPDATE, NOT DELETE — audit-retained rows).
GRANT SELECT, INSERT, UPDATE ON "claim_peer_mesh_selections" TO twt_app;--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE ON "claim_peer_mesh_pings" TO twt_app;--> statement-breakpoint
-- (2) Turn RLS on + FORCE it even for the (non-superuser) table owner (kept adjacent).
ALTER TABLE "claim_peer_mesh_selections" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "claim_peer_mesh_selections" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "claim_peer_mesh_pings" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "claim_peer_mesh_pings" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
-- Per-tenant scans / RLS-aware planner hints.
CREATE INDEX "claim_peer_mesh_selections_pariwar_id_idx" ON "claim_peer_mesh_selections" USING btree ("pariwar_id");--> statement-breakpoint
CREATE INDEX "claim_peer_mesh_pings_pariwar_id_idx" ON "claim_peer_mesh_pings" USING btree ("pariwar_id");--> statement-breakpoint
-- Tenant-isolation RLS (mirror claims-rls EXACTLY): SELECT + write (for ALL) via the
-- Story 1.6 closed-failure construct `pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid`.
CREATE POLICY "claim_peer_mesh_selections_tenant_isolation_select" ON "claim_peer_mesh_selections" AS PERMISSIVE FOR SELECT TO "twt_app" USING (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "claim_peer_mesh_selections_tenant_isolation_write" ON "claim_peer_mesh_selections" AS PERMISSIVE FOR ALL TO "twt_app" USING (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid) WITH CHECK (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "claim_peer_mesh_pings_tenant_isolation_select" ON "claim_peer_mesh_pings" AS PERMISSIVE FOR SELECT TO "twt_app" USING (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "claim_peer_mesh_pings_tenant_isolation_write" ON "claim_peer_mesh_pings" AS PERMISSIVE FOR ALL TO "twt_app" USING (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid) WITH CHECK (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid);
