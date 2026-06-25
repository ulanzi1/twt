-- Migration 0021 — OTP rate-bucket table + elevations unique constraint (Story 3.2
-- code-review patches P23 + P31).
--
-- (1) `otp_rate_buckets` — Postgres-backed per-phone OTP send rate counter.
--     Replaces the in-process Map in otp-rate-limit.ts (P31 / D4). The atomic
--     INSERT ... ON CONFLICT DO UPDATE is the only correct implementation across
--     concurrent requests and multiple API replicas. Keyed on (phone_key, bucket_epoch)
--     so each phone×window slot is a single row. `__global__` is the bulk-attack tripwire.
--
-- (2) `member_step_up_elevations` unique index on (member_id, action_context).
--     Enables the UPSERT in `insertElevation` to collapse concurrent elevation
--     rows into one, preventing the accumulation bug (P23). Only a UNIQUE INDEX is
--     added here (not a UNIQUE CONSTRAINT) to avoid the drizzle-kit snapshot delta;
--     ON CONFLICT (col1, col2) works with either form in Postgres.
--
-- ⚠ DO NOT REGENERATE THIS FILE with `db:generate` — drizzle-kit skips applied
-- migrations by journal `when`, not SQL hash. A regenerate silently drops the hand-
-- supplements (GRANT, FORCE, POLICY) and can raise 42P07.

CREATE TABLE "otp_rate_buckets" (
    "phone_key"    text NOT NULL,
    "bucket_epoch" bigint NOT NULL,
    "count"        integer NOT NULL DEFAULT 1,
    "expires_at"   timestamp with time zone NOT NULL,
    CONSTRAINT "otp_rate_buckets_pk" PRIMARY KEY ("phone_key", "bucket_epoch")
);
--> statement-breakpoint
CREATE INDEX "otp_rate_buckets_expires_idx" ON "otp_rate_buckets" USING btree ("expires_at");
--> statement-breakpoint
ALTER TABLE "otp_rate_buckets" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
-- ── Hand-supplements ──────────────────────────────────────────────────────────────
-- GRANT + FORCE + POLICY mirror migration 0019 (member-auth carve-out family).
GRANT SELECT, INSERT, UPDATE, DELETE ON "otp_rate_buckets" TO twt_app;
--> statement-breakpoint
CREATE POLICY "otp_rate_buckets_global_access" ON "otp_rate_buckets"
    AS PERMISSIVE FOR ALL TO "twt_app" USING (true) WITH CHECK (true);
--> statement-breakpoint
ALTER TABLE "otp_rate_buckets" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
-- (2) Unique index for elevation UPSERT (ON CONFLICT (member_id, action_context)).
--     Deduplicates concurrent step-up verify calls for the same member+action,
--     replacing the plain INSERT that accumulated rows (P23).
CREATE UNIQUE INDEX "member_step_up_elevations_member_action_uq"
    ON "member_step_up_elevations" USING btree ("member_id", "action_context");
