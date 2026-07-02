-- Migration 0032 — member_withdrawals (the voluntary-withdrawal record + 12-month rejoin lock;
-- Story 3.10, Task 1):
--   · TENANT-ISOLATED (mirror member_addresses / member_kyc_profiles tenant-isolation): the in-scope
--     confirm write runs under the member's app.pariwar_id. The signup rejoin-lock READ runs PRE-scope
--     on the BYPASSRLS servicePool (member-auth.repo.ts) — a cross-tenant read RLS cannot serve.
--   · SINGLE-ROW-per-member (PK = member_id) — NOT append-only history (contrast member_addresses /
--     member_postings). ⇒ GRANT is SELECT, INSERT, **UPDATE**: the aadhaar_hmac seam column is DESIGNED
--     to be backfilled by a later UPDATE (Story 3.3a — the architecture §2.12 Aadhaar-HMAC rejoin key),
--     and RTBF/anonymization (Story 3.12) may touch the row. This is the deliberate deviation from the
--     append-only Life Events tables (documented in the schema + policy headers).
--   · reason_code is NON-PII bounded text (contracts WithdrawalReasonCode; value set constrained in the
--     contract, not the DB — the member_addresses.locale posture). reason_text_ciphertext is Tier-1
--     envelope ciphertext (NEVER echoed / logged / in any event or audit payload — R1). aadhaar_hmac is
--     a NON-PII deterministic-HMAC forward-compat seam (NULL until a later story backfills it).
--   · FK member_id → members.member_id ON DELETE CASCADE (RTBF, Story 3.12).
--
-- ⚠ DO NOT REGENERATE THIS FILE with `db:generate`.
-- drizzle-kit skips an already-applied migration by journal `when` (NOT by SQL hash), and the meta/
-- snapshots stop at 0020 (0021-0032 are hand-authored, snapshot-absent — known drift, NOT gate-blocking).
-- A `db:generate` would diff CURRENT schema against 0020_snapshot.json and wrongly re-emit applied
-- 0021-0031 → 42P07. HAND-AUTHORED, mirroring 0030_member-addresses' cadence + GRANT/FORCE/POLICY
-- structure. No snapshot emitted. Roles (twt_app) exist from 0002.

-- ── member_withdrawals (TENANT-ISOLATED single-row-per-member withdrawal record) ──────
CREATE TABLE "member_withdrawals" (
	"member_id" uuid PRIMARY KEY NOT NULL,
	"pariwar_id" uuid NOT NULL,
	"reason_code" text,
	"reason_text_ciphertext" text,
	"withdrawn_at" timestamp with time zone NOT NULL,
	"rejoin_permitted_at" timestamp with time zone NOT NULL,
	"aadhaar_hmac" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
-- FK → members.member_id (ON DELETE CASCADE: RTBF row-deletes the member, Story 3.12).
ALTER TABLE "member_withdrawals" ADD CONSTRAINT "member_withdrawals_member_id_members_member_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("member_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
-- GRANT (SELECT/INSERT/UPDATE — DEVIATES from the append-only Life Events tables: the aadhaar_hmac
-- seam is backfill-designed (Story 3.3a UPDATE) and RTBF/anonymization may touch the row. NO direct
-- DELETE — RTBF removal is via the member FK cascade). Policies bind TO twt_app, so grants go to twt_app.
GRANT SELECT, INSERT, UPDATE ON "member_withdrawals" TO twt_app;--> statement-breakpoint
ALTER TABLE "member_withdrawals" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "member_withdrawals" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
-- Tenant-isolation policies (mirror member_addresses). Story 1.6 closed-failure construct:
-- unset scope → '' → nullif → NULL → 0 rows (quiet fail-closed).
CREATE POLICY "member_withdrawals_tenant_isolation_select" ON "member_withdrawals" AS PERMISSIVE FOR SELECT TO "twt_app" USING (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "member_withdrawals_tenant_isolation_write" ON "member_withdrawals" AS PERMISSIVE FOR ALL TO "twt_app" USING (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid) WITH CHECK (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid);--> statement-breakpoint
-- Index on pariwar_id: serves the RLS policy predicate scans + the signup LEFT JOIN that reads
-- rejoin_permitted_at cross-tenant on the BYPASSRLS servicePool (member-auth.repo.ts:73).
CREATE INDEX "member_withdrawals_pariwar_id_idx" ON "member_withdrawals" ("pariwar_id");
