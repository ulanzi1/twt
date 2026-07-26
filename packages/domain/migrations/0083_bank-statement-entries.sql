-- Migration 0083 — bank_statement_entries (Story 9.4, Task 2/7; Decision D4).
-- ONE net-new table + tenant-isolation RLS, in ONE hand-authored file: the persisted, normalized
-- bank-statement rows the UTR matcher reads. Story 9.3 stores the raw blob (Tier-1 object store) + the
-- reconciliation.statement-uploaded metadata event; Story 9.4 re-parses that blob (byte-identical replay via
-- the Story 9.2 parseStatement — the deterministic deriveBankStatementEntryId reproduces every id) and
-- PERSISTS the entries here, keyed on that deterministic entry_id (idempotent ON CONFLICT DO NOTHING upsert).
--
-- ⚠ DO NOT REGENERATE with `db:generate` (same discipline as 0056/0071/0078/0080 etc.): the drizzle snapshot
-- baseline is frozen at 0020, so a regenerate emits a bloated catch-up migration and drizzle-kit skips an
-- already-applied migration by journal `when` (NOT SQL hash), silently dropping the hand-supplements +
-- risking 42P07 on re-run ([[project_live_db_test_gotchas]]). HAND-AUTHORED: carries ONLY the
-- bank_statement_entries DDL (CREATE TABLE + the two indexes + ENABLE/FORCE RLS + the two CREATE POLICY
-- declarations from packages/domain/src/policies/bank-statement-entries-rls.ts), wrapped with the
-- hand-supplemented GRANT + FORCE DDL (mirrors 0056).
--
-- Hand-supplements (relative to a generated DDL):
--   1. GRANT SELECT, INSERT, DELETE on the table to twt_app. NO UPDATE: entries are IMMUTABLE derivations
--      (a re-parse reproduces identical rows; the writer is an idempotent upsert, never an in-place edit).
--      DELETE is included for RTBF / hygiene only (the durable evidentiary record is the encrypted blob +
--      the reconciliation.statement-uploaded event, not these re-derivable rows).
--   2. ALTER TABLE ... FORCE ROW LEVEL SECURITY — applies RLS even to the (non-superuser) table owner.
--
-- ⚠ NO current_state-style write-rejection trigger here: this is NOT an event-sourced state cache — it is a
-- matcher-read cache of re-parsed rows. No lifecycle state lives on it.
--
-- The roles (twt_app) already exist (migration 0002). No FK to pools/claims (pool_id / claim_case_id are the
-- denormalized provenance the pools/alerts primitives keep unFK'd). No snapshot file (baseline frozen at 0020).

CREATE TABLE "bank_statement_entries" (
	"entry_id" uuid PRIMARY KEY NOT NULL,
	"pariwar_id" uuid NOT NULL,
	"pool_id" uuid NOT NULL,
	"statement_event_id" uuid NOT NULL,
	"claim_case_id" uuid NOT NULL,
	"bank_code" text NOT NULL,
	"transaction_id_utr" text,
	"sender_vpa" text,
	"amount" bigint NOT NULL,
	"transaction_date" text NOT NULL,
	"entry_type" text NOT NULL,
	"source_account" text,
	"parser_version" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
-- (1) Table privileges for the app role. NO UPDATE (immutable derivations); DELETE for RTBF / hygiene only.
GRANT SELECT, INSERT, DELETE ON "bank_statement_entries" TO twt_app;--> statement-breakpoint
-- (2) Turn RLS on + FORCE it even for the (non-superuser) table owner (kept adjacent).
ALTER TABLE "bank_statement_entries" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "bank_statement_entries" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
-- The matcher's per-cycle load: entries by (pariwar, pool). pariwar_id leads (RLS-aware planner hint).
CREATE INDEX "bank_statement_entries_pariwar_pool_idx" ON "bank_statement_entries" USING btree ("pariwar_id","pool_id");--> statement-breakpoint
-- The primary-match probe surface: (pariwar, utr).
CREATE INDEX "bank_statement_entries_pariwar_utr_idx" ON "bank_statement_entries" USING btree ("pariwar_id","transaction_id_utr");--> statement-breakpoint
-- Tenant-isolation RLS (mirror claim-nominee-bank-rls EXACTLY): SELECT + write (for ALL) via the
-- Story 1.6 closed-failure construct `pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid`.
CREATE POLICY "bank_statement_entries_tenant_isolation_select" ON "bank_statement_entries" AS PERMISSIVE FOR SELECT TO "twt_app" USING (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "bank_statement_entries_tenant_isolation_write" ON "bank_statement_entries" AS PERMISSIVE FOR ALL TO "twt_app" USING (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid) WITH CHECK (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid);
