-- Migration 0167 — MSG91's SMS DELIVERY REPORTS (Story 6.37b, Task 2; `2026-10-17-347` DR2, DR5, DR5-G, DR6, DR7;
-- ADR-0042).
--
-- ⭐ TWO tables, and ⛔ a change to any send table (I2): the four tables that record a send keep every column, trigger
-- and grant as they are — this migration names ⛔ one of them. A send is named here by its KIND (`cr` a correction
-- reminder or closure notice, `ce` a certificate reminder, `sn` a suspicion notice, `pm` a peer-mesh ping) and its row's
-- uuid — the same pair every SMS carries on the wire as MSG91's `CRQID` (DR3).
--
-- (1) `sms_delivery_report_inbox` — GLOBAL (⛔ `pariwar_id`: MSG91 is ONE account, so a report carries ⛔ Pariwar at
--     ingress). The api's webhook writes ONE allowlisted projection per report (DR2 — ⛔ the phone number, ⛔ the raw body)
--     and ACKs; the jobs correlator claims due rows with a LEASE and settles each one (DR6, DR8). The dedupe is an
--     EXPRESSION unique index on EXACTLY (request id, CRQID blank-coalesced, status code blank-coalesced) — DR7's rule:
--     two reports agreeing on those three are the same report, whatever else differs; the first stored is kept.
--     `settled_at` is stamped by every settle to a non-`pending` state and is the daily prune's clock (30 days).
-- (2) `sms_send_deliveries` — TENANT-scoped, ONE row per send that a matching report reached (DR5), written ONLY by the
--     correlator in one `INSERT … ON CONFLICT DO UPDATE` (DR6's counting contract — `undelivered` is absorbing). ⛔ FK:
--     the send is a kind-discriminated id across four tables (the `cycle_id` unFK'd precedent); the correlator proves
--     the row exists by the lookup it made. ⛔ Pruned — it is the record.
--
-- GRANTS — DR5-G answered (G-a, BigDev 2026-10-17): the house shape, every table jobs drains or prunes grants its
-- writing privileges to `twt_app` (0039 / 0043 / 0047 / 0049; 0128's column-narrowed UPDATE), with per-command policies
-- that MATCH the grants (⛔ a policy for an ungranted command — 0109's "dead text that reads as permission").
-- ⚠ `first_reported_at` is in `sms_send_deliveries`' UPDATE grant: DR6's counting contract (decided with `-347`) moves
-- it to the EARLIER of two reports settled out of order; G-a's column list was written before that contract.
-- ⚠ Jobs' PRODUCTION role is roster Row 26 (`jobs-db-role`, OPEN): today jobs runs on the BYPASSRLS service pool; under
-- Row 26's leading option (a member of `twt_app`, `SET LOCAL ROLE twt_app`) these grants and policies are what the
-- correlator and the prune run under. The api writes the inbox as `twt_app` (`SET LOCAL ROLE twt_app`, ⛔ a scope).
--
-- ⚠ DO NOT REGENERATE THIS FILE with `db:generate` (hand-authored; drizzle-kit skips applied migrations by journal
-- `when` and drops the hand-supplements). DO NOT reset via DROP SCHEMA.

CREATE TABLE "sms_delivery_report_inbox" (
	"report_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"request_id" text NOT NULL,
	"crqid" text,
	"status_code" text,
	"event_name" text,
	"failure_reason" text,
	"reported_delivery_time" text,
	"received_at" timestamp with time zone DEFAULT now() NOT NULL,
	"match_state" text DEFAULT 'pending' NOT NULL,
	"match_detail" text,
	"attempts" integer DEFAULT 0 NOT NULL,
	"next_attempt_at" timestamp with time zone DEFAULT now() NOT NULL,
	"lease_until" timestamp with time zone,
	"settled_at" timestamp with time zone
);--> statement-breakpoint
-- DR2 — the projection's grammars (the SQL mirror of the handler's rules; the CRQID grammar is DR3's ONE SQL copy).
ALTER TABLE "sms_delivery_report_inbox" ADD CONSTRAINT "sms_delivery_report_inbox_request_id_check" CHECK ("request_id" ~ '^[A-Za-z0-9]{1,64}$');--> statement-breakpoint
ALTER TABLE "sms_delivery_report_inbox" ADD CONSTRAINT "sms_delivery_report_inbox_crqid_check" CHECK ("crqid" IS NULL OR "crqid" ~ '^(cr|ce|sn|pm|ot)[0-9a-f]{32}$');--> statement-breakpoint
ALTER TABLE "sms_delivery_report_inbox" ADD CONSTRAINT "sms_delivery_report_inbox_status_code_check" CHECK ("status_code" IS NULL OR "status_code" ~ '^[0-9]{1,3}$');--> statement-breakpoint
ALTER TABLE "sms_delivery_report_inbox" ADD CONSTRAINT "sms_delivery_report_inbox_event_name_check" CHECK ("event_name" IS NULL OR "event_name" ~ '^[A-Za-z_]{1,32}$');--> statement-breakpoint
ALTER TABLE "sms_delivery_report_inbox" ADD CONSTRAINT "sms_delivery_report_inbox_failure_reason_check" CHECK ("failure_reason" IS NULL OR (length("failure_reason") <= 200 AND "failure_reason" !~ '[[:cntrl:]]' AND "failure_reason" !~ '[0-9]{7}'));--> statement-breakpoint
ALTER TABLE "sms_delivery_report_inbox" ADD CONSTRAINT "sms_delivery_report_inbox_reported_delivery_time_check" CHECK ("reported_delivery_time" IS NULL OR length("reported_delivery_time") <= 40);--> statement-breakpoint
-- DR6 — the six match states; a detail is ≤ 64 `[a-z_:]`, present exactly when the row is settled.
ALTER TABLE "sms_delivery_report_inbox" ADD CONSTRAINT "sms_delivery_report_inbox_match_state_check" CHECK ("match_state" IN ('pending', 'matched', 'other_attempt', 'unmatched', 'ignored', 'otp'));--> statement-breakpoint
ALTER TABLE "sms_delivery_report_inbox" ADD CONSTRAINT "sms_delivery_report_inbox_match_detail_check" CHECK ("match_detail" IS NULL OR "match_detail" ~ '^[a-z_:]{1,64}$');--> statement-breakpoint
ALTER TABLE "sms_delivery_report_inbox" ADD CONSTRAINT "sms_delivery_report_inbox_settled_pair_check" CHECK (("match_state" = 'pending') = ("settled_at" IS NULL) AND ("match_state" = 'pending') = ("match_detail" IS NULL));--> statement-breakpoint
ALTER TABLE "sms_delivery_report_inbox" ADD CONSTRAINT "sms_delivery_report_inbox_attempts_check" CHECK ("attempts" >= 0);--> statement-breakpoint
-- ⭐ DR7 — THE dedupe key, EXACTLY (request id, CRQID, status code), blank for an absent one.
CREATE UNIQUE INDEX "sms_delivery_report_inbox_dedupe_uq" ON "sms_delivery_report_inbox" USING btree ("request_id", coalesce("crqid", ''), coalesce("status_code", ''));--> statement-breakpoint
-- DR8 — the drain's claim.
CREATE INDEX "sms_delivery_report_inbox_due_idx" ON "sms_delivery_report_inbox" USING btree ("match_state", "next_attempt_at");--> statement-breakpoint
-- DR7 — the prune's scan (settled rows only).
CREATE INDEX "sms_delivery_report_inbox_settled_idx" ON "sms_delivery_report_inbox" USING btree ("settled_at") WHERE "match_state" <> 'pending';--> statement-breakpoint
-- DR12 — the silence check looks a send's CRQID up in the inbox.
CREATE INDEX "sms_delivery_report_inbox_crqid_idx" ON "sms_delivery_report_inbox" USING btree ("crqid") WHERE "crqid" IS NOT NULL;--> statement-breakpoint
GRANT SELECT, INSERT, DELETE ON "sms_delivery_report_inbox" TO twt_app;--> statement-breakpoint
-- The projection (DR2) and `received_at` are ⛔ ever rewritten — only the drain's lease / settle columns.
GRANT UPDATE ("match_state", "match_detail", "attempts", "next_attempt_at", "lease_until", "settled_at") ON "sms_delivery_report_inbox" TO twt_app;--> statement-breakpoint
ALTER TABLE "sms_delivery_report_inbox" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "sms_delivery_report_inbox" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
-- GLOBAL (0049's `USING (true)` body) in 0128's per-command layout — one policy per GRANTED command.
CREATE POLICY "sms_delivery_report_inbox_global_select" ON "sms_delivery_report_inbox" AS PERMISSIVE FOR SELECT TO "twt_app" USING (true);--> statement-breakpoint
CREATE POLICY "sms_delivery_report_inbox_global_insert" ON "sms_delivery_report_inbox" AS PERMISSIVE FOR INSERT TO "twt_app" WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "sms_delivery_report_inbox_global_update" ON "sms_delivery_report_inbox" AS PERMISSIVE FOR UPDATE TO "twt_app" USING (true) WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "sms_delivery_report_inbox_global_delete" ON "sms_delivery_report_inbox" AS PERMISSIVE FOR DELETE TO "twt_app" USING (true);--> statement-breakpoint
CREATE TABLE "sms_send_deliveries" (
	"send_kind" text NOT NULL,
	"send_row_id" uuid NOT NULL,
	"pariwar_id" uuid NOT NULL,
	"request_id" text NOT NULL,
	"delivery_state" text NOT NULL,
	"status_code" text NOT NULL,
	"failure_reason" text,
	"first_reported_at" timestamp with time zone NOT NULL,
	"reported_at" timestamp with time zone NOT NULL,
	"report_count" integer DEFAULT 1 NOT NULL,
	CONSTRAINT "sms_send_deliveries_pk" PRIMARY KEY ("send_kind", "send_row_id")
);--> statement-breakpoint
ALTER TABLE "sms_send_deliveries" ADD CONSTRAINT "sms_send_deliveries_send_kind_check" CHECK ("send_kind" IN ('cr', 'ce', 'sn', 'pm'));--> statement-breakpoint
ALTER TABLE "sms_send_deliveries" ADD CONSTRAINT "sms_send_deliveries_delivery_state_check" CHECK ("delivery_state" IN ('delivered', 'undelivered'));--> statement-breakpoint
ALTER TABLE "sms_send_deliveries" ADD CONSTRAINT "sms_send_deliveries_request_id_check" CHECK ("request_id" ~ '^[A-Za-z0-9]{1,64}$');--> statement-breakpoint
ALTER TABLE "sms_send_deliveries" ADD CONSTRAINT "sms_send_deliveries_status_code_check" CHECK ("status_code" ~ '^[0-9]{1,3}$');--> statement-breakpoint
ALTER TABLE "sms_send_deliveries" ADD CONSTRAINT "sms_send_deliveries_failure_reason_check" CHECK ("failure_reason" IS NULL OR (length("failure_reason") <= 200 AND "failure_reason" !~ '[[:cntrl:]]' AND "failure_reason" !~ '[0-9]{7}'));--> statement-breakpoint
ALTER TABLE "sms_send_deliveries" ADD CONSTRAINT "sms_send_deliveries_report_count_check" CHECK ("report_count" >= 1);--> statement-breakpoint
ALTER TABLE "sms_send_deliveries" ADD CONSTRAINT "sms_send_deliveries_reported_order_check" CHECK ("first_reported_at" <= "reported_at");--> statement-breakpoint
GRANT SELECT, INSERT ON "sms_send_deliveries" TO twt_app;--> statement-breakpoint
-- DR6's counting contract — the send's identity, its pariwar and its request id are ⛔ ever rewritten. ⛔ DELETE.
GRANT UPDATE ("delivery_state", "status_code", "failure_reason", "first_reported_at", "reported_at", "report_count") ON "sms_send_deliveries" TO twt_app;--> statement-breakpoint
ALTER TABLE "sms_send_deliveries" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "sms_send_deliveries" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "sms_send_deliveries_tenant_isolation_select" ON "sms_send_deliveries" AS PERMISSIVE FOR SELECT TO "twt_app" USING (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "sms_send_deliveries_tenant_isolation_insert" ON "sms_send_deliveries" AS PERMISSIVE FOR INSERT TO "twt_app" WITH CHECK (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "sms_send_deliveries_tenant_isolation_update" ON "sms_send_deliveries" AS PERMISSIVE FOR UPDATE TO "twt_app" USING (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid) WITH CHECK (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid);--> statement-breakpoint
CREATE INDEX "sms_send_deliveries_pariwar_idx" ON "sms_send_deliveries" USING btree ("pariwar_id");
