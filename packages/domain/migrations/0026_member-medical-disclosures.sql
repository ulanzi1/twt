-- Migration 0026 — member_medical_disclosures (the member's medical-disclosure
-- history; Story 3.5, Task 1):
--   · TENANT-ISOLATED (mirror member_nominees / member_kyc_profiles tenant-isolation):
--     N disclosures per member in one Pariwar; in-scope append write + history read run
--     under that Pariwar's app.pariwar_id.
--   · The THIRD member-PII table after member_kyc_profiles + member_nominees.
--     disclosed_conditions + additional_context are Tier-1 envelope ciphertext (stored as
--     text); ima_list_version / acknowledgment_text_locale / condition_count are NON-PII.
--   · PER-DISCLOSURE PK (disclosure_id) — APPEND-ONLY history (NOT latest-wins like
--     member_nominees): Epic 4 concealment evaluation walks the FULL disclosure history
--     (epics L1715, L1956), so every disclosure row is preserved with its ima_list_version +
--     timestamp. ⇒ GRANT is SELECT, INSERT ONLY (no UPDATE, no DELETE beyond the FK cascade —
--     immutable history, mirror the consent-records "no DELETE" rationale).
--   · FK member_id → members.member_id ON DELETE CASCADE (RTBF, Story 3.12).
--   · FK consent_id → consent_records.consent_id (the consent recorded in the same submit tx;
--     insert consent FIRST, then the disclosure carries its id). No ON DELETE (consents are
--     never deleted — a deleted consent is a compliance violation, so the FK is a hard guard).
--
-- ⚠ DO NOT REGENERATE THIS FILE with `db:generate`.
-- drizzle-kit skips an already-applied migration by journal `when` (NOT by SQL hash), and
-- the meta/ snapshots stop at 0020 (0021-0026 are hand-authored, snapshot-absent — known
-- drift, NOT gate-blocking). A `db:generate` now would diff CURRENT schema against
-- 0020_snapshot.json and wrongly re-emit applied 0021-0025 → 42P07. So this file is
-- HAND-AUTHORED, mirroring 0025_member-nominees' tenant-isolated table pattern + the GRANT +
-- FORCE + POLICY hand-supplements drizzle-kit does not emit. Roles (twt_app) exist from 0002.
-- No snapshot is emitted (matching 0021-0025); `drizzle-kit check` tolerates it.

-- ── member_medical_disclosures (TENANT-ISOLATED member medical-disclosure history) ───
-- No enums: acknowledgment_text_locale is plain text (the value set 'hi' | 'en' is
-- constrained in the contracts enum for data quality, NOT at the DB — the
-- kyc_transactions.status posture).
CREATE TABLE "member_medical_disclosures" (
	"disclosure_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"member_id" uuid NOT NULL,
	"pariwar_id" uuid NOT NULL,
	"ima_list_version" text NOT NULL,
	"disclosed_conditions_ciphertext" text NOT NULL,
	"additional_context_ciphertext" text,
	"condition_count" smallint NOT NULL,
	"acknowledged_at" timestamp with time zone DEFAULT now() NOT NULL,
	"acknowledgment_text_locale" text NOT NULL,
	"clause_version_id" uuid NOT NULL,
	"consent_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
-- FK → members.member_id (ON DELETE CASCADE: RTBF row-deletes the member, Story 3.12).
ALTER TABLE "member_medical_disclosures" ADD CONSTRAINT "member_medical_disclosures_member_id_members_member_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("member_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
-- FK → consent_records.consent_id (the consent recorded in the same submit tx). No ON DELETE
-- (consents are immutable — never deleted; the FK is a hard data-integrity guard).
ALTER TABLE "member_medical_disclosures" ADD CONSTRAINT "member_medical_disclosures_consent_id_consent_records_consent_id_fk" FOREIGN KEY ("consent_id") REFERENCES "public"."consent_records"("consent_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
-- The history-read lookup key (walk a member's disclosures within a Pariwar).
CREATE INDEX "member_medical_disclosures_pariwar_member_idx" ON "member_medical_disclosures" USING btree ("pariwar_id","member_id");--> statement-breakpoint
-- GRANT (SELECT/INSERT ONLY — append-only immutable history: submit INSERT, history SELECT,
-- RTBF cascade DELETE via the member FK. NO UPDATE, NO direct DELETE — mirror the consent-
-- records "no DELETE" rationale). Policies bind TO twt_app, so grants go only to twt_app.
GRANT SELECT, INSERT ON "member_medical_disclosures" TO twt_app;--> statement-breakpoint
ALTER TABLE "member_medical_disclosures" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "member_medical_disclosures" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
-- Tenant-isolation policies (mirror member_nominees). Story 1.6 closed-failure construct:
-- unset scope → '' → nullif → NULL → 0 rows (quiet fail-closed).
CREATE POLICY "member_medical_disclosures_tenant_isolation_select" ON "member_medical_disclosures" AS PERMISSIVE FOR SELECT TO "twt_app" USING (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "member_medical_disclosures_tenant_isolation_write" ON "member_medical_disclosures" AS PERMISSIVE FOR ALL TO "twt_app" USING (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid) WITH CHECK (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid);
