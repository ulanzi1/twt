-- Migration 0008 — audit_integrity_checks table + append-only triggers (Story 1.11a).
--
-- ⚠ DO NOT REGENERATE THIS FILE with `db:generate`.
-- This file was manually patched after `drizzle-kit generate` emitted it.
-- The append-only Postgres triggers below are hand-supplemented because
-- drizzle-kit does not emit trigger DDL — the same hand-edit norm migrations
-- 0001_events-log.sql / 0006_audit-log-entries.sql document (architecture §1.8
-- L996-997 accepts trigger hand-edits at the migration-file level). The table
-- creation + triggers land in the SAME migration so per-migration atomicity
-- (architecture §1.8 L1003-1005) means a failed trigger creation rolls back the
-- table creation. Idempotency invariant preserved: re-running migration 0008 is a
-- no-op because drizzle-kit consults drizzle.__drizzle_migrations.
--
-- RLS + the role grants land in the NEXT migration (0009), mirroring the
-- 0006(table+triggers) → 0007(RLS) split for audit_log_entries.
--
-- audit_integrity_checks is the verdict ledger for the integrity-verification job
-- (DD-3): a GLOBAL table (the audit chain is one global chain, no pariwar_id
-- dimension), tiny → NON-PARTITIONED (audit_log_entries / events_log precedent).
--
-- If you must regenerate, re-apply the trigger hand-supplement manually before
-- committing. The snapshot at meta/0008_snapshot.json is unchanged by this
-- hand-edit; `drizzle-kit check` inspects schema-vs-snapshot at the table-shape
-- level, not trigger contents.

CREATE TABLE "audit_integrity_checks" (
	"check_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"verified_at" timestamp with time zone DEFAULT now() NOT NULL,
	"chain_valid" boolean NOT NULL,
	"start_seq" bigint,
	"start_audit_id" uuid,
	"end_seq" bigint,
	"end_audit_id" uuid,
	"first_broken_seq" bigint,
	"first_broken_audit_id" uuid,
	"rows_verified" integer NOT NULL,
	"verifier_actor" text NOT NULL,
	"trigger_source" text NOT NULL
);
--> statement-breakpoint
CREATE INDEX "audit_integrity_checks_verified_at_idx" ON "audit_integrity_checks" USING btree ("verified_at");--> statement-breakpoint
CREATE INDEX "audit_integrity_checks_failures_idx" ON "audit_integrity_checks" USING btree ("verified_at") WHERE "audit_integrity_checks"."chain_valid" = false;--> statement-breakpoint
-- Append-only enforcement (DD-3): audit_integrity_checks is INSERT-only — a
-- verification verdict is itself tamper-evident and cannot be un-recorded or
-- rewritten after the fact. Structural enforcement at the DB layer: even a raw
-- SQL UPDATE/DELETE/TRUNCATE (including by the BYPASSRLS service role) raises.
-- Mirrors audit_log_entries_reject_mutation (migration 0006) / events_log
-- (migration 0001).
CREATE FUNCTION audit_integrity_checks_reject_mutation()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION
    'audit_integrity_checks is append-only — integrity verdicts are immutable (Story 1.11a / FR-47)'
    USING ERRCODE = 'integrity_constraint_violation';
END;
$$;
--> statement-breakpoint
CREATE TRIGGER audit_integrity_checks_no_update
  BEFORE UPDATE ON audit_integrity_checks
  FOR EACH ROW EXECUTE FUNCTION audit_integrity_checks_reject_mutation();
--> statement-breakpoint
CREATE TRIGGER audit_integrity_checks_no_delete
  BEFORE DELETE ON audit_integrity_checks
  FOR EACH ROW EXECUTE FUNCTION audit_integrity_checks_reject_mutation();
--> statement-breakpoint
CREATE TRIGGER audit_integrity_checks_no_truncate
  BEFORE TRUNCATE ON audit_integrity_checks
  EXECUTE FUNCTION audit_integrity_checks_reject_mutation();
