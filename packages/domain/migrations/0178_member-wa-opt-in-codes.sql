-- Migration 0178 — member_wa_opt_in_codes: the WhatsApp CODE for a member whose WhatsApp is on another phone (Story 5.13, WC2;
-- Decision 2026-10-21-374 option A, Trustee-ratified — *"one code per request and one retry"*; build decisions in
-- Decision 2026-10-21-376). Hand-authored — ⛔ never regenerate (`db:generate` diffs against the 0020 snapshot; the migrator skips
-- by the journal `when`). ⛔ DROP SCHEMA. A FORWARD migration — ⛔ an edit of 0042 / 0044 / 0177 (applied —
-- [[project_live_db_test_gotchas]]).
--
-- ONE row per send that was CLAIMED (WC1 step 2): the code's SHA-256 hash (⛔ the code — I7), its expiry (DB clock, 10 minutes),
-- its tries, and what Meta did with it (`send_outcome`). ⭐ THE DATABASE'S RULES (I3 — ⛔ only the handler's):
--   (1) at most TWO counted sends per request — `send_seq ∈ {1, 2}` + the partial UNIQUE `(opt_in_id, send_seq) WHERE send_outcome
--       <> 'released'` (a `released` send provably never reached the member and frees its seq; every other outcome holds it);
--   (2) at most TWO tries per code — `attempts` 0..2, a code with two wrong tries is dead (`invalidated_at` set), a dead code is
--       never consumed;
--   (3) THE TRIGGER (the 0176 shape): identity frozen; `send_outcome` moves only FROM `sending`, once (a counted outcome never
--       becomes `released` and frees a seq); `provider_message_id` / `detail` move only with it; `attempts` never decreases;
--       `consumed_at` / `invalidated_at` go NULL → a value once, never back.
--   (4) GRANT SELECT, INSERT + a COLUMN-LIMITED UPDATE — ⚠ LOCKSTEP with the trigger's `mutable_cols`; ⛔ DELETE (0172's pattern).
--   (5) A composite OWNER FK `(pariwar_id, member_id, opt_in_id)` → `member_wa_opt_in` (0175's pattern — a single-column FK check
--       bypasses RLS, so a cross-Pariwar or cross-member reference would insert); the UNIQUE it needs is added to `member_wa_opt_in`
--       here (trivially true — `opt_in_id` is the key). `ON DELETE CASCADE`: production never DELETEs an opt-in row (⛔ grant; ⛔
--       erasure path deletes one — checked 2026-10-21); test cleanups do.
--   (6) RLS ENABLE + FORCE, PER-COMMAND tenant policies (SELECT / INSERT / UPDATE — ⛔ `FOR ALL`, ⛔ DELETE) — policies/
--       member-wa-opt-in-codes-rls.ts.
-- ⛔ PII: ids, a code HASH, the wamid, a fixed-vocabulary `detail` — ⛔ the code, ⛔ a number.
-- ⚠ Checked BEFORE this file (Story 5.13 Task 1, 2026-10-21): a NEW table (⛔ existing row can fail a CHECK); the new UNIQUE on
-- `member_wa_opt_in` is over its primary key plus two columns (⛔ existing row can fail it).
-- Statement order: the referenced UNIQUE → CREATE → FK → CHECKs → GRANT → ENABLE → FORCE → POLICY → indexes → trigger (0172).

ALTER TABLE "member_wa_opt_in" ADD CONSTRAINT "member_wa_opt_in_owner_uq" UNIQUE ("pariwar_id", "member_id", "opt_in_id");--> statement-breakpoint

CREATE TABLE "member_wa_opt_in_codes" (
	"code_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"pariwar_id" uuid NOT NULL,
	"opt_in_id" uuid NOT NULL,
	"member_id" uuid NOT NULL,
	"send_seq" smallint NOT NULL,
	"code_hash" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"attempts" smallint DEFAULT 0 NOT NULL,
	"consumed_at" timestamp with time zone,
	"invalidated_at" timestamp with time zone,
	"send_outcome" text DEFAULT 'sending' NOT NULL,
	"provider_message_id" text,
	"detail" text,
	"created_at" timestamp with time zone DEFAULT clock_timestamp() NOT NULL
);--> statement-breakpoint
ALTER TABLE "member_wa_opt_in_codes" ADD CONSTRAINT "member_wa_opt_in_codes_opt_in_owner_fk" FOREIGN KEY ("pariwar_id", "member_id", "opt_in_id") REFERENCES "public"."member_wa_opt_in"("pariwar_id", "member_id", "opt_in_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "member_wa_opt_in_codes" ADD CONSTRAINT "member_wa_opt_in_codes_send_seq_check" CHECK ("send_seq" IN (1, 2));--> statement-breakpoint
-- A SHA-256 hex digest (`hashOtp`) — ⛔ a 6-digit code stored by mistake.
ALTER TABLE "member_wa_opt_in_codes" ADD CONSTRAINT "member_wa_opt_in_codes_code_hash_check" CHECK ("code_hash" ~ '^[0-9a-f]{64}$');--> statement-breakpoint
ALTER TABLE "member_wa_opt_in_codes" ADD CONSTRAINT "member_wa_opt_in_codes_expires_check" CHECK ("expires_at" > "created_at");--> statement-breakpoint
ALTER TABLE "member_wa_opt_in_codes" ADD CONSTRAINT "member_wa_opt_in_codes_attempts_check" CHECK ("attempts" BETWEEN 0 AND 2);--> statement-breakpoint
-- A code with two wrong tries is dead.
ALTER TABLE "member_wa_opt_in_codes" ADD CONSTRAINT "member_wa_opt_in_codes_dead_after_two_check" CHECK ("attempts" < 2 OR "invalidated_at" IS NOT NULL);--> statement-breakpoint
-- A dead code is never used.
ALTER TABLE "member_wa_opt_in_codes" ADD CONSTRAINT "member_wa_opt_in_codes_consumed_live_check" CHECK ("consumed_at" IS NULL OR ("invalidated_at" IS NULL AND "attempts" < 2));--> statement-breakpoint
-- ⚠ LOCKSTEP with `WA_OPT_IN_CODE_SEND_OUTCOMES` (schema/member_wa_opt_in_codes.ts — a spec reads the CHECK).
ALTER TABLE "member_wa_opt_in_codes" ADD CONSTRAINT "member_wa_opt_in_codes_send_outcome_check" CHECK ("send_outcome" IN ('sending', 'accepted', 'may_have_sent', 'refused', 'released'));--> statement-breakpoint
-- An ACCEPTED send carries the wamid; every other finished outcome says why.
ALTER TABLE "member_wa_opt_in_codes" ADD CONSTRAINT "member_wa_opt_in_codes_accepted_check" CHECK ("send_outcome" <> 'accepted' OR "provider_message_id" IS NOT NULL);--> statement-breakpoint
ALTER TABLE "member_wa_opt_in_codes" ADD CONSTRAINT "member_wa_opt_in_codes_outcome_detail_check" CHECK ("send_outcome" IN ('sending', 'accepted') OR "detail" IS NOT NULL);--> statement-breakpoint
-- ⭐ THE `detail` GRAMMAR — ⚠ LOCKSTEP with `WA_OPT_IN_CODE_DETAIL_PATTERN` (schema/member_wa_opt_in_codes.ts — a spec pins the two
-- equal). A fixed prefix, then `[a-z0-9_]{1,48}`; ⛔ a space, ⛔ `+`, ⛔ a run of 7+ digits (a bare phone number).
ALTER TABLE "member_wa_opt_in_codes" ADD CONSTRAINT "member_wa_opt_in_codes_detail_vocabulary_check" CHECK ("detail" IS NULL OR "detail" ~ '^(?!.*[0-9]{7})(may_have_sent|rate_limited|api_unavailable|scope|recipient|unknown_scope|pre_send):[a-z0-9_]{1,48}$');--> statement-breakpoint
GRANT SELECT, INSERT ON "member_wa_opt_in_codes" TO twt_app;--> statement-breakpoint
-- ⛔ `code_id`, `pariwar_id`, `opt_in_id`, `member_id`, `send_seq`, `code_hash`, `expires_at`, `created_at`.
-- ⚠ LOCKSTEP with the trigger's `mutable_cols` below.
GRANT UPDATE ("send_outcome", "provider_message_id", "detail", "attempts", "consumed_at", "invalidated_at") ON "member_wa_opt_in_codes" TO twt_app;--> statement-breakpoint
ALTER TABLE "member_wa_opt_in_codes" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "member_wa_opt_in_codes" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "member_wa_opt_in_codes_tenant_isolation_select" ON "member_wa_opt_in_codes" AS PERMISSIVE FOR SELECT TO "twt_app" USING (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "member_wa_opt_in_codes_tenant_isolation_insert" ON "member_wa_opt_in_codes" AS PERMISSIVE FOR INSERT TO "twt_app" WITH CHECK (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "member_wa_opt_in_codes_tenant_isolation_update" ON "member_wa_opt_in_codes" AS PERMISSIVE FOR UPDATE TO "twt_app" USING (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid) WITH CHECK (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid);--> statement-breakpoint
-- ⭐ I3 (1) — at most two COUNTED sends per request: a third non-released row for one opt-in is refused (23505).
CREATE UNIQUE INDEX "member_wa_opt_in_codes_counted_seq_uq" ON "member_wa_opt_in_codes" USING btree ("opt_in_id", "send_seq") WHERE "send_outcome" <> 'released';--> statement-breakpoint
-- The request's codes (the state read, the live-code read, the wrong-attempt UPDATE).
CREATE INDEX "member_wa_opt_in_codes_opt_in_idx" ON "member_wa_opt_in_codes" USING btree ("pariwar_id", "opt_in_id", "created_at");--> statement-breakpoint

CREATE FUNCTION member_wa_opt_in_codes_guard()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  identity_cols text[] := ARRAY['code_id', 'pariwar_id', 'opt_in_id', 'member_id', 'send_seq', 'code_hash', 'expires_at', 'created_at'];
  mutable_cols text[] := ARRAY['send_outcome', 'provider_message_id', 'detail', 'attempts', 'consumed_at', 'invalidated_at'];
  col text;
  old_v jsonb;
  new_v jsonb;
BEGIN
  -- ⚠ LOCKSTEP: every column is either identity or mutable (a NEW column must be added to one list AND, if mutable, to the GRANT).
  old_v := (SELECT jsonb_object_agg(k, to_jsonb(OLD) -> k) FROM unnest(identity_cols) AS k);
  new_v := (SELECT jsonb_object_agg(k, to_jsonb(NEW) -> k) FROM unnest(identity_cols) AS k);
  IF new_v IS DISTINCT FROM old_v THEN
    RAISE EXCEPTION 'member_wa_opt_in_codes: a code row''s identity is never rewritten (Story 5.13 I3)'
      USING ERRCODE = 'integrity_constraint_violation';
  END IF;
  IF NEW.send_outcome IS DISTINCT FROM OLD.send_outcome AND OLD.send_outcome <> 'sending' THEN
    RAISE EXCEPTION 'member_wa_opt_in_codes: a send''s outcome (%) is decided once, from sending (Story 5.13 I3)', OLD.send_outcome
      USING ERRCODE = 'integrity_constraint_violation';
  END IF;
  IF NEW.send_outcome IS NOT DISTINCT FROM OLD.send_outcome
     AND (NEW.provider_message_id IS DISTINCT FROM OLD.provider_message_id OR NEW.detail IS DISTINCT FROM OLD.detail) THEN
    RAISE EXCEPTION 'member_wa_opt_in_codes: provider_message_id / detail are written only with the outcome (Story 5.13 I3)'
      USING ERRCODE = 'integrity_constraint_violation';
  END IF;
  IF NEW.attempts < OLD.attempts THEN
    RAISE EXCEPTION 'member_wa_opt_in_codes: attempts never decreases (Story 5.13 I3)'
      USING ERRCODE = 'integrity_constraint_violation';
  END IF;
  FOREACH col IN ARRAY ARRAY['consumed_at', 'invalidated_at'] LOOP
    IF (to_jsonb(NEW) -> col) IS DISTINCT FROM (to_jsonb(OLD) -> col) AND (to_jsonb(OLD) -> col) <> 'null'::jsonb THEN
      RAISE EXCEPTION 'member_wa_opt_in_codes: % is set once, never cleared (Story 5.13 I3)', col
        USING ERRCODE = 'integrity_constraint_violation';
    END IF;
  END LOOP;
  RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER member_wa_opt_in_codes_guard
  BEFORE UPDATE ON member_wa_opt_in_codes
  FOR EACH ROW EXECUTE FUNCTION member_wa_opt_in_codes_guard();
