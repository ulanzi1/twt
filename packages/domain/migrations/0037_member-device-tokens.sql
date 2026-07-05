-- Migration 0037 — member_device_tokens (per-member / per-admin push device-token
-- registration substrate; Story 5.2, Task 3):
--   · TENANT-ISOLATED (mirror member_nominees / member_medical_disclosures tenant-isolation):
--     the mobile app registers its FCM/APNs token on app open (in the member's Pariwar scope);
--     admin tokens register under the nil-UUID admin-global namespace as pariwar_id.
--   · Device tokens are Tier-1 PII (architecture §3.4 L1937): token → envelope ciphertext;
--     token_blind_index → HMAC for dedup / lookup-without-decrypt / audit hashing. NEVER raw.
--   · member_id FK → members ON DELETE CASCADE (RTBF, Story 3.12) — set for member principals,
--     NULL for admin. Unique on (pariwar_id, principal_type, principal_id, platform,
--     token_blind_index): app-open rebuild upserts on this key (latest-wins).
--
-- ⚠ DO NOT REGENERATE THIS FILE with `db:generate`.
-- drizzle-kit skips an already-applied migration by journal `when` (NOT by SQL hash), and the
-- meta/ snapshots stop at 0020 (0021+ are hand-authored, snapshot-absent — known drift, NOT
-- gate-blocking). A `db:generate` now would diff CURRENT schema against 0020_snapshot.json and
-- wrongly re-emit applied 0021-0036 → 42P07. So this file is HAND-AUTHORED, mirroring
-- 0025_member-nominees / 0026_member-medical-disclosures (inline RLS in the SAME file — no
-- separate *-rls.sql; that older split pattern is abandoned). Roles (twt_app) exist from 0002.
-- No snapshot emitted (matching 0021-0036); `drizzle-kit check` tolerates it.

-- ── member_device_tokens (TENANT-ISOLATED push device-token registration) ─────────────
-- No enums: principal_type / platform / status are plain text constrained by CHECKs (the
-- kyc_transactions.status "text for the swap seam" posture) + the contracts enums for data quality.
CREATE TABLE "member_device_tokens" (
	"token_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"pariwar_id" uuid NOT NULL,
	"principal_type" text NOT NULL,
	"principal_id" uuid NOT NULL,
	"member_id" uuid,
	"platform" text NOT NULL,
	"token_ciphertext" text NOT NULL,
	"token_blind_index" text NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"registered_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "member_device_tokens_principal_token_uq" UNIQUE("pariwar_id","principal_type","principal_id","platform","token_blind_index"),
	CONSTRAINT "member_device_tokens_principal_type_ck" CHECK ("principal_type" IN ('member', 'admin')),
	CONSTRAINT "member_device_tokens_platform_ck" CHECK ("platform" IN ('android', 'ios')),
	CONSTRAINT "member_device_tokens_status_ck" CHECK ("status" IN ('active', 'stale', 'invalid')),
	-- A member principal MUST carry the RTBF-cascade FK; an admin principal (not a member row) MUST NOT.
	-- Without this, a malformed member row with member_id NULL would silently skip the RTBF cascade,
	-- leaving Tier-1 ciphertext behind after the member's withdrawn→anonymized transition (Story 3.12).
	CONSTRAINT "member_device_tokens_principal_member_id_ck" CHECK (
		("principal_type" = 'member' AND "member_id" IS NOT NULL) OR
		("principal_type" = 'admin' AND "member_id" IS NULL)
	)
);
--> statement-breakpoint
-- FK → members.member_id (ON DELETE CASCADE: RTBF row-deletes the member, Story 3.12). NULLABLE —
-- member principals set it; admin principals leave it NULL (an admin is not a member row).
ALTER TABLE "member_device_tokens" ADD CONSTRAINT "member_device_tokens_member_id_members_member_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("member_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
-- Index the FK column — Postgres does NOT auto-index FK columns, and the RTBF cascade delete on `members`
-- would otherwise table-scan `member_device_tokens` to find children to cascade.
CREATE INDEX "member_device_tokens_member_id_idx" ON "member_device_tokens" ("member_id");--> statement-breakpoint
-- Index the Class C cleanup job's filter shape (status, last_seen_at) — without it, purgeExpiredDeviceTokens
-- table-scans as the table grows (every device/app-open accumulates a row).
CREATE INDEX "member_device_tokens_status_last_seen_idx" ON "member_device_tokens" ("status", "last_seen_at");--> statement-breakpoint
-- GRANT (SELECT list active; INSERT register; UPDATE rebuild-stale + markInvalid + last_seen bump;
-- DELETE cleanup-job prune + RTBF cascade). Policies bind TO twt_app, so grants go only to twt_app.
GRANT SELECT, INSERT, UPDATE, DELETE ON "member_device_tokens" TO twt_app;--> statement-breakpoint
ALTER TABLE "member_device_tokens" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "member_device_tokens" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
-- Tenant-isolation policies (mirror member_nominees). Story 1.6 closed-failure construct:
-- unset scope → '' → nullif → NULL → 0 rows (quiet fail-closed). Admin tokens set app.pariwar_id
-- to the nil-UUID admin-global namespace, so the same predicate isolates them uniformly.
CREATE POLICY "member_device_tokens_tenant_isolation_select" ON "member_device_tokens" AS PERMISSIVE FOR SELECT TO "twt_app" USING (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "member_device_tokens_tenant_isolation_write" ON "member_device_tokens" AS PERMISSIVE FOR ALL TO "twt_app" USING (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid) WITH CHECK (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid);
