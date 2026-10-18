-- Migration 0170 — the delivery ladder's DB backstops catch up (Story 6.37c, code review round 2, 2026-10-18; P9, P31).
-- Hand-authored — ⛔ never regenerate (`db:generate` diffs against the 0020 snapshot; the migrator skips by the journal `when`).
-- A FORWARD migration, ⛔ an edit of 0169: 0169 was APPLIED to :5433 (hash `b88e8cb8…`) before review round 1 edited it in
-- place — round 2 restored 0169 byte-for-byte as applied and carries round 1's two CHECKs here ([[project_live_db_test_gotchas]]).
--
-- ⭐ (a) `sms<N>_row_id` is REQUIRED once the step is `sent` (the row the attempt landed on), ⛔ while `pending` or a skip; a
-- `satisfied` step may carry ⛔ one or ONE (LD4's later backfill — `settleSatisfiedContactLadderStep`). Round 1's P3, moved here.
-- ⭐ (b) A CONCLUDED ladder has resolved both steps — `concludeContactLadder`'s CAS (`sms3_state <> 'pending'`, round 1's P10)
-- mirrored (family 5); with 0169's step-order CHECK, sms3 resolved implies sms2 resolved — both are stated for the reader.
-- ⭐ (c) A call's `ladder_id` is `ON DELETE SET NULL`, ⛔ cascade: a call recorded `reached` is the one new source of reach (I1),
-- and the fact outlives the ladder it was attributed to.
-- Idempotent: every constraint is dropped IF EXISTS and re-added (on :5433 the two row-id CHECKs were added by hand before this
-- migration existed). The ADD CONSTRAINTs validate existing rows and fail LOUDLY (the migration rolls back) if one violates.
ALTER TABLE "claim_contact_ladders" DROP CONSTRAINT IF EXISTS "claim_contact_ladders_sms2_row_id_check";--> statement-breakpoint
ALTER TABLE "claim_contact_ladders" ADD CONSTRAINT "claim_contact_ladders_sms2_row_id_check" CHECK (
  CASE "sms2_state"
    WHEN 'sent' THEN "sms2_row_id" IS NOT NULL
    WHEN 'satisfied' THEN true
    ELSE "sms2_row_id" IS NULL
  END
);--> statement-breakpoint
ALTER TABLE "claim_contact_ladders" DROP CONSTRAINT IF EXISTS "claim_contact_ladders_sms3_row_id_check";--> statement-breakpoint
ALTER TABLE "claim_contact_ladders" ADD CONSTRAINT "claim_contact_ladders_sms3_row_id_check" CHECK (
  CASE "sms3_state"
    WHEN 'sent' THEN "sms3_row_id" IS NOT NULL
    WHEN 'satisfied' THEN true
    ELSE "sms3_row_id" IS NULL
  END
);--> statement-breakpoint
ALTER TABLE "claim_contact_ladders" DROP CONSTRAINT IF EXISTS "claim_contact_ladders_concluded_steps_check";--> statement-breakpoint
ALTER TABLE "claim_contact_ladders" ADD CONSTRAINT "claim_contact_ladders_concluded_steps_check" CHECK ("state" <> 'concluded_undelivered' OR ("sms2_state" <> 'pending' AND "sms3_state" <> 'pending'));--> statement-breakpoint
ALTER TABLE "claim_contact_calls" DROP CONSTRAINT IF EXISTS "claim_contact_calls_ladder_id_fk";--> statement-breakpoint
ALTER TABLE "claim_contact_calls" ADD CONSTRAINT "claim_contact_calls_ladder_id_fk" FOREIGN KEY ("ladder_id") REFERENCES "public"."claim_contact_ladders"("ladder_id") ON DELETE set null ON UPDATE no action;
