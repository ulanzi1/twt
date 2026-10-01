-- Migration 0130 — the letter-chase DAY KEY gains `purpose` (Story 6.19b, third-pass code review). Hand-authored;
-- ⛔ 0128 is applied and is ⛔ never edited — this replaces its index.
--
-- ⚠ THE DEFECT. 0128's `claim_correction_reminders_letter_chase_day_uq` keyed ONE row per
-- `(claim_case_id, recipient_key, subject_key, sent_on)` across the three per-person staff purposes
-- (`letter_chase`, `letter_second_due`, `escalation`). Two DIFFERENT purposes can legitimately land on the same staff
-- recipient, for the same chased person, on the same IST day: a District Admin who is also a Pariwar Admin gets the
-- letter chase AND its +13 escalation on a catch-up day, and two `staff:unassigned` rows (⛔ no shepherd, ⛔ no Pariwar
-- Admin) collide the same way. `ON CONFLICT DO NOTHING` then SILENTLY dropped the second — the escalation vanished.
-- ⭐ THE FIX. `purpose` joins the key: the D34 intent (a same-day mark-switch supersession must ⛔ not double the SAME
-- item for the SAME person) is kept — a second run keyed on the same day still collides on its own purpose — while
-- different purposes no longer swallow each other. Same partial WHERE.
-- ⚠ LOCKSTEP with `claimCorrectionReminders` (schema/claim_correction_chase.ts).
DROP INDEX IF EXISTS "claim_correction_reminders_letter_chase_day_uq";--> statement-breakpoint
CREATE UNIQUE INDEX "claim_correction_reminders_letter_chase_day_uq" ON "claim_correction_reminders" USING btree ("claim_case_id", "recipient_key", "subject_key", "purpose", "sent_on") WHERE "purpose" IN ('letter_chase', 'letter_second_due', 'escalation');
