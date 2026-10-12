-- Migration 0156 — the neighbours' ANSWERS, and the ping's delivery-record columns (Story 6.27a, Task 2; AC3;
-- `2026-10-10-311` PM4 [a], PM7 (a), PM21 (a)). Hand-authored — ⛔ never regenerate (`db:generate` diffs against the 0020
-- snapshot; the migrator skips by the journal `when`).
--
-- ⭐ (1) THE PING's DELIVERY RECORD — COLUMNS + STRUCTURAL CHECKs ONLY (PM4 [a]). 6.6's `claim_peer_mesh_pings` holds one row
-- per chosen neighbour and ⛔ no dispatch state (0054, D1). 6.27c writes ONE text per ping, once ever, onto THIS row (0151 /
-- 0155 ADAPTED — ⛔ never mirrored literally: 0151 INSERTs a row at begin; here `send_outcome IS NULL` means "⛔ not yet
-- begun"). `send_outcome` takes 0138's values EXCEPT `recorded` (meaningless for a text); `attempt_count` is 0 until begin
-- and ≥ 1 after (`(send_outcome IS NULL) = (attempt_count = 0)`); `locale_source` records WHY a language was chosen (PM22 —
-- `pariwar_default` until row 6-35); `link_code` is the 12-character base62 code in the text's link (PM21 (a) — ⛔ not a
-- credential; written ONCE). ⚠ The `detail` / `first_detail` GRAMMAR CHECK and its builder are 6.27c's (the vocabulary lives
-- with its only writer, so a merged 6.27a can ⛔ never refuse a 6.27c detail) — here only their LENGTH.
-- ⭐ (2) THE PING's GRANT IS NARROWED (F36). 0054 granted `UPDATE` table-wide, and a column GRANT cannot narrow a table grant ⇒
-- `REVOKE UPDATE` first, then `GRANT UPDATE (<exactly the delivery columns>)`: 6.6's identity columns (`selection_id`,
-- `pariwar_id`, `member_id`, `message_key`, `constructed_at`) are ⛔ never rewritten by `twt_app` (⛔ nothing updates a ping
-- today — `persistPeerMeshPingIntents` inserts with `ON CONFLICT DO NOTHING`).
-- ⭐ (3) THE PING's FINISHED-ROW TRIGGER: a finished `send_outcome` (⛔ NULL, ⛔ `attempting`) is ⛔ never rewritten — ⛔ any
-- delivery column of a finished row changes; `send_outcome` never returns to NULL; `aging_since` moves only forward; `link_code`
-- is written once. ⚠ It freezes ONLY the delivery columns, so row 6-31's WhatsApp reminder can keep its OWN record (Trap 17).
-- ⭐ (4) `claim_peer_mesh_replies` — ONE per ping (PM7 (a)): the version pinned at the first save, `started_at`, `submitted_at`
-- (forward-only — the replies trigger refuses clearing or moving it; every other column is frozen). ⛔ No PII (ids only).
-- ⭐ (5) `claim_peer_mesh_reply_answers` — APPEND-ONLY answer rows; the LIVE answer = `superseded_at IS NULL` (one per question
-- per reply — a partial UNIQUE). Plaintext CODES for a non-sensitive question, a Tier-1 ciphertext for a sensitive one (the
-- date, the cause, the illness — `PEER_MESH_ANSWER_FIELD_CLASS`); the date's THREE keyed window indexes (D − 1, D, D + 1, under
-- `DEATH_DATE_INDEX_FIELD_CLASS`) so 6.27b's warning compares WITHOUT a decrypt. *"I don't know the date"* = codes `{unknown}`.
-- ⭐ THE ANSWERS TRIGGER HOLDS AT ALL TIMES — it admits ONLY: (i) an INSERT, and an UPDATE of `superseded_at` NULL → non-NULL
-- with every other column unchanged, while the reply is ⛔ not submitted AND the claim is in the ANSWER WINDOW (PM8 — the review
-- states, or `state_trustee_approved` under a live R9 routing; parity-tested against `claim/answer-window.ts`); and (ii) the
-- ERASURE ARM in 0143's form (F37): `(to_jsonb(NEW) - 'value_ciphertext' - 'death_date_window_indexes')` unchanged AND the
-- ciphertext changes only non-NULL → non-NULL AND the indexes change only to NULL. ⚠ RECORDED, as 0149 does (⛔ never claimed
-- refused): the erasure arm has ⛔ no state condition, so a ciphertext-only rewrite or an indexes → NULL write of ANY row — an
-- open one included — is ADMITTED; the trigger cannot tell the RTBF scrub from any other writer of those two columns (the
-- sentinel is a FRESH Tier-1 envelope). APPEND-ONLY is therefore enforced for the codes, the indexes' values and
-- `superseded_at`; the ciphertext's rests on the ONE writer (`claim/peer-mesh-reply.ts`).
-- Grants: replies SELECT, INSERT + UPDATE (`submitted_at`); answers SELECT, INSERT + UPDATE (`superseded_at`) + UPDATE
-- (`value_ciphertext`, `death_date_window_indexes`) for erasure. ⛔ No DELETE (the claim FK's cascade still works).
-- RLS ENABLE + FORCE, per-command tenant policies (the UPDATE policy is load-bearing — the erasure scrub matches 0 rows under
-- FORCE without it, `-279` A12). Statement order: CREATE → FKs → CHECKs → GRANT → ENABLE → FORCE → POLICY → indexes (0119).

-- ── (1) – (3) the ping's delivery record ─────────────────────────────────────────────────────────────────────────────────
ALTER TABLE "claim_peer_mesh_pings" ADD COLUMN "send_outcome" text;--> statement-breakpoint
ALTER TABLE "claim_peer_mesh_pings" ADD COLUMN "attempt_count" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "claim_peer_mesh_pings" ADD COLUMN "claimed_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "claim_peer_mesh_pings" ADD COLUMN "claimed_by_job" text;--> statement-breakpoint
ALTER TABLE "claim_peer_mesh_pings" ADD COLUMN "aging_since" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "claim_peer_mesh_pings" ADD COLUMN "parked_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "claim_peer_mesh_pings" ADD COLUMN "detail" text;--> statement-breakpoint
ALTER TABLE "claim_peer_mesh_pings" ADD COLUMN "first_detail" text;--> statement-breakpoint
ALTER TABLE "claim_peer_mesh_pings" ADD COLUMN "provider_message_id" text;--> statement-breakpoint
ALTER TABLE "claim_peer_mesh_pings" ADD COLUMN "recipient_number_hash" text;--> statement-breakpoint
ALTER TABLE "claim_peer_mesh_pings" ADD COLUMN "send_updated_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "claim_peer_mesh_pings" ADD COLUMN "locale_source" text;--> statement-breakpoint
ALTER TABLE "claim_peer_mesh_pings" ADD COLUMN "link_code" text;--> statement-breakpoint
-- ⚠ LOCKSTEP with `PEER_MESH_SEND_OUTCOMES` / `PEER_MESH_LOCALE_SOURCES` (schema/claim_peer_mesh_pings.ts). ⛔ `recorded`.
ALTER TABLE "claim_peer_mesh_pings" ADD CONSTRAINT "claim_peer_mesh_pings_send_outcome_check" CHECK ("send_outcome" IS NULL OR "send_outcome" IN ('attempting', 'accepted', 'rejected_invalid_number', 'rejected_unreachable', 'no_target', 'error', 'skipped_superseded'));--> statement-breakpoint
ALTER TABLE "claim_peer_mesh_pings" ADD CONSTRAINT "claim_peer_mesh_pings_attempt_count_check" CHECK ("attempt_count" >= 0 AND ("send_outcome" IS NULL) = ("attempt_count" = 0));--> statement-breakpoint
ALTER TABLE "claim_peer_mesh_pings" ADD CONSTRAINT "claim_peer_mesh_pings_attempting_claimed_check" CHECK ("send_outcome" IS DISTINCT FROM 'attempting' OR ("claimed_at" IS NOT NULL AND "claimed_by_job" IS NOT NULL));--> statement-breakpoint
ALTER TABLE "claim_peer_mesh_pings" ADD CONSTRAINT "claim_peer_mesh_pings_parked_check" CHECK ("send_outcome" IS DISTINCT FROM 'attempting' OR (("claimed_by_job" = 'sweep:held') = ("parked_at" IS NOT NULL)));--> statement-breakpoint
ALTER TABLE "claim_peer_mesh_pings" ADD CONSTRAINT "claim_peer_mesh_pings_detail_length_check" CHECK ("detail" IS NULL OR char_length("detail") <= 200);--> statement-breakpoint
ALTER TABLE "claim_peer_mesh_pings" ADD CONSTRAINT "claim_peer_mesh_pings_first_detail_length_check" CHECK ("first_detail" IS NULL OR char_length("first_detail") <= 200);--> statement-breakpoint
ALTER TABLE "claim_peer_mesh_pings" ADD CONSTRAINT "claim_peer_mesh_pings_locale_source_check" CHECK ("locale_source" IS NULL OR "locale_source" IN ('pariwar_default'));--> statement-breakpoint
ALTER TABLE "claim_peer_mesh_pings" ADD CONSTRAINT "claim_peer_mesh_pings_link_code_check" CHECK ("link_code" IS NULL OR "link_code" ~ '^[0-9A-Za-z]{12}$');--> statement-breakpoint
ALTER TABLE "claim_peer_mesh_pings" ADD CONSTRAINT "claim_peer_mesh_pings_link_code_uq" UNIQUE ("link_code");--> statement-breakpoint
REVOKE UPDATE ON "claim_peer_mesh_pings" FROM twt_app;--> statement-breakpoint
GRANT UPDATE ("send_outcome", "attempt_count", "claimed_at", "claimed_by_job", "aging_since", "parked_at", "detail", "first_detail", "provider_message_id", "recipient_number_hash", "send_updated_at", "locale_source", "link_code") ON "claim_peer_mesh_pings" TO twt_app;--> statement-breakpoint
CREATE INDEX "claim_peer_mesh_pings_attempting_idx" ON "claim_peer_mesh_pings" USING btree ("aging_since", "claimed_at") WHERE "send_outcome" = 'attempting';--> statement-breakpoint

CREATE FUNCTION claim_peer_mesh_pings_guard_delivery()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  delivery_cols text[] := ARRAY['send_outcome', 'attempt_count', 'claimed_at', 'claimed_by_job', 'aging_since', 'parked_at',
    'detail', 'first_detail', 'provider_message_id', 'recipient_number_hash', 'send_updated_at', 'locale_source', 'link_code'];
  old_delivery jsonb;
  new_delivery jsonb;
BEGIN
  old_delivery := (SELECT jsonb_object_agg(k, to_jsonb(OLD) -> k) FROM unnest(delivery_cols) AS k);
  new_delivery := (SELECT jsonb_object_agg(k, to_jsonb(NEW) -> k) FROM unnest(delivery_cols) AS k);
  IF OLD.send_outcome IS NOT NULL AND OLD.send_outcome <> 'attempting' AND new_delivery IS DISTINCT FROM old_delivery THEN
    RAISE EXCEPTION
      'claim_peer_mesh_pings: a finished send (%) is never rewritten — one text per ping, ever (Story 6.27a PM4)', OLD.send_outcome
      USING ERRCODE = 'integrity_constraint_violation';
  END IF;
  IF OLD.send_outcome IS NOT NULL AND NEW.send_outcome IS NULL THEN
    RAISE EXCEPTION 'claim_peer_mesh_pings: a begun send never returns to "not begun" (Story 6.27a PM4)'
      USING ERRCODE = 'integrity_constraint_violation';
  END IF;
  IF OLD.aging_since IS NOT NULL AND (NEW.aging_since IS NULL OR NEW.aging_since < OLD.aging_since) THEN
    RAISE EXCEPTION 'claim_peer_mesh_pings: aging_since moves only forward (Story 6.27a PM4)'
      USING ERRCODE = 'integrity_constraint_violation';
  END IF;
  IF OLD.link_code IS NOT NULL AND NEW.link_code IS DISTINCT FROM OLD.link_code THEN
    RAISE EXCEPTION 'claim_peer_mesh_pings: link_code is written once (Story 6.27a PM21 (a))'
      USING ERRCODE = 'integrity_constraint_violation';
  END IF;
  RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER claim_peer_mesh_pings_guard_delivery
  BEFORE UPDATE ON claim_peer_mesh_pings
  FOR EACH ROW EXECUTE FUNCTION claim_peer_mesh_pings_guard_delivery();
--> statement-breakpoint

-- ── (4) the replies ──────────────────────────────────────────────────────────────────────────────────────────────────────
CREATE TABLE "claim_peer_mesh_replies" (
	"reply_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"pariwar_id" uuid NOT NULL,
	"claim_case_id" uuid NOT NULL,
	"selection_id" uuid NOT NULL,
	"ping_id" uuid NOT NULL,
	"responder_member_id" uuid NOT NULL,
	"questionnaire_version_id" text NOT NULL,
	"started_at" timestamp with time zone DEFAULT clock_timestamp() NOT NULL,
	"submitted_at" timestamp with time zone,
	CONSTRAINT "claim_peer_mesh_replies_ping_uq" UNIQUE ("ping_id"),
	CONSTRAINT "claim_peer_mesh_replies_pariwar_reply_uq" UNIQUE ("pariwar_id", "reply_id")
);--> statement-breakpoint
ALTER TABLE "claim_peer_mesh_replies" ADD CONSTRAINT "claim_peer_mesh_replies_claim_case_fk" FOREIGN KEY ("pariwar_id", "claim_case_id") REFERENCES "public"."claims"("pariwar_id", "claim_case_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "claim_peer_mesh_replies" ADD CONSTRAINT "claim_peer_mesh_replies_selection_fk" FOREIGN KEY ("selection_id") REFERENCES "public"."claim_peer_mesh_selections"("selection_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "claim_peer_mesh_replies" ADD CONSTRAINT "claim_peer_mesh_replies_ping_fk" FOREIGN KEY ("ping_id") REFERENCES "public"."claim_peer_mesh_pings"("ping_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "claim_peer_mesh_replies" ADD CONSTRAINT "claim_peer_mesh_replies_version_check" CHECK ("questionnaire_version_id" ~ '^[a-z_]+\.v[0-9]+$');--> statement-breakpoint
ALTER TABLE "claim_peer_mesh_replies" ADD CONSTRAINT "claim_peer_mesh_replies_submitted_order_check" CHECK ("submitted_at" IS NULL OR "submitted_at" >= "started_at");--> statement-breakpoint
GRANT SELECT, INSERT ON "claim_peer_mesh_replies" TO twt_app;--> statement-breakpoint
GRANT UPDATE ("submitted_at") ON "claim_peer_mesh_replies" TO twt_app;--> statement-breakpoint
ALTER TABLE "claim_peer_mesh_replies" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "claim_peer_mesh_replies" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "claim_peer_mesh_replies_tenant_isolation_select" ON "claim_peer_mesh_replies" AS PERMISSIVE FOR SELECT TO "twt_app" USING (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "claim_peer_mesh_replies_tenant_isolation_insert" ON "claim_peer_mesh_replies" AS PERMISSIVE FOR INSERT TO "twt_app" WITH CHECK (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "claim_peer_mesh_replies_tenant_isolation_update" ON "claim_peer_mesh_replies" AS PERMISSIVE FOR UPDATE TO "twt_app" USING (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid) WITH CHECK (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid);--> statement-breakpoint
CREATE INDEX "claim_peer_mesh_replies_claim_idx" ON "claim_peer_mesh_replies" USING btree ("pariwar_id", "claim_case_id");--> statement-breakpoint

CREATE FUNCTION claim_peer_mesh_replies_guard_update()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF (to_jsonb(NEW) - 'submitted_at') IS DISTINCT FROM (to_jsonb(OLD) - 'submitted_at') THEN
    RAISE EXCEPTION 'claim_peer_mesh_replies: only submitted_at is ever written after insert (Story 6.27a PM7 (a))'
      USING ERRCODE = 'integrity_constraint_violation';
  END IF;
  IF OLD.submitted_at IS NOT NULL AND NEW.submitted_at IS DISTINCT FROM OLD.submitted_at THEN
    RAISE EXCEPTION 'claim_peer_mesh_replies: a submitted reply stays submitted (Story 6.27a PM7 (a))'
      USING ERRCODE = 'integrity_constraint_violation';
  END IF;
  RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER claim_peer_mesh_replies_guard_update
  BEFORE UPDATE ON claim_peer_mesh_replies
  FOR EACH ROW EXECUTE FUNCTION claim_peer_mesh_replies_guard_update();
--> statement-breakpoint

-- ── (5) the answers ──────────────────────────────────────────────────────────────────────────────────────────────────────
CREATE TABLE "claim_peer_mesh_reply_answers" (
	"answer_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"pariwar_id" uuid NOT NULL,
	"claim_case_id" uuid NOT NULL,
	"reply_id" uuid NOT NULL,
	"question_key" text NOT NULL,
	"value_codes" text[],
	"value_ciphertext" text,
	"death_date_window_indexes" text[],
	"saved_via" text NOT NULL,
	"saved_by_actor_id" text NOT NULL,
	"saved_at" timestamp with time zone DEFAULT clock_timestamp() NOT NULL,
	"superseded_at" timestamp with time zone
);--> statement-breakpoint
ALTER TABLE "claim_peer_mesh_reply_answers" ADD CONSTRAINT "claim_peer_mesh_reply_answers_reply_fk" FOREIGN KEY ("pariwar_id", "reply_id") REFERENCES "public"."claim_peer_mesh_replies"("pariwar_id", "reply_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "claim_peer_mesh_reply_answers" ADD CONSTRAINT "claim_peer_mesh_reply_answers_claim_case_fk" FOREIGN KEY ("pariwar_id", "claim_case_id") REFERENCES "public"."claims"("pariwar_id", "claim_case_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "claim_peer_mesh_reply_answers" ADD CONSTRAINT "claim_peer_mesh_reply_answers_question_key_check" CHECK ("question_key" ~ '^[a-z][a-z0-9_]*$');--> statement-breakpoint
-- Exactly one of the two value forms (an erased row keeps a ciphertext — the sentinel).
ALTER TABLE "claim_peer_mesh_reply_answers" ADD CONSTRAINT "claim_peer_mesh_reply_answers_one_value_check" CHECK (("value_codes" IS NULL) <> ("value_ciphertext" IS NULL));--> statement-breakpoint
ALTER TABLE "claim_peer_mesh_reply_answers" ADD CONSTRAINT "claim_peer_mesh_reply_answers_codes_nonempty_check" CHECK ("value_codes" IS NULL OR cardinality("value_codes") >= 1);--> statement-breakpoint
-- The window indexes only on the date question, beside its ciphertext, and always three.
ALTER TABLE "claim_peer_mesh_reply_answers" ADD CONSTRAINT "claim_peer_mesh_reply_answers_indexes_check" CHECK ("death_date_window_indexes" IS NULL OR ("question_key" = 'death_date' AND "value_ciphertext" IS NOT NULL AND cardinality("death_date_window_indexes") = 3));--> statement-breakpoint
ALTER TABLE "claim_peer_mesh_reply_answers" ADD CONSTRAINT "claim_peer_mesh_reply_answers_saved_via_check" CHECK ("saved_via" IN ('member_app', 'helpline'));--> statement-breakpoint
ALTER TABLE "claim_peer_mesh_reply_answers" ADD CONSTRAINT "claim_peer_mesh_reply_answers_superseded_order_check" CHECK ("superseded_at" IS NULL OR "superseded_at" >= "saved_at");--> statement-breakpoint
GRANT SELECT, INSERT ON "claim_peer_mesh_reply_answers" TO twt_app;--> statement-breakpoint
GRANT UPDATE ("superseded_at", "value_ciphertext", "death_date_window_indexes") ON "claim_peer_mesh_reply_answers" TO twt_app;--> statement-breakpoint
ALTER TABLE "claim_peer_mesh_reply_answers" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "claim_peer_mesh_reply_answers" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "claim_peer_mesh_reply_answers_tenant_isolation_select" ON "claim_peer_mesh_reply_answers" AS PERMISSIVE FOR SELECT TO "twt_app" USING (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "claim_peer_mesh_reply_answers_tenant_isolation_insert" ON "claim_peer_mesh_reply_answers" AS PERMISSIVE FOR INSERT TO "twt_app" WITH CHECK (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "claim_peer_mesh_reply_answers_tenant_isolation_update" ON "claim_peer_mesh_reply_answers" AS PERMISSIVE FOR UPDATE TO "twt_app" USING (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid) WITH CHECK (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid);--> statement-breakpoint
-- ONE live answer per question per reply (⛔ deferrable — the writer stamps the old row FIRST, then inserts).
CREATE UNIQUE INDEX "claim_peer_mesh_reply_answers_live_uq" ON "claim_peer_mesh_reply_answers" USING btree ("pariwar_id", "reply_id", "question_key") WHERE "superseded_at" IS NULL;--> statement-breakpoint
-- Both warning readers (6.27b) run in the cycle-freeze bulk path.
CREATE INDEX "claim_peer_mesh_reply_answers_live_reply_idx" ON "claim_peer_mesh_reply_answers" USING btree ("pariwar_id", "reply_id") WHERE "superseded_at" IS NULL;--> statement-breakpoint
CREATE INDEX "claim_peer_mesh_reply_answers_claim_idx" ON "claim_peer_mesh_reply_answers" USING btree ("pariwar_id", "claim_case_id");--> statement-breakpoint

-- ⭐ THE ANSWER WINDOW in plpgsql — ⚠ LOCKSTEP with `claim/answer-window.ts` (`CLAIM_REVIEW_WINDOW_STATES` + the live-R9
-- EXISTS of `r9-routing.ts`); a parity spec runs both over every state × routed / not routed.
CREATE FUNCTION claim_peer_mesh_answer_window_open(p_pariwar_id uuid, p_claim_case_id uuid)
RETURNS boolean LANGUAGE sql STABLE AS $$
  SELECT EXISTS (
    SELECT 1 FROM claims c
     WHERE c.pariwar_id = p_pariwar_id
       AND c.claim_case_id = p_claim_case_id
       AND (c.current_state IN ('verification_in_progress', 'verifier_review', 'verifier_approved', 'reversed', 'state_trustee_freeze')
            OR (c.current_state = 'state_trustee_approved'
                AND EXISTS (SELECT 1 FROM claim_state_trustee_decisions r9_route
                             WHERE r9_route.pariwar_id = c.pariwar_id
                               AND r9_route.claim_case_id = c.claim_case_id
                               AND r9_route.phase = 'routing'
                               AND r9_route.outcome = 'routed_to_r9'
                               AND r9_route.superseded_at IS NULL)))
  );
$$;
--> statement-breakpoint

CREATE FUNCTION claim_peer_mesh_reply_answers_guard()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  reply_submitted timestamptz;
  reply_found boolean;
BEGIN
  -- (ii) THE ERASURE ARM (0143's form) — ⚠ ⛔ no state condition: it cannot tell the RTBF scrub from another writer (RECORDED).
  IF TG_OP = 'UPDATE'
     AND (to_jsonb(NEW) - 'value_ciphertext' - 'death_date_window_indexes')
         IS NOT DISTINCT FROM (to_jsonb(OLD) - 'value_ciphertext' - 'death_date_window_indexes')
     AND (NEW.value_ciphertext IS NOT DISTINCT FROM OLD.value_ciphertext
          OR (OLD.value_ciphertext IS NOT NULL AND NEW.value_ciphertext IS NOT NULL))
     AND (NEW.death_date_window_indexes IS NOT DISTINCT FROM OLD.death_date_window_indexes
          OR NEW.death_date_window_indexes IS NULL)
     AND ((NEW.value_ciphertext IS DISTINCT FROM OLD.value_ciphertext)
          OR (NEW.death_date_window_indexes IS DISTINCT FROM OLD.death_date_window_indexes)) THEN
    RETURN NEW;
  END IF;

  -- (i) an INSERT, or `superseded_at` NULL → non-NULL with every other column unchanged.
  IF TG_OP = 'UPDATE' AND NOT (
       OLD.superseded_at IS NULL AND NEW.superseded_at IS NOT NULL
       AND (to_jsonb(NEW) - 'superseded_at') IS NOT DISTINCT FROM (to_jsonb(OLD) - 'superseded_at')) THEN
    RAISE EXCEPTION
      'claim_peer_mesh_reply_answers: an answer row is append-only — only superseded_at NULL → set, or the erasure scrub (Story 6.27a PM7 (a))'
      USING ERRCODE = 'integrity_constraint_violation';
  END IF;

  SELECT r.submitted_at, true INTO reply_submitted, reply_found
    FROM claim_peer_mesh_replies r
   WHERE r.pariwar_id = NEW.pariwar_id AND r.reply_id = NEW.reply_id;
  IF reply_found IS NOT TRUE THEN
    RAISE EXCEPTION 'claim_peer_mesh_reply_answers: the reply is not in scope (Story 6.27a PM7 (a))'
      USING ERRCODE = 'integrity_constraint_violation';
  END IF;
  IF reply_submitted IS NOT NULL THEN
    RAISE EXCEPTION 'claim_peer_mesh_reply_answers: the reply is submitted — its answers are locked (Story 6.27a PM7 (d))'
      USING ERRCODE = 'integrity_constraint_violation';
  END IF;
  IF NOT claim_peer_mesh_answer_window_open(NEW.pariwar_id, NEW.claim_case_id) THEN
    RAISE EXCEPTION 'claim_peer_mesh_reply_answers: the claim is outside the answer window (Story 6.27a PM8)'
      USING ERRCODE = 'integrity_constraint_violation';
  END IF;
  RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER claim_peer_mesh_reply_answers_guard
  BEFORE INSERT OR UPDATE ON claim_peer_mesh_reply_answers
  FOR EACH ROW EXECUTE FUNCTION claim_peer_mesh_reply_answers_guard();
