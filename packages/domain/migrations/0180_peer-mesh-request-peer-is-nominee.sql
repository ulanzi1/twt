-- Migration 0180 — the neighbours' text gains ONE no-target label, `peer_is_nominee` (Story 6.36d, Task 4; AC5;
-- `2026-10-23-386` ND5 (a)): a neighbour who signs in with one of the deceased's NOMINEE numbers is ⛔ texted, and the ping is
-- REPLACED like every other peer reason. Hand-authored — ⛔ never regenerate (`db:generate` diffs against the 0020 snapshot; the
-- migrator skips by the journal `when`). A FORWARD migration — ⛔ an edit of 0166 (applied — [[project_live_db_test_gotchas]]).
-- ⭐ NUMBER: `0179` is row 6-35's (`0179_member-preferred-locale`, committed first on its branch — `2026-10-15-366` decision 6);
-- whichever of the two lands on `main` second rebases and re-checks the journal `when` order.
--
-- (a) BOTH 0166 grammar CHECKs are dropped and re-added under the SAME names, the pattern written FROM
--     `PEER_MESH_REQUEST_DETAIL_PATTERN` (schema/claim_peer_mesh_pings.ts — the RLS regression spec compares `pg_get_constraintdef`
--     to it byte for byte). `first_detail` can ⛔ actually receive the label (`skipFresh` ⛔ writes it) — widened for LOCKSTEP only.
-- (b) `claim_peer_mesh_pings_replacement_guard()` is REPLACED with 0166's WHOLE body plus `no_target:peer_is_nominee` in its
--     peer-reason list (⚠ LOCKSTEP with `PEER_MESH_REQUEST_REPLACEABLE_REASONS`); the trigger itself is unchanged.
-- ⚠ Checked BEFORE this file: the new pattern only ADDS an alternative, so ⛔ existing row can fail a re-added CHECK.

ALTER TABLE "claim_peer_mesh_pings" DROP CONSTRAINT "claim_peer_mesh_pings_detail_vocabulary_check";--> statement-breakpoint
ALTER TABLE "claim_peer_mesh_pings" DROP CONSTRAINT "claim_peer_mesh_pings_first_detail_vocabulary_check";--> statement-breakpoint
ALTER TABLE "claim_peer_mesh_pings" ADD CONSTRAINT "claim_peer_mesh_pings_detail_vocabulary_check" CHECK ("detail" IS NULL OR "detail" ~ '^(?!.*[0-9]{7})(no_target:(peer_not_active|peer_reported_deceased|peer_filed_for_this_death|peer_is_nominee|peer_not_eligible|no_sendable_number|name_too_long|name_none|name_erased|name_unresolvable)|superseded:claim_decided|exhausted:(attempting_three_days|recheck_(claim_decided|peer_ineligible))|decrypt_failed:tier1|hash_failed:tier1|config_unavailable:secret_manager|config:(dlt_template_id_missing|helpline_number_missing|sms_gateway_unconfigured|sms_messaging_unavailable|secret_manager_[A-Za-z0-9_]{1,64})|(invalid_number|carrier_reject|rate_limited|api_unavailable|dlt_template_not_approved|auth|unknown):[A-Za-z0-9_.-]{1,64})$');--> statement-breakpoint
ALTER TABLE "claim_peer_mesh_pings" ADD CONSTRAINT "claim_peer_mesh_pings_first_detail_vocabulary_check" CHECK ("first_detail" IS NULL OR "first_detail" ~ '^(?!.*[0-9]{7})(no_target:(peer_not_active|peer_reported_deceased|peer_filed_for_this_death|peer_is_nominee|peer_not_eligible|no_sendable_number|name_too_long|name_none|name_erased|name_unresolvable)|superseded:claim_decided|exhausted:(attempting_three_days|recheck_(claim_decided|peer_ineligible))|decrypt_failed:tier1|hash_failed:tier1|config_unavailable:secret_manager|config:(dlt_template_id_missing|helpline_number_missing|sms_gateway_unconfigured|sms_messaging_unavailable|secret_manager_[A-Za-z0-9_]{1,64})|(invalid_number|carrier_reject|rate_limited|api_unavailable|dlt_template_not_approved|auth|unknown):[A-Za-z0-9_.-]{1,64})$');--> statement-breakpoint

-- ⚠ LOCKSTEP with `PEER_MESH_REQUEST_REPLACEABLE_REASONS` (schema/claim_peer_mesh_pings.ts — a spec iterates it).
CREATE OR REPLACE FUNCTION claim_peer_mesh_pings_replacement_guard()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY INVOKER AS $$
DECLARE
  replaced record;
BEGIN
  IF NEW.replaces_ping_id IS NULL THEN
    RETURN NEW;
  END IF;
  SELECT p.pariwar_id, p.selection_id, p.send_outcome, p.detail, p.attempt_count INTO replaced
    FROM claim_peer_mesh_pings p
   WHERE p.ping_id = NEW.replaces_ping_id;
  IF NOT FOUND OR replaced.pariwar_id IS DISTINCT FROM NEW.pariwar_id OR replaced.selection_id IS DISTINCT FROM NEW.selection_id THEN
    RAISE EXCEPTION 'claim_peer_mesh_pings: a replacement replaces a ping of its own selection (Story 6.27c R2)'
      USING ERRCODE = 'integrity_constraint_violation';
  END IF;
  IF replaced.send_outcome IS DISTINCT FROM 'no_target'
     OR replaced.detail IS NULL
     OR replaced.detail NOT IN ('no_target:peer_not_active', 'no_target:peer_reported_deceased', 'no_target:peer_filed_for_this_death',
                                'no_target:peer_is_nominee', 'no_target:peer_not_eligible', 'no_target:no_sendable_number') THEN
    RAISE EXCEPTION 'claim_peer_mesh_pings: only a ping skipped for a peer reason is replaced (Story 6.27c R3)'
      USING ERRCODE = 'integrity_constraint_violation';
  END IF;
  IF replaced.attempt_count <> 1 THEN
    RAISE EXCEPTION 'claim_peer_mesh_pings: a re-claimed send is never replaced (Story 6.27c R5, -343)'
      USING ERRCODE = 'integrity_constraint_violation';
  END IF;
  RETURN NEW;
END;
$$;
