-- 0115 — the per-Pariwar DRIVE TARGET: `pariwar_drive_target_schedule` + `pariwar_drive_target_visibility`.
--
-- Story 11b.13 (Task 2; AC1, AC2, AC3, AC4). TWO tables, no enum. Governance of record:
-- `2026-09-04-190` cl.7 (Trustee-ratified — Dhiraj Rahul + Kalpana Bharti) · `2026-09-04-191` cl.4
-- (a RUPEE figure) · `2026-09-04-189` cl.3 (member >= public) · `2026-09-06-203` (this story's
-- Task 0 write: the two keys AND, at cl.5, the two records).
--
-- == WHY TWO TABLES AND NOT ONE (D2) =========================================================
-- `-190` cl.7 splits SETTING the target (cl.7(a), the PARIWAR ADMIN) from REVEALING it (cl.7(c),
-- the SUPER ADMIN). Decision `2026-09-06-203` made that split structural in the CATALOG (two
-- permission keys, not one key plus a role check inside a handler). Clause 5 makes it structural
-- HERE, for the reason the catalog split does not reach:
--
-- The schedule is append-only-by-supersession — a change CLOSES the open head and INSERTS a new
-- row. If that row also carried reveal_to_members / reveal_to_public, then a PARIWAR_ADMIN setting
-- a target would be the act that RE-STATES a super_admin-only disclosure decision on EVERY change,
-- and a copy-forward bug (or a stale read) would SILENTLY REVERT a reveal the Trust made, with the
-- Pariwar Admin's own rationale recorded as its justification. That is `2026-09-05-201`'s exact
-- failure mode with an AUTHORITY BOUNDARY crossed.
--
-- => With two tables the pariwar_admin write path CANNOT NAME A FLAG COLUMN AT ALL. "A target
-- change leaves both flags byte-unchanged" is TRUE BY CONSTRUCTION, not a test of discipline.
-- DO NOT "simplify" these back into one table.
--
-- == THE MONEY VALIDATION IS `pool_fixed_amount_schedule`'s, NOT `pools.fixed_amount`'s =========
-- `pools.fixed_amount` is a bare `integer NOT NULL` with NO CHECK of any kind — mirroring it would
-- write zero constraints on a rupee figure shown against every drive in a Pariwar. The precedent
-- that carries the discipline is pool_fixed_amount_schedule_amount_positive (> 0) +
-- ..._amount_max (<= a NAMED constant, kept in sync).
--
-- AND 0 IS NOT A LEGAL TARGET. Story 11b.14's meter is amountRaisedInr / target, so a Rs.0 target is
-- a DIVISION BY ZERO; that story's ruled "no target => no bar" covers UNSET, not zero-and-set — two
-- different states a `>= 0` bound would have collapsed. Hence `> 0`, never `>= 0`.
-- The 100000000 (10 crore) ceiling is a DATA-SANITY guard against a fat-fingered extra zero, NOT a
-- policy ceiling — no ruling caps what a Pariwar may aim to raise. Keep it IN SYNC with
-- MAX_DRIVE_TARGET_INR in pool/drive-target.ts and with the @twt/contracts wire bound.
--
-- == ONE TARGET PER PARIWAR IS A RESOLVER PROPERTY, NOT A ROW COUNT ============================
-- `-189` cl.2(d): the SAME target for every drive in a Pariwar. There is NO per-drive override —
-- not a column, not a nullable field, not a seam. But "one target" does NOT mean "UPSERT one row":
-- that would destroy the change trail AC2 requires and leave no `version` for `2026-09-05-201`'s
-- expectedVersion to compare against. One row per CHANGE; one currently-in-force row per Pariwar,
-- enforced by the partial unique on (pariwar_id) WHERE effective_until IS NULL.
--
-- == AN ABSENT VISIBILITY ROW MEANS HIDDEN FROM EVERYONE (cl.7(b)) =============================
-- FAIL-CLOSED — deliberately the OPPOSITE of pariwar_nominee_bank_masking_schedule's D8-default,
-- which the Panel ruled FAIL-OPEN (`2026-09-02-179` cl.1). Do NOT align the two on the strength of
-- their shared shape: there the absent row governed data already lawfully published and cl.10(b)
-- forbade the code assuming masking; here cl.7(b) makes invisibility the ruled state and a reveal
-- an affirmative act of the Trust. An RLS scope failure yielding 0 rows therefore lands on HIDDEN,
-- never on disclosure.
--
-- == member >= public IS A DB FACT, NOT A HANDLER RULE =========================================
-- `2026-09-04-189` cl.3 (`-195` cl.1) forbids exactly ONE of the four combinations:
-- public-revealed while members are hidden, which would show the unauthenticated internet MORE than
-- a member of the Pariwar the figure belongs to. AC4 requires it ENFORCED. Both booleans live in
-- ONE row precisely so the CHECK needs no join. It is ONE-WAY: members-revealed-while-public-hidden
-- is the ordinary case and is never refused.
--
-- == NOTHING RENDERS THE TARGET ================================================================
-- cl.7(b) makes the figure invisible to members and the public. Story 11b.13 ships NO surface that
-- shows it; Story 11b.14 is the first consumer and reads it SERVER-SIDE ONLY. And it is NOT an
-- obligation: a member's obligation is pools.fixed_amount, and nothing here may be read when
-- computing what a member owes, is assigned, or has paid (AI-10-1).
--
-- DO NOT REGENERATE THIS FILE with `db:generate` (same discipline as 0021-0114): the drizzle
-- snapshot baseline is frozen at 0020. HAND-AUTHORED, wrapped with the hand-supplemented GRANT +
-- FORCE RLS (mirrors 0110/0111/0113). No snapshot file.
--
-- Privileges: schedule gets SELECT/INSERT/UPDATE but NOT DELETE — a governance record is not
-- discarded; a change closes the prior head and inserts a new one, so every prior target survives.
-- The visibility record gets SELECT/INSERT/UPDATE for the same reason (it is mutated in place; its
-- trail lives in the Story 1.10 audit chain).

CREATE TABLE "pariwar_drive_target_schedule" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"pariwar_id" uuid NOT NULL,
	-- Monotonic per Pariwar, starting at 1 (the T&C `version` precedent). This is what
	-- `2026-09-05-201`'s expectedVersion compares against.
	"version" integer NOT NULL,
	-- The target in WHOLE RUPEES (`-191` cl.4). Strictly positive and capped — see the header.
	"target_inr" integer NOT NULL,
	-- The effective window (architecture 1.11). effective_until NULL = currently in force.
	"effective_from" timestamp with time zone NOT NULL,
	"effective_until" timestamp with time zone,
	-- Governance attribution — the 0110/0111/0113 columns, reused. The WRITE PATH requires a
	-- rationale and an audit anchor on every change (pool/drive-target-policy.ts); nullable at the
	-- column level only because a Pariwar that never set a target has no row at all, and a
	-- system/seed write has no actor. Do NOT infer from these nullable columns that a blank
	-- rationale is acceptable — the refusal is the write path's.
	"changed_by_actor" uuid,
	"changed_by_display" text,
	"rationale" text,
	"audit_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pariwar_drive_target_visibility" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"pariwar_id" uuid NOT NULL,
	-- The two INDEPENDENT switches (cl.7(c)). Both default FALSE: a Pariwar with no configuration
	-- reveals the target to NOBODY, and a newly SET target is HIDDEN. Setting is never revealing.
	"reveal_to_members" boolean DEFAULT false NOT NULL,
	"reveal_to_public" boolean DEFAULT false NOT NULL,
	-- The same four attribution columns, with the same caveat as above.
	"changed_by_actor" uuid,
	"changed_by_display" text,
	"rationale" text,
	"audit_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
-- (1) Table privileges for the app role. No DELETE on either — see the header.
GRANT SELECT, INSERT, UPDATE ON "pariwar_drive_target_schedule" TO twt_app;--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE ON "pariwar_drive_target_visibility" TO twt_app;--> statement-breakpoint
-- (2) Turn RLS on, then FORCE it (applies even to the non-superuser table owner).
ALTER TABLE "pariwar_drive_target_schedule" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "pariwar_drive_target_schedule" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "pariwar_drive_target_visibility" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "pariwar_drive_target_visibility" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
-- (3) version >= 1.
ALTER TABLE "pariwar_drive_target_schedule" ADD CONSTRAINT "pariwar_drive_target_schedule_version_positive" CHECK ("pariwar_drive_target_schedule"."version" >= 1);--> statement-breakpoint
-- (4) STRICTLY POSITIVE. Not `>= 0` — a Rs.0 target is a division by zero for Story 11b.14's meter,
--     and it is a DIFFERENT state from "no target set" (which is the ABSENCE of a row). Mirrors
--     pool_fixed_amount_schedule_amount_positive.
ALTER TABLE "pariwar_drive_target_schedule" ADD CONSTRAINT "pariwar_drive_target_schedule_target_positive" CHECK ("pariwar_drive_target_schedule"."target_inr" > 0);--> statement-breakpoint
-- (5) The data-sanity ceiling (10 crore). Keep IN SYNC with MAX_DRIVE_TARGET_INR in
--     pool/drive-target.ts and the @twt/contracts wire bound — the MAX_POOL_FIXED_AMOUNT_INR <->
--     pool_fixed_amount_schedule_amount_max discipline. NOT a policy ceiling.
ALTER TABLE "pariwar_drive_target_schedule" ADD CONSTRAINT "pariwar_drive_target_schedule_target_max" CHECK ("pariwar_drive_target_schedule"."target_inr" <= 100000000);--> statement-breakpoint
-- (6) The effective window may not be INVERTED. `>=`, not `>`: the close-head step sets
--     effective_until = effective_from of the superseding row, so a zero-width window [T, T) is a
--     legitimate supersession of a row created at the same instant — the resolver's
--     `effective_until > asOf` predicate never matches it. Only a genuinely backwards window is
--     forbidden. Carried from 0113, where its ABSENCE from the drizzle declaration (while present in
--     the migration) was caught by a review pass: every constraint here has its twin in
--     schema/pariwar_drive_target_schedule.ts.
ALTER TABLE "pariwar_drive_target_schedule" ADD CONSTRAINT "pariwar_drive_target_schedule_window_not_inverted" CHECK ("pariwar_drive_target_schedule"."effective_until" IS NULL OR "pariwar_drive_target_schedule"."effective_until" >= "pariwar_drive_target_schedule"."effective_from");--> statement-breakpoint
-- (7) member >= public, as a DB fact (`2026-09-04-189` cl.3). See the header: ONE row holds both
--     booleans precisely so this needs no join. ONE-WAY — members-revealed-while-public-hidden is
--     the ordinary case and is never refused.
ALTER TABLE "pariwar_drive_target_visibility" ADD CONSTRAINT "pariwar_drive_target_visibility_member_ge_public" CHECK (NOT ("pariwar_drive_target_visibility"."reveal_to_public" AND NOT "pariwar_drive_target_visibility"."reveal_to_members"));--> statement-breakpoint
-- (8) A (pariwar_id, version) pair is allocated exactly once.
CREATE UNIQUE INDEX "pariwar_drive_target_schedule_pariwar_version_uq" ON "pariwar_drive_target_schedule" USING btree ("pariwar_id","version");--> statement-breakpoint
-- (9) At most ONE open-ended (currently-in-force) row per Pariwar — the T&C /
--     pool_fixed_amount_schedule open-head precedent. THIS is what makes "one target per Pariwar"
--     true while the trail of every prior target survives.
CREATE UNIQUE INDEX "pariwar_drive_target_schedule_pariwar_current_uq" ON "pariwar_drive_target_schedule" USING btree ("pariwar_id") WHERE effective_until IS NULL;--> statement-breakpoint
-- (10) The window resolver's driving index.
CREATE INDEX "pariwar_drive_target_schedule_pariwar_effective_from_idx" ON "pariwar_drive_target_schedule" USING btree ("pariwar_id","effective_from");--> statement-breakpoint
-- (11) ONE visibility row per Pariwar — the pariwar_public_name_presentation precedent.
CREATE INDEX "pariwar_drive_target_visibility_pariwar_id_idx" ON "pariwar_drive_target_visibility" USING btree ("pariwar_id");--> statement-breakpoint
CREATE UNIQUE INDEX "pariwar_drive_target_visibility_pariwar_id_uq" ON "pariwar_drive_target_visibility" USING btree ("pariwar_id");--> statement-breakpoint
-- (12) Per-tenant RLS policies (packages/domain/src/policies/pariwar-drive-target-*-rls.ts).
--      SYMMETRIC read/write on pariwar_id; an unset scope yields 0 rows (Story 1.6 closed failure).
--      For the SCHEDULE, 0 rows resolves to NO TARGET => NO BAR. For the VISIBILITY record, 0 rows
--      resolves to HIDDEN FROM EVERYONE (cl.7(b), FAIL-CLOSED) — the deliberate opposite of 0113's
--      D8-default FAIL-OPEN. See the header.
CREATE POLICY "pariwar_drive_target_schedule_tenant_isolation_select" ON "pariwar_drive_target_schedule" AS PERMISSIVE FOR SELECT TO "twt_app" USING (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "pariwar_drive_target_schedule_tenant_isolation_write" ON "pariwar_drive_target_schedule" AS PERMISSIVE FOR ALL TO "twt_app" USING (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid) WITH CHECK (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "pariwar_drive_target_visibility_tenant_isolation_select" ON "pariwar_drive_target_visibility" AS PERMISSIVE FOR SELECT TO "twt_app" USING (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "pariwar_drive_target_visibility_tenant_isolation_write" ON "pariwar_drive_target_visibility" AS PERMISSIVE FOR ALL TO "twt_app" USING (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid) WITH CHECK (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid);
