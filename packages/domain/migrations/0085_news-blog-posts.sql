-- Migration 0085 — news_posts (Story 10.5, Task 1). The News/Blog `[SURFACE]` data model.
--
-- ⚠ DO NOT REGENERATE with `db:generate` (same discipline as 0021–0084): the drizzle snapshot
-- baseline is frozen at 0020, so a regenerate emits a bloated catch-up migration and can raise
-- 42P07. This file is HAND-AUTHORED, carrying ONLY this story's DDL. No snapshot file is emitted.
--
-- ── NO state-writer trigger (Story 10.5 Decision 1) ──────────────────────────────────────────
-- UNLIKE 0084 (helpdesk_tickets) / 0078 (alerts) / the members/claims/pools tables, a News/Blog
-- post is NOT event-derived-state: `status` is a PLAIN mutable column transitioned in the scoped
-- tx (every transition audit-logged via the Story 1.10 writer). There is deliberately NO
-- current_state write-rejection trigger, NO projector guard, NO events_log stream. Adding one
-- would contradict the ratified Decision 1 (mutable content, not a legal-state machine).
--
-- Hand-supplements (relative to the generated DDL), mirroring 0084's posture:
--   1. GRANT SELECT, INSERT, UPDATE on news_posts to twt_app. NOT DELETE: a post row is never
--      row-deleted (a draft is edited in place; the lifecycle terminates via status transitions).
--   2. ENABLE + FORCE ROW LEVEL SECURITY.
--   3. The three tenant-isolation RLS policies (SELECT/INSERT/UPDATE) keyed on app.pariwar_id.
--
-- The roles (twt_app / twt_service) already exist from migration 0002 — no CREATE ROLE.

CREATE TYPE "public"."news_audience_scope" AS ENUM('public', 'members-all', 'state', 'role', 'cohort');--> statement-breakpoint
CREATE TYPE "public"."news_post_status" AS ENUM('draft', 'submitted', 'approved', 'scheduled', 'published');--> statement-breakpoint
CREATE TABLE "news_posts" (
	"post_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"pariwar_id" uuid NOT NULL,
	"title" text NOT NULL,
	"body_markdown" text NOT NULL,
	"title_hi" text,
	"body_markdown_hi" text,
	"audience_scope" "news_audience_scope" NOT NULL,
	"audience_scope_value" text,
	"channels" text[] DEFAULT '{}'::text[] NOT NULL,
	"scheduled_publish_at" timestamp with time zone,
	"status" "news_post_status" NOT NULL,
	"author_actor_id" uuid NOT NULL,
	"reviewer_actor_id" uuid,
	"tone_signoff_content_hash" text,
	"tone_signoff_reviewed_at" timestamp with time zone,
	"published_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
-- (1) Table privileges for the app role (SELECT/INSERT/UPDATE, NOT DELETE — see the header).
GRANT SELECT, INSERT, UPDATE ON "news_posts" TO twt_app;--> statement-breakpoint
-- (2) drizzle-kit-emitted: turn RLS on, then FORCE it (applies even to the non-superuser owner).
ALTER TABLE "news_posts" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "news_posts" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE INDEX "news_posts_pariwar_status_idx" ON "news_posts" USING btree ("pariwar_id","status");--> statement-breakpoint
-- (3) Per-tenant RLS policies (the helpdesk_tickets / every-tenant-table precedent).
CREATE POLICY "news_posts_tenant_isolation_select" ON "news_posts" AS PERMISSIVE FOR SELECT TO "twt_app" USING (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "news_posts_tenant_isolation_insert" ON "news_posts" AS PERMISSIVE FOR INSERT TO "twt_app" WITH CHECK (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "news_posts_tenant_isolation_update" ON "news_posts" AS PERMISSIVE FOR UPDATE TO "twt_app" USING (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid) WITH CHECK (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid);
