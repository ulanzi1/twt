-- Migration 0082 — per-Pariwar holiday-calendar registry (Story 8.9, Task 1; AC1).
--
-- The trustee-curated, effective-dated registry of locally-significant holiday WINDOWS a Pariwar
-- observes. It is the DATA half of UX-DR77 ("reconciliation tail 1-2 days normal, 5-7 days on Bihar
-- holiday windows … Per-Pariwar holiday windows configurable"): the pure resolver in
-- packages/domain/src/cycle-calendar/ reads these rows and computes the calendar-aware RECONCILIATION
-- TAIL deadline. It does NOT move the contribution close — FR-22's `live → closed` Day-15 close stays
-- mechanical and hard (see the story banner: epics.md:3022's "extend the contribution window" prose is
-- a RATIFIED drafting error).
--
-- ── Why `pariwar_holiday_calendar`, not `bihar_holiday_calendar` (D2, BigDev 2026-07-24) ────────────
-- The registry is owned by a PARIWAR, not by a geography. Bihar is the launch SEED dataset; the UX
-- spec (L1003) makes the principle explicitly Pariwar-local ("Rail Parivar's calendar … will differ;
-- Bank Parivar's … will differ"). A region-named table would have to be renamed the first time a
-- non-Bihar Pariwar is provisioned. Deliberate deviation from the epics' literal wording.
--
-- ── Shape: modeled 1:1 on 0075_pool-fixed-amount-schedule (the per-Pariwar registry precedent) ──────
-- Per-Pariwar, hand-authored, RLS ENABLE+FORCE with tenant-isolation policies keyed on
-- `app.pariwar_id`, GRANT-scoped to twt_app, `pariwar_id` unFK'd (the pre-Epic-3 substrate posture).
-- ONE difference from 0075: the GRANT includes DELETE. The calendar is RE-CURATED ANNUALLY — a
-- trustee replaces a year's window set when the official holiday list is published — so its rows are
-- replaceable data, NOT an append-only attestation record. (Contrast
-- pool_fixed_amount_emergency_attestations, whose SELECT+INSERT-only grant is the write-once
-- enforcement.) The audit trail for a re-curation is the Story 1.10 audit log, not row immutability.
--
-- ── Dates are IST CALENDAR dates, not instants ──────────────────────────────────────────────────────
-- `window_start_date` / `window_end_date` are `date` (not timestamptz): a holiday window is a run of
-- CALENDAR days in Asia/Kolkata, and storing it as an instant would invite a timezone-shifted
-- comparison. The resolver derives the IST calendar date of an instant via a fixed +05:30 ms offset
-- (India has no DST, so the offset is exact) and compares calendar-date to calendar-date. Both bounds
-- are INCLUSIVE — a single-day holiday is `window_start_date = window_end_date`.
--
-- ⚠ DO NOT REGENERATE THIS FILE with `db:generate` (same discipline as 0021–0081). The drizzle
-- snapshot baseline is frozen at 0020; a regenerate emits a bloated catch-up migration and drizzle-kit
-- skips an already-applied migration by journal `when` (NOT SQL hash), silently dropping the
-- hand-supplements + risking 42P07 on re-run. HAND-AUTHORED: carries ONLY this story's DDL (the one
-- CREATE TABLE + its two indexes + the two CREATE POLICY declarations from
-- packages/domain/src/policies/pariwar-holiday-calendar-rls.ts), wrapped with the hand-supplemented
-- GRANT + ENABLE/FORCE RLS (mirrors 0075). No enum, no FKs. The twt_app role already exists
-- (migration 0002). No snapshot file (baseline frozen at 0020; mirror 0021–0081).

CREATE TABLE "pariwar_holiday_calendar" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"pariwar_id" uuid NOT NULL,
	"holiday_label" text NOT NULL,
	"window_start_date" date NOT NULL,
	"window_end_date" date NOT NULL,
	"effective_year" integer NOT NULL,
	"created_by_actor" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"audit_id" uuid,
	CONSTRAINT "pariwar_holiday_calendar_window_ordered" CHECK ("pariwar_holiday_calendar"."window_end_date" >= "pariwar_holiday_calendar"."window_start_date"),
	CONSTRAINT "pariwar_holiday_calendar_effective_year_min" CHECK ("pariwar_holiday_calendar"."effective_year" >= 2000),
	CONSTRAINT "pariwar_holiday_calendar_effective_year_max" CHECK ("pariwar_holiday_calendar"."effective_year" <= 2100)
);
--> statement-breakpoint

-- The annual-curation read path: "every window this Pariwar observes in year Y".
CREATE INDEX "pariwar_holiday_calendar_pariwar_year_idx" ON "pariwar_holiday_calendar" USING btree ("pariwar_id","effective_year");--> statement-breakpoint
-- The tail-resolution read path: windows ordered by when they start, per tenant.
CREATE INDEX "pariwar_holiday_calendar_pariwar_start_idx" ON "pariwar_holiday_calendar" USING btree ("pariwar_id","window_start_date");--> statement-breakpoint

-- Trustee-curated + annually REPLACED → the full CRUD grant (see the header note on why DELETE is
-- present here and absent from the 0075 attestation table).
GRANT SELECT, INSERT, UPDATE, DELETE ON "pariwar_holiday_calendar" TO twt_app;--> statement-breakpoint

ALTER TABLE "pariwar_holiday_calendar" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "pariwar_holiday_calendar" FORCE ROW LEVEL SECURITY;--> statement-breakpoint

CREATE POLICY "pariwar_holiday_calendar_tenant_isolation_select" ON "pariwar_holiday_calendar" AS PERMISSIVE FOR SELECT TO "twt_app" USING (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "pariwar_holiday_calendar_tenant_isolation_write" ON "pariwar_holiday_calendar" AS PERMISSIVE FOR ALL TO "twt_app" USING (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid) WITH CHECK (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid);
