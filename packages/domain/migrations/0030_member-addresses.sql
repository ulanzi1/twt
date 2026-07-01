-- Migration 0030 — member_addresses (the member's address history; Story 3.9, Task 2):
--   · TENANT-ISOLATED (mirror member_medical_disclosures tenant-isolation): N addresses per
--     member in one Pariwar; in-scope append write + latest read run under that Pariwar's
--     app.pariwar_id.
--   · address_line_ciphertext is Tier-1 envelope ciphertext (stored as text); locale is NON-PII.
--   · PER-ROW PK (address_id) — APPEND-ONLY history (NOT latest-wins like member_nominees): AC1
--     requires the prior address be PRESERVED as history (not overwritten). ⇒ GRANT is SELECT,
--     INSERT ONLY (no UPDATE, no DELETE beyond the FK cascade — immutable history, mirror the
--     member_medical_disclosures rationale). The "current" address is the newest row by created_at.
--   · FK member_id → members.member_id ON DELETE CASCADE (RTBF, Story 3.12).
--
-- ⚠ DO NOT REGENERATE THIS FILE with `db:generate`.
-- drizzle-kit skips an already-applied migration by journal `when` (NOT by SQL hash), and the
-- meta/ snapshots stop at 0020 (0021-0030 are hand-authored, snapshot-absent — known drift, NOT
-- gate-blocking). A `db:generate` now would diff CURRENT schema against 0020_snapshot.json and
-- wrongly re-emit applied 0021-0029 → 42P07. So this file is HAND-AUTHORED, mirroring
-- 0026_member-medical-disclosures' tenant-isolated table pattern + the GRANT + FORCE + POLICY
-- hand-supplements drizzle-kit does not emit. Roles (twt_app) exist from 0002. No snapshot emitted.

-- ── member_addresses (TENANT-ISOLATED member address history) ────────────────────────
-- No enums: locale is plain text (the value set 'hi' | 'en' is constrained in the contracts enum
-- for data quality, NOT at the DB — the kyc_transactions.status posture).
CREATE TABLE "member_addresses" (
	"address_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"member_id" uuid NOT NULL,
	"pariwar_id" uuid NOT NULL,
	"address_line_ciphertext" text NOT NULL,
	"locale" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
-- FK → members.member_id (ON DELETE CASCADE: RTBF row-deletes the member, Story 3.12).
ALTER TABLE "member_addresses" ADD CONSTRAINT "member_addresses_member_id_members_member_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("member_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
-- The history-read lookup key (walk a member's addresses within a Pariwar).
CREATE INDEX "member_addresses_pariwar_member_idx" ON "member_addresses" USING btree ("pariwar_id","member_id");--> statement-breakpoint
-- GRANT (SELECT/INSERT ONLY — append-only immutable history: update INSERT, latest SELECT, RTBF
-- cascade DELETE via the member FK. NO UPDATE, NO direct DELETE — mirror member_medical_disclosures).
-- Policies bind TO twt_app, so grants go only to twt_app.
GRANT SELECT, INSERT ON "member_addresses" TO twt_app;--> statement-breakpoint
ALTER TABLE "member_addresses" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "member_addresses" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
-- Tenant-isolation policies (mirror member_medical_disclosures). Story 1.6 closed-failure construct:
-- unset scope → '' → nullif → NULL → 0 rows (quiet fail-closed).
CREATE POLICY "member_addresses_tenant_isolation_select" ON "member_addresses" AS PERMISSIVE FOR SELECT TO "twt_app" USING (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "member_addresses_tenant_isolation_write" ON "member_addresses" AS PERMISSIVE FOR ALL TO "twt_app" USING (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid) WITH CHECK (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid);
