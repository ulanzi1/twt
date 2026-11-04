-- Migration 0201 — field_workers: the keyset list index and the approver's display name (Story 13.1a, Tasks 2.2 and 6;
-- AD10; decision 2026-11-04-447 item 2).
--
-- ⚠ DO NOT REGENERATE with `db:generate` (the 0021+ discipline, 0084's header): the drizzle snapshot is frozen at 0020,
-- so a regenerate emits a bloated catch-up migration and can raise 42P07. HAND-AUTHORED; it carries ONLY this story's
-- DDL. No snapshot file. ⛔ Edit 0200.
--
-- (1) THE INDEX (AD10 — 13.1's carried D1). `pageFieldWorkersForPariwar` reads `WHERE pariwar_id = $1 AND current_state = $2
--     [AND district = $3] [AND (created_at, field_worker_id) < ($c, $w)] ORDER BY created_at DESC, field_worker_id DESC
--     LIMIT n + 1`. The new index serves the equality prefix AND the order, so the page is an index range scan with no Sort.
--     0200's `field_workers_pariwar_state_idx (pariwar_id, current_state)` is a strict prefix of it and is DROPPED. `district`
--     is a filter on the range, not an index column — fine for the hundreds of workers a Pariwar holds.
--
-- (2) `approved_by_display` (decision `-447` item 2; Story 6.11 R5): the APPROVING admin's `users.display_name`, snapshotted at
--     the approval — plaintext staff attribution (⛔ a worker's personal data), ⛔ fallback. NULL until the approval. Written
--     ONCE, by the projector on `field_worker.activated`; ⛔ in any event payload.
--
-- (3) The whole-row write guard is REPLACED (`CREATE OR REPLACE` — the trigger keeps pointing at it): 0200's rule (b) makes a
--     column added later immutable by default, so the new column must be named. Every 0200 rule is kept word for word;
--     added:
--       INSERT  — `approved_by_display` must be NULL (a genesis has no approver);
--       UPDATE  — (b) `approved_by_display` joins the columns rule (b) leaves to the other rules;
--                 (f) `approved_by_display` changes ONLY from NULL to a value, and ONLY in the `pending_kyc → active` write
--                     (the approval); any other change of it — a rename, a clear, a set on another transition — is refused.
--     The gate's `GUARDED_COLUMNS` (scripts/field-worker-state-invariant) gains `approvedByDisplay` in the same commit.
--
-- (4) Two CHECKs. `field_workers_approved_by_display_nonblank` (never blank) is validated — every existing row holds NULL.
--     `field_workers_approved_by_state` ties the column to the state (`pending_kyc` ⇒ NULL; `active` / `suspended` ⇒ a value)
--     and is added NOT VALID: production and CI hold no rows, but a DEVELOPER database that ran Story 13.1's own-committing
--     specs holds active / suspended rows written before this column existed, and a validated ADD would fail there with
--     23514. NOT VALID still checks every row INSERTed or UPDATEd from now on. ⛔ VALIDATE it in a later migration until those
--     rows can be ruled out (they never exist in production — nothing is live, roster Row 48).
CREATE INDEX "field_workers_pariwar_state_created_idx" ON "field_workers" USING btree ("pariwar_id","current_state","created_at" DESC,"field_worker_id" DESC);--> statement-breakpoint
DROP INDEX "field_workers_pariwar_state_idx";--> statement-breakpoint
ALTER TABLE "field_workers" ADD COLUMN "approved_by_display" text;--> statement-breakpoint
ALTER TABLE "field_workers" ADD CONSTRAINT "field_workers_approved_by_display_nonblank" CHECK ("field_workers"."approved_by_display" IS NULL OR length(btrim("field_workers"."approved_by_display")) > 0);--> statement-breakpoint
ALTER TABLE "field_workers" ADD CONSTRAINT "field_workers_approved_by_state" CHECK (("field_workers"."current_state" <> 'pending_kyc' OR "field_workers"."approved_by_display" IS NULL) AND ("field_workers"."current_state" NOT IN ('active', 'suspended') OR "field_workers"."approved_by_display" IS NOT NULL)) NOT VALID;--> statement-breakpoint
CREATE OR REPLACE FUNCTION field_workers_reject_unguarded_state_write()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF current_setting('app.field_worker_state_writer', true) IS DISTINCT FROM 'on' THEN
      RAISE EXCEPTION
        'field_workers direct write rejected — only the event-replay projector may create a field-worker row (Story 13.1 I1); attempted INSERT of field worker %',
        NEW.field_worker_id
        USING ERRCODE = 'P0001';
    END IF;
    -- WHAT, not just WHO: a guarded genesis INSERT must be the one legal genesis shape (I3) — and has no approver (13.1a).
    IF NEW.current_state IS DISTINCT FROM 'pending_kyc'
       OR NEW.kyc_status IS DISTINCT FROM 'pending'
       OR NEW.state_event_version IS DISTINCT FROM 1
       OR NEW.state_reason_code IS NOT NULL
       OR NEW.ended_on IS NOT NULL
       OR NEW.district IS NULL
       OR length(btrim(NEW.district)) = 0
       OR NEW.approved_by_display IS NOT NULL THEN
      RAISE EXCEPTION
        'field_workers direct write rejected — a genesis INSERT must be pending_kyc / kyc pending / version 1 / no reason / no ended_on / a non-blank district / no approver (Story 13.1 I3, 13.1a); attempted state "%" kyc "%" version % reason % for field worker %',
        NEW.current_state, NEW.kyc_status, NEW.state_event_version, NEW.state_reason_code, NEW.field_worker_id
        USING ERRCODE = 'P0001';
    END IF;
    RETURN NEW;
  END IF;

  -- (a) WHO: an unguarded UPDATE of ANY column is refused — including a projected column alone.
  IF current_setting('app.field_worker_state_writer', true) IS DISTINCT FROM 'on' THEN
    RAISE EXCEPTION
      'field_workers direct write rejected — only the event-replay projector may update a field-worker row (Story 13.1 I1); attempted UPDATE of field worker %',
      OLD.field_worker_id
      USING ERRCODE = 'P0001';
  END IF;
  -- (t) TERMINAL: no event leaves `terminated` (I6), so no UPDATE of a terminated row is legal.
  IF OLD.current_state = 'terminated' THEN
    RAISE EXCEPTION
      'field_workers direct write rejected — a terminated field worker is never updated (Story 13.1 I6); attempted UPDATE of field worker %',
      OLD.field_worker_id
      USING ERRCODE = 'P0001';
  END IF;
  -- (b) The identity is IMMUTABLE (I2): everything except the eight projected columns and the approver (rule (f)) is unchanged,
  -- even when guarded. The chained-key form of 0189; a column added later is covered by default (C8 (c)).
  IF (to_jsonb(NEW) - 'current_state' - 'state_event_version' - 'kyc_status' - 'state_reason_code' - 'district' - 'ended_on' - 'audit_id' - 'updated_at' - 'approved_by_display')
     IS DISTINCT FROM
     (to_jsonb(OLD) - 'current_state' - 'state_event_version' - 'kyc_status' - 'state_reason_code' - 'district' - 'ended_on' - 'audit_id' - 'updated_at' - 'approved_by_display') THEN
    RAISE EXCEPTION
      'field_workers direct write rejected — a field worker''s identity is immutable after field_worker.registered (Story 13.1 I2, QE15); attempted an identity-column change on field worker %',
      OLD.field_worker_id
      USING ERRCODE = 'P0001';
  END IF;
  -- (c) The replay anchor strictly increases (I3).
  IF NEW.state_event_version <= OLD.state_event_version THEN
    RAISE EXCEPTION
      'field_workers direct write rejected — state_event_version must strictly increase (Story 13.1 I3); attempted % -> % on field worker %',
      OLD.state_event_version, NEW.state_event_version, OLD.field_worker_id
      USING ERRCODE = 'P0001';
  END IF;
  -- (d′) An identity attestation is never withdrawn by a write: kyc_status never goes completed → pending (I3).
  IF OLD.kyc_status = 'completed' AND NEW.kyc_status = 'pending' THEN
    RAISE EXCEPTION
      'field_workers direct write rejected — kyc_status never goes completed -> pending (Story 13.1 I3); attempted on field worker %',
      OLD.field_worker_id
      USING ERRCODE = 'P0001';
  END IF;
  -- (e′) A move of reporting district (`field_worker.posted`) changes the district ONLY (I3, QE17).
  IF NEW.district IS DISTINCT FROM OLD.district
     AND (NEW.current_state IS DISTINCT FROM OLD.current_state
          OR NEW.kyc_status IS DISTINCT FROM OLD.kyc_status
          OR NEW.state_reason_code IS DISTINCT FROM OLD.state_reason_code
          OR NEW.ended_on IS DISTINCT FROM OLD.ended_on) THEN
    RAISE EXCEPTION
      'field_workers direct write rejected — a district change must not coincide with a state, kyc, reason or ended_on change (Story 13.1 I3); attempted on field worker %',
      OLD.field_worker_id
      USING ERRCODE = 'P0001';
  END IF;
  -- (f) The approver (Story 13.1a, decision -447 item 2) is set ONCE: NULL → a value, in the `pending_kyc → active` write only.
  IF NEW.approved_by_display IS DISTINCT FROM OLD.approved_by_display
     AND NOT (OLD.approved_by_display IS NULL
              AND NEW.approved_by_display IS NOT NULL
              AND OLD.current_state = 'pending_kyc'
              AND NEW.current_state = 'active') THEN
    RAISE EXCEPTION
      'field_workers direct write rejected — approved_by_display is set once, by the approval (pending_kyc -> active), and never changed (Story 13.1a); attempted on field worker %',
      OLD.field_worker_id
      USING ERRCODE = 'P0001';
  END IF;
  RETURN NEW;
END;
$$;
