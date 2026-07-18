-- Migration 0075 — pool fixed-amount schedule + emergency attestation (Story 7.5, Task 1; AC1/AC3/AC5).
--
-- Retires the boot-time POOL_SPAWN_FIXED_AMOUNT_INR env constant: the per-Pariwar effective-dated
-- `fixed_amount` schedule (modeled 1:1 on terms_and_conditions_versions — D1) becomes the source
-- the spawn saga reads at the cycle-freeze committed_at. TWO net-new tables + ONE new enum, in ONE
-- hand-authored file:
--   · pool_fixed_amount_schedule — the effective-window amount schedule. version monotonic per
--     Pariwar; effective_from/effective_until window (partial-unique open-head per Pariwar — the
--     T&C precedent); change_type discriminator (standard vs emergency); positive-amount +
--     positive-version CHECKs. A row's effective_until is UPDATEd when superseded, so GRANT
--     includes UPDATE.
--   · pool_fixed_amount_emergency_attestations — the immutable Emergency Adjustment Record (D3).
--     APPEND-ONLY: one row per emergency change, references the schedule version, denormalized
--     amount, panel composition (jsonb), attestation metadata, plaintext policy/operational
--     documented_reason. GRANT is SELECT + INSERT ONLY (NO UPDATE/DELETE) — write-once enforced at
--     the privilege level, the reason a dedicated never-updated table exists (the schedule head row
--     is later mutated, so an attestation on it would not be truly immutable).
--
-- ⚠ DO NOT REGENERATE THIS FILE with `db:generate` (same discipline as 0021–0074). The drizzle
-- snapshot baseline is frozen at 0020; a regenerate emits a bloated catch-up migration and
-- drizzle-kit skips an already-applied migration by journal `when` (NOT SQL hash), silently
-- dropping the hand-supplements + risking 42P07 on re-run. HAND-AUTHORED: carries ONLY this story's
-- DDL (the CREATE TYPE enum + the two CREATE TABLEs + the indexes incl. the two partial/unique
-- indexes + the four CREATE POLICY declarations from
-- packages/domain/src/policies/pool-fixed-amount-{schedule,emergency-attestations}-rls.ts), wrapped
-- with the hand-supplemented GRANT + ENABLE/FORCE RLS (mirrors 0070/0071). The change_type enum is a
-- fresh CREATE TYPE (no ALTER TYPE ADD VALUE — nothing reuses an applied enum). No FKs (pariwar_id
-- is unFK'd across the pool substrate — the pre-Epic-3 posture; the attestation → schedule link is a
-- LOGICAL FK guarded by the (pariwar_id, schedule_version) unique index). The twt_app role already
-- exists (migration 0002). No snapshot file (baseline frozen at 0020; mirror 0021–0074).

CREATE TYPE "public"."pool_fixed_amount_change_type" AS ENUM('standard', 'emergency');--> statement-breakpoint

CREATE TABLE "pool_fixed_amount_schedule" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"pariwar_id" uuid NOT NULL,
	"version" integer NOT NULL,
	"fixed_amount" integer NOT NULL,
	"effective_from" timestamp with time zone NOT NULL,
	"effective_until" timestamp with time zone,
	"change_type" "pool_fixed_amount_change_type" NOT NULL,
	"created_by_actor" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"audit_id" uuid,
	CONSTRAINT "pool_fixed_amount_schedule_version_positive" CHECK ("pool_fixed_amount_schedule"."version" >= 1),
	CONSTRAINT "pool_fixed_amount_schedule_amount_positive" CHECK ("pool_fixed_amount_schedule"."fixed_amount" > 0)
);
--> statement-breakpoint

CREATE TABLE "pool_fixed_amount_emergency_attestations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"pariwar_id" uuid NOT NULL,
	"schedule_version" integer NOT NULL,
	"fixed_amount" integer NOT NULL,
	"panel" jsonb NOT NULL,
	"attested_by_actor" text NOT NULL,
	"attested_display" text NOT NULL,
	"documented_reason" text NOT NULL,
	"attested_at" timestamp with time zone DEFAULT now() NOT NULL,
	"audit_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint

CREATE UNIQUE INDEX "pool_fixed_amount_schedule_pariwar_version_uq" ON "pool_fixed_amount_schedule" USING btree ("pariwar_id","version");--> statement-breakpoint
CREATE UNIQUE INDEX "pool_fixed_amount_schedule_pariwar_current_uq" ON "pool_fixed_amount_schedule" USING btree ("pariwar_id") WHERE effective_until IS NULL;--> statement-breakpoint
CREATE INDEX "pool_fixed_amount_schedule_pariwar_effective_from_idx" ON "pool_fixed_amount_schedule" USING btree ("pariwar_id","effective_from");--> statement-breakpoint
CREATE UNIQUE INDEX "pool_fixed_amount_emergency_attestations_pariwar_version_uq" ON "pool_fixed_amount_emergency_attestations" USING btree ("pariwar_id","schedule_version");--> statement-breakpoint
CREATE INDEX "pool_fixed_amount_emergency_attestations_pariwar_id_idx" ON "pool_fixed_amount_emergency_attestations" USING btree ("pariwar_id");--> statement-breakpoint

-- Schedule: SELECT/INSERT/UPDATE (effective_until is updated on supersede), NOT DELETE.
GRANT SELECT, INSERT, UPDATE ON "pool_fixed_amount_schedule" TO twt_app;--> statement-breakpoint
-- Emergency attestation: APPEND-ONLY — SELECT/INSERT ONLY (no UPDATE/DELETE → write-once at the grant level).
GRANT SELECT, INSERT ON "pool_fixed_amount_emergency_attestations" TO twt_app;--> statement-breakpoint

ALTER TABLE "pool_fixed_amount_schedule" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "pool_fixed_amount_schedule" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "pool_fixed_amount_emergency_attestations" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "pool_fixed_amount_emergency_attestations" FORCE ROW LEVEL SECURITY;--> statement-breakpoint

CREATE POLICY "pool_fixed_amount_schedule_tenant_isolation_select" ON "pool_fixed_amount_schedule" AS PERMISSIVE FOR SELECT TO "twt_app" USING (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "pool_fixed_amount_schedule_tenant_isolation_write" ON "pool_fixed_amount_schedule" AS PERMISSIVE FOR ALL TO "twt_app" USING (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid) WITH CHECK (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "pool_fixed_amount_emergency_attestations_tenant_isolation_select" ON "pool_fixed_amount_emergency_attestations" AS PERMISSIVE FOR SELECT TO "twt_app" USING (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "pool_fixed_amount_emergency_attestations_tenant_isolation_write" ON "pool_fixed_amount_emergency_attestations" AS PERMISSIVE FOR ALL TO "twt_app" USING (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid) WITH CHECK (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid);
