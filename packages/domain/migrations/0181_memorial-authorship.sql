-- Migration 0181 — THE FAMILY MEMORIAL: every version as sent, the Trust's one decision per version, and withdrawals
-- (Story 11b.4; build decisions in Decision 2026-10-24-398, author-commit — MA5 / MA6 / MA9 / MA15 / MA16; the Panel's
-- rulings `-391` / `-393` / `-395`). Hand-authored — ⛔ never regenerate (`db:generate` diffs against the 0020 snapshot;
-- the migrator skips by the journal `when`). Idempotent: `psql -f` twice succeeds (each type in a `duplicate_object`
-- guard, `CREATE TABLE IF NOT EXISTS` with every constraint inline, `CREATE OR REPLACE FUNCTION`, `DROP POLICY IF EXISTS`
-- before each policy, `CREATE INDEX IF NOT EXISTS`).
--
-- Three tables, ALL append-only save the erasure grant (MA15, the `0092` lesson — append-only once made a Tier-1 note
-- "STRUCTURALLY UN-ERASABLE"; an RTBF is a SOFT delete, so ⛔ no cascade ever fires):
--   · memorial_submissions       — one row per Send: the family's words VERBATIM (Tier-1), the optional photo's key and
--     alt text (Tier-1), and the permission given AT SEND (`authorisation_*`, `handover_*` — MA5, `-162` cl.3). A new Send
--     supersedes the chain head (MA9): `UNIQUE (supersedes_submission_id)` + a partial unique on the pool's root + a
--     composite FK keep the chain linear and inside one pool. ⚠ The writers take
--     `pg_advisory_xact_lock(hashtext('memorial:' || pool_id))` FIRST; these indexes are the BACKSTOP (Trap 12).
--   · memorial_review_decisions  — ONE per submission (PK): `approved` · `approved_with_omissions` · `not_approved`; the
--     parts left out as spans `{ field, start, end, reason }` (⛔ never the text), the photo's reason, the `not_approved`
--     reason, an optional Tier-1 internal note, the reviewer's id + display snapshot.
--   · memorial_withdrawals       — ONE per submission (PK): `family` (before review) or `trust` (its own approval, MA16, on
--     one of the four reasons), an optional Tier-1 note.
--
-- ⛔ No CHECK on a ciphertext column (a CHECK re-runs on the scrub's UPDATE — the sentinel must pass). ⛔ No mutable status
-- column (the state is DERIVED — MA10). ⛔ No DELETE grant, ⛔ no DELETE policy, ⛔ never `FOR ALL`.
--
-- Statement order: types → function → CREATE (constraints inline) → GRANT → ENABLE → FORCE → POLICY → indexes (0160).

DO $$ BEGIN
  CREATE TYPE "public"."memorial_review_action" AS ENUM('approved', 'approved_with_omissions', 'not_approved');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;--> statement-breakpoint
DO $$ BEGIN
  CREATE TYPE "public"."memorial_review_reason" AS ENUM('attacks_someone_named', 'accuses_someone_of_wrongdoing', 'against_the_law', 'identifies_a_child');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;--> statement-breakpoint
DO $$ BEGIN
  CREATE TYPE "public"."memorial_withdrawal_actor" AS ENUM('family', 'trust');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;--> statement-breakpoint

-- The omission spans' SHAPE (the `moderation_evidence_refs_valid` precedent, 0099 — an inline subquery in a CHECK is a hard
-- error). Each entry: exactly `field`, `start`, `end`, `reason`; `field` ∈ body | altText; integer offsets with
-- 0 ≤ start < end; `reason` one of the four. ⚠ LOCKSTEP with `memorial/vocab.ts`. The SEMANTIC rules (grapheme boundaries,
-- ordering, the text's length) are the pure validator's (`@twt/contracts` `validateMemorialDecision`) — the DB cannot see
-- the plaintext.
-- ⚠ NULL-safe and ORDER-safe (review R18): a JSON-null `field` / `reason` made `NULL NOT IN (...)` NULL, so an OR chain never
-- refused it; and SQL does not order the terms of an OR, so a cast could run before its regex guard. Each rule is a `WHEN`
-- (evaluated in order, the first refusal wins), the type of `field` / `reason` is checked BEFORE the value, and the offsets are
-- compared as `numeric` (no `bigint` overflow on a long digit string). Each offset is CAPPED at 2147483647 (2^31 - 1, the largest
-- 32-bit signed integer — a memorial is at most 6,000 code points, so the cap is far above any real offset): without it a
-- 23-digit or `1e400` offset was admitted, where the earlier `bigint` cast refused anything above 2^63.
CREATE OR REPLACE FUNCTION memorial_omissions_valid(v jsonb) RETURNS boolean
  LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE
    WHEN v IS NULL OR jsonb_typeof(v) <> 'array' THEN false
    ELSE NOT EXISTS (
      SELECT 1 FROM jsonb_array_elements(v) e
       WHERE NOT (
         CASE
           WHEN jsonb_typeof(e) IS DISTINCT FROM 'object' THEN false
           WHEN (SELECT count(*) FROM jsonb_object_keys(e)) <> 4 THEN false
           WHEN NOT (e ? 'field' AND e ? 'start' AND e ? 'end' AND e ? 'reason') THEN false
           WHEN jsonb_typeof(e->'field') IS DISTINCT FROM 'string' OR jsonb_typeof(e->'reason') IS DISTINCT FROM 'string' THEN false
           WHEN jsonb_typeof(e->'start') IS DISTINCT FROM 'number' OR jsonb_typeof(e->'end') IS DISTINCT FROM 'number' THEN false
           WHEN (e->>'start') !~ '^[0-9]+$' OR (e->>'end') !~ '^[0-9]+$' THEN false
           WHEN (e->>'start')::numeric > 2147483647 OR (e->>'end')::numeric > 2147483647 THEN false
           WHEN (e->>'start')::numeric >= (e->>'end')::numeric THEN false
           WHEN e->>'field' NOT IN ('body', 'altText') THEN false
           WHEN e->>'reason' NOT IN ('attacks_someone_named', 'accuses_someone_of_wrongdoing', 'against_the_law', 'identifies_a_child') THEN false
           ELSE true
         END ) )
  END;
$$;--> statement-breakpoint

-- ── (1) the versions ─────────────────────────────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "memorial_submissions" (
	"submission_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"pariwar_id" uuid NOT NULL,
	"pool_id" uuid NOT NULL,
	"claim_case_id" uuid NOT NULL,
	"deceased_member_id" uuid NOT NULL,
	"supersedes_submission_id" uuid,
	"body_ciphertext" text NOT NULL,
	"alt_text_ciphertext" text,
	"photo_object_key" text,
	"photo_mime" text,
	"authorisation_copy_version" text NOT NULL,
	"authorisation_locale" "locale" NOT NULL,
	"handover_recipient" text NOT NULL,
	"handover_nominee_ref" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT clock_timestamp() NOT NULL,
	CONSTRAINT "memorial_submissions_pariwar_submission_uq" UNIQUE ("pariwar_id", "submission_id"),
	CONSTRAINT "memorial_submissions_pool_submission_uq" UNIQUE ("pool_id", "submission_id"),
	CONSTRAINT "memorial_submissions_supersedes_uq" UNIQUE ("supersedes_submission_id"),
	CONSTRAINT "memorial_submissions_pool_fk" FOREIGN KEY ("pool_id") REFERENCES "public"."pools"("pool_id") ON DELETE no action ON UPDATE no action,
	CONSTRAINT "memorial_submissions_deceased_member_fk" FOREIGN KEY ("deceased_member_id") REFERENCES "public"."members"("member_id") ON DELETE no action ON UPDATE no action,
	CONSTRAINT "memorial_submissions_claim_case_fk" FOREIGN KEY ("pariwar_id", "claim_case_id") REFERENCES "public"."claims"("pariwar_id", "claim_case_id") ON DELETE no action ON UPDATE no action,
	-- The chain stays inside ONE pool: the superseded version must be this pool's.
	CONSTRAINT "memorial_submissions_supersedes_fk" FOREIGN KEY ("pool_id", "supersedes_submission_id") REFERENCES "public"."memorial_submissions"("pool_id", "submission_id") ON DELETE no action ON UPDATE no action,
	CONSTRAINT "memorial_submissions_photo_mime_check" CHECK (photo_mime IS NULL OR photo_mime IN ('image/jpeg', 'image/png')),
	CONSTRAINT "memorial_submissions_photo_pair_check" CHECK ((photo_object_key IS NULL) = (photo_mime IS NULL)),
	CONSTRAINT "memorial_submissions_handover_recipient_check" CHECK (handover_recipient IN ('latest', 'at_death')),
	CONSTRAINT "memorial_submissions_copy_version_check" CHECK (length(btrim(authorisation_copy_version)) > 0)
);--> statement-breakpoint
GRANT SELECT, INSERT ON "memorial_submissions" TO twt_app;--> statement-breakpoint
-- The DPDPA-RTBF scrub ONLY (MA15) — ⛔ never an edit of the family's words. Without it the scrub fails 42501.
GRANT UPDATE ("body_ciphertext", "alt_text_ciphertext") ON "memorial_submissions" TO twt_app;--> statement-breakpoint
ALTER TABLE "memorial_submissions" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "memorial_submissions" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
DROP POLICY IF EXISTS "memorial_submissions_tenant_isolation_select" ON "memorial_submissions";--> statement-breakpoint
CREATE POLICY "memorial_submissions_tenant_isolation_select" ON "memorial_submissions" AS PERMISSIVE FOR SELECT TO "twt_app" USING (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid);--> statement-breakpoint
DROP POLICY IF EXISTS "memorial_submissions_tenant_isolation_insert" ON "memorial_submissions";--> statement-breakpoint
CREATE POLICY "memorial_submissions_tenant_isolation_insert" ON "memorial_submissions" AS PERMISSIVE FOR INSERT TO "twt_app" WITH CHECK (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid);--> statement-breakpoint
-- ⚠ Load-bearing (`-279` A12): without it the RTBF scrub silently updates 0 rows under FORCE.
DROP POLICY IF EXISTS "memorial_submissions_tenant_isolation_update" ON "memorial_submissions";--> statement-breakpoint
CREATE POLICY "memorial_submissions_tenant_isolation_update" ON "memorial_submissions" AS PERMISSIVE FOR UPDATE TO "twt_app" USING (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid) WITH CHECK (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid);--> statement-breakpoint
-- The pool's root version — at most ONE (MA9's chain head starts here).
CREATE UNIQUE INDEX IF NOT EXISTS "memorial_submissions_pool_root_uq" ON "memorial_submissions" USING btree ("pool_id") WHERE supersedes_submission_id IS NULL;--> statement-breakpoint
-- The review queue (oldest first, per Pariwar) and the erasure read (per deceased member).
CREATE INDEX IF NOT EXISTS "memorial_submissions_pariwar_created_idx" ON "memorial_submissions" USING btree ("pariwar_id", "created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "memorial_submissions_deceased_idx" ON "memorial_submissions" USING btree ("deceased_member_id");--> statement-breakpoint

-- ── (2) the decisions ────────────────────────────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "memorial_review_decisions" (
	"submission_id" uuid PRIMARY KEY NOT NULL,
	"pariwar_id" uuid NOT NULL,
	"action" "memorial_review_action" NOT NULL,
	"omissions" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"photo_left_out_reason" "memorial_review_reason",
	"reason_code" "memorial_review_reason",
	"internal_note_ciphertext" text,
	"actor_id" uuid NOT NULL,
	"actor_display" text NOT NULL,
	"decided_at" timestamp with time zone DEFAULT clock_timestamp() NOT NULL,
	CONSTRAINT "memorial_review_decisions_submission_fk" FOREIGN KEY ("pariwar_id", "submission_id") REFERENCES "public"."memorial_submissions"("pariwar_id", "submission_id") ON DELETE no action ON UPDATE no action,
	CONSTRAINT "memorial_review_decisions_omissions_check" CHECK (memorial_omissions_valid(omissions)),
	-- MA6: a reason for `not_approved` and only for it.
	CONSTRAINT "memorial_review_decisions_reason_iff_not_approved" CHECK ((action = 'not_approved') = (reason_code IS NOT NULL)),
	-- MA6: `approved` and `not_approved` leave nothing out; `approved_with_omissions` leaves out at least one part.
	CONSTRAINT "memorial_review_decisions_omissions_iff_action" CHECK (
		CASE action
			WHEN 'approved_with_omissions' THEN (jsonb_array_length(omissions) > 0 OR photo_left_out_reason IS NOT NULL)
			ELSE (omissions = '[]'::jsonb AND photo_left_out_reason IS NULL)
		END
	),
	CONSTRAINT "memorial_review_decisions_actor_display_check" CHECK (length(btrim(actor_display)) > 0)
);--> statement-breakpoint
GRANT SELECT, INSERT ON "memorial_review_decisions" TO twt_app;--> statement-breakpoint
GRANT UPDATE ("internal_note_ciphertext") ON "memorial_review_decisions" TO twt_app;--> statement-breakpoint
ALTER TABLE "memorial_review_decisions" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "memorial_review_decisions" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
DROP POLICY IF EXISTS "memorial_review_decisions_tenant_isolation_select" ON "memorial_review_decisions";--> statement-breakpoint
CREATE POLICY "memorial_review_decisions_tenant_isolation_select" ON "memorial_review_decisions" AS PERMISSIVE FOR SELECT TO "twt_app" USING (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid);--> statement-breakpoint
DROP POLICY IF EXISTS "memorial_review_decisions_tenant_isolation_insert" ON "memorial_review_decisions";--> statement-breakpoint
CREATE POLICY "memorial_review_decisions_tenant_isolation_insert" ON "memorial_review_decisions" AS PERMISSIVE FOR INSERT TO "twt_app" WITH CHECK (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid);--> statement-breakpoint
DROP POLICY IF EXISTS "memorial_review_decisions_tenant_isolation_update" ON "memorial_review_decisions";--> statement-breakpoint
CREATE POLICY "memorial_review_decisions_tenant_isolation_update" ON "memorial_review_decisions" AS PERMISSIVE FOR UPDATE TO "twt_app" USING (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid) WITH CHECK (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid);--> statement-breakpoint

-- ── (3) the withdrawals ──────────────────────────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "memorial_withdrawals" (
	"submission_id" uuid PRIMARY KEY NOT NULL,
	"pariwar_id" uuid NOT NULL,
	"withdrawn_by" "memorial_withdrawal_actor" NOT NULL,
	"reason_code" "memorial_review_reason",
	"internal_note_ciphertext" text,
	"actor_id" uuid NOT NULL,
	"actor_display" text,
	"withdrawn_at" timestamp with time zone DEFAULT clock_timestamp() NOT NULL,
	CONSTRAINT "memorial_withdrawals_submission_fk" FOREIGN KEY ("pariwar_id", "submission_id") REFERENCES "public"."memorial_submissions"("pariwar_id", "submission_id") ON DELETE no action ON UPDATE no action,
	-- MA16: the Trust names one of the four reasons; a family withdrawal carries none.
	CONSTRAINT "memorial_withdrawals_reason_iff_trust" CHECK ((withdrawn_by = 'trust') = (reason_code IS NOT NULL)),
	CONSTRAINT "memorial_withdrawals_actor_display_check" CHECK ((withdrawn_by = 'trust') = (actor_display IS NOT NULL) AND (actor_display IS NULL OR length(btrim(actor_display)) > 0))
);--> statement-breakpoint
GRANT SELECT, INSERT ON "memorial_withdrawals" TO twt_app;--> statement-breakpoint
GRANT UPDATE ("internal_note_ciphertext") ON "memorial_withdrawals" TO twt_app;--> statement-breakpoint
ALTER TABLE "memorial_withdrawals" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "memorial_withdrawals" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
DROP POLICY IF EXISTS "memorial_withdrawals_tenant_isolation_select" ON "memorial_withdrawals";--> statement-breakpoint
CREATE POLICY "memorial_withdrawals_tenant_isolation_select" ON "memorial_withdrawals" AS PERMISSIVE FOR SELECT TO "twt_app" USING (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid);--> statement-breakpoint
DROP POLICY IF EXISTS "memorial_withdrawals_tenant_isolation_insert" ON "memorial_withdrawals";--> statement-breakpoint
CREATE POLICY "memorial_withdrawals_tenant_isolation_insert" ON "memorial_withdrawals" AS PERMISSIVE FOR INSERT TO "twt_app" WITH CHECK (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid);--> statement-breakpoint
DROP POLICY IF EXISTS "memorial_withdrawals_tenant_isolation_update" ON "memorial_withdrawals";--> statement-breakpoint
CREATE POLICY "memorial_withdrawals_tenant_isolation_update" ON "memorial_withdrawals" AS PERMISSIVE FOR UPDATE TO "twt_app" USING (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid) WITH CHECK (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid);
