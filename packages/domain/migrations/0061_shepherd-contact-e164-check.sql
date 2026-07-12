-- Migration 0061 — CHECK constraints on the shepherd-contact columns (code review follow-up on Story
-- 6.12, 2026-07-12).
--
-- 0060 enforces canonical E.164 shape (`+<country><subscriber>`) on users.contact_phone/contact_whatsapp
-- and claim_shepherd_assignments.shepherd_contact_phone/shepherd_contact_whatsapp only in application code
-- (the write-path regex validation in apps/api/src/modules/auth/admin/admin-auth.repo.ts, mirrored by the
-- Zod contract regex in packages/contracts/src/claims/shepherd.ts). This adds the DB-level backstop other
-- validated-shape columns in this codebase get (the 0057 account_rank CHECK precedent), matching the
-- drizzle schema `check()` entries added alongside this migration in
-- packages/domain/src/schema/users.ts + packages/domain/src/schema/claim_shepherd_assignments.ts.
--
-- ⚠ DO NOT fold this into 0060 — 0060 is already applied (drizzle skips by journal `when`, not SQL hash,
-- so editing an applied migration silently drops the change and risks 42P07 on re-run). See
-- [[project_live_db_test_gotchas]].
--
-- All four columns are NULLABLE (an absent value is not a shape violation) — the CHECK only fires when a
-- non-null value fails the pattern, mirroring the `contact_phone IS NULL OR contact_phone ~ '...'` shape
-- used in the drizzle schema `check()` definitions.

ALTER TABLE "users"
  ADD CONSTRAINT "users_contact_phone_e164_check" CHECK ("contact_phone" IS NULL OR "contact_phone" ~ '^\+[1-9][0-9]{1,14}$');--> statement-breakpoint
ALTER TABLE "users"
  ADD CONSTRAINT "users_contact_whatsapp_e164_check" CHECK ("contact_whatsapp" IS NULL OR "contact_whatsapp" ~ '^\+[1-9][0-9]{1,14}$');--> statement-breakpoint
ALTER TABLE "claim_shepherd_assignments"
  ADD CONSTRAINT "claim_shepherd_assignments_contact_phone_e164_check" CHECK ("shepherd_contact_phone" IS NULL OR "shepherd_contact_phone" ~ '^\+[1-9][0-9]{1,14}$');--> statement-breakpoint
ALTER TABLE "claim_shepherd_assignments"
  ADD CONSTRAINT "claim_shepherd_assignments_contact_whatsapp_e164_check" CHECK ("shepherd_contact_whatsapp" IS NULL OR "shepherd_contact_whatsapp" ~ '^\+[1-9][0-9]{1,14}$');
