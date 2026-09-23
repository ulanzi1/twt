-- Migration 0120 — verifier_reason_code ADD VALUE 'post_death_nominee_change' (Story 6.20, Task 4; D14; AC4).
--
-- `2026-09-21-239` (Trustee-ratified): a nominee version dated on or after the certificate date is by itself
-- enough to raise SUSPICION; the District Admin — ⛔ never the system — may REFUSE the claim, NOTIFY the
-- Pariwar Admin with a note and reason, and the refusal is APPEALABLE ONCE.
-- ⭐ The refusal REUSES the shipped verifier denial (`district_admin` already holds `claim.approve`; a
-- `denied` decision already requires a rationale and is already appealable once through 6.16). This value is
-- the ONE addition: a DEDICATED code, ⛔ not `other`, because AC13's ground-inspection inheritance has to
-- RECOGNISE a `-239` refusal, and `other` + free text cannot be recognised. Valid for `denied` ONLY
-- (REASON_CODE_OUTCOME_COMPAT in claim/verifier-decision.ts + its contracts mirror, pinned by the lockstep test).
--
-- ⚠ ADD VALUE is its OWN migration file (the 0040 posture): a newly-added enum value cannot be USED in the
-- transaction that added it. `IF NOT EXISTS` makes it re-apply-safe. Hand-authored — ⛔ never regenerate.

ALTER TYPE "verifier_reason_code" ADD VALUE IF NOT EXISTS 'post_death_nominee_change';
