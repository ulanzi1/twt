-- Migration 0176 — at most TWO WhatsApp sends per follow-up (Story 6.37d code review round 2, Decision 2026-10-20-370 decision 1).
-- Hand-authored — ⛔ never regenerate (`db:generate` diffs against the 0020 snapshot; the migrator skips by the journal `when`). ⛔ DROP
-- SCHEMA. A FORWARD migration — ⛔ an edit of 0172 (applied — [[project_live_db_test_gotchas]]).
--
-- (1) `send_count` — the calls to Meta this row has made (each is preceded by the in-flight marker, which increments it). The CHECK
-- `0 <= send_count <= 2` is the database's half of the cap; the marker's compare-and-set (`send_count < 2`) refuses a third call and a
-- second post-send transient finishes the row `may_have_sent:send_cap` (the code's half). Retries BEFORE a send do ⛔ count. ⚠ The one
-- path where a marker is set and Meta is ⛔ called — the 20:00 release — still counts (⛔ decrement): fewer messages, ⛔ more.
-- (2) The 0172 guard function is REPLACED (body copied verbatim) with `send_count` added to the columns a FINISHED row freezes, and a
-- "never decreases" rule on an `attempting` row beside `attempt_count`'s. (3) twt_app gains UPDATE on the one new column.
-- (4) Backfill (dev data only — ⛔ in production): a row whose marker was ever set to reach Meta (a finished accepted / rejected /
-- may_have_sent / refused row, or an attempting row with the marker set) counts ONE send.

ALTER TABLE "claim_contact_wa_sends" ADD COLUMN "send_count" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
UPDATE "claim_contact_wa_sends" SET "send_count" = 1
 WHERE "send_outcome" IN ('accepted', 'rejected_recipient', 'may_have_sent', 'refused')
    OR ("send_outcome" = 'attempting' AND "send_started_at" IS NOT NULL);--> statement-breakpoint
ALTER TABLE "claim_contact_wa_sends" ADD CONSTRAINT "claim_contact_wa_sends_send_count_check" CHECK ("send_count" >= 0 AND "send_count" <= 2);--> statement-breakpoint
GRANT UPDATE ("send_count") ON "claim_contact_wa_sends" TO twt_app;--> statement-breakpoint
CREATE OR REPLACE FUNCTION claim_contact_wa_sends_guard()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  identity_cols text[] := ARRAY['send_id', 'ladder_id', 'pariwar_id', 'claim_case_id', 'chase', 'recipient_number_hash', 'created_at'];
  send_cols text[] := ARRAY['template_name', 'locale', 'send_outcome', 'attempt_count', 'claimed_at', 'claimed_by_job', 'aging_since',
    'send_started_at', 'detail', 'first_detail', 'provider_message_id', 'send_count'];
  status_cols text[] := ARRAY['delivered_at', 'failed_at', 'failure_code'];
  col text;
  old_v jsonb;
  new_v jsonb;
BEGIN
  old_v := (SELECT jsonb_object_agg(k, to_jsonb(OLD) -> k) FROM unnest(identity_cols) AS k);
  new_v := (SELECT jsonb_object_agg(k, to_jsonb(NEW) -> k) FROM unnest(identity_cols) AS k);
  IF new_v IS DISTINCT FROM old_v THEN
    RAISE EXCEPTION 'claim_contact_wa_sends: a send row''s identity is never rewritten (Story 6.37d WS8 (ii))'
      USING ERRCODE = 'integrity_constraint_violation';
  END IF;
  old_v := (SELECT jsonb_object_agg(k, to_jsonb(OLD) -> k) FROM unnest(send_cols) AS k);
  new_v := (SELECT jsonb_object_agg(k, to_jsonb(NEW) -> k) FROM unnest(send_cols) AS k);
  IF OLD.send_outcome <> 'attempting' AND new_v IS DISTINCT FROM old_v THEN
    RAISE EXCEPTION
      'claim_contact_wa_sends: a finished send (%) is never rewritten — one WhatsApp per ladder, ever (Story 6.37d I4)', OLD.send_outcome
      USING ERRCODE = 'integrity_constraint_violation';
  END IF;
  -- T28 — the delivery-status columns: each set at most once (NULL → value), only on an ACCEPTED row with a wamid.
  FOREACH col IN ARRAY status_cols LOOP
    IF (to_jsonb(NEW) -> col) IS DISTINCT FROM (to_jsonb(OLD) -> col) THEN
      IF (to_jsonb(OLD) -> col) <> 'null'::jsonb THEN
        RAISE EXCEPTION 'claim_contact_wa_sends: % is set once (Story 6.37d WS11)', col
          USING ERRCODE = 'integrity_constraint_violation';
      END IF;
      IF NEW.send_outcome <> 'accepted' OR NEW.provider_message_id IS NULL OR OLD.send_outcome <> 'accepted' THEN
        RAISE EXCEPTION 'claim_contact_wa_sends: % belongs to an accepted send with a wamid (Story 6.37d WS11)', col
          USING ERRCODE = 'integrity_constraint_violation';
      END IF;
    END IF;
  END LOOP;
  IF OLD.send_outcome = 'attempting' THEN
    IF NEW.attempt_count < OLD.attempt_count THEN
      RAISE EXCEPTION 'claim_contact_wa_sends: attempt_count never decreases (Story 6.37d WS8 (ii))'
        USING ERRCODE = 'integrity_constraint_violation';
    END IF;
    IF NEW.send_count < OLD.send_count THEN
      RAISE EXCEPTION 'claim_contact_wa_sends: send_count never decreases (Decision 2026-10-20-370)'
        USING ERRCODE = 'integrity_constraint_violation';
    END IF;
    IF OLD.first_detail IS NOT NULL AND NEW.first_detail IS DISTINCT FROM OLD.first_detail THEN
      RAISE EXCEPTION 'claim_contact_wa_sends: first_detail is written once (Story 6.37d WS8 (ii))'
        USING ERRCODE = 'integrity_constraint_violation';
    END IF;
    IF NEW.aging_since IS NULL OR NEW.aging_since < OLD.aging_since THEN
      RAISE EXCEPTION 'claim_contact_wa_sends: aging_since moves only forward (Story 6.37d WS8 (ii))'
        USING ERRCODE = 'integrity_constraint_violation';
    END IF;
    IF OLD.send_started_at IS NOT NULL AND NEW.send_started_at IS NOT NULL AND NEW.send_started_at IS DISTINCT FROM OLD.send_started_at THEN
      RAISE EXCEPTION 'claim_contact_wa_sends: the in-flight marker is set once per send — cleared only by a release, a transient or a finish (Story 6.37d WS8 (ii))'
        USING ERRCODE = 'integrity_constraint_violation';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
