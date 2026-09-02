-- 0113 — `pariwar_nominee_bank_masking_schedule`: the per-Pariwar NOMINEE-BANK MASKING SCHEDULE.
--
-- Story 11b.3a (Task 1; AC3). ONE table + ONE enum. Governance of record: `2026-08-28-160`
-- cl.10(b)-(d),(g) (Trustee-ratified) · `2026-09-02-178` (Trust centrally, super_admin) ·
-- `2026-09-02-179` cl.1 (D8-default FAIL-OPEN) · `2026-09-02-183` (this story's Task 0 write).
--
-- ── ⛔⛔ WHY IT IS A SCHEDULE AND NOT A BOOLEAN ─────────────────────────────────────────────────
-- `2026-08-28-160` cl.10(d), verbatim: policy must move `full public disclosure -> shorter
-- post-campaign exposure -> immediate masking -> permanent masked presentation` WITHOUT redesigning
-- the underlying bank-detail record and WITHOUT a schema change => "configuration over one record,
-- never a second record and never a boolean. A later 'simplification' to a boolean is a DEFECT, not
-- a cleanup."
-- => `claim_nominee_bank_accounts` is NOT TOUCHED by this migration. No `is_masked` column is added,
-- no masked copy of a bank row is written, and cl.10(g) keeps the complete details in the protected
-- internal record: masking is a PROJECTION at the API boundary, never a deletion or an overwrite.
--
-- ── The shape the Panel named ───────────────────────────────────────────────────────────────────
-- `2026-08-28-160`'s own reference list calls `pool_fixed_amount_schedule` "the precedent for clause
-- 10(c)/(d)". So this is that per-Pariwar EFFECTIVE-WINDOW record: a monotonic `version` per
-- Pariwar, a [effective_from, effective_until) window, AT MOST ONE open-ended row per Pariwar
-- (partial unique), and a resolver that returns the row whose window contains `asOf`. That is what
-- makes cl.10(c)'s "reversible and re-configurable" STRUCTURAL rather than a promise.
--
-- ── THREE SETTINGS, TWO COLUMNS ────────────────────────────────────────────────────────────────
-- cl.10(c) names three: `0 days` (mask immediately) / `N days` / `permanent masking`. They are
-- carried by a DISCRIMINATOR (`masking_mode`) plus a payload (`mask_after_days`):
--   · after_days + 0   -> "mask immediately"  (a value an admin CHOSE; cl.10(b) forbids the code
--                          assuming it)
--   · after_days + N   -> "shorter post-campaign exposure"
--   · permanent        -> the ladder's terminal rung
-- The CHECK below makes the coupling a DB fact. NO `immediate` enum value is minted: it would be a
-- second spelling of `after_days: 0`.
--
-- ⚠ NO ROW MEANS VISIBLE. `D8-default` was RULED FAIL-OPEN by the Trustee Panel (`2026-09-02-179`
-- cl.1) with its cost in front of them: `-178` put authority centrally, so a Pariwar cannot set its
-- own window and fail-open governs EVERY Pariwar until the Trust acts.
--
-- ⚠ A CHANGE HERE IS NOT IMMEDIATE ON THE PUBLIC PAGE. `/sahyog-vivran/[poolCanonicalIdentifier]`
-- is edge-cacheable at s-maxage=300, so the previous projection keeps being served from every warm
-- PoP for up to five minutes — and here what is served stale is a FULL ACCOUNT NUMBER. Direct SQL is
-- NOT the operational fallback.
--
-- ⚠ DO NOT REGENERATE THIS FILE with `db:generate` (same discipline as 0021-0112): the drizzle
-- snapshot baseline is frozen at 0020. HAND-AUTHORED, wrapped with the hand-supplemented GRANT +
-- FORCE RLS (mirrors 0110/0111). No snapshot file.
--
-- Privileges: SELECT/INSERT/UPDATE but NOT DELETE — a governance record is not discarded. Changing
-- the setting closes the prior head (UPDATE effective_until) and INSERTs a new one, so the trail of
-- every prior window survives.

CREATE TYPE "nominee_bank_masking_mode" AS ENUM('after_days', 'permanent');--> statement-breakpoint

CREATE TABLE "pariwar_nominee_bank_masking_schedule" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"pariwar_id" uuid NOT NULL,
	-- Monotonic per Pariwar, starting at 1 (the T&C `version` precedent).
	"version" integer NOT NULL,
	-- The setting discriminator + its payload. See the header: NEVER collapse these into one column.
	"masking_mode" "nominee_bank_masking_mode" NOT NULL,
	-- Whole days from the drive's close/settle instant. NOT NULL iff masking_mode = 'after_days';
	-- NULL iff 'permanent'. 0 is LEGAL and is cl.10(c)'s "mask immediately".
	"mask_after_days" integer,
	-- The effective window (architecture §1.11). effective_until NULL = currently in force.
	"effective_from" timestamp with time zone NOT NULL,
	"effective_until" timestamp with time zone,
	-- Governance attribution — the 0110/0111 columns, reused. The WRITE PATH requires a rationale and
	-- an audit anchor on every change (claim/nominee-bank-masking-policy.ts); nullable at the column
	-- level only because a Pariwar that never configured a window has no row at all.
	"changed_by_actor" uuid,
	"changed_by_display" text,
	"rationale" text,
	"audit_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
-- (1) Table privileges for the app role. No DELETE — see the header.
GRANT SELECT, INSERT, UPDATE ON "pariwar_nominee_bank_masking_schedule" TO twt_app;--> statement-breakpoint
-- (2) Turn RLS on, then FORCE it (applies even to the non-superuser table owner).
ALTER TABLE "pariwar_nominee_bank_masking_schedule" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "pariwar_nominee_bank_masking_schedule" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
-- (3) version >= 1.
ALTER TABLE "pariwar_nominee_bank_masking_schedule" ADD CONSTRAINT "pariwar_nominee_bank_masking_schedule_version_positive" CHECK ("pariwar_nominee_bank_masking_schedule"."version" >= 1);--> statement-breakpoint
-- (4) The discriminator coupling, as a DB fact. Without it a 'permanent' row carrying a stray day
--     count would resolve to whichever branch a reader checked first — on a control whose two
--     outcomes are "a full account number is public" and "it is not". The 36500 ceiling is a
--     DATA-SANITY guard (an admin typo of 999999999 is de-facto permanence entered by accident), NOT
--     a policy ceiling; keep it in sync with MAX_NOMINEE_BANK_MASK_AFTER_DAYS.
ALTER TABLE "pariwar_nominee_bank_masking_schedule" ADD CONSTRAINT "pariwar_nominee_bank_masking_schedule_setting_check" CHECK ((("pariwar_nominee_bank_masking_schedule"."masking_mode" = 'after_days' AND "pariwar_nominee_bank_masking_schedule"."mask_after_days" IS NOT NULL AND "pariwar_nominee_bank_masking_schedule"."mask_after_days" >= 0 AND "pariwar_nominee_bank_masking_schedule"."mask_after_days" <= 36500) OR ("pariwar_nominee_bank_masking_schedule"."masking_mode" = 'permanent' AND "pariwar_nominee_bank_masking_schedule"."mask_after_days" IS NULL)));--> statement-breakpoint
-- (5) A (pariwar_id, version) pair is allocated exactly once.
CREATE UNIQUE INDEX "pariwar_nominee_bank_masking_schedule_pariwar_version_uq" ON "pariwar_nominee_bank_masking_schedule" USING btree ("pariwar_id","version");--> statement-breakpoint
-- (6) At most ONE open-ended (currently-in-force) row per Pariwar — the T&C open-head precedent.
CREATE UNIQUE INDEX "pariwar_nominee_bank_masking_schedule_pariwar_current_uq" ON "pariwar_nominee_bank_masking_schedule" USING btree ("pariwar_id") WHERE effective_until IS NULL;--> statement-breakpoint
-- (7) The window resolver's driving index.
CREATE INDEX "pariwar_nominee_bank_masking_schedule_pariwar_effective_from_idx" ON "pariwar_nominee_bank_masking_schedule" USING btree ("pariwar_id","effective_from");--> statement-breakpoint
-- (8) Per-tenant RLS policies (packages/domain/src/policies/pariwar-nominee-bank-masking-schedule-rls.ts).
--     SYMMETRIC read/write on pariwar_id; an unset scope yields 0 rows (Story 1.6 closed failure).
--     ⚠ 0 rows resolves to NOT MASKED (D8-default FAIL-OPEN), not to a shield — see the header.
CREATE POLICY "pariwar_nominee_bank_masking_schedule_tenant_isolation_select" ON "pariwar_nominee_bank_masking_schedule" AS PERMISSIVE FOR SELECT TO "twt_app" USING (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "pariwar_nominee_bank_masking_schedule_tenant_isolation_write" ON "pariwar_nominee_bank_masking_schedule" AS PERMISSIVE FOR ALL TO "twt_app" USING (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid) WITH CHECK (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid);
