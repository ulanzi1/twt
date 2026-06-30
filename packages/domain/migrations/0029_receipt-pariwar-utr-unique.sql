-- Migration 0029 — vyawastha_shulk_receipts UNIQUE (pariwar_id, utr) (Story 3.8, D2 patch).
--
-- Adds a UNIQUE constraint on (pariwar_id, utr) to enforce payment-integrity across the annual renewal
-- flow: the same bank UTR should never be accepted twice within the same Pariwar. Scoped to pariwar_id
-- (not global) because UPI UTRs are globally unique in practice, but a global constraint would break
-- integration tests that seed rows across multiple in-memory Pariwars with the same test UTR.
--
-- The receipt-write accessor `isReceiptPariwarUtrDuplicate` narrows the 23505 to exactly this
-- constraint name — so any other unique violation on the table is not silently swallowed.
--
-- ADDITIVE + NON-DESTRUCTIVE: no table/column/DDL change beyond the new constraint.
--
-- ⚠ DO NOT REGENERATE THIS FILE with `db:generate`.
-- drizzle-kit skips an already-applied migration by journal `when` (NOT by SQL hash), and the meta/
-- snapshots stop at 0020 (0021-0029 are hand-authored, snapshot-absent — known drift, NOT gate-blocking).
-- A `db:generate` would diff CURRENT schema against 0020_snapshot.json and wrongly re-emit applied
-- 0021-0028 → 42P07. This file is HAND-AUTHORED, mirroring the 0027-0028 cadence. No snapshot emitted.

ALTER TABLE "vyawastha_shulk_receipts" ADD CONSTRAINT "vyawastha_shulk_receipts_pariwar_utr_uq" UNIQUE ("pariwar_id","utr");
