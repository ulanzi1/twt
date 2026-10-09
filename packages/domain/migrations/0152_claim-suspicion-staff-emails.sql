-- Migration 0152 — the STAFF EMAIL record of a `-239` suspicion refusal (Story 6.25, Task 1; AC8; `2026-10-09-299` RE2, RE4,
-- RE5, RE5-bis, RE11). Hand-authored — ⛔ never regenerate (`db:generate` diffs against the 0020 snapshot).
--
-- ⭐ WHAT IT IS. ONE row per (claim, recipient), EVER — `-262` FQ3 A's email to every Pariwar Admin of the claim's Pariwar
-- (*"a claim was refused on suspicion of a nominee change — open the list"*, ⛔ no names, ⛔ no note). A claim with ⛔ eligible
-- admin gets ONE claim-level `no_target` row (`recipient_user_id` NULL, RE4). ⛔ A fourth purpose on 0151: its UNIQUE is per
-- (claim, purpose) and its recipient columns are nominee / SMS-shaped.
-- ⭐ THE DEDUP IS THIS TABLE — UNIQUE NULLS NOT DISTINCT `(pariwar_id, claim_case_id, recipient_user_id)` (a plain UNIQUE would
-- admit unlimited NULL-recipient rows) + the insert under the claim-row lock (a pg-boss `singletonKey` is a label only). A row
-- left `attempting` by a crash is re-claimed by the next sweep past the 30-minute lease and given up after three IST days.
-- ⭐ A NEW, email-shaped outcome set (RE5 — ⛔ 0138's SMS words). `detail` / `first_detail` hold ONLY a fixed vocabulary (built by
-- `suspicionStaffEmailDetail`), ⛔ ever provider message text — SES error messages LIST addresses.
-- ⚠ ⛔ No address and ⛔ no name is ever stored here — the recipient is a `user_id`.
-- `twt_app`: SELECT + column-narrowed INSERT and UPDATE (exactly the columns the writers set). ⛔ No DELETE.
-- 6.24b round 3's deferred 0151 items (the `attempting` CHECK without `claimed_by_job`, `GRANT INSERT` not column-narrowed,
-- the partial index on `claimed_at` only) are each ⛔ repeated here; they stay OPEN for 0151 (⛔ touched).

CREATE TABLE "claim_suspicion_staff_emails" (
	"notice_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"pariwar_id" uuid NOT NULL,
	"claim_case_id" uuid NOT NULL,
	"recipient_user_id" uuid,
	"outcome" text NOT NULL,
	"provider_message_id" text,
	"detail" text,
	"first_detail" text,
	"attempt_count" integer DEFAULT 1 NOT NULL,
	"may_have_sent" boolean DEFAULT false NOT NULL,
	"claimed_at" timestamp with time zone,
	"claimed_by_job" text,
	"created_at" timestamp with time zone DEFAULT clock_timestamp() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT clock_timestamp() NOT NULL
);--> statement-breakpoint
-- The composite FK (0143 / 0151's form) — a row can ⛔ never name another Pariwar's claim.
ALTER TABLE "claim_suspicion_staff_emails" ADD CONSTRAINT "claim_suspicion_staff_emails_claim_case_fk" FOREIGN KEY ("pariwar_id", "claim_case_id") REFERENCES "public"."claims"("pariwar_id", "claim_case_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
-- ⛔ No cascade: `users` rows are never deleted in production (F6).
ALTER TABLE "claim_suspicion_staff_emails" ADD CONSTRAINT "claim_suspicion_staff_emails_recipient_user_fk" FOREIGN KEY ("recipient_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
-- ⚠ LOCKSTEP with `SUSPICION_STAFF_EMAIL_OUTCOMES` (schema/claim_suspicion_staff_emails.ts).
ALTER TABLE "claim_suspicion_staff_emails" ADD CONSTRAINT "claim_suspicion_staff_emails_outcome_check" CHECK ("outcome" IN ('attempting', 'accepted', 'rejected', 'no_target', 'error'));--> statement-breakpoint
-- RE4 / RE5 — the claim-level row is the ONLY `no_target`, and a recipient row can ⛔ never finish `no_target` (a missing
-- address after `begun` is an `error`).
ALTER TABLE "claim_suspicion_staff_emails" ADD CONSTRAINT "claim_suspicion_staff_emails_no_target_recipient_check" CHECK (("recipient_user_id" IS NULL) = ("outcome" = 'no_target'));--> statement-breakpoint
ALTER TABLE "claim_suspicion_staff_emails" ADD CONSTRAINT "claim_suspicion_staff_emails_attempt_count_check" CHECK ("attempt_count" >= 1);--> statement-breakpoint
-- An in-flight row always says WHEN and BY WHOM it was claimed (the lease, the compare-and-set and the give-up read both).
ALTER TABLE "claim_suspicion_staff_emails" ADD CONSTRAINT "claim_suspicion_staff_emails_attempting_claimed_check" CHECK ("outcome" <> 'attempting' OR ("claimed_at" IS NOT NULL AND "claimed_by_job" IS NOT NULL));--> statement-breakpoint
ALTER TABLE "claim_suspicion_staff_emails" ADD CONSTRAINT "claim_suspicion_staff_emails_detail_length_check" CHECK ("detail" IS NULL OR char_length("detail") <= 200);--> statement-breakpoint
ALTER TABLE "claim_suspicion_staff_emails" ADD CONSTRAINT "claim_suspicion_staff_emails_first_detail_length_check" CHECK ("first_detail" IS NULL OR char_length("first_detail") <= 200);--> statement-breakpoint
-- ⭐ THE dedup key — ONCE per (claim, recipient) EVER, the NULL recipient included (RE2, RE4). ⚠ The keyword PRECEDES the
-- column list (`0087_feature-flags.sql`).
ALTER TABLE "claim_suspicion_staff_emails" ADD CONSTRAINT "claim_suspicion_staff_emails_claim_recipient_uq" UNIQUE NULLS NOT DISTINCT ("pariwar_id", "claim_case_id", "recipient_user_id");--> statement-breakpoint
-- The give-up's cross-tenant scan keys on BOTH instants (created three IST days ago AND claimed before the lease).
CREATE INDEX "claim_suspicion_staff_emails_attempting_idx" ON "claim_suspicion_staff_emails" USING btree ("created_at", "claimed_at") WHERE "outcome" = 'attempting';--> statement-breakpoint
GRANT SELECT ON "claim_suspicion_staff_emails" TO twt_app;--> statement-breakpoint
-- ⚠ Column-narrowed INSERT: exactly what `beginSuspicionStaffEmail` writes (the `attempting` claim, or the fresh `no_target` row).
-- `notice_id`, `attempt_count`, `may_have_sent`, `created_at` and `updated_at` take their DEFAULTS on insert.
GRANT INSERT ("pariwar_id", "claim_case_id", "recipient_user_id", "outcome", "detail", "claimed_at", "claimed_by_job") ON "claim_suspicion_staff_emails" TO twt_app;--> statement-breakpoint
-- ⚠ Column-narrowed UPDATE: the row's IDENTITY (`notice_id`, `pariwar_id`, `claim_case_id`, `recipient_user_id`) and
-- `created_at` are ⛔ never rewritten.
GRANT UPDATE ("outcome", "provider_message_id", "detail", "first_detail", "attempt_count", "may_have_sent", "claimed_at", "claimed_by_job", "updated_at") ON "claim_suspicion_staff_emails" TO twt_app;--> statement-breakpoint
ALTER TABLE "claim_suspicion_staff_emails" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "claim_suspicion_staff_emails" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "claim_suspicion_staff_emails_tenant_isolation_select" ON "claim_suspicion_staff_emails" AS PERMISSIVE FOR SELECT TO "twt_app" USING (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "claim_suspicion_staff_emails_tenant_isolation_insert" ON "claim_suspicion_staff_emails" AS PERMISSIVE FOR INSERT TO "twt_app" WITH CHECK (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "claim_suspicion_staff_emails_tenant_isolation_update" ON "claim_suspicion_staff_emails" AS PERMISSIVE FOR UPDATE TO "twt_app" USING (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid) WITH CHECK (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid);
