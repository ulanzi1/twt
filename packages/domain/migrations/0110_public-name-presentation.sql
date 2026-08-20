-- 0110 — `pariwar_public_name_presentation`: the per-Pariwar PUBLIC-NAME PRESENTATION mode.
--
-- Story 11a.1 (Task 8; AC5, ruling D1(a)). ONE table + ONE enum.
--
-- ── Why this table exists ────────────────────────────────────────────────────────────────────────
-- Decision `2026-08-19-136` cl.1: the implementation "must not hard-code full-name publication as
-- permanent", and — in the ruling's own words — "a build in which the public name form cannot be
-- changed without a code change FAILS this clause". A constant cannot be flipped; this row can.
-- The table IS the discharge of that clause.
--
-- ⛔ IT HOLDS A MODE, NEVER A NAME. The stored KYC name stays in
-- `member_kyc_profiles.name_ciphertext` (Tier-1, KMS-enveloped) and is never written by this path.
-- A `public_display_name` column here would be the second identity system `-136` cl.2 forbids.
-- ⛔ No PII tier changes anywhere (`-136` cl.6).
--
-- ⚠ THE DEFAULT IS `full_name` — THE RULED POSTURE, ⛔ NOT A FAIL-CLOSED ONE. Everywhere else in
-- this schema an absent/unset config falls back fail-closed (cf. `pariwar_appeal_config`'s
-- `pending_legal_review`). Here fail-closed would mean SHIELDING, which would silently contradict a
-- ratified Panel ruling whenever a row was missing. An absent row means "this Pariwar has not
-- overridden the ruling", and the ruling is full names. This asymmetry is deliberate and is argued
-- at `packages/domain/src/kyc/public-name.ts`.
--
-- ⚠ DO NOT REGENERATE THIS FILE with `db:generate` (same discipline as 0021-0109): the drizzle
-- snapshot baseline is frozen at 0020, so a regenerate emits a bloated catch-up migration, and
-- drizzle-kit skips an already-applied migration by journal `when` (NOT SQL hash) — silently
-- dropping the hand-supplements and risking 42P07 on re-run. HAND-AUTHORED, carrying only the 11a.1
-- DDL, wrapped with the hand-supplemented GRANT + FORCE RLS (mirrors 0070/0109). No snapshot file.
--
-- Shape follows `pariwar_appeal_config` (0070): one row per Pariwar, UNIQUE (pariwar_id), tenant-
-- isolated RLS, SELECT/INSERT/UPDATE but NOT DELETE (a governance record is not discarded — a
-- Pariwar reverting to full names UPDATEs the mode, leaving the attribution and rationale of the
-- change that got there).

CREATE TYPE "public"."public_name_presentation_mode" AS ENUM('full_name', 'shielded_name');--> statement-breakpoint

CREATE TABLE "pariwar_public_name_presentation" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"pariwar_id" uuid NOT NULL,
	"mode" "public_name_presentation_mode" DEFAULT 'full_name' NOT NULL,
	-- Governance attribution: WHO changed it, under what display name, WHY, and the §1.5 audit
	-- anchor. Nullable at the column level (a Pariwar that never changed the mode has no row at all,
	-- and a seed write passes NULL actor explicitly); the WRITE PATH is what requires a rationale
	-- and an anchor on every change (kyc/presentation-policy.ts).
	"changed_by_actor" uuid,
	"changed_by_display" text,
	"rationale" text,
	"audit_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
-- (1) Table privileges for the app role. No DELETE: reverting the mode is an UPDATE, which preserves
--     the row (and therefore the trail) rather than erasing that a change ever happened.
GRANT SELECT, INSERT, UPDATE ON "pariwar_public_name_presentation" TO twt_app;--> statement-breakpoint
-- (2) Turn RLS on, then FORCE it (applies even to the non-superuser table owner).
ALTER TABLE "pariwar_public_name_presentation" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "pariwar_public_name_presentation" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
-- (3) One row per Pariwar — the unique is what makes the write an idempotent upsert.
CREATE INDEX "pariwar_public_name_presentation_pariwar_id_idx" ON "pariwar_public_name_presentation" USING btree ("pariwar_id");--> statement-breakpoint
CREATE UNIQUE INDEX "pariwar_public_name_presentation_pariwar_id_uq" ON "pariwar_public_name_presentation" USING btree ("pariwar_id");--> statement-breakpoint
-- (4) Per-tenant RLS policies (packages/domain/src/policies/pariwar-public-name-presentation-rls.ts).
--     SYMMETRIC read/write on pariwar_id; an unset scope yields 0 rows (Story 1.6 closed failure).
--     ⚠ 0 rows resolves to the RULED default, not to a shield — see the header.
CREATE POLICY "pariwar_public_name_presentation_tenant_isolation_select" ON "pariwar_public_name_presentation" AS PERMISSIVE FOR SELECT TO "twt_app" USING (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "pariwar_public_name_presentation_tenant_isolation_write" ON "pariwar_public_name_presentation" AS PERMISSIVE FOR ALL TO "twt_app" USING (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid) WITH CHECK (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid);
