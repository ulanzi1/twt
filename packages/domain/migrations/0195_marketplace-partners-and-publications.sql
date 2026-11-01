-- Migration 0195 — marketplace_partners + marketplace_module_publications (Story 12.2, Task 2.2; author-commit
-- `2026-11-01-433` QE3 (A), QE4, QE7 (A)). The FIRST production caller of the 12.1 module primitive needs:
--   (1) a per-Pariwar partner REGISTRY (`partner_id` was a brand with ⛔ table since 12.1);
--   (2) a `(pariwar_id, module_id)` unique on `marketplace_modules` — a CONSTRAINT, ⛔ a column (I7) — so the
--       publication FK can be composite;
--   (3) the one-row-per-module PUBLICATION record (the tone sign-off's persistence — 12.1 carried item C12);
--   (4) the composite partner FK on `marketplace_modules`;
--   (5) (QE7 (A)) the 5-minute activation sweep's partial index + `twt_service`'s grant on `marketplace_modules`.
--
-- ⚠ DO NOT REGENERATE with `db:generate` (the 0021+ discipline): the drizzle snapshot is frozen at 0020. HAND-AUTHORED;
-- it carries ONLY this story's DDL. No snapshot file. The roles exist since 0002 (no CREATE ROLE). There is ⛔ `pariwars`
-- table, so neither new table's `pariwar_id` carries an FK to one.
--
-- ── Why every FK is COMPOSITE on `pariwar_id` ───────────────────────────────────────────────────────
-- An FK check runs as the REFERENCED table's owner and IGNORES RLS. A single-column `partner_id` FK would let a module
-- name ANOTHER Pariwar's partner (and a single-column publication FK another Pariwar's module). Keying both on
-- `(pariwar_id, …)` makes a cross-tenant reference a 23503.
-- Both FKs are `ON DELETE NO ACTION ON UPDATE NO ACTION` (the 0161 style). ⛔ CASCADE / SET NULL: an FK action that
-- UPDATEs `marketplace_modules` runs WITHOUT the projector's writer guard and the 0193 whole-row trigger rejects it
-- (P0001). Transitions never change `(pariwar_id, partner_id)`, so the RI check is SKIPPED on them — except when the row
-- was written earlier in the SAME transaction (Postgres's xmin rule), where it runs as the owner and passes. `twt_app`
-- needs ⛔ REFERENCES grant (the check runs as the owner).
--
-- ── Hand-supplements (relative to the drizzle-declared tables / policies) ───────────────────────────
--   1. GRANT SELECT, INSERT to twt_app on BOTH new tables — ⛔ UPDATE, ⛔ DELETE: both are INSERT-ONLY (I7). A misspelt
--      partner is a NEW partner; a publication is never revised.
--   2. ENABLE + FORCE ROW LEVEL SECURITY on both, with named select / insert policies (⛔ FOR ALL).
--   3. `marketplace_partners_pariwar_name_en_unique` — an EXPRESSION unique index on `(pariwar_id, lower(display_name_en))`.
--
-- ── Why `twt_service` gets SELECT, UPDATE on `marketplace_modules` (QE7 (A)) ────────────────────────
-- The 5-minute activation sweep (`apps/jobs/src/scheduler/module-activation.ts`) scans for due `scheduled` modules
-- UNSCOPED and cross-tenant (`marketplace.selectDueScheduledModules` on the service pool — SELECT), then activates each
-- one inside `withPariwarScope`, where `activateModule` takes the row's `SELECT … FOR UPDATE` lock (needs UPDATE) and the
-- projector UPDATEs the I1 columns under the writer guard. The production jobs login inherits ONLY `twt_service`
-- (provisioning comment in 0007) and does ⛔ `SET LOCAL ROLE twt_app` (the 6.25 R3 deferral), so without this grant every
-- tick would fail 42501. `events_log` is already SELECT, INSERT for `twt_service` (0002). ⛔ INSERT, ⛔ DELETE: the sweep
-- never authors or removes a module. ⚠ Dev / CI connect as a superuser, which HIDES a missing grant — the live spec
-- asserts it with `has_table_privilege` (TR17). ⚠ Under an RLS-bound (⛔ BYPASSRLS) jobs login the unscoped scan returns
-- ZERO rows silently — the tick checks `canReadAcrossPariwars` first and alarms (roster Row 26 `jobs-db-role`, QE19).
--
-- ── Locks (stated honestly) ─────────────────────────────────────────────────────────────────────────
-- `ADD CONSTRAINT … UNIQUE` takes ACCESS EXCLUSIVE on `marketplace_modules` and builds an index over it. Each
-- `ADD FOREIGN KEY` takes SHARE ROW EXCLUSIVE on BOTH its tables (the publications FK on `marketplace_module_publications`
-- + `marketplace_modules`; the partner FK on `marketplace_modules` + `marketplace_partners`) and the partner FK VALIDATES
-- existing rows. Fine pre-production (TWT has ⛔ production deployment). ⚠ On a NON-fresh dev / test DB, leftover 12.1
-- rows (a random `partner_id`, committed by own-committing specs) fail that validation with 23503 — delete them and their
-- `events_log` streams first (superuser, `session_replication_role = replica`); fresh containers and CI are unaffected.

CREATE TABLE "marketplace_partners" (
	"partner_id" uuid PRIMARY KEY NOT NULL,
	"pariwar_id" uuid NOT NULL,
	"display_name_en" text NOT NULL,
	"display_name_hi" text NOT NULL,
	"created_by_actor_id" uuid NOT NULL,
	"audit_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "marketplace_partners_pariwar_partner_unique" UNIQUE("pariwar_id","partner_id")
);
--> statement-breakpoint
CREATE UNIQUE INDEX "marketplace_partners_pariwar_name_en_unique" ON "marketplace_partners" USING btree ("pariwar_id", lower("display_name_en"));--> statement-breakpoint
GRANT SELECT, INSERT ON "marketplace_partners" TO twt_app;--> statement-breakpoint
ALTER TABLE "marketplace_partners" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "marketplace_partners" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "marketplace_partners_tenant_isolation_select" ON "marketplace_partners" AS PERMISSIVE FOR SELECT TO "twt_app" USING (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "marketplace_partners_tenant_isolation_insert" ON "marketplace_partners" AS PERMISSIVE FOR INSERT TO "twt_app" WITH CHECK (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid);--> statement-breakpoint
ALTER TABLE "marketplace_modules" ADD CONSTRAINT "marketplace_modules_pariwar_module_unique" UNIQUE("pariwar_id","module_id");--> statement-breakpoint
CREATE TABLE "marketplace_module_publications" (
	"module_id" uuid PRIMARY KEY NOT NULL,
	"pariwar_id" uuid NOT NULL,
	"published_event_type" text NOT NULL,
	"tone_signoff_content_hash" text NOT NULL,
	"reviewed_by_actor_id" uuid NOT NULL,
	"reviewed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"hindi_reviewed" boolean NOT NULL,
	"partner_agreement_confirmed" boolean NOT NULL,
	"audit_id" uuid NOT NULL,
	CONSTRAINT "marketplace_module_publications_module_fk" FOREIGN KEY ("pariwar_id","module_id") REFERENCES "public"."marketplace_modules"("pariwar_id","module_id") ON DELETE no action ON UPDATE no action,
	CONSTRAINT "marketplace_module_publications_event_type" CHECK ("published_event_type" IN ('module.scheduled', 'module.activated')),
	CONSTRAINT "marketplace_module_publications_content_hash" CHECK ("tone_signoff_content_hash" ~ '^[0-9a-f]{64}$'),
	CONSTRAINT "marketplace_module_publications_hindi_reviewed" CHECK ("hindi_reviewed"),
	CONSTRAINT "marketplace_module_publications_partner_agreement" CHECK ("partner_agreement_confirmed")
);
--> statement-breakpoint
GRANT SELECT, INSERT ON "marketplace_module_publications" TO twt_app;--> statement-breakpoint
ALTER TABLE "marketplace_module_publications" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "marketplace_module_publications" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "marketplace_module_publications_tenant_isolation_select" ON "marketplace_module_publications" AS PERMISSIVE FOR SELECT TO "twt_app" USING (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "marketplace_module_publications_tenant_isolation_insert" ON "marketplace_module_publications" AS PERMISSIVE FOR INSERT TO "twt_app" WITH CHECK (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid);--> statement-breakpoint
ALTER TABLE "marketplace_modules" ADD CONSTRAINT "marketplace_modules_partner_fk" FOREIGN KEY ("pariwar_id","partner_id") REFERENCES "public"."marketplace_partners"("pariwar_id","partner_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "marketplace_modules_scheduled_valid_from_idx" ON "marketplace_modules" USING btree ("valid_from") WHERE current_state = 'scheduled';--> statement-breakpoint
GRANT SELECT, UPDATE ON "marketplace_modules" TO twt_service;
