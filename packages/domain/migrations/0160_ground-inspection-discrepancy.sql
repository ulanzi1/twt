-- Migration 0160 — THE INSPECTOR'S DISCREPANCY SCREEN: the showing record and the re-ask notes (Story 6.27d; 6.27a PM25 (a),
-- PM17 d's half; `-304` Q3 / Q4 A, `-305` §2 item 3, `-310` CF2, `-311`). Hand-authored — ⛔ never regenerate.
--
-- At a FULL visit's completion (`death_date_source = 'family_statement'` — author reading R1) the server compares the
-- family's account with the neighbours' LIVE answers, inside the completion transaction (R2), and shows the inspector ONLY
-- the question keys that differ (`has_died` / `death_date`). Two SEPARATE tables — the completed inspection row is ⛔ not
-- frozen in the database (0055's table-wide UPDATE grant, `FOR ALL` policy; 0149 records it), so nothing here is a column
-- on it:
--   · claim_ground_inspection_discrepancy_showings — WHEN the result was first RECORDED as delivered (`shown_at`) and WHICH
--     keys it carried (possibly EMPTY — "no difference" is a row with `'{}'`; an ABSENT row means only "never delivered,
--     or the write failed"). ⛔ No values, ⛔ no PII. ONE per assignment; ⛔ never updated or deleted (but by cascade).
--   · claim_ground_inspection_discrepancy_notes — the family's re-told answer, ONE per (assignment, question key) the
--     showing carried. Tier-1 (`ground_inspection` field class — R6), free text that may hold a cause of death (`-304` Q4 A:
--     counsel's scope before go-live). Append-only but for the DPDPA-RTBF scrub (0143's erasure arm). The author's actor id
--     and stored admin display name (R4a) are staff data.
--
-- ⚠ `claim_ground_inspections` had ONLY its primary key (0055; its FKs are single-column) ⇒ an ownership UNIQUE
-- (`pariwar_id, ground_inspection_id, claim_case_id` — 0157's form) so a child's composite FK can ⛔ never name another
-- Pariwar's or another claim's inspection.
--
-- Triggers (invoker functions; a trigger reading its parent under FORCE RLS sees it only in scope — 0156's answer trigger):
--   (a) BEFORE INSERT on BOTH tables: the parent must be, in the inserting transaction's view, `completed` AND
--       `family_statement` (R1); on the notes table the key must also be IN that assignment's showing (⛔ no showing ⇒
--       refused). The backstop for an UNGUARDED writer — the API's guarded `INSERT … SELECT` filters first and yields 0 rows
--       (it detects a non-persisted parent itself). ⚠ The trigger cannot tell whether an insert shares the completion's own
--       transaction; the writers never do that (the showing is written post-commit, in its OWN transaction).
--   (b) showings: UPDATE refused; DELETE only inside a cascade (`pg_trigger_depth() > 1`); TRUNCATE refused (0143's form).
--   (c) notes: the erasure arm in 0143's form — an UPDATE passes ONLY when nothing but `note_ciphertext` changes and it stays
--       non-NULL; DELETE only inside a cascade; TRUNCATE refused. ⚠ The trigger cannot tell the RTBF scrub from any other
--       writer (as 0149 records for its own arm) — "never edited" is a property of the WRITERS, backed by the column grant.
-- Every refusal raises `integrity_constraint_violation` (23000), as 0143: both tables join the cascade set of
-- `claim-death-certificate-policy-regression.spec.ts`'s TRUNCATE leg (via 0147's `compared_certificate_upload_id`).
--
-- Statement order: CREATE → FKs → CHECKs → GRANT → ENABLE → FORCE → POLICY → indexes (0119). Per-command policies; ⛔ no
-- DELETE policy, ⛔ never `FOR ALL`.

ALTER TABLE "claim_ground_inspections" ADD CONSTRAINT "claim_ground_inspections_owner_uq" UNIQUE ("pariwar_id", "ground_inspection_id", "claim_case_id");--> statement-breakpoint

-- ── (1) the showings ─────────────────────────────────────────────────────────────────────────────────────────────────────
CREATE TABLE "claim_ground_inspection_discrepancy_showings" (
	"ground_inspection_id" uuid PRIMARY KEY NOT NULL,
	"pariwar_id" uuid NOT NULL,
	"claim_case_id" uuid NOT NULL,
	"question_keys" text[] NOT NULL,
	"shown_at" timestamp with time zone DEFAULT clock_timestamp() NOT NULL
);--> statement-breakpoint
ALTER TABLE "claim_ground_inspection_discrepancy_showings" ADD CONSTRAINT "claim_gi_discrepancy_showings_inspection_fk" FOREIGN KEY ("pariwar_id", "ground_inspection_id", "claim_case_id") REFERENCES "public"."claim_ground_inspections"("pariwar_id", "ground_inspection_id", "claim_case_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "claim_ground_inspection_discrepancy_showings" ADD CONSTRAINT "claim_gi_discrepancy_showings_claim_case_fk" FOREIGN KEY ("pariwar_id", "claim_case_id") REFERENCES "public"."claims"("pariwar_id", "claim_case_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
-- ⚠ LOCKSTEP with the compared keys of `claim/inspection-discrepancy.ts` (a policy-spec leg pins them equal).
ALTER TABLE "claim_ground_inspection_discrepancy_showings" ADD CONSTRAINT "claim_gi_discrepancy_showings_question_keys_check" CHECK ("question_keys" <@ ARRAY['has_died', 'death_date']::text[]);--> statement-breakpoint
GRANT SELECT, INSERT ON "claim_ground_inspection_discrepancy_showings" TO twt_app;--> statement-breakpoint
ALTER TABLE "claim_ground_inspection_discrepancy_showings" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "claim_ground_inspection_discrepancy_showings" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "claim_gi_discrepancy_showings_tenant_isolation_select" ON "claim_ground_inspection_discrepancy_showings" AS PERMISSIVE FOR SELECT TO "twt_app" USING (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "claim_gi_discrepancy_showings_tenant_isolation_insert" ON "claim_ground_inspection_discrepancy_showings" AS PERMISSIVE FOR INSERT TO "twt_app" WITH CHECK (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid);--> statement-breakpoint
-- The staff view reads a claim's showings in ONE statement (per claim, ⛔ per assignment).
CREATE INDEX "claim_gi_discrepancy_showings_claim_idx" ON "claim_ground_inspection_discrepancy_showings" USING btree ("pariwar_id", "claim_case_id");--> statement-breakpoint

-- ── (2) the notes ────────────────────────────────────────────────────────────────────────────────────────────────────────
CREATE TABLE "claim_ground_inspection_discrepancy_notes" (
	"note_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"pariwar_id" uuid NOT NULL,
	"claim_case_id" uuid NOT NULL,
	"ground_inspection_id" uuid NOT NULL,
	"question_key" text NOT NULL,
	"note_ciphertext" text NOT NULL,
	"author_actor_id" text NOT NULL,
	"author_display" text NOT NULL,
	"noted_at" timestamp with time zone DEFAULT clock_timestamp() NOT NULL,
	CONSTRAINT "claim_gi_discrepancy_notes_question_uq" UNIQUE ("ground_inspection_id", "question_key")
);--> statement-breakpoint
ALTER TABLE "claim_ground_inspection_discrepancy_notes" ADD CONSTRAINT "claim_gi_discrepancy_notes_inspection_fk" FOREIGN KEY ("pariwar_id", "ground_inspection_id", "claim_case_id") REFERENCES "public"."claim_ground_inspections"("pariwar_id", "ground_inspection_id", "claim_case_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "claim_ground_inspection_discrepancy_notes" ADD CONSTRAINT "claim_gi_discrepancy_notes_claim_case_fk" FOREIGN KEY ("pariwar_id", "claim_case_id") REFERENCES "public"."claims"("pariwar_id", "claim_case_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "claim_ground_inspection_discrepancy_notes" ADD CONSTRAINT "claim_gi_discrepancy_notes_question_key_check" CHECK ("question_key" IN ('has_died', 'death_date'));--> statement-breakpoint
-- ⚠ ⛔ No CHECK on `note_ciphertext` beyond NOT NULL — the erasure scrub writes a non-NULL sentinel.
ALTER TABLE "claim_ground_inspection_discrepancy_notes" ADD CONSTRAINT "claim_gi_discrepancy_notes_author_check" CHECK (length(btrim("author_actor_id")) > 0 AND length(btrim("author_display")) > 0);--> statement-breakpoint
GRANT SELECT, INSERT ON "claim_ground_inspection_discrepancy_notes" TO twt_app;--> statement-breakpoint
-- The DPDPA-RTBF scrub ONLY — ⛔ never a staff edit. Without it the scrub fails 42501.
GRANT UPDATE ("note_ciphertext") ON "claim_ground_inspection_discrepancy_notes" TO twt_app;--> statement-breakpoint
ALTER TABLE "claim_ground_inspection_discrepancy_notes" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "claim_ground_inspection_discrepancy_notes" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "claim_gi_discrepancy_notes_tenant_isolation_select" ON "claim_ground_inspection_discrepancy_notes" AS PERMISSIVE FOR SELECT TO "twt_app" USING (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "claim_gi_discrepancy_notes_tenant_isolation_insert" ON "claim_ground_inspection_discrepancy_notes" AS PERMISSIVE FOR INSERT TO "twt_app" WITH CHECK (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid);--> statement-breakpoint
-- ⚠ Load-bearing (`-279` A12): without it the RTBF scrub silently updates 0 rows under FORCE.
CREATE POLICY "claim_gi_discrepancy_notes_tenant_isolation_update" ON "claim_ground_inspection_discrepancy_notes" AS PERMISSIVE FOR UPDATE TO "twt_app" USING (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid) WITH CHECK (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid);--> statement-breakpoint
-- The staff view and the erasure scrub read a claim's notes (per claim).
CREATE INDEX "claim_gi_discrepancy_notes_claim_idx" ON "claim_ground_inspection_discrepancy_notes" USING btree ("pariwar_id", "claim_case_id");--> statement-breakpoint

-- ── (3a) the parent guard — BOTH tables, BEFORE INSERT (one function per table: plpgsql resolves `NEW.<column>` per table) ─
CREATE FUNCTION claim_gi_discrepancy_showings_guard()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM claim_ground_inspections gi
     WHERE gi.pariwar_id = NEW.pariwar_id
       AND gi.ground_inspection_id = NEW.ground_inspection_id
       AND gi.claim_case_id = NEW.claim_case_id
       AND gi.status = 'completed'
       AND gi.death_date_source = 'family_statement'
  ) THEN
    RAISE EXCEPTION
      'claim_ground_inspection_discrepancy_showings: the inspection is not a completed full visit in scope (Story 6.27d R1)'
      USING ERRCODE = 'integrity_constraint_violation';
  END IF;
  RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE FUNCTION claim_gi_discrepancy_notes_guard()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM claim_ground_inspections gi
     WHERE gi.pariwar_id = NEW.pariwar_id
       AND gi.ground_inspection_id = NEW.ground_inspection_id
       AND gi.claim_case_id = NEW.claim_case_id
       AND gi.status = 'completed'
       AND gi.death_date_source = 'family_statement'
  ) THEN
    RAISE EXCEPTION
      'claim_ground_inspection_discrepancy_notes: the inspection is not a completed full visit in scope (Story 6.27d R1)'
      USING ERRCODE = 'integrity_constraint_violation';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM claim_ground_inspection_discrepancy_showings s
     WHERE s.pariwar_id = NEW.pariwar_id
       AND s.ground_inspection_id = NEW.ground_inspection_id
       AND NEW.question_key = ANY (s.question_keys)
  ) THEN
    RAISE EXCEPTION
      'claim_ground_inspection_discrepancy_notes: the question was not shown as a difference (Story 6.27d AC6)'
      USING ERRCODE = 'integrity_constraint_violation';
  END IF;
  RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER claim_gi_discrepancy_showings_parent_guard
  BEFORE INSERT ON claim_ground_inspection_discrepancy_showings
  FOR EACH ROW EXECUTE FUNCTION claim_gi_discrepancy_showings_guard();
--> statement-breakpoint
CREATE TRIGGER claim_gi_discrepancy_notes_parent_guard
  BEFORE INSERT ON claim_ground_inspection_discrepancy_notes
  FOR EACH ROW EXECUTE FUNCTION claim_gi_discrepancy_notes_guard();
--> statement-breakpoint

-- ── (3b) the showings — ⛔ never updated; deleted only by cascade; ⛔ never truncated ─────────────────────────────────────
CREATE FUNCTION claim_gi_discrepancy_showings_reject_mutation()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'DELETE' AND pg_trigger_depth() > 1 THEN
    RETURN OLD;
  END IF;
  RAISE EXCEPTION
    'claim_ground_inspection_discrepancy_showings is append-only — a showing is never changed or deleted (Story 6.27d AC5)'
    USING ERRCODE = 'integrity_constraint_violation';
END;
$$;
--> statement-breakpoint
CREATE TRIGGER claim_gi_discrepancy_showings_no_update
  BEFORE UPDATE ON claim_ground_inspection_discrepancy_showings
  FOR EACH ROW EXECUTE FUNCTION claim_gi_discrepancy_showings_reject_mutation();
--> statement-breakpoint
CREATE TRIGGER claim_gi_discrepancy_showings_no_delete
  BEFORE DELETE ON claim_ground_inspection_discrepancy_showings
  FOR EACH ROW EXECUTE FUNCTION claim_gi_discrepancy_showings_reject_mutation();
--> statement-breakpoint
CREATE TRIGGER claim_gi_discrepancy_showings_no_truncate
  BEFORE TRUNCATE ON claim_ground_inspection_discrepancy_showings
  EXECUTE FUNCTION claim_gi_discrepancy_showings_reject_mutation();
--> statement-breakpoint

-- ── (3c) the notes — the erasure arm (0143's form); deleted only by cascade; ⛔ never truncated ───────────────────────────
CREATE FUNCTION claim_gi_discrepancy_notes_reject_mutation()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    IF (to_jsonb(NEW) - 'note_ciphertext') IS NOT DISTINCT FROM (to_jsonb(OLD) - 'note_ciphertext')
       AND OLD.note_ciphertext IS NOT NULL AND NEW.note_ciphertext IS NOT NULL THEN
      RETURN NEW;
    END IF;
    RAISE EXCEPTION
      'claim_ground_inspection_discrepancy_notes is append-only — only the RTBF note scrub may update a note (Story 6.27d AC8)'
      USING ERRCODE = 'integrity_constraint_violation';
  END IF;
  IF TG_OP = 'DELETE' AND pg_trigger_depth() > 1 THEN
    RETURN OLD;
  END IF;
  RAISE EXCEPTION
    'claim_ground_inspection_discrepancy_notes is append-only — a note is never deleted (Story 6.27d AC8)'
    USING ERRCODE = 'integrity_constraint_violation';
END;
$$;
--> statement-breakpoint
CREATE TRIGGER claim_gi_discrepancy_notes_no_update
  BEFORE UPDATE ON claim_ground_inspection_discrepancy_notes
  FOR EACH ROW EXECUTE FUNCTION claim_gi_discrepancy_notes_reject_mutation();
--> statement-breakpoint
CREATE TRIGGER claim_gi_discrepancy_notes_no_delete
  BEFORE DELETE ON claim_ground_inspection_discrepancy_notes
  FOR EACH ROW EXECUTE FUNCTION claim_gi_discrepancy_notes_reject_mutation();
--> statement-breakpoint
CREATE TRIGGER claim_gi_discrepancy_notes_no_truncate
  BEFORE TRUNCATE ON claim_ground_inspection_discrepancy_notes
  EXECUTE FUNCTION claim_gi_discrepancy_notes_reject_mutation();
