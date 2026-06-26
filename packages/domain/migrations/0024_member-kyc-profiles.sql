-- Migration 0024 — member_kyc_profiles (the verified/declared member KYC profile;
-- Story 3.3b, Task 1):
--   · TENANT-ISOLATED (mirror member_identities / kyc_transactions tenant-isolation):
--     one KYC profile per member in one Pariwar; in-scope confirm/manual write + status
--     read run under that Pariwar's app.pariwar_id.
--   · The FIRST member-PII table after member_identities. name/dob/photo are Tier-1
--     envelope ciphertext (stored as text); masked-Aadhaar is Tier-3 plaintext (last-4).
--
-- ⚠ DO NOT REGENERATE THIS FILE with `db:generate`.
-- drizzle-kit skips an already-applied migration by journal `when` (NOT by SQL hash), and
-- the meta/ snapshots stop at 0020 (0021-0023 are hand-authored, snapshot-absent — known
-- drift, NOT gate-blocking). A `db:generate` now would diff CURRENT schema against
-- 0020_snapshot.json and wrongly re-emit applied 0021-0023 → 42P07. So this file is
-- HAND-AUTHORED, mirroring the 0023 tenant-isolated table pattern + the 0019 member-auth
-- carve-out hand-supplements (GRANT + FORCE + POLICY drizzle-kit does not emit). Roles
-- (twt_app) exist from 0002. No snapshot is emitted (matching 0021-0023); `drizzle-kit
-- check` tolerates the absence.

-- ── Enums (verification_strength / source) ──────────────────────────────────────────
-- Value-aligned with the contracts KycVerificationStrength. Stable, low-churn label sets
-- → pgEnums (unlike kyc_transactions.provider/intent/status, which stay text for the
-- FR-58C swap seam).
CREATE TYPE "member_kyc_verification_strength" AS ENUM ('aadhaar_kyc', 'self_declared', 'unverified');--> statement-breakpoint
CREATE TYPE "member_kyc_source" AS ENUM ('digilocker', 'manual');--> statement-breakpoint

-- ── member_kyc_profiles (TENANT-ISOLATED member KYC profile) ─────────────────────────
CREATE TABLE "member_kyc_profiles" (
	"member_id" uuid PRIMARY KEY NOT NULL,
	"pariwar_id" uuid NOT NULL,
	"name_ciphertext" text NOT NULL,
	"dob_ciphertext" text NOT NULL,
	"photo_ciphertext" text,
	"aadhaar_masked_id" text,
	"verification_strength" "member_kyc_verification_strength" NOT NULL,
	"source" "member_kyc_source" NOT NULL,
	"trustee_verified" boolean DEFAULT false NOT NULL,
	"kyc_transaction_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
-- FK → members.member_id (ON DELETE CASCADE: RTBF row-deletes the member, Story 3.12).
ALTER TABLE "member_kyc_profiles" ADD CONSTRAINT "member_kyc_profiles_member_id_members_member_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("member_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
-- GRANT (SELECT/INSERT/UPDATE/DELETE — confirm/manual UPSERT, trustee-verify UPDATE later,
-- RTBF cascade DELETE). Policies bind TO twt_app, so grants go only to twt_app.
GRANT SELECT, INSERT, UPDATE, DELETE ON "member_kyc_profiles" TO twt_app;--> statement-breakpoint
ALTER TABLE "member_kyc_profiles" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "member_kyc_profiles" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
-- Tenant-isolation policies (mirror member_identities / kyc_transactions). Story 1.6
-- closed-failure construct: unset scope → '' → nullif → NULL → 0 rows (quiet fail-closed).
CREATE POLICY "member_kyc_profiles_tenant_isolation_select" ON "member_kyc_profiles" AS PERMISSIVE FOR SELECT TO "twt_app" USING (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "member_kyc_profiles_tenant_isolation_write" ON "member_kyc_profiles" AS PERMISSIVE FOR ALL TO "twt_app" USING (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid) WITH CHECK (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid);
