-- Migration 0040 — consent_type ADD VALUE 'whatsapp_opt_in' (Story 5.4, Task 1; AC4):
-- The Epic-5 additive consent type named in the consent_records schema header. Recorded on the member WA
-- opt-in PENDING→ACTIVE inbound-webhook match; revoked on member/STOP/Meta-block/admin opt-out. This is the
-- canonical `consentExists(pariwarId, memberId, 'whatsapp_opt_in', at)` surface for the AC6 dual gate.
--
-- ⚠ ADD VALUE cannot run inside a transaction block on Postgres, AND a newly-added enum value cannot be USED
-- in the same transaction it was added. So this is its OWN migration file, separate from any migration that
-- inserts a whatsapp_opt_in row (none do — consent rows are written at RUNTIME by the 5.4 worker/routes, well
-- after this DDL has committed). `IF NOT EXISTS` makes the ADD VALUE idempotent (re-apply-safe).
--
-- ⚠ DO NOT REGENERATE THIS FILE with `db:generate` (drizzle journal `when`, not SQL hash → skips; snapshots
-- stop at 0020). Hand-authored, mirroring 0038/0039. DO NOT reset via DROP SCHEMA (strips twt_app USAGE).

ALTER TYPE "consent_type" ADD VALUE IF NOT EXISTS 'whatsapp_opt_in';
