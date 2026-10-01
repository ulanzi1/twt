-- Migration 0136 — the District Admin's "NO CORRECTION NEEDED" record (Story 6.19c, Task 8; AC17; the shared spec's
-- D27; `2026-09-27-258` cl.3 / detail 1, `2026-09-27-260` G2).
--
-- ⭐ A RECORD, ⛔ a decision: the District Admin (key (8)) records, with a REQUIRED note, that the return needs no
-- correction. Recording it sets the return's mark to `staff` (`mark_id` — the mark written in the SAME transaction,
-- through 6.19b's mark writer), so the family is ⛔ chased meanwhile, and puts the claim before the Pariwar Admin, who
-- APPROVES (a NEW writer — the FULL gate, ⛔ nothing waived) or KEEPS it sent back (`-260` G2 — a mark write with a
-- note). It takes effect only with a CURRENT, PASSING name check recorded AFTER it (`recorded_at`).
-- ⭐ A record is LIVE only while its own mark is the return's LATEST mark — a keep, or any later mark change, supersedes
-- it (derived, ⛔ written: ⛔ no `superseded_at` column to forget). Allowed while the claim is held (`-273` §4 — a
-- record, ⛔ a decision).
-- ⚠ Not in Task 1's table list (the developer's call, recorded in the story's Completion Notes): D27 names a
-- "record" its approve writer must read; a mark row alone cannot tell "no correction needed" from any other `staff`
-- switch.
-- PII: the note is Tier-1 ciphertext. ⛔ No RTBF path reaches it (invariant 9 — recorded, ⛔ not fixed).
-- `twt_app`: SELECT / INSERT. ⛔ No UPDATE, ⛔ no DELETE — append-only (as the marks).

CREATE TABLE "claim_correction_no_correction_records" (
	"record_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"claim_case_id" uuid NOT NULL,
	"pariwar_id" uuid NOT NULL,
	"return_decision_id" uuid NOT NULL,
	"mark_id" uuid NOT NULL,
	"note_ciphertext" text NOT NULL,
	"recorded_by_actor" text NOT NULL,
	"recorded_by_display" text NOT NULL,
	"recorded_at" timestamp with time zone DEFAULT clock_timestamp() NOT NULL
);--> statement-breakpoint
ALTER TABLE "claim_correction_no_correction_records" ADD CONSTRAINT "claim_correction_no_correction_records_claim_case_id_fk" FOREIGN KEY ("claim_case_id") REFERENCES "public"."claims"("claim_case_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "claim_correction_no_correction_records" ADD CONSTRAINT "claim_correction_no_correction_records_return_decision_id_fk" FOREIGN KEY ("return_decision_id") REFERENCES "public"."claim_state_trustee_decisions"("decision_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "claim_correction_no_correction_records" ADD CONSTRAINT "claim_correction_no_correction_records_mark_id_fk" FOREIGN KEY ("mark_id") REFERENCES "public"."claim_correction_marks"("mark_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "claim_correction_no_correction_records" ADD CONSTRAINT "claim_correction_no_correction_records_recorded_by_check" CHECK (length(btrim("recorded_by_actor")) > 0 AND length(btrim("recorded_by_display")) > 0);--> statement-breakpoint
GRANT SELECT, INSERT ON "claim_correction_no_correction_records" TO twt_app;--> statement-breakpoint
ALTER TABLE "claim_correction_no_correction_records" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "claim_correction_no_correction_records" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "claim_correction_no_correction_records_tenant_isolation_select" ON "claim_correction_no_correction_records" AS PERMISSIVE FOR SELECT TO "twt_app" USING (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "claim_correction_no_correction_records_tenant_isolation_insert" ON "claim_correction_no_correction_records" AS PERMISSIVE FOR INSERT TO "twt_app" WITH CHECK (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid);--> statement-breakpoint
-- ONE record per mark (the record IS that mark's reason).
CREATE UNIQUE INDEX "claim_correction_no_correction_records_mark_uq" ON "claim_correction_no_correction_records" USING btree ("mark_id");--> statement-breakpoint
CREATE INDEX "claim_correction_no_correction_records_return_idx" ON "claim_correction_no_correction_records" USING btree ("return_decision_id", "recorded_at");--> statement-breakpoint
CREATE INDEX "claim_correction_no_correction_records_pariwar_claim_idx" ON "claim_correction_no_correction_records" USING btree ("pariwar_id", "claim_case_id");
