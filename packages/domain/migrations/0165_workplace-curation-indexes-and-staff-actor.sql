-- Migration 0165 — the workplace-curation deltas moved OUT of 0164 (Story 6.36c, code review round 2). Hand-authored — ⛔
-- never regenerate.
--
-- WHY A NEW MIGRATION: round 1 edited 0164 AFTER it had been applied. A database that already ran 0164 never re-runs it,
-- so the edits never reached `:5432`, while `:5433` (migrated again after the edit) carries them. 0164 is restored
-- byte-for-byte to its as-applied text (`95e36161`), and every delta lives here. The index statements are IDEMPOTENT, so
-- they converge all three kinds of database: one that applied the ORIGINAL 0164, `:5433` which applied the EDITED one,
-- and a fresh one. The CHECK in (3) applies on any database that holds ⛔ unattributed staff row. ⚠ Rows committed by
-- specs written before 0165 (fixtures that inserted a staff office with ⛔ actor) violate it: a TEST database that holds
-- them is RECREATED, ⛔ backfilled; a real database's offender is FOUND (below).
--
--   · known_people_campaigns — 0164's `known_people_campaigns_pariwar_ends_on_idx` (`pariwar_id, ends_on DESC`) does not
--     match the list's actual sort (`listCampaigns`: `created_at DESC, campaign_id DESC`). It is DROPPED (`IF EXISTS` —
--     absent where the edited 0164 ran) and `known_people_campaigns_pariwar_created_idx` is created (`IF NOT EXISTS` —
--     present where the edited 0164 ran). The two names DIFFER. The leading `pariwar_id` still serves the overlap / live
--     reads' equality filter.
--   · workplace_requests — `workplace_requests_pariwar_folded_name_idx`, the queue's same-name count's supporting index: a
--     partial index on the count's EXACT folded expression, over the `pending` requests that carry a typed name (the
--     count's pending arm, `workplace-admin.ts`). `IF NOT EXISTS` — present where the edited 0164 ran.
--   · workplaces — `workplaces_staff_actor_check`: a STAFF row names the Super Admin who added it (`created_by_actor_id`,
--     0161), a DB backstop for the writer's rule (`addStaffWorkplace` — RV9 (ii); `-342` call 3). An imported row is ⛔
--     constrained (the import never writes the column). ⚠ If this ADD fails on a live database, FIND the row — ⛔ `NOT
--     VALID`, ⛔ a backfill.
-- ⛔ No `btrim` backfill of `workplaces.name`: the edited 0164 had added one before `workplaces_name_trimmed_check`; it is
-- ⛔ carried here (Task 1.2 — an untrimmed row is FOUND, ⛔ silently rewritten). Every database that ran either 0164 already
-- holds that CHECK.
-- ⛔ No PII.

-- ── (1) known_people_campaigns — the list's index ────────────────────────────────────────────────────────────────────
DROP INDEX IF EXISTS "known_people_campaigns_pariwar_ends_on_idx";--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "known_people_campaigns_pariwar_created_idx" ON "known_people_campaigns" USING btree ("pariwar_id", "created_at" DESC, "campaign_id" DESC);--> statement-breakpoint

-- ── (2) workplace_requests — the same-name count's index ─────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS "workplace_requests_pariwar_folded_name_idx" ON "workplace_requests" USING btree ("pariwar_id", (lower(regexp_replace(btrim("typed_name"), '\s+', ' ', 'g')))) WHERE "state" = 'pending' AND "typed_name" IS NOT NULL;--> statement-breakpoint

-- ── (3) workplaces — a staff row names its actor ─────────────────────────────────────────────────────────────────────
ALTER TABLE "workplaces" ADD CONSTRAINT "workplaces_staff_actor_check" CHECK ("source" <> 'staff' OR "created_by_actor_id" IS NOT NULL);
