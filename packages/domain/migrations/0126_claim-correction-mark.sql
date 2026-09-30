-- Migration 0126 — the "WHO MUST ACT" MARK on a correction return (Story 6.19b, Task 1 (a); AC16; the 6.19 shared
-- spec's D25 as committed in `2026-09-28-265`, `set_by_role` extended by `2026-09-29-270`).
--
-- The ruling: `2026-09-27-258` (V) — a return records WHO must put it right: the FAMILY, or STAFF. Only a return
-- whose LATEST mark is `family` reminds the family or can be closed "for no response" (shared-spec invariant 11).
-- `2026-09-27-260` G2 — the Pariwar Admin's "keep it sent back" RE-STATES the mark (6.19c's writer).
-- Hand-authored. ⛔ NOT generated (the drizzle-kit snapshots stop at 0020; regenerating an applied migration is the
-- 42P07 footgun). ⛔ NO BACKFILL — a dev/staging return with no mark opens no run; the queue shows "not set" and
-- the District Admin's change (key (7)) sets it.
--
-- ⭐ APPEND-ONLY. The LATEST row per return wins (`set_at`, which defaults to `clock_timestamp()` — ⛔ not `now()` —
-- so two marks written in ONE transaction still order). Every change is a new row: who, when, the role whose grant
-- authorised it, and a note. ⛔ No UPDATE, ⛔ no DELETE for `twt_app`.
-- ⚠ `set_by_role` admits `super_admin` (`-270`): a Super Admin holds every key, so can return a claim or change the
-- mark; ⛔ no constraint here shuts 6.19c's two writers out (the keep, and "no correction needed").
-- ⚠ The NOTE is Tier-1 (`piiColumn(1, 'claim_correction_mark')`), encrypted in the API handler as the return's own
-- `rationale_ciphertext` is — required on every row EXCEPT the return's own (whose note is the return's rationale).
-- Policies are per-command; ⛔ never `FOR ALL`. Statement order: CREATE → FKs → CHECKs → GRANT → ENABLE → FORCE →
-- POLICY → indexes (the 0122 / 0125 order).

CREATE TABLE "claim_correction_marks" (
	"mark_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"claim_case_id" uuid NOT NULL,
	"pariwar_id" uuid NOT NULL,
	"return_decision_id" uuid NOT NULL,
	"must_act" text NOT NULL,
	"is_return_mark" boolean DEFAULT false NOT NULL,
	"set_by_actor" text NOT NULL,
	"set_by_actor_display" text NOT NULL,
	"set_by_role" text NOT NULL,
	"note_ciphertext" text,
	"set_at" timestamp with time zone DEFAULT clock_timestamp() NOT NULL
);--> statement-breakpoint
ALTER TABLE "claim_correction_marks" ADD CONSTRAINT "claim_correction_marks_claim_case_id_claims_claim_case_id_fk" FOREIGN KEY ("claim_case_id") REFERENCES "public"."claims"("claim_case_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "claim_correction_marks" ADD CONSTRAINT "claim_correction_marks_return_decision_id_fk" FOREIGN KEY ("return_decision_id") REFERENCES "public"."claim_state_trustee_decisions"("decision_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
-- ⚠ LOCKSTEP with `CORRECTION_MUST_ACT` / `CORRECTION_MARK_ROLES` (schema/claim_correction_chase.ts).
ALTER TABLE "claim_correction_marks" ADD CONSTRAINT "claim_correction_marks_must_act_check" CHECK ("must_act" IN ('family', 'staff'));--> statement-breakpoint
ALTER TABLE "claim_correction_marks" ADD CONSTRAINT "claim_correction_marks_set_by_role_check" CHECK ("set_by_role" IN ('pariwar_admin', 'district_admin', 'super_admin'));--> statement-breakpoint
ALTER TABLE "claim_correction_marks" ADD CONSTRAINT "claim_correction_marks_set_by_actor_check" CHECK (length(btrim("set_by_actor")) > 0);--> statement-breakpoint
ALTER TABLE "claim_correction_marks" ADD CONSTRAINT "claim_correction_marks_set_by_actor_display_check" CHECK (length(btrim("set_by_actor_display")) > 0);--> statement-breakpoint
-- A note on every row after the return's own (D25: "a District Admin change needs a REQUIRED note").
ALTER TABLE "claim_correction_marks" ADD CONSTRAINT "claim_correction_marks_note_required_check" CHECK ("is_return_mark" OR "note_ciphertext" IS NOT NULL);--> statement-breakpoint
GRANT SELECT, INSERT ON "claim_correction_marks" TO twt_app;--> statement-breakpoint
ALTER TABLE "claim_correction_marks" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "claim_correction_marks" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "claim_correction_marks_tenant_isolation_select" ON "claim_correction_marks" AS PERMISSIVE FOR SELECT TO "twt_app" USING (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "claim_correction_marks_tenant_isolation_insert" ON "claim_correction_marks" AS PERMISSIVE FOR INSERT TO "twt_app" WITH CHECK (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid);--> statement-breakpoint
-- ⭐ The return's own mark is written ONCE, in the return's transaction.
CREATE UNIQUE INDEX "claim_correction_marks_return_mark_uq" ON "claim_correction_marks" USING btree ("return_decision_id") WHERE "is_return_mark";--> statement-breakpoint
CREATE INDEX "claim_correction_marks_return_set_at_idx" ON "claim_correction_marks" USING btree ("return_decision_id", "set_at");--> statement-breakpoint
CREATE INDEX "claim_correction_marks_pariwar_claim_idx" ON "claim_correction_marks" USING btree ("pariwar_id", "claim_case_id");
