-- Migration 0018 — members table + member_lifecycle_state enum + tenant-isolation
-- RLS + the members.state write-rejection trigger (Story 3.1, Tasks 1 + 7).
--
-- ⚠ DO NOT REGENERATE THIS FILE with `db:generate`.
-- drizzle-kit skips an already-applied migration by journal `when` (NOT by SQL
-- hash), so a regenerate-after-apply silently drops the hand-supplements and can
-- raise 42P07 on re-run. The drizzle-kit-emitted statements (the CREATE TYPE enum +
-- the CREATE TABLE + ENABLE RLS + the (pariwar_id) index + the two CREATE POLICY
-- declarations from packages/domain/src/policies/members-rls.ts) are wrapped here
-- with hand-supplemented GRANT + FORCE DDL (mirrors 0014–0017) AND the BEFORE UPDATE
-- write-rejection trigger (the AC3 structural block — drizzle-kit does not emit
-- trigger DDL; mirror migration 0001's append-only trigger hand-supplement).
--
-- Hand-supplements (relative to the generated DDL):
--   1. GRANT SELECT, INSERT, UPDATE on members to twt_app.
--      NOT DELETE: a member row is NEVER row-deleted — withdrawal is a state
--      transition (→ withdrawn) and RTBF is anonymization-in-place (→ anonymized),
--      both projected onto the existing row. Grants only to twt_app (the policies
--      bind TO twt_app; twt_service has no policy here — the 0014/0016/0017 rationale).
--   2. ALTER TABLE ... FORCE ROW LEVEL SECURITY — applies RLS even to the (non-
--      superuser) table owner. ENABLE + FORCE kept adjacent.
--   3. The members.state write-rejection trigger (AC3): a BEFORE UPDATE trigger that
--      RAISEs when NEW.state differs from OLD.state AND the projector guard
--      `app.member_state_writer` is not 'on'. `members.state` is a replay-derived
--      cache; ONLY member/project.ts (which sets the guard inside its transaction)
--      may change it. RAISEs with ERRCODE 'P0001' (default RAISE class — distinct
--      from 23505 concurrency / 23xxx integrity) and the unique message PREFIX
--      'members.state direct write rejected', which the application boundary matches
--      to map → MemberStateDirectWriteError + emit the P0 audit line (member/errors.ts).
--      A BEFORE UPDATE trigger that RAISEs aborts its own tx, so it CANNOT write the
--      audit line durably — that is the catching boundary's job. The guard uses
--      current_setting('app.member_state_writer', true) (missing_ok → NULL when unset),
--      mirroring the app.pariwar_id RLS construct. Non-state UPDATEs (e.g. updated_at
--      only) are unaffected (NEW.state IS NOT DISTINCT FROM OLD.state → no RAISE).
--
-- The roles (twt_app / twt_service) already exist from migration 0002 — no CREATE
-- ROLE here. Idempotency invariant preserved: the snapshot at meta/0018_snapshot.json
-- records only the table-shape view (the TYPE + TABLE + ENABLE RLS + index + policies);
-- the GRANT/FORCE/trigger hand-supplements are invisible to `drizzle-kit check`,
-- matching migrations 0001 (triggers) + 0014–0017 (GRANT/FORCE).

CREATE TYPE "public"."member_lifecycle_state" AS ENUM('pending-kyc', 'pending-fee', 'pending-valid', 'lock-in', 'active', 'active-in-grace', 'lapsed-unpaid', 'withdrawn', 'anonymized');--> statement-breakpoint
CREATE TABLE "members" (
	"member_id" uuid PRIMARY KEY NOT NULL,
	"pariwar_id" uuid NOT NULL,
	"state" "member_lifecycle_state" NOT NULL,
	"state_event_version" bigint NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
-- (1) Table privileges for the app role on members (SELECT/INSERT/UPDATE, NOT DELETE
-- — a member row is never row-deleted; withdrawal + RTBF are projected state changes).
GRANT SELECT, INSERT, UPDATE ON "members" TO twt_app;--> statement-breakpoint
-- drizzle-kit-emitted: turn RLS on for members.
ALTER TABLE "members" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
-- (2) FORCE applies RLS even to the (non-superuser) table owner — kept adjacent to ENABLE.
ALTER TABLE "members" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE INDEX "members_pariwar_id_idx" ON "members" USING btree ("pariwar_id");--> statement-breakpoint
CREATE POLICY "members_tenant_isolation_select" ON "members" AS PERMISSIVE FOR SELECT TO "twt_app" USING (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "members_tenant_isolation_write" ON "members" AS PERMISSIVE FOR ALL TO "twt_app" USING (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid) WITH CHECK (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid);--> statement-breakpoint
-- (3) members.state write-rejection trigger (AC3). Only the event-replay projector
-- (member/project.ts), which sets app.member_state_writer = 'on' inside its tx, may
-- change member state. Any other state write is a P0 architectural violation.
CREATE FUNCTION members_reject_unguarded_state_write()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.state IS DISTINCT FROM OLD.state
     AND current_setting('app.member_state_writer', true) IS DISTINCT FROM 'on' THEN
    RAISE EXCEPTION
      'members.state direct write rejected — only the event-replay projector may change member state (Story 3.1 AC2/AC3); attempted "%" -> "%" on member %',
      OLD.state, NEW.state, NEW.member_id
      USING ERRCODE = 'P0001';
  END IF;
  RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER members_state_write_guard
  BEFORE UPDATE ON members
  FOR EACH ROW EXECUTE FUNCTION members_reject_unguarded_state_write();
