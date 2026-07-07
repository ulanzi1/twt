-- Migration 0049 — `sms_rate_buckets` table (Story 5.6, Task 5; Story 1.14 flood-control).
--
-- Per-MEMBER transactional-SMS send rate counter. Mirrors 0021's `otp_rate_buckets`
-- EXACTLY (the atomic INSERT ... ON CONFLICT DO UPDATE bucket pattern — the only correct
-- implementation across concurrent sends and multiple replicas) but keyed per MEMBER
-- (`member_key`) and DELIBERATELY SEPARATE from the OTP buckets: a transactional-alert-SMS
-- flood must NEVER consume the security-critical OTP send budget (and vice-versa). Two
-- tables = two independent budgets, by construction.
--
-- Keyed on (member_key, bucket_epoch): member_key = a member-scoped key (member id / blind
-- index), NOT a plaintext phone; bucket_epoch = floor(now / windowMs). `expires_at` is set
-- to the end of the next bucket so rows outlive their window before the expires_idx vacuums
-- them (periodic DELETE WHERE expires_at < now() is sufficient — low write volume, no TTL
-- trigger; mirrors the otp-bucket note).
--
-- ⚠ DO NOT REGENERATE THIS FILE with `db:generate` — drizzle-kit skips applied migrations by
-- journal `when`, not SQL hash, and its snapshots stop at 0020. A regenerate silently drops
-- the hand-supplements (GRANT, POLICY, FORCE) and can raise 42P07. Hand-authored, mirroring
-- 0021. DO NOT reset via DROP SCHEMA (strips twt_app USAGE → 42P01).

CREATE TABLE "sms_rate_buckets" (
    "member_key"   text NOT NULL,
    "bucket_epoch" bigint NOT NULL,
    "count"        integer NOT NULL DEFAULT 1,
    "expires_at"   timestamp with time zone NOT NULL,
    CONSTRAINT "sms_rate_buckets_member_key_bucket_epoch_pk" PRIMARY KEY ("member_key", "bucket_epoch")
);
--> statement-breakpoint
CREATE INDEX "sms_rate_buckets_expires_idx" ON "sms_rate_buckets" USING btree ("expires_at");
--> statement-breakpoint
ALTER TABLE "sms_rate_buckets" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
-- ── Hand-supplements ──────────────────────────────────────────────────────────────
-- GRANT + POLICY + FORCE mirror migration 0021 (member-auth carve-out family). The bucket
-- is a global counter keyed per member (no pariwar_id dimension) — a permissive USING(true)
-- policy, exactly like otp_rate_buckets, so the accessor's atomic upsert works regardless of
-- the caller's tenant scope.
GRANT SELECT, INSERT, UPDATE, DELETE ON "sms_rate_buckets" TO twt_app;
--> statement-breakpoint
CREATE POLICY "sms_rate_buckets_global_access" ON "sms_rate_buckets"
    AS PERMISSIVE FOR ALL TO "twt_app" USING (true) WITH CHECK (true);
--> statement-breakpoint
ALTER TABLE "sms_rate_buckets" FORCE ROW LEVEL SECURITY;
