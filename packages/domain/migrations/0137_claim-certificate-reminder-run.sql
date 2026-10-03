-- Migration 0137 — the certificate-reminder RUNS (Story 6.19d, Task 1; AC1, AC2; `2026-10-03-276` CR1–CR3 — an
-- author-commit that SUPERSEDES `-266` §1's two "6.19d adds its own kind" sentences; the days stay the Panel's:
-- `-250` #5 via `-259` cl.1, `-260` G5–G6, `-275` Q2–Q4).
--
-- ⭐ ITS OWN TABLE — ⛔ NEVER a kind on `claim_correction_runs` (0127). A certificate wait has ⛔ no trustee return, can
-- be live AT THE SAME TIME as a correction return (one open run per claim there would make them end each other), and
-- runs to day 180 (6.19b's sweep ends every run at day 90). ⛔ Nothing in 0126–0136 is touched.
-- ⭐ A run is ONE wait for a certificate: `cause` ∈ {`rejected` — the CURRENT certificate's live review rejected it;
-- `missing` — ⛔ no certificate by the time the claim is being checked (`-259` detail 3)}. A `rejected` run is anchored
-- on the rejected UPLOAD (+ the review that rejected it): a re-review of the SAME upload ⛔ never opens a second run
-- (one run per rejected upload), a rejection of a DIFFERENT upload is `-260` G5's new 180 days.
-- ⭐ AT MOST ONE OPEN RUN PER CLAIM; at most ONE `missing` run per claim, ever (uploads are append-only and the current
-- pointer moves forward only). `day0` is an IST calendar date (CR3). ⛔ Nothing is sent on day 0.
-- ⭐ `end_reason` ∈ {certificate_received, superseded, completed}. A PAUSE (the claim outside the review window, or the
-- anchor upload standing accepted on a re-review) is ⛔ not an end — ⛔ never written here (CR5).
-- Hand-authored; ⛔ no backfill. `twt_app` may UPDATE only `ended_at` / `end_reason` (column-level grant) — a run's
-- identity, cause, anchors and day 0 are ⛔ never rewritten (`-275` Q2: ⛔ never re-dated). ⛔ No DELETE.

CREATE TABLE "claim_certificate_reminder_runs" (
	"run_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"claim_case_id" uuid NOT NULL,
	"pariwar_id" uuid NOT NULL,
	"cause" text NOT NULL,
	"anchor_upload_id" uuid,
	"anchor_review_id" uuid,
	"day0" date NOT NULL,
	"opened_at" timestamp with time zone DEFAULT clock_timestamp() NOT NULL,
	"ended_at" timestamp with time zone,
	"end_reason" text
);--> statement-breakpoint
ALTER TABLE "claim_certificate_reminder_runs" ADD CONSTRAINT "claim_certificate_reminder_runs_claim_case_id_fk" FOREIGN KEY ("claim_case_id") REFERENCES "public"."claims"("claim_case_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "claim_certificate_reminder_runs" ADD CONSTRAINT "claim_certificate_reminder_runs_anchor_upload_id_fk" FOREIGN KEY ("anchor_upload_id") REFERENCES "public"."claim_death_certificate_uploads"("upload_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "claim_certificate_reminder_runs" ADD CONSTRAINT "claim_certificate_reminder_runs_anchor_review_id_fk" FOREIGN KEY ("anchor_review_id") REFERENCES "public"."claim_death_certificate_reviews"("review_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
-- ⚠ LOCKSTEP with `CERTIFICATE_RUN_CAUSES` / `CERTIFICATE_RUN_END_REASONS` (schema/claim_certificate_reminder.ts).
ALTER TABLE "claim_certificate_reminder_runs" ADD CONSTRAINT "claim_certificate_reminder_runs_cause_check" CHECK ("cause" IN ('rejected', 'missing'));--> statement-breakpoint
ALTER TABLE "claim_certificate_reminder_runs" ADD CONSTRAINT "claim_certificate_reminder_runs_end_reason_check" CHECK ("end_reason" IS NULL OR "end_reason" IN ('certificate_received', 'superseded', 'completed'));--> statement-breakpoint
-- An ended run has a reason, and an open one has none (0127's precedent).
ALTER TABLE "claim_certificate_reminder_runs" ADD CONSTRAINT "claim_certificate_reminder_runs_ended_pair_check" CHECK (("ended_at" IS NULL) = ("end_reason" IS NULL));--> statement-breakpoint
-- A `rejected` run carries BOTH anchors; a `missing` run carries NEITHER. (Silent on an unknown cause — the cause
-- CHECK names that one.)
ALTER TABLE "claim_certificate_reminder_runs" ADD CONSTRAINT "claim_certificate_reminder_runs_anchor_check" CHECK (
	("anchor_upload_id" IS NULL) = ("anchor_review_id" IS NULL)
	AND ("cause" = 'rejected') = ("anchor_upload_id" IS NOT NULL)
);--> statement-breakpoint
GRANT SELECT, INSERT ON "claim_certificate_reminder_runs" TO twt_app;--> statement-breakpoint
GRANT UPDATE ("ended_at", "end_reason") ON "claim_certificate_reminder_runs" TO twt_app;--> statement-breakpoint
ALTER TABLE "claim_certificate_reminder_runs" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "claim_certificate_reminder_runs" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "claim_certificate_reminder_runs_tenant_isolation_select" ON "claim_certificate_reminder_runs" AS PERMISSIVE FOR SELECT TO "twt_app" USING (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "claim_certificate_reminder_runs_tenant_isolation_insert" ON "claim_certificate_reminder_runs" AS PERMISSIVE FOR INSERT TO "twt_app" WITH CHECK (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "claim_certificate_reminder_runs_tenant_isolation_update" ON "claim_certificate_reminder_runs" AS PERMISSIVE FOR UPDATE TO "twt_app" USING (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid) WITH CHECK (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid);--> statement-breakpoint
-- ⭐ CR1 — at most ONE open run per claim.
CREATE UNIQUE INDEX "claim_certificate_reminder_runs_one_open_per_claim_uq" ON "claim_certificate_reminder_runs" USING btree ("claim_case_id") WHERE "ended_at" IS NULL;--> statement-breakpoint
-- ⭐ CR1 / Trap 4(b) — ONE run per rejected certificate (a re-review of the same upload ⛔ never restarts the 180 days).
CREATE UNIQUE INDEX "claim_certificate_reminder_runs_rejected_upload_uq" ON "claim_certificate_reminder_runs" USING btree ("claim_case_id", "anchor_upload_id") WHERE "cause" = 'rejected';--> statement-breakpoint
-- ⭐ CR2(b) — at most ONE `missing` run per claim, ever.
CREATE UNIQUE INDEX "claim_certificate_reminder_runs_missing_uq" ON "claim_certificate_reminder_runs" USING btree ("claim_case_id") WHERE "cause" = 'missing';--> statement-breakpoint
-- The daily sweep's cross-tenant keyset page over OPEN runs.
CREATE INDEX "claim_certificate_reminder_runs_open_idx" ON "claim_certificate_reminder_runs" USING btree ("run_id") WHERE "ended_at" IS NULL;--> statement-breakpoint
CREATE INDEX "claim_certificate_reminder_runs_pariwar_claim_idx" ON "claim_certificate_reminder_runs" USING btree ("pariwar_id", "claim_case_id");
