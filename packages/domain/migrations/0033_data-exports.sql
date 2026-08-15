-- Migration 0033 — data_exports (the DPDPA data-portability export request + its envelope-encrypted
-- ZIP artifact; Story 3.11, Task 1):
--   · TENANT-ISOLATED (mirror member_withdrawals / member_addresses tenant-isolation): the job's
--     generation write + the API's status/download reads run under the member's app.pariwar_id.
--   · One ROW PER export request (PK = export_id, gen_random_uuid()). GRANT is SELECT, INSERT, **UPDATE**:
--     the row transitions status (pending → ready|failed → consumed|expired), the job writes the
--     artifact, the download stamps consumed_at, and the TTL vacuum zeroes artifact_ciphertext. This is
--     the deliberate deviation from the append-only Life Events tables (documented in the schema +
--     policy headers). NO direct DELETE — RTBF removal (Story 3.12) is via the member FK cascade.
--   · status / failed_reason are NON-PII bounded text (contracts DataExportStatus / a bounded failure
--     code; value set constrained in the contract, not the DB — the member_withdrawals.reason_code
--     posture). artifact_ciphertext is a Tier-1 envelope ciphertext of the WHOLE ZIP (NEVER echoed /
--     logged / in any event or audit payload — R1; zeroed → NULL by the vacuum once consumed/expired).
--     artifact_bytes is the non-PII plaintext size (observability). NULLABLE columns default NULL.
--   · FK member_id → members.member_id ON DELETE CASCADE (RTBF, Story 3.12).
--
-- ⚠ DO NOT REGENERATE THIS FILE with `db:generate`.
-- drizzle-kit skips an already-applied migration by journal `when` (NOT by SQL hash), and the meta/
-- snapshots stop at 0020 (0021-0033 are hand-authored, snapshot-absent — known drift, NOT gate-blocking).
-- A `db:generate` would diff CURRENT schema against 0020_snapshot.json and wrongly re-emit applied
-- 0021-0032 → 42P07. HAND-AUTHORED, mirroring 0032_member-withdrawals' GRANT/FORCE/POLICY structure.
-- No snapshot emitted. Roles (twt_app) exist from 0002.

-- ── data_exports (TENANT-ISOLATED one-row-per-export-request DPDPA data-portability artifact) ──────
CREATE TABLE "data_exports" (
	"export_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"member_id" uuid NOT NULL,
	"pariwar_id" uuid NOT NULL,
	"status" text NOT NULL,
	"requested_at" timestamp with time zone NOT NULL,
	"ready_at" timestamp with time zone,
	"expires_at" timestamp with time zone,
	"consumed_at" timestamp with time zone,
	"failed_reason" text,
	"artifact_ciphertext" text,
	"artifact_bytes" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
-- FK → members.member_id (ON DELETE CASCADE: RTBF row-deletes the member, Story 3.12).
ALTER TABLE "data_exports" ADD CONSTRAINT "data_exports_member_id_members_member_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("member_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
-- GRANT (SELECT/INSERT/UPDATE — DEVIATES from the append-only Life Events tables: the row transitions
-- status, the job writes the artifact, the download stamps consumed_at, the vacuum zeroes the
-- artifact. NO direct DELETE — RTBF removal is via the member FK cascade). Policies bind TO twt_app,
-- so grants go to twt_app.
GRANT SELECT, INSERT, UPDATE ON "data_exports" TO twt_app;--> statement-breakpoint
ALTER TABLE "data_exports" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "data_exports" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
-- Tenant-isolation policies (mirror member_withdrawals). Story 1.6 closed-failure construct:
-- unset scope → '' → nullif → NULL → 0 rows (quiet fail-closed).
CREATE POLICY "data_exports_tenant_isolation_select" ON "data_exports" AS PERMISSIVE FOR SELECT TO "twt_app" USING (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "data_exports_tenant_isolation_write" ON "data_exports" AS PERMISSIVE FOR ALL TO "twt_app" USING (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid) WITH CHECK (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid);--> statement-breakpoint
-- Index on member_id: the active-export / status lookup key (a member's exports).
CREATE INDEX "data_exports_member_id_idx" ON "data_exports" ("member_id");--> statement-breakpoint
-- Index on pariwar_id: serves the RLS policy predicate scans.
CREATE INDEX "data_exports_pariwar_id_idx" ON "data_exports" ("pariwar_id");--> statement-breakpoint
-- Partial unique index: at most ONE `pending` row per member at a time — DB-level enforcement of the
-- AC1 "one active export" invariant. Guards the findActiveExport + insertDataExport TOCTOU gap where
-- two concurrent POST requests can both read "no active export" and both attempt to insert.
-- NOTE: if this migration was already applied to the test DB, run the CREATE UNIQUE INDEX line manually.
CREATE UNIQUE INDEX "data_exports_one_pending_per_member" ON "data_exports" ("member_id") WHERE status = 'pending';
