-- Migration 0001 — events_log table + append-only triggers (Story 1.3).
--
-- ⚠ DO NOT REGENERATE THIS FILE with `db:generate`.
-- This file was manually patched after `drizzle-kit generate` emitted it.
-- The append-only Postgres triggers below are hand-supplemented because
-- drizzle-kit does not emit trigger DDL — this is the Drizzle ecosystem norm
-- (architecture §1.8 line 996-997 accepts trigger-hand-edit at the migration
-- file level). The table creation + triggers land in the same migration so
-- per-migration atomicity (architecture §1.8 line 1003-1005) means a failed
-- trigger creation rolls back the table creation. Idempotency invariant
-- preserved: re-running migration 0001 is a no-op because drizzle-kit consults
-- drizzle.__drizzle_migrations.
--
-- If you must regenerate, re-apply the trigger hand-supplement manually before
-- committing. The snapshot at meta/0001_snapshot.json is unchanged by this
-- hand-edit; `drizzle-kit check` is a no-op against this file (it inspects
-- schema-vs-snapshot at the table-shape level, not trigger contents).

CREATE TABLE "events_log" (
	"event_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"stream_id" uuid NOT NULL,
	"event_type" text NOT NULL,
	"payload" jsonb NOT NULL,
	"event_version" bigint NOT NULL,
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL,
	"actor_id" uuid,
	"pariwar_id" uuid NOT NULL,
	CONSTRAINT "events_log_event_version_positive" CHECK ("events_log"."event_version" >= 1)
);
--> statement-breakpoint
CREATE UNIQUE INDEX "events_log_stream_id_event_version_uq" ON "events_log" USING btree ("stream_id","event_version");--> statement-breakpoint
CREATE INDEX "events_log_pariwar_stream_idx" ON "events_log" USING btree ("pariwar_id","stream_id","event_version");--> statement-breakpoint
CREATE INDEX "events_log_pariwar_occurred_at_idx" ON "events_log" USING btree ("pariwar_id","occurred_at");--> statement-breakpoint
-- Append-only enforcement: events_log is immutable per AR-8 + architecture
-- §Package Boundary Rationale line 428-431. Corrections emit a NEW event
-- referring to the original; existing rows are NEVER mutated. Structural
-- enforcement at the DB layer — the @twt/events application API cannot
-- bypass this even with raw SQL.
CREATE FUNCTION events_log_reject_mutation()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION
    'events_log is append-only — corrections emit a new event (AR-8)'
    USING ERRCODE = 'integrity_constraint_violation';
END;
$$;
--> statement-breakpoint
CREATE TRIGGER events_log_no_update
  BEFORE UPDATE ON events_log
  FOR EACH ROW EXECUTE FUNCTION events_log_reject_mutation();
--> statement-breakpoint
CREATE TRIGGER events_log_no_delete
  BEFORE DELETE ON events_log
  FOR EACH ROW EXECUTE FUNCTION events_log_reject_mutation();
--> statement-breakpoint
CREATE TRIGGER events_log_no_truncate
  BEFORE TRUNCATE ON events_log
  EXECUTE FUNCTION events_log_reject_mutation();
