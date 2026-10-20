-- Migration 0175 — tie a claim WhatsApp send row to its OWN ladder's tenant, claim and chase (Story 6.37d code review round 2, P11,
-- 2026-10-20; Decision 2026-10-20-369 decision 6 takes this number). Hand-authored — ⛔ never regenerate (`db:generate` diffs
-- against the 0020 snapshot; the migrator skips by the journal `when`). ⛔ DROP SCHEMA. A FORWARD migration — ⛔ an edit of 0172
-- (applied — [[project_live_db_test_gotchas]]).
--
-- (1) 0172 tied `claim_contact_wa_sends.ladder_id` and `.claim_case_id` by single-column FKs only, so the database could not stop a
-- send row whose `pariwar_id`, `claim_case_id` or `chase` disagrees with its ladder's (FK checks bypass RLS). 6.31's shape (0171)
-- uses composite OWNER FKs. A UNIQUE on the ladder's `(pariwar_id, ladder_id, claim_case_id, chase)` (trivially true —
-- `ladder_id` is the key) is the referenced key; the composite FK `claim_contact_wa_sends_ladder_owner_fk` cascades like 0172's.
-- 0172's single-column FKs STAY (the policy-regression spec names them; they are subsumed, ⛔ contradicted).
--
-- (2) The isolation lookup (`hasRecentClaimContactWaSendTo`) filters on `updated_at` since review R5; 0172's recipient index ended
-- in `created_at`. It is rebuilt on `updated_at`.
--
-- ⚠ Checked BEFORE this file: every existing send row was written by `beginContactLadderWhatsapp` from its ladder's own columns, so
-- ⛔ row can violate the composite FK.

ALTER TABLE "claim_contact_ladders" ADD CONSTRAINT "claim_contact_ladders_owner_uq" UNIQUE ("pariwar_id", "ladder_id", "claim_case_id", "chase");--> statement-breakpoint
ALTER TABLE "claim_contact_wa_sends" ADD CONSTRAINT "claim_contact_wa_sends_ladder_owner_fk" FOREIGN KEY ("pariwar_id", "ladder_id", "claim_case_id", "chase") REFERENCES "public"."claim_contact_ladders"("pariwar_id", "ladder_id", "claim_case_id", "chase") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
DROP INDEX "claim_contact_wa_sends_recipient_idx";--> statement-breakpoint
CREATE INDEX "claim_contact_wa_sends_recipient_idx" ON "claim_contact_wa_sends" USING btree ("pariwar_id", "recipient_number_hash", "updated_at");
