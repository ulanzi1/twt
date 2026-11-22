-- Migration 0217 — what the Trust may learn about a `partner_form` offer (Story 12.5b, Task 1; Decision `2026-11-22-489` QE1, QE8,
-- QE12 (A), QE13 (A); carrying out `2026-11-22-486` R2 C and R3 B). Hand-authored — ⛔ never regenerate. THREE new tables, nothing else:
--
--   (1) `marketplace_partner_form_visits` — R2 C: ONE row per opening of the partner's page by a member, removed 90 days after that row's
--       own `opened_at` (W15, the lead-handoff sweep) — ⛔ dedup, ⛔ "last opening" (`-486`). ⛔ staff read: the only readers are erasure
--       (a HARD delete — the row holds nothing but the link), the DPDPA export and the purge. ⛔ UPDATE for anyone.
--   (2) `marketplace_partner_form_counts` — the Trust's OWN per-offer counts, per IST day and kind; ⛔ member column, by construction (I4).
--   (3) `marketplace_partner_form_totals` — R3 B: the partner's own totals, entered by staff (QE12 (A)), INSERT-ONLY. A figure below 5 is
--       stored as "fewer than 5" (`below_floor`, NULL figure) — the number itself is never stored (the CHECK says so).
--
-- Each: ENABLE + FORCE RLS, per-command tenant policies (⛔ FOR ALL — the 0193 shape), a COMPOSITE FK `(pariwar_id, module_id)` →
-- `marketplace_modules_pariwar_module_unique` (an FK check ignores RLS, so a single column would let a row name another Pariwar's
-- module), NO ACTION. Each granted command has its policy: a command with ⛔ policy matches 0 rows SILENTLY under FORCE (`-279` A12) —
-- hence the visits' FOR DELETE policy, the second in the migrations after 0167's.
--
-- ⚠ G24 — the jobs login. The W15 purge (DELETE) and the export (SELECT) run on the jobs pool, whose production login inherits ONLY
-- `twt_service` (roster Row 26). BYPASSRLS waives POLICIES, ⛔ GRANTs, so without the grant below both would be 42501 in production while
-- CI is green (every live test connects as the superuser). The 0195 precedent: the grant is in the migration; the grants catalog spec
-- (AC8) is the only check before production (TR33).
-- Statement order: CREATE → CHECKs → FKs → GRANT → ENABLE → FORCE → POLICY → indexes (0215).

CREATE TABLE "marketplace_partner_form_visits" (
	"visit_id" uuid PRIMARY KEY NOT NULL,
	"pariwar_id" uuid NOT NULL,
	"module_id" uuid NOT NULL,
	"member_id" uuid NOT NULL,
	"opened_at" timestamp with time zone DEFAULT clock_timestamp() NOT NULL
);--> statement-breakpoint
ALTER TABLE "marketplace_partner_form_visits" ADD CONSTRAINT "marketplace_partner_form_visits_module_fk" FOREIGN KEY ("pariwar_id", "module_id") REFERENCES "public"."marketplace_modules"("pariwar_id", "module_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
-- A member row is never deleted (erasure anonymizes); the writer also checks the member is in the Pariwar (`memberExists`).
ALTER TABLE "marketplace_partner_form_visits" ADD CONSTRAINT "marketplace_partner_form_visits_member_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("member_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
GRANT SELECT ON "marketplace_partner_form_visits" TO twt_app;--> statement-breakpoint
-- INSERT — EXACTLY what `openPartnerFormVisit` writes; `opened_at` is the DB clock, never the caller's.
GRANT INSERT ("visit_id", "pariwar_id", "module_id", "member_id") ON "marketplace_partner_form_visits" TO twt_app;--> statement-breakpoint
-- DELETE — erasure (`anonymizeMember`). ⛔ UPDATE.
GRANT DELETE ON "marketplace_partner_form_visits" TO twt_app;--> statement-breakpoint
-- The jobs login: SELECT (the export) and DELETE (W15). ⛔ INSERT, ⛔ UPDATE.
GRANT SELECT, DELETE ON "marketplace_partner_form_visits" TO twt_service;--> statement-breakpoint
ALTER TABLE "marketplace_partner_form_visits" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "marketplace_partner_form_visits" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "marketplace_partner_form_visits_tenant_isolation_select" ON "marketplace_partner_form_visits" AS PERMISSIVE FOR SELECT TO "twt_app" USING (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "marketplace_partner_form_visits_tenant_isolation_insert" ON "marketplace_partner_form_visits" AS PERMISSIVE FOR INSERT TO "twt_app" WITH CHECK (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "marketplace_partner_form_visits_tenant_isolation_delete" ON "marketplace_partner_form_visits" AS PERMISSIVE FOR DELETE TO "twt_app" USING (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid);--> statement-breakpoint
-- The purge (W15).
CREATE INDEX "marketplace_partner_form_visits_opened_at_idx" ON "marketplace_partner_form_visits" USING btree ("opened_at");--> statement-breakpoint
-- Erasure and the export.
CREATE INDEX "marketplace_partner_form_visits_pariwar_member_idx" ON "marketplace_partner_form_visits" USING btree ("pariwar_id", "member_id");--> statement-breakpoint
CREATE INDEX "marketplace_partner_form_visits_pariwar_module_idx" ON "marketplace_partner_form_visits" USING btree ("pariwar_id", "module_id");--> statement-breakpoint

-- ⚠ LOCKSTEP: the kinds with `PARTNER_FORM_COUNT_KINDS` (schema/marketplace_partner_form_counts.ts). `day` is the IST date from the DB.
CREATE TABLE "marketplace_partner_form_counts" (
	"pariwar_id" uuid NOT NULL,
	"module_id" uuid NOT NULL,
	"day" date NOT NULL,
	"kind" text NOT NULL,
	"count" bigint NOT NULL,
	CONSTRAINT "marketplace_partner_form_counts_pkey" PRIMARY KEY("pariwar_id","module_id","day","kind")
);--> statement-breakpoint
ALTER TABLE "marketplace_partner_form_counts" ADD CONSTRAINT "marketplace_partner_form_counts_kind_check" CHECK ("kind" IN ('card_shown', 'card_opened', 'went_to_partner', 'came_back'));--> statement-breakpoint
ALTER TABLE "marketplace_partner_form_counts" ADD CONSTRAINT "marketplace_partner_form_counts_count_check" CHECK ("count" >= 1);--> statement-breakpoint
ALTER TABLE "marketplace_partner_form_counts" ADD CONSTRAINT "marketplace_partner_form_counts_module_fk" FOREIGN KEY ("pariwar_id", "module_id") REFERENCES "public"."marketplace_modules"("pariwar_id", "module_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
-- The UPSERT needs INSERT and UPDATE (`count` only). ⛔ DELETE.
GRANT SELECT, INSERT ON "marketplace_partner_form_counts" TO twt_app;--> statement-breakpoint
GRANT UPDATE ("count") ON "marketplace_partner_form_counts" TO twt_app;--> statement-breakpoint
ALTER TABLE "marketplace_partner_form_counts" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "marketplace_partner_form_counts" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "marketplace_partner_form_counts_tenant_isolation_select" ON "marketplace_partner_form_counts" AS PERMISSIVE FOR SELECT TO "twt_app" USING (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "marketplace_partner_form_counts_tenant_isolation_insert" ON "marketplace_partner_form_counts" AS PERMISSIVE FOR INSERT TO "twt_app" WITH CHECK (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "marketplace_partner_form_counts_tenant_isolation_update" ON "marketplace_partner_form_counts" AS PERMISSIVE FOR UPDATE TO "twt_app" USING (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid) WITH CHECK (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid);--> statement-breakpoint

-- ONE entry (`totals_id`) = one period's stages, in order. A correction is a NEW entry for the same period; the read shows the newest.
CREATE TABLE "marketplace_partner_form_totals" (
	"totals_id" uuid NOT NULL,
	"pariwar_id" uuid NOT NULL,
	"module_id" uuid NOT NULL,
	"period_start" date NOT NULL,
	"period_end" date NOT NULL,
	"stage_order" smallint NOT NULL,
	"stage_label" text NOT NULL,
	"figure" integer,
	"below_floor" boolean NOT NULL,
	"entered_by_actor_id" uuid NOT NULL,
	"entered_at" timestamp with time zone DEFAULT clock_timestamp() NOT NULL,
	"audit_id" uuid NOT NULL,
	CONSTRAINT "marketplace_partner_form_totals_pkey" PRIMARY KEY("totals_id","stage_order")
);--> statement-breakpoint
ALTER TABLE "marketplace_partner_form_totals" ADD CONSTRAINT "marketplace_partner_form_totals_period_check" CHECK ("period_end" >= "period_start");--> statement-breakpoint
ALTER TABLE "marketplace_partner_form_totals" ADD CONSTRAINT "marketplace_partner_form_totals_stage_order_check" CHECK ("stage_order" BETWEEN 1 AND 20);--> statement-breakpoint
ALTER TABLE "marketplace_partner_form_totals" ADD CONSTRAINT "marketplace_partner_form_totals_stage_label_check" CHECK (char_length("stage_label") BETWEEN 1 AND 80);--> statement-breakpoint
-- R3 B — "totals below 5 are not shown": below 5 the number is NOT STORED (`PARTNER_FORM_FIGURE_FLOOR`). ⚠ LOCKSTEP with the constant.
ALTER TABLE "marketplace_partner_form_totals" ADD CONSTRAINT "marketplace_partner_form_totals_floor_check" CHECK (("below_floor" AND "figure" IS NULL) OR (NOT "below_floor" AND "figure" IS NOT NULL AND "figure" >= 5));--> statement-breakpoint
ALTER TABLE "marketplace_partner_form_totals" ADD CONSTRAINT "marketplace_partner_form_totals_module_fk" FOREIGN KEY ("pariwar_id", "module_id") REFERENCES "public"."marketplace_modules"("pariwar_id", "module_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
-- INSERT-ONLY. ⛔ UPDATE, ⛔ DELETE.
GRANT SELECT, INSERT ON "marketplace_partner_form_totals" TO twt_app;--> statement-breakpoint
ALTER TABLE "marketplace_partner_form_totals" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "marketplace_partner_form_totals" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "marketplace_partner_form_totals_tenant_isolation_select" ON "marketplace_partner_form_totals" AS PERMISSIVE FOR SELECT TO "twt_app" USING (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "marketplace_partner_form_totals_tenant_isolation_insert" ON "marketplace_partner_form_totals" AS PERMISSIVE FOR INSERT TO "twt_app" WITH CHECK (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid);--> statement-breakpoint
CREATE INDEX "marketplace_partner_form_totals_pariwar_module_idx" ON "marketplace_partner_form_totals" USING btree ("pariwar_id", "module_id", "entered_at");
