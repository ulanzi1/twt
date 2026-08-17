-- Migration 0109 — surveys + survey_responses (Story 10.15, Task 1). The Survey/Poll `[SURFACE]`.
--
-- ⚠ DO NOT REGENERATE with `db:generate` (same discipline as 0021–0108): the drizzle snapshot
-- baseline is frozen at 0020, so a regenerate emits a bloated catch-up migration and can raise
-- 42P07. This file is HAND-AUTHORED, carrying ONLY this story's DDL. No snapshot file is emitted.
--
-- ── ⚠ A SURVEY IS ADVISORY (Story 10.15 LBD-1) ───────────────────────────────────────────────
-- `response_threshold` is FR-58's "optional quorum threshold" RENAMED, and the rename is the point:
-- `quorum` is already a Deed term binding the TRUSTEE quorum (trust-deed.md:227, Cl. 19; disambiguated
-- once already at niyamavali.md:270). Members hold no governance vote under either document. This
-- column GATES NOTHING — no status, no read, no job. It feeds exactly one derived boolean on the
-- aggregate projection (`threshold_met`) and nothing else consults it. A survey result that binds
-- anything is a Deed question, not a schema change.
--
-- ── NO state-writer trigger (LBD-2) ──────────────────────────────────────────────────────────
-- UNLIKE 0084 (helpdesk_tickets) / 0078 (alerts) / the members/claims/pools tables, and EXACTLY like
-- 0085 (news_posts) and 0090 (banners), a survey is NOT event-derived-state: `status` is a PLAIN
-- mutable column transitioned in the scoped tx (every create/edit/publish/close audit-logged via the
-- Story 1.10 writer). There is deliberately NO current_state write-rejection trigger, NO projector
-- guard, NO events_log stream. Adding one would contradict LBD-2.
--
-- ── NO scheduler (AC2) ───────────────────────────────────────────────────────────────────────
-- `valid_from`/`valid_until` are a pure READ-TIME window. Nothing in this migration (and nothing in
-- apps/jobs) flips a status at open or expiry: a survey stops accepting responses by the clock
-- passing `valid_until`, enforced on the WRITE path as a typed 409 as well as hidden from the read.
-- `scheduled`/`open`/`expired` are DERIVED, never stored.
-- ⚠ The ONE apps/jobs consumer this story does add (`survey-publish.ts`) is a publish-time FAN-OUT,
-- not a sweep: it notifies the audience once and never touches `status`. It also needs NO grant of
-- its own — like `news-publish.ts` it reads through `withPariwarScope(pool, …)`, i.e. as `twt_app`
-- with `app.pariwar_id` set, so tenant isolation applies to the worker exactly as to a request.
-- ⛔ Do NOT "helpfully" grant `twt_service` here: migration 0002 pins that role `NOBYPASSRLS` and
-- RAISEs if the attribute is ever inverted (Story 1.2 W1). It holds `SELECT, INSERT ON events_log`
-- and nothing tenant-scoped, and 0085/0090 — the two sibling `[SURFACE]` migrations, one of which
-- has a fan-out worker — grant it nothing either.
--
-- Hand-supplements (relative to the generated DDL), mirroring 0090's posture:
--   1. GRANT SELECT, INSERT, UPDATE on `surveys` to twt_app. ⛔ NOT DELETE: deleting a survey row
--      would make its stored responses uninterpretable — an answer whose question no longer exists
--      is worse than no answer. The lifecycle terminates at `closed`.
--      `survey_responses` gets SELECT, INSERT only — ⛔ NOT UPDATE and NOT DELETE. This is the
--      STRUCTURAL half of LBD-6 ("one response per member; submission is FINAL"): with no UPDATE
--      privilege the "convenience upsert" this story forbids is not merely disallowed by review, it
--      is unavailable to the app role on every write path including a raw SQL one.
--      `twt_service` gets NOTHING (see the fan-out note above — the worker reads as `twt_app`).
--   2. ENABLE + FORCE ROW LEVEL SECURITY on both tables.
--   3. The tenant-isolation RLS policies keyed on app.pariwar_id — SELECT/INSERT/UPDATE on `surveys`,
--      SELECT/INSERT only on `survey_responses` (matching the grants above; a policy for a privilege
--      the role does not hold is dead text that reads as permission).
--
-- ── The load-bearing CHECKs ───────────────────────────────────────────────────────────────────
--   · `surveys_window_non_empty`             — AC2: `valid_until > valid_from`. A zero/negative
--     window is a survey that can never be answered.
--   · `surveys_response_threshold_positive`  — `response_threshold IS NULL OR >= 1`. A threshold of
--     0 is met before anyone answers, which makes it not a threshold. (Informational either way —
--     LBD-1 — but a nonsense value in an advisory field still misleads the admin reading it.)
--   · The `survey_responses` composite PRIMARY KEY — the structural half of LBD-6. The domain 409 is
--     the other half.
--
-- ⚠ `questions` / `answers` are JSONB with snake_case inner keys, validated in the DOMAIN
-- (`validateQuestionnaire` / `validateAnswers`), NOT by the DB. The `survey_question_type` enum
-- exists as the one spelling authority for the three permitted types even though the DB cannot
-- enforce it inside the JSONB — a bare string union would give four places to drift.
--
-- The roles (twt_app / twt_service) already exist from migration 0002 — no CREATE ROLE.

CREATE TYPE "public"."survey_status" AS ENUM('draft', 'published', 'closed');--> statement-breakpoint
CREATE TYPE "public"."survey_audience_scope" AS ENUM('public', 'members-all', 'state', 'role', 'cohort');--> statement-breakpoint
CREATE TYPE "public"."survey_question_type" AS ENUM('single_choice', 'multi_choice', 'free_text');--> statement-breakpoint
CREATE TABLE "surveys" (
	"survey_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"pariwar_id" uuid NOT NULL,
	"title" text,
	"body" text,
	"title_hi" text,
	"body_hi" text,
	"questions" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"audience_scope" "survey_audience_scope" NOT NULL,
	"audience_scope_value" text,
	"valid_from" timestamp with time zone NOT NULL,
	"valid_until" timestamp with time zone NOT NULL,
	"response_threshold" integer,
	"status" "survey_status" NOT NULL,
	"created_by_actor_id" uuid NOT NULL,
	"tone_signoff_content_hash" text,
	"tone_signoff_reviewed_at" timestamp with time zone,
	"tone_signoff_reviewed_by" uuid,
	"published_at" timestamp with time zone,
	"closed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "surveys_window_non_empty" CHECK ("surveys"."valid_until" > "surveys"."valid_from"),
	CONSTRAINT "surveys_response_threshold_positive" CHECK ("surveys"."response_threshold" IS NULL OR "surveys"."response_threshold" >= 1)
);
--> statement-breakpoint
CREATE TABLE "survey_responses" (
	"pariwar_id" uuid NOT NULL,
	"survey_id" uuid NOT NULL,
	"member_id" uuid NOT NULL,
	"answers" jsonb NOT NULL,
	"submitted_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "survey_responses_pariwar_id_survey_id_member_id_pk" PRIMARY KEY("pariwar_id","survey_id","member_id")
);
--> statement-breakpoint
-- (1) Table privileges. See the header: no DELETE anywhere, and no UPDATE on survey_responses (the
-- structural half of LBD-6 — submission is FINAL).
GRANT SELECT, INSERT, UPDATE ON "surveys" TO twt_app;--> statement-breakpoint
GRANT SELECT, INSERT ON "survey_responses" TO twt_app;--> statement-breakpoint
-- (2) drizzle-kit-emitted: turn RLS on, then FORCE it (applies even to the non-superuser owner).
ALTER TABLE "surveys" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "surveys" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "survey_responses" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "survey_responses" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
-- The one composite the admin list AND the member open-survey read both ride (AC1).
CREATE INDEX "surveys_pariwar_status_valid_from_idx" ON "surveys" USING btree ("pariwar_id","status","valid_from");--> statement-breakpoint
-- The aggregate read (AC7) is per-(tenant, survey) over every response row.
CREATE INDEX "survey_responses_pariwar_survey_idx" ON "survey_responses" USING btree ("pariwar_id","survey_id");--> statement-breakpoint
-- (3) Per-tenant RLS policies (the news_posts / banners / helpdesk_tickets precedent). Note
-- `survey_responses` gets SELECT + INSERT only, matching its grants — a policy for a privilege the
-- role does not hold is dead text that reads as permission.
CREATE POLICY "surveys_tenant_isolation_select" ON "surveys" AS PERMISSIVE FOR SELECT TO "twt_app" USING (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "surveys_tenant_isolation_insert" ON "surveys" AS PERMISSIVE FOR INSERT TO "twt_app" WITH CHECK (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "surveys_tenant_isolation_update" ON "surveys" AS PERMISSIVE FOR UPDATE TO "twt_app" USING (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid) WITH CHECK (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "survey_responses_tenant_isolation_select" ON "survey_responses" AS PERMISSIVE FOR SELECT TO "twt_app" USING (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "survey_responses_tenant_isolation_insert" ON "survey_responses" AS PERMISSIVE FOR INSERT TO "twt_app" WITH CHECK (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid);
