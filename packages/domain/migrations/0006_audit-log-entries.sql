-- Migration 0006 — audit_log_entries table + append-only triggers (Story 1.10).
--
-- ⚠ DO NOT REGENERATE THIS FILE with `db:generate`.
-- This file was manually patched after `drizzle-kit generate` emitted it.
-- The append-only Postgres triggers below are hand-supplemented because
-- drizzle-kit does not emit trigger DDL — the same Drizzle-ecosystem norm
-- migration 0001_events-log.sql documents (architecture §1.8 L996-997 accepts
-- trigger hand-edits at the migration-file level). The table creation + triggers
-- land in the SAME migration so per-migration atomicity (architecture §1.8
-- L1003-1005) means a failed trigger creation rolls back the table creation.
-- Idempotency invariant preserved: re-running migration 0006 is a no-op because
-- drizzle-kit consults drizzle.__drizzle_migrations.
--
-- RLS + the service-role grants land in the NEXT migration (0007), matching the
-- events_log 0001(table+triggers) → 0002(RLS) split.
--
-- pg_partman / partitioning (DD-4 / W16): ships NON-PARTITIONED. The hash chain
-- is ordered by `seq` (not by partitions), so the advisory-lock writer is
-- partition-agnostic and partitioning can be added by a later scale story without
-- touching the chain. W16 verification result is recorded in deferred-work.md +
-- the decision log (Task 11). events_log (Story 1.3) is likewise unpartitioned —
-- there is precedent for shipping the substrate unpartitioned at dev scale.
--
-- If you must regenerate, re-apply the trigger hand-supplement manually before
-- committing. The snapshot at meta/0006_snapshot.json is unchanged by this
-- hand-edit; `drizzle-kit check` inspects schema-vs-snapshot at the table-shape
-- level, not trigger contents.

CREATE TABLE "audit_log_entries" (
	"audit_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"seq" bigint GENERATED ALWAYS AS IDENTITY (sequence name "audit_log_entries_seq_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"pariwar_id" uuid NOT NULL,
	"actor_id" uuid,
	"actor_role" text,
	"action" text NOT NULL,
	"resource_locator" text NOT NULL,
	"request_payload_hash" text NOT NULL,
	"response_status" integer NOT NULL,
	"prev_audit_hash" text,
	"audit_hash" text NOT NULL,
	"recorded_at" timestamp with time zone DEFAULT now() NOT NULL,
	"trace_id" text,
	CONSTRAINT "audit_log_entries_seq_positive" CHECK ("audit_log_entries"."seq" >= 1)
);
--> statement-breakpoint
CREATE UNIQUE INDEX "audit_log_entries_seq_uq" ON "audit_log_entries" USING btree ("seq");--> statement-breakpoint
CREATE UNIQUE INDEX "audit_log_entries_audit_hash_uq" ON "audit_log_entries" USING btree ("audit_hash");--> statement-breakpoint
CREATE INDEX "audit_log_entries_pariwar_recorded_at_idx" ON "audit_log_entries" USING btree ("pariwar_id","recorded_at");--> statement-breakpoint
CREATE INDEX "audit_log_entries_pariwar_seq_idx" ON "audit_log_entries" USING btree ("pariwar_id","seq");--> statement-breakpoint
-- Append-only enforcement (AC-2): audit_log_entries is immutable — no privileged
-- action's audit line can be modified or erased after the fact (FR-47 + the
-- architectural-freeze immutability property, freeze-table row 5). Structural
-- enforcement at the DB layer: even a raw SQL UPDATE/DELETE/TRUNCATE (including
-- by the BYPASSRLS service role) raises. Tampering is therefore detectable by
-- BOTH the hash chain (verifyChainSegment) AND blocked outright at write time.
-- Mirrors events_log_reject_mutation (migration 0001).
CREATE FUNCTION audit_log_entries_reject_mutation()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION
    'audit_log_entries is append-only — audit lines are immutable (FR-47, AR-9)'
    USING ERRCODE = 'integrity_constraint_violation';
END;
$$;
--> statement-breakpoint
CREATE TRIGGER audit_log_entries_no_update
  BEFORE UPDATE ON audit_log_entries
  FOR EACH ROW EXECUTE FUNCTION audit_log_entries_reject_mutation();
--> statement-breakpoint
CREATE TRIGGER audit_log_entries_no_delete
  BEFORE DELETE ON audit_log_entries
  FOR EACH ROW EXECUTE FUNCTION audit_log_entries_reject_mutation();
--> statement-breakpoint
CREATE TRIGGER audit_log_entries_no_truncate
  BEFORE TRUNCATE ON audit_log_entries
  EXECUTE FUNCTION audit_log_entries_reject_mutation();
