-- Migration 0146 — ground-inspection enum values for Story 6.26a (Task 1.1; GI4, GI12).
--
-- `2026-10-06-282` GI12 (the FQ13 / `-281` Q2 A certificate check): a new `ground_inspection_stage` value
-- `certificate_check` — an ordinary assignment whose completion needs only the original-certificate record and
-- the date printed on it; ⛔ never a visit (`claim/ground-inspection-approval.ts`).
-- `-282` GI4: when the family does ⛔ not produce the original certificate, the inspector records the existing
-- `evidence_unavailable` refusal with a NEW reason `original_certificate_not_produced` (its encrypted note stays
-- mandatory) — the claim then WAITS (`-263` FQ9).
--
-- ⚠ ADD VALUE is its OWN migration file (the 0040 / 0120 posture): a newly-added enum value cannot be USED in the
-- transaction that added it — and drizzle's migrator applies every pending file in ONE transaction, so 0147 never
-- names `'certificate_check'` as an enum literal (its CHECK compares `inspection_stage::text`). `IF NOT EXISTS`
-- makes it re-apply-safe. Hand-authored — ⛔ never regenerate.

ALTER TYPE "ground_inspection_stage" ADD VALUE IF NOT EXISTS 'certificate_check';--> statement-breakpoint
ALTER TYPE "ground_inspection_refusal_reason" ADD VALUE IF NOT EXISTS 'original_certificate_not_produced';
