-- Migration 0055 — claim ground inspection: assignment + notes + photos (Story 6.7, Task 3).
-- TWO NET-NEW tables + FOUR NEW enums + a self-FK + tenant-isolation RLS, in ONE hand-authored file:
--   · claim_ground_inspections — ONE row per ASSIGNMENT (the addressable unit, D5/D6): scheduling
--     (district authz anchor + inspection_stage + inspection_site_type + inspector_actor_id +
--     scheduled_at) + Tier-1 ciphertext (location / family contact / notes) + structured_findings
--     (non-PII jsonb) + a per-assignment status machine + the bounded refusal_reason + the #4
--     supersedes self-FK. NO active-uniqueness of any kind (a claim may hold many parallel/sequential
--     assignments, same OR different district — district is an authz boundary, not an inspection identity).
--   · claim_ground_inspection_photos — the child table, MANY photos per assignment (Decision D2:
--     the object key + non-PII object metadata + an encrypted caption; NOT a claim_documents row,
--     NO OCR/parity columns/job). Bytes live in object storage (the Story 6.5 ClaimDocumentStorage port).
--
-- ⚠ DO NOT REGENERATE THIS FILE with `db:generate` (same discipline as 0051/0052/0053/0054): the
-- drizzle snapshot baseline is frozen at 0020, so a regenerate emits a bloated catch-up migration
-- and drizzle-kit skips an already-applied migration by journal `when` (NOT SQL hash), silently
-- dropping the hand-supplements + risking 42P07 on re-run. HAND-AUTHORED: carries ONLY the
-- ground-inspection DDL (the four CREATE TYPE enums + the two CREATE TABLEs + the three FKs incl.
-- the self-FK + ENABLE/FORCE RLS + the indexes + the four CREATE POLICY declarations from
-- packages/domain/src/policies/claim-ground-inspections-rls.ts), wrapped with the hand-supplemented
-- GRANT (SELECT/INSERT/UPDATE, NOT DELETE) + FORCE DDL (mirrors 0051/0052/0053/0054).
--
-- Hand-supplements (relative to a generated DDL):
--   1. GRANT SELECT, INSERT, UPDATE on both tables to twt_app.
--      NOT DELETE: an assignment + its photos are audit-retained (a superseded/completed/refused row
--      persists as the evidentiary record; the verifier console reads it). Row purge is a future concern.
--   2. ALTER TABLE ... FORCE ROW LEVEL SECURITY — applies RLS even to the (non-superuser) table owner.
--      ENABLE + FORCE kept adjacent (mirror 0051/0052/0053/0054).
--
-- ⚠ NO claims.current_state-style write-rejection trigger here: neither table is an event-sourced
-- state cache — `status` / `structured_findings` are ordinary tenant-isolated columns (the peer-mesh
-- `outcome` posture). The claim's own lifecycle state stays trigger-guarded on `claims.current_state`
-- (migration 0051); the ground-inspection writers advance NOTHING on it — they emit the two identity
-- annotation events (`claim.ground_inspection_scheduled` / `_completed`) ONLY via `claim.projectClaimState`.
--
-- The claims table + roles (twt_app) already exist (migrations 0051 / 0002). The FKs
-- (claim_ground_inspections.claim_case_id → claims ON DELETE CASCADE; the self-FK
-- claim_ground_inspections.supersedes_ground_inspection_id → claim_ground_inspections ON DELETE SET NULL;
-- claim_ground_inspection_photos.ground_inspection_id → claim_ground_inspections ON DELETE CASCADE) are
-- emitted inline. No snapshot file is emitted (baseline frozen at 0020; mirror 0021–0054).

CREATE TYPE "public"."ground_inspection_status" AS ENUM('scheduled', 'completed', 'superseded', 'photo_refused', 'evidence_unavailable');--> statement-breakpoint
CREATE TYPE "public"."ground_inspection_stage" AS ENUM('initial', 'corroboration', 'additional_evidence');--> statement-breakpoint
CREATE TYPE "public"."ground_inspection_site_type" AS ENUM('family_residence', 'current_residence', 'permanent_residence', 'workplace', 'school_or_office', 'incident_location', 'other');--> statement-breakpoint
CREATE TYPE "public"."ground_inspection_refusal_reason" AS ENUM('family_refused_photography', 'premises_inaccessible', 'responsible_person_absent', 'site_no_longer_exists', 'inspector_safety_risk', 'other_evidence_unavailable');--> statement-breakpoint
CREATE TABLE "claim_ground_inspections" (
	"ground_inspection_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"claim_case_id" uuid NOT NULL,
	"pariwar_id" uuid NOT NULL,
	"district" text NOT NULL,
	"inspection_stage" "ground_inspection_stage" NOT NULL,
	"inspection_site_type" "ground_inspection_site_type" NOT NULL,
	"inspector_actor_id" text NOT NULL,
	"scheduled_at" timestamp with time zone NOT NULL,
	"location_ciphertext" text,
	"family_contact_ciphertext" text,
	"notes_ciphertext" text,
	"structured_findings" jsonb,
	"status" "ground_inspection_status" DEFAULT 'scheduled' NOT NULL,
	"refusal_reason" "ground_inspection_refusal_reason",
	"supersedes_ground_inspection_id" uuid,
	"scheduled_by_actor" text,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "claim_ground_inspection_photos" (
	"photo_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ground_inspection_id" uuid NOT NULL,
	"pariwar_id" uuid NOT NULL,
	"storage_object_key" text NOT NULL,
	"content_type" text NOT NULL,
	"byte_size" integer NOT NULL,
	"caption_ciphertext" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "claim_ground_inspections" ADD CONSTRAINT "claim_ground_inspections_claim_case_id_fk" FOREIGN KEY ("claim_case_id") REFERENCES "public"."claims"("claim_case_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "claim_ground_inspections" ADD CONSTRAINT "claim_ground_inspections_supersedes_ground_inspection_id_fk" FOREIGN KEY ("supersedes_ground_inspection_id") REFERENCES "public"."claim_ground_inspections"("ground_inspection_id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "claim_ground_inspection_photos" ADD CONSTRAINT "claim_ground_inspection_photos_ground_inspection_id_fk" FOREIGN KEY ("ground_inspection_id") REFERENCES "public"."claim_ground_inspections"("ground_inspection_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
-- (1) Table privileges for the app role (SELECT/INSERT/UPDATE, NOT DELETE — audit-retained rows).
GRANT SELECT, INSERT, UPDATE ON "claim_ground_inspections" TO twt_app;--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE ON "claim_ground_inspection_photos" TO twt_app;--> statement-breakpoint
-- (2) Turn RLS on + FORCE it even for the (non-superuser) table owner (kept adjacent).
ALTER TABLE "claim_ground_inspections" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "claim_ground_inspections" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "claim_ground_inspection_photos" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "claim_ground_inspection_photos" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
-- Per-tenant scans / RLS-aware planner hints + the claim (and claim+status) read filters.
CREATE INDEX "claim_ground_inspections_pariwar_id_idx" ON "claim_ground_inspections" USING btree ("pariwar_id");--> statement-breakpoint
CREATE INDEX "claim_ground_inspections_claim_case_id_idx" ON "claim_ground_inspections" USING btree ("claim_case_id");--> statement-breakpoint
CREATE INDEX "claim_ground_inspections_claim_case_id_status_idx" ON "claim_ground_inspections" USING btree ("claim_case_id","status");--> statement-breakpoint
CREATE INDEX "claim_ground_inspection_photos_ground_inspection_id_idx" ON "claim_ground_inspection_photos" USING btree ("ground_inspection_id");--> statement-breakpoint
CREATE INDEX "claim_ground_inspection_photos_pariwar_id_idx" ON "claim_ground_inspection_photos" USING btree ("pariwar_id");--> statement-breakpoint
-- Tenant-isolation RLS (mirror claims-rls EXACTLY): SELECT + write (for ALL) via the
-- Story 1.6 closed-failure construct `pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid`.
CREATE POLICY "claim_ground_inspections_tenant_isolation_select" ON "claim_ground_inspections" AS PERMISSIVE FOR SELECT TO "twt_app" USING (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "claim_ground_inspections_tenant_isolation_write" ON "claim_ground_inspections" AS PERMISSIVE FOR ALL TO "twt_app" USING (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid) WITH CHECK (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "claim_ground_inspection_photos_tenant_isolation_select" ON "claim_ground_inspection_photos" AS PERMISSIVE FOR SELECT TO "twt_app" USING (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "claim_ground_inspection_photos_tenant_isolation_write" ON "claim_ground_inspection_photos" AS PERMISSIVE FOR ALL TO "twt_app" USING (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid) WITH CHECK (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid);
