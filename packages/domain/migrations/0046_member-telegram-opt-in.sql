-- Migration 0046 — member_telegram_opt_in (Story 5.5, Task 2; AC1/AC3/AC4/AC10):
-- The member Telegram opt-in state-machine substrate — the FIVE-state operational lifecycle the two-state
-- consent registry cannot express (PENDING → ACTIVE → REVOKED | BLOCKED | EXPIRED), plus the verification
-- code (the `/start` match token) and the captured chat_id (the delivery address). Mirrors member_wa_opt_in
-- but SIMPLER: NO mobile_blind_index (Telegram never shares the phone; the match key is the code alone) and
-- NO window_expires_at (no Meta 24h window — a bot messages until the user blocks/stops it).
--   · TENANT-ISOLATED (mirror member_wa_opt_in): standard inline tenant-isolation RLS on pariwar_id (Story
--     1.6 closed-failure construct — unset scope → 0 rows). NOT a cross-tenant carve-out.
--   · verification_code DB-enforced uniqueness: a PARTIAL unique index UNIQUE (pariwar_id, verification_code)
--     WHERE state='PENDING' — two concurrently-outstanding PENDING opt-ins can NEVER share a code (a collision
--     → one member's `/start` matches another's PENDING → wrong-member ACTIVE). Partial so a code is free to
--     recur across historical/terminal rows.
--
-- ⚠ DO NOT REGENERATE THIS FILE with `db:generate` (drizzle journal `when`, not SQL hash → skips; snapshots
-- stop at 0020). Hand-authored, mirroring 0042 (drizzle-kit does not express partial unique indexes in the
-- schema DSL — that index is SQL-only). DO NOT reset via DROP SCHEMA (strips twt_app USAGE).

-- The five-state operational lifecycle enum. pgEnum → CREATE TYPE. NO EXPIRED_24H_WINDOW (no Meta window).
CREATE TYPE "telegram_opt_in_state" AS ENUM ('PENDING', 'ACTIVE', 'REVOKED', 'BLOCKED', 'EXPIRED');--> statement-breakpoint

CREATE TABLE "member_telegram_opt_in" (
	"opt_in_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"pariwar_id" uuid NOT NULL,
	-- Polymorphic member reference (mirror consent_records.subject_id): NO FK, MemberId brand is a hint only.
	"member_id" uuid NOT NULL,
	"state" "telegram_opt_in_state" DEFAULT 'PENDING' NOT NULL,
	-- The unique per-PENDING match token (DB-enforced by the partial unique index below).
	"verification_code" text NOT NULL,
	-- The opaque Telegram chat id captured on the ACTIVE transition (the SendTarget.address). NULL while PENDING.
	"chat_id" text,
	-- FK-free back-reference to the consent_records row minted on ACTIVE (registry is canonical). NULL until ACTIVE.
	"consent_id" uuid,
	-- Set when a webhook `/start` match flips PENDING→ACTIVE (AC10 provenance).
	"matched_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint
-- The worker's PENDING-match lookup: (pariwar, verification code, state).
CREATE INDEX "member_telegram_opt_in_match_idx" ON "member_telegram_opt_in" ("pariwar_id", "verification_code", "state");--> statement-breakpoint
-- The member-status read (getOptInForMember + the composition resolver gate).
CREATE INDEX "member_telegram_opt_in_member_idx" ON "member_telegram_opt_in" ("pariwar_id", "member_id");--> statement-breakpoint
-- DB-enforced verification-code uniqueness among concurrently-outstanding PENDING opt-ins (the wrong-member
-- -match backstop). PARTIAL (WHERE state='PENDING') so a code can recur across historical/terminal rows.
CREATE UNIQUE INDEX "member_telegram_opt_in_pending_code_uq" ON "member_telegram_opt_in" ("pariwar_id", "verification_code") WHERE "state" = 'PENDING';--> statement-breakpoint
-- DB-enforced one-outstanding-PENDING-per-member (mirrors 0044 for WA — closes the concurrent-mint race).
CREATE UNIQUE INDEX "member_telegram_opt_in_pending_member_uq" ON "member_telegram_opt_in" ("pariwar_id", "member_id") WHERE "state" = 'PENDING';--> statement-breakpoint
-- GRANT (SELECT read; INSERT mint PENDING; UPDATE transitions — a MUTATE, never a delete, so NO DELETE grant).
GRANT SELECT, INSERT, UPDATE ON "member_telegram_opt_in" TO twt_app;--> statement-breakpoint
ALTER TABLE "member_telegram_opt_in" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "member_telegram_opt_in" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "member_telegram_opt_in_tenant_isolation_select" ON "member_telegram_opt_in" AS PERMISSIVE FOR SELECT TO "twt_app" USING (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "member_telegram_opt_in_tenant_isolation_write" ON "member_telegram_opt_in" AS PERMISSIVE FOR ALL TO "twt_app" USING (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid) WITH CHECK (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid);
