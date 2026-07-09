-- Migration 0052 — Intake Convergence Point (ICP) substrate (Story 6.4, Task 1).
-- Two NET-NEW tables + one NEW enum + tenant-isolation RLS. Formalizes the crude
-- same-member convergence 6.2/6.3 already do into a first-class, auditable, override-
-- aware ICP.
--
-- ⚠ DO NOT REGENERATE THIS FILE with `db:generate` (same discipline as 0051): the
-- drizzle snapshot baseline is frozen at 0020, so a regenerate emits a bloated
-- catch-up migration and drizzle-kit skips an already-applied migration by journal
-- `when` (NOT SQL hash), silently dropping the hand-supplements + risking 42P07 on
-- re-run. HAND-AUTHORED: carries ONLY the ICP DDL (the one CREATE TYPE enum + the two
-- CREATE TABLEs + ENABLE/FORCE RLS + the indexes + the four CREATE POLICY declarations
-- from packages/domain/src/policies/intake-attempts-rls.ts), wrapped with the
-- hand-supplemented GRANT (SELECT/INSERT/UPDATE, NOT DELETE) + FORCE DDL (mirrors 0051).
--
-- Hand-supplements (relative to a generated DDL):
--   1. GRANT SELECT, INSERT, UPDATE on each table to twt_app.
--      NOT DELETE: an intake-attempt row is NEVER row-deleted — resolution is a status
--      PROJECTION (pending → converged / overridden_separate), retained for audit (AC7
--      "retained for audit but explicitly marked superseded_by_claim_case_id"; AC9
--      unambiguous lineage). A convergence_overrides row is an append-only ledger line.
--   2. ALTER TABLE ... FORCE ROW LEVEL SECURITY — applies RLS even to the (non-
--      superuser) table owner. ENABLE + FORCE kept adjacent (mirror 0051).
--
-- ⚠ NO claims.current_state-style write-rejection trigger here (Task 1, deliberate):
-- `intake_attempts.attempt_status` is a PLAIN projected column, NOT an event-sourced
-- state cache. The trigger-guarded, projector-only state stays on `claims.current_state`
-- (migration 0051). Convergence resolution flips attempt_status via ordinary UPDATEs.
--
-- The `claim_intake_channel` enum already exists (migration 0051) — reused here as the
-- SINGLE-value `intake_channel` column (an attempt originates on exactly one channel;
-- the SET is `claims.intake_channels`). The roles (twt_app) already exist (migration
-- 0002). No snapshot file is emitted (baseline frozen at 0020; mirror 0021–0051).

CREATE TYPE "public"."intake_attempt_status" AS ENUM('pending', 'converged', 'overridden_separate');--> statement-breakpoint
CREATE TABLE "intake_attempts" (
	"intake_attempt_id" uuid PRIMARY KEY NOT NULL,
	"pariwar_id" uuid NOT NULL,
	"deceased_member_id" uuid NOT NULL,
	"intake_channel" "claim_intake_channel" NOT NULL,
	"claimant_actor_id" uuid,
	"attempt_status" "intake_attempt_status" NOT NULL,
	"superseded_by_claim_case_id" uuid,
	"created_by_actor" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"resolved_by_actor" uuid,
	"resolved_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "convergence_overrides" (
	"override_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"pariwar_id" uuid NOT NULL,
	"deceased_member_id" uuid NOT NULL,
	"intake_attempt_id" uuid NOT NULL,
	"against_claim_case_id" uuid NOT NULL,
	"reason" text NOT NULL,
	"decided_by_actor" uuid NOT NULL,
	"decided_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
-- (1) Table privileges for the app role (SELECT/INSERT/UPDATE, NOT DELETE — an attempt
-- row is never row-deleted; resolution is a status projection + the overrides ledger is
-- append-only).
GRANT SELECT, INSERT, UPDATE ON "intake_attempts" TO twt_app;--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE ON "convergence_overrides" TO twt_app;--> statement-breakpoint
-- (2) Turn RLS on + FORCE it even for the (non-superuser) table owner (kept adjacent).
ALTER TABLE "intake_attempts" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "intake_attempts" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "convergence_overrides" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "convergence_overrides" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
-- The dedup-window candidate scan (AC1): (pariwar_id, deceased_member_id, created_at).
CREATE INDEX "intake_attempts_dedup_window_idx" ON "intake_attempts" USING btree ("pariwar_id","deceased_member_id","created_at");--> statement-breakpoint
CREATE INDEX "convergence_overrides_pariwar_deceased_idx" ON "convergence_overrides" USING btree ("pariwar_id","deceased_member_id");--> statement-breakpoint
-- Defense-in-depth (Review): scoped by intake_channel so the intentional cross-channel
-- multi-pending case (two DIFFERENT channels pending for one death) is never blocked —
-- only guards against two pending attempts on the SAME channel for the same death, which
-- the advisory lock (icp.ts acquireIntakeLock) already serializes against in practice.
CREATE UNIQUE INDEX "intake_attempts_one_pending_per_channel_idx" ON "intake_attempts" USING btree ("pariwar_id","deceased_member_id","intake_channel") WHERE "attempt_status" = 'pending';--> statement-breakpoint
-- Tenant-isolation RLS (mirror claims-rls EXACTLY): SELECT + write (for ALL) via the
-- Story 1.6 closed-failure construct `pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid`.
CREATE POLICY "intake_attempts_tenant_isolation_select" ON "intake_attempts" AS PERMISSIVE FOR SELECT TO "twt_app" USING (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "intake_attempts_tenant_isolation_write" ON "intake_attempts" AS PERMISSIVE FOR ALL TO "twt_app" USING (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid) WITH CHECK (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "convergence_overrides_tenant_isolation_select" ON "convergence_overrides" AS PERMISSIVE FOR SELECT TO "twt_app" USING (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "convergence_overrides_tenant_isolation_write" ON "convergence_overrides" AS PERMISSIVE FOR ALL TO "twt_app" USING (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid) WITH CHECK (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid);
