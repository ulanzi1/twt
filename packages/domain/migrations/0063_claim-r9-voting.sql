-- Migration 0063 — R9 special-case voting session + votes tables (Story 6.14, Task 2).
-- TWO NET-NEW tables + THREE NEW enums + the load-bearing AC11 CHECK/partial-unique invariants + tenant-
-- isolation RLS, in ONE hand-authored file:
--   · claim_r9_voting_sessions — the PANEL (the panel/decision-metadata authority, AC0/AC2/AC4): the R9
--     sub-clause snapshot (clause_id + registry clause_version_id + rule_code + DATA-derived
--     voting_requirement) + the IMMUTABLE panel roster (panel_actor_ids) + the snapshotted quorum_required +
--     the R5 opener/finalizer display SNAPSHOTs + (once finalized) the computed outcome + approve/deny
--     counts + finalized_at. The STRENGTHENED partial-unique `(claim_case_id) WHERE superseded_at IS NULL`
--     guarantees AT MOST ONE non-superseded session per claim, OPEN OR FINALIZED (a finalized session blocks
--     re-opening; re-voting requires cancel-first — AC2/AC5). The AC11 CHECKs encode the coupling invariants
--     (outcome/finalized_at/counts move together; counts >= 0; panel non-empty; quorum within panel). This
--     table is NOT an event-sourced state cache — claim STATE stays trigger-guarded on claims.current_state
--     (migration 0051), derived from the paired claim.r9_outcome event; the writers advance NOTHING on it.
--   · claim_r9_votes — per-vote provenance (D-D): session_id + claim_case_id + voter_actor_id + the R5
--     voter_display SNAPSHOT + vote + Tier-1 rationale ciphertext (NOT NULL — rationale is mandatory, AC3) +
--     the per-vote clause_version_id snapshot + supersedes_vote_id (the revise back-reference) + superseded_at.
--     The partial-unique `(session_id, voter_actor_id) WHERE superseded_at IS NULL` guarantees ONE live vote
--     per panelist per session (revisable until finalize — the revise supersedes the prior live row).
--
-- ⚠ DO NOT REGENERATE THIS FILE with `db:generate` (same discipline as 0051–0062): the drizzle snapshot
-- baseline is frozen at 0020, so a regenerate emits a bloated catch-up migration and drizzle-kit skips an
-- already-applied migration by journal `when` (NOT SQL hash), silently dropping the hand-supplements +
-- risking 42P07 on re-run. HAND-AUTHORED: carries ONLY the R9-voting DDL (the three CREATE TYPE enums + the
-- two CREATE TABLEs + the FKs + ENABLE/FORCE RLS + the indexes incl. the two partial-uniques + the four
-- CREATE POLICY declarations from packages/domain/src/policies/claim-r9-voting-sessions-rls.ts +
-- claim-r9-votes-rls.ts), wrapped with the hand-supplemented GRANT (SELECT/INSERT/UPDATE, NOT DELETE) +
-- FORCE DDL (mirrors 0059/0060/0062).
--
-- Hand-supplements (relative to a generated DDL):
--   1. GRANT SELECT, INSERT, UPDATE on both tables to twt_app. NOT DELETE: a superseded session/vote row is
--      audit-retained (the supersession IS the audit story). UPDATE is required for the supersession
--      (SET superseded_at = now()) + the finalize outcome/counts write.
--   2. ALTER TABLE ... FORCE ROW LEVEL SECURITY — applies RLS even to the (non-superuser) table owner.
--
-- The claims table + roles (twt_app) already exist (migrations 0051 / 0002). The FKs
-- (claim_r9_voting_sessions.claim_case_id → claims; claim_r9_votes.session_id → claim_r9_voting_sessions;
-- claim_r9_votes.claim_case_id → claims; claim_r9_votes.supersedes_vote_id → claim_r9_votes self) are emitted
-- inline. No snapshot file is emitted (baseline frozen at 0020; mirror 0021–0062).

CREATE TYPE "public"."r9_vote" AS ENUM('approve', 'deny');--> statement-breakpoint
CREATE TYPE "public"."r9_voting_requirement" AS ENUM('majority', 'supermajority', 'unanimous');--> statement-breakpoint
CREATE TYPE "public"."r9_session_outcome" AS ENUM('approved', 'denied');--> statement-breakpoint
CREATE TABLE "claim_r9_voting_sessions" (
	"session_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"claim_case_id" uuid NOT NULL,
	"pariwar_id" uuid NOT NULL,
	"clause_id" text NOT NULL,
	"clause_version_id" uuid NOT NULL,
	"rule_code" text NOT NULL,
	"voting_requirement" "r9_voting_requirement" NOT NULL,
	"panel_actor_ids" text[] NOT NULL,
	"quorum_required" integer NOT NULL,
	"opened_by_actor" text NOT NULL,
	"opened_display" text NOT NULL,
	"opened_at" timestamp with time zone DEFAULT now() NOT NULL,
	"outcome" "r9_session_outcome",
	"approve_count" integer,
	"deny_count" integer,
	"finalized_by_actor" text,
	"finalized_display" text,
	"finalized_at" timestamp with time zone,
	"superseded_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "claim_r9_voting_sessions_outcome_finalized_at_coupled" CHECK (("outcome" IS NULL) = ("finalized_at" IS NULL)),
	CONSTRAINT "claim_r9_voting_sessions_outcome_approve_count_coupled" CHECK (("outcome" IS NULL) = ("approve_count" IS NULL)),
	CONSTRAINT "claim_r9_voting_sessions_outcome_deny_count_coupled" CHECK (("outcome" IS NULL) = ("deny_count" IS NULL)),
	CONSTRAINT "claim_r9_voting_sessions_approve_count_nonneg" CHECK ("approve_count" IS NULL OR "approve_count" >= 0),
	CONSTRAINT "claim_r9_voting_sessions_deny_count_nonneg" CHECK ("deny_count" IS NULL OR "deny_count" >= 0),
	CONSTRAINT "claim_r9_voting_sessions_panel_non_empty" CHECK (cardinality("panel_actor_ids") >= 1),
	CONSTRAINT "claim_r9_voting_sessions_quorum_within_panel" CHECK ("quorum_required" >= 1 AND "quorum_required" <= cardinality("panel_actor_ids"))
);
--> statement-breakpoint
CREATE TABLE "claim_r9_votes" (
	"vote_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" uuid NOT NULL,
	"claim_case_id" uuid NOT NULL,
	"pariwar_id" uuid NOT NULL,
	"voter_actor_id" text NOT NULL,
	"voter_display" text NOT NULL,
	"vote" "r9_vote" NOT NULL,
	"rationale_ciphertext" text NOT NULL,
	"clause_version_id" uuid NOT NULL,
	"cast_at" timestamp with time zone DEFAULT now() NOT NULL,
	"supersedes_vote_id" uuid,
	"superseded_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "claim_r9_voting_sessions" ADD CONSTRAINT "claim_r9_voting_sessions_claim_case_id_fk" FOREIGN KEY ("claim_case_id") REFERENCES "public"."claims"("claim_case_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "claim_r9_votes" ADD CONSTRAINT "claim_r9_votes_session_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."claim_r9_voting_sessions"("session_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "claim_r9_votes" ADD CONSTRAINT "claim_r9_votes_claim_case_id_fk" FOREIGN KEY ("claim_case_id") REFERENCES "public"."claims"("claim_case_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "claim_r9_votes" ADD CONSTRAINT "claim_r9_votes_supersedes_vote_id_fk" FOREIGN KEY ("supersedes_vote_id") REFERENCES "public"."claim_r9_votes"("vote_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
-- (1) Table privileges for the app role (SELECT/INSERT/UPDATE, NOT DELETE — audit-retained superseded rows;
--     UPDATE is needed for the supersession + the finalize outcome/counts write).
GRANT SELECT, INSERT, UPDATE ON "claim_r9_voting_sessions" TO twt_app;--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE ON "claim_r9_votes" TO twt_app;--> statement-breakpoint
-- (2) Turn RLS on + FORCE it even for the (non-superuser) table owner (kept adjacent).
ALTER TABLE "claim_r9_voting_sessions" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "claim_r9_voting_sessions" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "claim_r9_votes" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "claim_r9_votes" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
-- Per-tenant scans / RLS-aware planner hint + the per-claim / per-session reads. NO index on rationale (PII).
CREATE INDEX "claim_r9_voting_sessions_pariwar_id_idx" ON "claim_r9_voting_sessions" USING btree ("pariwar_id");--> statement-breakpoint
CREATE INDEX "claim_r9_voting_sessions_claim_case_id_idx" ON "claim_r9_voting_sessions" USING btree ("claim_case_id");--> statement-breakpoint
-- AC2/#4 STRENGTHENED uniqueness — at most ONE non-superseded session per claim (OPEN OR FINALIZED).
CREATE UNIQUE INDEX "claim_r9_voting_sessions_one_live_per_claim_uq" ON "claim_r9_voting_sessions" USING btree ("claim_case_id") WHERE "claim_r9_voting_sessions"."superseded_at" IS NULL;--> statement-breakpoint
CREATE INDEX "claim_r9_votes_pariwar_id_idx" ON "claim_r9_votes" USING btree ("pariwar_id");--> statement-breakpoint
CREATE INDEX "claim_r9_votes_session_id_idx" ON "claim_r9_votes" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX "claim_r9_votes_voter_actor_id_idx" ON "claim_r9_votes" USING btree ("pariwar_id","voter_actor_id","cast_at");--> statement-breakpoint
-- AC3/#5 — at most ONE live vote per panelist per session (the revise atomic-supersession backstop).
CREATE UNIQUE INDEX "claim_r9_votes_one_live_per_voter_uq" ON "claim_r9_votes" USING btree ("session_id","voter_actor_id") WHERE "claim_r9_votes"."superseded_at" IS NULL;--> statement-breakpoint
-- Tenant-isolation RLS (mirror claims-rls EXACTLY): SELECT + write (for ALL) via the Story 1.6 closed-failure
-- construct `pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid`. SYMMETRIC on BOTH tables.
CREATE POLICY "claim_r9_voting_sessions_tenant_isolation_select" ON "claim_r9_voting_sessions" AS PERMISSIVE FOR SELECT TO "twt_app" USING (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "claim_r9_voting_sessions_tenant_isolation_write" ON "claim_r9_voting_sessions" AS PERMISSIVE FOR ALL TO "twt_app" USING (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid) WITH CHECK (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "claim_r9_votes_tenant_isolation_select" ON "claim_r9_votes" AS PERMISSIVE FOR SELECT TO "twt_app" USING (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "claim_r9_votes_tenant_isolation_write" ON "claim_r9_votes" AS PERMISSIVE FOR ALL TO "twt_app" USING (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid) WITH CHECK (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid);
