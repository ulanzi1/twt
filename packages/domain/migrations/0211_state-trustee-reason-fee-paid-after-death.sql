-- Migration 0211 — state_trustee_reason_code ADD VALUE 'fee_paid_after_death' (Story 6.39, Task 1.1; DL9 (b); AC1, AC6).
--
-- The SECOND of the two deny vocabularies (TR14): after P1 the District Admin can no longer deny — the denial is the
-- final vote's (`voteOnFrozenClaim`, states `verifier_approved` / `reversed` / `state_trustee_freeze`). A certificate
-- can be re-reviewed there, so a re-check can turn `after_death` after P1, and a `reversed` claim never passes P1 again.
-- Without this value such a claim would have ⛔ way to be ended. Accepted on the final-vote DENY only, and only while
-- the live membership check says `after_death` (author-commit `2026-11-21-472` DL9).
--
-- ⚠ ADD VALUE is its OWN migration file (the 0040 / 0120 posture). `IF NOT EXISTS` makes it re-apply-safe.
-- Hand-authored — ⛔ never regenerate.

ALTER TYPE "state_trustee_reason_code" ADD VALUE IF NOT EXISTS 'fee_paid_after_death';
