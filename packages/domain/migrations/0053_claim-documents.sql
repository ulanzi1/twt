-- Migration 0053 — claim_documents: death-cert OCR + parity metadata (Story 6.5, Task 2).
-- One NET-NEW table + two NEW enums + tenant-isolation RLS. The FIRST object-storage
-- consumer (Decision D1): the document BYTES live in Google Cloud Storage; this table
-- persists ONLY the GCS object key + the Tier-1 extracted-field ciphertext + the NON-PII
-- parity outcome/flags/confidence + the verifier-review flag. NEVER the bytes.
--
-- ⚠ DO NOT REGENERATE THIS FILE with `db:generate` (same discipline as 0051/0052): the
-- drizzle snapshot baseline is frozen at 0020, so a regenerate emits a bloated catch-up
-- migration and drizzle-kit skips an already-applied migration by journal `when` (NOT SQL
-- hash), silently dropping the hand-supplements + risking 42P07 on re-run. HAND-AUTHORED:
-- carries ONLY the claim_documents DDL (the two CREATE TYPE enums + the CREATE TABLE +
-- ENABLE/FORCE RLS + the two indexes + the two CREATE POLICY declarations from
-- packages/domain/src/policies/claim-documents-rls.ts), wrapped with the hand-supplemented
-- GRANT (SELECT/INSERT/UPDATE, NOT DELETE) + FORCE DDL (mirrors 0051/0052).
--
-- Hand-supplements (relative to a generated DDL):
--   1. GRANT SELECT, INSERT, UPDATE on claim_documents to twt_app.
--      NOT DELETE: a claim-document metadata row is retained for audit (the verifier read
--      model + lineage). RTBF / GCS-object deletion is a separate concern (the storage
--      port's `delete` acts on the object, not this row); a future story grants DELETE if
--      the row itself must be purged.
--   2. ALTER TABLE ... FORCE ROW LEVEL SECURITY — applies RLS even to the (non-superuser)
--      table owner. ENABLE + FORCE kept adjacent (mirror 0051/0052).
--
-- ⚠ NO claims.current_state-style write-rejection trigger here: claim_documents has no
-- event-sourced state cache — it is ordinary tenant-isolated metadata. The claim's own
-- lifecycle state stays trigger-guarded on `claims.current_state` (migration 0051); the
-- OCR parity job advances it ONLY via `claim.projectClaimState` (the `claim.documents_received`
-- append), never by writing this table.
--
-- The claims table + roles (twt_app) already exist (migrations 0051 / 0002). The FK
-- `claim_documents.claim_case_id → claims.claim_case_id` (ON DELETE CASCADE) is emitted
-- inline. No snapshot file is emitted (baseline frozen at 0020; mirror 0021–0052).

CREATE TYPE "public"."claim_document_type" AS ENUM('death_certificate', 'ground_inspection_photo', 'hospital_record');--> statement-breakpoint
CREATE TYPE "public"."claim_document_parity_outcome" AS ENUM('match', 'mismatch', 'ambiguous');--> statement-breakpoint
CREATE TABLE "claim_documents" (
	"claim_document_id" uuid PRIMARY KEY NOT NULL,
	"claim_case_id" uuid NOT NULL,
	"pariwar_id" uuid NOT NULL,
	"document_type" "claim_document_type" NOT NULL,
	"storage_object_key" text NOT NULL,
	"content_type" text NOT NULL,
	"byte_size" integer NOT NULL,
	"deceased_name_ciphertext" text,
	"dob_ciphertext" text,
	"date_of_death_ciphertext" text,
	"issuing_authority_ciphertext" text,
	"certificate_number_ciphertext" text,
	"parity_outcome" "claim_document_parity_outcome" NOT NULL,
	"parity_flags" jsonb NOT NULL,
	"ocr_confidence" double precision NOT NULL,
	"verifier_review_required" boolean NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "claim_documents_claim_case_id_document_type_uq" UNIQUE("claim_case_id","document_type")
);
--> statement-breakpoint
ALTER TABLE "claim_documents" ADD CONSTRAINT "claim_documents_claim_case_id_claims_claim_case_id_fk" FOREIGN KEY ("claim_case_id") REFERENCES "public"."claims"("claim_case_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
-- (1) Table privileges for the app role (SELECT/INSERT/UPDATE, NOT DELETE — the metadata
-- row is retained for audit; the OCR job upserts one row per (claim, document_type)).
GRANT SELECT, INSERT, UPDATE ON "claim_documents" TO twt_app;--> statement-breakpoint
-- (2) Turn RLS on + FORCE it even for the (non-superuser) table owner (kept adjacent).
ALTER TABLE "claim_documents" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "claim_documents" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
-- Per-tenant scans + the verifier read-model / idempotency-upsert claim filter.
CREATE INDEX "claim_documents_pariwar_id_idx" ON "claim_documents" USING btree ("pariwar_id");--> statement-breakpoint
CREATE INDEX "claim_documents_claim_case_id_idx" ON "claim_documents" USING btree ("claim_case_id");--> statement-breakpoint
-- Tenant-isolation RLS (mirror claims-rls EXACTLY): SELECT + write (for ALL) via the
-- Story 1.6 closed-failure construct `pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid`.
CREATE POLICY "claim_documents_tenant_isolation_select" ON "claim_documents" AS PERMISSIVE FOR SELECT TO "twt_app" USING (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "claim_documents_tenant_isolation_write" ON "claim_documents" AS PERMISSIVE FOR ALL TO "twt_app" USING (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid) WITH CHECK (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid);
