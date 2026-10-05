-- Migration 0142 — the WARNING-REASON LIST (Story 6.23a, Task 1; NW16, NW17, NW18; AC12). Author-commit
-- `2026-10-04-278` NW16 (as amended by `-279` A9). Hand-authored — ⛔ never regenerate.
--
-- ⭐ What it is: the per-Pariwar list a District Admin (and, in 6.23b, every later approver) picks a WARNING REASON
-- from when approving a claim while a nominee-change warning shows (`-262` FQ2, `-264` FQ12). The Super Admin ADDS
-- reasons and REPLACES them — ⛔ never edits, ⛔ never deletes (BigDev, 2026-10-04): the old row stays, so every past
-- approval still points at the words that were chosen (invariant 10).
-- ⭐ The BUILT-IN GENERIC (`warnings_reviewed`) is a CODE CONSTANT (`APPROVAL_WARNING_GENERIC_REASON`), ⛔ never a row —
-- every Pariwar has it with ⛔ no seeding, and it can ⛔ never be replaced or lost (Trap 15).
-- ⭐ Per Pariwar (Trap 15): a reason is chosen per Pariwar by that Pariwar's Super Admin; a global row would let one
-- Pariwar's words reach another's approvers.
--
-- Columns: `code` is SERVER-generated (`awr_` + 8 hex), immutable, ⛔ never reused (UNIQUE per Pariwar); `label_en`
-- (1–120) and `when_to_use` (1–1000) are STAFF POLICY TEXT (Tier-3), ⛔ not member data — ⛔ not in the anonymizer.
-- `replaces_reason_id` names the reason this one replaced (a COMPOSITE self-FK, so it can ⛔ never point across
-- Pariwars — FK checks bypass RLS; UNIQUE — a reason is replaced at most once). `replaced_at` is NULL while active and
-- is set ONCE.
--
-- Append-only, structurally:
--   · GRANT SELECT, INSERT + a column UPDATE on `replaced_at` ONLY (it also makes Trap 16's `SELECT … FOR SHARE`
--     possible — row locking needs UPDATE privilege on some column, and the per-command UPDATE policy below);
--   · a BEFORE trigger refusing every other UPDATE (jsonb compare — Trap 17(b)), any change to a `replaced_at` once set
--     (one-way — the 0121 model), every DELETE (bar a cascade — Trap 17(a)) and TRUNCATE;
--   · a DEFERRABLE INITIALLY DEFERRED constraint trigger: at COMMIT, a `replaced_at` with ⛔ no row replacing it is
--     refused (so "replaced" can ⛔ never be a disguised delete), and so is a row whose `replaces_reason_id` target
--     is still active (⛔ never two active rows, one claiming to replace the other — `-279` A9).
--
-- Statement order: CREATE → FKs → CHECKs → GRANT → ENABLE → FORCE → POLICY → indexes (0119). Policies per command;
-- ⛔ no DELETE policy, ⛔ never `FOR ALL`.

CREATE TABLE "approval_warning_reasons" (
	"reason_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"pariwar_id" uuid NOT NULL,
	"code" text NOT NULL,
	"label_en" text NOT NULL,
	"when_to_use" text NOT NULL,
	"replaces_reason_id" uuid,
	"replaced_at" timestamp with time zone,
	"created_by_actor" text NOT NULL,
	"created_by_display" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT clock_timestamp() NOT NULL,
	CONSTRAINT "approval_warning_reasons_pariwar_reason_uq" UNIQUE ("pariwar_id", "reason_id"),
	CONSTRAINT "approval_warning_reasons_pariwar_code_uq" UNIQUE ("pariwar_id", "code"),
	CONSTRAINT "approval_warning_reasons_replaces_uq" UNIQUE ("replaces_reason_id")
);--> statement-breakpoint
-- `-279` A9 — COMPOSITE: the replaced reason is in the SAME Pariwar (MATCH SIMPLE: a NULL `replaces_reason_id` is unchecked).
ALTER TABLE "approval_warning_reasons" ADD CONSTRAINT "approval_warning_reasons_replaces_fk" FOREIGN KEY ("pariwar_id", "replaces_reason_id") REFERENCES "public"."approval_warning_reasons"("pariwar_id", "reason_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
-- ⚠ LOCKSTEP with `APPROVAL_WARNING_REASON_CODE_PATTERN` (schema/approval_warning_reasons.ts). The built-in generic's
-- code (`warnings_reviewed`) can ⛔ never match it — so ⛔ no row can impersonate the generic.
ALTER TABLE "approval_warning_reasons" ADD CONSTRAINT "approval_warning_reasons_code_check" CHECK ("code" ~ '^awr_[0-9a-f]{8}$');--> statement-breakpoint
ALTER TABLE "approval_warning_reasons" ADD CONSTRAINT "approval_warning_reasons_label_check" CHECK (length(btrim("label_en")) > 0 AND char_length("label_en") <= 120);--> statement-breakpoint
ALTER TABLE "approval_warning_reasons" ADD CONSTRAINT "approval_warning_reasons_when_to_use_check" CHECK (length(btrim("when_to_use")) > 0 AND char_length("when_to_use") <= 1000);--> statement-breakpoint
ALTER TABLE "approval_warning_reasons" ADD CONSTRAINT "approval_warning_reasons_created_by_check" CHECK (length(btrim("created_by_actor")) > 0 AND length(btrim("created_by_display")) > 0);--> statement-breakpoint
ALTER TABLE "approval_warning_reasons" ADD CONSTRAINT "approval_warning_reasons_not_self_check" CHECK ("replaces_reason_id" IS NULL OR "replaces_reason_id" <> "reason_id");--> statement-breakpoint
GRANT SELECT, INSERT ON "approval_warning_reasons" TO twt_app;--> statement-breakpoint
-- The REPLACEMENT stamp ONLY (NW17). ⛔ No label, note, code or author column is writable.
GRANT UPDATE ("replaced_at") ON "approval_warning_reasons" TO twt_app;--> statement-breakpoint
ALTER TABLE "approval_warning_reasons" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "approval_warning_reasons" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "approval_warning_reasons_tenant_isolation_select" ON "approval_warning_reasons" AS PERMISSIVE FOR SELECT TO "twt_app" USING (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "approval_warning_reasons_tenant_isolation_insert" ON "approval_warning_reasons" AS PERMISSIVE FOR INSERT TO "twt_app" WITH CHECK (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid);--> statement-breakpoint
-- ⚠ Load-bearing (`-279` A12): without it, the `replaced_at` stamp AND Trap 16's `FOR SHARE` silently match 0 rows under FORCE.
CREATE POLICY "approval_warning_reasons_tenant_isolation_update" ON "approval_warning_reasons" AS PERMISSIVE FOR UPDATE TO "twt_app" USING (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid) WITH CHECK (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid);--> statement-breakpoint
CREATE INDEX "approval_warning_reasons_active_idx" ON "approval_warning_reasons" USING btree ("pariwar_id", "created_at") WHERE replaced_at IS NULL;--> statement-breakpoint

-- Append-only (the 0119 idiom, COLUMN-AWARE by a jsonb compare — Trap 17(b): a column a later story adds can ⛔ never
-- escape an explicit list). Holds for EVERY role, the owner included:
--   · UPDATE   — only `replaced_at` may change, and only from NULL (one-way — the 0121 model);
--   · DELETE   — refused, EXCEPT inside a cascade (`pg_trigger_depth() > 1` — Trap 17(a); ⛔ no FK cascades here today);
--   · TRUNCATE — refused.
CREATE FUNCTION approval_warning_reasons_reject_mutation()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    IF (to_jsonb(NEW) - 'replaced_at') IS DISTINCT FROM (to_jsonb(OLD) - 'replaced_at') THEN
      RAISE EXCEPTION
        'approval_warning_reasons is append-only — a reason is never edited; replace it with a newer one (Story 6.23a NW17)'
        USING ERRCODE = 'integrity_constraint_violation';
    END IF;
    IF OLD.replaced_at IS NOT NULL AND NEW.replaced_at IS DISTINCT FROM OLD.replaced_at THEN
      RAISE EXCEPTION
        'approval_warning_reasons.replaced_at is one-way — a replaced reason is never revived or re-stamped (Story 6.23a NW16)'
        USING ERRCODE = 'integrity_constraint_violation';
    END IF;
    RETURN NEW;
  END IF;
  IF TG_OP = 'DELETE' AND pg_trigger_depth() > 1 THEN
    RETURN OLD;
  END IF;
  RAISE EXCEPTION
    'approval_warning_reasons is append-only — a reason is never deleted; it can only be replaced (Story 6.23a NW16)'
    USING ERRCODE = 'integrity_constraint_violation';
END;
$$;
--> statement-breakpoint
CREATE TRIGGER approval_warning_reasons_no_update
  BEFORE UPDATE ON approval_warning_reasons
  FOR EACH ROW EXECUTE FUNCTION approval_warning_reasons_reject_mutation();
--> statement-breakpoint
CREATE TRIGGER approval_warning_reasons_no_delete
  BEFORE DELETE ON approval_warning_reasons
  FOR EACH ROW EXECUTE FUNCTION approval_warning_reasons_reject_mutation();
--> statement-breakpoint
CREATE TRIGGER approval_warning_reasons_no_truncate
  BEFORE TRUNCATE ON approval_warning_reasons
  EXECUTE FUNCTION approval_warning_reasons_reject_mutation();
--> statement-breakpoint

-- The replacement's two halves, checked at COMMIT (both rows exist by then, in either order):
--   (1) a row with `replaced_at` set must have a row naming it in `replaces_reason_id` — ⛔ never a disguised delete;
--   (2) a row with `replaces_reason_id` set must name a reason that IS replaced — ⛔ never two active rows (`-279` A9).
CREATE FUNCTION approval_warning_reasons_replacement_coherence()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.replaced_at IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM approval_warning_reasons r
    WHERE r.pariwar_id = NEW.pariwar_id AND r.replaces_reason_id = NEW.reason_id
  ) THEN
    RAISE EXCEPTION
      'approval_warning_reasons: a reason is replaced only BY a newer reason — a replaced_at with no replacement row is refused (Story 6.23a NW16)'
      USING ERRCODE = 'integrity_constraint_violation';
  END IF;
  IF NEW.replaces_reason_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM approval_warning_reasons r
    WHERE r.pariwar_id = NEW.pariwar_id AND r.reason_id = NEW.replaces_reason_id AND r.replaced_at IS NULL
  ) THEN
    RAISE EXCEPTION
      'approval_warning_reasons: a replacement names a reason that is still active — stamp its replaced_at in the same transaction (Story 6.23a NW16)'
      USING ERRCODE = 'integrity_constraint_violation';
  END IF;
  RETURN NULL;
END;
$$;
--> statement-breakpoint
CREATE CONSTRAINT TRIGGER approval_warning_reasons_replacement_coherence
  AFTER INSERT OR UPDATE ON approval_warning_reasons
  DEFERRABLE INITIALLY DEFERRED
  FOR EACH ROW EXECUTE FUNCTION approval_warning_reasons_replacement_coherence();
