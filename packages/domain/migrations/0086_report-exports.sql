-- Migration 0086 — report_exports (the ADMIN/trustee reports-&-exports library request + its envelope-
-- encrypted CSV/JSON artifact; Story 10.7, Task 1):
--   · The ADMIN analog of 0033_data-exports. TENANT-ISOLATED (mirror data_exports): the job's generation
--     write + the API's status/download reads run under the requesting admin's app.pariwar_id.
--   · One ROW PER report-export request (PK = report_export_id, gen_random_uuid()). GRANT is SELECT,
--     INSERT, **UPDATE**: the row transitions status (pending → ready|failed → consumed|expired), the job
--     writes the artifact, the download stamps consumed_at, and the TTL vacuum zeroes artifact_ciphertext.
--     This is the deliberate deviation from the append-only Life Events tables (documented in the schema +
--     policy headers). NO direct DELETE.
--   · ⚠ ACTOR-SCOPED, NOT member-scoped — the ONE load-bearing difference from data_exports. The requestor
--     is an ADMIN reading OTHER members' rows, so the ownership/idempotency key is `requested_by_actor_id`
--     (the admin's user id). There is NO `member_id` FK and NO member cascade (an admin is not a member row).
--   · status / failed_reason are NON-PII bounded text (contracts ReportExportStatus / a bounded failure
--     code; value set constrained in the contract, not the DB). params_hash is a sha256 hex digest of the
--     canonical request params (NEVER the raw params — the audit requestPayloadHash boundary). artifact_
--     ciphertext is a Tier-1 envelope ciphertext of the serialized CSV/JSON bytes (NEVER echoed / logged /
--     in any event or audit payload — R1; zeroed → NULL by the vacuum once consumed/expired). artifact_bytes
--     / row_count are non-PII plaintext observability. NULLABLE columns default NULL.
--
-- ⚠ DO NOT REGENERATE THIS FILE with `db:generate`.
-- drizzle-kit skips an already-applied migration by journal `when` (NOT by SQL hash), and the meta/
-- snapshots stop at 0020 (0021+ are hand-authored, snapshot-absent — known drift, NOT gate-blocking).
-- A `db:generate` would diff CURRENT schema against 0020_snapshot.json and wrongly re-emit applied
-- migrations → 42P07. HAND-AUTHORED, mirroring 0033_data-exports' GRANT/FORCE/POLICY structure (minus the
-- member FK). No snapshot emitted. Roles (twt_app) exist from 0002.

-- ── report_exports (TENANT-ISOLATED one-row-per-report-export-request admin artifact) ───────────────
CREATE TABLE "report_exports" (
	"report_export_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"pariwar_id" uuid NOT NULL,
	"requested_by_actor_id" uuid NOT NULL,
	"report_type" text NOT NULL,
	"format" text NOT NULL,
	"params_hash" text NOT NULL,
	"status" text NOT NULL,
	"requested_at" timestamp with time zone NOT NULL,
	"ready_at" timestamp with time zone,
	"expires_at" timestamp with time zone,
	"consumed_at" timestamp with time zone,
	"failed_reason" text,
	"artifact_ciphertext" text,
	"artifact_bytes" integer,
	"row_count" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
-- ⚠ NO member FK / NO cascade — report_exports is ACTOR-scoped (requested_by_actor_id), not member-scoped.
-- GRANT (SELECT/INSERT/UPDATE — DEVIATES from the append-only Life Events tables: the row transitions
-- status, the job writes the artifact, the download stamps consumed_at, the vacuum zeroes the artifact.
-- NO direct DELETE). Policies bind TO twt_app, so grants go to twt_app.
GRANT SELECT, INSERT, UPDATE ON "report_exports" TO twt_app;--> statement-breakpoint
ALTER TABLE "report_exports" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "report_exports" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
-- Tenant-isolation policies (mirror data_exports). Story 1.6 closed-failure construct:
-- unset scope → '' → nullif → NULL → 0 rows (quiet fail-closed).
CREATE POLICY "report_exports_tenant_isolation_select" ON "report_exports" AS PERMISSIVE FOR SELECT TO "twt_app" USING (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "report_exports_tenant_isolation_write" ON "report_exports" AS PERMISSIVE FOR ALL TO "twt_app" USING (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid) WITH CHECK (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid);--> statement-breakpoint
-- Index on pariwar_id: serves the RLS policy predicate scans.
CREATE INDEX "report_exports_pariwar_id_idx" ON "report_exports" ("pariwar_id");--> statement-breakpoint
-- Index on requested_by_actor_id: the active-export / idempotency lookup key (an actor's exports).
CREATE INDEX "report_exports_requested_by_actor_id_idx" ON "report_exports" ("requested_by_actor_id");--> statement-breakpoint
-- Partial unique index: at most ONE active (pending OR unconsumed `ready`) export per
-- (pariwar_id, requested_by_actor_id, report_type, format, params_hash) — DB-level enforcement of the
-- AC2 idempotency invariant. Guards the findActiveReportExport + insertReportExport TOCTOU gap where two
-- concurrent POST requests both read "no active export" and both attempt to insert.
-- ⚠ `format` is load-bearing in the key (review finding): the same report in CSV vs JSON is two DISTINCT
-- artifacts; without it a CSV-then-JSON re-request (same params, first still in flight) idempotently
-- collapses onto the CSV row and the actor downloads the wrong content-type. findActiveReportExport keys
-- on `format` too.
-- (The `expires_at > now()` freshness guard is NOT in the predicate — it is non-immutable; the read-time
-- findActiveReportExport accessor applies it. This index therefore enforces the stronger "no two
-- non-consumed pending/ready" rule, and the request handler reconciles the gap on a 23505 retry-miss via
-- expireStaleReadyReportExport — a stale, past-window `ready` row the vacuum has not yet reaped is
-- expired in place so the actor is never locked out of re-running the report — review finding.)
-- ⚠ `pariwar_id` is load-bearing here, unlike 3.11's analogous `data_exports` index (keyed on `member_id`
-- alone): a member belongs to exactly one tenant, but `requested_by_actor_id` is an ADMIN user id that
-- can hold grants in MULTIPLE Pariwars. Without `pariwar_id` in the key, an admin with an in-flight
-- export in Pariwar A requesting the SAME report in Pariwar B would hit this index's unique violation on
-- a row that RLS then hides from their Pariwar-B-scoped retry re-read — an uncaught 500 plus a
-- cross-tenant existence side-channel (review finding).
-- NOTE: if this migration was already applied to the test DB, DROP the old index and run the CREATE
-- UNIQUE INDEX line below manually (the `format` column was added to the key by a later review patch):
--   DROP INDEX IF EXISTS "report_exports_one_active_per_actor_type_params";
CREATE UNIQUE INDEX "report_exports_one_active_per_actor_type_params" ON "report_exports" ("pariwar_id", "requested_by_actor_id", "report_type", "format", "params_hash") WHERE status IN ('pending', 'ready') AND consumed_at IS NULL;
