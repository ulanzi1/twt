-- Migration 0017 — consent registry (consent_records) + the two consent pgEnums
-- (consent_type, consent_granted_via) + tenant-isolation RLS (Story 2.7, Task 1).
--
-- ⚠ DO NOT REGENERATE THIS FILE with `db:generate`.
-- drizzle-kit skips an already-applied migration by journal `when` (NOT by SQL
-- hash), so a regenerate-after-apply silently drops the hand-supplements and can
-- raise 42P07 on re-run. The drizzle-kit-emitted statements (the two CREATE TYPE
-- enums + the CREATE TABLE + ENABLE RLS + the two FKs to audit_log_entries + the
-- (pariwar_id, subject_id, consent_type) index + the two CREATE POLICY declarations
-- from packages/domain/src/policies/consent-records-rls.ts) are wrapped here with
-- hand-supplemented GRANT + FORCE DDL that drizzle-kit does not emit. Mirrors
-- 0014/0015/0016 (GRANT + FORCE).
--
-- Hand-supplements (relative to the generated DDL):
--   1. GRANT SELECT, INSERT, UPDATE on consent_records to twt_app.
--      NOT DELETE: a consent is REVOKED via a mutate (set revoked_at +
--      revocation_reason + revoked_audit_id), never row-deleted — the row stays
--      queryable so a pre-revocation consentExists(..., pastTimestamp) still
--      returns true (AC3 "historical proof preserved"). UPDATE is legitimate (the
--      revoke transition). INSERT is the grant transition. Grants only to twt_app
--      (the policies bind TO twt_app; twt_service has no policy here so a grant
--      would be inert under FORCE RLS — the 0014/0016 rationale).
--   2. ALTER TABLE ... FORCE ROW LEVEL SECURITY on consent_records — applies RLS
--      even to the (non-superuser) table owner, so no future owner-run migration
--      silently reads/writes cross-tenant. ENABLE + FORCE kept adjacent.
--
-- The roles (twt_app / twt_service) already exist from migration 0002 — no CREATE
-- ROLE here. Idempotency invariant preserved: the snapshot at
-- meta/0017_snapshot.json records only the table-shape view (the two TYPEs + TABLE
-- + ENABLE RLS + FKs + index + policies); the GRANT/FORCE hand-supplements are
-- invisible to `drizzle-kit check`, matching migrations 0014/0015/0016.

CREATE TYPE "public"."consent_granted_via" AS ENUM('member_self', 'staff_assisted', 'inherited');--> statement-breakpoint
CREATE TYPE "public"."consent_type" AS ENUM('tc_acceptance', 'dpdpa_data_processing', 'dpdpa_data_sharing', 'marketing', 'medical_disclosure_ack', 'nominee_share_split', 'claim_time_dpdpa');--> statement-breakpoint
CREATE TABLE "consent_records" (
	"consent_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"subject_id" uuid NOT NULL,
	"pariwar_id" uuid NOT NULL,
	"consent_type" "consent_type" NOT NULL,
	"consent_artifact_ref" text,
	"granted_at" timestamp with time zone DEFAULT now() NOT NULL,
	"revoked_at" timestamp with time zone,
	"granted_via_actor" "consent_granted_via" NOT NULL,
	"consent_payload" jsonb NOT NULL,
	"audit_id" uuid,
	"revocation_reason" text,
	"revoked_audit_id" uuid
);
--> statement-breakpoint
-- (1) Table privileges for the app role on consent_records (SELECT/INSERT/UPDATE,
-- NOT DELETE — a consent is revoked via mutate, never row-deleted; the row stays
-- queryable for the time-travel consentExists query, AC3).
GRANT SELECT, INSERT, UPDATE ON "consent_records" TO twt_app;--> statement-breakpoint
-- drizzle-kit-emitted: turn RLS on for consent_records.
ALTER TABLE "consent_records" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
-- (2) FORCE applies RLS even to the (non-superuser) table owner — kept adjacent to ENABLE.
ALTER TABLE "consent_records" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "consent_records" ADD CONSTRAINT "consent_records_audit_id_audit_log_entries_audit_id_fk" FOREIGN KEY ("audit_id") REFERENCES "public"."audit_log_entries"("audit_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "consent_records" ADD CONSTRAINT "consent_records_revoked_audit_id_audit_log_entries_audit_id_fk" FOREIGN KEY ("revoked_audit_id") REFERENCES "public"."audit_log_entries"("audit_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "consent_records_pariwar_subject_type_idx" ON "consent_records" USING btree ("pariwar_id","subject_id","consent_type");--> statement-breakpoint
CREATE POLICY "consent_records_tenant_isolation_select" ON "consent_records" AS PERMISSIVE FOR SELECT TO "twt_app" USING (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "consent_records_tenant_isolation_write" ON "consent_records" AS PERMISSIVE FOR ALL TO "twt_app" USING (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid) WITH CHECK (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid);
