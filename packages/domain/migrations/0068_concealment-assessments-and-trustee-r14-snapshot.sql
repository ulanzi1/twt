-- Migration 0068 — verifier concealment-linkage assessment table + the trustee R14 clause-version snapshot
-- column (Story 6.15, Task 1). ONE NET-NEW enum + ONE NET-NEW table + its RLS/FK/partial-unique + ONE nullable
-- column on an EXISTING table, in ONE hand-authored file:
--   · claim_concealment_assessment_kind — the tri-state verifier judgement enum (linked | not_linked |
--     unable_to_determine). The human-supplied `claim.concealed_ima_condition_linked` fact (AC7, D-D).
--   · claim_concealment_assessments — the AUTHORITATIVE current/read model the tri-state concealment producer
--     reads (D-E, evidence layer 1). One live row per claim (partial-unique `(claim_case_id) WHERE
--     superseded_at IS NULL`), revisable (a revision supersedes the prior live row + points back via
--     supersedes_assessment_id). Tenant-isolation RLS (SYMMETRIC — mirrors claims-rls; no 6.13 asymmetry).
--     The note is Tier-1 ciphertext (nullable — the note is optional). This table is NOT an event-sourced
--     state cache — claim STATE stays trigger-guarded on claims.current_state; the paired
--     claim.concealment_assessed event is an IDENTITY annotation (the writers advance NOTHING on claim state).
--   · claim_state_trustee_decisions.concealment_clause_version_id — the nullable R14 rule-version snapshot
--     (AC3), resolved server-side inside the decision tx, persisted ONLY on a concealment-coded decision.
--     Scoped to THIS table ONLY (D-B — no R9 table carries an R14 snapshot).
--
-- ⚠ DO NOT REGENERATE THIS FILE with `db:generate` (same discipline as 0051–0067): the drizzle snapshot
-- baseline is frozen at 0020, so a regenerate emits a bloated catch-up migration and drizzle-kit skips an
-- already-applied migration by journal `when` (NOT SQL hash), silently dropping the hand-supplements +
-- risking 42P07 on re-run. HAND-AUTHORED: carries ONLY the 6.15 DDL (the CREATE TYPE enum + the CREATE TABLE +
-- the FKs + ENABLE/FORCE RLS + the indexes incl. the partial-unique + the two CREATE POLICY declarations from
-- packages/domain/src/policies/claim-concealment-assessments-rls.ts + the ADD COLUMN), wrapped with the
-- hand-supplemented GRANT (SELECT/INSERT/UPDATE, NOT DELETE) + FORCE DDL (mirrors 0059/0060/0062/0063).
--
-- ⚠ The `ALTER TYPE state_trustee_reason_code ADD VALUE 'concealment_override'` is in a SEPARATE migration
-- (0069) — an ADD VALUE cannot run in the same transaction that later USES the new label, and it is never
-- mixed with usage (the 6.14 0064/0065 lesson). See 0069.
--
-- The claims table + roles (twt_app) already exist (migrations 0051 / 0002). The FKs
-- (claim_concealment_assessments.claim_case_id → claims; claim_concealment_assessments.supersedes_assessment_id
-- → claim_concealment_assessments self) are emitted inline. No snapshot file is emitted (baseline frozen at
-- 0020; mirror 0021–0067).

CREATE TYPE "public"."claim_concealment_assessment_kind" AS ENUM('linked', 'not_linked', 'unable_to_determine');--> statement-breakpoint
CREATE TABLE "claim_concealment_assessments" (
	"assessment_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"claim_case_id" uuid NOT NULL,
	"pariwar_id" uuid NOT NULL,
	"kind" "claim_concealment_assessment_kind" NOT NULL,
	"note_ciphertext" text,
	"actor_id" text NOT NULL,
	"actor_display" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"superseded_at" timestamp with time zone,
	"supersedes_assessment_id" uuid
);
--> statement-breakpoint
ALTER TABLE "claim_concealment_assessments" ADD CONSTRAINT "claim_concealment_assessments_claim_case_id_fk" FOREIGN KEY ("claim_case_id") REFERENCES "public"."claims"("claim_case_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "claim_concealment_assessments" ADD CONSTRAINT "claim_concealment_assessments_supersedes_assessment_id_fk" FOREIGN KEY ("supersedes_assessment_id") REFERENCES "public"."claim_concealment_assessments"("assessment_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
-- The R14 clause-version snapshot column on the EXISTING trustee-decisions table (AC3). Nullable; the writer
-- fills it ONLY on a concealment-coded decision, aborting the tx on a null clause resolution (the 3.5 precedent).
ALTER TABLE "claim_state_trustee_decisions" ADD COLUMN "concealment_clause_version_id" text;--> statement-breakpoint
-- (1) Table privileges for the app role (SELECT/INSERT/UPDATE, NOT DELETE — audit-retained superseded rows;
--     UPDATE is needed for the supersession SET superseded_at = now()).
GRANT SELECT, INSERT, UPDATE ON "claim_concealment_assessments" TO twt_app;--> statement-breakpoint
-- (2) Turn RLS on + FORCE it even for the (non-superuser) table owner (kept adjacent).
ALTER TABLE "claim_concealment_assessments" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "claim_concealment_assessments" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
-- Per-tenant scans / RLS-aware planner hint + the per-claim live read. NO index on note (PII).
CREATE INDEX "claim_concealment_assessments_pariwar_id_idx" ON "claim_concealment_assessments" USING btree ("pariwar_id");--> statement-breakpoint
CREATE INDEX "claim_concealment_assessments_claim_case_id_idx" ON "claim_concealment_assessments" USING btree ("claim_case_id");--> statement-breakpoint
-- AC7 — at most ONE live (non-superseded) assessment per claim (the revise atomic-supersession backstop).
CREATE UNIQUE INDEX "claim_concealment_assessments_one_live_per_claim_uq" ON "claim_concealment_assessments" USING btree ("claim_case_id") WHERE "claim_concealment_assessments"."superseded_at" IS NULL;--> statement-breakpoint
-- Tenant-isolation RLS (mirror claims-rls EXACTLY): SELECT + write (for ALL) via the Story 1.6 closed-failure
-- construct `pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid`. SYMMETRIC.
CREATE POLICY "claim_concealment_assessments_tenant_isolation_select" ON "claim_concealment_assessments" AS PERMISSIVE FOR SELECT TO "twt_app" USING (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "claim_concealment_assessments_tenant_isolation_write" ON "claim_concealment_assessments" AS PERMISSIVE FOR ALL TO "twt_app" USING (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid) WITH CHECK (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid);
