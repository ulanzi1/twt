-- Migration 0062 — State-Trustee cycle-freeze decision + commit tables (Story 6.13, Task 2).
-- TWO NET-NEW tables + THREE NEW enums + a partial-unique PHASE invariant + tenant-isolation RLS, in ONE
-- hand-authored file:
--   · claim_state_trustee_decisions — ONE row per PHASE (the DECISION-METADATA authority, AC0): phase
--     (frozen_vote | commit | escalation_resolution | routing) + outcome (approved | denied | routed_to_r9)
--     + a NULLABLE trustee reason_code (required-per-phase enforced in the write-path/contract, D-F) +
--     Tier-1 rationale ciphertext + the decision-time actor_display SNAPSHOT (R5/AC8) + decided_at +
--     superseded_at. The partial-unique `(claim_case_id, phase) WHERE superseded_at IS NULL` guarantees AT
--     MOST ONE live row per (claim, phase) — the freeze/vote → commit progression + the escalation-
--     resolution + the durable routing exclusion each get one clean live slot (D-F, other suggestion #5;
--     NOT the 6.11 one-live-per-claim). This table is NOT an event-sourced state cache — claim STATE stays
--     trigger-guarded on claims.current_state (migration 0051), derived from the paired
--     claim.state_trustee_* / claim.approved / claim.verifier_* events; the writers advance NOTHING on it.
--   · cycle_freeze_commits — the durable COMMIT record (D-D/AC5): client-generated commit_id (the
--     idempotency key) + actor_id + actor_display SNAPSHOT (R5/AC8) + committed_claim_ids (uuid[]) +
--     trigger_delivered (flipped post-fire, AC6) + committed_at. The commit idempotency key + audit anchor
--     + the Epic-7 pool-spawn (AC6) handoff payload.
--
-- ⚠ DO NOT REGENERATE THIS FILE with `db:generate` (same discipline as 0051–0061): the drizzle snapshot
-- baseline is frozen at 0020, so a regenerate emits a bloated catch-up migration and drizzle-kit skips an
-- already-applied migration by journal `when` (NOT SQL hash), silently dropping the hand-supplements +
-- risking 42P07 on re-run. HAND-AUTHORED: carries ONLY the cycle-freeze DDL (the three CREATE TYPE enums +
-- the two CREATE TABLEs + the claim FK + ENABLE/FORCE RLS + the indexes incl. the partial-unique + the
-- four CREATE POLICY declarations from packages/domain/src/policies/claim-state-trustee-decisions-rls.ts +
-- cycle-freeze-commits-rls.ts), wrapped with the hand-supplemented GRANT (SELECT/INSERT/UPDATE, NOT
-- DELETE) + FORCE DDL (mirrors 0059/0060).
--
-- Hand-supplements (relative to a generated DDL):
--   1. GRANT SELECT, INSERT, UPDATE on both tables to twt_app. NOT DELETE: a decision row is
--      audit-retained (a superseded row persists as the transcript); a commit record is durable. UPDATE is
--      required for the decision supersession (SET superseded_at = now()) + the trigger_delivered flip.
--   2. ALTER TABLE ... FORCE ROW LEVEL SECURITY — applies RLS even to the (non-superuser) table owner.
--
-- The claims table + roles (twt_app) already exist (migrations 0051 / 0002). The FK
-- (claim_state_trustee_decisions.claim_case_id → claims ON DELETE CASCADE) is emitted inline. cycle_freeze_commits
-- carries NO pariwar FK (there is no pariwars base table pre-Epic-3 — the exact claims.pariwar_id posture) and
-- no per-element FK on the committed_claim_ids array. No snapshot file is emitted (baseline frozen at 0020;
-- mirror 0021–0061).

CREATE TYPE "public"."state_trustee_decision_phase" AS ENUM('frozen_vote', 'commit', 'escalation_resolution', 'routing');--> statement-breakpoint
CREATE TYPE "public"."state_trustee_decision_outcome" AS ENUM('approved', 'denied', 'routed_to_r9');--> statement-breakpoint
CREATE TYPE "public"."state_trustee_reason_code" AS ENUM('standing_not_met', 'documents_insufficient', 'concealment_upheld', 'r9_special_case', 'other');--> statement-breakpoint
CREATE TABLE "claim_state_trustee_decisions" (
	"decision_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"claim_case_id" uuid NOT NULL,
	"pariwar_id" uuid NOT NULL,
	"phase" "state_trustee_decision_phase" NOT NULL,
	"outcome" "state_trustee_decision_outcome" NOT NULL,
	"reason_code" "state_trustee_reason_code",
	"rationale_ciphertext" text,
	"actor_id" text NOT NULL,
	"actor_display" text NOT NULL,
	"decided_at" timestamp with time zone DEFAULT now() NOT NULL,
	"superseded_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cycle_freeze_commits" (
	"commit_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"pariwar_id" uuid NOT NULL,
	"actor_id" text NOT NULL,
	"actor_display" text NOT NULL,
	"committed_claim_ids" uuid[] NOT NULL,
	"trigger_delivered" boolean DEFAULT false NOT NULL,
	"committed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "claim_state_trustee_decisions" ADD CONSTRAINT "claim_state_trustee_decisions_claim_case_id_fk" FOREIGN KEY ("claim_case_id") REFERENCES "public"."claims"("claim_case_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
-- (1) Table privileges for the app role (SELECT/INSERT/UPDATE, NOT DELETE — audit-retained decision rows +
--     durable commit records; UPDATE is needed for the supersession + the trigger_delivered flip).
GRANT SELECT, INSERT, UPDATE ON "claim_state_trustee_decisions" TO twt_app;--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE ON "cycle_freeze_commits" TO twt_app;--> statement-breakpoint
-- (2) Turn RLS on + FORCE it even for the (non-superuser) table owner (kept adjacent).
ALTER TABLE "claim_state_trustee_decisions" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "claim_state_trustee_decisions" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "cycle_freeze_commits" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "cycle_freeze_commits" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
-- Per-tenant scans / RLS-aware planner hint + the claim transcript / per-phase read (the commit query's
-- routing check). NO index on rationale (D-G).
CREATE INDEX "claim_state_trustee_decisions_pariwar_id_idx" ON "claim_state_trustee_decisions" USING btree ("pariwar_id");--> statement-breakpoint
CREATE INDEX "claim_state_trustee_decisions_claim_case_id_idx" ON "claim_state_trustee_decisions" USING btree ("claim_case_id");--> statement-breakpoint
-- D-F (other suggestion #5) — at most ONE live row per (claim, phase). The concurrent-double-write backstop.
CREATE UNIQUE INDEX "claim_state_trustee_decisions_one_live_per_phase_uq" ON "claim_state_trustee_decisions" USING btree ("claim_case_id","phase") WHERE "claim_state_trustee_decisions"."superseded_at" IS NULL;--> statement-breakpoint
CREATE INDEX "cycle_freeze_commits_pariwar_id_idx" ON "cycle_freeze_commits" USING btree ("pariwar_id");--> statement-breakpoint
CREATE INDEX "cycle_freeze_commits_trigger_delivered_idx" ON "cycle_freeze_commits" USING btree ("trigger_delivered");--> statement-breakpoint
-- Tenant-isolation RLS (mirror claims-rls EXACTLY): SELECT + write (for ALL) via the
-- Story 1.6 closed-failure construct `pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid`.
CREATE POLICY "claim_state_trustee_decisions_tenant_isolation_select" ON "claim_state_trustee_decisions" AS PERMISSIVE FOR SELECT TO "twt_app" USING (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "claim_state_trustee_decisions_tenant_isolation_write" ON "claim_state_trustee_decisions" AS PERMISSIVE FOR ALL TO "twt_app" USING (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid) WITH CHECK (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "cycle_freeze_commits_tenant_isolation_select" ON "cycle_freeze_commits" AS PERMISSIVE FOR SELECT TO "twt_app" USING (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "cycle_freeze_commits_tenant_isolation_write" ON "cycle_freeze_commits" AS PERMISSIVE FOR ALL TO "twt_app" USING (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid) WITH CHECK (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid);
