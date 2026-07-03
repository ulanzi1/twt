-- Migration 0034 — RTBF anonymization UPDATE grants (Story 3.12, Task 2; AC1):
--   RTBF field-level anonymization (member/anonymize.ts) must OVERWRITE the Tier-1 PII ciphertext of
--   EVERY member-PII table with a fixed anonymized sentinel (or NULL the nullables). Two of those
--   tables — member_addresses + member_medical_disclosures — are APPEND-ONLY immutable history and were
--   granted SELECT, INSERT ONLY (0030 / 0026): no UPDATE. So a plain UPDATE from the anonymizer is
--   permission-denied on those two.
--
--   This migration adds a NARROW, COLUMN-LEVEL UPDATE grant on EXACTLY the PII ciphertext columns of
--   those two tables (not a blanket table UPDATE) — the smallest deviation-from-append-only that lets
--   RTBF overwrite the ciphertext while keeping the rest of each row immutable. This mirrors the
--   member_withdrawals deviation-from-append-only precedent (0032 granted UPDATE for the aadhaar_hmac
--   seam + RTBF). The tenant-isolation write policy on both tables is already `FOR ALL` (USING +
--   WITH CHECK on pariwar_id), so RLS already permits the UPDATE — only the table GRANT blocked it.
--
--   The other member-PII tables ALREADY permit UPDATE and need NO change here (audited in Task 2):
--     · member_kyc_profiles  — GRANT SELECT, INSERT, UPDATE, DELETE (0024; latest-wins upsert).
--     · member_nominees      — GRANT SELECT, INSERT, UPDATE, DELETE (0025; latest-wins re-declare).
--     · member_identities    — GRANT SELECT, INSERT, UPDATE, DELETE (0019; latest-wins upsert).
--     · member_withdrawals   — GRANT SELECT, INSERT, UPDATE          (0032; seam-backfill deviation).
--
-- ⚠ DO NOT REGENERATE THIS FILE with `db:generate`.
-- drizzle-kit skips an already-applied migration by journal `when` (NOT by SQL hash), and the meta/
-- snapshots stop at 0020 (0021-0034 are hand-authored, snapshot-absent — known drift, NOT gate-
-- blocking; `drizzle-kit check` tolerates it). A `db:generate` now would diff CURRENT schema against
-- 0020_snapshot.json and wrongly re-emit applied 0021-0033 → 42P07. So this file is HAND-AUTHORED.
-- No new table / column / policy — a pure GRANT supplement. Roles (twt_app) exist from 0002.

-- ── member_addresses — narrow UPDATE grant on the Tier-1 PII column (RTBF overwrite; deviation from
--    the 0030 append-only SELECT/INSERT-only grant). The FOR ALL tenant-isolation write policy already
--    permits UPDATE at the RLS level. ────────────────────────────────────────────────────────────────
GRANT UPDATE ("address_line_ciphertext") ON "member_addresses" TO twt_app;--> statement-breakpoint

-- ── member_medical_disclosures — narrow UPDATE grant on the two Tier-1 PII columns (RTBF overwrite;
--    deviation from the 0026 append-only SELECT/INSERT-only grant). ─────────────────────────────────
GRANT UPDATE ("disclosed_conditions_ciphertext", "additional_context_ciphertext") ON "member_medical_disclosures" TO twt_app;
