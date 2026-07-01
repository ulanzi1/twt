-- Migration 0031 — member_postings (the member's posting / transfer-in-out history; Story 3.9,
-- Task 3):
--   · TENANT-ISOLATED (mirror member_addresses / member_medical_disclosures): N postings per
--     member in one Pariwar; in-scope append write + latest read run under app.pariwar_id.
--   · district is PLAINTEXT non-PII geographic data (safe in column + event payload — Dev Notes
--     §"Posting PII tier"). pariwar_ref is an OPTIONAL forward-compat reference (no tenant move in
--     v1-S). is_retirement is a NON-PII boolean lifecycle marker — Epic 4 Story 4.5 computes
--     retired_at from the FIRST row where is_retirement = true.
--   · PER-ROW PK (posting_id) — APPEND-ONLY history (AC1 "prior value preserved"). ⇒ GRANT is
--     SELECT, INSERT ONLY (no UPDATE, no DELETE beyond the FK cascade — immutable history).
--   · FK member_id → members.member_id ON DELETE CASCADE (RTBF, Story 3.12).
--
-- ⚠ DO NOT REGENERATE THIS FILE with `db:generate`.
-- drizzle-kit skips an already-applied migration by journal `when` (NOT by SQL hash), and the
-- meta/ snapshots stop at 0020 (0021-0031 are hand-authored, snapshot-absent — known drift, NOT
-- gate-blocking). A `db:generate` would diff CURRENT schema against 0020_snapshot.json and wrongly
-- re-emit applied 0021-0030 → 42P07. HAND-AUTHORED, mirroring 0030_member-addresses' cadence. No
-- snapshot emitted. Roles (twt_app) exist from 0002.

-- ── member_postings (TENANT-ISOLATED member posting/transfer history) ────────────────
CREATE TABLE "member_postings" (
	"posting_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"member_id" uuid NOT NULL,
	"pariwar_id" uuid NOT NULL,
	"district" text NOT NULL,
	"pariwar_ref" text,
	"is_retirement" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
-- FK → members.member_id (ON DELETE CASCADE: RTBF row-deletes the member, Story 3.12).
ALTER TABLE "member_postings" ADD CONSTRAINT "member_postings_member_id_members_member_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("member_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
-- The history-read lookup key (walk a member's postings within a Pariwar).
CREATE INDEX "member_postings_pariwar_member_idx" ON "member_postings" USING btree ("pariwar_id","member_id");--> statement-breakpoint
-- GRANT (SELECT/INSERT ONLY — append-only immutable history; mirror member_addresses).
GRANT SELECT, INSERT ON "member_postings" TO twt_app;--> statement-breakpoint
ALTER TABLE "member_postings" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "member_postings" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
-- Tenant-isolation policies (mirror member_addresses). Story 1.6 closed-failure construct.
CREATE POLICY "member_postings_tenant_isolation_select" ON "member_postings" AS PERMISSIVE FOR SELECT TO "twt_app" USING (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "member_postings_tenant_isolation_write" ON "member_postings" AS PERMISSIVE FOR ALL TO "twt_app" USING (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid) WITH CHECK (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid);
