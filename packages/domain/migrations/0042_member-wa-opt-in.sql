-- Migration 0042 — member_wa_opt_in (Story 5.4, Task 3; AC1/AC3/AC4):
-- The member WhatsApp opt-in state-machine substrate — the FIVE-state operational lifecycle the two-state
-- consent registry cannot express (PENDING → ACTIVE → REVOKED | BLOCKED_BY_META | EXPIRED_24H_WINDOW), plus
-- the verification phrase (inbound-match token), the mobile blind index (match key), and the 24h window.
-- consent_records stays the canonical consentExists('whatsapp_opt_in') surface; this table is the state
-- machine (kept consistent by the caller's audit-or-throw).
--   · TENANT-ISOLATED (mirror member_device_tokens / pariwar_wa_config): standard inline tenant-isolation RLS
--     on pariwar_id (Story 1.6 closed-failure construct — unset scope → 0 rows). NOT a cross-tenant carve-out.
--   · verification_phrase DB-enforced uniqueness: a PARTIAL unique index UNIQUE (pariwar_id, verification_
--     phrase) WHERE state='PENDING' — two concurrently-outstanding PENDING opt-ins can NEVER share a phrase
--     (a collision → wrong-member ACTIVE, an AC3/AC4 integrity break). Partial so a phrase is free to recur
--     across historical/terminal rows.
--
-- ⚠ DO NOT REGENERATE THIS FILE with `db:generate` (drizzle journal `when`, not SQL hash → skips; snapshots
-- stop at 0020). Hand-authored, mirroring 0037/0038. DO NOT reset via DROP SCHEMA (strips twt_app USAGE).

-- The five-state operational lifecycle enum. pgEnum → CREATE TYPE.
CREATE TYPE "wa_opt_in_state" AS ENUM ('PENDING', 'ACTIVE', 'REVOKED', 'BLOCKED_BY_META', 'EXPIRED_24H_WINDOW');--> statement-breakpoint

CREATE TABLE "member_wa_opt_in" (
	"opt_in_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"pariwar_id" uuid NOT NULL,
	-- Polymorphic member reference (mirror consent_records.subject_id): NO FK, MemberId brand is a hint only.
	"member_id" uuid NOT NULL,
	"state" "wa_opt_in_state" DEFAULT 'PENDING' NOT NULL,
	-- The unique per-PENDING match token (DB-enforced by the partial unique index below).
	"verification_phrase" text NOT NULL,
	-- Deterministic HMAC of the member's mobile (the match key) — computed at the apps/api boundary.
	"mobile_blind_index" text NOT NULL,
	-- The Meta 24h customer-service window end, set on the ACTIVE transition; NULL while PENDING.
	"window_expires_at" timestamp with time zone,
	-- FK-free back-reference to the consent_records row minted on ACTIVE (registry is canonical). NULL until ACTIVE.
	"consent_id" uuid,
	-- Set when a webhook match flips PENDING→ACTIVE (AC5 provenance).
	"matched_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint
-- The worker's PENDING-match lookup: (pariwar, mobile blind index, state).
CREATE INDEX "member_wa_opt_in_match_idx" ON "member_wa_opt_in" ("pariwar_id", "mobile_blind_index", "state");--> statement-breakpoint
-- The member-status read (getOptInForMember + the AC6 resolver gate).
CREATE INDEX "member_wa_opt_in_member_idx" ON "member_wa_opt_in" ("pariwar_id", "member_id");--> statement-breakpoint
-- DB-enforced verification-phrase uniqueness among concurrently-outstanding PENDING opt-ins (the wrong-member
-- -match backstop). PARTIAL (WHERE state='PENDING') so a phrase can recur across historical/terminal rows.
CREATE UNIQUE INDEX "member_wa_opt_in_pending_phrase_uq" ON "member_wa_opt_in" ("pariwar_id", "verification_phrase") WHERE "state" = 'PENDING';--> statement-breakpoint
-- GRANT (SELECT read; INSERT mint PENDING; UPDATE transitions — a MUTATE, never a delete, so NO DELETE grant).
GRANT SELECT, INSERT, UPDATE ON "member_wa_opt_in" TO twt_app;--> statement-breakpoint
ALTER TABLE "member_wa_opt_in" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "member_wa_opt_in" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "member_wa_opt_in_tenant_isolation_select" ON "member_wa_opt_in" AS PERMISSIVE FOR SELECT TO "twt_app" USING (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "member_wa_opt_in_tenant_isolation_write" ON "member_wa_opt_in" AS PERMISSIVE FOR ALL TO "twt_app" USING (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid) WITH CHECK (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid);
