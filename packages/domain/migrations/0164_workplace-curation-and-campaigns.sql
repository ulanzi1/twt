-- Migration 0164 — KEEPING THE LISTS FULL: the Pariwar Admin's people-who-know-me campaigns, a stored-trimmed workplace name,
-- and the request guard's suggestion rules (Story 6.36c, Task 1; AC2–AC4, AC7; `-330` SW9 A / SW16, `-342`). Hand-authored —
-- ⛔ never regenerate. Number and `when` FIXED by `2026-10-14-332` call 2 (`1794195600008`).
--
--   · known_people_campaigns — ONE row per campaign a Pariwar Admin runs: an IST date window of at most 30 days INCLUSIVE
--     (`ends_on - starts_on <= 29` — RV6), started and (optionally) ended by an actor. ⛔ No two OPEN campaigns of one
--     Pariwar overlap: the writer takes `pg_advisory_xact_lock(hashtext('known_people_campaign:' || pariwar_id))` FIRST
--     and reads the overlap under it (`member/known-people-campaigns.ts`). A campaign SHOWS a card in the app and sends
--     ⛔ nothing to any phone (`-307` §2 item 4).
--   · workplaces — the name is STORED trimmed (closes the 6.36a deferral *"`workplaces.name` ⛔ stored trimmed"*; the import
--     already trims, `workplace-import.ts`, and the staff writer trims).
--   · workplace_requests — the guard (0161) is REPLACED: a move INTO `pending` REQUIRES the three suggestion columns NULL (the
--     member's *"No"* and a stale suggestion leave ⛔ trace of the old one), and a move INTO `suggested` REQUIRES the actor
--     (`suggested_by_actor_id` — a suggestion is a staff act, I2). Every other arm is unchanged.
-- ⛔ No PII: ids, dates, actor ids.
-- ⛔ No FK on `pariwar_id` — there is ⛔ `pariwars` table (`0073_pool-naming.sql`); tenancy is RLS + the writer's explicit
-- `pariwar_id`, as in 0161 / 0162.
-- Statement order: CREATE → CHECKs → GRANT → ENABLE → FORCE → POLICY → indexes → functions (0162).

-- ── (1) known_people_campaigns ───────────────────────────────────────────────────────────────────────────────────────
CREATE TABLE "known_people_campaigns" (
	"campaign_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"pariwar_id" uuid NOT NULL,
	"started_by_actor_id" uuid NOT NULL,
	"starts_on" date NOT NULL,
	"ends_on" date NOT NULL,
	"ended_at" timestamp with time zone,
	"ended_by_actor_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "known_people_campaigns_pariwar_campaign_uq" UNIQUE ("pariwar_id", "campaign_id")
);--> statement-breakpoint
-- At most 30 calendar days INCLUSIVE (RV6 — v1.x's `<= 30` allowed 31).
ALTER TABLE "known_people_campaigns" ADD CONSTRAINT "known_people_campaigns_window_check" CHECK ("ends_on" >= "starts_on" AND "ends_on" - "starts_on" <= 29);--> statement-breakpoint
-- An end is dated AND attributed, or neither.
ALTER TABLE "known_people_campaigns" ADD CONSTRAINT "known_people_campaigns_ended_check" CHECK (("ended_at" IS NULL) = ("ended_by_actor_id" IS NULL));--> statement-breakpoint
-- ⛔ No DELETE; the only change is the end (written once — the writer's `ended_at IS NULL` predicate).
GRANT SELECT, INSERT ON "known_people_campaigns" TO twt_app;--> statement-breakpoint
GRANT UPDATE ("ended_at", "ended_by_actor_id") ON "known_people_campaigns" TO twt_app;--> statement-breakpoint
ALTER TABLE "known_people_campaigns" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "known_people_campaigns" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "known_people_campaigns_tenant_isolation_select" ON "known_people_campaigns" AS PERMISSIVE FOR SELECT TO "twt_app" USING (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "known_people_campaigns_tenant_isolation_insert" ON "known_people_campaigns" AS PERMISSIVE FOR INSERT TO "twt_app" WITH CHECK (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid);--> statement-breakpoint
-- ⚠ Load-bearing: `/end` UPDATEs; without it the end silently updates 0 rows under FORCE (`-279` A12).
CREATE POLICY "known_people_campaigns_tenant_isolation_update" ON "known_people_campaigns" AS PERMISSIVE FOR UPDATE TO "twt_app" USING (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid) WITH CHECK (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid);--> statement-breakpoint
-- The list, newest first (`listCampaigns`' actual sort — `created_at DESC, campaign_id DESC`; the leading `pariwar_id`
-- also covers the overlap / live reads' equality filter). `DROP … IF EXISTS` first — this replaces a same-named index
-- that was created on the WRONG columns (`ends_on DESC`, a mismatch with the list's sort) before the fix.
DROP INDEX IF EXISTS "known_people_campaigns_pariwar_ends_on_idx";--> statement-breakpoint
CREATE INDEX "known_people_campaigns_pariwar_created_idx" ON "known_people_campaigns" USING btree ("pariwar_id", "created_at" DESC, "campaign_id" DESC);--> statement-breakpoint

-- ── (2) workplaces — the name is stored trimmed ──────────────────────────────────────────────────────────────────────
-- A one-time defensive backfill: on a fresh / staging database carrying legacy untrimmed rows, this runs FIRST so the
-- ADD below never fails on dirty data, and never holds its lock against rows it would otherwise have to reject.
UPDATE "workplaces" SET "name" = btrim("name") WHERE "name" <> btrim("name");--> statement-breakpoint
-- ⚠ If this ADD fails on a live database, FIND the row — ⛔ `NOT VALID`.
ALTER TABLE "workplaces" ADD CONSTRAINT "workplaces_name_trimmed_check" CHECK ("name" = btrim("name"));--> statement-breakpoint

-- ── (3) workplace_requests — the guard, with the suggestion rules ────────────────────────────────────────────────────
-- Byte-identical to 0161's EXCEPT the block marked `0164`.
CREATE OR REPLACE FUNCTION workplace_requests_guard()
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

  -- 0164 (Story 6.36c Task 1.3): a request returned to `pending` (the member's *"No"*, a stale suggestion) keeps ⛔ trace
  -- of the old suggestion, and a suggestion is a STAFF act — it names its actor.
  IF NEW.state = 'pending'
     AND (NEW.suggested_workplace_id IS NOT NULL OR NEW.suggested_by_actor_id IS NOT NULL OR NEW.suggested_at IS NOT NULL) THEN
    RAISE EXCEPTION 'workplace_requests: a request returned to pending carries no suggestion (Story 6.36c)'
      USING ERRCODE = 'integrity_constraint_violation';
  END IF;
  IF NEW.state = 'suggested' AND NEW.suggested_by_actor_id IS NULL THEN
    RAISE EXCEPTION 'workplace_requests: a suggestion names the staff member who made it (Story 6.36c)'
      USING ERRCODE = 'integrity_constraint_violation';
  END IF;
  RETURN NEW;
END;
$$;
--> statement-breakpoint

-- ── (4) workplace_requests — the same-name count's supporting index (Task 1.4) ──────────────────────────────────────
-- `listWorkplaceRequestsForReview`'s `sameNameCount` (workplace-admin.ts) is a correlated count on this EXACT folded
-- expression, scoped to the open (`pending`) requests that carry a typed name (the subquery's own filter).
CREATE INDEX "workplace_requests_pariwar_folded_name_idx" ON "workplace_requests" USING btree ("pariwar_id", (lower(regexp_replace(btrim("typed_name"), '\s+', ' ', 'g')))) WHERE "state" = 'pending' AND "typed_name" IS NOT NULL;
