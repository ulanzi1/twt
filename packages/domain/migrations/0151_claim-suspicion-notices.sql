-- Migration 0151 — the SUSPICION NOTICE record (Story 6.24b, Task 1; AC7b; `2026-10-07-292` RF11 / RF12, `2026-10-07-293`
-- item 1 B, `2026-10-08-295` RB2 / RB3). Hand-authored — ⛔ never regenerate (`db:generate` diffs against the 0020 snapshot).
--
-- ⭐ WHAT IT IS. ONE row per (claim, purpose), EVER — the once-ever texts of a `-239` suspicion refusal:
--   · `suspicion_refusal`     — FQ7 B: the nominee in place at the death is told a claim could not go ahead;
--   · `closed_after_appeal`   — `-291` Q2 B: her claim was closed by an allowed appeal;
--   · `refusal_appeal_notice` — `-293` item 1 B: the refused person is told until when the refusal can be appealed.
-- The vocabulary is 0138's (RB2 — invent ⛔ none): `outcome` (the same eight values; `recorded` stays unused here), the
-- per-attempt columns, `attempting_claimed_check`, the `attempting_idx` partial index. ⛔ No `run_id` / `slot_day` /
-- `sent_on` / `recipient_key` / `subject_key` / `late` / `delivered_at` — a once-ever notice has ⛔ no slot.
-- ⭐ THE DEDUP IS THIS TABLE — UNIQUE `(pariwar_id, claim_case_id, purpose)` + the insert under the claim-row lock (a
-- pg-boss `singletonKey` is a label only). A row left `attempting` by a crash is RECLAIMED by the next sweep (the
-- selector is "⛔ no FINISHED row") and given up only after three IST days (RB3) — ⛔ never stranded.
-- ⚠ `recipient_number_hash` is a KEYED HASH (`blindIndex`). ⛔ No number and ⛔ no name is ever stored here.
-- `twt_app`: SELECT / INSERT / UPDATE (the compare-and-set `attempting` → final, column-narrowed). ⛔ No DELETE.

CREATE TABLE "claim_suspicion_notices" (
	"notice_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"pariwar_id" uuid NOT NULL,
	"claim_case_id" uuid NOT NULL,
	"purpose" text NOT NULL,
	"outcome" text NOT NULL,
	"recipient_version_id" uuid,
	"recipient_number_hash" text,
	"provider_message_id" text,
	"detail" text,
	"first_detail" text,
	"attempt_count" integer DEFAULT 1 NOT NULL,
	"claimed_at" timestamp with time zone,
	"claimed_by_job" text,
	"created_at" timestamp with time zone DEFAULT clock_timestamp() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT clock_timestamp() NOT NULL
);--> statement-breakpoint
-- The composite FK (0143's form; target `claims_pariwar_claim_case_uq`) — a notice can ⛔ never name another Pariwar's claim.
ALTER TABLE "claim_suspicion_notices" ADD CONSTRAINT "claim_suspicion_notices_claim_case_fk" FOREIGN KEY ("pariwar_id", "claim_case_id") REFERENCES "public"."claims"("pariwar_id", "claim_case_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "claim_suspicion_notices" ADD CONSTRAINT "claim_suspicion_notices_recipient_version_id_fk" FOREIGN KEY ("recipient_version_id") REFERENCES "public"."member_nominee_versions"("version_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
-- ⚠ LOCKSTEP with `SUSPICION_NOTICE_PURPOSES` / `SUSPICION_NOTICE_OUTCOMES` (schema/claim_suspicion_notices.ts).
ALTER TABLE "claim_suspicion_notices" ADD CONSTRAINT "claim_suspicion_notices_purpose_check" CHECK ("purpose" IN ('suspicion_refusal', 'closed_after_appeal', 'refusal_appeal_notice'));--> statement-breakpoint
ALTER TABLE "claim_suspicion_notices" ADD CONSTRAINT "claim_suspicion_notices_outcome_check" CHECK ("outcome" IN ('attempting', 'accepted', 'rejected_invalid_number', 'rejected_unreachable', 'no_target', 'error', 'skipped_superseded', 'recorded'));--> statement-breakpoint
ALTER TABLE "claim_suspicion_notices" ADD CONSTRAINT "claim_suspicion_notices_attempt_count_check" CHECK ("attempt_count" >= 1);--> statement-breakpoint
-- An in-flight row always says WHEN it was claimed (the lease and the finaliser read it).
ALTER TABLE "claim_suspicion_notices" ADD CONSTRAINT "claim_suspicion_notices_attempting_claimed_check" CHECK ("outcome" <> 'attempting' OR "claimed_at" IS NOT NULL);--> statement-breakpoint
GRANT SELECT, INSERT ON "claim_suspicion_notices" TO twt_app;--> statement-breakpoint
-- ⚠ Column-narrowed (0138's precedent): the notice's IDENTITY (`pariwar_id`, `claim_case_id`, `purpose`) and `created_at`
-- are ⛔ never rewritten.
GRANT UPDATE ("outcome", "provider_message_id", "detail", "first_detail", "recipient_version_id", "recipient_number_hash", "attempt_count", "claimed_at", "claimed_by_job", "updated_at") ON "claim_suspicion_notices" TO twt_app;--> statement-breakpoint
ALTER TABLE "claim_suspicion_notices" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "claim_suspicion_notices" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "claim_suspicion_notices_tenant_isolation_select" ON "claim_suspicion_notices" AS PERMISSIVE FOR SELECT TO "twt_app" USING (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "claim_suspicion_notices_tenant_isolation_insert" ON "claim_suspicion_notices" AS PERMISSIVE FOR INSERT TO "twt_app" WITH CHECK (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "claim_suspicion_notices_tenant_isolation_update" ON "claim_suspicion_notices" AS PERMISSIVE FOR UPDATE TO "twt_app" USING (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid) WITH CHECK (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid);--> statement-breakpoint
-- ⭐ THE dedup key — ONCE per claim per purpose, EVER (RF11).
CREATE UNIQUE INDEX "claim_suspicion_notices_claim_purpose_uq" ON "claim_suspicion_notices" USING btree ("pariwar_id", "claim_case_id", "purpose");--> statement-breakpoint
-- The exhausted-row finaliser's cross-tenant scan.
CREATE INDEX "claim_suspicion_notices_attempting_idx" ON "claim_suspicion_notices" USING btree ("claimed_at") WHERE "outcome" = 'attempting';
