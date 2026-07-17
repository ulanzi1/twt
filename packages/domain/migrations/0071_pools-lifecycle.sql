-- Migration 0071 — pools table + pool_lifecycle_state / pool_support_category enums
-- + tenant-isolation RLS + the pools.current_state write-rejection trigger
-- (Story 7.1, Tasks 1 + 5). The pool-lifecycle TWIN of migration 0051 (claims) +
-- 0018 (members). The FIRST Epic-7 landing.
--
-- ⚠ DO NOT REGENERATE THIS FILE with `db:generate` (same discipline as 0021–0070).
-- The drizzle snapshot baseline is frozen at 0020, so `db:generate` emits a bloated
-- catch-up migration that re-creates dozens of already-applied tables. drizzle-kit
-- also skips an already-applied migration by journal `when` (NOT by SQL hash), so a
-- regenerate-after-apply silently drops the hand-supplements and can raise 42P07 on
-- re-run. This file is HAND-AUTHORED: it carries ONLY the pools DDL (the two CREATE
-- TYPE enums + the CREATE TABLE + ENABLE/FORCE RLS + the four indexes + the two
-- CREATE POLICY declarations from packages/domain/src/policies/pools-rls.ts), wrapped
-- with the hand-supplemented GRANT + FORCE DDL (mirrors 0051) AND the BEFORE INSERT
-- OR UPDATE write-rejection trigger (the AC5 structural block — drizzle-kit does not
-- emit trigger DDL; mirror 0051's claims trigger, guarding INSERT + UPDATE alike).
--
-- Hand-supplements (relative to the generated DDL):
--   1. GRANT SELECT, INSERT, UPDATE on pools to twt_app.
--      NOT DELETE: a pool row is NEVER row-deleted — the lifecycle terminates via
--      state transitions (→ settled), projected onto the existing row. Grants only to
--      twt_app (the policies bind TO twt_app; the 0051 rationale).
--   2. ALTER TABLE ... FORCE ROW LEVEL SECURITY — applies RLS even to the (non-
--      superuser) table owner. ENABLE + FORCE kept adjacent.
--   3. The pools.current_state write-rejection trigger (AC5): a BEFORE INSERT OR
--      UPDATE trigger that RAISEs when a row's current_state OR state_event_version is
--      being set (on INSERT: unconditionally; on UPDATE: when either NEW.current_state
--      differs from OLD.current_state OR NEW.state_event_version differs from
--      OLD.state_event_version — the two travel together as one cache-consistency pair,
--      so a write touching only one of them is guarded exactly like a write touching
--      both) AND the projector guard `app.pool_state_writer` is not 'on'.
--      `pools.current_state` + `pools.state_event_version` are a replay-derived cache
--      pair; ONLY pool/project.ts (which sets the guard inside its transaction) may
--      set/change either — for EITHER the first-row INSERT or a later UPDATE (the
--      Story 6.1 review finding: a BEFORE UPDATE-only trigger would never guard a pool
--      row's create-time state write, since OLD does not exist yet on INSERT). RAISEs
--      with ERRCODE 'P0001' (default RAISE class — distinct from 23505 concurrency /
--      23xxx integrity) and the unique message PREFIX 'pools.current_state direct
--      write rejected', which the application boundary matches to map →
--      PoolStateDirectWriteError + emit the P0 audit line (pool/errors.ts). The guard
--      uses current_setting('app.pool_state_writer', true) (missing_ok → NULL when
--      unset), mirroring app.claim_state_writer. Writes touching NEITHER column (e.g.
--      updated_at only) are unaffected.
--
-- The roles (twt_app / twt_service) already exist from migration 0002 — no CREATE ROLE
-- here. No snapshot file is emitted (baseline frozen at 0020; mirror 0021–0070).

CREATE TYPE "public"."pool_lifecycle_state" AS ENUM('spawned', 'live', 'closed', 'settled');--> statement-breakpoint
CREATE TYPE "public"."pool_support_category" AS ENUM('death_support');--> statement-breakpoint
CREATE TABLE "pools" (
	"pool_id" uuid PRIMARY KEY NOT NULL,
	"pariwar_id" uuid NOT NULL,
	"cycle_id" uuid NOT NULL,
	"claim_case_id" uuid NOT NULL,
	"pool_index" integer NOT NULL,
	"pool_canonical_identifier" text NOT NULL,
	"support_category" "pool_support_category" NOT NULL,
	"benefit_mechanism" "benefit_mechanism" NOT NULL,
	"fixed_amount" integer NOT NULL,
	"current_state" "pool_lifecycle_state" NOT NULL,
	"state_event_version" bigint NOT NULL,
	"created_by_actor" uuid,
	"audit_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
-- (1) Table privileges for the app role on pools (SELECT/INSERT/UPDATE, NOT DELETE —
-- a pool row is never row-deleted; settlement is a projected state change).
GRANT SELECT, INSERT, UPDATE ON "pools" TO twt_app;--> statement-breakpoint
-- drizzle-kit-emitted: turn RLS on for pools.
ALTER TABLE "pools" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
-- (2) FORCE applies RLS even to the (non-superuser) table owner — kept adjacent to ENABLE.
ALTER TABLE "pools" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE INDEX "pools_pariwar_id_idx" ON "pools" USING btree ("pariwar_id");--> statement-breakpoint
CREATE UNIQUE INDEX "pools_pariwar_canonical_identifier_uq" ON "pools" USING btree ("pariwar_id","pool_canonical_identifier");--> statement-breakpoint
CREATE INDEX "pools_cycle_pool_index_idx" ON "pools" USING btree ("cycle_id","pool_index");--> statement-breakpoint
CREATE INDEX "pools_claim_case_id_idx" ON "pools" USING btree ("claim_case_id");--> statement-breakpoint
CREATE POLICY "pools_tenant_isolation_select" ON "pools" AS PERMISSIVE FOR SELECT TO "twt_app" USING (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "pools_tenant_isolation_write" ON "pools" AS PERMISSIVE FOR ALL TO "twt_app" USING (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid) WITH CHECK (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid);--> statement-breakpoint
-- (3) pools.current_state write-rejection trigger (AC5). Only the event-replay projector
-- (pool/project.ts), which sets app.pool_state_writer = 'on' inside its tx, may set/
-- change pool state — on the first-row INSERT or a later UPDATE alike. Any other
-- state write is a P0 architectural violation (₹50L/decision flow). Fires BEFORE
-- INSERT OR UPDATE (the Story 6.1 review finding: BEFORE UPDATE alone never guards the
-- create-time write, since a fresh row has no OLD to compare against).
CREATE FUNCTION pools_reject_unguarded_state_write()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF current_setting('app.pool_state_writer', true) IS DISTINCT FROM 'on' THEN
      RAISE EXCEPTION
        'pools.current_state direct write rejected — only the event-replay projector may create a pool row (Story 7.1 AC5); attempted INSERT of state "%" for pool %',
        NEW.current_state, NEW.pool_id
        USING ERRCODE = 'P0001';
    END IF;
    RETURN NEW;
  END IF;

  IF (NEW.current_state IS DISTINCT FROM OLD.current_state
      OR NEW.state_event_version IS DISTINCT FROM OLD.state_event_version)
     AND current_setting('app.pool_state_writer', true) IS DISTINCT FROM 'on' THEN
    RAISE EXCEPTION
      'pools.current_state direct write rejected — only the event-replay projector may change pool state (Story 7.1 AC5); attempted "%" -> "%" (state_event_version % -> %) on pool %',
      OLD.current_state, NEW.current_state, OLD.state_event_version, NEW.state_event_version, NEW.pool_id
      USING ERRCODE = 'P0001';
  END IF;
  RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER pools_state_write_guard
  BEFORE INSERT OR UPDATE ON pools
  FOR EACH ROW EXECUTE FUNCTION pools_reject_unguarded_state_write();
