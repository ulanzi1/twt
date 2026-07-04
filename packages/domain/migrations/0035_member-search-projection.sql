-- Migration 0035 — member_search_projection (the AR-65 admin member-search compound read model;
-- Story 4.7, Task 1):
--   · TENANT-ISOLATED (mirror members / member_addresses tenant-isolation): one projection row per
--     member in one Pariwar; the admin member-search read runs under that Pariwar's app.pariwar_id (so a
--     cross-Pariwar search returns 0 rows — the AC1 "scope-respecting" guarantee at the RLS layer).
--   · NON-PII denormalized store: lifecycle state + state_event_version (staleness anchor) + the non-PII
--     nominee_summary (count + split + Tier-3 relationship — NEVER Tier-1 name/mobile/address) + the D2
--     contribution/claim `producer_unavailable` typed sentinels (JSONB, defaulted — NEVER empty arrays).
--     The encrypted identity columns are JOINed from member_identities / member_kyc_profiles at read
--     time, never materialized here (architecture §2.7 encryption posture).
--   · PROJECTOR-EXCLUSIVE WRITE (Story 4.7 D1 refinement ii — LOAD-BEARING): the ONLY writer is the
--     Story 3.1 member projector (member/search-projection.ts, called by member/project.ts). A BEFORE
--     INSERT OR UPDATE write-rejection trigger keyed on the transaction-scoped guard
--     app.member_search_projection_writer enforces it structurally — the exact posture the 0018
--     members.state trigger uses. GRANT is SELECT, INSERT, UPDATE (no DELETE — RTBF is the member FK
--     cascade, and a member row is never row-deleted outside RTBF).
--   · FK member_id → members.member_id ON DELETE CASCADE (RTBF, Story 3.12).
--
-- ⚠ DO NOT REGENERATE THIS FILE with `db:generate`.
-- drizzle-kit skips an already-applied migration by journal `when` (NOT by SQL hash), and the meta/
-- snapshots stop at 0020 (0021-0034 are hand-authored, snapshot-absent — known drift, NOT gate-blocking;
-- [[project_live_db_test_gotchas]]). A `db:generate` now would diff CURRENT schema against
-- 0020_snapshot.json and wrongly re-emit applied 0021-0034 → 42P07. So this file is HAND-AUTHORED,
-- mirroring 0030_member-addresses' tenant-isolated table pattern + the 0018 write-rejection trigger.
-- Roles (twt_app) exist from 0002. No snapshot emitted.

-- ── member_search_projection (TENANT-ISOLATED, projector-owned read model) ────────────────────────────
CREATE TABLE "member_search_projection" (
	"member_id" uuid PRIMARY KEY NOT NULL,
	"pariwar_id" uuid NOT NULL,
	"state" "member_lifecycle_state" NOT NULL,
	"state_event_version" bigint NOT NULL,
	"nominee_summary" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"contribution_section" jsonb DEFAULT '{"status":"producer_unavailable","producer":"epic-8-9"}'::jsonb NOT NULL,
	"claim_section" jsonb DEFAULT '{"status":"producer_unavailable","producer":"epic-6"}'::jsonb NOT NULL,
	"projected_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
-- FK → members.member_id (ON DELETE CASCADE: RTBF anonymization is a state event, but a hard member
-- row-delete cascades the projection row too — mirror member_addresses).
ALTER TABLE "member_search_projection" ADD CONSTRAINT "member_search_projection_member_id_members_member_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("member_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
-- Per-tenant projection scans / RLS-aware planner hint (pariwar_id leads, mirror members_pariwar_id_idx).
CREATE INDEX "member_search_projection_pariwar_id_idx" ON "member_search_projection" USING btree ("pariwar_id");--> statement-breakpoint
-- GRANT (SELECT/INSERT/UPDATE — the projector inserts the first row + updates on every refresh; NO
-- DELETE — RTBF is the member FK cascade). Policies bind TO twt_app, so grants go only to twt_app.
GRANT SELECT, INSERT, UPDATE ON "member_search_projection" TO twt_app;--> statement-breakpoint
-- Backfill existing members (Story 4.7 review finding #1). The projection is otherwise written ONLY on
-- the NEXT member-state event, so every member that existed BEFORE this migration would be invisible to
-- admin search until their next lifecycle event (for a stable `active` member, possibly not until annual
-- renewal). This backfill runs HERE — after GRANT, but BEFORE RLS is enabled + the write-rejection
-- trigger is installed — so it needs NEITHER an `app.pariwar_id` scope NOR the projector write-guard, and
-- it populates all tenants in one pass. contribution_section / claim_section take their column DEFAULT
-- (the D2 `producer_unavailable` sentinel). The nominee summary aggregates the non-PII columns only.
INSERT INTO "member_search_projection"
  (member_id, pariwar_id, state, state_event_version, nominee_summary)
SELECT
  m.member_id,
  m.pariwar_id,
  m.state,
  m.state_event_version,
  COALESCE(
    (SELECT jsonb_agg(
              jsonb_build_object('rank', n.rank, 'relationship', n.relationship, 'splitPct', n.split_pct)
              ORDER BY n.rank)
       FROM member_nominees n
      WHERE n.member_id = m.member_id),
    '[]'::jsonb)
FROM members m;--> statement-breakpoint
ALTER TABLE "member_search_projection" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "member_search_projection" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
-- Tenant-isolation policies (mirror members). Story 1.6 closed-failure construct: unset scope → '' →
-- nullif → NULL → 0 rows (quiet fail-closed).
CREATE POLICY "member_search_projection_tenant_isolation_select" ON "member_search_projection" AS PERMISSIVE FOR SELECT TO "twt_app" USING (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "member_search_projection_tenant_isolation_write" ON "member_search_projection" AS PERMISSIVE FOR ALL TO "twt_app" USING (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid) WITH CHECK (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid);--> statement-breakpoint
-- Projector-EXCLUSIVE write trigger (Story 4.7 D1 refinement ii; the 0018 members.state trigger is the
-- precedent). Unlike members (which guards only `state` CHANGES on UPDATE), this table's ONLY legitimate
-- writer is the projector for ALL writes, so a BEFORE INSERT OR UPDATE trigger RAISEs on ANY write while
-- the transaction-scoped guard app.member_search_projection_writer is not 'on'. Only
-- member/search-projection.ts (which sets the guard inside the projector's tx) may write. RAISEs with
-- ERRCODE 'P0001' + the unique message PREFIX 'member_search_projection direct write rejected'. A BEFORE
-- trigger that RAISEs aborts its own tx (cannot write an audit line durably — that is the app boundary's
-- job, mirror members). The guard uses current_setting(..., true) (missing_ok → NULL when unset),
-- mirroring the app.pariwar_id / app.member_state_writer constructs.
CREATE FUNCTION member_search_projection_reject_unguarded_write()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF current_setting('app.member_search_projection_writer', true) IS DISTINCT FROM 'on' THEN
    RAISE EXCEPTION
      'member_search_projection direct write rejected — only the event-replay projector may write this read model (Story 4.7 D1); attempted % on member %',
      TG_OP, NEW.member_id
      USING ERRCODE = 'P0001';
  END IF;
  RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER member_search_projection_write_guard
  BEFORE INSERT OR UPDATE ON member_search_projection
  FOR EACH ROW EXECUTE FUNCTION member_search_projection_reject_unguarded_write();
