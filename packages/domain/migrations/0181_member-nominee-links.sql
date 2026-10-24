-- Migration 0181 — the NOMINEE MEMBER LINK: which member account a declarer marked as one of their nominees (Story 6.36e,
-- Task 1; AC1; `2026-10-24-397` NE1 / NE5 — the build decisions; `2026-10-24-396` Q1 A — *"the Trust records which member
-- account a marked nominee is, only to keep them out of the five"*). Hand-authored — ⛔ never regenerate (`db:generate` diffs
-- against the 0020 snapshot; the migrator skips by the journal `when` — [[project_live_db_test_gotchas]]).
-- ⭐ NUMBER: `0181` is this story's — ⛔ committed on any branch before it (`2026-10-15-366` decision 6); row 11b-4 PLANS a
-- `0181` and, landing second, rebases to the next free number and re-checks the journal `when` order.
--
--   · member_nominee_links — ONE row per link, hung off the nominee VERSION that declared it (⛔ the `member_nominees`
--     projection — DELETE-then-INSERT would orphan it; ⛔ a column on the append-only versions — the answer arrives later).
--     Member ids only — ⛔ no number, ⛔ no name. TWO axes (`-397` NE1, V1):
--       · `answer` (`confirmed | not_me`, NULL until the marked member answers) with `responded_at` — written ONCE;
--       · `state` (`live → ended | erased`) with `ended_at` and `end_reason` — written ONCE.
--     An answered link can therefore still END (a re-save) or be ERASED (RTBF) and keeps its answer. A re-save that keeps a
--     mark CARRIES it: a new row on the new version copying the nominee, `found_by`, `asked_at` and the answer, pointing at
--     the old row through `carried_from_link_id` (the old row ends `redeclared`).
--   · member_daily_counters — gains `nominee_link_resolve` (NE5: the declare's typed / picked number lookup, 4 a day,
--     charged BEFORE any HMAC). ⚠ LOCKSTEP with `MEMBER_DAILY_COUNTERS` (schema/member_daily_counters.ts).
--
-- ⚠ FKs: `version_id` → versions is NO ACTION (TR3): versions are deleted only by the `members` cascade, which also cascades
-- the link through `declarer_member_id`, and NO ACTION is checked at statement end. ⛔ SET NULL — it would UPDATE the link,
-- which the guard refuses. Member FKs are SINGLE-COLUMN (6.36a SF14) and `member_nominee_versions` has ⛔ composite UNIQUE a
-- composite FK would need ⇒ the version's rank / declarer / Pariwar are checked by the BEFORE INSERT function (3).
-- Statement order: CREATE → FKs → CHECKs → GRANT → ENABLE → FORCE → POLICY → indexes → functions → triggers (0119, 0162).
-- Per-command policies; ⛔ no DELETE grant or policy, ⛔ never `FOR ALL`.

-- ── (1) the links ────────────────────────────────────────────────────────────────────────────────────────────────────────
CREATE TABLE "member_nominee_links" (
	"link_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"pariwar_id" uuid NOT NULL,
	"declarer_member_id" uuid NOT NULL,
	"version_id" uuid NOT NULL,
	"rank" smallint NOT NULL,
	"nominee_member_id" uuid NOT NULL,
	"found_by" text NOT NULL,
	"carried_from_link_id" uuid,
	"state" text DEFAULT 'live' NOT NULL,
	"answer" text,
	"asked_at" timestamp with time zone NOT NULL,
	"responded_at" timestamp with time zone,
	"ended_at" timestamp with time zone,
	"end_reason" text
);--> statement-breakpoint
ALTER TABLE "member_nominee_links" ADD CONSTRAINT "member_nominee_links_declarer_fk" FOREIGN KEY ("declarer_member_id") REFERENCES "public"."members"("member_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "member_nominee_links" ADD CONSTRAINT "member_nominee_links_nominee_fk" FOREIGN KEY ("nominee_member_id") REFERENCES "public"."members"("member_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "member_nominee_links" ADD CONSTRAINT "member_nominee_links_version_fk" FOREIGN KEY ("version_id") REFERENCES "public"."member_nominee_versions"("version_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "member_nominee_links" ADD CONSTRAINT "member_nominee_links_carried_from_fk" FOREIGN KEY ("carried_from_link_id") REFERENCES "public"."member_nominee_links"("link_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
-- ⚠ LOCKSTEP with `NOMINEE_LINK_FOUND_BY` / `NOMINEE_LINK_STATES` / `NOMINEE_LINK_ANSWERS` / `NOMINEE_LINK_END_REASONS`
-- (`schema/member_nominee_links.ts`; the policy spec pins all four).
ALTER TABLE "member_nominee_links" ADD CONSTRAINT "member_nominee_links_rank_check" CHECK ("rank" IN (1, 2));--> statement-breakpoint
ALTER TABLE "member_nominee_links" ADD CONSTRAINT "member_nominee_links_found_by_check" CHECK ("found_by" IN ('contacts', 'picker', 'typed'));--> statement-breakpoint
ALTER TABLE "member_nominee_links" ADD CONSTRAINT "member_nominee_links_state_check" CHECK ("state" IN ('live', 'ended', 'erased'));--> statement-breakpoint
ALTER TABLE "member_nominee_links" ADD CONSTRAINT "member_nominee_links_answer_check" CHECK ("answer" IS NULL OR "answer" IN ('confirmed', 'not_me'));--> statement-breakpoint
ALTER TABLE "member_nominee_links" ADD CONSTRAINT "member_nominee_links_end_reason_check" CHECK ("end_reason" IS NULL OR "end_reason" IN ('redeclared', 'removed_by_declarer', 'erased'));--> statement-breakpoint
ALTER TABLE "member_nominee_links" ADD CONSTRAINT "member_nominee_links_not_self_check" CHECK ("declarer_member_id" <> "nominee_member_id");--> statement-breakpoint
-- An answer is dated; a live link has ⛔ end and ⛔ end reason; an erased link — and ONLY an erased link — ends `erased`.
-- ⚠ Sound only because `state` is NOT NULL (a NULL state would pass all three).
ALTER TABLE "member_nominee_links" ADD CONSTRAINT "member_nominee_links_answered_check" CHECK (("answer" IS NULL) = ("responded_at" IS NULL));--> statement-breakpoint
ALTER TABLE "member_nominee_links" ADD CONSTRAINT "member_nominee_links_ended_check" CHECK (("state" = 'live') = ("ended_at" IS NULL));--> statement-breakpoint
ALTER TABLE "member_nominee_links" ADD CONSTRAINT "member_nominee_links_end_reason_coherence_check" CHECK (("state" = 'live') = ("end_reason" IS NULL));--> statement-breakpoint
ALTER TABLE "member_nominee_links" ADD CONSTRAINT "member_nominee_links_erased_check" CHECK (("state" = 'erased') = ("end_reason" IS NOT DISTINCT FROM 'erased'));--> statement-breakpoint
-- ⛔ No DELETE: a link is ⛔ never deleted (an end or an erasure is a state); the only deletion is the members cascade.
GRANT SELECT, INSERT ON "member_nominee_links" TO twt_app;--> statement-breakpoint
GRANT UPDATE ("state", "answer", "responded_at", "ended_at", "end_reason") ON "member_nominee_links" TO twt_app;--> statement-breakpoint
ALTER TABLE "member_nominee_links" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "member_nominee_links" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "member_nominee_links_tenant_isolation_select" ON "member_nominee_links" AS PERMISSIVE FOR SELECT TO "twt_app" USING (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "member_nominee_links_tenant_isolation_insert" ON "member_nominee_links" AS PERMISSIVE FOR INSERT TO "twt_app" WITH CHECK (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid);--> statement-breakpoint
-- ⚠ Load-bearing: the end, the answer AND `anonymizeMember`'s erasure all UPDATE; without it each silently updates 0 rows
-- under FORCE (`-279` A12).
CREATE POLICY "member_nominee_links_tenant_isolation_update" ON "member_nominee_links" AS PERMISSIVE FOR UPDATE TO "twt_app" USING (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid) WITH CHECK (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid);--> statement-breakpoint
-- ONE live link per version (a version names one nominee).
CREATE UNIQUE INDEX "member_nominee_links_live_uq" ON "member_nominee_links" USING btree ("version_id") WHERE "state" = 'live';--> statement-breakpoint
-- The declarer's marks (and the declare's `FOR UPDATE`), the marked member's requests, and the jobs' read by version (which
-- includes ENDED rows — a link ended after the cut still counts, NE7).
CREATE INDEX "member_nominee_links_declarer_idx" ON "member_nominee_links" USING btree ("pariwar_id", "declarer_member_id");--> statement-breakpoint
CREATE INDEX "member_nominee_links_nominee_idx" ON "member_nominee_links" USING btree ("pariwar_id", "nominee_member_id");--> statement-breakpoint
CREATE INDEX "member_nominee_links_version_idx" ON "member_nominee_links" USING btree ("version_id");--> statement-breakpoint

-- ── (2) the guard — `live → ended | erased` only; ⛔ no identity column ever changes; the answer and the end written once ──
CREATE FUNCTION member_nominee_links_guard()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.link_id IS DISTINCT FROM OLD.link_id
     OR NEW.pariwar_id IS DISTINCT FROM OLD.pariwar_id
     OR NEW.declarer_member_id IS DISTINCT FROM OLD.declarer_member_id
     OR NEW.version_id IS DISTINCT FROM OLD.version_id
     OR NEW.rank IS DISTINCT FROM OLD.rank
     OR NEW.nominee_member_id IS DISTINCT FROM OLD.nominee_member_id
     OR NEW.found_by IS DISTINCT FROM OLD.found_by
     OR NEW.carried_from_link_id IS DISTINCT FROM OLD.carried_from_link_id
     OR NEW.asked_at IS DISTINCT FROM OLD.asked_at THEN
    RAISE EXCEPTION 'member_nominee_links: an identity column never changes (Story 6.36e)'
      USING ERRCODE = 'integrity_constraint_violation';
  END IF;
  IF OLD.answer IS NOT NULL
     AND (NEW.answer IS DISTINCT FROM OLD.answer OR NEW.responded_at IS DISTINCT FROM OLD.responded_at) THEN
    RAISE EXCEPTION 'member_nominee_links: the answer is written once (Story 6.36e)'
      USING ERRCODE = 'integrity_constraint_violation';
  END IF;
  IF OLD.state <> 'live'
     AND (NEW.ended_at IS DISTINCT FROM OLD.ended_at OR NEW.end_reason IS DISTINCT FROM OLD.end_reason) THEN
    RAISE EXCEPTION 'member_nominee_links: the end is written once (Story 6.36e)'
      USING ERRCODE = 'integrity_constraint_violation';
  END IF;
  IF NEW.state IS DISTINCT FROM OLD.state AND NOT (OLD.state = 'live' AND NEW.state IN ('ended', 'erased')) THEN
    RAISE EXCEPTION 'member_nominee_links: % → % is not a forward transition (Story 6.36e)', OLD.state, NEW.state
      USING ERRCODE = 'integrity_constraint_violation';
  END IF;
  -- An answer is taken only while the link stands — ⛔ on an ended or erased link, ⛔ in the same write that ends it.
  IF OLD.answer IS NULL AND NEW.answer IS NOT NULL AND NOT (OLD.state = 'live' AND NEW.state = 'live') THEN
    RAISE EXCEPTION 'member_nominee_links: an answer is taken only on a live link (Story 6.36e)'
      USING ERRCODE = 'integrity_constraint_violation';
  END IF;
  RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER "member_nominee_links_guard" BEFORE UPDATE ON "member_nominee_links"
  FOR EACH ROW EXECUTE FUNCTION member_nominee_links_guard();
--> statement-breakpoint

-- ── (3) the BEFORE INSERT version check (NE1, V21) ──────────────────────────────────────────────────────────────────────
-- A link hangs off a `declared` version of the SAME rank, declarer and Pariwar — ⛔ a vacated tombstone, ⛔ another rank's
-- version, ⛔ another member's. An invoker function: it reads what the inserting scope can see (WITH CHECK pins `pariwar_id`).
CREATE FUNCTION member_nominee_links_version_check()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM member_nominee_versions v
     WHERE v.version_id = NEW.version_id
       AND v.kind = 'declared'
       AND v.rank = NEW.rank
       AND v.member_id = NEW.declarer_member_id
       AND v.pariwar_id = NEW.pariwar_id
  ) THEN
    RAISE EXCEPTION 'member_nominee_links: a link hangs off a declared version of its own rank, declarer and Pariwar (Story 6.36e)'
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER "member_nominee_links_version_check" BEFORE INSERT ON "member_nominee_links"
  FOR EACH ROW EXECUTE FUNCTION member_nominee_links_version_check();
--> statement-breakpoint

-- ── (4) the counter (NE5) — ⚠ LOCKSTEP with `MEMBER_DAILY_COUNTERS` ───────────────────────────────────────────────────────
-- Only ADDS a value ⇒ ⛔ existing row can fail the re-added CHECK.
ALTER TABLE "member_daily_counters" DROP CONSTRAINT "member_daily_counters_counter_check";--> statement-breakpoint
ALTER TABLE "member_daily_counters" ADD CONSTRAINT "member_daily_counters_counter_check" CHECK ("counter" IN ('contact_match_requests', 'contact_match_numbers', 'known_people_ask', 'nominee_link_resolve'));
