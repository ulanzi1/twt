-- Migration 0121 — a nominee determination's SUPERSESSION is ONE-WAY (Story 6.20; code review 2026-09-24).
--
-- `twt_app` holds column UPDATE on `nominee_determinations.superseded_at` / `superseded_reason` (0119 — the
-- writers supersede a determination by stamping both). Nothing stopped the reverse: an
-- `UPDATE … SET superseded_at = NULL, superseded_reason = NULL` passes the coherence CHECK and, once the
-- current determination is itself superseded, the one-live partial-unique index too — REVIVING a superseded
-- determination and rewriting the supersession history. The writers never do this; this trigger is the
-- DB-level backstop (checklist family 5), the `member_nominee_versions` append-only posture applied to the
-- one mutable pair.
--   · a LIVE row (superseded_at IS NULL) may be superseded — both columns set together (the CHECK);
--   · a SUPERSEDED row's superseded_at / superseded_reason can ⛔ never change again;
--   · every other granted column (the RTBF ciphertext scrub) is untouched by this rule.
-- Hand-authored — ⛔ never regenerate.

CREATE OR REPLACE FUNCTION nominee_determinations_supersession_one_way()
  RETURNS trigger
  LANGUAGE plpgsql
AS $$
BEGIN
  IF OLD.superseded_at IS NOT NULL
     AND (NEW.superseded_at IS DISTINCT FROM OLD.superseded_at
          OR NEW.superseded_reason IS DISTINCT FROM OLD.superseded_reason) THEN
    RAISE EXCEPTION
      'nominee_determinations supersession is one-way — a superseded determination is never revived or re-stamped (Story 6.20)'
      USING ERRCODE = 'integrity_constraint_violation';
  END IF;
  RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER nominee_determinations_supersession_one_way
  BEFORE UPDATE ON nominee_determinations
  FOR EACH ROW EXECUTE FUNCTION nominee_determinations_supersession_one_way();
