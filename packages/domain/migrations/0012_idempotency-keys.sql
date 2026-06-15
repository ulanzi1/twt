-- Migration 0012 — idempotency_keys table (Story 1.12, Task 2 / DD-2).
--
-- ⚠ DO NOT REGENERATE THIS FILE with `db:generate`.
-- The drizzle-kit-emitted statements (CREATE TABLE + CREATE INDEX, source of
-- truth: packages/domain/src/schema/idempotency_keys.ts) are kept here under a
-- hand-authored header. RLS + the role grants land in the NEXT migration (0013),
-- mirroring the 0006(table)→0007(RLS) and 0008(table)→0009(RLS) splits.
--
-- ── MUTABLE table — NO append-only triggers (DD-2) ────────────────────────────
-- DELIBERATELY unlike audit_log_entries (0006) / audit_integrity_checks (0008) /
-- events_log (0001): this table is mutated in normal operation — recordResult()
-- UPDATEs the row, expired-key reclaim UPDATEs it, and the TTL vacuum (AC-5)
-- DELETEs expired rows. So there are NO reject-mutation triggers. The mutable
-- grant set (SELECT, INSERT, UPDATE, DELETE) follows the migration 0004
-- `role_grants` pattern and is applied in 0013 alongside RLS.
--
-- ── GLOBAL infra primitive (DD-2) ─────────────────────────────────────────────
-- No `pariwar_id` column — the keyed store is a cross-cutting primitive consumed
-- by both apps/api request handlers (twt_app) and background workers (twt_service
-- via the service pool). Callers namespace tenant operations into the key string.
-- RLS posture (ENABLE+FORCE + USING(true) carve-out) lands in 0013.
--
-- Idempotency invariant (architecture §1.8 + Story 1.2 README §4) preserved: the
-- snapshot at meta/0012_snapshot.json records the table shape; re-running 0012 is
-- a no-op (drizzle consults drizzle.__drizzle_migrations).
--
-- Migrations are FORWARD-ONLY (architecture §1.8). The precise manual inverse, for
-- operator reference only (e.g. a dev-DB reset outside the runner), is:
--     DROP TABLE IF EXISTS "idempotency_keys";

CREATE TABLE "idempotency_keys" (
	"key" text PRIMARY KEY NOT NULL,
	"status" text NOT NULL,
	"result" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone,
	"expires_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
-- Drives the TTL vacuum's `DELETE … WHERE expires_at < now()` (AC-5) and the
-- expired-row reclaim probe inside claim().
CREATE INDEX "idempotency_keys_expires_at_idx" ON "idempotency_keys" USING btree ("expires_at");
