-- Migration 0203 — the field-worker ending reason `died` (Story 13.1c, Task 2.0; AD11, TR12; decision `2026-11-07-455`, carrying
-- out the Panel's `2026-11-07-454` Q5 A: a death is recorded "by the District Admin or the Pariwar Admin on what they have been
-- told (by the family, a colleague or the community), with the date of death").
--
-- ⚠ ADD VALUE is its OWN migration file (the 0146 posture): a newly-added enum value cannot be USED in the transaction that added
-- it — and drizzle's migrator applies every pending file in ONE transaction, so 0204 ⛔ names `'died'` as an enum literal (its
-- CHECK compares `state_reason_code::text`). ⛔ `BEFORE` / `AFTER`: the value APPENDS, so `FIELD_WORKER_REASON_CODES` carries it
-- LAST (the policy-regression spec pins the labels in `enumsortorder`). `IF NOT EXISTS` makes it re-apply-safe.
-- Hand-authored — ⛔ never regenerate.

ALTER TYPE "field_worker_reason_code" ADD VALUE IF NOT EXISTS 'died';
