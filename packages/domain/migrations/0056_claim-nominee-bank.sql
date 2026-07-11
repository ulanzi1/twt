-- Migration 0056 — claim-time nominee bank accounts (Story 6.8, Task 3).
-- ONE net-new table + a composite PK + tenant-isolation RLS, in ONE hand-authored file:
--   · claim_nominee_bank_accounts — ONE row per disbursement account, ranked #1 (primary) / #2
--     (secondary) on the COMPOSITE PK (claim_case_id, account_rank) (the member_nominees
--     (member_id, rank) precedent — a claim has at most one #1 and one #2). The two accounts are a
--     CLAIM-SCOPED dual-account disbursement channel (a RBI-UPI-per-payee-per-day-limit workaround +
--     failover, D1 APPROVED) — NOT one-row-per-nominee, NOT the 75/25 split, NO nominee_rank column,
--     NO FK to member_nominees. Tier-1 ciphertext (holder name / account number / IFSC) +
--     bank_name/branch Tier-3 plaintext (public, IFSC-derived) + ifsc_validated (non-PII flag).
--
-- ⚠ DO NOT REGENERATE THIS FILE with `db:generate` (same discipline as 0051/0052/0053/0054/0055):
-- the drizzle snapshot baseline is frozen at 0020, so a regenerate emits a bloated catch-up
-- migration and drizzle-kit skips an already-applied migration by journal `when` (NOT SQL hash),
-- silently dropping the hand-supplements + risking 42P07 on re-run. HAND-AUTHORED: carries ONLY the
-- nominee-bank DDL (the CREATE TABLE + the composite PK + the claims FK + ENABLE/FORCE RLS + the
-- index + the two CREATE POLICY declarations from
-- packages/domain/src/policies/claim-nominee-bank-rls.ts), wrapped with the hand-supplemented
-- GRANT (SELECT/INSERT/UPDATE/DELETE) + FORCE DDL (mirrors 0051–0055).
--
-- Hand-supplements (relative to a generated DDL):
--   1. GRANT SELECT, INSERT, UPDATE, DELETE on the table to twt_app.
--      DELETE is included here (unlike 0055): the writer is LATEST-WINS replace — it DELETEs the
--      existing account rows for the claim then re-INSERTs the two current ones (an edit via
--      <NomineeDetailEditor> cleanly replaces the prior pair, never appends orphans). The durable
--      evidentiary record is the `claim.nominee_bank_recorded` events_log event, not the row history.
--   2. ALTER TABLE ... FORCE ROW LEVEL SECURITY — applies RLS even to the (non-superuser) table owner.
--      ENABLE + FORCE kept adjacent (mirror 0051–0055).
--
-- ⚠ NO claims.current_state-style write-rejection trigger here: this table is NOT an event-sourced
-- state cache — bank collection is an ANNOTATION (D2). The claim's own lifecycle state stays
-- trigger-guarded on `claims.current_state` (migration 0051); the nominee-bank writer advances
-- NOTHING on it — it emits the identity annotation event `claim.nominee_bank_recorded` ONLY via
-- `claim.projectClaimState`.
--
-- The claims table + roles (twt_app) already exist (migrations 0051 / 0002). The FK
-- (claim_nominee_bank_accounts.claim_case_id → claims ON DELETE CASCADE) is emitted inline. No
-- snapshot file is emitted (baseline frozen at 0020; mirror 0021–0055).

CREATE TABLE "claim_nominee_bank_accounts" (
	"claim_case_id" uuid NOT NULL,
	"pariwar_id" uuid NOT NULL,
	"account_rank" smallint NOT NULL,
	"account_holder_name_ciphertext" text NOT NULL,
	"account_number_ciphertext" text NOT NULL,
	"ifsc_ciphertext" text NOT NULL,
	"bank_name" text NOT NULL,
	"branch" text,
	"ifsc_validated" boolean DEFAULT false NOT NULL,
	"recorded_by_actor" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "claim_nominee_bank_accounts_claim_case_id_account_rank_pk" PRIMARY KEY("claim_case_id","account_rank")
);
--> statement-breakpoint
ALTER TABLE "claim_nominee_bank_accounts" ADD CONSTRAINT "claim_nominee_bank_accounts_claim_case_id_fk" FOREIGN KEY ("claim_case_id") REFERENCES "public"."claims"("claim_case_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
-- (1) Table privileges for the app role. DELETE included — the writer is latest-wins delete-then-insert.
GRANT SELECT, INSERT, UPDATE, DELETE ON "claim_nominee_bank_accounts" TO twt_app;--> statement-breakpoint
-- (2) Turn RLS on + FORCE it even for the (non-superuser) table owner (kept adjacent).
ALTER TABLE "claim_nominee_bank_accounts" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "claim_nominee_bank_accounts" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
-- Per-tenant scans / RLS-aware planner hint + the read accessor filter (pariwar_id + claim_case_id).
CREATE INDEX "claim_nominee_bank_accounts_pariwar_claim_idx" ON "claim_nominee_bank_accounts" USING btree ("pariwar_id","claim_case_id");--> statement-breakpoint
-- Tenant-isolation RLS (mirror claims-rls EXACTLY): SELECT + write (for ALL) via the
-- Story 1.6 closed-failure construct `pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid`.
CREATE POLICY "claim_nominee_bank_accounts_tenant_isolation_select" ON "claim_nominee_bank_accounts" AS PERMISSIVE FOR SELECT TO "twt_app" USING (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "claim_nominee_bank_accounts_tenant_isolation_write" ON "claim_nominee_bank_accounts" AS PERMISSIVE FOR ALL TO "twt_app" USING (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid) WITH CHECK (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid);
