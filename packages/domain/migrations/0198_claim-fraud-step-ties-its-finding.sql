-- Migration 0198 — an investigation STEP is tied to its own claim's FINDING, of the matching kind (Story 6.22, code review
-- 2026-11-02, RA5; load-bearing-invariant checklist family 5). A new migration — 0197 is applied on dev databases and is not edited.
--
-- 0197 gave `claim_fraud_investigation_steps.finding_id` a single-column FK to `claim_nominee_findings(finding_id)` and a
-- coherence CHECK that constrains only NULL-ness. So a `found_innocent` step could point at a GUILTY finding, or at ANOTHER
-- claim's finding. The release (the leaf, the overlay, peer-mesh) reads the FINDING; `closed_member_alive` and the flag picker
-- read the STEP — a mismatched pair would make them disagree. No writer produces one (`recordFraudFinding` writes both from the
-- same input), but the database should refuse it, and no production row exists yet to backfill.
--
--   (1) `claim_nominee_findings` gains UNIQUE (finding_id, claim_case_id, kind) — the composite FK's target. `finding_id` is
--       already the primary key, so every existing row satisfies it.
--   (2) the steps gain `finding_kind`, a STORED generated column: 'member_found_innocent' for a `found_innocent` step,
--       'member_found_guilty' for `found_guilty`, NULL for `flagged`. Derived from `step` (which the append-only guard already
--       freezes), so it cannot drift from it and no writer sets it.
--   (3) the single-column FK is replaced by a composite FK (finding_id, claim_case_id, finding_kind) → (finding_id,
--       claim_case_id, kind). MATCH SIMPLE: a `flagged` step has a NULL `finding_id` and a NULL `finding_kind`, so it is
--       unconstrained — and the coherence CHECK already forces `finding_id` NOT NULL on a found step, so a found step is always
--       checked. Still `ON DELETE NO ACTION` (⛔ RESTRICT: checked immediately, it would fail a `claims` delete before both
--       cascades have run — the 0197 reason).
--
-- A consequence worth knowing: at most one member finding exists per claim (0196) and a found step needs a finding of its own
-- kind on its own claim, so `claim_fraud_investigation_steps_one_finding_per_claim_uq` can no longer be reached by data the
-- composite FK admits. It stays as a belt-and-braces backstop; its spec drops the FK inside a rolled-back transaction to reach it.
--
-- ⚠ DO NOT REGENERATE with `db:generate` (the 0021+ discipline): the drizzle snapshot is frozen at 0020. HAND-AUTHORED; no
-- snapshot file; the TS schema declares the column and the FK for the reader's sake (the CHECKs live only in SQL).

ALTER TABLE "claim_nominee_findings" ADD CONSTRAINT "claim_nominee_findings_finding_claim_kind_uq" UNIQUE ("finding_id", "claim_case_id", "kind");--> statement-breakpoint
ALTER TABLE "claim_fraud_investigation_steps" ADD COLUMN "finding_kind" text GENERATED ALWAYS AS (
  CASE "step" WHEN 'found_innocent' THEN 'member_found_innocent' WHEN 'found_guilty' THEN 'member_found_guilty' END
) STORED;--> statement-breakpoint
ALTER TABLE "claim_fraud_investigation_steps" DROP CONSTRAINT "claim_fraud_investigation_steps_finding_id_fk";--> statement-breakpoint
ALTER TABLE "claim_fraud_investigation_steps" ADD CONSTRAINT "claim_fraud_investigation_steps_finding_claim_kind_fk" FOREIGN KEY ("finding_id", "claim_case_id", "finding_kind") REFERENCES "public"."claim_nominee_findings"("finding_id", "claim_case_id", "kind") ON DELETE no action ON UPDATE no action;
