-- Migration 0078 — alerts table + alert_lifecycle_state enum + tenant-isolation RLS
-- + the alerts.current_state write-rejection trigger (Story 8.1, Tasks 1 + 7). The
-- alert-lifecycle TWIN of migration 0071 (pools) + 0051 (claims) + 0018 (members).
-- The FIRST Epic-8 landing (the FOURTH event-derived-state primitive).
--
-- ⚠ DO NOT REGENERATE THIS FILE with `db:generate` (same discipline as 0021–0077).
-- The drizzle snapshot baseline is frozen at 0020, so `db:generate` emits a bloated
-- catch-up migration that re-creates dozens of already-applied tables. drizzle-kit
-- also skips an already-applied migration by journal `when` (NOT by SQL hash), so a
-- regenerate-after-apply silently drops the hand-supplements and can raise 42P07 on
-- re-run. This file is HAND-AUTHORED: it carries ONLY the alerts DDL (the one CREATE
-- TYPE enum + the CREATE TABLE + ENABLE/FORCE RLS + the two indexes + the two CREATE
-- POLICY declarations from packages/domain/src/policies/alerts-rls.ts), wrapped with
-- the hand-supplemented GRANT + FORCE DDL (mirrors 0071) AND the BEFORE INSERT OR
-- UPDATE write-rejection trigger (the AC5 structural block — drizzle-kit does not emit
-- trigger DDL; mirror 0071's pools trigger, guarding INSERT + UPDATE alike).
--
-- Hand-supplements (relative to the generated DDL):
--   1. GRANT SELECT, INSERT, UPDATE on alerts to twt_app.
--      NOT DELETE: an alert row is NEVER row-deleted — the lifecycle terminates via
--      state transitions (→ settled), projected onto the existing row. Grants only to
--      twt_app (the policies bind TO twt_app; the 0071 rationale).
--   2. ALTER TABLE ... FORCE ROW LEVEL SECURITY — applies RLS even to the (non-
--      superuser) table owner. ENABLE + FORCE kept adjacent.
--   3. The alerts.current_state write-rejection trigger (AC5): a BEFORE INSERT OR
--      UPDATE trigger that RAISEs when a row's current_state OR state_event_version is
--      being set (on INSERT: unconditionally; on UPDATE: when either NEW.current_state
--      differs from OLD.current_state OR NEW.state_event_version differs from
--      OLD.state_event_version — the two travel together as one cache-consistency pair)
--      AND the projector guard `app.alert_state_writer` is not 'on'.
--      `alerts.current_state` + `alerts.state_event_version` are a replay-derived cache
--      pair; ONLY alert/project.ts (which sets the guard inside its transaction) may
--      set/change either — for EITHER the first-row INSERT or a later UPDATE (the Story
--      6.1 review finding: a BEFORE UPDATE-only trigger would never guard an alert row's
--      create-time state write, since OLD does not exist yet on INSERT). RAISEs with
--      ERRCODE 'P0001' and the unique message PREFIX 'alerts.current_state direct write
--      rejected'. The guard uses current_setting('app.alert_state_writer', true)
--      (missing_ok → NULL when unset), mirroring app.pool_state_writer. Writes touching
--      NEITHER column (e.g. updated_at only) are unaffected.
--
-- The roles (twt_app / twt_service) already exist from migration 0002 — no CREATE ROLE
-- here. No snapshot file is emitted (baseline frozen at 0020; mirror 0021–0077).

CREATE TYPE "public"."alert_lifecycle_state" AS ENUM('draft', 'frozen', 'published', 'live', 'closed', 'settled');--> statement-breakpoint
CREATE TABLE "alerts" (
	"alert_id" uuid PRIMARY KEY NOT NULL,
	"cycle_id" uuid NOT NULL,
	"pariwar_id" uuid NOT NULL,
	"pool_count" integer NOT NULL,
	"current_state" "alert_lifecycle_state" NOT NULL,
	"state_event_version" bigint NOT NULL,
	"created_by_actor" text NOT NULL,
	"audit_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
-- (1) Table privileges for the app role on alerts (SELECT/INSERT/UPDATE, NOT DELETE —
-- an alert row is never row-deleted; settlement is a projected state change).
GRANT SELECT, INSERT, UPDATE ON "alerts" TO twt_app;--> statement-breakpoint
-- drizzle-kit-emitted: turn RLS on for alerts.
ALTER TABLE "alerts" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
-- (2) FORCE applies RLS even to the (non-superuser) table owner — kept adjacent to ENABLE.
ALTER TABLE "alerts" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE INDEX "alerts_pariwar_id_idx" ON "alerts" USING btree ("pariwar_id");--> statement-breakpoint
-- The ONE-ALERT-PER-CYCLE invariant (AC2): alert_id = deriveAlertId(cycle_id) is 1:1 with
-- the cycle; this UNIQUE index is the DB-level backstop against a duplicate alert.
CREATE UNIQUE INDEX "alerts_cycle_id_uq" ON "alerts" USING btree ("cycle_id");--> statement-breakpoint
CREATE POLICY "alerts_tenant_isolation_select" ON "alerts" AS PERMISSIVE FOR SELECT TO "twt_app" USING (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "alerts_tenant_isolation_write" ON "alerts" AS PERMISSIVE FOR ALL TO "twt_app" USING (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid) WITH CHECK (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid);--> statement-breakpoint
-- (3) alerts.current_state write-rejection trigger (AC5). Only the event-replay projector
-- (alert/project.ts), which sets app.alert_state_writer = 'on' inside its tx, may set/
-- change alert state — on the first-row INSERT or a later UPDATE alike. Any other state
-- write is a P0 architectural violation (₹50L/decision flow). Fires BEFORE INSERT OR
-- UPDATE (the Story 6.1 review finding: BEFORE UPDATE alone never guards the create-time
-- write, since a fresh row has no OLD to compare against).
CREATE FUNCTION alerts_reject_unguarded_state_write()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF current_setting('app.alert_state_writer', true) IS DISTINCT FROM 'on' THEN
      RAISE EXCEPTION
        'alerts.current_state direct write rejected — only the event-replay projector may create an alert row (Story 8.1 AC5); attempted INSERT of state "%" for alert %',
        NEW.current_state, NEW.alert_id
        USING ERRCODE = 'P0001';
    END IF;
    RETURN NEW;
  END IF;

  IF (NEW.current_state IS DISTINCT FROM OLD.current_state
      OR NEW.state_event_version IS DISTINCT FROM OLD.state_event_version)
     AND current_setting('app.alert_state_writer', true) IS DISTINCT FROM 'on' THEN
    RAISE EXCEPTION
      'alerts.current_state direct write rejected — only the event-replay projector may change alert state (Story 8.1 AC5); attempted "%" -> "%" (state_event_version % -> %) on alert %',
      OLD.current_state, NEW.current_state, OLD.state_event_version, NEW.state_event_version, NEW.alert_id
      USING ERRCODE = 'P0001';
  END IF;
  RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER alerts_state_write_guard
  BEFORE INSERT OR UPDATE ON alerts
  FOR EACH ROW EXECUTE FUNCTION alerts_reject_unguarded_state_write();
