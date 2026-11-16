-- Migration 0207 — field workers: the UNDO of an ending, the APPEAL record, and the LINK from a returning worker's new registration to
-- their old record (Story 13.1f, Task 2; decision `2026-11-16-464` AD4, AD7, AD12; the Panel's `-454` Q1 A / Q2 B).
--
-- ⚠ DO NOT REGENERATE with `db:generate` (the 0021+ discipline): HAND-AUTHORED; it carries ONLY this story's DDL. No snapshot file.
-- ⛔ Edit 0200 / 0201 / 0205. The journal `when` sits above 0206's ([[project_sibling_migration_when_order_shared_db]]).
--
-- (1) THE GUARD FUNCTION is REPLACED (`CREATE OR REPLACE` — the trigger keeps pointing at it), COPIED FROM 0201 (the LAST definition —
--     ⛔ 0200's older body, which lacks rule (f) and the approver exclusion; TR2). ONE rule changes: (t) "a terminated field worker is
--     never updated" becomes (t′) — an UPDATE of a terminated row is refused UNLESS the undo writer variable
--     (`app.field_worker_undo_writer`, set by the projector for `field_worker.ending_undone` ONLY, AD3) is 'on' AND the new state is not
--     `terminated` AND `ended_on` becomes NULL AND the district and the KYC status are unchanged. Its message starts with the shared prefix
--     `field_workers direct write rejected` (G25 — `isFieldWorkerStateDirectWriteError` matches it). (t′) sits where (t) sat, between (a)
--     and (b), so it answers before (c). Every other rule — INSERT, (a), (b), (c), (d′), (e′), (f) — is 0201's, word for word.
--     ⚠ The database does NOT check that the target is "as they were": any non-terminated state and any reason the CHECKs allow pass
--     (t′). The command (the stream fold under the lock, AD2) and the projector (the undone event's `from_state`, AD3) do.
--     ⚠ STORY 13.1e (the 8-year scrub) must `CREATE OR REPLACE` THIS body (copy 0207, ⛔ 0201) and carry (t′) forward, narrowed so a
--     scrubbed record is never undone (deferred-work 13.1f C2).
--
-- (2) `field_workers.previous_field_worker_id` (AD12; Q2 B) — the earlier, ENDED record of this Pariwar the registering officer linked the
--     new registration to (NULL for every other worker). Written ONLY by the genesis INSERT (from the `field_worker.registered` payload);
--     rule (b) makes it immutable afterwards by default (a column added later is covered — G9). A CHECK that it is not the row itself and
--     a COMPOSITE FK `(pariwar_id, previous_field_worker_id)` → `field_workers (pariwar_id, field_worker_id)` (the target is
--     `field_workers_pariwar_worker_uq`; a single-column FK check bypasses RLS — 0178). That the linked record is TERMINATED and holds
--     the SAME number is the API's re-check under `FOR SHARE` (AD12), not a constraint (an undo may later make it live — allowed).
--
-- (3) `field_worker_ending_appeals` (AD7) — the PROJECTION of an appeal's OWN event stream (`events_log.stream_id = appeal_id`, events
--     `field_worker_ending_appeal.*`), 0205's request shape. ONE ending per appeal (`ending_event_version` — the `field_worker.terminated`
--     event appealed). Written ONLY by `field-worker/ending-appeal-project.ts` under `app.field_worker_ending_appeal_writer = 'on'`. The
--     guard trigger refuses:
--       INSERT — an unguarded one; any but the lodging shape: `open`, version 1, no decider, no decision date;
--       UPDATE — (a) an unguarded one; (f) any change to a FINAL row (`allowed`, `refused`, `withdrawn`, `superseded`); (s) any write that
--                leaves the row `open` (only `open → allowed | refused | withdrawn | superseded` is a transition); (b) a change to any
--                column but the projected ones (the 0189 chained-key form — `pariwar_id`, `field_worker_id`, `ending_event_version`,
--                `heard_by`, `received_on`, `received_via`, `lodged_by_user_id`, `ended_by_user_id` and any column added later are
--                immutable); (c) a version that does not strictly increase;
--       DELETE / TRUNCATE — every role (an appeal is part of the worker's history; only `session_replication_role = 'replica'`, the
--                test fixtures' cleanup, bypasses it).
--     The shape backstops are CHECKs (23514, 13.1d CR1–CR6): open ⇔ no decision date; open ⇔ no decider; the decision on or after the
--     day the appeal was received; and the decider of an allowed / refused / withdrawn appeal is ⛔ the officer who ENDED the worker
--     (AD9 (3); `ended_by_user_id` and `lodged_by_user_id` are NOT NULL — without it the ender CHECK would pass a NULL, since `NULL <> x`
--     is not false). States, the hearer and the channel are TEXT with CHECKs (⛔ pg enums — the ADD VALUE trap). ⚠ LOCKSTEP with the
--     tuples in schema/field_worker_ending_appeals.ts (the policy spec pins them equal). ⭐ ONE OPEN APPEAL PER WORKER (I4): the partial
--     UNIQUE `field_worker_ending_appeals_one_open_uq` — a lodge's 23505 on THIS name maps to 409 `field_worker.appeal_open` (by
--     constraint name, ⛔ by any 23505). ⛔ Free text anywhere (13.1 QE12): no grounds, no notes.
--     Grants to `twt_app`: SELECT, INSERT, UPDATE (⛔ DELETE); ENABLE + FORCE RLS with three per-command policies.
--     PII: ⛔ (ids, dates, codes, user ids). The 8-year removal (row 13-1e) must not scrub a worker with an OPEN appeal (C2).
-- Statement order: guard function → link column → appeal CREATE → CHECKs → GRANT → ENABLE → FORCE → POLICY → indexes → triggers.
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
  -- (t′) A terminated worker leaves `terminated` ONLY by an undo (Story 13.1f AD4, `-454` Q1 A): the undo writer variable is on, the
  -- row leaves `terminated`, `ended_on` is cleared, and the district and the KYC status are kept. Any other UPDATE of a terminated row
  -- is refused. The TARGET ("as they were") is the command's and the projector's to check, not this rule's.
  IF OLD.current_state = 'terminated'
     AND (current_setting('app.field_worker_undo_writer', true) IS DISTINCT FROM 'on'
          OR NEW.current_state = 'terminated'
          OR NEW.ended_on IS NOT NULL
          OR NEW.district IS DISTINCT FROM OLD.district
          OR NEW.kyc_status IS DISTINCT FROM OLD.kyc_status) THEN
    RAISE EXCEPTION
      'field_workers direct write rejected — a terminated field worker leaves terminated only by an undo (Story 13.1f AD4); attempted UPDATE of field worker %',
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
--> statement-breakpoint
ALTER TABLE "field_workers" ADD COLUMN "previous_field_worker_id" uuid;--> statement-breakpoint
ALTER TABLE "field_workers" ADD CONSTRAINT "field_workers_previous_not_self" CHECK ("previous_field_worker_id" IS NULL OR "previous_field_worker_id" <> "field_worker_id");--> statement-breakpoint
ALTER TABLE "field_workers" ADD CONSTRAINT "field_workers_previous_fk" FOREIGN KEY ("pariwar_id", "previous_field_worker_id") REFERENCES "public"."field_workers"("pariwar_id", "field_worker_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE TABLE "field_worker_ending_appeals" (
	"appeal_id" uuid PRIMARY KEY NOT NULL,
	"pariwar_id" uuid NOT NULL,
	"field_worker_id" uuid NOT NULL,
	"ending_event_version" bigint NOT NULL,
	"state" text NOT NULL,
	"heard_by" text NOT NULL,
	"received_on" date NOT NULL,
	"received_via" text NOT NULL,
	"lodged_by_user_id" uuid NOT NULL,
	"ended_by_user_id" uuid NOT NULL,
	"decided_by_user_id" uuid,
	"decided_on" date,
	"state_event_version" bigint NOT NULL,
	"audit_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint
ALTER TABLE "field_worker_ending_appeals" ADD CONSTRAINT "field_worker_ending_appeals_worker_fk" FOREIGN KEY ("pariwar_id", "field_worker_id") REFERENCES "public"."field_workers"("pariwar_id", "field_worker_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
-- ⚠ LOCKSTEP with `FIELD_WORKER_ENDING_APPEAL_STATES`. Open: `open`; the four others are final (AD7).
ALTER TABLE "field_worker_ending_appeals" ADD CONSTRAINT "field_worker_ending_appeals_state_check" CHECK ("state" IN ('open', 'allowed', 'refused', 'withdrawn', 'superseded'));--> statement-breakpoint
-- ⚠ LOCKSTEP with `FIELD_WORKER_ENDING_APPEAL_HEARERS` — fixed at the ending (AD8).
ALTER TABLE "field_worker_ending_appeals" ADD CONSTRAINT "field_worker_ending_appeals_heard_by_check" CHECK ("heard_by" IN ('pariwar_admin', 'trustee_panel'));--> statement-breakpoint
-- ⚠ LOCKSTEP with `FIELD_WORKER_ENDING_APPEAL_CHANNELS` — `-454`: "by phone or in person".
ALTER TABLE "field_worker_ending_appeals" ADD CONSTRAINT "field_worker_ending_appeals_received_via_check" CHECK ("received_via" IN ('phone', 'in_person'));--> statement-breakpoint
ALTER TABLE "field_worker_ending_appeals" ADD CONSTRAINT "field_worker_ending_appeals_ending_version_positive" CHECK ("ending_event_version" > 1);--> statement-breakpoint
-- 13.1d CR1–CR6, carried: the decision's two columns are NULL exactly while open; the decision is never before the appeal was received;
-- the officer who ended the worker never decides or withdraws (a `superseded` row's decider is the officer who undid — it may be the ender).
ALTER TABLE "field_worker_ending_appeals" ADD CONSTRAINT "field_worker_ending_appeals_open_decided_on" CHECK (("state" = 'open') = ("decided_on" IS NULL));--> statement-breakpoint
ALTER TABLE "field_worker_ending_appeals" ADD CONSTRAINT "field_worker_ending_appeals_open_decided_by" CHECK (("state" = 'open') = ("decided_by_user_id" IS NULL));--> statement-breakpoint
ALTER TABLE "field_worker_ending_appeals" ADD CONSTRAINT "field_worker_ending_appeals_decided_after_received" CHECK ("decided_on" IS NULL OR "decided_on" >= "received_on");--> statement-breakpoint
ALTER TABLE "field_worker_ending_appeals" ADD CONSTRAINT "field_worker_ending_appeals_decider_not_ender" CHECK ("state" NOT IN ('allowed', 'refused', 'withdrawn') OR "decided_by_user_id" <> "ended_by_user_id");--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE ON "field_worker_ending_appeals" TO twt_app;--> statement-breakpoint
ALTER TABLE "field_worker_ending_appeals" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "field_worker_ending_appeals" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "field_worker_ending_appeals_tenant_isolation_select" ON "field_worker_ending_appeals" AS PERMISSIVE FOR SELECT TO "twt_app" USING (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "field_worker_ending_appeals_tenant_isolation_insert" ON "field_worker_ending_appeals" AS PERMISSIVE FOR INSERT TO "twt_app" WITH CHECK (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "field_worker_ending_appeals_tenant_isolation_update" ON "field_worker_ending_appeals" AS PERMISSIVE FOR UPDATE TO "twt_app" USING (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid) WITH CHECK (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid);--> statement-breakpoint
-- I4 — at most ONE open appeal per worker (a partial unique — ⛔ a plain UNIQUE, the 10.22 lesson).
CREATE UNIQUE INDEX "field_worker_ending_appeals_one_open_uq" ON "field_worker_ending_appeals" USING btree ("pariwar_id", "field_worker_id") WHERE "state" = 'open';--> statement-breakpoint
-- The list (AD13), newest first; and one worker's appeals (the per-worker read, and the lodge's open / refused checks).
CREATE INDEX "field_worker_ending_appeals_pariwar_idx" ON "field_worker_ending_appeals" USING btree ("pariwar_id", "created_at" DESC, "appeal_id" DESC);--> statement-breakpoint
CREATE INDEX "field_worker_ending_appeals_worker_idx" ON "field_worker_ending_appeals" USING btree ("pariwar_id", "field_worker_id", "created_at" DESC, "appeal_id" DESC);--> statement-breakpoint
CREATE FUNCTION field_worker_ending_appeals_reject_unguarded_write()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF current_setting('app.field_worker_ending_appeal_writer', true) IS DISTINCT FROM 'on' THEN
      RAISE EXCEPTION
        'field_worker_ending_appeals direct write rejected — only the appeal projector may create an appeal (Story 13.1f AD7); attempted INSERT of appeal %',
        NEW.appeal_id
        USING ERRCODE = 'P0001';
    END IF;
    IF NEW.state IS DISTINCT FROM 'open'
       OR NEW.state_event_version IS DISTINCT FROM 1
       OR NEW.decided_by_user_id IS NOT NULL
       OR NEW.decided_on IS NOT NULL THEN
      RAISE EXCEPTION
        'field_worker_ending_appeals direct write rejected — a lodging INSERT must be open / version 1 / no decision (Story 13.1f AD7); attempted state "%" version % for appeal %',
        NEW.state, NEW.state_event_version, NEW.appeal_id
        USING ERRCODE = 'P0001';
    END IF;
    RETURN NEW;
  END IF;

  -- (a) WHO.
  IF current_setting('app.field_worker_ending_appeal_writer', true) IS DISTINCT FROM 'on' THEN
    RAISE EXCEPTION
      'field_worker_ending_appeals direct write rejected — only the appeal projector may update an appeal (Story 13.1f AD7); attempted UPDATE of appeal %',
      OLD.appeal_id
      USING ERRCODE = 'P0001';
  END IF;
  -- (f) A FINAL appeal is frozen (AD7).
  IF OLD.state IN ('allowed', 'refused', 'withdrawn', 'superseded') THEN
    RAISE EXCEPTION
      'field_worker_ending_appeals direct write rejected — a final appeal (%) is never updated (Story 13.1f AD7); attempted UPDATE of appeal %',
      OLD.state, OLD.appeal_id
      USING ERRCODE = 'P0001';
  END IF;
  -- (s) The only transition is open → a final state (AD7): a write that leaves the row open is refused.
  IF NEW.state = 'open' THEN
    RAISE EXCEPTION
      'field_worker_ending_appeals direct write rejected — an open appeal only moves to allowed, refused, withdrawn or superseded (Story 13.1f AD7); attempted open -> open on appeal %',
      OLD.appeal_id
      USING ERRCODE = 'P0001';
  END IF;
  -- (b) Everything but the projected columns is IMMUTABLE.
  IF (to_jsonb(NEW) - 'state' - 'decided_by_user_id' - 'decided_on' - 'state_event_version' - 'audit_id' - 'updated_at')
     IS DISTINCT FROM
     (to_jsonb(OLD) - 'state' - 'decided_by_user_id' - 'decided_on' - 'state_event_version' - 'audit_id' - 'updated_at') THEN
    RAISE EXCEPTION
      'field_worker_ending_appeals direct write rejected — an appeal''s identity is immutable after its lodging (Story 13.1f AD7); attempted an identity-column change on appeal %',
      OLD.appeal_id
      USING ERRCODE = 'P0001';
  END IF;
  -- (c) The replay anchor strictly increases.
  IF NEW.state_event_version <= OLD.state_event_version THEN
    RAISE EXCEPTION
      'field_worker_ending_appeals direct write rejected — state_event_version must strictly increase (Story 13.1f AD7); attempted % -> % on appeal %',
      OLD.state_event_version, NEW.state_event_version, OLD.appeal_id
      USING ERRCODE = 'P0001';
  END IF;
  RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER field_worker_ending_appeals_write_guard
  BEFORE INSERT OR UPDATE ON field_worker_ending_appeals
  FOR EACH ROW EXECUTE FUNCTION field_worker_ending_appeals_reject_unguarded_write();
--> statement-breakpoint
CREATE FUNCTION field_worker_ending_appeals_reject_delete()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION
    'field_worker_ending_appeals direct write rejected — an appeal is never deleted (Story 13.1f AD7): % rejected', TG_OP
    USING ERRCODE = 'P0001';
END;
$$;
--> statement-breakpoint
CREATE TRIGGER field_worker_ending_appeals_no_delete
  BEFORE DELETE ON field_worker_ending_appeals
  FOR EACH ROW EXECUTE FUNCTION field_worker_ending_appeals_reject_delete();
--> statement-breakpoint
CREATE TRIGGER field_worker_ending_appeals_no_truncate
  BEFORE TRUNCATE ON field_worker_ending_appeals
  FOR EACH STATEMENT EXECUTE FUNCTION field_worker_ending_appeals_reject_delete();
