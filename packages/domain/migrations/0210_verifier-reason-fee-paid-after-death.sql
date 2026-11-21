-- Migration 0210 — verifier_reason_code ADD VALUE 'fee_paid_after_death' (Story 6.39, Task 1.1; DL9 (a); AC1, AC6).
--
-- `2026-10-31-430` Q1 B (Trustee-ratified): *"staff compare the date of death on the certificate with the date the
-- fee was paid, and ⛔ drive opens if the fee was paid after the death."* The membership check's approval conjunct
-- makes such a claim WAIT for good; staff END it with a dedicated deny reason on whichever denial its state allows.
-- This value is the P1 (District Admin) denial's — `verification_in_progress` / `verifier_review`. Valid for `denied`
-- ONLY (REASON_CODE_OUTCOME_COMPAT in claim/verifier-decision.ts + its contracts mirror, pinned by the lockstep
-- test), and accepted by the writers ONLY while the live membership check says `after_death` (author-commit
-- `2026-11-21-472` DL9).
--
-- ⚠ ADD VALUE is its OWN migration file (the 0040 / 0120 posture): a newly-added enum value cannot be USED in the
-- transaction that added it. `IF NOT EXISTS` makes it re-apply-safe. Hand-authored — ⛔ never regenerate.

ALTER TYPE "verifier_reason_code" ADD VALUE IF NOT EXISTS 'fee_paid_after_death';
