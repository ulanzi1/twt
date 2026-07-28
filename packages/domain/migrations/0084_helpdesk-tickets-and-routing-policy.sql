-- Migration 0084 — helpdesk_tickets + helpdesk_routing_policy_versions (Story 10.1, Task 2).
-- The FIFTH event-derived-state primitive (twin of members/claims/pools/alerts) + the versioned
-- per-Pariwar routing-policy registry. Mirrors 0078 (alerts): enums + tables + GRANT + ENABLE/FORCE
-- RLS + indexes + CREATE POLICY (from the policies/*-rls.ts declarations) + the current_state
-- write-rejection trigger.
--
-- ⚠ DO NOT REGENERATE with `db:generate` (same discipline as 0021–0083 per 0078's header): the
-- drizzle snapshot baseline is frozen at 0020, so a regenerate emits a bloated catch-up migration
-- and can raise 42P07. This file is HAND-AUTHORED, carrying ONLY this story's DDL.
--
-- scope_dimension already exists (migration for role_grants) — the routed_to_scope_dimension column
-- REFERENCES it; it is NOT re-created here (a second CREATE TYPE would 42710).
--
-- Hand-supplements (relative to the generated DDL):
--   1. GRANT SELECT, INSERT, UPDATE on both tables to twt_app. NOT DELETE: a ticket row is never
--      row-deleted (the lifecycle terminates via state transitions → closed); a policy-version row
--      is append-only (only the superseded_by_version forward-pointer is UPDATEd).
--   2. ENABLE + FORCE ROW LEVEL SECURITY on both.
--   3. The helpdesk_tickets.current_state write-rejection trigger (AC4): BEFORE INSERT OR UPDATE,
--      RAISEs when current_state/state_event_version is set/changed and the projector guard
--      `app.helpdesk_state_writer` is not 'on' (mirror 0078's alerts trigger; guards both the
--      first-row INSERT and later UPDATEs — the fresh row has no OLD on INSERT). Beyond the WHO
--      guard, it also asserts WHAT a guarded write may set: an INSERT's current_state must be the
--      genesis value 'open', and an UPDATE's state_event_version must strictly increase — a buggy
--      guarded writer still fails loudly rather than silently corrupting the replay anchor.
--   4. The helpdesk_routing_policy_versions append-only trigger (the clause_versions immutability
--      posture the Dev Notes cite): BEFORE UPDATE, RAISEs if any column other than
--      superseded_by_version changes. A comment alone doesn't stop a buggy or malicious UPDATE from
--      rewriting a supposedly-immutable historical policy version — this is the DB-level backstop.
--   5. A composite self-referential FK on (pariwar_id, superseded_by_version) so the supersession
--      forward-pointer can never point at a version that doesn't exist for that Pariwar.
--
-- The roles (twt_app / twt_service) already exist from migration 0002 — no CREATE ROLE. No snapshot
-- file is emitted (baseline frozen at 0020; mirror 0021–0083).

CREATE TYPE "public"."helpdesk_category" AS ENUM('kyc-trouble', 'payment-failed', 'utr-mismatch', 'claim-status', 'profile-update', 'niyamavali-question', 'partner-module-issue', 'complaint', 'other');--> statement-breakpoint
CREATE TYPE "public"."helpdesk_ticket_state" AS ENUM('open', 'in_progress', 'awaiting_member', 'resolved', 'closed', 'reopened');--> statement-breakpoint
CREATE TYPE "public"."helpdesk_created_via" AS ENUM('member_app', 'helpline_call');--> statement-breakpoint
CREATE TABLE "helpdesk_tickets" (
	"ticket_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"pariwar_id" uuid NOT NULL,
	"subject_member_id" uuid,
	"subject_actor_id" uuid,
	"category" "helpdesk_category" NOT NULL,
	"subcategory" text,
	"body" text NOT NULL,
	"attachments" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"current_state" "helpdesk_ticket_state" NOT NULL,
	"state_event_version" bigint NOT NULL,
	"routed_to_scope_dimension" "scope_dimension" NOT NULL,
	"routed_to_scope_value" text,
	"routed_to_role" text NOT NULL,
	"routed_to_actor_id" uuid,
	"routing_policy_version" integer NOT NULL,
	"member_scope_context" jsonb NOT NULL,
	"assigned_at" timestamp with time zone NOT NULL,
	"sla_first_response_due" timestamp with time zone NOT NULL,
	"sla_resolution_due" timestamp with time zone NOT NULL,
	"audit_id" uuid NOT NULL,
	"created_via" "helpdesk_created_via" NOT NULL,
	"operator_attribution" text,
	"claim_case_id" uuid,
	"pool_id" uuid,
	"module_id" uuid,
	"validity_lookup_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "helpdesk_tickets_subject_xor" CHECK (num_nonnulls("subject_member_id", "subject_actor_id") = 1)
);
--> statement-breakpoint
CREATE TABLE "helpdesk_routing_policy_versions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"pariwar_id" uuid NOT NULL,
	"version" integer NOT NULL,
	"effective_at" timestamp with time zone NOT NULL,
	"policy_document" jsonb NOT NULL,
	"authored_by_actor" uuid,
	"audit_id" uuid,
	"superseded_by_version" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
-- (1) Table privileges for the app role (SELECT/INSERT/UPDATE, NOT DELETE — see the header).
GRANT SELECT, INSERT, UPDATE ON "helpdesk_tickets" TO twt_app;--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE ON "helpdesk_routing_policy_versions" TO twt_app;--> statement-breakpoint
-- drizzle-kit-emitted: turn RLS on, then FORCE it (applies even to the non-superuser table owner).
ALTER TABLE "helpdesk_tickets" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "helpdesk_tickets" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "helpdesk_routing_policy_versions" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "helpdesk_routing_policy_versions" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE INDEX "helpdesk_tickets_pariwar_id_idx" ON "helpdesk_tickets" USING btree ("pariwar_id");--> statement-breakpoint
CREATE INDEX "helpdesk_tickets_pariwar_state_idx" ON "helpdesk_tickets" USING btree ("pariwar_id","current_state");--> statement-breakpoint
CREATE UNIQUE INDEX "helpdesk_routing_policy_versions_pariwar_version_uq" ON "helpdesk_routing_policy_versions" USING btree ("pariwar_id","version");--> statement-breakpoint
CREATE INDEX "helpdesk_routing_policy_versions_pariwar_effective_idx" ON "helpdesk_routing_policy_versions" USING btree ("pariwar_id","effective_at");--> statement-breakpoint
-- (5) The supersession forward-pointer can only ever point at a version that really exists for the
-- SAME Pariwar (composite FK against the unique index above). Safe given the write order
-- (registry.ts createRoutingPolicyVersion): the new version row is INSERTed first, THEN the prior
-- row's superseded_by_version is UPDATEd to point at it — the referenced row already exists.
ALTER TABLE "helpdesk_routing_policy_versions"
  ADD CONSTRAINT "helpdesk_routing_policy_versions_superseded_by_fk"
  FOREIGN KEY ("pariwar_id", "superseded_by_version")
  REFERENCES "helpdesk_routing_policy_versions" ("pariwar_id", "version");--> statement-breakpoint
CREATE POLICY "helpdesk_tickets_tenant_isolation_select" ON "helpdesk_tickets" AS PERMISSIVE FOR SELECT TO "twt_app" USING (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "helpdesk_tickets_tenant_isolation_insert" ON "helpdesk_tickets" AS PERMISSIVE FOR INSERT TO "twt_app" WITH CHECK (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "helpdesk_tickets_tenant_isolation_update" ON "helpdesk_tickets" AS PERMISSIVE FOR UPDATE TO "twt_app" USING (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid) WITH CHECK (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "helpdesk_routing_policy_versions_tenant_isolation_select" ON "helpdesk_routing_policy_versions" AS PERMISSIVE FOR SELECT TO "twt_app" USING (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "helpdesk_routing_policy_versions_tenant_isolation_insert" ON "helpdesk_routing_policy_versions" AS PERMISSIVE FOR INSERT TO "twt_app" WITH CHECK (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "helpdesk_routing_policy_versions_tenant_isolation_update" ON "helpdesk_routing_policy_versions" AS PERMISSIVE FOR UPDATE TO "twt_app" USING (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid) WITH CHECK (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid);--> statement-breakpoint
-- (3) helpdesk_tickets.current_state write-rejection trigger (AC4). Only the event-replay projector
-- (helpdesk/project.ts), which sets app.helpdesk_state_writer = 'on' inside its tx, may set/change the
-- state cache pair (current_state + state_event_version) — on the first-row INSERT or a later UPDATE.
-- Any other state write is an architectural violation. RAISEs with ERRCODE 'P0001' and the unique
-- message PREFIX 'helpdesk_tickets.current_state direct write rejected'.
CREATE FUNCTION helpdesk_tickets_reject_unguarded_state_write()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF current_setting('app.helpdesk_state_writer', true) IS DISTINCT FROM 'on' THEN
      RAISE EXCEPTION
        'helpdesk_tickets.current_state direct write rejected — only the event-replay projector may create a ticket row (Story 10.1 AC4); attempted INSERT of state "%" for ticket %',
        NEW.current_state, NEW.ticket_id
        USING ERRCODE = 'P0001';
    END IF;
    -- WHAT, not just WHO: a guarded genesis INSERT must land at the one legal genesis state.
    IF NEW.current_state IS DISTINCT FROM 'open' THEN
      RAISE EXCEPTION
        'helpdesk_tickets.current_state direct write rejected — a guarded genesis INSERT must set current_state = ''open'' (Story 10.1 AC4); attempted "%" for ticket %',
        NEW.current_state, NEW.ticket_id
        USING ERRCODE = 'P0001';
    END IF;
    RETURN NEW;
  END IF;

  IF (NEW.current_state IS DISTINCT FROM OLD.current_state
      OR NEW.state_event_version IS DISTINCT FROM OLD.state_event_version)
     AND current_setting('app.helpdesk_state_writer', true) IS DISTINCT FROM 'on' THEN
    RAISE EXCEPTION
      'helpdesk_tickets.current_state direct write rejected — only the event-replay projector may change ticket state (Story 10.1 AC4); attempted "%" -> "%" (state_event_version % -> %) on ticket %',
      OLD.current_state, NEW.current_state, OLD.state_event_version, NEW.state_event_version, NEW.ticket_id
      USING ERRCODE = 'P0001';
  END IF;

  -- WHAT, not just WHO: even a GUARDED update must keep the replay anchor moving forward — a
  -- buggy guarded writer setting state_event_version backward (or unchanged while claiming a new
  -- state) would desync the cache from the actual event count.
  IF current_setting('app.helpdesk_state_writer', true) IS NOT DISTINCT FROM 'on'
     AND NEW.state_event_version <= OLD.state_event_version THEN
    RAISE EXCEPTION
      'helpdesk_tickets.current_state direct write rejected — state_event_version must strictly increase (Story 10.1 AC4); attempted % -> % on ticket %',
      OLD.state_event_version, NEW.state_event_version, NEW.ticket_id
      USING ERRCODE = 'P0001';
  END IF;
  RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER helpdesk_tickets_state_write_guard
  BEFORE INSERT OR UPDATE ON helpdesk_tickets
  FOR EACH ROW EXECUTE FUNCTION helpdesk_tickets_reject_unguarded_state_write();
--> statement-breakpoint
-- (4) helpdesk_routing_policy_versions append-only trigger — the clause_versions immutability
-- posture: a version row is INSERT-only; the SOLE legitimately-mutable column on an existing row is
-- superseded_by_version (the forward-pointer). Any other column changing on an UPDATE is rejected.
CREATE FUNCTION helpdesk_routing_policy_versions_reject_mutation()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.pariwar_id IS DISTINCT FROM OLD.pariwar_id
     OR NEW.version IS DISTINCT FROM OLD.version
     OR NEW.effective_at IS DISTINCT FROM OLD.effective_at
     OR NEW.policy_document IS DISTINCT FROM OLD.policy_document
     OR NEW.authored_by_actor IS DISTINCT FROM OLD.authored_by_actor
     OR NEW.audit_id IS DISTINCT FROM OLD.audit_id
     OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
    RAISE EXCEPTION
      'helpdesk_routing_policy_versions immutable-column write rejected — only superseded_by_version may be updated on an existing version row (Story 10.1 AC2/AC3, the clause_versions posture); attempted a change to pariwar_id/version/effective_at/policy_document/authored_by_actor/audit_id/created_at on version % for pariwar %',
      OLD.version, OLD.pariwar_id
      USING ERRCODE = 'P0001';
  END IF;
  RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER helpdesk_routing_policy_versions_immutability_guard
  BEFORE UPDATE ON helpdesk_routing_policy_versions
  FOR EACH ROW EXECUTE FUNCTION helpdesk_routing_policy_versions_reject_mutation();
