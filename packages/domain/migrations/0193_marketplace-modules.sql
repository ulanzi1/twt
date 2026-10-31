-- Migration 0193 — marketplace_modules (Story 12.1, Task 2.3). The SIXTH event-derived-state primitive
-- (twin of members / claims / pools / alerts / helpdesk_tickets): an IMMUTABLE bilingual partner-module
-- manifest + a projector-only lifecycle cache, plus the two `events_log` partial unique indexes that make
-- a lead one-place-per-member and idempotent (QE8).
--
-- ⚠ DO NOT REGENERATE with `db:generate` (the 0021+ discipline, 0084's header): the drizzle snapshot is
-- frozen at 0020, so a regenerate emits a bloated catch-up migration and can raise 42P07. HAND-AUTHORED;
-- it carries ONLY this story's DDL. No snapshot file. The roles exist since 0002 (no CREATE ROLE). There
-- is ⛔ `pariwars` table, so `pariwar_id` carries ⛔ FK (G17), and neither does `partner_id` (12.2's).
--
-- Hand-supplements (relative to the drizzle-declared table / policies):
--   1. GRANT SELECT, INSERT, UPDATE to twt_app — ⛔ DELETE: a module is never row-deleted (it ends by
--      `module.archived`), and a DELETE would orphan its events_log stream.
--   2. ENABLE + FORCE ROW LEVEL SECURITY, with three per-command policies (⛔ FOR ALL).
--   3. The whole-row write guard trigger `marketplace_modules_state_write_guard` (I1–I3). ⚠ A literal 0084
--      copy would guard only the state pair (TR10); this one guards EVERY column:
--        INSERT  — the guard must be 'on'; and the row must be the genesis shape: current_state 'draft',
--                  state_event_version 1, slots_remaining IS NOT DISTINCT FROM slot_capacity,
--                  archive_reason NULL.
--        UPDATE  — (a) the guard must be 'on' (an unguarded UPDATE of ANY column is refused);
--                  (b) every column EXCEPT the six projected ones is unchanged (the 0189 chained-key
--                      form) — so a column added later is immutable by default (C12);
--                  (c) state_event_version strictly increases;
--                  (d) slots_remaining stays or drops by exactly 1;
--                  (e) a state change never moves slots_remaining.
--      ⚠ A future STORED GENERATED column reads NULL in a BEFORE trigger's NEW, so (b) would reject every
--      guarded UPDATE. Add any such column to (b)'s exclusion chain (C12).
--      ⚠ A guarded slots_remaining 0 → -1 PASSES (d) and is refused by the CHECK
--      marketplace_modules_slots_range (23514) — the CHECKs are the shape backstop.
--   4. The two `events_log` partial unique indexes (QE8), hand-authored because drizzle-kit does not model
--      JSONB-expression partial indexes (the 0079 precedent). Named in schema/events_log.ts's header, ⛔
--      declared on the Drizzle table.
--
-- ⚠⚠ THE COST OF (4), STATED HONESTLY (G13). Each `CREATE INDEX` takes a SHARE lock on `events_log` and
-- scans the WHOLE table — a partial index's WHERE filters the tuples it indexes, ⛔ the heap it scans. For
-- the length of BOTH builds every event INSERT in the system (every tenant, every primitive) waits. ⛔ It
-- is NOT fast "because no module.lead_submitted rows exist": the cost is set by the SIZE of events_log, ⛔
-- by the count of lead rows. `CREATE INDEX CONCURRENTLY` is impossible here — drizzle-kit wraps each
-- migration in a transaction (25001, the 0096 header).
-- WHY IT IS ACCEPTED NOW: TWT has ⛔ production deployment, so the first live run of this migration is on a
-- fresh or small database; precedents 0079 (the same SHARE-lock partial unique index on events_log) and
-- 0185 (an ACCESS EXCLUSIVE rewrite of it). docs/runbooks/deploy.md runs the migration phase BEFORE code
-- promotion, i.e. while the previous code is still serving — so the wait is felt by live traffic.
-- ⛔⚠ RE-CHECK TRIGGER: if a live deployment with a populated events_log exists when this lands, STOP and
-- route these two index builds to a separate, non-transactional step run outside the migrator
-- (`CREATE UNIQUE INDEX CONCURRENTLY`, a deploy-runbook change) — ⛔ ship them in-migration.

CREATE TYPE "public"."marketplace_module_state" AS ENUM('draft', 'scheduled', 'active', 'archived');--> statement-breakpoint
CREATE TYPE "public"."marketplace_module_archive_reason" AS ENUM('trustee_archived', 'valid_until_reached', 'slot_capacity_exhausted');--> statement-breakpoint
CREATE TABLE "marketplace_modules" (
	"module_id" uuid PRIMARY KEY NOT NULL,
	"pariwar_id" uuid NOT NULL,
	"partner_id" uuid NOT NULL,
	"name_en" text NOT NULL,
	"name_hi" text NOT NULL,
	"description_en" text NOT NULL,
	"description_hi" text NOT NULL,
	"eligibility_filter" jsonb NOT NULL,
	"scope_filter" jsonb NOT NULL,
	"valid_from" timestamp with time zone NOT NULL,
	"valid_until" timestamp with time zone NOT NULL,
	"slot_capacity" integer,
	"lead_handoff_url" text NOT NULL,
	"lead_handoff_signing_key_secret_name" text NOT NULL,
	"branding_bundle" jsonb NOT NULL,
	"manifest_schema_version" smallint NOT NULL,
	"current_state" "marketplace_module_state" NOT NULL,
	"state_event_version" bigint NOT NULL,
	"slots_remaining" integer,
	"archive_reason" "marketplace_module_archive_reason",
	"audit_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "marketplace_modules_window" CHECK ("valid_until" > "valid_from"),
	CONSTRAINT "marketplace_modules_capacity_positive" CHECK ("slot_capacity" > 0),
	CONSTRAINT "marketplace_modules_slots_pair" CHECK (("slot_capacity" IS NULL) = ("slots_remaining" IS NULL)),
	CONSTRAINT "marketplace_modules_slots_range" CHECK ("slots_remaining" >= 0 AND "slots_remaining" <= "slot_capacity"),
	CONSTRAINT "marketplace_modules_archive_reason_pair" CHECK (("current_state" = 'archived') = ("archive_reason" IS NOT NULL)),
	CONSTRAINT "marketplace_modules_manifest_schema_version_v1" CHECK ("manifest_schema_version" = 1)
);
--> statement-breakpoint
-- (1) Table privileges for the app role (SELECT / INSERT / UPDATE, ⛔ DELETE — see the header).
GRANT SELECT, INSERT, UPDATE ON "marketplace_modules" TO twt_app;--> statement-breakpoint
-- (2) RLS on, then FORCE it (applies even to the non-superuser table owner).
ALTER TABLE "marketplace_modules" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "marketplace_modules" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE INDEX "marketplace_modules_pariwar_id_idx" ON "marketplace_modules" USING btree ("pariwar_id");--> statement-breakpoint
CREATE INDEX "marketplace_modules_pariwar_state_idx" ON "marketplace_modules" USING btree ("pariwar_id","current_state");--> statement-breakpoint
CREATE POLICY "marketplace_modules_tenant_isolation_select" ON "marketplace_modules" AS PERMISSIVE FOR SELECT TO "twt_app" USING (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "marketplace_modules_tenant_isolation_insert" ON "marketplace_modules" AS PERMISSIVE FOR INSERT TO "twt_app" WITH CHECK (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "marketplace_modules_tenant_isolation_update" ON "marketplace_modules" AS PERMISSIVE FOR UPDATE TO "twt_app" USING (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid) WITH CHECK (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid);--> statement-breakpoint
-- (3) The whole-row write guard (I1–I3). Only the projector (marketplace/project.ts), which sets
-- app.marketplace_module_state_writer = 'on' inside its transaction, may INSERT or UPDATE a row — and even
-- then only the six projected columns may change, by the rules (c)–(e). Every RAISE uses ERRCODE 'P0001'
-- and the message PREFIX 'marketplace_modules direct write rejected' (MODULE_STATE_DIRECT_WRITE_MESSAGE_PREFIX).
CREATE FUNCTION marketplace_modules_reject_unguarded_state_write()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF current_setting('app.marketplace_module_state_writer', true) IS DISTINCT FROM 'on' THEN
      RAISE EXCEPTION
        'marketplace_modules direct write rejected — only the event-replay projector may create a module row (Story 12.1 I1); attempted INSERT of module %',
        NEW.module_id
        USING ERRCODE = 'P0001';
    END IF;
    -- WHAT, not just WHO: a guarded genesis INSERT must be the one legal genesis shape (I3).
    IF NEW.current_state IS DISTINCT FROM 'draft'
       OR NEW.state_event_version IS DISTINCT FROM 1
       OR NEW.slots_remaining IS DISTINCT FROM NEW.slot_capacity
       OR NEW.archive_reason IS NOT NULL THEN
      RAISE EXCEPTION
        'marketplace_modules direct write rejected — a genesis INSERT must be draft / version 1 / slots_remaining = slot_capacity / no archive_reason (Story 12.1 I3); attempted state "%" version % slots %/% reason % for module %',
        NEW.current_state, NEW.state_event_version, NEW.slots_remaining, NEW.slot_capacity, NEW.archive_reason, NEW.module_id
        USING ERRCODE = 'P0001';
    END IF;
    RETURN NEW;
  END IF;

  -- (a) WHO: an unguarded UPDATE of ANY column is refused — including a projected column alone.
  IF current_setting('app.marketplace_module_state_writer', true) IS DISTINCT FROM 'on' THEN
    RAISE EXCEPTION
      'marketplace_modules direct write rejected — only the event-replay projector may update a module row (Story 12.1 I1); attempted UPDATE of module %',
      OLD.module_id
      USING ERRCODE = 'P0001';
  END IF;
  -- (b) The manifest is IMMUTABLE (I2): everything except the six projected columns is unchanged, even
  -- when guarded. The chained-key form of 0189; a column added later is covered by default (C12).
  IF (to_jsonb(NEW) - 'current_state' - 'state_event_version' - 'slots_remaining' - 'archive_reason' - 'audit_id' - 'updated_at')
     IS DISTINCT FROM
     (to_jsonb(OLD) - 'current_state' - 'state_event_version' - 'slots_remaining' - 'archive_reason' - 'audit_id' - 'updated_at') THEN
    RAISE EXCEPTION
      'marketplace_modules direct write rejected — the module manifest is immutable after module.authored (Story 12.1 I2, QE11); attempted a content-column change on module %',
      OLD.module_id
      USING ERRCODE = 'P0001';
  END IF;
  -- (c) The replay anchor strictly increases (I3).
  IF NEW.state_event_version <= OLD.state_event_version THEN
    RAISE EXCEPTION
      'marketplace_modules direct write rejected — state_event_version must strictly increase (Story 12.1 I3); attempted % -> % on module %',
      OLD.state_event_version, NEW.state_event_version, OLD.module_id
      USING ERRCODE = 'P0001';
  END IF;
  -- (d) A place is taken one at a time: slots_remaining stays or drops by exactly 1 (I3, I5).
  IF NEW.slots_remaining IS DISTINCT FROM OLD.slots_remaining
     AND NEW.slots_remaining IS DISTINCT FROM OLD.slots_remaining - 1 THEN
    RAISE EXCEPTION
      'marketplace_modules direct write rejected — slots_remaining may only stay or drop by 1 (Story 12.1 I3); attempted % -> % on module %',
      OLD.slots_remaining, NEW.slots_remaining, OLD.module_id
      USING ERRCODE = 'P0001';
  END IF;
  -- (e) A state change never takes a place (only a same-state lead does) (I3).
  IF NEW.current_state IS DISTINCT FROM OLD.current_state
     AND NEW.slots_remaining IS DISTINCT FROM OLD.slots_remaining THEN
    RAISE EXCEPTION
      'marketplace_modules direct write rejected — a state change must not move slots_remaining (Story 12.1 I3); attempted "%" -> "%" with slots % -> % on module %',
      OLD.current_state, NEW.current_state, OLD.slots_remaining, NEW.slots_remaining, OLD.module_id
      USING ERRCODE = 'P0001';
  END IF;
  RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER marketplace_modules_state_write_guard
  BEFORE INSERT OR UPDATE ON marketplace_modules
  FOR EACH ROW EXECUTE FUNCTION marketplace_modules_reject_unguarded_state_write();
--> statement-breakpoint
-- (4) QE8 — one place per member per module, and a lead id is used once, ever. See the header for the
-- SHARE-lock / full-scan cost of each build. The key names equal the zod payload keys exactly
-- (`member_id`, `lead_id`); the payload validates both as LOWER-CASE uuids, so case cannot bypass a
-- text-keyed index. Under RLS `->>` is not leakproof, so these serve uniqueness (which ignores RLS), ⛔ an
-- Index Cond for a twt_app read (G16, the 0185 note).
CREATE UNIQUE INDEX "module_lead_member_uq"
	ON "events_log" ("stream_id", (payload ->> 'member_id'))
	WHERE event_type = 'module.lead_submitted';--> statement-breakpoint
-- Global (⛔ per-stream): a lead_id reused on ANOTHER module — even another tenant's — is a 23505.
-- DELIBERATE (checklist family 9). ⭐ RE-EXAMINE if Story 12.3 lets a CLIENT choose the lead_id: a reused id
-- would then be a cross-tenant collision oracle — derive it server-side, or key (pariwar_id, lead_id).
CREATE UNIQUE INDEX "module_lead_id_uq"
	ON "events_log" ((payload ->> 'lead_id'))
	WHERE event_type = 'module.lead_submitted';
