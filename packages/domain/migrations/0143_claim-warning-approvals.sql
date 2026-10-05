-- Migration 0143 — the APPROVAL-OVER-WARNING RECORD (Story 6.23a, Task 1; NW13, NW14, NW18; AC3, AC7, AC8). Author-commit
-- `2026-10-04-278` NW13 (as amended by `-279` A12 and `-280`). Hand-authored — ⛔ never regenerate.
--
-- ⭐ Why a record (fact 4): the warnings move with the accepted certificate date, so "which warnings the District Admin's
-- approval covered" can ⛔ never be recomputed later. Each approval over a warning SNAPSHOTS the warning KEYS it covered
-- and the reason chosen; `-277` Q3 B's question becomes "is every CURRENT key covered?" — per warning, ⛔ not per kind.
--
-- Steps (6.23a's two; 6.23b widens the CHECK):
--   · `district_admin_approval`    — written by `adjudicateClaim` in the approve's own transaction when a warning shows.
--                                    Its note is the decision row's rationale (⛔ not here).
--   · `district_admin_late_reason` — the District Admin's (any `claim.approve` holder's) answer to a warning that appeared
--                                    AFTER that approval (NW14). Its OWN note, Tier-1 (`claim_warning_approval`).
-- `verifier_decision_id` is the PROVENANCE (the live approval it answers), ⛔ not the key — coverage is keyed to the CLAIM
-- (Trap 13). NOT NULL ⇔ a `district_admin_*` step, so 6.23b's later steps need ⛔ no `DROP NOT NULL`.
-- `reason_id` NULL ⇔ the built-in generic (`warnings_reviewed` — a code constant, ⛔ never a row); otherwise a COMPOSITE FK
-- `(pariwar_id, reason_id)`, so a row can ⛔ never point at another Pariwar's reason.
-- ⭐ `claim_case_id` and `verifier_decision_id` are ALSO composite FKs, `(pariwar_id, …)` (code review 2026-10-05) — the
-- SAME reasoning as `reason_id`'s: a single-column FK bypasses RLS, so nothing would otherwise stop a row pointing at
-- another Pariwar's claim or decision. Backed by two NEW unique constraints on the pre-existing `claims` and
-- `claim_verifier_decisions` tables (their own PK already makes each unique; the pair is only needed so Postgres has
-- something to reference) — added here, not in 0001–0141 (⛔ never edited).
-- `deceased_member_id` is here for ERASURE (Trap 14 — the `nominee_determinations` shape: the anonymizer filters on it
-- directly). Display names are SNAPSHOTTED staff data.
--
-- Append-only (NW18 — a written note is ⛔ never replaced):
--   · GRANT SELECT, INSERT + a column UPDATE on `note_ciphertext` for the DPDPA-RTBF scrub ONLY;
--   · a BEFORE trigger: an UPDATE of anything but the note is refused (the jsonb compare — Trap 17(b)); a DELETE is
--     refused except inside a cascade (`claims` → here, and `claims` → `claim_verifier_decisions` → here — Trap 17(a));
--     TRUNCATE refused.
-- `verifier_decision_id` is `ON DELETE cascade` — ⛔ never `set null` (an UPDATE the trigger refuses, and it would break the
-- step ⇔ decision CHECK) and ⛔ never `restrict` (it would break the claims cascade).
--
-- Statement order: CREATE → FKs → CHECKs → GRANT → ENABLE → FORCE → POLICY → indexes (0119). Per-command policies; ⛔ no
-- DELETE policy, ⛔ never `FOR ALL`.

CREATE TABLE "claim_warning_approvals" (
	"record_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"pariwar_id" uuid NOT NULL,
	"claim_case_id" uuid NOT NULL,
	"deceased_member_id" uuid NOT NULL,
	"step" text NOT NULL,
	"verifier_decision_id" uuid,
	"reason_code" text NOT NULL,
	"reason_id" uuid,
	"covered_keys" text[] NOT NULL,
	"note_ciphertext" text,
	"recorded_by_actor" text NOT NULL,
	"recorded_by_display" text NOT NULL,
	"recorded_at" timestamp with time zone DEFAULT clock_timestamp() NOT NULL
);--> statement-breakpoint
-- Backs the two composite FKs just below — redundant for uniqueness (each PK already is one), needed only so
-- Postgres has a unique target to reference (code review 2026-10-05; mirrors `reason_id`'s own composite FK).
ALTER TABLE "claims" ADD CONSTRAINT "claims_pariwar_claim_case_uq" UNIQUE ("pariwar_id", "claim_case_id");--> statement-breakpoint
ALTER TABLE "claim_verifier_decisions" ADD CONSTRAINT "claim_verifier_decisions_pariwar_decision_uq" UNIQUE ("pariwar_id", "decision_id");--> statement-breakpoint
ALTER TABLE "claim_warning_approvals" ADD CONSTRAINT "claim_warning_approvals_claim_case_fk" FOREIGN KEY ("pariwar_id", "claim_case_id") REFERENCES "public"."claims"("pariwar_id", "claim_case_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "claim_warning_approvals" ADD CONSTRAINT "claim_warning_approvals_verifier_decision_fk" FOREIGN KEY ("pariwar_id", "verifier_decision_id") REFERENCES "public"."claim_verifier_decisions"("pariwar_id", "decision_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "claim_warning_approvals" ADD CONSTRAINT "claim_warning_approvals_reason_fk" FOREIGN KEY ("pariwar_id", "reason_id") REFERENCES "public"."approval_warning_reasons"("pariwar_id", "reason_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
-- ⚠ LOCKSTEP with `CLAIM_WARNING_APPROVAL_STEPS` (schema/claim_warning_approvals.ts) and the contracts mirror.
ALTER TABLE "claim_warning_approvals" ADD CONSTRAINT "claim_warning_approvals_step_check" CHECK ("step" IN ('district_admin_approval', 'district_admin_late_reason'));--> statement-breakpoint
-- The District Admin's steps carry the live approval they answer; every later step (6.23b) carries none.
ALTER TABLE "claim_warning_approvals" ADD CONSTRAINT "claim_warning_approvals_step_decision_check" CHECK ((left("step", 15) = 'district_admin_') = ("verifier_decision_id" IS NOT NULL));--> statement-breakpoint
-- Only a late reason carries its OWN note; every other step's note lives on its own decision row.
ALTER TABLE "claim_warning_approvals" ADD CONSTRAINT "claim_warning_approvals_step_note_check" CHECK (("step" = 'district_admin_late_reason') = ("note_ciphertext" IS NOT NULL));--> statement-breakpoint
-- NULL `reason_id` ⇔ the built-in generic (⚠ LOCKSTEP with `APPROVAL_WARNING_GENERIC_REASON.code`).
ALTER TABLE "claim_warning_approvals" ADD CONSTRAINT "claim_warning_approvals_generic_reason_check" CHECK (("reason_id" IS NULL) = ("reason_code" = 'warnings_reviewed'));--> statement-breakpoint
ALTER TABLE "claim_warning_approvals" ADD CONSTRAINT "claim_warning_approvals_covered_keys_check" CHECK (cardinality("covered_keys") >= 1);--> statement-breakpoint
ALTER TABLE "claim_warning_approvals" ADD CONSTRAINT "claim_warning_approvals_recorded_by_check" CHECK (length(btrim("recorded_by_actor")) > 0 AND length(btrim("recorded_by_display")) > 0);--> statement-breakpoint
GRANT SELECT, INSERT ON "claim_warning_approvals" TO twt_app;--> statement-breakpoint
-- The DPDPA-RTBF scrub ONLY (Trap 14) — ⛔ never a staff edit (NW18).
GRANT UPDATE ("note_ciphertext") ON "claim_warning_approvals" TO twt_app;--> statement-breakpoint
ALTER TABLE "claim_warning_approvals" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "claim_warning_approvals" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "claim_warning_approvals_tenant_isolation_select" ON "claim_warning_approvals" AS PERMISSIVE FOR SELECT TO "twt_app" USING (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "claim_warning_approvals_tenant_isolation_insert" ON "claim_warning_approvals" AS PERMISSIVE FOR INSERT TO "twt_app" WITH CHECK (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid);--> statement-breakpoint
-- ⚠ Load-bearing (`-279` A12): without it the RTBF scrub silently updates 0 rows under FORCE.
CREATE POLICY "claim_warning_approvals_tenant_isolation_update" ON "claim_warning_approvals" AS PERMISSIVE FOR UPDATE TO "twt_app" USING (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid) WITH CHECK (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid);--> statement-breakpoint
CREATE INDEX "claim_warning_approvals_pariwar_claim_idx" ON "claim_warning_approvals" USING btree ("pariwar_id", "claim_case_id");--> statement-breakpoint
CREATE INDEX "claim_warning_approvals_verifier_decision_idx" ON "claim_warning_approvals" USING btree ("verifier_decision_id");--> statement-breakpoint
CREATE INDEX "claim_warning_approvals_deceased_member_idx" ON "claim_warning_approvals" USING btree ("pariwar_id", "deceased_member_id");--> statement-breakpoint
CREATE INDEX "claim_warning_approvals_reason_idx" ON "claim_warning_approvals" USING btree ("pariwar_id", "reason_id");--> statement-breakpoint

CREATE FUNCTION claim_warning_approvals_reject_mutation()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    IF (to_jsonb(NEW) - 'note_ciphertext') IS DISTINCT FROM (to_jsonb(OLD) - 'note_ciphertext') THEN
      RAISE EXCEPTION
        'claim_warning_approvals is append-only — only the RTBF note scrub may update a record (Story 6.23a NW13, NW18)'
        USING ERRCODE = 'integrity_constraint_violation';
    END IF;
    RETURN NEW;
  END IF;
  IF TG_OP = 'DELETE' AND pg_trigger_depth() > 1 THEN
    RETURN OLD;
  END IF;
  RAISE EXCEPTION
    'claim_warning_approvals is append-only — a record of an approval over a warning is never deleted (Story 6.23a NW13)'
    USING ERRCODE = 'integrity_constraint_violation';
END;
$$;
--> statement-breakpoint
CREATE TRIGGER claim_warning_approvals_no_update
  BEFORE UPDATE ON claim_warning_approvals
  FOR EACH ROW EXECUTE FUNCTION claim_warning_approvals_reject_mutation();
--> statement-breakpoint
CREATE TRIGGER claim_warning_approvals_no_delete
  BEFORE DELETE ON claim_warning_approvals
  FOR EACH ROW EXECUTE FUNCTION claim_warning_approvals_reject_mutation();
--> statement-breakpoint
CREATE TRIGGER claim_warning_approvals_no_truncate
  BEFORE TRUNCATE ON claim_warning_approvals
  EXECUTE FUNCTION claim_warning_approvals_reject_mutation();
