-- Migration 0135 — Story 6.19c's REMINDER PURPOSES (Task 1; AC6, AC14, AC17; `2026-10-01-273` §5, §6; `-274` 2).
-- Hand-authored; ⛔ 0128 / 0130 are applied and are ⛔ never edited — this replaces 0128's purpose CHECK and adds two
-- indexes.
--
-- ⭐ ONE VALUE PER REMINDER KIND (`-273` §6 — ⛔ never `staff_reminder` / `escalation`: their indexes and 6.19b's sweep
-- reads would collide):
--   · `closure_due`               — the District Admin, daily on the family run's days 90–96 while a closure request
--                                   could pass (`-232` I);
--   · `closure_escalation`        — the day-97 escalation to every Pariwar Admin (a record + a reminder, ⛔ a hold);
--   · `staff_case_escalation`     — a staff case at day 90 of its staff run, escalated to the Super Admin (`-273` §3a);
--   · `review_reminder`           — the Super Admin, every 30 days from the escalation date while held (`-273` §6);
--   · `direction_reminder`        — a directee, 7 days after the direction, then weekly, until they respond (D18);
--   · `closure_notice`            — the family's closure SMS, ONCE per closure per recipient (`-273` §5);
--   · `closure_letter_chase`      — the District Admin, for a closure letter owed (`-274` 2: from the closure date,
--                                   day 7, daily to day 12);
--   · `closure_letter_escalation` — then escalated to every Pariwar Admin (day 13 — a record + a reminder).
-- ⭐ THE ANCHOR (`-273` §6): every row still needs a `run_id` (NOT NULL, FK) and a `slot_day ≥ 0`. Before a closure
-- they key on the live return's LATEST run of any kind on the day they are due, `slot_day` = that run's day number on
-- that date (≥ 90 allowed) — a LABEL only, ⛔ never the cadence (the cadences count from the family run's day 90, the
-- escalation date, the direction's date, the closure date). The closure notice and the closure-letter rows key on the
-- closure's recorded `closure_notice_run_id`.
-- ⭐ `subject_key` (0128's header said "the chased PERSON for per-person staff items, else ''") now also carries
-- `direction:<direction_id>` on a directee's rows (two directions to one admin on one day ⛔ never collide — the class
-- 0130 fixed) and the person key on a closure-letter row; ⛔ never NULL.
-- ⚠ LOCKSTEP with `CORRECTION_REMINDER_PURPOSES` (schema/claim_correction_chase.ts) and the policy spec's purpose leg.
ALTER TABLE "claim_correction_reminders" DROP CONSTRAINT "claim_correction_reminders_purpose_check";--> statement-breakpoint
ALTER TABLE "claim_correction_reminders" ADD CONSTRAINT "claim_correction_reminders_purpose_check" CHECK ("purpose" IN ('family_sms', 'staff_reminder', 'staff_push', 'letter_chase', 'letter_second_due', 'replacement_reminder', 'escalation', 'closure_due', 'closure_escalation', 'staff_case_escalation', 'review_reminder', 'direction_reminder', 'closure_notice', 'closure_letter_chase', 'closure_letter_escalation'));--> statement-breakpoint
-- ⭐ The 6.19c staff reminders: ONE per (claim, recipient, subject, purpose, IST day), whichever run they key on.
CREATE UNIQUE INDEX "claim_correction_reminders_closure_day_uq" ON "claim_correction_reminders" USING btree ("claim_case_id", "recipient_key", "subject_key", "purpose", "sent_on") WHERE "purpose" IN ('closure_due', 'closure_escalation', 'staff_case_escalation', 'review_reminder', 'direction_reminder', 'closure_letter_chase', 'closure_letter_escalation');--> statement-breakpoint
-- ⭐ `-273` §5 — the closure notice ONCE per closure per recipient (a closure is terminal: at most one per claim), ⛔ per
-- day. An errored send is retried on the SAME row (`attempt_count`); a D30 failure is a final row, ⛔ retried.
CREATE UNIQUE INDEX "claim_correction_reminders_closure_notice_uq" ON "claim_correction_reminders" USING btree ("claim_case_id", "recipient_key") WHERE "purpose" = 'closure_notice';
