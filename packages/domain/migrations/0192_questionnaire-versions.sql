-- Migration 0192 — THE QUESTIONNAIRE CHAIN: staff-written versions of the neighbours' and the inspector's questionnaires and
-- every step they take (Story 6.33, Task 2; AC2; `2026-10-10-304` Q7 / Q8, `2026-10-30-421` QE2 / QE3 / QE11). Hand-authored —
-- ⛔ never regenerate (`db:generate` diffs against the 0020 snapshot; the migrator skips by the journal `when`).
--
-- ⭐ (1) `questionnaire_versions` — ONE IMMUTABLE row per database version: the definition (JSONB — the `QuestionnaireDefinition`;
-- its `scope` / `status` are ⛔ meaningful here: the reader serves it with constants — QE12 R1), what it was started from
-- (`base_version_id`), the CODE version whose ruled questions it carries (`ruled_base_code_version_id` — QE5; recorded at write),
-- the Pariwar it was written in (NULL = written at all-Pariwar scope by the Super Admin — always a DIRECT version), who wrote it,
-- and the Super Admin's direct path (`direct` + its required `reason`). Numbered from 1000 (QE3 — code versions stay below it, so a
-- later reviewed code version can ⛔ take an id a database already holds); the numbering lock is the app's, `UNIQUE (kind,
-- version)` the backstop. The id is generated APP-side (QE4: the server stamps `chain:<id>` before validating) — ⛔ a default.
-- ⭐ (2) `questionnaire_version_steps` — the chain's log, one row per step. Current state is DERIVED from the steps by `seq`
-- (⛔ a status column; ⛔ `at` — three steps in one transaction share `now()`). `target_pariwar_id` is RESOLUTION only (a
-- `made_live` for P / for all = NULL; a `pariwar_reverted` names P); `scope_pariwar_id` is TENANCY only (the four tenant steps:
-- the version's origin; `made_live` / `pariwar_reverted`: the target; NULL ⇔ written through the global path).
-- ⭐ BOTH tables are APPEND-ONLY: ⛔ UPDATE / DELETE grant, and a trigger that refuses UPDATE / DELETE / TRUNCATE for EVERY role
-- (a change is a NEW version — I2). ⛔ A distinct-actor trigger (QE6: the approver MAY be the author — `-304`'s *"or their own"*).
-- ⭐ RLS (QE11): versions SELECT `USING (true)` — a Pariwar's pinned version can originate in ANOTHER Pariwar (made live for all)
-- and question text is reference data every tenant already reads from the code registry; versions INSERT only for the CURRENT
-- Pariwar and ⛔ `direct` (every direct version is written through the global path); steps SELECT own-scope OR global rows OR ANY step of a version the Pariwar ORIGINATED (review RV2: a `made_live` for ANOTHER Pariwar is scoped to that target and was invisible to the origin, whose `withdraw` then read the stage as `approved`);
-- steps INSERT own-scope AND only the four tenant steps (`made_live` / `pariwar_reverted` / a NULL scope only via the global
-- path). ⚠ The step / kind columns are TEXT + CHECK (⛔ an enum: a value added in the same transaction cannot be used — 55P04).
-- ⚠ RE-EXAMINE the steps SELECT's third leg (review RV2 / RP20) when ANY new consumer returns step rows from a TENANT handle: the origin Pariwar can read the
-- target's uuid, the Super Admin's name and the time of a `made_live` for another Pariwar; the API's `shownSteps()` is what withholds them.
-- Statement order: CREATE → FKs → CHECKs → GRANT → ENABLE → FORCE → POLICY → indexes → triggers (0119).

-- ── (1) the versions ─────────────────────────────────────────────────────────────────────────────────────────────────────
CREATE TABLE "questionnaire_versions" (
	"id" uuid PRIMARY KEY NOT NULL,
	"kind" text NOT NULL,
	"version" integer NOT NULL,
	"version_id" text NOT NULL,
	"base_version_id" text NOT NULL,
	"ruled_base_code_version_id" text NOT NULL,
	"origin_pariwar_id" uuid,
	"definition" jsonb NOT NULL,
	"authored_by_actor" text NOT NULL,
	"authored_by_display" text NOT NULL,
	"authored_at" timestamp with time zone DEFAULT clock_timestamp() NOT NULL,
	"direct" boolean NOT NULL,
	"reason" text,
	CONSTRAINT "questionnaire_versions_version_id_uq" UNIQUE ("version_id"),
	CONSTRAINT "questionnaire_versions_kind_version_uq" UNIQUE ("kind", "version")
);--> statement-breakpoint
ALTER TABLE "questionnaire_versions" ADD CONSTRAINT "questionnaire_versions_kind_check" CHECK ("kind" IN ('peer_mesh', 'ground_inspection'));--> statement-breakpoint
ALTER TABLE "questionnaire_versions" ADD CONSTRAINT "questionnaire_versions_version_id_check" CHECK ("version_id" ~ '^(peer_mesh|ground_inspection)\.v[0-9]+$' AND "version_id" = "kind" || '.v' || "version");--> statement-breakpoint
-- QE3 — ⚠ LOCKSTEP with `DB_VERSION_FLOOR` (`questionnaires/keys.ts`; a policy-spec leg pins the two equal).
ALTER TABLE "questionnaire_versions" ADD CONSTRAINT "questionnaire_versions_floor_check" CHECK ("version" >= 1000);--> statement-breakpoint
ALTER TABLE "questionnaire_versions" ADD CONSTRAINT "questionnaire_versions_base_check" CHECK ("base_version_id" ~ ('^' || "kind" || '\.v[0-9]+$') AND "ruled_base_code_version_id" ~ ('^' || "kind" || '\.v[0-9]+$'));--> statement-breakpoint
-- The definition names THIS version (a JSONB compare: ⛔ a cast that would raise 22P02 on a malformed row).
ALTER TABLE "questionnaire_versions" ADD CONSTRAINT "questionnaire_versions_definition_check" CHECK (jsonb_typeof("definition") = 'object' AND "definition"->'versionId' = to_jsonb("version_id") AND "definition"->'version' = to_jsonb("version") AND "definition"->'kind' = to_jsonb("kind"));--> statement-breakpoint
-- The Super Admin's direct path carries its reason (≤ 500 — QE7 (c)); a NULL origin is ALWAYS a direct version (⛔ a global propose route).
ALTER TABLE "questionnaire_versions" ADD CONSTRAINT "questionnaire_versions_reason_check" CHECK (("reason" IS NULL OR char_length("reason") <= 500) AND (NOT "direct" OR length(btrim(coalesce("reason", ''))) > 0));--> statement-breakpoint
ALTER TABLE "questionnaire_versions" ADD CONSTRAINT "questionnaire_versions_origin_check" CHECK ("origin_pariwar_id" IS NOT NULL OR "direct");--> statement-breakpoint
ALTER TABLE "questionnaire_versions" ADD CONSTRAINT "questionnaire_versions_author_check" CHECK (length(btrim("authored_by_actor")) > 0 AND length(btrim("authored_by_display")) > 0);--> statement-breakpoint
GRANT SELECT, INSERT ON "questionnaire_versions" TO twt_app;--> statement-breakpoint
ALTER TABLE "questionnaire_versions" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "questionnaire_versions" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "questionnaire_versions_read" ON "questionnaire_versions" AS PERMISSIVE FOR SELECT TO "twt_app" USING (true);--> statement-breakpoint
CREATE POLICY "questionnaire_versions_tenant_insert" ON "questionnaire_versions" AS PERMISSIVE FOR INSERT TO "twt_app" WITH CHECK (origin_pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid AND NOT direct);--> statement-breakpoint
CREATE INDEX "questionnaire_versions_origin_idx" ON "questionnaire_versions" USING btree ("origin_pariwar_id", "kind");--> statement-breakpoint

-- ── (2) the steps ────────────────────────────────────────────────────────────────────────────────────────────────────────
CREATE TABLE "questionnaire_version_steps" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"version_id" text NOT NULL,
	"step" text NOT NULL,
	"target_pariwar_id" uuid,
	"scope_pariwar_id" uuid,
	"actor" text NOT NULL,
	"actor_display" text NOT NULL,
	"note" text,
	"hindi_reviewed" boolean,
	"classification_attested" boolean,
	"seq" bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
	"at" timestamp with time zone DEFAULT clock_timestamp() NOT NULL,
	CONSTRAINT "questionnaire_version_steps_seq_uq" UNIQUE ("seq")
);--> statement-breakpoint
ALTER TABLE "questionnaire_version_steps" ADD CONSTRAINT "questionnaire_version_steps_version_fk" FOREIGN KEY ("version_id") REFERENCES "public"."questionnaire_versions"("version_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
-- ⚠ LOCKSTEP with `CHAIN_STEPS` (`questionnaires/derive.ts`; a policy-spec leg pins the two equal).
ALTER TABLE "questionnaire_version_steps" ADD CONSTRAINT "questionnaire_version_steps_step_check" CHECK ("step" IN ('proposed', 'approved', 'returned', 'withdrawn', 'made_live', 'pariwar_reverted'));--> statement-breakpoint
-- RESOLUTION: a target only on `made_live` (NULL = all Pariwars) and `pariwar_reverted` (always a Pariwar).
ALTER TABLE "questionnaire_version_steps" ADD CONSTRAINT "questionnaire_version_steps_target_check" CHECK (("target_pariwar_id" IS NULL OR "step" IN ('made_live', 'pariwar_reverted')) AND ("step" <> 'pariwar_reverted' OR "target_pariwar_id" IS NOT NULL));--> statement-breakpoint
-- TENANCY of a resolution step = its target (the global path writes it for that Pariwar, or NULL for all).
ALTER TABLE "questionnaire_version_steps" ADD CONSTRAINT "questionnaire_version_steps_scope_check" CHECK ("step" NOT IN ('made_live', 'pariwar_reverted') OR "scope_pariwar_id" IS NOT DISTINCT FROM "target_pariwar_id");--> statement-breakpoint
-- QE9 / QE10 — EVERY `approved` step records both ticks (incl. the direct path's); ⛔ on any other step.
ALTER TABLE "questionnaire_version_steps" ADD CONSTRAINT "questionnaire_version_steps_ticks_check" CHECK (CASE WHEN "step" = 'approved' THEN "hindi_reviewed" IS TRUE AND "classification_attested" IS TRUE ELSE "hindi_reviewed" IS NULL AND "classification_attested" IS NULL END);--> statement-breakpoint
-- A return says why (AC8); every note ≤ 500.
ALTER TABLE "questionnaire_version_steps" ADD CONSTRAINT "questionnaire_version_steps_note_check" CHECK (("note" IS NULL OR char_length("note") <= 500) AND ("step" <> 'returned' OR length(btrim(coalesce("note", ''))) > 0));--> statement-breakpoint
ALTER TABLE "questionnaire_version_steps" ADD CONSTRAINT "questionnaire_version_steps_actor_check" CHECK (length(btrim("actor")) > 0 AND length(btrim("actor_display")) > 0);--> statement-breakpoint
GRANT SELECT, INSERT ON "questionnaire_version_steps" TO twt_app;--> statement-breakpoint
ALTER TABLE "questionnaire_version_steps" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "questionnaire_version_steps" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "questionnaire_version_steps_read" ON "questionnaire_version_steps" AS PERMISSIVE FOR SELECT TO "twt_app" USING (scope_pariwar_id IS NULL OR scope_pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid OR "questionnaire_version_steps"."version_id" IN (SELECT v."version_id" FROM "questionnaire_versions" v WHERE v."origin_pariwar_id" = nullif(current_setting('app.pariwar_id', true), '')::uuid));--> statement-breakpoint
CREATE POLICY "questionnaire_version_steps_tenant_insert" ON "questionnaire_version_steps" AS PERMISSIVE FOR INSERT TO "twt_app" WITH CHECK (scope_pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid AND step IN ('proposed', 'approved', 'returned', 'withdrawn'));--> statement-breakpoint
CREATE INDEX "questionnaire_version_steps_version_idx" ON "questionnaire_version_steps" USING btree ("version_id", "seq");--> statement-breakpoint
-- The resolver's read (QE12 R2 / R4): the live steps of one target or of all, newest by `seq`.
CREATE INDEX "questionnaire_version_steps_live_idx" ON "questionnaire_version_steps" USING btree ("target_pariwar_id", "seq") WHERE "step" IN ('made_live', 'pariwar_reverted');--> statement-breakpoint

-- ── (1) + (2) append-only, for EVERY role (the owner included) ──────────────────────────────────────────────────────────
CREATE FUNCTION questionnaire_chain_reject_mutation()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION
    '% is append-only — a questionnaire version and its steps are never edited or deleted; a change is a NEW version (Story 6.33 I2)', TG_TABLE_NAME
    USING ERRCODE = 'integrity_constraint_violation';
END;
$$;
--> statement-breakpoint
CREATE TRIGGER questionnaire_versions_no_update_delete
  BEFORE UPDATE OR DELETE ON questionnaire_versions
  FOR EACH ROW EXECUTE FUNCTION questionnaire_chain_reject_mutation();
--> statement-breakpoint
CREATE TRIGGER questionnaire_versions_no_truncate
  BEFORE TRUNCATE ON questionnaire_versions
  EXECUTE FUNCTION questionnaire_chain_reject_mutation();
--> statement-breakpoint
CREATE TRIGGER questionnaire_version_steps_no_update_delete
  BEFORE UPDATE OR DELETE ON questionnaire_version_steps
  FOR EACH ROW EXECUTE FUNCTION questionnaire_chain_reject_mutation();
--> statement-breakpoint
CREATE TRIGGER questionnaire_version_steps_no_truncate
  BEFORE TRUNCATE ON questionnaire_version_steps
  EXECUTE FUNCTION questionnaire_chain_reject_mutation();
