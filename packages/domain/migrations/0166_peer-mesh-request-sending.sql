-- Migration 0166 — sending the text to each of the five: the ping's `detail` GRAMMAR, the REPLACEMENT link, and the
-- attempting-row backstops (Story 6.27c, Task 2; AC1b; `2026-10-10-311` PM1 (ii), PM4 [c]; `2026-10-14-330` SW22 / SW24 / SW27;
-- `2026-10-16-343`). Hand-authored — ⛔ never regenerate (`db:generate` diffs against the 0020 snapshot; the migrator skips by
-- the journal `when`).
--
-- ⭐ (a) THE `detail` GRAMMAR (PM4 [c] — 0156 checked only the LENGTH). The two CHECKs admit EXACTLY `peerMeshRequestDetail`'s
-- grammar (⛔ a space, ⛔ `+`, ⛔ a run of 7+ digits — a bare phone number; a gateway `<code>` is sanitised by the builder).
-- ⚠ LOCKSTEP with `PEER_MESH_REQUEST_DETAIL_PATTERN` (schema/claim_peer_mesh_pings.ts — the writers assert the SAME pattern; a spec
-- pins the two equal). Named `*_vocabulary_check` so they sort AFTER 0156's `*_length_check` (PG evaluates CHECKs in name order).
-- ⭐ (b) THE REPLACEMENT (`-311` PM1 (ii); R2 / R3 / R5). A ping skipped at send time for a PEER reason is replaced by ONE new ping
-- of the same selection, naming the one it replaces (`replaces_ping_id`). `UNIQUE (replaces_ping_id)` ⇒ a ping is replaced at most
-- once; the BEFORE INSERT trigger admits a replacement ONLY of a ping of the SAME selection (and Pariwar — SECURITY INVOKER, so
-- another Pariwar's ping is NOT FOUND under RLS and refused), finished `no_target` with a PEER detail (R3 — ⛔ `name_*`, ⛔
-- `superseded:*`), at `attempt_count = 1` (R5's backstop, `-343`: a re-claimed send may have reached that neighbour ⇒ ⛔ a sixth
-- text). ⇒ each replacement maps to ONE distinct skipped ping ⇒ live pings ≤ the selection's original count ≤ 5. `ON DELETE
-- CASCADE` (a deleted replaced ping takes its replacement — the selection's own cascade already does). ⛔ In the UPDATE grant
-- (0156's column list is unchanged ⇒ the link is immutable for `twt_app`).
-- ⭐ (c) THE ATTEMPTING-ROW BACKSTOPS (R15 — closes deferred-work "Ping delivery columns unconstrained while `attempting`"). A CHECK:
-- an `attempting` row carries `aging_since` (a begin that forgot it would never give up). The guard trigger is REPLACED in place
-- (`CREATE OR REPLACE FUNCTION`, the same trigger): every 0156 rule and message is kept, and, ONLY while OLD is `attempting`:
-- `attempt_count` ⛔ decreases; `first_detail` is written once; `aging_since` moves ONLY on the re-claim of a PARKED row (0155's
-- rule ADAPTED — ⛔ cloned literally: a ping gets `aging_since` at its BEGIN, an UPDATE from `send_outcome IS NULL`, which an
-- unconditioned clone would refuse). `claimed_at` / `claimed_by_job` stay rewritable BY DESIGN (the RN7 re-claim needs them).
-- ⚠ Checked BEFORE this file (Story 6.27c Task 2, 2026-10-16), on :5432 AND :5433:
--     SELECT count(*), count(*) FILTER (WHERE detail IS NOT NULL AND detail !~ <the pattern>),
--            count(*) FILTER (WHERE first_detail IS NOT NULL AND first_detail !~ <the pattern>),
--            count(*) FILTER (WHERE send_outcome = 'attempting' AND aging_since IS NULL)
--       FROM claim_peer_mesh_pings;
--   ⇒ :5432 0 | 0 | 0 | 0 (no ping row); :5433 382 | 0 | 0 | 0 (344 begun) — ⛔ existing row fails a new CHECK.

-- ── (a) the grammar ──────────────────────────────────────────────────────────────────────────────────────────────────
ALTER TABLE "claim_peer_mesh_pings" ADD CONSTRAINT "claim_peer_mesh_pings_detail_vocabulary_check" CHECK ("detail" IS NULL OR "detail" ~ '^(?!.*[0-9]{7})(no_target:(peer_not_active|peer_reported_deceased|peer_filed_for_this_death|peer_not_eligible|no_sendable_number|name_too_long|name_none|name_erased|name_unresolvable)|superseded:claim_decided|exhausted:(attempting_three_days|recheck_(claim_decided|peer_ineligible))|decrypt_failed:tier1|hash_failed:tier1|config_unavailable:secret_manager|config:(dlt_template_id_missing|helpline_number_missing|sms_gateway_unconfigured|sms_messaging_unavailable|secret_manager_[A-Za-z0-9_]{1,64})|(invalid_number|carrier_reject|rate_limited|api_unavailable|dlt_template_not_approved|auth|unknown):[A-Za-z0-9_.-]{1,64})$');--> statement-breakpoint
ALTER TABLE "claim_peer_mesh_pings" ADD CONSTRAINT "claim_peer_mesh_pings_first_detail_vocabulary_check" CHECK ("first_detail" IS NULL OR "first_detail" ~ '^(?!.*[0-9]{7})(no_target:(peer_not_active|peer_reported_deceased|peer_filed_for_this_death|peer_not_eligible|no_sendable_number|name_too_long|name_none|name_erased|name_unresolvable)|superseded:claim_decided|exhausted:(attempting_three_days|recheck_(claim_decided|peer_ineligible))|decrypt_failed:tier1|hash_failed:tier1|config_unavailable:secret_manager|config:(dlt_template_id_missing|helpline_number_missing|sms_gateway_unconfigured|sms_messaging_unavailable|secret_manager_[A-Za-z0-9_]{1,64})|(invalid_number|carrier_reject|rate_limited|api_unavailable|dlt_template_not_approved|auth|unknown):[A-Za-z0-9_.-]{1,64})$');--> statement-breakpoint

-- ── (b) the replacement ──────────────────────────────────────────────────────────────────────────────────────────────
ALTER TABLE "claim_peer_mesh_pings" ADD COLUMN "replaces_ping_id" uuid;--> statement-breakpoint
ALTER TABLE "claim_peer_mesh_pings" ADD CONSTRAINT "claim_peer_mesh_pings_replaces_ping_fk" FOREIGN KEY ("replaces_ping_id") REFERENCES "public"."claim_peer_mesh_pings"("ping_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "claim_peer_mesh_pings" ADD CONSTRAINT "claim_peer_mesh_pings_replaces_ping_uq" UNIQUE ("replaces_ping_id");--> statement-breakpoint

-- ⚠ LOCKSTEP with `PEER_MESH_REQUEST_REPLACEABLE_REASONS` (schema/claim_peer_mesh_pings.ts — a spec iterates it).
CREATE FUNCTION claim_peer_mesh_pings_replacement_guard()
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
                                'no_target:peer_not_eligible', 'no_target:no_sendable_number') THEN
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
--> statement-breakpoint
CREATE TRIGGER "claim_peer_mesh_pings_replacement_guard" BEFORE INSERT ON "claim_peer_mesh_pings"
  FOR EACH ROW EXECUTE FUNCTION claim_peer_mesh_pings_replacement_guard();
--> statement-breakpoint

-- ── (c) the attempting-row backstops ─────────────────────────────────────────────────────────────────────────────────
ALTER TABLE "claim_peer_mesh_pings" ADD CONSTRAINT "claim_peer_mesh_pings_attempting_aging_check" CHECK ("send_outcome" IS DISTINCT FROM 'attempting' OR "aging_since" IS NOT NULL);--> statement-breakpoint

CREATE OR REPLACE FUNCTION claim_peer_mesh_pings_guard_delivery()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  delivery_cols text[] := ARRAY['send_outcome', 'attempt_count', 'claimed_at', 'claimed_by_job', 'aging_since', 'parked_at',
    'detail', 'first_detail', 'provider_message_id', 'recipient_number_hash', 'send_updated_at', 'locale_source', 'link_code'];
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
