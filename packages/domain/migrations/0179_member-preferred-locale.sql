-- Migration 0179 — the member's chosen language, and the language each neighbour's text was sent in (Story 6.35, LS1 (a) / LS9;
-- build decisions in Decision 2026-10-23-387, author-commit; the reminder's fallback value is Decision 2026-10-23-385, Trustee-ratified).
-- Hand-authored — ⛔ never regenerate (`db:generate` diffs against the 0020 snapshot; the migrator skips by the journal `when`).
-- A FORWARD migration — ⛔ an edit of 0156 / 0166 / 0171 (applied — [[project_live_db_test_gotchas]]). Idempotent: `psql -f` twice
-- succeeds (`ADD COLUMN IF NOT EXISTS`, `DROP CONSTRAINT IF EXISTS` before each re-ADD, `CREATE OR REPLACE FUNCTION`).
--
-- (a) `members.preferred_locale` / `preferred_locale_set_at` — NULL until the member's FIRST explicit change in the app
--     (`PUT /api/v1/member/language`, the ONLY writer); ⛔ default, ⛔ backfill (I1 — nothing is recorded the member did not choose).
--     A nullable add on a HOT table needs ⛔ rewrite (the 0096 precedent). A locale code is ⛔ PII — `members` stays PII-free. RLS and
--     the table-wide grant (0018) already cover the new columns.
-- (b) `claim_peer_mesh_pings.locale` — the language the text was (or is being) sent in, written at the FRESH begin with
--     `locale_source`; a re-claim reuses it (I5). NULL on a row ⛔ begun, and on a row finished WITHOUT a begin (`skipFresh` —
--     `skipped_superseded` / `no_target`), so ⛔ `(send_outcome IS NULL) = (locale IS NULL)` CHECK. Joins the finished-row freeze and
--     gains a written-once arm (link_code's shape) — the guard function is REPLACED FROM 0166's FULL BODY (0156's shorter body would
--     silently drop 6.27c's R15 attempting-row checks). UPDATE-only column grant (INSERT is table-wide from 0054).
-- (c) both `locale_source` CHECKs re-added under their SAME names — pings `('pariwar_default', 'member_choice')`; reminders also
--     `'pariwar_fallback'` (`-385`: the reminder went in the Pariwar's language because the member's chosen one could not be sent —
--     reminders only). ⚠ LOCKSTEP with `PEER_MESH_LOCALE_SOURCES` (schema/claim_peer_mesh_pings.ts) and
--     `PEER_MESH_WA_REMINDER_LOCALE_SOURCES` (schema/claim_peer_mesh_wa_reminders.ts). Closes deferred-work W8's CHECK half.
-- ⚠ Checked BEFORE this file (Story 6.35 Task 1, 2026-10-23): every existing `locale_source` is `'pariwar_default'` or NULL (the old
-- CHECKs admit only those), so the wider CHECKs cannot fail an existing row; the new pings CHECK is over a new NULL column.

-- ── (a) the member's choice ─────────────────────────────────────────────────────────────────────────────────────────────
ALTER TABLE "members" ADD COLUMN IF NOT EXISTS "preferred_locale" "locale";--> statement-breakpoint
ALTER TABLE "members" ADD COLUMN IF NOT EXISTS "preferred_locale_set_at" timestamp with time zone;--> statement-breakpoint
-- Both set together, or neither (the setter writes them in one UPDATE).
ALTER TABLE "members" DROP CONSTRAINT IF EXISTS "members_preferred_locale_set_at_check";--> statement-breakpoint
ALTER TABLE "members" ADD CONSTRAINT "members_preferred_locale_set_at_check" CHECK (("preferred_locale" IS NULL) = ("preferred_locale_set_at" IS NULL));--> statement-breakpoint

-- ── (b) the text's language ─────────────────────────────────────────────────────────────────────────────────────────────
ALTER TABLE "claim_peer_mesh_pings" ADD COLUMN IF NOT EXISTS "locale" text;--> statement-breakpoint
ALTER TABLE "claim_peer_mesh_pings" DROP CONSTRAINT IF EXISTS "claim_peer_mesh_pings_locale_check";--> statement-breakpoint
ALTER TABLE "claim_peer_mesh_pings" ADD CONSTRAINT "claim_peer_mesh_pings_locale_check" CHECK ("locale" IS NULL OR "locale" IN ('en', 'hi'));--> statement-breakpoint
GRANT UPDATE ("locale") ON "claim_peer_mesh_pings" TO twt_app;--> statement-breakpoint

-- ── (c) the record of why ───────────────────────────────────────────────────────────────────────────────────────────────
ALTER TABLE "claim_peer_mesh_pings" DROP CONSTRAINT IF EXISTS "claim_peer_mesh_pings_locale_source_check";--> statement-breakpoint
ALTER TABLE "claim_peer_mesh_pings" ADD CONSTRAINT "claim_peer_mesh_pings_locale_source_check" CHECK ("locale_source" IS NULL OR "locale_source" IN ('pariwar_default', 'member_choice'));--> statement-breakpoint
ALTER TABLE "claim_peer_mesh_wa_reminders" DROP CONSTRAINT IF EXISTS "claim_peer_mesh_wa_reminders_locale_source_check";--> statement-breakpoint
ALTER TABLE "claim_peer_mesh_wa_reminders" ADD CONSTRAINT "claim_peer_mesh_wa_reminders_locale_source_check" CHECK ("locale_source" IS NULL OR "locale_source" IN ('pariwar_default', 'member_choice', 'pariwar_fallback'));--> statement-breakpoint

-- ── the delivery guard — 0166's FULL body, plus `locale` in `delivery_cols` and its written-once arm ───────────────────
CREATE OR REPLACE FUNCTION claim_peer_mesh_pings_guard_delivery()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  delivery_cols text[] := ARRAY['send_outcome', 'attempt_count', 'claimed_at', 'claimed_by_job', 'aging_since', 'parked_at',
    'detail', 'first_detail', 'provider_message_id', 'recipient_number_hash', 'send_updated_at', 'locale_source', 'link_code',
    'locale'];
  old_delivery jsonb;
  new_delivery jsonb;
BEGIN
  old_delivery := (SELECT jsonb_object_agg(k, to_jsonb(OLD) -> k) FROM unnest(delivery_cols) AS k);
  new_delivery := (SELECT jsonb_object_agg(k, to_jsonb(NEW) -> k) FROM unnest(delivery_cols) AS k);
  IF OLD.send_outcome IS NOT NULL AND OLD.send_outcome <> 'attempting' AND new_delivery IS DISTINCT FROM old_delivery THEN
    RAISE EXCEPTION
      'claim_peer_mesh_pings: a finished send (%) is never rewritten — one text per ping, ever (Story 6.27a PM4)', OLD.send_outcome
      USING ERRCODE = 'integrity_constraint_violation';
  END IF;
  IF OLD.send_outcome IS NOT NULL AND NEW.send_outcome IS NULL THEN
    RAISE EXCEPTION 'claim_peer_mesh_pings: a begun send never returns to "not begun" (Story 6.27a PM4)'
      USING ERRCODE = 'integrity_constraint_violation';
  END IF;
  IF OLD.aging_since IS NOT NULL AND (NEW.aging_since IS NULL OR NEW.aging_since < OLD.aging_since) THEN
    RAISE EXCEPTION 'claim_peer_mesh_pings: aging_since moves only forward (Story 6.27a PM4)'
      USING ERRCODE = 'integrity_constraint_violation';
  END IF;
  IF OLD.link_code IS NOT NULL AND NEW.link_code IS DISTINCT FROM OLD.link_code THEN
    RAISE EXCEPTION 'claim_peer_mesh_pings: link_code is written once (Story 6.27a PM21 (a))'
      USING ERRCODE = 'integrity_constraint_violation';
  END IF;
  -- Story 6.35 I5 — one attempt, one language: a re-claim never re-resolves it (a possible second text carries the same words).
  IF OLD.locale IS NOT NULL AND NEW.locale IS DISTINCT FROM OLD.locale THEN
    RAISE EXCEPTION 'claim_peer_mesh_pings: locale is written once (Story 6.35 I5)'
      USING ERRCODE = 'integrity_constraint_violation';
  END IF;
  -- Story 6.27c R15 — while the send is IN FLIGHT. (A begin is an UPDATE from `send_outcome IS NULL` ⇒ ⛔ these arms.)
  IF OLD.send_outcome = 'attempting' THEN
    IF NEW.attempt_count < OLD.attempt_count THEN
      RAISE EXCEPTION 'claim_peer_mesh_pings: attempt_count never decreases (Story 6.27c R15)'
        USING ERRCODE = 'integrity_constraint_violation';
    END IF;
    IF OLD.first_detail IS NOT NULL AND NEW.first_detail IS DISTINCT FROM OLD.first_detail THEN
      RAISE EXCEPTION 'claim_peer_mesh_pings: first_detail is written once (Story 6.27c R15)'
        USING ERRCODE = 'integrity_constraint_violation';
    END IF;
    -- 0155's rule: the anchor moves ONLY when a PARKED row is RE-CLAIMED — the SAME statement clears `parked_at` and keeps
    -- the row `attempting` (⛔ a repeated forward credit on a row left parked). `IS DISTINCT FROM` throughout (NULL-safety).
    IF NEW.aging_since IS DISTINCT FROM OLD.aging_since
       AND (OLD.claimed_by_job IS DISTINCT FROM 'sweep:held'
            OR NEW.send_outcome IS DISTINCT FROM 'attempting'
            OR NEW.parked_at IS NOT NULL) THEN
      RAISE EXCEPTION
        'claim_peer_mesh_pings: aging_since moves only forward, and only on the re-claim of a parked row (Story 6.27c R15)'
        USING ERRCODE = 'integrity_constraint_violation';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
