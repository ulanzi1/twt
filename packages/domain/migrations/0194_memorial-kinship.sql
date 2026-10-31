-- Migration 0194 — THE FAMILY LIST ON THE MEMORIAL: one Tier-1 ciphertext on the version, and the Trust's whole-entry omissions
-- on its decision (Story 11b.5a; the list is ruled by `2026-10-31-428` PQ1 A + `2026-10-31-426` (Trustee-ratified), built per
-- `2026-10-31-431` KL5 / KL6, author-commit). Hand-authored — ⛔ never regenerate (`db:generate` diffs against the 0020 snapshot;
-- the migrator skips by the journal `when`). Idempotent: `psql -f` twice succeeds (`ADD COLUMN IF NOT EXISTS`,
-- `CREATE OR REPLACE FUNCTION`, each new CHECK in a `duplicate_object` guard, `DROP CONSTRAINT IF EXISTS` + `ADD CONSTRAINT` for
-- the replaced one, the grant re-runnable).
-- ⚠ Numbered 0194: Story 12-1's branch committed `0193_marketplace-modules` (`when` 1796269200038) first — the number belongs
-- to the first COMMIT (`-366` decision 6). The `when` order is what the migrator reads, and it is safe in ONE order only: Drizzle
-- skips every migration whose `when` is not above the newest one already applied, so a DB that applied this 0194 (`when`
-- 1796355600039) BEFORE 0193 skips 0193 for good. 12-1's 0193 has since landed on `main` first, so the order `main` now has (0193,
-- then this 0194) is the one that works — any dev DB that ran this branch's 0194 before the rebase onto it must be recreated.
--
-- (1) `memorial_submissions.kinship_ciphertext` — the family list, `JSON.stringify(entries)` encrypted under the memorial field
--     class (Tier-1; the relation CODES live inside it too — a family's shape is itself personal). NULL ⇔ ⛔ no list: an empty
--     array is ⛔ never stored. The table-level `GRANT SELECT, INSERT` (0182) already covers a new column; the column-level
--     `GRANT UPDATE` below is for the erasure scrub ONLY (MA15 — the same path as `body_ciphertext` / `alt_text_ciphertext`).
--     ⛔ No CHECK on it (a CHECK re-runs on the scrub's UPDATE — the sentinel must pass; 0182's header rule).
-- (2) `memorial_review_decisions.kinship_omissions` — `[{ index, reason }]`, the entries the Trust left out WHOLE (KL6 — like the
--     photo, ⛔ never a span: `memorial_omissions_valid` and its `field IN ('body','altText')` are ⛔ not touched). Its SHAPE is
--     checked here; the SEMANTIC rules are the pure validator's — `inside the list` needs the list, which the DB cannot see, and `sorted`
--     / `unique` are validator-only by the 0182 `memorial_omissions_valid` precedent (harmless downstream: the grouping uses a `Set`).
--     ⛔ No UPDATE grant (the decisions table's only UPDATE grant stays `internal_note_ciphertext`; its INSERT is table-level).
-- (3) `omissions_iff_action` REPLACED so a kinship-only `approved_with_omissions` is valid and `approved` / `not_approved` carry
--     ⛔ kinship omissions. Existing rows re-validate trivially (the new column defaults to `[]`) ⇒ the constraint stays VALID
--     (⛔ `NOT VALID` — that would leave old rows unchecked).
-- RLS is unchanged (row predicates on `pariwar_id`). ⛔ No DELETE anywhere.

ALTER TABLE "memorial_submissions" ADD COLUMN IF NOT EXISTS "kinship_ciphertext" text;--> statement-breakpoint
GRANT UPDATE ("kinship_ciphertext") ON "memorial_submissions" TO twt_app;--> statement-breakpoint

-- The kinship omissions' SHAPE (the `memorial_omissions_valid` pattern, 0182 — NULL-safe and ORDER-safe: each rule a `WHEN`, the
-- type checked BEFORE the value, the index compared as `numeric` and CAPPED at 2147483647). Each entry: exactly `index` and
-- `reason`; an integer `index >= 0`; `reason` one of the four. ⚠ LOCKSTEP with `memorial/vocab.ts` `MEMORIAL_REVIEW_REASONS`.
CREATE OR REPLACE FUNCTION memorial_kinship_omissions_valid(v jsonb) RETURNS boolean
  LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE
    WHEN v IS NULL OR jsonb_typeof(v) <> 'array' THEN false
    ELSE NOT EXISTS (
      SELECT 1 FROM jsonb_array_elements(v) e
       WHERE NOT (
         CASE
           WHEN jsonb_typeof(e) IS DISTINCT FROM 'object' THEN false
           WHEN (SELECT count(*) FROM jsonb_object_keys(e)) <> 2 THEN false
           WHEN NOT (e ? 'index' AND e ? 'reason') THEN false
           WHEN jsonb_typeof(e->'index') IS DISTINCT FROM 'number' OR jsonb_typeof(e->'reason') IS DISTINCT FROM 'string' THEN false
           WHEN (e->>'index') !~ '^[0-9]+$' THEN false
           WHEN (e->>'index')::numeric > 2147483647 THEN false
           WHEN e->>'reason' NOT IN ('attacks_someone_named', 'accuses_someone_of_wrongdoing', 'against_the_law', 'identifies_a_child') THEN false
           ELSE true
         END ) )
  END;
$$;--> statement-breakpoint

ALTER TABLE "memorial_review_decisions" ADD COLUMN IF NOT EXISTS "kinship_omissions" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "memorial_review_decisions" ADD CONSTRAINT "memorial_review_decisions_kinship_omissions_check"
    CHECK (memorial_kinship_omissions_valid(kinship_omissions));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;--> statement-breakpoint

-- MA6 + KL6: `approved` and `not_approved` leave nothing out; `approved_with_omissions` leaves out at least one part — a span, the
-- photo, or a list entry.
ALTER TABLE "memorial_review_decisions" DROP CONSTRAINT IF EXISTS "memorial_review_decisions_omissions_iff_action";--> statement-breakpoint
ALTER TABLE "memorial_review_decisions" ADD CONSTRAINT "memorial_review_decisions_omissions_iff_action" CHECK (
	CASE action
		WHEN 'approved_with_omissions' THEN (
			jsonb_array_length(omissions) > 0 OR photo_left_out_reason IS NOT NULL OR jsonb_array_length(kinship_omissions) > 0
		)
		ELSE (omissions = '[]'::jsonb AND photo_left_out_reason IS NULL AND kinship_omissions = '[]'::jsonb)
	END
);
