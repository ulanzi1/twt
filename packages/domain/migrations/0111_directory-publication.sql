-- 0111 — `pariwar_directory_publication`: the per-Pariwar DIRECTORY-PUBLICATION kill switch.
--
-- Code-review finding, Story 11a.3 (2026-08-21, D3). ONE table.
--
-- ── Why this table exists ────────────────────────────────────────────────────────────────────────
-- The public Member Directory route unconditionally served any resolvable pariwarId's real KYC
-- names, with NO enablement flag — while DPDPA legal counsel had not been engaged (`-136` cl.5) and
-- a Niyamavali amendment addressing a privacy-inference risk on this exact surface is still in
-- draft. RESOLVED (BigDev, 2026-08-21): a PER-PARIWAR flag, not a global one — needed for gradual
-- rollout and to pull one Pariwar without redeploying.
--
-- ⚠ THE DEFAULT IS ENABLED, ⛔ NOT A FAIL-CLOSED SHIELD — mirrors `pariwar_public_name_presentation`
-- (0110)'s own asymmetry. An absent row means "not individually disabled": the directory being ON
-- is the existing shipped posture (`2026-08-19-135`/`-136`); this table is a targeted OFF switch.
--
-- ⚠ DO NOT REGENERATE THIS FILE with `db:generate` (same discipline as 0021-0110): the drizzle
-- snapshot baseline is frozen at 0020. HAND-AUTHORED, wrapped with the hand-supplemented GRANT +
-- FORCE RLS (mirrors 0070/0110). No snapshot file.
--
-- Shape follows `pariwar_public_name_presentation` (0110): one row per Pariwar, UNIQUE
-- (pariwar_id), tenant-isolated RLS, SELECT/INSERT/UPDATE but NOT DELETE (a governance record is
-- not discarded — re-enabling the directory UPDATEs the row, leaving the trail of the disable).

CREATE TABLE "pariwar_directory_publication" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"pariwar_id" uuid NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	-- Governance attribution: WHO changed it, under what display name, WHY, and the §1.5 audit
	-- anchor — mirrors 0110's own columns exactly. Nullable at the column level (a Pariwar that was
	-- never individually disabled has no row at all); the WRITE PATH requires a rationale and an
	-- anchor on every change (member/directory-publication.ts).
	"changed_by_actor" uuid,
	"changed_by_display" text,
	"rationale" text,
	"audit_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
-- (1) Table privileges for the app role. No DELETE — see the header.
GRANT SELECT, INSERT, UPDATE ON "pariwar_directory_publication" TO twt_app;--> statement-breakpoint
-- (2) Turn RLS on, then FORCE it (applies even to the non-superuser table owner).
ALTER TABLE "pariwar_directory_publication" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "pariwar_directory_publication" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
-- (3) One row per Pariwar — the unique is what makes the write an idempotent upsert.
CREATE INDEX "pariwar_directory_publication_pariwar_id_idx" ON "pariwar_directory_publication" USING btree ("pariwar_id");--> statement-breakpoint
CREATE UNIQUE INDEX "pariwar_directory_publication_pariwar_id_uq" ON "pariwar_directory_publication" USING btree ("pariwar_id");--> statement-breakpoint
-- (4) Per-tenant RLS policies (packages/domain/src/policies/pariwar-directory-publication-rls.ts).
--     SYMMETRIC read/write on pariwar_id; an unset scope yields 0 rows (Story 1.6 closed failure).
--     ⚠ 0 rows resolves to ENABLED, not to a shield — see the header.
CREATE POLICY "pariwar_directory_publication_tenant_isolation_select" ON "pariwar_directory_publication" AS PERMISSIVE FOR SELECT TO "twt_app" USING (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "pariwar_directory_publication_tenant_isolation_write" ON "pariwar_directory_publication" AS PERMISSIVE FOR ALL TO "twt_app" USING (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid) WITH CHECK (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid);
