-- Migration 0205 — field-worker MOVE REQUESTS and the officers' NOTICES (Story 13.1d, Task 2.1; decision `2026-11-08-458` AD2, AD3,
-- AD9, AD11; the Panel's `-443` Q1 A). Hand-authored — ⛔ never regenerate (`db:generate` diffs against the 0020 snapshot; the migrator
-- skips by the journal `when`, which sits above every sibling's — [[project_sibling_migration_when_order_shared_db]]). Two NEW tables:
-- ⛔ existing row can fail a CHECK, ⛔ edit of an applied migration ([[project_live_db_test_gotchas]]).
--
-- ⭐ `field_worker_move_requests` — the PROJECTION of a request's OWN event stream (`events_log.stream_id = move_request_id`, event
-- prefix `field_worker_move_request.`; AD2 — ⛔ the worker's stream: its projector's head check would refuse every later transition of
-- the worker). Written ONLY by `projectMoveRequest*` (field-worker/move-request-project.ts), which sets
-- `app.field_worker_move_request_writer = 'on'` inside its transaction. The guard trigger (the 0200 shape) refuses:
--   INSERT — an unguarded one; and any but the opening shape: `pending`, version 1, no answer, no refusal / escalation / supersede
--            cause, no posted event (an open that escalates at once is a SECOND event, version 2 — AD8 (b));
--   UPDATE — (a) an unguarded one; (f) any change to a FINAL row (`accepted`, `refused`, `withdrawn`, `closed`, `superseded` — AD3);
--            (b) a change to any column but the projected ones (the 0189 chained-key form — a column added later is immutable by
--            default); (c) a version that does not strictly increase; (e) an `escalation_cause` once written is never changed or
--            cleared (AD11 — a superseded or withdrawn escalated request keeps it).
--   DELETE / TRUNCATE — every role (a request is the Panel's "full log" of a move; only `session_replication_role = 'replica'`, the
--            test fixtures' cleanup, bypasses it).
-- The state ⇔ column pairs are CHECKs (23514), ⛔ trigger rules — the CHECKs are the shape backstop.
-- ⭐ ONE OPEN REQUEST PER WORKER (AD3, I4): the partial UNIQUE `field_worker_move_requests_one_open_uq` — the open's 23505 on THIS
-- name maps to 409 `field_worker.move_request_open` (by constraint name, ⛔ by any 23505).
-- ⭐ States, reasons and causes are TEXT with CHECKs, ⛔ pg enums (⛔ the ADD VALUE trap). ⚠ LOCKSTEP with the tuples in
-- schema/field_worker_move_requests.ts (the policy spec pins them equal).
--
-- ⭐ `field_worker_notices` — ONE row per notice and recipient, written in the deciding transaction (AD9; the 13.1b outbox shape). A
-- notice holds ⛔ name, ⛔ mobile, ⛔ code — ids, districts and a refusal reason only (I6). It is CHANNEL-NEUTRAL: the in-app list reads
-- it now; row `13-1g`'s email sends it later (Q-1 A). `twt_app` INSERTs the identity columns and UPDATEs `seen_at` ONLY (a column
-- grant); the trigger refuses any other change and a second `seen_at`. RLS is by Pariwar ONLY — the scope transaction sets
-- `app.pariwar_id` and no actor setting (db.ts), so the domain read and the seen UPDATE filter `recipient_user_id = <actor>` in SQL.
--
-- Both tables: a COMPOSITE FK `(pariwar_id, field_worker_id)` to `field_workers` (a single-column FK check bypasses RLS — 0178); the
-- notices also `(pariwar_id, move_request_id)` to the requests. PII: ⛔ (ids, districts, reason codes, user ids). The 8-year removal
-- (row 13-1e) is NOT affected. ⛔ Pruned.
-- Statement order: CREATE → CHECKs → GRANT → ENABLE → FORCE → POLICY → indexes → trigger (0202).

CREATE TABLE "field_worker_move_requests" (
	"move_request_id" uuid PRIMARY KEY NOT NULL,
	"pariwar_id" uuid NOT NULL,
	"field_worker_id" uuid NOT NULL,
	"from_district" text NOT NULL,
	"to_district" text NOT NULL,
	"opened_at_end" text NOT NULL,
	"counterpart_district" text NOT NULL,
	"state" text NOT NULL,
	"refusal_reason" text,
	"escalation_cause" text,
	"supersede_cause" text,
	"opened_by" uuid NOT NULL,
	"opened_at" timestamp with time zone DEFAULT now() NOT NULL,
	"answered_by" uuid,
	"answered_at" timestamp with time zone,
	"posted_event_id" uuid,
	"state_event_version" bigint NOT NULL,
	"audit_id" uuid NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "field_worker_move_requests_pariwar_request_uq" UNIQUE("pariwar_id","move_request_id")
);--> statement-breakpoint
ALTER TABLE "field_worker_move_requests" ADD CONSTRAINT "field_worker_move_requests_worker_fk" FOREIGN KEY ("pariwar_id", "field_worker_id") REFERENCES "public"."field_workers"("pariwar_id", "field_worker_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "field_worker_move_requests" ADD CONSTRAINT "field_worker_move_requests_districts_nonblank" CHECK (length(btrim("from_district")) > 0 AND length(btrim("to_district")) > 0);--> statement-breakpoint
ALTER TABLE "field_worker_move_requests" ADD CONSTRAINT "field_worker_move_requests_districts_differ" CHECK ("from_district" <> "to_district");--> statement-breakpoint
ALTER TABLE "field_worker_move_requests" ADD CONSTRAINT "field_worker_move_requests_opened_at_end_check" CHECK ("opened_at_end" IN ('from', 'to'));--> statement-breakpoint
-- The counterpart is the OTHER end from the opener's (AD3: either end opens, the other answers).
ALTER TABLE "field_worker_move_requests" ADD CONSTRAINT "field_worker_move_requests_counterpart_check" CHECK ("counterpart_district" = CASE "opened_at_end" WHEN 'from' THEN "to_district" ELSE "from_district" END);--> statement-breakpoint
-- ⚠ LOCKSTEP with `FIELD_WORKER_MOVE_REQUEST_STATES`.
ALTER TABLE "field_worker_move_requests" ADD CONSTRAINT "field_worker_move_requests_state_check" CHECK ("state" IN ('pending', 'escalated', 'accepted', 'refused', 'withdrawn', 'closed', 'superseded'));--> statement-breakpoint
-- ⚠ LOCKSTEP with `FIELD_WORKER_MOVE_REFUSAL_REASONS` (AD7) — set IFF refused.
ALTER TABLE "field_worker_move_requests" ADD CONSTRAINT "field_worker_move_requests_refusal_reason_check" CHECK ("refusal_reason" IS NULL OR "refusal_reason" IN ('no_capacity', 'work_not_needed_here', 'request_incomplete', 'other'));--> statement-breakpoint
ALTER TABLE "field_worker_move_requests" ADD CONSTRAINT "field_worker_move_requests_refusal_pair" CHECK (("state" = 'refused') = ("refusal_reason" IS NOT NULL));--> statement-breakpoint
-- ⚠ LOCKSTEP with `FIELD_WORKER_MOVE_ESCALATION_CAUSES` (AD8). Written ONCE, never cleared (AD11): NOT NULL when escalated or closed (a
-- close needs an escalation); NULL when pending, accepted or refused (none of them follows one); EITHER when withdrawn or superseded.
ALTER TABLE "field_worker_move_requests" ADD CONSTRAINT "field_worker_move_requests_escalation_cause_check" CHECK ("escalation_cause" IS NULL OR "escalation_cause" IN ('unanswered_7_days', 'no_counterpart_officer'));--> statement-breakpoint
ALTER TABLE "field_worker_move_requests" ADD CONSTRAINT "field_worker_move_requests_escalation_cause_state" CHECK (("state" NOT IN ('escalated', 'closed') OR "escalation_cause" IS NOT NULL) AND ("state" NOT IN ('pending', 'accepted', 'refused') OR "escalation_cause" IS NULL));--> statement-breakpoint
-- ⚠ LOCKSTEP with `FIELD_WORKER_MOVE_SUPERSEDE_CAUSES` (AD3) — set IFF superseded.
ALTER TABLE "field_worker_move_requests" ADD CONSTRAINT "field_worker_move_requests_supersede_cause_check" CHECK ("supersede_cause" IS NULL OR "supersede_cause" IN ('worker_moved', 'worker_ended'));--> statement-breakpoint
ALTER TABLE "field_worker_move_requests" ADD CONSTRAINT "field_worker_move_requests_supersede_pair" CHECK (("state" = 'superseded') = ("supersede_cause" IS NOT NULL));--> statement-breakpoint
-- The act that ENDED it: both NULL while open (pending, escalated — the sweep's escalation ends nothing), both set when final.
ALTER TABLE "field_worker_move_requests" ADD CONSTRAINT "field_worker_move_requests_answered_pair" CHECK (("state" IN ('pending', 'escalated')) = ("answered_by" IS NULL) AND ("answered_by" IS NULL) = ("answered_at" IS NULL));--> statement-breakpoint
-- AD4 — the `field_worker.posted` event the acceptance wrote; set IFF accepted.
ALTER TABLE "field_worker_move_requests" ADD CONSTRAINT "field_worker_move_requests_posted_event_pair" CHECK (("state" = 'accepted') = ("posted_event_id" IS NOT NULL));--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE ON "field_worker_move_requests" TO twt_app;--> statement-breakpoint
ALTER TABLE "field_worker_move_requests" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "field_worker_move_requests" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "field_worker_move_requests_tenant_isolation_select" ON "field_worker_move_requests" AS PERMISSIVE FOR SELECT TO "twt_app" USING (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "field_worker_move_requests_tenant_isolation_insert" ON "field_worker_move_requests" AS PERMISSIVE FOR INSERT TO "twt_app" WITH CHECK (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "field_worker_move_requests_tenant_isolation_update" ON "field_worker_move_requests" AS PERMISSIVE FOR UPDATE TO "twt_app" USING (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid) WITH CHECK (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid);--> statement-breakpoint
-- AD3 / I4 — at most ONE open request per worker.
CREATE UNIQUE INDEX "field_worker_move_requests_one_open_uq" ON "field_worker_move_requests" USING btree ("pariwar_id", "field_worker_id") WHERE "state" IN ('pending', 'escalated');--> statement-breakpoint
-- The list (AD6): a district's requests at EITHER end (two keyset indexes, one per end — the read UNIONs them), and the Pariwar Admin's
-- whole-Pariwar page (no district).
CREATE INDEX "field_worker_move_requests_from_idx" ON "field_worker_move_requests" USING btree ("pariwar_id", "from_district", "opened_at" DESC, "move_request_id" DESC);--> statement-breakpoint
CREATE INDEX "field_worker_move_requests_to_idx" ON "field_worker_move_requests" USING btree ("pariwar_id", "to_district", "opened_at" DESC, "move_request_id" DESC);--> statement-breakpoint
CREATE INDEX "field_worker_move_requests_pariwar_idx" ON "field_worker_move_requests" USING btree ("pariwar_id", "opened_at" DESC, "move_request_id" DESC);--> statement-breakpoint
-- The escalation sweep's cross-tenant selector (AD8 (a)) — the oldest pending first.
CREATE INDEX "field_worker_move_requests_pending_idx" ON "field_worker_move_requests" USING btree ("opened_at", "move_request_id") WHERE "state" = 'pending';--> statement-breakpoint
CREATE FUNCTION field_worker_move_requests_reject_unguarded_write()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF current_setting('app.field_worker_move_request_writer', true) IS DISTINCT FROM 'on' THEN
      RAISE EXCEPTION
        'field_worker_move_requests direct write rejected — only the request projector may create a move request (Story 13.1d AD2); attempted INSERT of request %',
        NEW.move_request_id
        USING ERRCODE = 'P0001';
    END IF;
    IF NEW.state IS DISTINCT FROM 'pending'
       OR NEW.state_event_version IS DISTINCT FROM 1
       OR NEW.refusal_reason IS NOT NULL
       OR NEW.escalation_cause IS NOT NULL
       OR NEW.supersede_cause IS NOT NULL
       OR NEW.answered_by IS NOT NULL
       OR NEW.answered_at IS NOT NULL
       OR NEW.posted_event_id IS NOT NULL THEN
      RAISE EXCEPTION
        'field_worker_move_requests direct write rejected — an opening INSERT must be pending / version 1 / no answer, cause or posted event (Story 13.1d AD3); attempted state "%" version % for request %',
        NEW.state, NEW.state_event_version, NEW.move_request_id
        USING ERRCODE = 'P0001';
    END IF;
    RETURN NEW;
  END IF;

  -- (a) WHO.
  IF current_setting('app.field_worker_move_request_writer', true) IS DISTINCT FROM 'on' THEN
    RAISE EXCEPTION
      'field_worker_move_requests direct write rejected — only the request projector may update a move request (Story 13.1d AD2); attempted UPDATE of request %',
      OLD.move_request_id
      USING ERRCODE = 'P0001';
  END IF;
  -- (f) A FINAL request is frozen (AD3).
  IF OLD.state IN ('accepted', 'refused', 'withdrawn', 'closed', 'superseded') THEN
    RAISE EXCEPTION
      'field_worker_move_requests direct write rejected — a final request (%) is never updated (Story 13.1d AD3); attempted UPDATE of request %',
      OLD.state, OLD.move_request_id
      USING ERRCODE = 'P0001';
  END IF;
  -- (b) Everything but the projected columns is IMMUTABLE.
  IF (to_jsonb(NEW) - 'state' - 'refusal_reason' - 'escalation_cause' - 'supersede_cause' - 'answered_by' - 'answered_at' - 'posted_event_id' - 'state_event_version' - 'audit_id' - 'updated_at')
     IS DISTINCT FROM
     (to_jsonb(OLD) - 'state' - 'refusal_reason' - 'escalation_cause' - 'supersede_cause' - 'answered_by' - 'answered_at' - 'posted_event_id' - 'state_event_version' - 'audit_id' - 'updated_at') THEN
    RAISE EXCEPTION
      'field_worker_move_requests direct write rejected — a request''s identity is immutable after its opening (Story 13.1d AD2); attempted an identity-column change on request %',
      OLD.move_request_id
      USING ERRCODE = 'P0001';
  END IF;
  -- (c) The replay anchor strictly increases.
  IF NEW.state_event_version <= OLD.state_event_version THEN
    RAISE EXCEPTION
      'field_worker_move_requests direct write rejected — state_event_version must strictly increase (Story 13.1d AD2); attempted % -> % on request %',
      OLD.state_event_version, NEW.state_event_version, OLD.move_request_id
      USING ERRCODE = 'P0001';
  END IF;
  -- (e) An escalation cause is written once and never changed or cleared (AD11).
  IF OLD.escalation_cause IS NOT NULL AND NEW.escalation_cause IS DISTINCT FROM OLD.escalation_cause THEN
    RAISE EXCEPTION
      'field_worker_move_requests direct write rejected — an escalation cause is never changed or cleared (Story 13.1d AD11); attempted on request %',
      OLD.move_request_id
      USING ERRCODE = 'P0001';
  END IF;
  RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER field_worker_move_requests_write_guard
  BEFORE INSERT OR UPDATE ON field_worker_move_requests
  FOR EACH ROW EXECUTE FUNCTION field_worker_move_requests_reject_unguarded_write();
--> statement-breakpoint
CREATE FUNCTION field_worker_move_requests_reject_delete()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION
    'field_worker_move_requests direct write rejected — a move request is never deleted (Story 13.1d AD2): % rejected', TG_OP
    USING ERRCODE = 'P0001';
END;
$$;
--> statement-breakpoint
CREATE TRIGGER field_worker_move_requests_no_delete
  BEFORE DELETE ON field_worker_move_requests
  FOR EACH ROW EXECUTE FUNCTION field_worker_move_requests_reject_delete();
--> statement-breakpoint
CREATE TRIGGER field_worker_move_requests_no_truncate
  BEFORE TRUNCATE ON field_worker_move_requests
  FOR EACH STATEMENT EXECUTE FUNCTION field_worker_move_requests_reject_delete();
--> statement-breakpoint
CREATE TABLE "field_worker_notices" (
	"notice_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"pariwar_id" uuid NOT NULL,
	"recipient_user_id" uuid NOT NULL,
	"kind" text NOT NULL,
	"field_worker_id" uuid NOT NULL,
	"move_request_id" uuid,
	"from_district" text NOT NULL,
	"to_district" text NOT NULL,
	"refusal_reason" text,
	"created_at" timestamp with time zone DEFAULT clock_timestamp() NOT NULL,
	"seen_at" timestamp with time zone
);--> statement-breakpoint
ALTER TABLE "field_worker_notices" ADD CONSTRAINT "field_worker_notices_worker_fk" FOREIGN KEY ("pariwar_id", "field_worker_id") REFERENCES "public"."field_workers"("pariwar_id", "field_worker_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "field_worker_notices" ADD CONSTRAINT "field_worker_notices_request_fk" FOREIGN KEY ("pariwar_id", "move_request_id") REFERENCES "public"."field_worker_move_requests"("pariwar_id", "move_request_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
-- ⚠ LOCKSTEP with `FIELD_WORKER_NOTICE_KINDS` (AD9).
ALTER TABLE "field_worker_notices" ADD CONSTRAINT "field_worker_notices_kind_check" CHECK ("kind" IN ('move_request_opened', 'move_request_accepted', 'move_request_refused', 'move_request_escalated', 'move_request_superseded', 'moved_by_pariwar_admin'));--> statement-breakpoint
-- Every kind but the direct move is ABOUT a request; the direct move names the one it superseded, if any.
ALTER TABLE "field_worker_notices" ADD CONSTRAINT "field_worker_notices_request_pair" CHECK ("kind" = 'moved_by_pariwar_admin' OR "move_request_id" IS NOT NULL);--> statement-breakpoint
ALTER TABLE "field_worker_notices" ADD CONSTRAINT "field_worker_notices_refusal_reason_check" CHECK ("refusal_reason" IS NULL OR "refusal_reason" IN ('no_capacity', 'work_not_needed_here', 'request_incomplete', 'other'));--> statement-breakpoint
ALTER TABLE "field_worker_notices" ADD CONSTRAINT "field_worker_notices_refusal_pair" CHECK (("kind" = 'move_request_refused') = ("refusal_reason" IS NOT NULL));--> statement-breakpoint
ALTER TABLE "field_worker_notices" ADD CONSTRAINT "field_worker_notices_districts_check" CHECK (length(btrim("from_district")) > 0 AND length(btrim("to_district")) > 0 AND "from_district" <> "to_district");--> statement-breakpoint
GRANT SELECT ON "field_worker_notices" TO twt_app;--> statement-breakpoint
-- INSERT — EXACTLY what `insertFieldWorkerNotices` writes (`notice_id`, `created_at` are their DEFAULTs; `seen_at` starts NULL).
GRANT INSERT ("pariwar_id", "recipient_user_id", "kind", "field_worker_id", "move_request_id", "from_district", "to_district", "refusal_reason") ON "field_worker_notices" TO twt_app;--> statement-breakpoint
-- UPDATE — the seen mark ONLY.
GRANT UPDATE ("seen_at") ON "field_worker_notices" TO twt_app;--> statement-breakpoint
ALTER TABLE "field_worker_notices" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "field_worker_notices" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "field_worker_notices_tenant_isolation_select" ON "field_worker_notices" AS PERMISSIVE FOR SELECT TO "twt_app" USING (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "field_worker_notices_tenant_isolation_insert" ON "field_worker_notices" AS PERMISSIVE FOR INSERT TO "twt_app" WITH CHECK (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "field_worker_notices_tenant_isolation_update" ON "field_worker_notices" AS PERMISSIVE FOR UPDATE TO "twt_app" USING (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid) WITH CHECK (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid);--> statement-breakpoint
-- An officer's own notices, newest first (the keyset page).
CREATE INDEX "field_worker_notices_recipient_idx" ON "field_worker_notices" USING btree ("pariwar_id", "recipient_user_id", "created_at" DESC, "notice_id" DESC);--> statement-breakpoint
CREATE FUNCTION field_worker_notices_guard_update()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF (to_jsonb(NEW) - 'seen_at') IS DISTINCT FROM (to_jsonb(OLD) - 'seen_at') THEN
    RAISE EXCEPTION
      'field_worker_notices: only seen_at is ever updated (Story 13.1d AD9); attempted on notice %', OLD.notice_id
      USING ERRCODE = 'integrity_constraint_violation';
  END IF;
  IF OLD.seen_at IS NOT NULL AND NEW.seen_at IS DISTINCT FROM OLD.seen_at THEN
    RAISE EXCEPTION
      'field_worker_notices: seen_at is set once and never changed (Story 13.1d AD9); attempted on notice %', OLD.notice_id
      USING ERRCODE = 'integrity_constraint_violation';
  END IF;
  RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER field_worker_notices_guard_update
  BEFORE UPDATE ON field_worker_notices
  FOR EACH ROW EXECUTE FUNCTION field_worker_notices_guard_update();
