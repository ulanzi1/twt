-- Migration 0141 — pins `outcome` to `purpose` on `claim_certificate_reminders` (code review, 2026-10-03). ⛔ 0138 is
-- applied and is ⛔ never edited — this ADDS a constraint 0138 should have had from the start.
--
-- ⭐ Before this, nothing at the DB level stopped a `family_sms` row from carrying `recorded` (reserved for the two
-- staff purposes) or a staff row from carrying a family-only outcome — the pairing lived only in application code
-- (`insertFinalCertificateReminder`'s own doc comment: "a staff row (`recorded` / `no_target`), a `no_target` family
-- row, a `skipped_superseded` marker, or the final `error` of a hash that never cleared" — never `recorded` on
-- `family_sms`, never `attempting`/`accepted`/`rejected_invalid_number`/`rejected_unreachable`/`error`/
-- `skipped_superseded` on a staff purpose). Traced every call site in `certificate-reminder-record.ts` and
-- `apps/jobs/src/scheduler/claim-certificate-reminders.ts`; this is the exhaustive mapping actually produced.
ALTER TABLE "claim_certificate_reminders" ADD CONSTRAINT "claim_certificate_reminders_purpose_outcome_check" CHECK (
	("purpose" = 'family_sms' AND "outcome" IN ('attempting', 'accepted', 'rejected_invalid_number', 'rejected_unreachable', 'no_target', 'error', 'skipped_superseded'))
	OR ("purpose" IN ('letter_chase', 'letter_escalation') AND "outcome" IN ('recorded', 'no_target'))
);
