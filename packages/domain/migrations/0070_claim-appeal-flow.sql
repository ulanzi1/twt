-- Migration 0070 — internal 3-stage appeal flow (Story 6.16, Task 1). FIVE NET-NEW tables + SEVEN NEW enums
-- + the load-bearing D-B/D-F CHECK/partial-unique invariants + tenant-isolation RLS, in ONE hand-authored
-- file:
--   · claim_appeals — the SINGLE appeal-journey anchor per claim (D-F). The UNCONDITIONAL
--     `UNIQUE (claim_case_id)` (NOT a partial `WHERE status='open'`) enforces exactly-one-journey-per-claim,
--     EVER — the write-path AppealAlreadyExhaustedError guard + this constraint together (guard-bypass race
--     → 23505). NO window_expires_at column (D-E removed the claimant-facing deadline). Not a state cache —
--     claim STATE stays trigger-guarded on claims.current_state, derived from the paired claim.appeal_* events.
--   · claim_appeal_decisions — per-stage decision-metadata (AC0/AC2/AC3/AC4); mirrors claim_verifier_decisions
--     with `stage` in the partial-unique `(claim_case_id, stage) WHERE superseded_at IS NULL`. Tier-1 rationale
--     (NOT NULL — mandatory), R5 reviewer_display SNAPSHOT (NOT NULL), the nullable NON-PII disposition_category
--     (D-A — set ONLY on a reversed decision), the AC6 (reviewer_actor_id, stage, decided_at) audit index.
--   · claim_appeal_panel_sessions / claim_appeal_panel_votes — the Stage-2 State-Trustee panel (the R9 pattern
--     MINUS the clause registry). D-B raises the panel MINIMUM to 2 (CHECK cardinality >= 2 — STRICTER than
--     R9's >= 1). The outcome/finalize/counts/attribution coupling CHECKs + the tally-within-panel CHECK mirror
--     0063/0067. One live session per claim + one live vote per panelist (partial-uniques).
--   · pariwar_appeal_config — the D-G legal-review go-live gate (legal_review_status, pending_legal_review
--     fail-closed default) + the D-H per-stage SLA durations (sla_stage{1,2,3}_days). One row per Pariwar.
--
-- ⚠ DO NOT REGENERATE THIS FILE with `db:generate` (same discipline as 0051–0069): the drizzle snapshot
-- baseline is frozen at 0020, so a regenerate emits a bloated catch-up migration and drizzle-kit skips an
-- already-applied migration by journal `when` (NOT SQL hash), silently dropping the hand-supplements +
-- risking 42P07 on re-run. HAND-AUTHORED: carries ONLY the 6.16 DDL (the seven CREATE TYPE enums + the five
-- CREATE TABLEs + the FKs + ENABLE/FORCE RLS + the indexes incl. the partial-uniques + the ten CREATE POLICY
-- declarations from packages/domain/src/policies/claim-appeal*-rls.ts + pariwar-appeal-config-rls.ts), wrapped
-- with the hand-supplemented GRANT (SELECT/INSERT/UPDATE, NOT DELETE) + FORCE DDL (mirrors 0063/0068).
--
-- New enums are CREATE TYPE (no ALTER TYPE ADD VALUE — nothing reuses an applied enum). The claims table +
-- roles (twt_app) already exist (migrations 0051 / 0002). All FKs are emitted inline. No snapshot file is
-- emitted (baseline frozen at 0020; mirror 0021–0069).

CREATE TYPE "public"."appeal_stage" AS ENUM('1', '2', '3');--> statement-breakpoint
CREATE TYPE "public"."appeal_decision" AS ENUM('reversed', 'advance', 'upheld');--> statement-breakpoint
CREATE TYPE "public"."appeal_panel_vote" AS ENUM('reverse', 'deny');--> statement-breakpoint
CREATE TYPE "public"."appeal_panel_outcome" AS ENUM('reversed', 'advance');--> statement-breakpoint
CREATE TYPE "public"."appeal_disposition_category" AS ENUM('new_evidence_presented', 'procedural_correction', 'reconsideration_on_merits');--> statement-breakpoint
CREATE TYPE "public"."appeal_journey_status" AS ENUM('open', 'reversed', 'upheld_final');--> statement-breakpoint
CREATE TYPE "public"."appeal_legal_review_status" AS ENUM('pending_legal_review', 'cleared');--> statement-breakpoint
CREATE TABLE "claim_appeals" (
	"appeal_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"claim_case_id" uuid NOT NULL,
	"pariwar_id" uuid NOT NULL,
	"current_stage" "appeal_stage" NOT NULL,
	"initiated_by_actor" text NOT NULL,
	"initiated_on_behalf" boolean DEFAULT false NOT NULL,
	"denial_event_version" integer,
	"status" "appeal_journey_status" DEFAULT 'open' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "claim_appeal_decisions" (
	"appeal_decision_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"claim_case_id" uuid NOT NULL,
	"pariwar_id" uuid NOT NULL,
	"stage" "appeal_stage" NOT NULL,
	"decision" "appeal_decision" NOT NULL,
	"disposition_category" "appeal_disposition_category",
	"rationale_ciphertext" text NOT NULL,
	"reviewer_actor_id" text NOT NULL,
	"reviewer_display" text NOT NULL,
	"decided_at" timestamp with time zone DEFAULT now() NOT NULL,
	"supersedes_decision_id" uuid,
	"superseded_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "claim_appeal_panel_sessions" (
	"session_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"claim_case_id" uuid NOT NULL,
	"pariwar_id" uuid NOT NULL,
	"panel_actor_ids" text[] NOT NULL,
	"quorum_required" integer NOT NULL,
	"opened_by_actor" text NOT NULL,
	"opened_display" text NOT NULL,
	"opened_at" timestamp with time zone DEFAULT now() NOT NULL,
	"outcome" "appeal_panel_outcome",
	"reverse_count" integer,
	"deny_count" integer,
	"finalized_by_actor" text,
	"finalized_display" text,
	"finalized_at" timestamp with time zone,
	"superseded_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "claim_appeal_panel_sessions_outcome_finalized_at_coupled" CHECK (("outcome" IS NULL) = ("finalized_at" IS NULL)),
	CONSTRAINT "claim_appeal_panel_sessions_outcome_reverse_count_coupled" CHECK (("outcome" IS NULL) = ("reverse_count" IS NULL)),
	CONSTRAINT "claim_appeal_panel_sessions_outcome_deny_count_coupled" CHECK (("outcome" IS NULL) = ("deny_count" IS NULL)),
	CONSTRAINT "claim_appeal_panel_sessions_outcome_finalized_by_actor_coupled" CHECK (("outcome" IS NULL) = ("finalized_by_actor" IS NULL)),
	CONSTRAINT "claim_appeal_panel_sessions_outcome_finalized_display_coupled" CHECK (("outcome" IS NULL) = ("finalized_display" IS NULL)),
	CONSTRAINT "claim_appeal_panel_sessions_reverse_count_nonneg" CHECK ("reverse_count" IS NULL OR "reverse_count" >= 0),
	CONSTRAINT "claim_appeal_panel_sessions_deny_count_nonneg" CHECK ("deny_count" IS NULL OR "deny_count" >= 0),
	CONSTRAINT "claim_appeal_panel_sessions_panel_min_two" CHECK (cardinality("panel_actor_ids") >= 2),
	CONSTRAINT "claim_appeal_panel_sessions_quorum_within_panel" CHECK ("quorum_required" >= 1 AND "quorum_required" <= cardinality("panel_actor_ids")),
	CONSTRAINT "claim_appeal_panel_sessions_tally_within_panel" CHECK ("outcome" IS NULL OR ("reverse_count" + "deny_count" <= cardinality("panel_actor_ids")))
);
--> statement-breakpoint
CREATE TABLE "claim_appeal_panel_votes" (
	"vote_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" uuid NOT NULL,
	"claim_case_id" uuid NOT NULL,
	"pariwar_id" uuid NOT NULL,
	"voter_actor_id" text NOT NULL,
	"voter_display" text NOT NULL,
	"vote" "appeal_panel_vote" NOT NULL,
	"rationale_ciphertext" text NOT NULL,
	"cast_at" timestamp with time zone DEFAULT now() NOT NULL,
	"supersedes_vote_id" uuid,
	"superseded_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pariwar_appeal_config" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"pariwar_id" uuid NOT NULL,
	"legal_review_status" "appeal_legal_review_status" DEFAULT 'pending_legal_review' NOT NULL,
	"sla_stage1_days" integer DEFAULT 14 NOT NULL,
	"sla_stage2_days" integer DEFAULT 21 NOT NULL,
	"sla_stage3_days" integer DEFAULT 14 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "claim_appeals" ADD CONSTRAINT "claim_appeals_claim_case_id_fk" FOREIGN KEY ("claim_case_id") REFERENCES "public"."claims"("claim_case_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "claim_appeal_decisions" ADD CONSTRAINT "claim_appeal_decisions_claim_case_id_fk" FOREIGN KEY ("claim_case_id") REFERENCES "public"."claims"("claim_case_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "claim_appeal_decisions" ADD CONSTRAINT "claim_appeal_decisions_supersedes_decision_id_fk" FOREIGN KEY ("supersedes_decision_id") REFERENCES "public"."claim_appeal_decisions"("appeal_decision_id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "claim_appeal_panel_sessions" ADD CONSTRAINT "claim_appeal_panel_sessions_claim_case_id_fk" FOREIGN KEY ("claim_case_id") REFERENCES "public"."claims"("claim_case_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "claim_appeal_panel_votes" ADD CONSTRAINT "claim_appeal_panel_votes_session_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."claim_appeal_panel_sessions"("session_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "claim_appeal_panel_votes" ADD CONSTRAINT "claim_appeal_panel_votes_claim_case_id_fk" FOREIGN KEY ("claim_case_id") REFERENCES "public"."claims"("claim_case_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "claim_appeal_panel_votes" ADD CONSTRAINT "claim_appeal_panel_votes_supersedes_vote_id_fk" FOREIGN KEY ("supersedes_vote_id") REFERENCES "public"."claim_appeal_panel_votes"("vote_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
-- (1) Table privileges for the app role (SELECT/INSERT/UPDATE, NOT DELETE — audit-retained superseded rows;
--     UPDATE is needed for the supersession + the finalize outcome/counts write + the anchor stage/status
--     advance + the config legal-review flip / SLA edit).
GRANT SELECT, INSERT, UPDATE ON "claim_appeals" TO twt_app;--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE ON "claim_appeal_decisions" TO twt_app;--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE ON "claim_appeal_panel_sessions" TO twt_app;--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE ON "claim_appeal_panel_votes" TO twt_app;--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE ON "pariwar_appeal_config" TO twt_app;--> statement-breakpoint
-- (2) Turn RLS on + FORCE it even for the (non-superuser) table owner (kept adjacent).
ALTER TABLE "claim_appeals" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "claim_appeals" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "claim_appeal_decisions" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "claim_appeal_decisions" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "claim_appeal_panel_sessions" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "claim_appeal_panel_sessions" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "claim_appeal_panel_votes" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "claim_appeal_panel_votes" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "pariwar_appeal_config" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "pariwar_appeal_config" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
-- Per-tenant scans / RLS-aware planner hints + the per-claim / per-session reads + the AC6 audit index. NO
-- index on rationale (PII).
CREATE INDEX "claim_appeals_pariwar_id_idx" ON "claim_appeals" USING btree ("pariwar_id");--> statement-breakpoint
-- D-F — EXACTLY ONE appeal journey per claim, EVER (UNCONDITIONAL — not partial on status).
CREATE UNIQUE INDEX "claim_appeals_one_per_claim_uq" ON "claim_appeals" USING btree ("claim_case_id");--> statement-breakpoint
CREATE INDEX "claim_appeal_decisions_pariwar_id_idx" ON "claim_appeal_decisions" USING btree ("pariwar_id");--> statement-breakpoint
CREATE INDEX "claim_appeal_decisions_claim_case_id_idx" ON "claim_appeal_decisions" USING btree ("claim_case_id");--> statement-breakpoint
-- The AC6 "reviewer X + stage + time_range" audit query — all three NON-PII columns.
CREATE INDEX "claim_appeal_decisions_reviewer_stage_decided_idx" ON "claim_appeal_decisions" USING btree ("reviewer_actor_id","stage","decided_at");--> statement-breakpoint
-- At most ONE live decision row per (claim, stage) — the correction-supersession backstop.
CREATE UNIQUE INDEX "claim_appeal_decisions_one_live_per_claim_stage_uq" ON "claim_appeal_decisions" USING btree ("claim_case_id","stage") WHERE "claim_appeal_decisions"."superseded_at" IS NULL;--> statement-breakpoint
CREATE INDEX "claim_appeal_panel_sessions_pariwar_id_idx" ON "claim_appeal_panel_sessions" USING btree ("pariwar_id");--> statement-breakpoint
CREATE INDEX "claim_appeal_panel_sessions_claim_case_id_idx" ON "claim_appeal_panel_sessions" USING btree ("claim_case_id");--> statement-breakpoint
-- At most ONE non-superseded session per claim (OPEN OR FINALIZED).
CREATE UNIQUE INDEX "claim_appeal_panel_sessions_one_live_per_claim_uq" ON "claim_appeal_panel_sessions" USING btree ("claim_case_id") WHERE "claim_appeal_panel_sessions"."superseded_at" IS NULL;--> statement-breakpoint
CREATE INDEX "claim_appeal_panel_votes_pariwar_id_idx" ON "claim_appeal_panel_votes" USING btree ("pariwar_id");--> statement-breakpoint
CREATE INDEX "claim_appeal_panel_votes_session_id_idx" ON "claim_appeal_panel_votes" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX "claim_appeal_panel_votes_voter_actor_id_idx" ON "claim_appeal_panel_votes" USING btree ("pariwar_id","voter_actor_id","cast_at");--> statement-breakpoint
-- At most ONE live vote per panelist per session (the revise atomic-supersession backstop).
CREATE UNIQUE INDEX "claim_appeal_panel_votes_one_live_per_voter_uq" ON "claim_appeal_panel_votes" USING btree ("session_id","voter_actor_id") WHERE "claim_appeal_panel_votes"."superseded_at" IS NULL;--> statement-breakpoint
CREATE INDEX "pariwar_appeal_config_pariwar_id_idx" ON "pariwar_appeal_config" USING btree ("pariwar_id");--> statement-breakpoint
CREATE UNIQUE INDEX "pariwar_appeal_config_pariwar_id_uq" ON "pariwar_appeal_config" USING btree ("pariwar_id");--> statement-breakpoint
-- Tenant-isolation RLS (mirror claims-rls EXACTLY): SELECT + write (for ALL) via the Story 1.6 closed-failure
-- construct `pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid`. SYMMETRIC on all five.
CREATE POLICY "claim_appeals_tenant_isolation_select" ON "claim_appeals" AS PERMISSIVE FOR SELECT TO "twt_app" USING (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "claim_appeals_tenant_isolation_write" ON "claim_appeals" AS PERMISSIVE FOR ALL TO "twt_app" USING (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid) WITH CHECK (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "claim_appeal_decisions_tenant_isolation_select" ON "claim_appeal_decisions" AS PERMISSIVE FOR SELECT TO "twt_app" USING (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "claim_appeal_decisions_tenant_isolation_write" ON "claim_appeal_decisions" AS PERMISSIVE FOR ALL TO "twt_app" USING (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid) WITH CHECK (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "claim_appeal_panel_sessions_tenant_isolation_select" ON "claim_appeal_panel_sessions" AS PERMISSIVE FOR SELECT TO "twt_app" USING (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "claim_appeal_panel_sessions_tenant_isolation_write" ON "claim_appeal_panel_sessions" AS PERMISSIVE FOR ALL TO "twt_app" USING (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid) WITH CHECK (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "claim_appeal_panel_votes_tenant_isolation_select" ON "claim_appeal_panel_votes" AS PERMISSIVE FOR SELECT TO "twt_app" USING (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "claim_appeal_panel_votes_tenant_isolation_write" ON "claim_appeal_panel_votes" AS PERMISSIVE FOR ALL TO "twt_app" USING (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid) WITH CHECK (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "pariwar_appeal_config_tenant_isolation_select" ON "pariwar_appeal_config" AS PERMISSIVE FOR SELECT TO "twt_app" USING (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "pariwar_appeal_config_tenant_isolation_write" ON "pariwar_appeal_config" AS PERMISSIVE FOR ALL TO "twt_app" USING (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid) WITH CHECK (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid);
