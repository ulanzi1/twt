-- Migration 0036 — the FR-12A per-cohort validity cache substrate (Story 4.8, Tasks 1 + 4):
--   · member_validity_cache — the Postgres cache-aside store (D1-A) for the FULL unredacted
--     MemberValidityPayload, keyed by the AC1 composite PK
--     (member_id, member_state_hash, rule_registry_version, cohort_invalidation_epoch). TENANT-ISOLATED
--     by pariwar_id (mirror members / member_search_projection). GRANT includes DELETE — the read path
--     UPSERTs on a miss, the D3-A trigger + poisoned-entry overwrite DELETE, and the GC sweep DELETEs.
--   · cohort_invalidation_epochs — one monotonically-increasing epoch per (pariwar_id, niyamavali_version)
--     cohort (D2-A/D4-A). Bumped transactionally on amendment publish + trustee invalidate-all → a new
--     cache key → guaranteed miss → recompute (synchronous freshness). TENANT-ISOLATED. GRANT is
--     SELECT/INSERT/UPDATE (no DELETE — epochs are monotonic, never row-deleted).
--   · member_validity_cache_invalidate() — an AFTER INSERT trigger on events_log filtered to `member.%`
--     event types (D3-A). DELETEs that member's cache rows — REQUIRED (not merely orphaning): the full
--     payload embeds medical/concealment flags, so after member.rtbf_anonymized an unaddressable-but-
--     present row is a retention leak; the DELETE purges it. Works regardless of WHICH package writes the
--     event (domain writes events_log directly — no @twt/events choke point). Runs as the invoking role:
--     under twt_app the DELETE is RLS-scoped to app.pariwar_id (== NEW.pariwar_id, guaranteed by
--     events_log's own write withCheck), so it targets exactly the member's rows; under a BYPASSRLS
--     writer it deletes regardless. No SECURITY DEFINER needed.
--
-- ⚠ DO NOT REGENERATE THIS FILE with `db:generate`.
-- drizzle-kit skips an already-applied migration by journal `when` (NOT SQL hash), and the meta/
-- snapshots stop at 0020 (0021-0035 are hand-authored, snapshot-absent — known drift, NOT gate-blocking;
-- [[project_live_db_test_gotchas]]). A `db:generate` now would diff CURRENT schema against
-- 0020_snapshot.json and wrongly re-emit applied 0021-0035 → 42P07. So this file is HAND-AUTHORED,
-- mirroring 0035_member-search-projection's tenant-isolated table pattern + the 0018 trigger hand-
-- supplement (drizzle-kit does not emit trigger DDL). Roles (twt_app) exist from 0002. No snapshot.

-- ── member_validity_cache (TENANT-ISOLATED cache-aside store) ─────────────────────────────────────────
CREATE TABLE "member_validity_cache" (
	"member_id" uuid NOT NULL,
	"member_state_hash" text NOT NULL,
	"rule_registry_version" text NOT NULL,
	"cohort_invalidation_epoch" bigint NOT NULL,
	"pariwar_id" uuid NOT NULL,
	"payload" jsonb NOT NULL,
	"validity_payload_hash" text NOT NULL,
	"computed_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "member_validity_cache_pkey" PRIMARY KEY ("member_id", "member_state_hash", "rule_registry_version", "cohort_invalidation_epoch")
);
--> statement-breakpoint
-- Per-tenant scans / RLS-aware planner hint (mirror members_pariwar_id_idx). The composite PK's leading
-- member_id column already serves the D3-A trigger's per-member DELETE (PK-index prefix scan).
CREATE INDEX "member_validity_cache_pariwar_id_idx" ON "member_validity_cache" USING btree ("pariwar_id");--> statement-breakpoint
-- The GC sweep (apps/jobs) deletes rows by computed_at age — index it for the periodic range scan.
CREATE INDEX "member_validity_cache_computed_at_idx" ON "member_validity_cache" USING btree ("computed_at");--> statement-breakpoint
-- GRANT (SELECT/INSERT/UPDATE/DELETE — the read path UPSERTs on a miss; the D3-A trigger + the poisoned-
-- entry overwrite + the GC sweep all DELETE). twt_app is the scoped request-path role (policies bind TO
-- twt_app). twt_service ALSO gets the mutable set — the same reason 0013 grants idempotency_keys to
-- twt_service: BYPASSRLS waives RLS evaluation but NOT table-privilege (GRANT) checks, and (a) the
-- BYPASSRLS jobs worker runs the GC-sweep DELETE, and (b) — LOAD-BEARING — the D3-A invalidation trigger
-- runs as the INVOKER, so when a background SIE job (renewal-lifecycle: grace_expired / lock_in_expired /
-- valid_through_reached) appends a member.% event via the twt_service pool, the trigger's cache DELETE
-- executes as twt_service and would fail without this grant (a silent stale-validity hole otherwise).
-- twt_service gets NO permissive policy (a BYPASSRLS session is exempt from every policy anyway; in
-- dev/CI the service pool falls back to the superuser twt_dev_app, which also bypasses — so, mirroring
-- 0013's documented limitation, no integration test can exercise a real twt_service-role session here;
-- `member-validity-cache.spec.ts` instead asserts the GRANT itself landed via `has_table_privilege`).
GRANT SELECT, INSERT, UPDATE, DELETE ON "member_validity_cache" TO twt_app;--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE, DELETE ON "member_validity_cache" TO twt_service;--> statement-breakpoint
ALTER TABLE "member_validity_cache" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "member_validity_cache" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
-- Tenant-isolation policies (mirror members). Story 1.6 closed-failure construct: unset scope → '' →
-- nullif → NULL → 0 rows (quiet fail-closed).
CREATE POLICY "member_validity_cache_tenant_isolation_select" ON "member_validity_cache" AS PERMISSIVE FOR SELECT TO "twt_app" USING (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "member_validity_cache_tenant_isolation_write" ON "member_validity_cache" AS PERMISSIVE FOR ALL TO "twt_app" USING (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid) WITH CHECK (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid);--> statement-breakpoint

-- ── cohort_invalidation_epochs (TENANT-ISOLATED per-cohort invalidation counter) ──────────────────────
CREATE TABLE "cohort_invalidation_epochs" (
	"pariwar_id" uuid NOT NULL,
	"niyamavali_version" text NOT NULL,
	"epoch" bigint DEFAULT 0 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "cohort_invalidation_epochs_pkey" PRIMARY KEY ("pariwar_id", "niyamavali_version")
);
--> statement-breakpoint
-- GRANT (SELECT/INSERT/UPDATE — the bump UPSERTs; NO DELETE — epochs are monotonic, never row-deleted).
-- twt_service also gets the write set (forward-safety + the 0013 twt_service-grant precedent) so a future
-- background invalidation path bumping via the service pool is not privilege-blocked.
GRANT SELECT, INSERT, UPDATE ON "cohort_invalidation_epochs" TO twt_app;--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE ON "cohort_invalidation_epochs" TO twt_service;--> statement-breakpoint
ALTER TABLE "cohort_invalidation_epochs" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "cohort_invalidation_epochs" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "cohort_invalidation_epochs_tenant_isolation_select" ON "cohort_invalidation_epochs" AS PERMISSIVE FOR SELECT TO "twt_app" USING (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "cohort_invalidation_epochs_tenant_isolation_write" ON "cohort_invalidation_epochs" AS PERMISSIVE FOR ALL TO "twt_app" USING (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid) WITH CHECK (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid);--> statement-breakpoint

-- ── D3-A: per-member cache invalidation trigger on events_log (member.% streams) ──────────────────────
-- AFTER INSERT so the DELETE rides the SAME tx as the event append (a rolled-back append rolls back the
-- purge — consistent). The WHEN clause scopes it to member-lifecycle streams (stream_id == member_id).
-- FUTURE validity-relevant event families (claim.*, contribution.* — Epic 6/8/9 producers) MUST extend
-- this WHEN scope when they land. Body is a single indexed DELETE (PK-prefix on member_id) — cheap enough
-- to run per event INSERT. The pariwar_id predicate is belt-and-suspenders under RLS + a real filter for
-- a BYPASSRLS writer (member_id is globally unique anyway — it is the members PK).
CREATE FUNCTION member_validity_cache_invalidate()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  DELETE FROM member_validity_cache
   WHERE member_id = NEW.stream_id
     AND pariwar_id = NEW.pariwar_id;
  RETURN NULL; -- AFTER trigger: return value ignored.
END;
$$;
--> statement-breakpoint
CREATE TRIGGER member_validity_cache_invalidate_on_member_event
  AFTER INSERT ON events_log
  FOR EACH ROW
  WHEN (NEW.event_type LIKE 'member.%')
  EXECUTE FUNCTION member_validity_cache_invalidate();
