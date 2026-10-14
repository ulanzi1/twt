-- Migration 0161 — WHERE EACH MEMBER WORKS: the Pariwar's workplace list (schools imported from a documented CSV profile,
-- offices added by the Super Admin), its canonical district spellings, the import batches, the member's *"my workplace isn't
-- listed"* requests, and three new columns on `member_postings` (Story 6.36a, Task 1; AC1; `2026-10-14-330` SW2–SW9).
-- Hand-authored — ⛔ never regenerate (`db:generate` diffs against the 0020 snapshot; the migrator skips by the journal
-- `when`). Number and `when` FIXED by `2026-10-14-332` (6.36b holds 0162 in parallel; 0161 merges first).
--
-- ⭐ (1) `workplace_import_batches` — one row per import run or `--rename-district` (the tool inserts it FIRST, `running`,
-- and finishes it with its counts in the SAME transaction). A rename row carries ⛔ no source fields; every other row
-- carries all five (a CHECK). `finished` is FINAL (a trigger). Counts are NULL until finished.
-- ⭐ (2) `workplace_districts` — the Pariwar's CANONICAL district spellings, written by the import from its district map
-- (SF13: the posting's `district` is compared BYTE-FOR-BYTE by RBAC — ⛔ never normalised on read). A spelling is
-- `retired` ONLY by the tool's explicit `--rename-district` (kept for the postings that copied it — I2 — ⛔ never offered).
-- A Pariwar with ⛔ no row here has ⛔ no list yet ⇒ the member keeps today's free-text district box (SW7).
-- ⭐ (3) `workplaces` — a school (imported, `source = 'import'`, keyed by its 11-digit UDISE code) or an office / a missing
-- school (`source = 'staff'` — the Super Admin's, 6.36c). ⛔ Never deleted: a school missing from a later file is
-- `delisted` (hidden from pickers, kept for every posting that names it — I3). The district is an FK to (2). ⛔ An
-- RBAC scope, ⛔ never public (I1). Column grant: ⛔ never `kind`, the code, `source` or `pariwar_id`.
-- ⭐ (4) `workplace_requests` — *"my workplace isn't listed"*: the typed name (+ an optional village or block, both ≤ 120,
-- ⛔ never a run of seven digits — the writer folds non-ASCII digits FIRST), the district picked, the start date. A
-- Pariwar Admin SUGGESTS a listed workplace (6.36c); ONLY the member's confirmation writes a posting (SW9, I2). THE GUARD:
-- a request is created `pending`; `pending → suggested | withdrawn | closed`, `suggested → confirmed | pending | withdrawn |
-- closed`, the rest FINAL; the identity columns never change; EXCEPT (i) the ERASURE ARM (AC9): `typed_name` /
-- `typed_place` may become NULL in ANY state — with every other column unchanged, or together with an open request's
-- move to `closed`; and (ii) the RENAME ARM (Task 1.1b): `district` alone may change on a `pending` / `suggested` row.
-- ⛔ No CHECK requires the typed text (AC9 — a CHECK is re-checked by the erasure scrub).
-- ⭐ (5) `member_postings` gains `workplace_id`, `workplace_request_id` (at most one of the two), `started_on` (≥ 1950-01-01).
-- A retirement row names ⛔ no workplace. Legacy rows keep NULLs (⛔ no backfill — `-306`: not in production). The grant
-- stays SELECT, INSERT (0031 — append-only; a column ADD needs ⛔ no new grant).
-- Every member FK is SINGLE-COLUMN (SF14 — `members` has ⛔ no `(pariwar_id, member_id)` UNIQUE); every other FK is
-- composite on `pariwar_id` (an owner key). ⛔ No DELETE grant anywhere; RLS ENABLE + FORCE with per-command tenant
-- policies (⛔ never `FOR ALL`, ⛔ no DELETE leg; the UPDATE legs are load-bearing — the erasure scrub and the import's
-- upsert match 0 rows under FORCE without them, `-279` A12). Statement order: CREATE → FKs → CHECKs → GRANT → ENABLE →
-- FORCE → POLICY → indexes → triggers (0119 / 0156).

-- ── (1) workplace_import_batches ─────────────────────────────────────────────────────────────────────────────────────
CREATE TABLE "workplace_import_batches" (
	"batch_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"pariwar_id" uuid NOT NULL,
	"source_name" text NOT NULL,
	"source_url" text,
	"retrieved_on" date,
	"licence" text,
	"attribution" text,
	"state_code" text,
	"status" text DEFAULT 'running' NOT NULL,
	"rows_read" integer,
	"rows_inserted" integer,
	"rows_updated" integer,
	"rows_delisted" integer,
	"rows_relisted" integer,
	"rows_refused" integer,
	"rows_duplicate" integer,
	"rows_skipped_staff" integer,
	"districts_retired" integer,
	"started_at" timestamp with time zone DEFAULT clock_timestamp() NOT NULL,
	"finished_at" timestamp with time zone,
	CONSTRAINT "workplace_import_batches_pariwar_batch_uq" UNIQUE ("pariwar_id", "batch_id")
);--> statement-breakpoint
ALTER TABLE "workplace_import_batches" ADD CONSTRAINT "workplace_import_batches_source_name_check" CHECK (char_length(btrim("source_name")) BETWEEN 1 AND 200);--> statement-breakpoint
ALTER TABLE "workplace_import_batches" ADD CONSTRAINT "workplace_import_batches_state_code_check" CHECK ("state_code" IS NULL OR "state_code" ~ '^[0-9]{2}$');--> statement-breakpoint
ALTER TABLE "workplace_import_batches" ADD CONSTRAINT "workplace_import_batches_status_check" CHECK ("status" IN ('running', 'finished'));--> statement-breakpoint
-- A rename row carries ⛔ no source fields; every other row carries all five.
ALTER TABLE "workplace_import_batches" ADD CONSTRAINT "workplace_import_batches_source_fields_check" CHECK (
	("source_name" = 'rename' AND "source_url" IS NULL AND "retrieved_on" IS NULL AND "licence" IS NULL AND "attribution" IS NULL AND "state_code" IS NULL)
	OR ("source_name" <> 'rename' AND "source_url" IS NOT NULL AND "retrieved_on" IS NOT NULL AND "licence" IS NOT NULL AND "attribution" IS NOT NULL AND "state_code" IS NOT NULL)
);--> statement-breakpoint
ALTER TABLE "workplace_import_batches" ADD CONSTRAINT "workplace_import_batches_finished_check" CHECK (
	("status" = 'finished') = ("finished_at" IS NOT NULL)
	AND ("status" = 'running' OR ("rows_read" IS NOT NULL AND "rows_inserted" IS NOT NULL AND "rows_updated" IS NOT NULL
		AND "rows_delisted" IS NOT NULL AND "rows_relisted" IS NOT NULL AND "rows_refused" IS NOT NULL
		AND "rows_duplicate" IS NOT NULL AND "rows_skipped_staff" IS NOT NULL AND "districts_retired" IS NOT NULL))
);--> statement-breakpoint
ALTER TABLE "workplace_import_batches" ADD CONSTRAINT "workplace_import_batches_counts_check" CHECK (
	coalesce("rows_read", 0) >= 0 AND coalesce("rows_inserted", 0) >= 0 AND coalesce("rows_updated", 0) >= 0
	AND coalesce("rows_delisted", 0) >= 0 AND coalesce("rows_relisted", 0) >= 0 AND coalesce("rows_refused", 0) >= 0
	AND coalesce("rows_duplicate", 0) >= 0 AND coalesce("rows_skipped_staff", 0) >= 0 AND coalesce("districts_retired", 0) >= 0
);--> statement-breakpoint
ALTER TABLE "workplace_import_batches" ADD CONSTRAINT "workplace_import_batches_finished_order_check" CHECK ("finished_at" IS NULL OR "finished_at" >= "started_at");--> statement-breakpoint
GRANT SELECT, INSERT ON "workplace_import_batches" TO twt_app;--> statement-breakpoint
GRANT UPDATE ("status", "finished_at", "rows_read", "rows_inserted", "rows_updated", "rows_delisted", "rows_relisted", "rows_refused", "rows_duplicate", "rows_skipped_staff", "districts_retired") ON "workplace_import_batches" TO twt_app;--> statement-breakpoint
ALTER TABLE "workplace_import_batches" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "workplace_import_batches" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "workplace_import_batches_tenant_isolation_select" ON "workplace_import_batches" AS PERMISSIVE FOR SELECT TO "twt_app" USING (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "workplace_import_batches_tenant_isolation_insert" ON "workplace_import_batches" AS PERMISSIVE FOR INSERT TO "twt_app" WITH CHECK (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "workplace_import_batches_tenant_isolation_update" ON "workplace_import_batches" AS PERMISSIVE FOR UPDATE TO "twt_app" USING (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid) WITH CHECK (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid);--> statement-breakpoint

CREATE FUNCTION workplace_import_batches_guard()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.status <> 'running' THEN
    RAISE EXCEPTION 'workplace_import_batches: a batch is created running and finished by its own run (Story 6.36a Task 1.2)'
      USING ERRCODE = 'integrity_constraint_violation';
  END IF;
  IF TG_OP = 'UPDATE' AND OLD.status = 'finished' THEN
    RAISE EXCEPTION 'workplace_import_batches: a finished batch is final (Story 6.36a Task 1.2)'
      USING ERRCODE = 'integrity_constraint_violation';
  END IF;
  RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER workplace_import_batches_guard
  BEFORE INSERT OR UPDATE ON workplace_import_batches
  FOR EACH ROW EXECUTE FUNCTION workplace_import_batches_guard();
--> statement-breakpoint

-- ── (2) workplace_districts ──────────────────────────────────────────────────────────────────────────────────────────
CREATE TABLE "workplace_districts" (
	"pariwar_id" uuid NOT NULL,
	"district" text NOT NULL,
	"status" text DEFAULT 'listed' NOT NULL,
	"source_batch_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "workplace_districts_pariwar_id_district_pk" PRIMARY KEY ("pariwar_id", "district")
);--> statement-breakpoint
ALTER TABLE "workplace_districts" ADD CONSTRAINT "workplace_districts_source_batch_fk" FOREIGN KEY ("pariwar_id", "source_batch_id") REFERENCES "public"."workplace_import_batches"("pariwar_id", "batch_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
-- The spelling is stored exactly as the map gives it (trimmed — ⛔ never a surrounding space, which would read as a
-- second spelling byte-for-byte).
ALTER TABLE "workplace_districts" ADD CONSTRAINT "workplace_districts_district_check" CHECK ("district" = btrim("district") AND char_length("district") BETWEEN 1 AND 200);--> statement-breakpoint
ALTER TABLE "workplace_districts" ADD CONSTRAINT "workplace_districts_status_check" CHECK ("status" IN ('listed', 'retired'));--> statement-breakpoint
GRANT SELECT, INSERT ON "workplace_districts" TO twt_app;--> statement-breakpoint
GRANT UPDATE ("status", "source_batch_id", "updated_at") ON "workplace_districts" TO twt_app;--> statement-breakpoint
ALTER TABLE "workplace_districts" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "workplace_districts" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "workplace_districts_tenant_isolation_select" ON "workplace_districts" AS PERMISSIVE FOR SELECT TO "twt_app" USING (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "workplace_districts_tenant_isolation_insert" ON "workplace_districts" AS PERMISSIVE FOR INSERT TO "twt_app" WITH CHECK (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "workplace_districts_tenant_isolation_update" ON "workplace_districts" AS PERMISSIVE FOR UPDATE TO "twt_app" USING (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid) WITH CHECK (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid);--> statement-breakpoint

-- ── (3) workplaces ───────────────────────────────────────────────────────────────────────────────────────────────────
CREATE TABLE "workplaces" (
	"workplace_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"pariwar_id" uuid NOT NULL,
	"kind" text NOT NULL,
	"name" text NOT NULL,
	"district" text NOT NULL,
	"block_code" text,
	"cluster_name" text,
	"village_name" text,
	"pincode" text,
	"udise_school_code" text,
	"source" text NOT NULL,
	"import_batch_id" uuid,
	"status" text DEFAULT 'listed' NOT NULL,
	"created_by_actor_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "workplaces_pariwar_udise_uq" UNIQUE ("pariwar_id", "udise_school_code"),
	CONSTRAINT "workplaces_pariwar_workplace_uq" UNIQUE ("pariwar_id", "workplace_id")
);--> statement-breakpoint
ALTER TABLE "workplaces" ADD CONSTRAINT "workplaces_district_fk" FOREIGN KEY ("pariwar_id", "district") REFERENCES "public"."workplace_districts"("pariwar_id", "district") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workplaces" ADD CONSTRAINT "workplaces_import_batch_fk" FOREIGN KEY ("pariwar_id", "import_batch_id") REFERENCES "public"."workplace_import_batches"("pariwar_id", "batch_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
-- ⚠ LOCKSTEP with `WORKPLACE_KINDS` / `WORKPLACE_SOURCES` / `WORKPLACE_STATUSES` (schema/workplaces.ts).
ALTER TABLE "workplaces" ADD CONSTRAINT "workplaces_kind_check" CHECK ("kind" IN ('school', 'office'));--> statement-breakpoint
ALTER TABLE "workplaces" ADD CONSTRAINT "workplaces_name_check" CHECK (char_length(btrim("name")) BETWEEN 1 AND 200);--> statement-breakpoint
ALTER TABLE "workplaces" ADD CONSTRAINT "workplaces_district_check" CHECK (char_length(btrim("district")) BETWEEN 1 AND 200);--> statement-breakpoint
ALTER TABLE "workplaces" ADD CONSTRAINT "workplaces_block_code_check" CHECK ("block_code" IS NULL OR "block_code" ~ '^[0-9]{6}$');--> statement-breakpoint
ALTER TABLE "workplaces" ADD CONSTRAINT "workplaces_pincode_check" CHECK ("pincode" IS NULL OR "pincode" ~ '^[0-9]{6}$');--> statement-breakpoint
ALTER TABLE "workplaces" ADD CONSTRAINT "workplaces_udise_school_code_check" CHECK ("udise_school_code" IS NULL OR "udise_school_code" ~ '^[0-9]{11}$');--> statement-breakpoint
ALTER TABLE "workplaces" ADD CONSTRAINT "workplaces_source_check" CHECK ("source" IN ('import', 'staff'));--> statement-breakpoint
ALTER TABLE "workplaces" ADD CONSTRAINT "workplaces_status_check" CHECK ("status" IN ('listed', 'delisted'));--> statement-breakpoint
ALTER TABLE "workplaces" ADD CONSTRAINT "workplaces_office_no_code_check" CHECK ("kind" <> 'office' OR "udise_school_code" IS NULL);--> statement-breakpoint
ALTER TABLE "workplaces" ADD CONSTRAINT "workplaces_import_shape_check" CHECK ("source" <> 'import' OR ("kind" = 'school' AND "udise_school_code" IS NOT NULL AND "import_batch_id" IS NOT NULL));--> statement-breakpoint
GRANT SELECT, INSERT ON "workplaces" TO twt_app;--> statement-breakpoint
-- ⛔ Never `kind`, the code, `source` or `pariwar_id` (a school never becomes an office; the code is its import key).
GRANT UPDATE ("name", "district", "status", "updated_at", "cluster_name", "village_name", "pincode", "block_code", "import_batch_id") ON "workplaces" TO twt_app;--> statement-breakpoint
ALTER TABLE "workplaces" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "workplaces" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "workplaces_tenant_isolation_select" ON "workplaces" AS PERMISSIVE FOR SELECT TO "twt_app" USING (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "workplaces_tenant_isolation_insert" ON "workplaces" AS PERMISSIVE FOR INSERT TO "twt_app" WITH CHECK (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "workplaces_tenant_isolation_update" ON "workplaces" AS PERMISSIVE FOR UPDATE TO "twt_app" USING (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid) WITH CHECK (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid);--> statement-breakpoint
-- The picker's read: one district's listed schools (or offices).
CREATE INDEX "workplaces_pariwar_district_kind_status_idx" ON "workplaces" USING btree ("pariwar_id", "district", "kind", "status");--> statement-breakpoint

-- ── (4) workplace_requests ───────────────────────────────────────────────────────────────────────────────────────────
CREATE TABLE "workplace_requests" (
	"request_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"pariwar_id" uuid NOT NULL,
	"member_id" uuid NOT NULL,
	"district" text NOT NULL,
	"typed_name" text,
	"typed_place" text,
	"started_on" date NOT NULL,
	"state" text DEFAULT 'pending' NOT NULL,
	"suggested_workplace_id" uuid,
	"suggested_by_actor_id" uuid,
	"suggested_at" timestamp with time zone,
	"resolved_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "workplace_requests_pariwar_request_uq" UNIQUE ("pariwar_id", "request_id")
);--> statement-breakpoint
-- SINGLE-COLUMN member FK (SF14). ON DELETE cascade, as `member_postings` (0031).
ALTER TABLE "workplace_requests" ADD CONSTRAINT "workplace_requests_member_id_members_member_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("member_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workplace_requests" ADD CONSTRAINT "workplace_requests_district_fk" FOREIGN KEY ("pariwar_id", "district") REFERENCES "public"."workplace_districts"("pariwar_id", "district") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workplace_requests" ADD CONSTRAINT "workplace_requests_suggested_workplace_fk" FOREIGN KEY ("pariwar_id", "suggested_workplace_id") REFERENCES "public"."workplaces"("pariwar_id", "workplace_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
-- The typed text: ≤ 120, ⛔ blank, ⛔ a run of seven digits (the writer folds non-ASCII digits first). ⛔ No CHECK requires it
-- (AC9 — the erasure scrub NULLs it in every state).
ALTER TABLE "workplace_requests" ADD CONSTRAINT "workplace_requests_typed_name_check" CHECK ("typed_name" IS NULL OR (char_length(btrim("typed_name")) BETWEEN 1 AND 120 AND char_length("typed_name") <= 120 AND "typed_name" !~ '[0-9]{7}'));--> statement-breakpoint
ALTER TABLE "workplace_requests" ADD CONSTRAINT "workplace_requests_typed_place_check" CHECK ("typed_place" IS NULL OR (char_length(btrim("typed_place")) BETWEEN 1 AND 120 AND char_length("typed_place") <= 120 AND "typed_place" !~ '[0-9]{7}'));--> statement-breakpoint
ALTER TABLE "workplace_requests" ADD CONSTRAINT "workplace_requests_started_on_check" CHECK ("started_on" >= DATE '1950-01-01');--> statement-breakpoint
-- ⚠ LOCKSTEP with `WORKPLACE_REQUEST_STATES` (schema/workplace_requests.ts).
ALTER TABLE "workplace_requests" ADD CONSTRAINT "workplace_requests_state_check" CHECK ("state" IN ('pending', 'suggested', 'confirmed', 'withdrawn', 'closed'));--> statement-breakpoint
ALTER TABLE "workplace_requests" ADD CONSTRAINT "workplace_requests_suggested_check" CHECK ("state" <> 'suggested' OR ("suggested_workplace_id" IS NOT NULL AND "suggested_at" IS NOT NULL));--> statement-breakpoint
ALTER TABLE "workplace_requests" ADD CONSTRAINT "workplace_requests_resolved_check" CHECK (("state" IN ('confirmed', 'withdrawn', 'closed')) = ("resolved_at" IS NOT NULL));--> statement-breakpoint
GRANT SELECT, INSERT ON "workplace_requests" TO twt_app;--> statement-breakpoint
GRANT UPDATE ("state", "district", "suggested_workplace_id", "suggested_by_actor_id", "suggested_at", "resolved_at", "typed_name", "typed_place") ON "workplace_requests" TO twt_app;--> statement-breakpoint
ALTER TABLE "workplace_requests" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "workplace_requests" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "workplace_requests_tenant_isolation_select" ON "workplace_requests" AS PERMISSIVE FOR SELECT TO "twt_app" USING (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "workplace_requests_tenant_isolation_insert" ON "workplace_requests" AS PERMISSIVE FOR INSERT TO "twt_app" WITH CHECK (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "workplace_requests_tenant_isolation_update" ON "workplace_requests" AS PERMISSIVE FOR UPDATE TO "twt_app" USING (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid) WITH CHECK (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid);--> statement-breakpoint
CREATE INDEX "workplace_requests_pariwar_member_idx" ON "workplace_requests" USING btree ("pariwar_id", "member_id");--> statement-breakpoint
-- 6.36c's queue (a district's open requests) and the writer's "end the older open request" step.
CREATE INDEX "workplace_requests_open_idx" ON "workplace_requests" USING btree ("pariwar_id", "district") WHERE "state" IN ('pending', 'suggested');--> statement-breakpoint

CREATE FUNCTION workplace_requests_guard()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  erasing boolean;
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.state <> 'pending' OR NEW.suggested_workplace_id IS NOT NULL OR NEW.suggested_by_actor_id IS NOT NULL
       OR NEW.suggested_at IS NOT NULL OR NEW.resolved_at IS NOT NULL THEN
      RAISE EXCEPTION 'workplace_requests: a request is created pending, with nothing suggested (Story 6.36a SW9)'
        USING ERRCODE = 'integrity_constraint_violation';
    END IF;
    RETURN NEW;
  END IF;

  -- (ii) THE RENAME ARM — `district` ALONE moves, on an OPEN request (Task 1.1b `--rename-district`). A closed or
  -- confirmed request keeps the spelling it was made under.
  IF NEW.district IS DISTINCT FROM OLD.district THEN
    IF OLD.state IN ('pending', 'suggested')
       AND (to_jsonb(NEW) - 'district') IS NOT DISTINCT FROM (to_jsonb(OLD) - 'district') THEN
      RETURN NEW;
    END IF;
    RAISE EXCEPTION 'workplace_requests: the district moves only on an open request, and alone (Story 6.36a Task 1.1b)'
      USING ERRCODE = 'integrity_constraint_violation';
  END IF;

  -- The typed text is ⛔ never rewritten — it may only be ERASED (NULL).
  IF (NEW.typed_name IS DISTINCT FROM OLD.typed_name AND NEW.typed_name IS NOT NULL)
     OR (NEW.typed_place IS DISTINCT FROM OLD.typed_place AND NEW.typed_place IS NOT NULL) THEN
    RAISE EXCEPTION 'workplace_requests: the typed workplace is never rewritten — only erased (Story 6.36a AC9)'
      USING ERRCODE = 'integrity_constraint_violation';
  END IF;
  erasing := NEW.typed_name IS DISTINCT FROM OLD.typed_name OR NEW.typed_place IS DISTINCT FROM OLD.typed_place;

  -- The identity columns never change.
  IF (to_jsonb(NEW) - 'state' - 'suggested_workplace_id' - 'suggested_by_actor_id' - 'suggested_at' - 'resolved_at'
        - 'typed_name' - 'typed_place')
     IS DISTINCT FROM (to_jsonb(OLD) - 'state' - 'suggested_workplace_id' - 'suggested_by_actor_id' - 'suggested_at'
        - 'resolved_at' - 'typed_name' - 'typed_place') THEN
    RAISE EXCEPTION 'workplace_requests: a request''s identity columns never change (Story 6.36a SW9)'
      USING ERRCODE = 'integrity_constraint_violation';
  END IF;

  IF NEW.state = OLD.state THEN
    -- (i) THE ERASURE ARM, alone: the typed text → NULL with every other column unchanged, in ANY state.
    IF erasing AND (to_jsonb(NEW) - 'typed_name' - 'typed_place') IS NOT DISTINCT FROM (to_jsonb(OLD) - 'typed_name' - 'typed_place') THEN
      RETURN NEW;
    END IF;
    RAISE EXCEPTION 'workplace_requests: a request changes only by a state move, or the erasure scrub (Story 6.36a SW9)'
      USING ERRCODE = 'integrity_constraint_violation';
  END IF;

  -- The state machine: `pending → suggested | withdrawn | closed`, `suggested → confirmed | pending | withdrawn | closed`;
  -- `confirmed` / `withdrawn` / `closed` are FINAL.
  IF NOT ((OLD.state = 'pending' AND NEW.state IN ('suggested', 'withdrawn', 'closed'))
          OR (OLD.state = 'suggested' AND NEW.state IN ('confirmed', 'pending', 'withdrawn', 'closed'))) THEN
    RAISE EXCEPTION 'workplace_requests: % → % is not a move a request makes (Story 6.36a SW9)', OLD.state, NEW.state
      USING ERRCODE = 'integrity_constraint_violation';
  END IF;

  -- (i) THE ERASURE ARM, with a move: ONLY an open request → `closed`.
  IF erasing AND NEW.state <> 'closed' THEN
    RAISE EXCEPTION 'workplace_requests: the erasure scrub closes an open request — it moves it nowhere else (Story 6.36a AC9)'
      USING ERRCODE = 'integrity_constraint_violation';
  END IF;

  -- The suggestion columns change only on a move INTO `suggested`, or back to `pending` (the member's *"No"*).
  IF NEW.state NOT IN ('suggested', 'pending')
     AND ROW(NEW.suggested_workplace_id, NEW.suggested_by_actor_id, NEW.suggested_at)
         IS DISTINCT FROM ROW(OLD.suggested_workplace_id, OLD.suggested_by_actor_id, OLD.suggested_at) THEN
    RAISE EXCEPTION 'workplace_requests: the suggestion changes only when a request is suggested or returned (Story 6.36a SW9)'
      USING ERRCODE = 'integrity_constraint_violation';
  END IF;
  RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER workplace_requests_guard
  BEFORE INSERT OR UPDATE ON workplace_requests
  FOR EACH ROW EXECUTE FUNCTION workplace_requests_guard();
--> statement-breakpoint

-- ── (5) member_postings — the workplace, the request, the start date ────────────────────────────────────────────────
ALTER TABLE "member_postings" ADD COLUMN "workplace_id" uuid;--> statement-breakpoint
ALTER TABLE "member_postings" ADD COLUMN "workplace_request_id" uuid;--> statement-breakpoint
ALTER TABLE "member_postings" ADD COLUMN "started_on" date;--> statement-breakpoint
ALTER TABLE "member_postings" ADD CONSTRAINT "member_postings_workplace_fk" FOREIGN KEY ("pariwar_id", "workplace_id") REFERENCES "public"."workplaces"("pariwar_id", "workplace_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "member_postings" ADD CONSTRAINT "member_postings_workplace_request_fk" FOREIGN KEY ("pariwar_id", "workplace_request_id") REFERENCES "public"."workplace_requests"("pariwar_id", "request_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "member_postings" ADD CONSTRAINT "member_postings_started_on_check" CHECK ("started_on" IS NULL OR "started_on" >= DATE '1950-01-01');--> statement-breakpoint
ALTER TABLE "member_postings" ADD CONSTRAINT "member_postings_one_workplace_check" CHECK (num_nonnulls("workplace_id", "workplace_request_id") <= 1);--> statement-breakpoint
ALTER TABLE "member_postings" ADD CONSTRAINT "member_postings_retirement_no_workplace_check" CHECK (NOT "is_retirement" OR ("workplace_id" IS NULL AND "workplace_request_id" IS NULL));
