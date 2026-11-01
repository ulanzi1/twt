-- Migration 0197 — `claim_fraud_investigation_steps`, the fraud register's investigation record (Story 6.22, Task 1.2;
-- DL1; author-commit `2026-11-01-438` item 2). After 0196 (the guilty finding kind — `finding_id` references a
-- `claim_nominee_findings` row of either member kind).
--
-- One append-only row per STEP of one claim's investigation: the helpline operator's `flagged`, then the District
-- Admin's `found_innocent` | `found_guilty` (`-238` cl. 3, cl. 4). The domain writer enforces the order and that the
-- finder is ⛔ the flagger; the table enforces the shape:
--   · each step at most ONCE per claim, and at most ONE found step of either kind (two unique indexes — N1, N2);
--   · a found step carries its finding and an `alive_confirmation`; a flag carries neither (the coherence CHECK —
--     NULL-SAFE: every arm says `IS NOT NULL` / `IS NULL` explicitly, because a CHECK passes on NULL — the 0119 / 0122
--     trap);
--   · the `finding_id` FK is `ON DELETE NO ACTION` — ⛔ RESTRICT, which is checked immediately and would fail a `claims`
--     delete before both cascades (claims → findings, claims → steps) have run.
--
-- ⚠ DO NOT REGENERATE with `db:generate` (the 0021+ discipline): the drizzle snapshot is frozen at 0020 (`db:generate`
-- diffs against it ⇒ the 42P07 footgun). HAND-AUTHORED WHOLE in 0122's statement order — table, FKs, CHECKs, grants,
-- ENABLE / FORCE RLS, policies (mirroring `src/policies/claim-fraud-investigation-rls.ts`), indexes, triggers. No
-- snapshot file. The roles exist since 0002.
--
-- ── Hand-supplements ─────────────────────────────────────────────────────────────────────────────────────────────────
--   1. GRANT SELECT, INSERT + a COLUMN-LEVEL GRANT UPDATE ("note_ciphertext") to twt_app AT BIRTH — the DPDPA-RTBF scrub
--      (DL15) writes the house sentinel; ⛔ other column is updatable.
--   2. The append-only guard AT BIRTH, naming EVERY frozen column (all but `note_ciphertext`)
--      ([[project_append_only_guard_names_erasure_columns]]): UPDATE of a frozen column, DELETE (except the `claims`
--      cascade at depth > 1) and TRUNCATE are refused.

-- ══ claim_fraud_investigation_steps (DL1) ═══════════════════════════════════════════════════════════════════════════
CREATE TABLE "claim_fraud_investigation_steps" (
	"step_id" uuid PRIMARY KEY NOT NULL,
	"claim_case_id" uuid NOT NULL,
	"pariwar_id" uuid NOT NULL,
	"deceased_member_id" uuid NOT NULL,
	"step" text NOT NULL,
	"finding_id" uuid,
	"alive_confirmation" text,
	"note_ciphertext" text NOT NULL,
	"actor_id" text NOT NULL,
	"actor_display" text NOT NULL,
	"acted_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint
ALTER TABLE "claim_fraud_investigation_steps" ADD CONSTRAINT "claim_fraud_investigation_steps_claim_case_id_claims_claim_case_id_fk" FOREIGN KEY ("claim_case_id") REFERENCES "public"."claims"("claim_case_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "claim_fraud_investigation_steps" ADD CONSTRAINT "claim_fraud_investigation_steps_finding_id_fk" FOREIGN KEY ("finding_id") REFERENCES "public"."claim_nominee_findings"("finding_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "claim_fraud_investigation_steps" ADD CONSTRAINT "claim_fraud_investigation_steps_step_check" CHECK ("step" IN ('flagged', 'found_innocent', 'found_guilty'));--> statement-breakpoint
ALTER TABLE "claim_fraud_investigation_steps" ADD CONSTRAINT "claim_fraud_investigation_steps_alive_confirmation_check" CHECK ("alive_confirmation" IS NULL OR "alive_confirmation" IN ('in_person', 'video_call', 'ground_inspection'));--> statement-breakpoint
ALTER TABLE "claim_fraud_investigation_steps" ADD CONSTRAINT "claim_fraud_investigation_steps_display_check" CHECK (length(btrim("actor_display")) > 0);--> statement-breakpoint
-- The coherence CHECK — NULL-safe on every arm.
ALTER TABLE "claim_fraud_investigation_steps" ADD CONSTRAINT "claim_fraud_investigation_steps_coherence_check" CHECK (
	("step" = 'flagged' AND "finding_id" IS NULL AND "alive_confirmation" IS NULL)
	OR ("step" IN ('found_innocent', 'found_guilty') AND "finding_id" IS NOT NULL AND "alive_confirmation" IS NOT NULL)
);--> statement-breakpoint
GRANT SELECT, INSERT ON "claim_fraud_investigation_steps" TO twt_app;--> statement-breakpoint
-- The RTBF scrub's column (DL15) — ⛔ other column.
GRANT UPDATE ("note_ciphertext") ON "claim_fraud_investigation_steps" TO twt_app;--> statement-breakpoint
ALTER TABLE "claim_fraud_investigation_steps" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "claim_fraud_investigation_steps" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "claim_fraud_investigation_steps_tenant_isolation_select" ON "claim_fraud_investigation_steps" AS PERMISSIVE FOR SELECT TO "twt_app" USING (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "claim_fraud_investigation_steps_tenant_isolation_insert" ON "claim_fraud_investigation_steps" AS PERMISSIVE FOR INSERT TO "twt_app" WITH CHECK (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "claim_fraud_investigation_steps_tenant_isolation_update" ON "claim_fraud_investigation_steps" AS PERMISSIVE FOR UPDATE TO "twt_app" USING (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid) WITH CHECK (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid);--> statement-breakpoint
CREATE INDEX "claim_fraud_investigation_steps_pariwar_id_idx" ON "claim_fraud_investigation_steps" USING btree ("pariwar_id");--> statement-breakpoint
CREATE INDEX "claim_fraud_investigation_steps_deceased_member_idx" ON "claim_fraud_investigation_steps" USING btree ("pariwar_id", "deceased_member_id");--> statement-breakpoint
-- Each step at most once per claim (N1).
CREATE UNIQUE INDEX "claim_fraud_investigation_steps_one_step_per_claim_uq" ON "claim_fraud_investigation_steps" USING btree ("claim_case_id", "step");--> statement-breakpoint
-- At most ONE found step per claim, of EITHER kind (N1, N2).
CREATE UNIQUE INDEX "claim_fraud_investigation_steps_one_finding_per_claim_uq" ON "claim_fraud_investigation_steps" USING btree ("claim_case_id") WHERE step IN ('found_innocent', 'found_guilty');--> statement-breakpoint

-- Append-only, structurally and COLUMN-AWARE (the 0122 `claim_death_certificate_reviews` idiom):
--   · UPDATE   — refused unless ONLY `note_ciphertext` changed (the RTBF scrub).
--   · DELETE   — refused, EXCEPT the `ON DELETE cascade` from `claims`, at depth > 1.
--   · TRUNCATE — refused.
CREATE FUNCTION claim_fraud_investigation_steps_reject_mutation()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    IF NEW.step_id IS DISTINCT FROM OLD.step_id
       OR NEW.claim_case_id IS DISTINCT FROM OLD.claim_case_id
       OR NEW.pariwar_id IS DISTINCT FROM OLD.pariwar_id
       OR NEW.deceased_member_id IS DISTINCT FROM OLD.deceased_member_id
       OR NEW.step IS DISTINCT FROM OLD.step
       OR NEW.finding_id IS DISTINCT FROM OLD.finding_id
       OR NEW.alive_confirmation IS DISTINCT FROM OLD.alive_confirmation
       OR NEW.actor_id IS DISTINCT FROM OLD.actor_id
       OR NEW.actor_display IS DISTINCT FROM OLD.actor_display
       OR NEW.acted_at IS DISTINCT FROM OLD.acted_at THEN
      RAISE EXCEPTION
        'claim_fraud_investigation_steps is append-only — only the RTBF scrub may update a step''s note (Story 6.22 DL1)'
        USING ERRCODE = 'integrity_constraint_violation';
    END IF;
    RETURN NEW;
  END IF;
  IF TG_OP = 'DELETE' AND pg_trigger_depth() > 1 THEN
    RETURN OLD;
  END IF;
  RAISE EXCEPTION
    'claim_fraud_investigation_steps is append-only — an investigation step is never deleted (Story 6.22 DL1)'
    USING ERRCODE = 'integrity_constraint_violation';
END;
$$;
--> statement-breakpoint
CREATE TRIGGER claim_fraud_investigation_steps_no_update
  BEFORE UPDATE ON claim_fraud_investigation_steps
  FOR EACH ROW EXECUTE FUNCTION claim_fraud_investigation_steps_reject_mutation();
--> statement-breakpoint
CREATE TRIGGER claim_fraud_investigation_steps_no_delete
  BEFORE DELETE ON claim_fraud_investigation_steps
  FOR EACH ROW EXECUTE FUNCTION claim_fraud_investigation_steps_reject_mutation();
--> statement-breakpoint
CREATE TRIGGER claim_fraud_investigation_steps_no_truncate
  BEFORE TRUNCATE ON claim_fraud_investigation_steps
  EXECUTE FUNCTION claim_fraud_investigation_steps_reject_mutation();
