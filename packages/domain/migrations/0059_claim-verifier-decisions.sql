-- Migration 0059 — claim verifier decisions + users.display_name (Story 6.11, Task 1).
-- ONE NET-NEW table + TWO NEW enums + a self-FK + a partial-unique invariant + tenant-isolation RLS,
-- PLUS one additive column on the global `users` table — in ONE hand-authored file:
--   · claim_verifier_decisions — ONE row per adjudication DECISION (the DECISION-METADATA authority,
--     AC0): outcome + reason_code (two bounded non-PII enums) + Tier-1 rationale ciphertext + the
--     decision-time actor_display SNAPSHOT (R5/AC7) + decided_at + the D-E supersedes self-FK +
--     superseded_at. The partial-unique `(claim_case_id) WHERE superseded_at IS NULL` guarantees AT
--     MOST ONE live decision row per claim (the concurrent-double-revision backstop, AC5/AC9). This
--     table is NOT an event-sourced state cache — claim STATE stays trigger-guarded on
--     claims.current_state (migration 0051), derived from the claim.verifier_* events; the adjudication
--     writers advance NOTHING on it, they emit the verdict/annotation events via claim.projectClaimState.
--   · users.display_name — the controlled staff-attribution DISPLAY source (R5). NULLABLE text
--     (existing admins have none — the adjudication write path is where absence blocks). Plaintext BY
--     DELIBERATE RATIFIED DECISION (its purpose is display on audit surfaces); NEVER email-derived.
--
-- ⚠ DO NOT REGENERATE THIS FILE with `db:generate` (same discipline as 0051–0058): the drizzle snapshot
-- baseline is frozen at 0020, so a regenerate emits a bloated catch-up migration and drizzle-kit skips an
-- already-applied migration by journal `when` (NOT SQL hash), silently dropping the hand-supplements +
-- risking 42P07 on re-run. HAND-AUTHORED: carries ONLY the verifier-decision DDL (the two CREATE TYPE
-- enums + the CREATE TABLE + the two FKs incl. the self-FK + ENABLE/FORCE RLS + the indexes incl. the
-- partial-unique + the two CREATE POLICY declarations from
-- packages/domain/src/policies/claim-verifier-decisions-rls.ts) + the users.display_name ADD COLUMN,
-- wrapped with the hand-supplemented GRANT (SELECT/INSERT/UPDATE, NOT DELETE) + FORCE DDL (mirrors 0055).
--
-- Hand-supplements (relative to a generated DDL):
--   1. GRANT SELECT, INSERT, UPDATE on claim_verifier_decisions to twt_app. NOT DELETE: a decision row
--      is audit-retained (a superseded row persists as the evidentiary transcript — section (e), AC6).
--      UPDATE is required for the D-E atomic supersession (SET superseded_at = now()).
--   2. ALTER TABLE ... FORCE ROW LEVEL SECURITY — applies RLS even to the (non-superuser) table owner.
--
-- The claims + users tables + roles (twt_app) already exist (migrations 0051 / 0005 / 0002). The FKs
-- (claim_verifier_decisions.claim_case_id → claims ON DELETE CASCADE; the self-FK
-- claim_verifier_decisions.supersedes_decision_id → claim_verifier_decisions ON DELETE SET NULL) are
-- emitted inline. `users` is the GLOBAL identity carve-out (identity-auth-rls) — display_name gets no
-- pariwar predicate. No snapshot file is emitted (baseline frozen at 0020; mirror 0021–0058).

CREATE TYPE "public"."verifier_decision_outcome" AS ENUM('approved', 'denied', 'escalated');--> statement-breakpoint
CREATE TYPE "public"."verifier_reason_code" AS ENUM('r5_d_natural_death', 'r8_90pct_met', 'concealment_flag_override', 'concealment_flag_uphold', 'r9_routed_to_voting', 'other');--> statement-breakpoint
CREATE TABLE "claim_verifier_decisions" (
	"decision_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"claim_case_id" uuid NOT NULL,
	"pariwar_id" uuid NOT NULL,
	"outcome" "verifier_decision_outcome" NOT NULL,
	"reason_code" "verifier_reason_code" NOT NULL,
	"rationale_ciphertext" text,
	"actor_id" text NOT NULL,
	"actor_display" text NOT NULL,
	"decided_at" timestamp with time zone DEFAULT now() NOT NULL,
	"supersedes_decision_id" uuid,
	"superseded_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
-- users.display_name — the R5 staff-attribution DISPLAY source (nullable; NEVER email-derived).
ALTER TABLE "users" ADD COLUMN "display_name" text;--> statement-breakpoint
ALTER TABLE "claim_verifier_decisions" ADD CONSTRAINT "claim_verifier_decisions_claim_case_id_fk" FOREIGN KEY ("claim_case_id") REFERENCES "public"."claims"("claim_case_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "claim_verifier_decisions" ADD CONSTRAINT "claim_verifier_decisions_supersedes_decision_id_fk" FOREIGN KEY ("supersedes_decision_id") REFERENCES "public"."claim_verifier_decisions"("decision_id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
-- (1) Table privileges for the app role (SELECT/INSERT/UPDATE, NOT DELETE — audit-retained rows;
--     UPDATE is needed for the atomic supersession SET superseded_at = now()).
GRANT SELECT, INSERT, UPDATE ON "claim_verifier_decisions" TO twt_app;--> statement-breakpoint
-- (2) Turn RLS on + FORCE it even for the (non-superuser) table owner (kept adjacent).
ALTER TABLE "claim_verifier_decisions" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "claim_verifier_decisions" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
-- Per-tenant scans / RLS-aware planner hint + the section (e) claim read + section (f) recency + the
-- trustee "actor + reason-code + time_range" audit query (AC4). NO index on rationale (D-G).
CREATE INDEX "claim_verifier_decisions_pariwar_id_idx" ON "claim_verifier_decisions" USING btree ("pariwar_id");--> statement-breakpoint
CREATE INDEX "claim_verifier_decisions_claim_case_id_idx" ON "claim_verifier_decisions" USING btree ("claim_case_id");--> statement-breakpoint
CREATE INDEX "claim_verifier_decisions_pariwar_id_decided_at_idx" ON "claim_verifier_decisions" USING btree ("pariwar_id","decided_at");--> statement-breakpoint
CREATE INDEX "claim_verifier_decisions_actor_reason_decided_idx" ON "claim_verifier_decisions" USING btree ("actor_id","reason_code","decided_at");--> statement-breakpoint
-- AC5/AC9 — at most ONE live decision row per claim (a revision must supersede before/atomically-with
-- inserting the next). The concurrent-double-revision backstop.
CREATE UNIQUE INDEX "claim_verifier_decisions_one_live_per_claim_uq" ON "claim_verifier_decisions" USING btree ("claim_case_id") WHERE "claim_verifier_decisions"."superseded_at" IS NULL;--> statement-breakpoint
-- Tenant-isolation RLS (mirror claims-rls EXACTLY): SELECT + write (for ALL) via the
-- Story 1.6 closed-failure construct `pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid`.
CREATE POLICY "claim_verifier_decisions_tenant_isolation_select" ON "claim_verifier_decisions" AS PERMISSIVE FOR SELECT TO "twt_app" USING (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "claim_verifier_decisions_tenant_isolation_write" ON "claim_verifier_decisions" AS PERMISSIVE FOR ALL TO "twt_app" USING (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid) WITH CHECK (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid);
