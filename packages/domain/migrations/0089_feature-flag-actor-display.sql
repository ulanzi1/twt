-- Migration 0089 — feature_flag_versions.actor_display (Story 10.8, Review Pass 3).
--
-- Snapshots the flipping admin's `users.display_name` ONTO the version row at action time.
--
-- ── Why this column exists ────────────────────────────────────────────────────────────────────────
-- The flip handler already resolved the display name and already blocked the flip when it was
-- missing ([[project_admin_display_name_attribution]]'s fail-closed rule) — and then DISCARDED the
-- value, storing only `actor_who_flipped` (a UUID). So the gate imposed a real failure mode (an
-- admin with no display name cannot flip, even during an incident) while delivering none of the
-- benefit it exists for, and AC4's "the inventory renders last flip actor" rendered an opaque UUID
-- that stops resolving the moment the account is renamed or removed.
--
-- ⚠ SNAPSHOT, NOT A JOIN. The value is frozen at the instant of the flip and never refreshed. That
-- is the whole point: a later rename must not silently rewrite the displayed history of past flips,
-- and a deleted admin account must not blank the record of what they did. This is the same
-- historical-attribution-stability rule the audit chain follows.
--
-- ── NULLABLE, deliberately ────────────────────────────────────────────────────────────────────────
-- Rows written BEFORE this migration have no snapshot and can never acquire one — the 0087
-- append-only trigger makes them immutable, and backfilling from `users` today would fabricate a
-- CURRENT name as though it were a historical snapshot, which is exactly the falsification the
-- snapshot rule exists to prevent ([[feedback_record_unattested_no_backfill]] — an un-attested gap
-- is disclosed, never reconstructed). So NULL means "written before attribution was snapshotted",
-- and the read path must render it as such rather than as "unknown actor".
--
-- A NOT NULL default would be worse in every direction: it would either invent a value for history
-- or fail the migration outright on any existing row.
--
-- ⚠ DO NOT REGENERATE THIS FILE with `db:generate`.
-- drizzle-kit skips an already-applied migration by journal `when` (NOT by SQL hash), and the meta/
-- snapshots stop at 0020 (0021+ are hand-authored, snapshot-absent — known drift, NOT gate-blocking).
-- A `db:generate` would diff CURRENT schema against 0020_snapshot.json and wrongly re-emit applied
-- migrations → 42P07. HAND-AUTHORED, carrying ONLY this change. No snapshot emitted.

ALTER TABLE "feature_flag_versions" ADD COLUMN "actor_display" text;
--> statement-breakpoint

-- Bounded like every other governance-text column on this table (cf. 0088's rationale/owner checks).
-- `users.display_name` is controlled staff data, never member PII, and never email-derived — the
-- handler blocks the flip rather than falling back to an email or an id.
ALTER TABLE "feature_flag_versions"
  ADD CONSTRAINT "feature_flag_versions_actor_display_ck"
  CHECK ("actor_display" IS NULL OR (btrim("actor_display") <> '' AND length("actor_display") <= 128));
--> statement-breakpoint

-- ⚠ THE IMMUTABILITY TRIGGER MUST BE EXTENDED — it does NOT cover new columns for free.
--
-- 0087's `feature_flag_versions_reject_mutation()` enumerates its protected columns EXPLICITLY
-- (`NEW.flag_key IS DISTINCT FROM OLD.flag_key OR NEW.pariwar_id …`), rather than comparing the
-- whole OLD/NEW tuple. So a column added later is silently OUTSIDE the append-only guarantee: with
-- `GRANT UPDATE` held by twt_app and the tenant UPDATE policy permitting own-scope rows, any caller
-- could rewrite `actor_display` on a historical row at will — which would destroy the exact
-- property this column was added for (a snapshot that a later rename cannot rewrite).
--
-- Replacing the function rather than adding a second trigger keeps ONE authority for "which columns
-- are immutable" — two triggers would drift, and a future reader would have to find both.
CREATE OR REPLACE FUNCTION feature_flag_versions_reject_mutation()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.flag_key IS DISTINCT FROM OLD.flag_key
     OR NEW.pariwar_id IS DISTINCT FROM OLD.pariwar_id
     OR NEW.version IS DISTINCT FROM OLD.version
     OR NEW.cohort_definition IS DISTINCT FROM OLD.cohort_definition
     OR NEW.state IS DISTINCT FROM OLD.state
     OR NEW.fallback_default IS DISTINCT FROM OLD.fallback_default
     OR NEW.owner IS DISTINCT FROM OLD.owner
     OR NEW.dead_by IS DISTINCT FROM OLD.dead_by
     OR NEW.audit_id IS DISTINCT FROM OLD.audit_id
     OR NEW.effective_from IS DISTINCT FROM OLD.effective_from
     OR NEW.effective_until IS DISTINCT FROM OLD.effective_until
     OR NEW.actor_who_flipped IS DISTINCT FROM OLD.actor_who_flipped
     OR NEW.actor_display IS DISTINCT FROM OLD.actor_display
     OR NEW.rationale IS DISTINCT FROM OLD.rationale
     OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
    RAISE EXCEPTION
      'feature_flag_versions immutable-column write rejected — only superseded_by_version may be updated on an existing flag version row (Story 10.8 AC1, the clause_versions posture); attempted a change to flag_key/pariwar_id/version/cohort_definition/state/fallback_default/owner/dead_by/audit_id/effective_from/effective_until/actor_who_flipped/actor_display/rationale/created_at on version % of flag "%" for pariwar %',
      OLD.version, OLD.flag_key, OLD.pariwar_id
      USING ERRCODE = 'P0001';
  END IF;
  RETURN NEW;
END;
$$;
--> statement-breakpoint

COMMENT ON COLUMN "feature_flag_versions"."actor_display" IS
  'Snapshot of users.display_name at flip time (Story 10.8 Review Pass 3). NEVER refreshed and never backfilled: NULL means the row predates attribution snapshotting.';
