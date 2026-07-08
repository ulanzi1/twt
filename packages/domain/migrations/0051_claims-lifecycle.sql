-- Migration 0051 — claims table + claim_lifecycle_state / claim_intake_channel enums
-- + tenant-isolation RLS + the claims.current_state write-rejection trigger
-- (Story 6.1, Tasks 1 + 6). The claim-lifecycle TWIN of migration 0018 (members).
--
-- ⚠ DO NOT REGENERATE THIS FILE with `db:generate`.
-- The drizzle snapshot baseline is frozen at 0020 (migrations 0021+ are hand-authored
-- against a stale snapshot), so `db:generate` emits a bloated catch-up migration that
-- re-creates dozens of already-applied tables. drizzle-kit also skips an already-applied
-- migration by journal `when` (NOT by SQL hash), so a regenerate-after-apply silently
-- drops the hand-supplements and can raise 42P07 on re-run. This file is HAND-AUTHORED:
-- it carries ONLY the claims DDL (the two CREATE TYPE enums + the CREATE TABLE + ENABLE
-- RLS + the two (pariwar_id / deceased_member_id) indexes + the two CREATE POLICY
-- declarations from packages/domain/src/policies/claims-rls.ts), wrapped with the
-- hand-supplemented GRANT + FORCE DDL (mirrors 0018) AND the BEFORE INSERT OR UPDATE
-- write-rejection trigger (the AC3 structural block — drizzle-kit does not emit
-- trigger DDL; mirror migration 0001's append-only trigger + 0018's member-state
-- trigger, extended to also guard INSERT — see hand-supplement 3 below).
--
-- Hand-supplements (relative to the generated DDL):
--   1. GRANT SELECT, INSERT, UPDATE on claims to twt_app.
--      NOT DELETE: a claim row is NEVER row-deleted — the lifecycle terminates via
--      state transitions (→ settled / → denied), both projected onto the existing row.
--      Grants only to twt_app (the policies bind TO twt_app; twt_service has no policy
--      here — the 0014/0016/0017/0018 rationale).
--   2. ALTER TABLE ... FORCE ROW LEVEL SECURITY — applies RLS even to the (non-
--      superuser) table owner. ENABLE + FORCE kept adjacent.
--   3. The claims.current_state write-rejection trigger (AC3): a BEFORE INSERT OR
--      UPDATE trigger that RAISEs when a row's current_state is being set (on INSERT:
--      unconditionally; on UPDATE: only when NEW.current_state differs from
--      OLD.current_state) AND the projector guard `app.claim_state_writer` is not 'on'.
--      `claims.current_state` is a replay-derived cache; ONLY claim/project.ts (which
--      sets the guard inside its transaction) may set/change it — for EITHER the
--      first-row INSERT or a later UPDATE (Story 6.1 review finding: a BEFORE
--      UPDATE-only trigger would never guard a claim row's create-time state write,
--      since OLD does not exist yet on INSERT). RAISEs with ERRCODE 'P0001' (default
--      RAISE class — distinct from 23505 concurrency / 23xxx integrity) and the unique
--      message PREFIX 'claims.current_state direct write rejected', which the
--      application boundary matches to map → ClaimStateDirectWriteError + emit the P0
--      audit line (claim/errors.ts). A BEFORE trigger that RAISEs aborts its own tx, so
--      it CANNOT write the audit line durably — that is the catching boundary's job.
--      The guard uses current_setting('app.claim_state_writer', true) (missing_ok →
--      NULL when unset), mirroring the app.member_state_writer construct. Non-state
--      UPDATEs (e.g. updated_at only) are unaffected (NEW.current_state IS NOT
--      DISTINCT FROM OLD → no RAISE).
--
-- The roles (twt_app / twt_service) already exist from migration 0002 — no CREATE ROLE
-- here. No snapshot file is emitted (the snapshot baseline is frozen at 0020, matching
-- migrations 0021–0050 which likewise add only a journal entry + a hand-authored .sql).

CREATE TYPE "public"."claim_intake_channel" AS ENUM('member_app', 'helpline', 'trustee_initiated');--> statement-breakpoint
CREATE TYPE "public"."claim_lifecycle_state" AS ENUM('intake_pending', 'intake_converged', 'documents_pending', 'verification_in_progress', 'verifier_review', 'verifier_approved', 'state_trustee_freeze', 'state_trustee_approved', 'approved', 'denied', 'appeal_stage_1', 'appeal_stage_2', 'appeal_stage_3', 'reversed', 'settled');--> statement-breakpoint
CREATE TABLE "claims" (
	"claim_case_id" uuid PRIMARY KEY NOT NULL,
	"pariwar_id" uuid NOT NULL,
	"deceased_member_id" uuid NOT NULL,
	"claimant_actor_id" uuid,
	"intake_channels" "claim_intake_channel"[] NOT NULL,
	"current_state" "claim_lifecycle_state" NOT NULL,
	"state_event_version" bigint NOT NULL,
	"created_by_actor" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
-- (1) Table privileges for the app role on claims (SELECT/INSERT/UPDATE, NOT DELETE —
-- a claim row is never row-deleted; settlement + denial are projected state changes).
GRANT SELECT, INSERT, UPDATE ON "claims" TO twt_app;--> statement-breakpoint
-- drizzle-kit-emitted: turn RLS on for claims.
ALTER TABLE "claims" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
-- (2) FORCE applies RLS even to the (non-superuser) table owner — kept adjacent to ENABLE.
ALTER TABLE "claims" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE INDEX "claims_pariwar_id_idx" ON "claims" USING btree ("pariwar_id");--> statement-breakpoint
CREATE INDEX "claims_deceased_member_id_idx" ON "claims" USING btree ("deceased_member_id");--> statement-breakpoint
CREATE POLICY "claims_tenant_isolation_select" ON "claims" AS PERMISSIVE FOR SELECT TO "twt_app" USING (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "claims_tenant_isolation_write" ON "claims" AS PERMISSIVE FOR ALL TO "twt_app" USING (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid) WITH CHECK (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid);--> statement-breakpoint
-- (3) claims.current_state write-rejection trigger (AC3). Only the event-replay projector
-- (claim/project.ts), which sets app.claim_state_writer = 'on' inside its tx, may set/
-- change claim state — on the first-row INSERT or a later UPDATE alike. Any other
-- state write is a P0 architectural violation (₹50L/decision flow). Fires BEFORE
-- INSERT OR UPDATE (Story 6.1 review finding: BEFORE UPDATE alone never guards the
-- create-time write, since a fresh row has no OLD to compare against).
CREATE FUNCTION claims_reject_unguarded_state_write()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF current_setting('app.claim_state_writer', true) IS DISTINCT FROM 'on' THEN
      RAISE EXCEPTION
        'claims.current_state direct write rejected — only the event-replay projector may create a claim row (Story 6.1 AC3); attempted INSERT of state "%" for claim %',
        NEW.current_state, NEW.claim_case_id
        USING ERRCODE = 'P0001';
    END IF;
    RETURN NEW;
  END IF;

  IF NEW.current_state IS DISTINCT FROM OLD.current_state
     AND current_setting('app.claim_state_writer', true) IS DISTINCT FROM 'on' THEN
    RAISE EXCEPTION
      'claims.current_state direct write rejected — only the event-replay projector may change claim state (Story 6.1 AC3); attempted "%" -> "%" on claim %',
      OLD.current_state, NEW.current_state, NEW.claim_case_id
      USING ERRCODE = 'P0001';
  END IF;
  RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER claims_state_write_guard
  BEFORE INSERT OR UPDATE ON claims
  FOR EACH ROW EXECUTE FUNCTION claims_reject_unguarded_state_write();
