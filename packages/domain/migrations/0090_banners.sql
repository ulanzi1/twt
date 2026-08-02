-- Migration 0090 — banners + banner_dismissals (Story 10.9, Task 1). The Banner/Popup `[SURFACE]`.
--
-- ⚠ DO NOT REGENERATE with `db:generate` (same discipline as 0021–0089): the drizzle snapshot
-- baseline is frozen at 0020, so a regenerate emits a bloated catch-up migration and can raise
-- 42P07. This file is HAND-AUTHORED, carrying ONLY this story's DDL. No snapshot file is emitted.
--
-- ── NO state-writer trigger (Story 10.9 Decision 1) ──────────────────────────────────────────
-- UNLIKE 0084 (helpdesk_tickets) / 0078 (alerts) / the members/claims/pools tables, and EXACTLY
-- like 0085 (news_posts), a banner is NOT event-derived-state: `status` is a PLAIN mutable column
-- transitioned in the scoped tx (every create/edit/publish/retract audit-logged via the Story 1.10
-- writer). There is deliberately NO current_state write-rejection trigger, NO projector guard, NO
-- events_log stream. Adding one would contradict the ratified Decision 1.
--
-- ── NO scheduler (Story 10.9 Decision 2) ─────────────────────────────────────────────────────
-- `valid_from`/`valid_until` are a pure READ-TIME window. Nothing in this migration (and nothing in
-- apps/jobs) flips a status at activation or expiry: a banner "auto-archives" (FR-58B) by the clock
-- passing `valid_until`. `scheduled`/`live`/`expired` are DERIVED, never stored.
--
-- Hand-supplements (relative to the generated DDL), mirroring 0085's posture:
--   1. GRANT SELECT, INSERT, UPDATE on `banners` to twt_app. NOT DELETE: a banner row is never
--      row-deleted (a draft is edited in place; the lifecycle terminates at `retracted`).
--      `banner_dismissals` gets SELECT, INSERT, UPDATE (the idempotent upsert needs both write
--      privileges) — also NOT DELETE: an acknowledgement is a durable member-facing fact.
--   2. ENABLE + FORCE ROW LEVEL SECURITY on both tables.
--   3. The tenant-isolation RLS policies (SELECT/INSERT/UPDATE) keyed on app.pariwar_id.
--
-- ── The load-bearing CHECKs ───────────────────────────────────────────────────────────────────
--   · `banners_window_non_empty`          — AC2: `valid_until > valid_from`.
--   · `banners_popup_must_be_dismissible` — AC4 "no member trapped": `display_mode <> 'popup' OR
--     dismissible`. The STRUCTURAL half of the invariant; the domain 422 is the other half. An
--     undismissable popup is impossible on EVERY write path, including a raw SQL one.
--   · `banners_revision_positive`         — `revision >= 1` (never 0, mirroring
--     `banner_dismissals_revision_positive` below), so the very first `dismissed_revision >=
--     banners.revision` comparison can never be ambiguous against a freshly-seeded row.
--
-- The roles (twt_app / twt_service) already exist from migration 0002 — no CREATE ROLE. Only
-- `twt_app` needs table privileges: banners have no background-job writer (Decision 2 — no
-- scheduler, no worker), so `twt_service` needs no grant on either table.

CREATE TYPE "public"."banner_display_mode" AS ENUM('banner', 'popup');--> statement-breakpoint
CREATE TYPE "public"."banner_severity" AS ENUM('info', 'warning', 'critical');--> statement-breakpoint
CREATE TYPE "public"."banner_status" AS ENUM('draft', 'published', 'retracted');--> statement-breakpoint
CREATE TYPE "public"."banner_audience_scope" AS ENUM('public', 'members-all', 'state', 'role', 'cohort');--> statement-breakpoint
CREATE TABLE "banners" (
	"banner_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"pariwar_id" uuid NOT NULL,
	"title" text,
	"body" text,
	"title_hi" text,
	"body_hi" text,
	"audience_scope" "banner_audience_scope" NOT NULL,
	"audience_scope_value" text,
	"valid_from" timestamp with time zone NOT NULL,
	"valid_until" timestamp with time zone NOT NULL,
	"display_mode" "banner_display_mode" NOT NULL,
	"dismissible" boolean NOT NULL,
	"display_once_per_member" boolean DEFAULT false NOT NULL,
	"severity" "banner_severity" NOT NULL,
	"revision" integer DEFAULT 1 NOT NULL,
	"status" "banner_status" NOT NULL,
	"created_by_actor_id" uuid NOT NULL,
	"tone_signoff_content_hash" text,
	"tone_signoff_reviewed_at" timestamp with time zone,
	"tone_signoff_reviewed_by" uuid,
	"published_at" timestamp with time zone,
	"retracted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "banners_window_non_empty" CHECK ("banners"."valid_until" > "banners"."valid_from"),
	CONSTRAINT "banners_popup_must_be_dismissible" CHECK ("banners"."display_mode" <> 'popup' OR "banners"."dismissible"),
	CONSTRAINT "banners_revision_positive" CHECK ("banners"."revision" >= 1)
);
--> statement-breakpoint
CREATE TABLE "banner_dismissals" (
	"pariwar_id" uuid NOT NULL,
	"banner_id" uuid NOT NULL,
	"member_id" uuid NOT NULL,
	"dismissed_revision" integer NOT NULL,
	"dismissal_kind" text NOT NULL,
	"dismissed_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "banner_dismissals_pariwar_id_banner_id_member_id_pk" PRIMARY KEY("pariwar_id","banner_id","member_id"),
	CONSTRAINT "banner_dismissals_kind_valid" CHECK ("banner_dismissals"."dismissal_kind" IN ('dismissed', 'shown')),
	CONSTRAINT "banner_dismissals_revision_positive" CHECK ("banner_dismissals"."dismissed_revision" >= 1)
);
--> statement-breakpoint
-- (1) Table privileges for the app role (SELECT/INSERT/UPDATE, NOT DELETE — see the header).
GRANT SELECT, INSERT, UPDATE ON "banners" TO twt_app;--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE ON "banner_dismissals" TO twt_app;--> statement-breakpoint
-- (2) drizzle-kit-emitted: turn RLS on, then FORCE it (applies even to the non-superuser owner).
ALTER TABLE "banners" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "banners" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "banner_dismissals" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "banner_dismissals" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
-- The one composite the admin list AND the member visible-banner read both ride (AC1).
CREATE INDEX "banners_pariwar_status_valid_from_idx" ON "banners" USING btree ("pariwar_id","status","valid_from");--> statement-breakpoint
-- (3) Per-tenant RLS policies (the news_posts / helpdesk_tickets / every-tenant-table precedent).
CREATE POLICY "banners_tenant_isolation_select" ON "banners" AS PERMISSIVE FOR SELECT TO "twt_app" USING (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "banners_tenant_isolation_insert" ON "banners" AS PERMISSIVE FOR INSERT TO "twt_app" WITH CHECK (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "banners_tenant_isolation_update" ON "banners" AS PERMISSIVE FOR UPDATE TO "twt_app" USING (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid) WITH CHECK (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "banner_dismissals_tenant_isolation_select" ON "banner_dismissals" AS PERMISSIVE FOR SELECT TO "twt_app" USING (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "banner_dismissals_tenant_isolation_insert" ON "banner_dismissals" AS PERMISSIVE FOR INSERT TO "twt_app" WITH CHECK (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "banner_dismissals_tenant_isolation_update" ON "banner_dismissals" AS PERMISSIVE FOR UPDATE TO "twt_app" USING (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid) WITH CHECK (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid);
