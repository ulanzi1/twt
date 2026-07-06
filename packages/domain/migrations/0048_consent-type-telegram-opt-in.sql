-- Migration 0048 — consent_type ADD VALUE 'telegram_opt_in' (Story 5.5, Task 2; AC9):
-- A separate first-class consent type mirroring whatsapp_opt_in (consent is independent of transport policy —
-- see the Story 5.5 "Consent vs. operational delivery state" invariant). Recorded on the member Telegram
-- opt-in PENDING→ACTIVE `/start` match; revoked on member/`/stop`/block/admin opt-out. The canonical
-- `consentExists(pariwarId, memberId, 'telegram_opt_in', at)` compliance/audit surface.
--
-- ⚠ ADD VALUE cannot run inside a transaction block on Postgres, AND a newly-added enum value cannot be USED
-- in the same transaction it was added. So this is its OWN migration file, separate from any migration that
-- inserts a telegram_opt_in row (none do — consent rows are written at RUNTIME by the 5.5 worker/routes, well
-- after this DDL has committed). `IF NOT EXISTS` makes the ADD VALUE idempotent (re-apply-safe).
--
-- ⚠ DO NOT REGENERATE THIS FILE with `db:generate` (drizzle journal `when`, not SQL hash → skips; snapshots
-- stop at 0020). Hand-authored, mirroring 0040. DO NOT reset via DROP SCHEMA (strips twt_app USAGE).

ALTER TYPE "consent_type" ADD VALUE IF NOT EXISTS 'telegram_opt_in';
