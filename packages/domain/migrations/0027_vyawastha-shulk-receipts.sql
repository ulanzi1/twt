-- Migration 0027 — vyawastha_shulk_receipts + member_attribution + members.lock_in_days_at_join
-- (Story 3.6b, Task 1):
--   · vyawastha_shulk_receipts — TENANT-ISOLATED. The signup ₹110 Vyawastha Shulk receipt, persisted
--     on EVERY successful UTR self-attest (AR-67 indefinite retention; forward-compat for FR-100
--     future-benefit eligibility reconstruction). `tr` is the UPI Intent idempotency key — UNIQUE so
--     a re-confirm with the same `tr` returns the existing receipt rather than inserting a second one
--     (AC1). Append-only durable fact: GRANT SELECT, INSERT only (immutable like the receipt's role).
--   · member_attribution — TENANT-ISOLATED, the Reference Code PORT SEAM (D2). Captures the optional
--     6-digit code as `attribution_source` with NO field-worker FK (Epic 13's registry is not built)
--     and NO validation. GRANT SELECT, INSERT.
--   · members.lock_in_days_at_join — a DERIVED query optimization (Story 4.1 read-cache) of the
--     authoritative `member.lock_in_entered` event payload. Nullable (populated only at lock-in
--     entry; pre-lock-in members carry NULL). Written by a plain in-scope-tx UPDATE — the 0018
--     `members_reject_unguarded_state_write` trigger RAISEs only when `state` changes, so a
--     non-`state` column update needs no projector guard (R3).
--
-- ⚠ DO NOT REGENERATE THIS FILE with `db:generate`.
-- drizzle-kit skips an already-applied migration by journal `when` (NOT by SQL hash), and the meta/
-- snapshots stop at 0020 (0021-0027 are hand-authored, snapshot-absent — known drift, NOT
-- gate-blocking). A `db:generate` now would diff CURRENT schema against 0020_snapshot.json and
-- wrongly re-emit applied 0021-0026 → 42P07. So this file is HAND-AUTHORED, mirroring
-- 0026_member-medical-disclosures' tenant-isolated table + GRANT + FORCE + POLICY pattern. Roles
-- (twt_app) exist from 0002. No snapshot is emitted (matching 0021-0026); `drizzle-kit check`
-- tolerates it.

-- ── vyawastha_shulk_receipts (TENANT-ISOLATED, append-only signup-fee receipt) ───
CREATE TABLE "vyawastha_shulk_receipts" (
	"receipt_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"member_id" uuid NOT NULL,
	"pariwar_id" uuid NOT NULL,
	"tr" text NOT NULL,
	"utr" text NOT NULL,
	"amount_inr" integer NOT NULL,
	"payment_method" text NOT NULL,
	"paid_at" timestamp with time zone DEFAULT now() NOT NULL,
	"valid_through" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
-- FK → members.member_id (ON DELETE CASCADE: RTBF row-deletes the member, Story 3.12).
ALTER TABLE "vyawastha_shulk_receipts" ADD CONSTRAINT "vyawastha_shulk_receipts_member_id_members_member_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("member_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
-- The UPI Intent idempotency key (AC1): a re-confirm with the same `tr` hits this UNIQUE constraint;
-- the receipt-write accessor narrows the 23505 to THIS constraint name → the idempotent re-confirm
-- path (mirror 3.6a's isMemberIdentityDuplicate narrowing — never swallow an unrelated violation).
ALTER TABLE "vyawastha_shulk_receipts" ADD CONSTRAINT "vyawastha_shulk_receipts_tr_uq" UNIQUE ("tr");--> statement-breakpoint
-- The status / idempotency lookup key (a member's receipts within a Pariwar).
CREATE INDEX "vyawastha_shulk_receipts_pariwar_member_idx" ON "vyawastha_shulk_receipts" USING btree ("pariwar_id","member_id");--> statement-breakpoint
-- GRANT (SELECT/INSERT ONLY — receipts are immutable durable facts, AR-67 indefinite retention: confirm
-- INSERT, status/idempotency SELECT, RTBF cascade DELETE via the member FK. NO UPDATE, NO direct DELETE
-- — mirror the member_medical_disclosures append-only rationale). Policies bind TO twt_app.
GRANT SELECT, INSERT ON "vyawastha_shulk_receipts" TO twt_app;--> statement-breakpoint
ALTER TABLE "vyawastha_shulk_receipts" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "vyawastha_shulk_receipts" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
-- Tenant-isolation policies (mirror member_medical_disclosures). Story 1.6 closed-failure construct:
-- unset scope → '' → nullif → NULL → 0 rows (quiet fail-closed).
CREATE POLICY "vyawastha_shulk_receipts_tenant_isolation_select" ON "vyawastha_shulk_receipts" AS PERMISSIVE FOR SELECT TO "twt_app" USING (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "vyawastha_shulk_receipts_tenant_isolation_write" ON "vyawastha_shulk_receipts" AS PERMISSIVE FOR ALL TO "twt_app" USING (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid) WITH CHECK (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid);--> statement-breakpoint

-- ── member_attribution (TENANT-ISOLATED, the Reference Code port seam — D2) ───────
-- Minimal: the optional 6-digit code is stored as attribution_source with NO FK to any field-worker /
-- Epic-13 table (none exists) and NO validation against an allocation registry. One row per capture.
CREATE TABLE "member_attribution" (
	"attribution_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"member_id" uuid NOT NULL,
	"pariwar_id" uuid NOT NULL,
	"attribution_source" text NOT NULL,
	"captured_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
-- FK → members.member_id (ON DELETE CASCADE: RTBF, Story 3.12). NO FK to any field-worker registry (D2).
ALTER TABLE "member_attribution" ADD CONSTRAINT "member_attribution_member_id_members_member_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("member_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
-- A member captures the Reference Code once at signup; UNIQUE enforces one row per member.
-- Without this, a locked-in member calling confirm again with a referenceCode would accumulate
-- multiple attribution rows, creating ambiguity for Epic 13's attribution chain.
ALTER TABLE "member_attribution" ADD CONSTRAINT "member_attribution_member_uq" UNIQUE ("member_id");--> statement-breakpoint
CREATE INDEX "member_attribution_pariwar_member_idx" ON "member_attribution" USING btree ("pariwar_id","member_id");--> statement-breakpoint
GRANT SELECT, INSERT ON "member_attribution" TO twt_app;--> statement-breakpoint
ALTER TABLE "member_attribution" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "member_attribution" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "member_attribution_tenant_isolation_select" ON "member_attribution" AS PERMISSIVE FOR SELECT TO "twt_app" USING (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "member_attribution_tenant_isolation_write" ON "member_attribution" AS PERMISSIVE FOR ALL TO "twt_app" USING (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid) WITH CHECK (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid);--> statement-breakpoint

-- ── members.lock_in_days_at_join (the FR-8 lock-in snapshot read-cache; R3) ───────
-- Nullable: only populated at lock-in entry. A DERIVED projection of the member.lock_in_entered event
-- payload (the authoritative record); written by a plain in-scope-tx UPDATE. The 0018 state-writer
-- trigger fires only on `state` changes, so this non-`state` column add + later UPDATE are trigger-safe.
ALTER TABLE "members" ADD COLUMN "lock_in_days_at_join" smallint;
