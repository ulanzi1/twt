-- Migration 0144 — the APPROVAL-OVER-WARNING RECORD's LATER STEPS (Story 6.23b, Task 1; EA1, Trap 10, RD1, RD14; AC1).
-- Author-commit `2026-10-04-278` EA1 (as amended by `-279` A10). Hand-authored — ⛔ never regenerate.
--
-- `-277` Q2 C: every approver after the District Admin picks a reason from the SAME list while a warning shows, and each
-- such approval leaves ONE row here in its own transaction. The five later steps and the parent each one points at:
--   · `escalation_resolution`  — `resolveEscalation`'s approval           → `trustee_decision_id`
--   · `final_vote`             — `voteOnFrozenClaim`'s approval           → `trustee_decision_id`
--   · `no_correction_approval` — `approveNoCorrectionNeeded`              → `trustee_decision_id` (the chain's own row)
--   · `r9_vote`                — `castR9Vote`'s approve vote              → `r9_vote_id`
--   · `super_admin_approval`   — `decideEscalatedClosure`'s approve       → `closure_id` AND `trustee_decision_id` (A10)
-- Each later step's NOTE lives on its own decision / vote / closure row — 0143's step ⇔ note CHECK already holds (only a
-- late reason carries one), as does its step ⇔ `verifier_decision_id` CHECK (⛔ not `district_admin_`-prefixed ⇒ NULL);
-- both stay UNCHANGED. ⭐ These rows ⛔ never count toward the District Admin's coverage (`DISTRICT_ADMIN_WARNING_STEPS`).
--
-- The three FKs are COMPOSITE `(pariwar_id, …)` — the 0143 round-1 reasoning: a single-column FK bypasses RLS, so a row
-- could otherwise point at another Pariwar's decision, vote or closure. Each needs a unique target on its parent (its PK
-- already makes it unique; the pair exists only so Postgres can reference it). `ON DELETE cascade` — ⛔ never `set null`
-- (an UPDATE the append-only trigger refuses) and ⛔ never `restrict` (it would break the `claims` cascade).
-- ⛔ No trigger edit: 0143's guard compares `to_jsonb(NEW) - 'note_ciphertext'`, so the new columns are append-only as
-- they stand, and its cascade exception (`pg_trigger_depth() > 1`) covers the new parents too. ⛔ No new GRANT: the column
-- UPDATE grant stays the note's alone. ⛔ No DEFERRABLE constraint (RD14 — `closeScopeTx` swallows a COMMIT error).
--
-- Statement order as 0143: ALTER (columns) → unique targets → FKs → CHECKs → indexes.

ALTER TABLE "claim_warning_approvals" ADD COLUMN "trustee_decision_id" uuid;--> statement-breakpoint
ALTER TABLE "claim_warning_approvals" ADD COLUMN "r9_vote_id" uuid;--> statement-breakpoint
ALTER TABLE "claim_warning_approvals" ADD COLUMN "closure_id" uuid;--> statement-breakpoint
-- Backs the three composite FKs just below — redundant for uniqueness (each PK already is one).
ALTER TABLE "claim_state_trustee_decisions" ADD CONSTRAINT "claim_state_trustee_decisions_pariwar_decision_uq" UNIQUE ("pariwar_id", "decision_id");--> statement-breakpoint
ALTER TABLE "claim_r9_votes" ADD CONSTRAINT "claim_r9_votes_pariwar_vote_uq" UNIQUE ("pariwar_id", "vote_id");--> statement-breakpoint
ALTER TABLE "claim_correction_closures" ADD CONSTRAINT "claim_correction_closures_pariwar_closure_uq" UNIQUE ("pariwar_id", "closure_id");--> statement-breakpoint
ALTER TABLE "claim_warning_approvals" ADD CONSTRAINT "claim_warning_approvals_trustee_decision_fk" FOREIGN KEY ("pariwar_id", "trustee_decision_id") REFERENCES "public"."claim_state_trustee_decisions"("pariwar_id", "decision_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "claim_warning_approvals" ADD CONSTRAINT "claim_warning_approvals_r9_vote_fk" FOREIGN KEY ("pariwar_id", "r9_vote_id") REFERENCES "public"."claim_r9_votes"("pariwar_id", "vote_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "claim_warning_approvals" ADD CONSTRAINT "claim_warning_approvals_closure_fk" FOREIGN KEY ("pariwar_id", "closure_id") REFERENCES "public"."claim_correction_closures"("pariwar_id", "closure_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
-- ⚠ LOCKSTEP with `CLAIM_WARNING_APPROVAL_STEPS` (schema/claim_warning_approvals.ts) and the contracts mirror.
ALTER TABLE "claim_warning_approvals" DROP CONSTRAINT "claim_warning_approvals_step_check";--> statement-breakpoint
ALTER TABLE "claim_warning_approvals" ADD CONSTRAINT "claim_warning_approvals_step_check" CHECK ("step" IN ('district_admin_approval', 'district_admin_late_reason', 'escalation_resolution', 'final_vote', 'r9_vote', 'super_admin_approval', 'no_correction_approval'));--> statement-breakpoint
-- EXACTLY each step's own FK set (the District Admin's two steps carry none of the three).
ALTER TABLE "claim_warning_approvals" ADD CONSTRAINT "claim_warning_approvals_later_step_fk_check" CHECK (("trustee_decision_id" IS NOT NULL) = ("step" IN ('escalation_resolution', 'final_vote', 'no_correction_approval', 'super_admin_approval')) AND ("r9_vote_id" IS NOT NULL) = ("step" = 'r9_vote') AND ("closure_id" IS NOT NULL) = ("step" = 'super_admin_approval'));--> statement-breakpoint
CREATE INDEX "claim_warning_approvals_trustee_decision_idx" ON "claim_warning_approvals" USING btree ("trustee_decision_id");--> statement-breakpoint
CREATE INDEX "claim_warning_approvals_r9_vote_idx" ON "claim_warning_approvals" USING btree ("r9_vote_id");--> statement-breakpoint
CREATE INDEX "claim_warning_approvals_closure_idx" ON "claim_warning_approvals" USING btree ("closure_id");
