-- Migration 0200 — field_workers (Story 13.1, Task 2.2). The SEVENTH event-derived-state primitive (twin of members /
-- claims / pools / alerts / helpdesk_tickets / marketplace_modules): a Pariwar-scoped field-worker identity (Tier-1 name
-- + mobile ciphertext, a Tier-2 mobile blind index in the DISJOINT `field_worker_mobile` space) + a projector-only
-- lifecycle cache `pending_kyc → active ⇄ suspended → terminated`, and the COMPOSITE FK Story 13.2 left open on
-- `field_worker_attribution_codes`.
--
-- ⚠ DO NOT REGENERATE with `db:generate` (the 0021+ discipline, 0084's header): the drizzle snapshot is frozen at 0020,
-- so a regenerate emits a bloated catch-up migration and can raise 42P07. HAND-AUTHORED; it carries ONLY this story's
-- DDL. No snapshot file. The roles exist since 0002 (no CREATE ROLE). There is ⛔ `pariwars` table, so `pariwar_id`
-- carries ⛔ FK (G14); `registered_by_user_id` and `audit_id` carry ⛔ FK either (an attribution outlives its user row).
--
-- ⚠⚠ THE FK ADD AT THE END SCANS 13.2's TABLE (TR2). A plain `ADD CONSTRAINT … FOREIGN KEY` validates every existing
-- `field_worker_attribution_codes` row. CI and production hold none (nothing is live — no route allocated a code before
-- this story); a developer database that ever ran 13.2's `allocate-concurrency.spec.ts` to a crash may hold ORPHAN code
-- rows, and this migration then fails with 23503. Clear them under `session_replication_role = 'replica'` first — ⛔ edit
-- this file once it has been applied anywhere.
--
-- Hand-supplements (relative to the drizzle-declared table / policies):
--   1. GRANT SELECT, INSERT, UPDATE to twt_app — ⛔ DELETE, ⛔ TRUNCATE: a worker row is never deleted (I10).
--   2. ENABLE + FORCE ROW LEVEL SECURITY, with three per-command policies (⛔ FOR ALL).
--   3. The whole-row write guard trigger `field_workers_state_write_guard` (I1–I3, I6) — a copy of 0193's
--      `marketplace_modules_reject_unguarded_state_write` with its slot rules (d) / (e) DROPPED and these of its own:
--        INSERT  — the guard must be 'on'; and the row must be the genesis shape: current_state 'pending_kyc',
--                  kyc_status 'pending', state_event_version 1, state_reason_code NULL, ended_on NULL, a non-blank
--                  district.
--        UPDATE  — (a) the guard must be 'on' (an unguarded UPDATE of ANY column is refused);
--                  (t) a TERMINATED row is never updated, guarded or not (I6 — 0193 has no terminal rule; a resurrected
--                      row would re-enter the partial unique index and could collide with a live re-registration);
--                  (b) every column EXCEPT the eight projected ones is unchanged (the 0189 chained-key form) — so a
--                      column added later is immutable by default (C8 (c));
--                  (c) state_event_version strictly increases;
--                  (d′) kyc_status never goes 'completed' → 'pending';
--                  (e′) a district change never coincides with a change of current_state, kyc_status,
--                       state_reason_code or ended_on (only `field_worker.posted` moves the district).
--      ⚠ A future STORED GENERATED column reads NULL in a BEFORE trigger's NEW, so (b) would reject every guarded UPDATE.
--      Add any such column to (b)'s exclusion chain. ⚠ The 8-year removal (C5) scrubs three IDENTITY columns of a
--      TERMINATED row — its migration must `CREATE OR REPLACE` this function to admit that scrub under its own writer
--      variable ((t) and (b) both refuse it as written).
--      The reason PAIR / SUBSET, `active ⇒ kyc completed` and `terminated ⇔ ended_on` rules are CHECKs (23514), ⛔ trigger
--      rules — the CHECKs are the shape backstop.
--   4. Row-level `BEFORE DELETE` and statement-level `BEFORE TRUNCATE` triggers that refuse EVERY role — the owner and a
--      superuser too (I10); only `session_replication_role = 'replica'` (the test fixtures' cleanup) bypasses them.
--      ⚠ A plain owner `TRUNCATE field_workers` is refused EARLIER with 0A000 (the table is referenced by a foreign key —
--      checked before any trigger); `TRUNCATE … CASCADE` reaches this trigger.
--   5. The COMPOSITE FK `field_worker_attribution_codes_worker_fk` (Story 13.2 C1) `ON DELETE NO ACTION`, targeting
--      `field_workers_pariwar_worker_uq` — a code's holder exists in the SAME Pariwar (a single-column FK check bypasses
--      RLS — the 0178 precedent).
-- Every RAISE in 3 and 4 uses ERRCODE 'P0001' and the message PREFIX 'field_workers direct write rejected'
-- (FIELD_WORKER_STATE_DIRECT_WRITE_MESSAGE_PREFIX).

CREATE TYPE "public"."field_worker_state" AS ENUM('pending_kyc', 'active', 'suspended', 'terminated');--> statement-breakpoint
CREATE TYPE "public"."field_worker_kyc_status" AS ENUM('pending', 'completed');--> statement-breakpoint
CREATE TYPE "public"."field_worker_reason_code" AS ENUM('under_review', 'at_worker_request', 'left_voluntarily', 'inactive', 'registered_in_error', 'reassigned');--> statement-breakpoint
CREATE TABLE "field_workers" (
	"field_worker_id" uuid PRIMARY KEY NOT NULL,
	"pariwar_id" uuid NOT NULL,
	"name_ciphertext" text NOT NULL,
	"mobile_ciphertext" text NOT NULL,
	"mobile_blind_index" text NOT NULL,
	"registered_by_user_id" uuid NOT NULL,
	"registered_by_display" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"current_state" "field_worker_state" NOT NULL,
	"state_event_version" bigint NOT NULL,
	"kyc_status" "field_worker_kyc_status" NOT NULL,
	"state_reason_code" "field_worker_reason_code",
	"district" text NOT NULL,
	"ended_on" date,
	"audit_id" uuid NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "field_workers_pariwar_worker_uq" UNIQUE("pariwar_id","field_worker_id"),
	CONSTRAINT "field_workers_state_reason_pair" CHECK (("current_state" IN ('suspended', 'terminated')) = ("state_reason_code" IS NOT NULL)),
	CONSTRAINT "field_workers_state_reason_subset" CHECK (("current_state" <> 'suspended' OR "state_reason_code" IN ('under_review', 'at_worker_request')) AND ("current_state" <> 'terminated' OR "state_reason_code" IN ('left_voluntarily', 'inactive', 'registered_in_error'))),
	CONSTRAINT "field_workers_active_needs_kyc" CHECK ("current_state" <> 'active' OR "kyc_status" = 'completed'),
	CONSTRAINT "field_workers_registered_by_display_nonblank" CHECK (length(btrim("registered_by_display")) > 0),
	CONSTRAINT "field_workers_district_nonblank" CHECK (length(btrim("district")) > 0),
	CONSTRAINT "field_workers_ended_on_pair" CHECK (("current_state" = 'terminated') = ("ended_on" IS NOT NULL))
);
--> statement-breakpoint
-- (1) Table privileges for the app role (SELECT / INSERT / UPDATE, ⛔ DELETE, ⛔ TRUNCATE — see the header).
GRANT SELECT, INSERT, UPDATE ON "field_workers" TO twt_app;--> statement-breakpoint
-- (2) RLS on, then FORCE it (applies even to the non-superuser table owner).
ALTER TABLE "field_workers" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "field_workers" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "field_workers_tenant_isolation_select" ON "field_workers" AS PERMISSIVE FOR SELECT TO "twt_app" USING (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "field_workers_tenant_isolation_insert" ON "field_workers" AS PERMISSIVE FOR INSERT TO "twt_app" WITH CHECK (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "field_workers_tenant_isolation_update" ON "field_workers" AS PERMISSIVE FOR UPDATE TO "twt_app" USING (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid) WITH CHECK (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid);--> statement-breakpoint
-- One LIVE worker per mobile per Pariwar (QE4). A terminated worker's mobile may register again — a UNIQUE over ALL rows
-- would be a permanent ban by index. The genesis INSERT maps a 23505 on THIS name to
-- `FieldWorkerMobileAlreadyRegisteredError` (by constraint name, ⛔ by any 23505).
CREATE UNIQUE INDEX "field_workers_pariwar_mobile_live_uq" ON "field_workers" USING btree ("pariwar_id","mobile_blind_index") WHERE current_state <> 'terminated';--> statement-breakpoint
CREATE INDEX "field_workers_pariwar_state_idx" ON "field_workers" USING btree ("pariwar_id","current_state");--> statement-breakpoint
-- (3) The whole-row write guard (I1–I3, I6). Only the projector (field-worker/project.ts), which sets
-- app.field_worker_state_writer = 'on' inside its transaction, may INSERT or UPDATE a row — and even then only the eight
-- projected columns may change, by the rules (t), (c), (d′), (e′).
CREATE FUNCTION field_workers_reject_unguarded_state_write()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF current_setting('app.field_worker_state_writer', true) IS DISTINCT FROM 'on' THEN
      RAISE EXCEPTION
        'field_workers direct write rejected — only the event-replay projector may create a field-worker row (Story 13.1 I1); attempted INSERT of field worker %',
        NEW.field_worker_id
        USING ERRCODE = 'P0001';
    END IF;
    -- WHAT, not just WHO: a guarded genesis INSERT must be the one legal genesis shape (I3).
    IF NEW.current_state IS DISTINCT FROM 'pending_kyc'
       OR NEW.kyc_status IS DISTINCT FROM 'pending'
       OR NEW.state_event_version IS DISTINCT FROM 1
       OR NEW.state_reason_code IS NOT NULL
       OR NEW.ended_on IS NOT NULL
       OR NEW.district IS NULL
       OR length(btrim(NEW.district)) = 0 THEN
      RAISE EXCEPTION
        'field_workers direct write rejected — a genesis INSERT must be pending_kyc / kyc pending / version 1 / no reason / no ended_on / a non-blank district (Story 13.1 I3); attempted state "%" kyc "%" version % reason % for field worker %',
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
  -- (b) The identity is IMMUTABLE (I2): everything except the eight projected columns is unchanged, even when guarded.
  -- The chained-key form of 0189; a column added later is covered by default (C8 (c)).
  IF (to_jsonb(NEW) - 'current_state' - 'state_event_version' - 'kyc_status' - 'state_reason_code' - 'district' - 'ended_on' - 'audit_id' - 'updated_at')
     IS DISTINCT FROM
     (to_jsonb(OLD) - 'current_state' - 'state_event_version' - 'kyc_status' - 'state_reason_code' - 'district' - 'ended_on' - 'audit_id' - 'updated_at') THEN
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
  RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER field_workers_state_write_guard
  BEFORE INSERT OR UPDATE ON field_workers
  FOR EACH ROW EXECUTE FUNCTION field_workers_reject_unguarded_state_write();
--> statement-breakpoint
-- (4) I10 — a worker row is never deleted or truncated, by ANY role (the 0199 `attribution_code_reject_mutation` shape,
-- its own function so the message carries this table's prefix).
CREATE FUNCTION field_workers_reject_delete()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION
    'field_workers direct write rejected — a field-worker row is never deleted; erasure anonymizes (Story 13.1 I10): % rejected', TG_OP
    USING ERRCODE = 'P0001';
END;
$$;
--> statement-breakpoint
CREATE TRIGGER field_workers_no_delete
  BEFORE DELETE ON field_workers
  FOR EACH ROW EXECUTE FUNCTION field_workers_reject_delete();
--> statement-breakpoint
CREATE TRIGGER field_workers_no_truncate
  BEFORE TRUNCATE ON field_workers
  FOR EACH STATEMENT EXECUTE FUNCTION field_workers_reject_delete();
--> statement-breakpoint
-- (5) Story 13.2 C1 — a code's holder exists in the SAME Pariwar. ⚠ Validates every existing code row (TR2 — the header).
ALTER TABLE "field_worker_attribution_codes" ADD CONSTRAINT "field_worker_attribution_codes_worker_fk" FOREIGN KEY ("pariwar_id","field_worker_id") REFERENCES "public"."field_workers"("pariwar_id","field_worker_id") ON DELETE no action ON UPDATE no action;
