-- Migration 0199 — the field-worker ATTRIBUTION-CODE registry + its allocation-exhaustion flags (Story 13.2, AC1 / AC2; FR-81 /
-- FR-82; build decisions AT1–AT10 in the story file — author-level, ⛔ a decision entry). Hand-authored — ⛔ never regenerate
-- (`db:generate` diffs against the 0020 snapshot; the migrator skips by the journal `when`). A NEW pair of tables: ⛔ existing row
-- can fail a CHECK, ⛔ edit of an applied migration ([[project_live_db_test_gotchas]]).
--
-- ⭐ (1) `field_worker_attribution_codes` — ONE PERMANENT 6-digit code per field worker:
--   · UNIQUE (pariwar_id, code) over EVERY row ever written (I1, AT3 — a code is ⛔ freed / reused / reassigned; ⛔ UNIQUE (code):
--     two Pariwars may hand out the same digits); UNIQUE (field_worker_id) (I2 — one code per worker, ever);
--   · the code is exactly six ASCII digits (`[0-9]`, ⛔ `\d` — locale digits, TR5) and ⛔ one of the 20 guessable codes (AT5) —
--     ⚠ LOCKSTEP with `ATTRIBUTION_CODE_DENYLIST` (packages/domain/src/attribution-code/code.ts — a unit test reads this file);
--   · `allocated_at` is the DATABASE's clock: a `BEFORE INSERT` stamp trigger overwrites whatever the writer supplied (I7 — a
--     code credits only captures at or after it; the 0188 `_stamp` shape) — ⛔ a `twt_app` INSERT can backdate a code.
--   ⭐ THE SEAM WITH STORY 13.1 (AT2): `field_worker_id` carries ⛔ FK here. 13.1's migration adds the COMPOSITE FK
--   `FOREIGN KEY ("pariwar_id", "field_worker_id") REFERENCES "field_workers" ("pariwar_id", "field_worker_id")` (a single-column
--   FK check bypasses RLS — the 0178 precedent), `ON DELETE NO ACTION`. ⛔ Add a code column to `field_workers`: 13.1 reads the
--   code through `readAttributionCodeForFieldWorker`.
-- ⭐ (2) `attribution_code_allocation_flags` — the durable trustee-review flag (AT7): who pressed "Add Field Worker" (`actor_id`
--   + the Story 6.11 R5 `actor_display` snapshot — ⛔ blank) and how many draws were tried. ⛔ `field_worker_id` (that
--   registration rolled back). ⛔ Stamp trigger (nothing compares `flagged_at`).
-- ⭐ BOTH tables are APPEND-ONLY for every role that can issue DML on them (a DDL-capable owner can still drop the guard):
-- GRANT SELECT, INSERT only (⛔ UPDATE / DELETE) + a trigger refusing UPDATE /
-- DELETE row-wise and TRUNCATE statement-wise (the 0192 shape — I3). RLS ENABLE + FORCE, PER-COMMAND tenant policies (SELECT /
-- INSERT — ⛔ `FOR ALL`) — policies/field-worker-attribution-codes-rls.ts, policies/attribution-code-allocation-flags-rls.ts.
-- ⛔ PII. ⛔ Change to `member_attribution` (AC9).
-- Statement order: CREATE → CHECKs → GRANT → ENABLE → FORCE → POLICY → indexes → triggers (0178 / 0192).

-- ── (1) the codes ────────────────────────────────────────────────────────────────────────────────────────────────────────
CREATE TABLE "field_worker_attribution_codes" (
	"attribution_code_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"pariwar_id" uuid NOT NULL,
	"field_worker_id" uuid NOT NULL,
	"code" text NOT NULL,
	"allocation_attempts" smallint NOT NULL,
	"allocated_at" timestamp with time zone DEFAULT clock_timestamp() NOT NULL,
	CONSTRAINT "field_worker_attribution_codes_pariwar_code_uq" UNIQUE("pariwar_id","code"),
	CONSTRAINT "field_worker_attribution_codes_field_worker_uq" UNIQUE("field_worker_id")
);--> statement-breakpoint
ALTER TABLE "field_worker_attribution_codes" ADD CONSTRAINT "field_worker_attribution_codes_code_format_check" CHECK ("code" ~ '^[0-9]{6}$');--> statement-breakpoint
-- ⚠ LOCKSTEP with `ATTRIBUTION_CODE_DENYLIST` (attribution-code/code.ts): the ten repdigits, the five ascending runs, their reverses.
ALTER TABLE "field_worker_attribution_codes" ADD CONSTRAINT "field_worker_attribution_codes_code_denylist_check" CHECK ("code" NOT IN ('000000', '111111', '222222', '333333', '444444', '555555', '666666', '777777', '888888', '999999', '012345', '123456', '234567', '345678', '456789', '543210', '654321', '765432', '876543', '987654'));--> statement-breakpoint
ALTER TABLE "field_worker_attribution_codes" ADD CONSTRAINT "field_worker_attribution_codes_attempts_check" CHECK ("allocation_attempts" BETWEEN 1 AND 32);--> statement-breakpoint
GRANT SELECT, INSERT ON "field_worker_attribution_codes" TO twt_app;--> statement-breakpoint
ALTER TABLE "field_worker_attribution_codes" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "field_worker_attribution_codes" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "field_worker_attribution_codes_tenant_isolation_select" ON "field_worker_attribution_codes" AS PERMISSIVE FOR SELECT TO "twt_app" USING (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "field_worker_attribution_codes_tenant_isolation_insert" ON "field_worker_attribution_codes" AS PERMISSIVE FOR INSERT TO "twt_app" WITH CHECK (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid);--> statement-breakpoint
-- (The lookup `(pariwar_id, code)` and the holder read `(field_worker_id)` are served by the two UNIQUE indexes.)

-- ── (2) the flags ────────────────────────────────────────────────────────────────────────────────────────────────────────
CREATE TABLE "attribution_code_allocation_flags" (
	"flag_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"pariwar_id" uuid NOT NULL,
	"attempts" smallint NOT NULL,
	"actor_id" uuid NOT NULL,
	"actor_display" text NOT NULL,
	"flagged_at" timestamp with time zone DEFAULT clock_timestamp() NOT NULL
);--> statement-breakpoint
ALTER TABLE "attribution_code_allocation_flags" ADD CONSTRAINT "attribution_code_allocation_flags_attempts_check" CHECK ("attempts" BETWEEN 1 AND 32);--> statement-breakpoint
ALTER TABLE "attribution_code_allocation_flags" ADD CONSTRAINT "attribution_code_allocation_flags_actor_display_check" CHECK (length(btrim("actor_display")) > 0);--> statement-breakpoint
GRANT SELECT, INSERT ON "attribution_code_allocation_flags" TO twt_app;--> statement-breakpoint
ALTER TABLE "attribution_code_allocation_flags" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "attribution_code_allocation_flags" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "attribution_code_allocation_flags_tenant_isolation_select" ON "attribution_code_allocation_flags" AS PERMISSIVE FOR SELECT TO "twt_app" USING (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "attribution_code_allocation_flags_tenant_isolation_insert" ON "attribution_code_allocation_flags" AS PERMISSIVE FOR INSERT TO "twt_app" WITH CHECK (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid);--> statement-breakpoint
-- The trustee surface's read (C3): a Pariwar's flags, newest first.
CREATE INDEX "attribution_code_allocation_flags_pariwar_flagged_idx" ON "attribution_code_allocation_flags" USING btree ("pariwar_id", "flagged_at");--> statement-breakpoint

-- ── (1) the DB clock stamps `allocated_at` (I7) ─────────────────────────────────────────────────────────────────────────
CREATE FUNCTION field_worker_attribution_codes_stamp()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.allocated_at := clock_timestamp();
  RETURN NEW;
END;
$$;--> statement-breakpoint
CREATE TRIGGER field_worker_attribution_codes_stamp
  BEFORE INSERT ON field_worker_attribution_codes
  FOR EACH ROW EXECUTE FUNCTION field_worker_attribution_codes_stamp();--> statement-breakpoint

-- ── (1) + (2) append-only, for every role that can issue DML (the owner included; ⛔ DDL — it can drop the trigger) ─────
CREATE FUNCTION attribution_code_reject_mutation()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION
    '% is append-only — an attribution code is never freed, reused or reassigned, and a flag is never edited (Story 13.2 I3): % rejected', TG_TABLE_NAME, TG_OP
    USING ERRCODE = 'integrity_constraint_violation';
END;
$$;--> statement-breakpoint
CREATE TRIGGER field_worker_attribution_codes_no_update_delete
  BEFORE UPDATE OR DELETE ON field_worker_attribution_codes
  FOR EACH ROW EXECUTE FUNCTION attribution_code_reject_mutation();--> statement-breakpoint
CREATE TRIGGER field_worker_attribution_codes_no_truncate
  BEFORE TRUNCATE ON field_worker_attribution_codes
  EXECUTE FUNCTION attribution_code_reject_mutation();--> statement-breakpoint
CREATE TRIGGER attribution_code_allocation_flags_no_update_delete
  BEFORE UPDATE OR DELETE ON attribution_code_allocation_flags
  FOR EACH ROW EXECUTE FUNCTION attribution_code_reject_mutation();--> statement-breakpoint
CREATE TRIGGER attribution_code_allocation_flags_no_truncate
  BEFORE TRUNCATE ON attribution_code_allocation_flags
  EXECUTE FUNCTION attribution_code_reject_mutation();
