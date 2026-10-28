-- Migration 0188 — THE INSPECTOR'S QUESTIONNAIRE FOR THE FAMILY, and THE COMPARABLE FORM of the health answers (Story 6.32,
-- Task 2; AC2, AC5, AC6, AC9; `2026-10-28-413` IQ4 / IQ5 / IQ6). Hand-authored — ⛔ never regenerate (`db:generate` diffs
-- against the 0020 snapshot; the migrator skips by the journal `when`).
--
-- ⭐ (1) `claim_ground_inspection_questionnaires` — the HEADER, ONE per assignment: the questionnaire version PINNED at the
-- FIRST save (the neighbours' `claim_peer_mesh_replies` precedent — a newer version applies to new visits only) and
-- `started_at`. ⛔ No PII. Written once; ⛔ never updated (no UPDATE grant), deleted only by the assignment's / claim's cascade.
-- ⭐ (2) `claim_ground_inspection_answers` — APPEND-ONLY answer rows; the LIVE answer = `superseded_at IS NULL` (ONE per question
-- per assignment — a partial UNIQUE). Plaintext CODES for a non-sensitive question (the head's letter), a Tier-1 ciphertext for a
-- sensitive one (the family's cause and illness — the EXISTING `ground_inspection` field class, IQ5); `value_code_indexes` = ONE
-- keyed blind index per selected option code (IQ4 — `ANSWER_CODE_INDEX_FIELD_CLASS`, the claim case id and the question key IN
-- the hashed value), written ONLY beside the cause's / illness's ciphertext and NULL when the answer includes *"I don't know"*.
-- ⭐ THE ANSWERS TRIGGER admits ONLY: (i) an INSERT, or an UPDATE of `superseded_at` NULL → non-NULL with every other column
-- unchanged — while the assignment is `scheduled`, ⛔ a `certificate_check`, AND the claim is in the ANSWER WINDOW (the SAME
-- `claim_peer_mesh_answer_window_open` as the neighbours' — ⛔ re-composed); and (ii) the ERASURE ARM in 0143's form: nothing but
-- `value_ciphertext` (non-NULL → non-NULL) and `value_code_indexes` (→ NULL) changes. ⚠ RECORDED, as 0156 does: the erasure arm has
-- ⛔ no state condition (it cannot tell the RTBF scrub from another writer of those two columns).
-- ⭐ (3) THE NEIGHBOURS' SIDE gains the same column (`claim_peer_mesh_reply_answers.value_code_indexes`) — ⛔ no backfill: the
-- neighbours' health questions are `counselBasis: 'pending'` in every registered version, so ⛔ no such answer row exists (G4). The
-- erasure GRANT widens, and `claim_peer_mesh_reply_answers_guard` is REPLACED so its erasure arm admits `value_code_indexes` → NULL
-- (TR14 — without it the RTBF scrub of a row carrying indexes raises "an answer row is append-only").
-- ⭐ (4) 0160's two CHECKs WIDEN to the four compared keys (`has_died`, `death_date`, `death_cause`, `death_illness`) — ⚠ LOCKSTEP
-- with `INSPECTION_DISCREPANCY_RULES` (`claim/inspection-discrepancy.ts`) and `INSPECTION_DISCREPANCY_QUESTION_KEYS`.
-- ⭐ The CHECK on the index shape is the SAME on both tables: indexes only on the cause / illness, beside a ciphertext, ≥ 1.
-- Grants: header SELECT, INSERT; answers SELECT, INSERT + UPDATE (`superseded_at`) + UPDATE (`value_ciphertext`,
-- `value_code_indexes`) for erasure. ⛔ No DELETE. RLS ENABLE + FORCE, per-command tenant policies (the answers' UPDATE policy is
-- load-bearing — the scrub matches 0 rows under FORCE without it, `-279` A12). Statement order: CREATE → FKs → CHECKs → GRANT →
-- ENABLE → FORCE → POLICY → indexes (0119).

-- ── (1) the header ───────────────────────────────────────────────────────────────────────────────────────────────────────
CREATE TABLE "claim_ground_inspection_questionnaires" (
	"ground_inspection_id" uuid PRIMARY KEY NOT NULL,
	"pariwar_id" uuid NOT NULL,
	"claim_case_id" uuid NOT NULL,
	"questionnaire_version_id" text NOT NULL,
	"started_at" timestamp with time zone DEFAULT clock_timestamp() NOT NULL,
	CONSTRAINT "claim_gi_questionnaires_owner_uq" UNIQUE ("pariwar_id", "ground_inspection_id", "claim_case_id")
);--> statement-breakpoint
ALTER TABLE "claim_ground_inspection_questionnaires" ADD CONSTRAINT "claim_gi_questionnaires_inspection_fk" FOREIGN KEY ("pariwar_id", "ground_inspection_id", "claim_case_id") REFERENCES "public"."claim_ground_inspections"("pariwar_id", "ground_inspection_id", "claim_case_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "claim_ground_inspection_questionnaires" ADD CONSTRAINT "claim_gi_questionnaires_claim_case_fk" FOREIGN KEY ("pariwar_id", "claim_case_id") REFERENCES "public"."claims"("pariwar_id", "claim_case_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
-- ⛔ A `peer_mesh` version on an inspection.
ALTER TABLE "claim_ground_inspection_questionnaires" ADD CONSTRAINT "claim_gi_questionnaires_version_check" CHECK ("questionnaire_version_id" ~ '^ground_inspection\.v[0-9]+$');--> statement-breakpoint
GRANT SELECT, INSERT ON "claim_ground_inspection_questionnaires" TO twt_app;--> statement-breakpoint
ALTER TABLE "claim_ground_inspection_questionnaires" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "claim_ground_inspection_questionnaires" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "claim_gi_questionnaires_tenant_isolation_select" ON "claim_ground_inspection_questionnaires" AS PERMISSIVE FOR SELECT TO "twt_app" USING (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "claim_gi_questionnaires_tenant_isolation_insert" ON "claim_ground_inspection_questionnaires" AS PERMISSIVE FOR INSERT TO "twt_app" WITH CHECK (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid);--> statement-breakpoint
CREATE INDEX "claim_gi_questionnaires_claim_idx" ON "claim_ground_inspection_questionnaires" USING btree ("pariwar_id", "claim_case_id");--> statement-breakpoint

-- ── (2) the answers ──────────────────────────────────────────────────────────────────────────────────────────────────────
CREATE TABLE "claim_ground_inspection_answers" (
	"answer_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"pariwar_id" uuid NOT NULL,
	"claim_case_id" uuid NOT NULL,
	"ground_inspection_id" uuid NOT NULL,
	"question_key" text NOT NULL,
	"value_codes" text[],
	"value_ciphertext" text,
	"value_code_indexes" text[],
	"saved_by_actor_id" text NOT NULL,
	"saved_at" timestamp with time zone DEFAULT clock_timestamp() NOT NULL,
	"superseded_at" timestamp with time zone
);--> statement-breakpoint
-- The header must exist first (it pins the version) — and names the SAME assignment and claim.
ALTER TABLE "claim_ground_inspection_answers" ADD CONSTRAINT "claim_gi_answers_questionnaire_fk" FOREIGN KEY ("pariwar_id", "ground_inspection_id", "claim_case_id") REFERENCES "public"."claim_ground_inspection_questionnaires"("pariwar_id", "ground_inspection_id", "claim_case_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "claim_ground_inspection_answers" ADD CONSTRAINT "claim_gi_answers_claim_case_fk" FOREIGN KEY ("pariwar_id", "claim_case_id") REFERENCES "public"."claims"("pariwar_id", "claim_case_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "claim_ground_inspection_answers" ADD CONSTRAINT "claim_gi_answers_question_key_check" CHECK ("question_key" ~ '^[a-z][a-z0-9_]*$');--> statement-breakpoint
-- Exactly one of the two value forms (an erased row keeps a ciphertext — the sentinel).
ALTER TABLE "claim_ground_inspection_answers" ADD CONSTRAINT "claim_gi_answers_one_value_check" CHECK (("value_codes" IS NULL) <> ("value_ciphertext" IS NULL));--> statement-breakpoint
ALTER TABLE "claim_ground_inspection_answers" ADD CONSTRAINT "claim_gi_answers_codes_nonempty_check" CHECK ("value_codes" IS NULL OR cardinality("value_codes") >= 1);--> statement-breakpoint
-- ⚠ LOCKSTEP with `GROUND_INSPECTION_SENSITIVE_QUESTION_KEYS` (`questionnaires/keys.ts`; a policy-spec leg pins the two equal):
-- the family's cause and illness are ALWAYS a ciphertext.
ALTER TABLE "claim_ground_inspection_answers" ADD CONSTRAINT "claim_gi_answers_sensitive_encrypted_check" CHECK ("question_key" NOT IN ('death_cause', 'death_illness') OR "value_codes" IS NULL);--> statement-breakpoint
-- The code indexes only on the cause / illness, beside the ciphertext, ≥ 1 (the SAME shape as the neighbours' table, (3)).
ALTER TABLE "claim_ground_inspection_answers" ADD CONSTRAINT "claim_gi_answers_code_indexes_check" CHECK ("value_code_indexes" IS NULL OR ("question_key" IN ('death_cause', 'death_illness') AND "value_ciphertext" IS NOT NULL AND cardinality("value_code_indexes") >= 1));--> statement-breakpoint
ALTER TABLE "claim_ground_inspection_answers" ADD CONSTRAINT "claim_gi_answers_saved_by_check" CHECK (length(btrim("saved_by_actor_id")) > 0);--> statement-breakpoint
ALTER TABLE "claim_ground_inspection_answers" ADD CONSTRAINT "claim_gi_answers_superseded_order_check" CHECK ("superseded_at" IS NULL OR "superseded_at" >= "saved_at");--> statement-breakpoint
GRANT SELECT, INSERT ON "claim_ground_inspection_answers" TO twt_app;--> statement-breakpoint
GRANT UPDATE ("superseded_at", "value_ciphertext", "value_code_indexes") ON "claim_ground_inspection_answers" TO twt_app;--> statement-breakpoint
ALTER TABLE "claim_ground_inspection_answers" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "claim_ground_inspection_answers" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "claim_gi_answers_tenant_isolation_select" ON "claim_ground_inspection_answers" AS PERMISSIVE FOR SELECT TO "twt_app" USING (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "claim_gi_answers_tenant_isolation_insert" ON "claim_ground_inspection_answers" AS PERMISSIVE FOR INSERT TO "twt_app" WITH CHECK (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid);--> statement-breakpoint
-- ⚠ Load-bearing (`-279` A12): without it the supersede AND the RTBF scrub silently update 0 rows under FORCE.
CREATE POLICY "claim_gi_answers_tenant_isolation_update" ON "claim_ground_inspection_answers" AS PERMISSIVE FOR UPDATE TO "twt_app" USING (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid) WITH CHECK (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid);--> statement-breakpoint
-- ONE live answer per question per assignment (⛔ deferrable — the writer stamps the old row FIRST, then inserts).
CREATE UNIQUE INDEX "claim_gi_answers_live_uq" ON "claim_ground_inspection_answers" USING btree ("pariwar_id", "ground_inspection_id", "question_key") WHERE "superseded_at" IS NULL;--> statement-breakpoint
CREATE INDEX "claim_gi_answers_claim_idx" ON "claim_ground_inspection_answers" USING btree ("pariwar_id", "claim_case_id");--> statement-breakpoint

-- ── (1) + (2) the guards — invoker functions (under FORCE RLS a trigger sees its parent only in scope — 0156's form) ──────
-- The parent: `scheduled`, ⛔ a `certificate_check` (a certificate check asks the family ⛔ nothing — IQ10), and the claim in the
-- answer window. ONE helper, read by both tables' guards.
CREATE FUNCTION claim_gi_questionnaire_open(p_pariwar_id uuid, p_ground_inspection_id uuid, p_claim_case_id uuid)
RETURNS boolean LANGUAGE sql STABLE AS $$
  SELECT EXISTS (
    SELECT 1 FROM claim_ground_inspections gi
     WHERE gi.pariwar_id = p_pariwar_id
       AND gi.ground_inspection_id = p_ground_inspection_id
       AND gi.claim_case_id = p_claim_case_id
       AND gi.status = 'scheduled'
       AND gi.inspection_stage <> 'certificate_check'
  ) AND claim_peer_mesh_answer_window_open(p_pariwar_id, p_claim_case_id);
$$;
--> statement-breakpoint
CREATE FUNCTION claim_gi_questionnaires_guard()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NOT claim_gi_questionnaire_open(NEW.pariwar_id, NEW.ground_inspection_id, NEW.claim_case_id) THEN
    RAISE EXCEPTION
      'claim_ground_inspection_questionnaires: the inspection is not an open visit in scope, or the claim is outside the answer window (Story 6.32 IQ5)'
      USING ERRCODE = 'integrity_constraint_violation';
  END IF;
  RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER claim_gi_questionnaires_guard
  BEFORE INSERT ON claim_ground_inspection_questionnaires
  FOR EACH ROW EXECUTE FUNCTION claim_gi_questionnaires_guard();
--> statement-breakpoint
CREATE FUNCTION claim_gi_answers_guard()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  -- (ii) THE ERASURE ARM (0143's form) — ⚠ ⛔ no state condition: it cannot tell the RTBF scrub from another writer (RECORDED).
  IF TG_OP = 'UPDATE'
     AND (to_jsonb(NEW) - 'value_ciphertext' - 'value_code_indexes')
         IS NOT DISTINCT FROM (to_jsonb(OLD) - 'value_ciphertext' - 'value_code_indexes')
     AND (NEW.value_ciphertext IS NOT DISTINCT FROM OLD.value_ciphertext
          OR (OLD.value_ciphertext IS NOT NULL AND NEW.value_ciphertext IS NOT NULL))
     AND (NEW.value_code_indexes IS NOT DISTINCT FROM OLD.value_code_indexes
          OR NEW.value_code_indexes IS NULL)
     AND ((NEW.value_ciphertext IS DISTINCT FROM OLD.value_ciphertext)
          OR (NEW.value_code_indexes IS DISTINCT FROM OLD.value_code_indexes)) THEN
    RETURN NEW;
  END IF;

  -- (i) an INSERT, or `superseded_at` NULL → non-NULL with every other column unchanged.
  IF TG_OP = 'UPDATE' AND NOT (
       OLD.superseded_at IS NULL AND NEW.superseded_at IS NOT NULL
       AND (to_jsonb(NEW) - 'superseded_at') IS NOT DISTINCT FROM (to_jsonb(OLD) - 'superseded_at')) THEN
    RAISE EXCEPTION
      'claim_ground_inspection_answers: an answer row is append-only — only superseded_at NULL → set, or the erasure scrub (Story 6.32 IQ5)'
      USING ERRCODE = 'integrity_constraint_violation';
  END IF;

  IF NOT claim_gi_questionnaire_open(NEW.pariwar_id, NEW.ground_inspection_id, NEW.claim_case_id) THEN
    RAISE EXCEPTION
      'claim_ground_inspection_answers: the inspection is not an open visit in scope, or the claim is outside the answer window (Story 6.32 IQ5)'
      USING ERRCODE = 'integrity_constraint_violation';
  END IF;
  RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER claim_gi_answers_guard
  BEFORE INSERT OR UPDATE ON claim_ground_inspection_answers
  FOR EACH ROW EXECUTE FUNCTION claim_gi_answers_guard();
--> statement-breakpoint

-- ── (3) the neighbours' side — the same column, the same CHECK; the erasure grant + the guard's erasure arm widen (TR14) ──
ALTER TABLE "claim_peer_mesh_reply_answers" ADD COLUMN "value_code_indexes" text[];--> statement-breakpoint
ALTER TABLE "claim_peer_mesh_reply_answers" ADD CONSTRAINT "claim_peer_mesh_reply_answers_code_indexes_check" CHECK ("value_code_indexes" IS NULL OR ("question_key" IN ('death_cause', 'death_illness') AND "value_ciphertext" IS NOT NULL AND cardinality("value_code_indexes") >= 1));--> statement-breakpoint
GRANT UPDATE ("value_code_indexes") ON "claim_peer_mesh_reply_answers" TO twt_app;--> statement-breakpoint
-- 0156's function with ONE change: the erasure arm also admits `value_code_indexes` → NULL (and ⛔ any other change to it).
CREATE OR REPLACE FUNCTION claim_peer_mesh_reply_answers_guard()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  reply_submitted timestamptz;
  reply_found boolean;
BEGIN
  -- (ii) THE ERASURE ARM (0143's form) — ⚠ ⛔ no state condition: it cannot tell the RTBF scrub from another writer (RECORDED).
  IF TG_OP = 'UPDATE'
     AND (to_jsonb(NEW) - 'value_ciphertext' - 'death_date_window_indexes' - 'value_code_indexes')
         IS NOT DISTINCT FROM (to_jsonb(OLD) - 'value_ciphertext' - 'death_date_window_indexes' - 'value_code_indexes')
     AND (NEW.value_ciphertext IS NOT DISTINCT FROM OLD.value_ciphertext
          OR (OLD.value_ciphertext IS NOT NULL AND NEW.value_ciphertext IS NOT NULL))
     AND (NEW.death_date_window_indexes IS NOT DISTINCT FROM OLD.death_date_window_indexes
          OR NEW.death_date_window_indexes IS NULL)
     AND (NEW.value_code_indexes IS NOT DISTINCT FROM OLD.value_code_indexes
          OR NEW.value_code_indexes IS NULL)
     AND ((NEW.value_ciphertext IS DISTINCT FROM OLD.value_ciphertext)
          OR (NEW.death_date_window_indexes IS DISTINCT FROM OLD.death_date_window_indexes)
          OR (NEW.value_code_indexes IS DISTINCT FROM OLD.value_code_indexes)) THEN
    RETURN NEW;
  END IF;

  -- (i) an INSERT, or `superseded_at` NULL → non-NULL with every other column unchanged.
  IF TG_OP = 'UPDATE' AND NOT (
       OLD.superseded_at IS NULL AND NEW.superseded_at IS NOT NULL
       AND (to_jsonb(NEW) - 'superseded_at') IS NOT DISTINCT FROM (to_jsonb(OLD) - 'superseded_at')) THEN
    RAISE EXCEPTION
      'claim_peer_mesh_reply_answers: an answer row is append-only — only superseded_at NULL → set, or the erasure scrub (Story 6.27a PM7 (a))'
      USING ERRCODE = 'integrity_constraint_violation';
  END IF;

  SELECT r.submitted_at, true INTO reply_submitted, reply_found
    FROM claim_peer_mesh_replies r
   WHERE r.pariwar_id = NEW.pariwar_id AND r.reply_id = NEW.reply_id;
  IF reply_found IS NOT TRUE THEN
    RAISE EXCEPTION 'claim_peer_mesh_reply_answers: the reply is not in scope (Story 6.27a PM7 (a))'
      USING ERRCODE = 'integrity_constraint_violation';
  END IF;
  IF reply_submitted IS NOT NULL THEN
    RAISE EXCEPTION 'claim_peer_mesh_reply_answers: the reply is submitted — its answers are locked (Story 6.27a PM7 (d))'
      USING ERRCODE = 'integrity_constraint_violation';
  END IF;
  IF NOT claim_peer_mesh_answer_window_open(NEW.pariwar_id, NEW.claim_case_id) THEN
    RAISE EXCEPTION 'claim_peer_mesh_reply_answers: the claim is outside the answer window (Story 6.27a PM8)'
      USING ERRCODE = 'integrity_constraint_violation';
  END IF;
  RETURN NEW;
END;
$$;
--> statement-breakpoint

-- ── (4) 0160's two CHECKs widen to the four compared keys (drop + add) ───────────────────────────────────────────────────
ALTER TABLE "claim_ground_inspection_discrepancy_showings" DROP CONSTRAINT "claim_gi_discrepancy_showings_question_keys_check";--> statement-breakpoint
ALTER TABLE "claim_ground_inspection_discrepancy_showings" ADD CONSTRAINT "claim_gi_discrepancy_showings_question_keys_check" CHECK ("question_keys" <@ ARRAY['has_died', 'death_date', 'death_cause', 'death_illness']::text[]);--> statement-breakpoint
ALTER TABLE "claim_ground_inspection_discrepancy_notes" DROP CONSTRAINT "claim_gi_discrepancy_notes_question_key_check";--> statement-breakpoint
ALTER TABLE "claim_ground_inspection_discrepancy_notes" ADD CONSTRAINT "claim_gi_discrepancy_notes_question_key_check" CHECK ("question_key" IN ('has_died', 'death_date', 'death_cause', 'death_illness'));
