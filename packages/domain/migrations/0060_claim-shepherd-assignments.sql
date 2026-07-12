-- Migration 0060 — claim shepherd assignments + users contact columns (Story 6.12, Task 1).
-- ONE NET-NEW table + ONE NEW enum + a self-FK + a partial-unique invariant + tenant-isolation RLS,
-- PLUS two additive columns on the global `users` table — in ONE hand-authored file:
--   · claim_shepherd_assignments — ONE row per shepherd ASSIGNMENT (the ASSIGNMENT-METADATA authority,
--     AC0): shepherd_actor_id (the assigned District Admin's users.id, non-PII join key) + the
--     assignment-time shepherd_display + contact SNAPSHOT (R1/R5) + assignment_reason (a bounded non-PII
--     enum) + the D-E supersedes self-FK + superseded_at. The partial-unique
--     `(claim_case_id) WHERE superseded_at IS NULL` guarantees AT MOST ONE live shepherd row per claim
--     (the concurrent-double-reassignment backstop, AC5/AC9). This table is NOT an event-sourced state
--     cache — claim STATE stays trigger-guarded on claims.current_state (migration 0051), derived from the
--     claim.* events; the assignment writers advance NOTHING on it, they emit the claim.shepherd_assigned
--     IDENTITY annotation (from_state === to_state) via claim.projectClaimState.
--   · users.contact_phone / users.contact_whatsapp — the controlled staff-CONTACT source columns (R1).
--     BOTH nullable text in canonical E.164 (existing admins have none — the provisioning write path
--     validates the shape). Plaintext BY DELIBERATE RATIFIED DECISION (their purpose is to be shown to the
--     family so they can reach their shepherd); NEVER member PII, NEVER copied into events_log.
--
-- ⚠ DO NOT REGENERATE THIS FILE with `db:generate` (same discipline as 0051–0059): the drizzle snapshot
-- baseline is frozen at 0020, so a regenerate emits a bloated catch-up migration and drizzle-kit skips an
-- already-applied migration by journal `when` (NOT SQL hash), silently dropping the hand-supplements +
-- risking 42P07 on re-run. HAND-AUTHORED: carries ONLY the shepherd-assignment DDL (the CREATE TYPE enum
-- + the CREATE TABLE + the two FKs incl. the self-FK + ENABLE/FORCE RLS + the indexes incl. the
-- partial-unique + the two CREATE POLICY declarations from
-- packages/domain/src/policies/claim-shepherd-assignments-rls.ts) + the users contact ADD COLUMNs,
-- wrapped with the hand-supplemented GRANT (SELECT/INSERT/UPDATE, NOT DELETE) + FORCE DDL (mirrors 0059).
--
-- Hand-supplements (relative to a generated DDL):
--   1. GRANT SELECT, INSERT, UPDATE on claim_shepherd_assignments to twt_app. NOT DELETE: an assignment
--      row is audit-retained (a superseded row persists as the reassignment transcript, AC5). UPDATE is
--      required for the D-E atomic supersession (SET superseded_at = now()).
--   2. ALTER TABLE ... FORCE ROW LEVEL SECURITY — applies RLS even to the (non-superuser) table owner.
--
-- The claims + users tables + roles (twt_app) already exist (migrations 0051 / 0005 / 0002). The FKs
-- (claim_shepherd_assignments.claim_case_id → claims ON DELETE CASCADE; the self-FK
-- claim_shepherd_assignments.supersedes_assignment_id → claim_shepherd_assignments ON DELETE SET NULL)
-- are emitted inline. `users` is the GLOBAL identity carve-out (identity-auth-rls) — the contact columns
-- get no pariwar predicate. No snapshot file is emitted (baseline frozen at 0020; mirror 0021–0059).

CREATE TYPE "public"."shepherd_assignment_reason" AS ENUM('initial', 'reassignment', 'fallback');--> statement-breakpoint
CREATE TABLE "claim_shepherd_assignments" (
	"assignment_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"claim_case_id" uuid NOT NULL,
	"pariwar_id" uuid NOT NULL,
	"shepherd_actor_id" text NOT NULL,
	"shepherd_display" text NOT NULL,
	"shepherd_contact_phone" text,
	"shepherd_contact_whatsapp" text,
	"assignment_reason" "shepherd_assignment_reason" NOT NULL,
	"supersedes_assignment_id" uuid,
	"superseded_at" timestamp with time zone,
	"assigned_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
-- users contact source columns — the R1 staff-CONTACT snapshot source (nullable E.164; NEVER member PII).
ALTER TABLE "users" ADD COLUMN "contact_phone" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "contact_whatsapp" text;--> statement-breakpoint
ALTER TABLE "claim_shepherd_assignments" ADD CONSTRAINT "claim_shepherd_assignments_claim_case_id_fk" FOREIGN KEY ("claim_case_id") REFERENCES "public"."claims"("claim_case_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "claim_shepherd_assignments" ADD CONSTRAINT "claim_shepherd_assignments_supersedes_assignment_id_fk" FOREIGN KEY ("supersedes_assignment_id") REFERENCES "public"."claim_shepherd_assignments"("assignment_id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
-- (1) Table privileges for the app role (SELECT/INSERT/UPDATE, NOT DELETE — audit-retained rows;
--     UPDATE is needed for the atomic supersession SET superseded_at = now()).
GRANT SELECT, INSERT, UPDATE ON "claim_shepherd_assignments" TO twt_app;--> statement-breakpoint
-- (2) Turn RLS on + FORCE it even for the (non-superuser) table owner (kept adjacent).
ALTER TABLE "claim_shepherd_assignments" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "claim_shepherd_assignments" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
-- Per-tenant scans / RLS-aware planner hint + the member/console live-shepherd read + the workload count.
CREATE INDEX "claim_shepherd_assignments_pariwar_id_idx" ON "claim_shepherd_assignments" USING btree ("pariwar_id");--> statement-breakpoint
CREATE INDEX "claim_shepherd_assignments_claim_case_id_idx" ON "claim_shepherd_assignments" USING btree ("claim_case_id");--> statement-breakpoint
CREATE INDEX "claim_shepherd_assignments_shepherd_actor_id_idx" ON "claim_shepherd_assignments" USING btree ("shepherd_actor_id");--> statement-breakpoint
-- AC5/AC9 — at most ONE live shepherd row per claim (a reassignment must supersede before/atomically-with
-- inserting the next). The concurrent-double-reassignment backstop.
CREATE UNIQUE INDEX "claim_shepherd_assignments_one_live_per_claim_uq" ON "claim_shepherd_assignments" USING btree ("claim_case_id") WHERE "claim_shepherd_assignments"."superseded_at" IS NULL;--> statement-breakpoint
-- Tenant-isolation RLS (mirror claims-rls EXACTLY): SELECT + write (for ALL) via the
-- Story 1.6 closed-failure construct `pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid`.
CREATE POLICY "claim_shepherd_assignments_tenant_isolation_select" ON "claim_shepherd_assignments" AS PERMISSIVE FOR SELECT TO "twt_app" USING (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "claim_shepherd_assignments_tenant_isolation_write" ON "claim_shepherd_assignments" AS PERMISSIVE FOR ALL TO "twt_app" USING (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid) WITH CHECK (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid);
