-- Migration 0186 — the `helpline` withdrawal actor (Story 11b.4a, Task 2.1; Decision 2026-10-27-412 §2 — MP6, author-commit).
--
-- The helpline operator's take-down at the nominee's request (`-392` item 4, Trustee-ratified, kept by `-395`; only the nominee
-- who sent it — `-395` item 3, `-411` item 1) withdraws every un-withdrawn version of the chain as `withdrawn_by = 'helpline'`.
--
-- ⚠ ADD VALUE is its OWN migration file (the 0040 / 0120 / 0146 / 0150 posture): a newly-added enum value cannot be USED in the
-- transaction that added it (55P04) — and drizzle's migrator applies every pending file in ONE transaction — so ⛔ nothing in
-- this file (nor any CHECK, index or default in a later file of the same run) names `'helpline'` as an enum literal; 0187's
-- CHECKs compare `withdrawn_by::text`. `IF NOT EXISTS` makes it re-apply-safe. Hand-authored — ⛔ never regenerate.

ALTER TYPE "memorial_withdrawal_actor" ADD VALUE IF NOT EXISTS 'helpline';
