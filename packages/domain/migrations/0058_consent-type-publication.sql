-- Migration 0058 — consent_type ADD VALUE 'sahyog_vivran_publication' + 'in_memoriam_listing'
-- (Story 6.9, Task 1; AC1, D2):
-- The two public-transparency consent types captured at claim-time (Story 6.9 — the FIRST writer, so it
-- OWNS the additive enum extension; superseding the tentative Story 2.7 Dev-Note assignment to "Epic 11b").
--   · sahyog_vivran_publication — contributor-list + verifier-name publication on the deceased's Sahyog
--     Vivran page (Epic 11b render-consumer gates on consentExists).
--   · in_memoriam_listing       — In Memoriam appearance (Epic 11b render-consumer).
-- The three claim-time DPDPA consents (claim_time_dpdpa already exists from Story 2.7 + these two) are the
-- canonical `consentExists(pariwarId, deceasedMemberId, <type>, at)` surfaces Epic 11b resolves at render time.
--
-- ⚠ ADD VALUE cannot run inside a transaction block on Postgres, AND a newly-added enum value cannot be USED
-- in the same transaction it was added. So this is its OWN migration file, separate from any migration that
-- inserts a row with these values (none do — consent rows are written at RUNTIME by the 6.9 routes, well
-- after this DDL has committed). `IF NOT EXISTS` makes each ADD VALUE idempotent (re-apply-safe).
--
-- ⚠ DO NOT REGENERATE THIS FILE with `db:generate` (drizzle journal `when`, not SQL hash → skips; snapshots
-- stop at 0020). Hand-authored, mirroring 0040/0048. DO NOT reset via DROP SCHEMA (strips twt_app USAGE).

ALTER TYPE "consent_type" ADD VALUE IF NOT EXISTS 'sahyog_vivran_publication';
ALTER TYPE "consent_type" ADD VALUE IF NOT EXISTS 'in_memoriam_listing';
