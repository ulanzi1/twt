-- Migration 0025 — member_nominees (the member's declared nominee row-set;
-- Story 3.4, Task 1):
--   · TENANT-ISOLATED (mirror member_kyc_profiles / member_identities tenant-isolation):
--     1–2 nominees per member in one Pariwar; in-scope declare write (delete-then-insert,
--     latest-wins) + status read run under that Pariwar's app.pariwar_id.
--   · The SECOND member-PII table after member_kyc_profiles. name/mobile/address are Tier-1
--     envelope ciphertext (stored as text); relationship is Tier-3 plaintext text.
--   · COMPOSITE PK (member_id, rank) — a member has 1–2 nominees, so member_id alone is not
--     unique (cf. member_kyc_profiles' single-column member_id PK). split_pct is SERVER-
--     derived (75/25 | 100), never client-supplied (R4).
--
-- ⚠ DO NOT REGENERATE THIS FILE with `db:generate`.
-- drizzle-kit skips an already-applied migration by journal `when` (NOT by SQL hash), and
-- the meta/ snapshots stop at 0020 (0021-0025 are hand-authored, snapshot-absent — known
-- drift, NOT gate-blocking). A `db:generate` now would diff CURRENT schema against
-- 0020_snapshot.json and wrongly re-emit applied 0021-0024 → 42P07. So this file is
-- HAND-AUTHORED, mirroring 0024_member-kyc-profiles' tenant-isolated table pattern + the
-- GRANT + FORCE + POLICY hand-supplements drizzle-kit does not emit. Roles (twt_app) exist
-- from 0002. No snapshot is emitted (matching 0021-0024); `drizzle-kit check` tolerates it.

-- ── member_nominees (TENANT-ISOLATED member nominee declaration) ─────────────────────
-- No enums: relationship is plain Tier-3 text (the value set is constrained in the
-- contracts enum for data quality, NOT at the DB — the kyc_transactions.status posture).
CREATE TABLE "member_nominees" (
	"member_id" uuid NOT NULL,
	"pariwar_id" uuid NOT NULL,
	"rank" smallint NOT NULL,
	"name_ciphertext" text NOT NULL,
	"relationship" text NOT NULL,
	"mobile_ciphertext" text NOT NULL,
	"address_ciphertext" text,
	"split_pct" smallint NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "member_nominees_member_id_rank_pk" PRIMARY KEY("member_id","rank")
);
--> statement-breakpoint
-- FK → members.member_id (ON DELETE CASCADE: RTBF row-deletes the member, Story 3.12).
ALTER TABLE "member_nominees" ADD CONSTRAINT "member_nominees_member_id_members_member_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("member_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
-- GRANT (SELECT/INSERT/DELETE — declare INSERT, latest-wins DELETE, status SELECT, RTBF
-- cascade DELETE; UPDATE for parity with the kyc grant though the writer replaces rows).
-- Policies bind TO twt_app, so grants go only to twt_app.
GRANT SELECT, INSERT, UPDATE, DELETE ON "member_nominees" TO twt_app;--> statement-breakpoint
ALTER TABLE "member_nominees" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "member_nominees" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
-- Tenant-isolation policies (mirror member_kyc_profiles). Story 1.6 closed-failure
-- construct: unset scope → '' → nullif → NULL → 0 rows (quiet fail-closed).
CREATE POLICY "member_nominees_tenant_isolation_select" ON "member_nominees" AS PERMISSIVE FOR SELECT TO "twt_app" USING (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "member_nominees_tenant_isolation_write" ON "member_nominees" AS PERMISSIVE FOR ALL TO "twt_app" USING (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid) WITH CHECK (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid);
