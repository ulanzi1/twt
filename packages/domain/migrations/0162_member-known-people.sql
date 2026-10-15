-- Migration 0162 — PEOPLE WHO KNOW ME: the up-to-three members a member names, and the daily counters that bound contact
-- matching (Story 6.36b, Task 1; 6.36a SW10 / SW12 / SW17, I6; `-310` CF4 A (2), CF5 A; `-309`). Hand-authored — ⛔ never
-- regenerate. Number and `when` FIXED by `2026-10-14-332` (6.36a holds 0161 in parallel; this merges second).
--
--   · member_known_people — ONE row per (namer, named) LINK. Member ids only (⛔ no number, ⛔ no name — I4). A link moves
--     FORWARD only: `asked → accepted | declined | lapsed | removed | erased`, `accepted → removed | withdrawn | erased`;
--     every other state is final, and ⛔ no identity column ever changes (the guard, (3)). Every end records `ended_at`
--     (6.36 reads links AS OF a date); a lapse is dated `asked_at + 30 days` (a CHECK), ⛔ never the moment the writer
--     notices. LIVE = `asked` or `accepted`; at most THREE live per namer (I6) — the writer counts under the namer's
--     advisory lock, and the BEFORE INSERT backstop (4) takes the SAME lock and counts again. ⚠ The backstop is on
--     INSERT only: `asked → accepted` is live → live and ⛔ never refused.
--   · member_daily_counters / pariwar_daily_counters — the IST-day counters (the `sms_rate_buckets` atomic-upsert
--     shape, 0049): matching requests (3 a day), numbers matched (the rolling 30-day 2,000, summed under the namer's
--     lock), asks (10 a day), and the Pariwar's numbers (100,000 a day). Charged in a short transaction BEFORE any HMAC.
--
-- ⚠ Member FKs are SINGLE-COLUMN — `members` has ⛔ no `(pariwar_id, member_id)` UNIQUE (6.36a SF14; a composite FK
-- fails 42830). The tenant predicate is RLS + the writers' explicit `pariwar_id`.
-- Statement order: CREATE → FKs → CHECKs → GRANT → ENABLE → FORCE → POLICY → indexes → functions → triggers (0119, 0160).
-- Per-command policies; ⛔ no DELETE grant or policy, ⛔ never `FOR ALL`.

-- ── (1) the links ────────────────────────────────────────────────────────────────────────────────────────────────────────
CREATE TABLE "member_known_people" (
	"link_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"pariwar_id" uuid NOT NULL,
	"namer_member_id" uuid NOT NULL,
	"named_member_id" uuid NOT NULL,
	"found_by" text NOT NULL,
	"state" text DEFAULT 'asked' NOT NULL,
	"asked_at" timestamp with time zone DEFAULT clock_timestamp() NOT NULL,
	"responded_at" timestamp with time zone,
	"ended_at" timestamp with time zone
);--> statement-breakpoint
ALTER TABLE "member_known_people" ADD CONSTRAINT "member_known_people_namer_fk" FOREIGN KEY ("namer_member_id") REFERENCES "public"."members"("member_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "member_known_people" ADD CONSTRAINT "member_known_people_named_fk" FOREIGN KEY ("named_member_id") REFERENCES "public"."members"("member_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
-- ⚠ LOCKSTEP with `KNOWN_PEOPLE_FOUND_BY` / `KNOWN_PEOPLE_LINK_STATES` (`schema/member_known_people.ts`; the policy spec pins both).
ALTER TABLE "member_known_people" ADD CONSTRAINT "member_known_people_found_by_check" CHECK ("found_by" IN ('contacts', 'picker', 'typed'));--> statement-breakpoint
ALTER TABLE "member_known_people" ADD CONSTRAINT "member_known_people_state_check" CHECK ("state" IN ('asked', 'accepted', 'declined', 'lapsed', 'removed', 'withdrawn', 'erased'));--> statement-breakpoint
ALTER TABLE "member_known_people" ADD CONSTRAINT "member_known_people_not_self_check" CHECK ("namer_member_id" <> "named_member_id");--> statement-breakpoint
-- An answer (or the answer a withdrawal ends) is dated; an end is dated; a LIVE link has ⛔ no end.
ALTER TABLE "member_known_people" ADD CONSTRAINT "member_known_people_responded_check" CHECK ("state" NOT IN ('accepted', 'declined', 'withdrawn') OR "responded_at" IS NOT NULL);--> statement-breakpoint
ALTER TABLE "member_known_people" ADD CONSTRAINT "member_known_people_asked_unanswered_check" CHECK ("state" <> 'asked' OR "responded_at" IS NULL);--> statement-breakpoint
ALTER TABLE "member_known_people" ADD CONSTRAINT "member_known_people_ended_check" CHECK (("state" IN ('declined', 'lapsed', 'removed', 'withdrawn', 'erased')) = ("ended_at" IS NOT NULL));--> statement-breakpoint
-- A lapse is dated `asked_at + 30 days` — ⛔ never the moment the writer noticed (SW10).
ALTER TABLE "member_known_people" ADD CONSTRAINT "member_known_people_lapse_date_check" CHECK ("state" <> 'lapsed' OR "ended_at" = "asked_at" + interval '30 days');--> statement-breakpoint
-- ⛔ No answer is taken after the 30 days (SW10); nothing is dated before the ask.
ALTER TABLE "member_known_people" ADD CONSTRAINT "member_known_people_answer_window_check" CHECK ("responded_at" IS NULL OR ("responded_at" >= "asked_at" AND "responded_at" < "asked_at" + interval '30 days'));--> statement-breakpoint
ALTER TABLE "member_known_people" ADD CONSTRAINT "member_known_people_ended_after_check" CHECK ("ended_at" IS NULL OR ("ended_at" >= "asked_at" AND ("responded_at" IS NULL OR "ended_at" >= "responded_at")));--> statement-breakpoint
-- ⛔ No DELETE: a link is ⛔ never deleted (erasure moves it to `erased`); the only deletion is the members cascade.
GRANT SELECT, INSERT ON "member_known_people" TO twt_app;--> statement-breakpoint
GRANT UPDATE ("state", "responded_at", "ended_at") ON "member_known_people" TO twt_app;--> statement-breakpoint
ALTER TABLE "member_known_people" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "member_known_people" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "member_known_people_tenant_isolation_select" ON "member_known_people" AS PERMISSIVE FOR SELECT TO "twt_app" USING (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "member_known_people_tenant_isolation_insert" ON "member_known_people" AS PERMISSIVE FOR INSERT TO "twt_app" WITH CHECK (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid);--> statement-breakpoint
-- ⚠ Load-bearing: the answer, the removal, the withdrawal, the lazy lapse AND `anonymizeMember`'s erasure all UPDATE;
-- without it each silently updates 0 rows under FORCE (`-279` A12).
CREATE POLICY "member_known_people_tenant_isolation_update" ON "member_known_people" AS PERMISSIVE FOR UPDATE TO "twt_app" USING (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid) WITH CHECK (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid);--> statement-breakpoint
-- ONE live link per (namer, named) — a second ask of a live person returns the same link (AC5).
CREATE UNIQUE INDEX "member_known_people_live_uq" ON "member_known_people" USING btree ("pariwar_id", "namer_member_id", "named_member_id") WHERE "state" IN ('asked', 'accepted');--> statement-breakpoint
-- The namer's list (and the backstop's count) and the named member's requests.
CREATE INDEX "member_known_people_namer_idx" ON "member_known_people" USING btree ("pariwar_id", "namer_member_id");--> statement-breakpoint
CREATE INDEX "member_known_people_named_idx" ON "member_known_people" USING btree ("pariwar_id", "named_member_id");--> statement-breakpoint

-- ── (2) the namer's lock — ONE key, taken by the writer (`askKnownPerson`), the matching counters AND the backstop ─────────
-- ⛔ Never a `FOR UPDATE` on `members`: two members naming each other would deadlock against the insert's FK check
-- (40P01). Transaction-scoped. The key is namespaced so it never collides with another subsystem's member lock.
CREATE FUNCTION member_known_people_lock_namer(p_namer_member_id uuid)
RETURNS void LANGUAGE sql VOLATILE AS $$
  SELECT pg_advisory_xact_lock(hashtextextended('member_known_people.namer:' || p_namer_member_id::text, 0));
$$;
--> statement-breakpoint

-- ── (3) the guard — forward-only transitions; ⛔ no identity column ever changes ───────────────────────────────────────
CREATE FUNCTION member_known_people_guard()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.link_id IS DISTINCT FROM OLD.link_id
     OR NEW.pariwar_id IS DISTINCT FROM OLD.pariwar_id
     OR NEW.namer_member_id IS DISTINCT FROM OLD.namer_member_id
     OR NEW.named_member_id IS DISTINCT FROM OLD.named_member_id
     OR NEW.found_by IS DISTINCT FROM OLD.found_by
     OR NEW.asked_at IS DISTINCT FROM OLD.asked_at THEN
    RAISE EXCEPTION 'member_known_people: an identity column never changes (Story 6.36b)'
      USING ERRCODE = 'integrity_constraint_violation';
  END IF;
  IF OLD.responded_at IS NOT NULL AND NEW.responded_at IS DISTINCT FROM OLD.responded_at THEN
    RAISE EXCEPTION 'member_known_people: responded_at is written once (Story 6.36b)'
      USING ERRCODE = 'integrity_constraint_violation';
  END IF;
  IF OLD.ended_at IS NOT NULL AND NEW.ended_at IS DISTINCT FROM OLD.ended_at THEN
    RAISE EXCEPTION 'member_known_people: ended_at is written once (Story 6.36b)'
      USING ERRCODE = 'integrity_constraint_violation';
  END IF;
  IF NEW.state = OLD.state THEN
    -- A same-state write may change nothing (the dates of a live link are set only by its transition).
    IF NEW.responded_at IS DISTINCT FROM OLD.responded_at OR NEW.ended_at IS DISTINCT FROM OLD.ended_at THEN
      RAISE EXCEPTION 'member_known_people: a date changes only with a transition (Story 6.36b)'
        USING ERRCODE = 'integrity_constraint_violation';
    END IF;
    RETURN NEW;
  END IF;
  IF NOT (
       (OLD.state = 'asked' AND NEW.state IN ('accepted', 'declined', 'lapsed', 'removed', 'erased'))
    OR (OLD.state = 'accepted' AND NEW.state IN ('removed', 'withdrawn', 'erased'))
  ) THEN
    RAISE EXCEPTION 'member_known_people: % → % is not a forward transition (Story 6.36b)', OLD.state, NEW.state
      USING ERRCODE = 'integrity_constraint_violation';
  END IF;
  -- A lapse is recorded only once the 30 days have passed (the writer records it lazily — SW10).
  IF NEW.state = 'lapsed' AND clock_timestamp() < OLD.asked_at + interval '30 days' THEN
    RAISE EXCEPTION 'member_known_people: a request lapses only after 30 days (Story 6.36b)'
      USING ERRCODE = 'integrity_constraint_violation';
  END IF;
  RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER "member_known_people_guard" BEFORE UPDATE ON "member_known_people"
  FOR EACH ROW EXECUTE FUNCTION member_known_people_guard();
--> statement-breakpoint

-- ── (4) the BACKSTOP — at most three live per namer (I6), BEFORE INSERT only ─────────────────────────────────────────────
-- Takes the namer's lock FIRST (so two concurrent inserts are serialised: the second counts the first's committed row —
-- a VOLATILE function's statement takes a fresh snapshot), then counts the namer's `asked` + `accepted` rows. The writer
-- lapses stale `asked` rows before it inserts, so this count is exact. An invoker function: it counts what the inserting
-- scope can see, which is the namer's Pariwar (WITH CHECK pins `pariwar_id` to the scope).
CREATE FUNCTION member_known_people_backstop()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.state NOT IN ('asked', 'accepted') THEN
    RETURN NEW;
  END IF;
  PERFORM member_known_people_lock_namer(NEW.namer_member_id);
  IF (SELECT count(*) FROM member_known_people k
       WHERE k.pariwar_id = NEW.pariwar_id
         AND k.namer_member_id = NEW.namer_member_id
         AND k.state IN ('asked', 'accepted')) >= 3 THEN
    RAISE EXCEPTION 'member_known_people: a member has at most three live named people (Story 6.36b, I6)'
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER "member_known_people_backstop" BEFORE INSERT ON "member_known_people"
  FOR EACH ROW EXECUTE FUNCTION member_known_people_backstop();
--> statement-breakpoint

-- ── (5) the member's IST-day counters ────────────────────────────────────────────────────────────────────────────────────
CREATE TABLE "member_daily_counters" (
	"pariwar_id" uuid NOT NULL,
	"member_id" uuid NOT NULL,
	"counter" text NOT NULL,
	"day" date NOT NULL,
	"count" integer NOT NULL,
	CONSTRAINT "member_daily_counters_pk" PRIMARY KEY ("pariwar_id", "member_id", "counter", "day")
);--> statement-breakpoint
ALTER TABLE "member_daily_counters" ADD CONSTRAINT "member_daily_counters_member_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("member_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
-- ⚠ LOCKSTEP with `MEMBER_DAILY_COUNTERS` (`schema/member_daily_counters.ts`; the policy spec pins it).
ALTER TABLE "member_daily_counters" ADD CONSTRAINT "member_daily_counters_counter_check" CHECK ("counter" IN ('contact_match_requests', 'contact_match_numbers', 'known_people_ask'));--> statement-breakpoint
ALTER TABLE "member_daily_counters" ADD CONSTRAINT "member_daily_counters_count_check" CHECK ("count" >= 0);--> statement-breakpoint
GRANT SELECT, INSERT ON "member_daily_counters" TO twt_app;--> statement-breakpoint
GRANT UPDATE ("count") ON "member_daily_counters" TO twt_app;--> statement-breakpoint
ALTER TABLE "member_daily_counters" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "member_daily_counters" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "member_daily_counters_tenant_isolation_select" ON "member_daily_counters" AS PERMISSIVE FOR SELECT TO "twt_app" USING (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "member_daily_counters_tenant_isolation_insert" ON "member_daily_counters" AS PERMISSIVE FOR INSERT TO "twt_app" WITH CHECK (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid);--> statement-breakpoint
-- ⚠ Load-bearing: the atomic `INSERT … ON CONFLICT DO UPDATE` needs it (without it the upsert's UPDATE arm fails 42501).
CREATE POLICY "member_daily_counters_tenant_isolation_update" ON "member_daily_counters" AS PERMISSIVE FOR UPDATE TO "twt_app" USING (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid) WITH CHECK (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid);--> statement-breakpoint

-- ── (6) the Pariwar's IST-day counter ────────────────────────────────────────────────────────────────────────────────────
CREATE TABLE "pariwar_daily_counters" (
	"pariwar_id" uuid NOT NULL,
	"counter" text NOT NULL,
	"day" date NOT NULL,
	"count" integer NOT NULL,
	CONSTRAINT "pariwar_daily_counters_pk" PRIMARY KEY ("pariwar_id", "counter", "day")
);--> statement-breakpoint
-- ⚠ LOCKSTEP with `PARIWAR_DAILY_COUNTERS` (`schema/member_daily_counters.ts`).
ALTER TABLE "pariwar_daily_counters" ADD CONSTRAINT "pariwar_daily_counters_counter_check" CHECK ("counter" IN ('contact_match_numbers'));--> statement-breakpoint
ALTER TABLE "pariwar_daily_counters" ADD CONSTRAINT "pariwar_daily_counters_count_check" CHECK ("count" >= 0);--> statement-breakpoint
GRANT SELECT, INSERT ON "pariwar_daily_counters" TO twt_app;--> statement-breakpoint
GRANT UPDATE ("count") ON "pariwar_daily_counters" TO twt_app;--> statement-breakpoint
ALTER TABLE "pariwar_daily_counters" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "pariwar_daily_counters" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "pariwar_daily_counters_tenant_isolation_select" ON "pariwar_daily_counters" AS PERMISSIVE FOR SELECT TO "twt_app" USING (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "pariwar_daily_counters_tenant_isolation_insert" ON "pariwar_daily_counters" AS PERMISSIVE FOR INSERT TO "twt_app" WITH CHECK (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "pariwar_daily_counters_tenant_isolation_update" ON "pariwar_daily_counters" AS PERMISSIVE FOR UPDATE TO "twt_app" USING (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid) WITH CHECK (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid);
