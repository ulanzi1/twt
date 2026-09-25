-- Migration 0122 — the death certificate's clear-date rule: every UPLOAD kept, the District Admin's
-- REVIEW (accept / reject), and the 6.20 determination's link to the accepted review (Story 6.21a,
-- Task 1; D1, D2, D8; AC1, AC3, AC4, AC6).
--
-- The rulings: `2026-09-20-235` Y, `2026-09-20-236` BB, `2026-09-25-243` (option C — every certificate is
-- kept for as long as claim records are kept) and this story's author-commit `2026-09-25-244`.
-- Hand-authored. ⛔ NOT generated: the drizzle-kit snapshots stop at 0020, and regenerating an applied
-- migration is the 42P07 footgun (memory: project_live_db_test_gotchas). ⛔ Never regenerate 0119–0121.
--
-- ⛔ NO BACKFILL (T12; ⛔ not in production). A `death_certificate` row written before this migration has
-- NO upload row, so it has no certificate token and can never be reviewed or approved. A dev database
-- holding such rows is RESET, not back-filled.
--
-- ⛔ NO DELETION PATH (`-243`, invariant 3). Neither table has a DELETE grant, a DELETE policy leg or a
-- writer that deletes; the append-only triggers refuse a direct DELETE for every role. The ONLY rows that
-- ever go are the `ON DELETE cascade` from `claims` OR `claim_documents` (a spec's cleanup / a hard delete
-- of the claim itself, or of its document row — see D2).
--
-- Statement order per table: CREATE → FKs → CHECKs → GRANT → ENABLE → FORCE → POLICY → indexes (the 0030 /
-- 0119 order). Policies are per-command; ⛔ never `FOR ALL` (a DELETE leg).

-- ══ claim_death_certificate_uploads (D2) ═══════════════════════════════════════════════════════════
-- One row per uploaded death certificate, each with its OWN storage object (the key ends in the upload
-- id), so a replacement ⛔ never overwrites the certificate it replaces. ⛔ No PII column: the OCR reading
-- stays on `claim_documents` (the CURRENT certificate's), and the bytes stay in object storage.
-- The SOLE writer is the OCR job, `runClaimOcrParity`, in the same transaction as its `claim_documents`
-- upsert (the handler ⛔ never writes it: T2's first-upload race).
CREATE TABLE "claim_death_certificate_uploads" (
	"upload_id" uuid PRIMARY KEY NOT NULL,
	"claim_case_id" uuid NOT NULL,
	"pariwar_id" uuid NOT NULL,
	"deceased_member_id" uuid NOT NULL,
	"claim_document_id" uuid NOT NULL,
	"storage_object_key" text NOT NULL,
	"content_type" text NOT NULL,
	"byte_size" integer NOT NULL,
	"channel" text NOT NULL,
	"uploaded_by_actor_id" text,
	"uploaded_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint
ALTER TABLE "claim_death_certificate_uploads" ADD CONSTRAINT "claim_death_certificate_uploads_claim_case_id_claims_claim_case_id_fk" FOREIGN KEY ("claim_case_id") REFERENCES "public"."claims"("claim_case_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "claim_death_certificate_uploads" ADD CONSTRAINT "claim_death_certificate_uploads_claim_document_id_fk" FOREIGN KEY ("claim_document_id") REFERENCES "public"."claim_documents"("claim_document_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
-- ⚠ LOCKSTEP with `DEATH_CERTIFICATE_UPLOAD_CHANNELS` (schema/claim_death_certificate_uploads.ts) and
-- `@twt/contracts`'s `DeathCertificateHistoryUpload.channel` z.enum — re-declared, not shared, in three places.
ALTER TABLE "claim_death_certificate_uploads" ADD CONSTRAINT "claim_death_certificate_uploads_channel_check" CHECK ("channel" IN ('member_app', 'helpline'));--> statement-breakpoint
ALTER TABLE "claim_death_certificate_uploads" ADD CONSTRAINT "claim_death_certificate_uploads_byte_size_check" CHECK ("byte_size" > 0);--> statement-breakpoint
GRANT SELECT, INSERT ON "claim_death_certificate_uploads" TO twt_app;--> statement-breakpoint
ALTER TABLE "claim_death_certificate_uploads" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "claim_death_certificate_uploads" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "claim_death_certificate_uploads_tenant_isolation_select" ON "claim_death_certificate_uploads" AS PERMISSIVE FOR SELECT TO "twt_app" USING (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "claim_death_certificate_uploads_tenant_isolation_insert" ON "claim_death_certificate_uploads" AS PERMISSIVE FOR INSERT TO "twt_app" WITH CHECK (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid);--> statement-breakpoint
CREATE INDEX "claim_death_certificate_uploads_pariwar_id_idx" ON "claim_death_certificate_uploads" USING btree ("pariwar_id");--> statement-breakpoint
CREATE INDEX "claim_death_certificate_uploads_claim_case_id_idx" ON "claim_death_certificate_uploads" USING btree ("claim_case_id", "uploaded_at");--> statement-breakpoint
CREATE INDEX "claim_death_certificate_uploads_claim_document_id_idx" ON "claim_death_certificate_uploads" USING btree ("claim_document_id");--> statement-breakpoint
-- The CURRENT certificate is the upload whose key equals `claim_documents.storage_object_key` (D2). Each
-- upload has its own object, so a key names exactly one upload — and this index makes that lookup exact.
CREATE UNIQUE INDEX "claim_death_certificate_uploads_storage_object_key_uq" ON "claim_death_certificate_uploads" USING btree ("storage_object_key");--> statement-breakpoint

-- Append-only, structurally (the 0119 idiom). The grant above already denies `twt_app` UPDATE and DELETE;
-- this trigger holds the same line for EVERY role — the jobs service login (BYPASSRLS) and the owner too:
--   · UPDATE   — refused, always (an upload row has ⛔ no mutable column).
--   · DELETE   — refused, EXCEPT an `ON DELETE cascade` (from `claims` or `claim_documents`): a cascaded
--                delete runs inside the RI trigger, so `pg_trigger_depth()` is > 1 there; a direct DELETE
--                runs at depth 1 and is refused.
--   · TRUNCATE — refused.
CREATE FUNCTION claim_death_certificate_uploads_reject_mutation()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'DELETE' AND pg_trigger_depth() > 1 THEN
    RETURN OLD;
  END IF;
  RAISE EXCEPTION
    'claim_death_certificate_uploads is append-only — a death certificate is never overwritten or deleted (Story 6.21a; 2026-09-25-243)'
    USING ERRCODE = 'integrity_constraint_violation';
END;
$$;
--> statement-breakpoint
CREATE TRIGGER claim_death_certificate_uploads_no_update
  BEFORE UPDATE ON claim_death_certificate_uploads
  FOR EACH ROW EXECUTE FUNCTION claim_death_certificate_uploads_reject_mutation();
--> statement-breakpoint
CREATE TRIGGER claim_death_certificate_uploads_no_delete
  BEFORE DELETE ON claim_death_certificate_uploads
  FOR EACH ROW EXECUTE FUNCTION claim_death_certificate_uploads_reject_mutation();
--> statement-breakpoint
CREATE TRIGGER claim_death_certificate_uploads_no_truncate
  BEFORE TRUNCATE ON claim_death_certificate_uploads
  EXECUTE FUNCTION claim_death_certificate_uploads_reject_mutation();
--> statement-breakpoint

-- ══ claim_death_certificate_reviews (D1) ═══════════════════════════════════════════════════════════
-- The District Admin's verdict on ONE upload. ⛔ A NEW TABLE, NOT `claim_verifier_decisions` / the trustee /
-- the R9 tables (invariant 6): `getOriginalDeciderActorIds` unions actors from those three into the appeal
-- reviewer-conflict set. The SOLE writer is `recordDeathCertificateReview`.
CREATE TABLE "claim_death_certificate_reviews" (
	"review_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"claim_case_id" uuid NOT NULL,
	"pariwar_id" uuid NOT NULL,
	"deceased_member_id" uuid NOT NULL,
	"upload_id" uuid NOT NULL,
	"verdict" text NOT NULL,
	"rejection_reason" text,
	"accepted_date_ciphertext" text,
	"note_ciphertext" text NOT NULL,
	"decided_by_actor_id" text NOT NULL,
	"decided_by_display" text NOT NULL,
	"decided_at" timestamp with time zone DEFAULT now() NOT NULL,
	"superseded_at" timestamp with time zone,
	"superseded_reason" text,
	"supersedes_review_id" uuid
);--> statement-breakpoint
ALTER TABLE "claim_death_certificate_reviews" ADD CONSTRAINT "claim_death_certificate_reviews_claim_case_id_claims_claim_case_id_fk" FOREIGN KEY ("claim_case_id") REFERENCES "public"."claims"("claim_case_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "claim_death_certificate_reviews" ADD CONSTRAINT "claim_death_certificate_reviews_upload_id_fk" FOREIGN KEY ("upload_id") REFERENCES "public"."claim_death_certificate_uploads"("upload_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "claim_death_certificate_reviews" ADD CONSTRAINT "claim_death_certificate_reviews_supersedes_fk" FOREIGN KEY ("supersedes_review_id") REFERENCES "public"."claim_death_certificate_reviews"("review_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "claim_death_certificate_reviews" ADD CONSTRAINT "claim_death_certificate_reviews_verdict_check" CHECK ("verdict" IN ('accepted', 'rejected'));--> statement-breakpoint
ALTER TABLE "claim_death_certificate_reviews" ADD CONSTRAINT "claim_death_certificate_reviews_display_check" CHECK (length(btrim("decided_by_display")) > 0);--> statement-breakpoint
-- D1 — an ACCEPTED review carries the date the District Admin entered and ⛔ no reason; a REJECTED review
-- carries one of the three reasons and ⛔ no date. ⚠ THE NULL TRAP (0119): every `IN` over a NULLABLE column
-- is guarded by `IS NOT NULL`, because a CHECK treats NULL as PASSING.
ALTER TABLE "claim_death_certificate_reviews" ADD CONSTRAINT "claim_death_certificate_reviews_verdict_coherence_check" CHECK (
	(
		"verdict" = 'accepted'
		AND "accepted_date_ciphertext" IS NOT NULL
		AND "rejection_reason" IS NULL
	) OR (
		"verdict" = 'rejected'
		AND "accepted_date_ciphertext" IS NULL
		AND "rejection_reason" IS NOT NULL
		AND "rejection_reason" IN ('no_date_of_death', 'date_of_death_unclear', 'date_of_death_in_future')
	)
);--> statement-breakpoint
-- Live, or superseded WITH a reason — never one without the other.
ALTER TABLE "claim_death_certificate_reviews" ADD CONSTRAINT "claim_death_certificate_reviews_supersession_coherence_check" CHECK (
	("superseded_at" IS NULL AND "superseded_reason" IS NULL)
	OR ("superseded_at" IS NOT NULL AND "superseded_reason" IS NOT NULL AND "superseded_reason" IN ('re_reviewed', 'replaced'))
);--> statement-breakpoint
GRANT SELECT, INSERT ON "claim_death_certificate_reviews" TO twt_app;--> statement-breakpoint
-- The supersession (D1) and the DPDPA-RTBF scrub (D11). ⛔ No other column is writable.
GRANT UPDATE ("superseded_at", "superseded_reason", "accepted_date_ciphertext", "note_ciphertext") ON "claim_death_certificate_reviews" TO twt_app;--> statement-breakpoint
ALTER TABLE "claim_death_certificate_reviews" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "claim_death_certificate_reviews" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "claim_death_certificate_reviews_tenant_isolation_select" ON "claim_death_certificate_reviews" AS PERMISSIVE FOR SELECT TO "twt_app" USING (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "claim_death_certificate_reviews_tenant_isolation_insert" ON "claim_death_certificate_reviews" AS PERMISSIVE FOR INSERT TO "twt_app" WITH CHECK (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "claim_death_certificate_reviews_tenant_isolation_update" ON "claim_death_certificate_reviews" AS PERMISSIVE FOR UPDATE TO "twt_app" USING (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid) WITH CHECK (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid);--> statement-breakpoint
CREATE INDEX "claim_death_certificate_reviews_pariwar_id_idx" ON "claim_death_certificate_reviews" USING btree ("pariwar_id");--> statement-breakpoint
CREATE INDEX "claim_death_certificate_reviews_claim_case_id_idx" ON "claim_death_certificate_reviews" USING btree ("claim_case_id");--> statement-breakpoint
CREATE INDEX "claim_death_certificate_reviews_upload_id_idx" ON "claim_death_certificate_reviews" USING btree ("upload_id");--> statement-breakpoint
CREATE INDEX "claim_death_certificate_reviews_deceased_member_idx" ON "claim_death_certificate_reviews" USING btree ("pariwar_id", "deceased_member_id");--> statement-breakpoint
-- ⭐ D1 — at most ONE live review per claim. The writer's conditional UPDATE is the interface; this index
-- is the truth, and a supersession race hits 23505.
CREATE UNIQUE INDEX "claim_death_certificate_reviews_one_live_per_claim_uq" ON "claim_death_certificate_reviews" USING btree ("claim_case_id") WHERE superseded_at IS NULL;--> statement-breakpoint

-- Append-only, structurally and COLUMN-AWARE (the 0119 `member_nominee_versions` idiom):
--   · UPDATE   — refused unless ONLY the granted columns changed: the two supersession columns (the
--                review writer) and the two ciphertexts (the RTBF scrub).
--   · DELETE   — refused, EXCEPT an `ON DELETE cascade` (from `claims` or the upload), at depth > 1.
--   · TRUNCATE — refused.
CREATE FUNCTION claim_death_certificate_reviews_reject_mutation()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    IF NEW.review_id IS DISTINCT FROM OLD.review_id
       OR NEW.claim_case_id IS DISTINCT FROM OLD.claim_case_id
       OR NEW.pariwar_id IS DISTINCT FROM OLD.pariwar_id
       OR NEW.deceased_member_id IS DISTINCT FROM OLD.deceased_member_id
       OR NEW.upload_id IS DISTINCT FROM OLD.upload_id
       OR NEW.verdict IS DISTINCT FROM OLD.verdict
       OR NEW.rejection_reason IS DISTINCT FROM OLD.rejection_reason
       OR NEW.decided_by_actor_id IS DISTINCT FROM OLD.decided_by_actor_id
       OR NEW.decided_by_display IS DISTINCT FROM OLD.decided_by_display
       OR NEW.decided_at IS DISTINCT FROM OLD.decided_at
       OR NEW.supersedes_review_id IS DISTINCT FROM OLD.supersedes_review_id THEN
      RAISE EXCEPTION
        'claim_death_certificate_reviews is append-only — only the supersession stamp and the RTBF scrub may update a review (Story 6.21a D1)'
        USING ERRCODE = 'integrity_constraint_violation';
    END IF;
    RETURN NEW;
  END IF;
  IF TG_OP = 'DELETE' AND pg_trigger_depth() > 1 THEN
    RETURN OLD;
  END IF;
  RAISE EXCEPTION
    'claim_death_certificate_reviews is append-only — a review is never deleted; a re-review supersedes it (Story 6.21a D1)'
    USING ERRCODE = 'integrity_constraint_violation';
END;
$$;
--> statement-breakpoint
CREATE TRIGGER claim_death_certificate_reviews_no_update
  BEFORE UPDATE ON claim_death_certificate_reviews
  FOR EACH ROW EXECUTE FUNCTION claim_death_certificate_reviews_reject_mutation();
--> statement-breakpoint
CREATE TRIGGER claim_death_certificate_reviews_no_delete
  BEFORE DELETE ON claim_death_certificate_reviews
  FOR EACH ROW EXECUTE FUNCTION claim_death_certificate_reviews_reject_mutation();
--> statement-breakpoint
CREATE TRIGGER claim_death_certificate_reviews_no_truncate
  BEFORE TRUNCATE ON claim_death_certificate_reviews
  EXECUTE FUNCTION claim_death_certificate_reviews_reject_mutation();
--> statement-breakpoint

-- Supersession is ONE-WAY (a copy of 0121's `nominee_determinations_supersession_one_way`):
--   · a LIVE row (superseded_at IS NULL) may be superseded — both columns set together (the CHECK);
--   · a SUPERSEDED row's superseded_at / superseded_reason can ⛔ never change again, so a superseded review
--     — above all a superseded REJECTION — can ⛔ never be revived;
--   · the RTBF ciphertext scrub is untouched by this rule.
CREATE FUNCTION claim_death_certificate_reviews_supersession_one_way()
  RETURNS trigger
  LANGUAGE plpgsql
AS $$
BEGIN
  IF OLD.superseded_at IS NOT NULL
     AND (NEW.superseded_at IS DISTINCT FROM OLD.superseded_at
          OR NEW.superseded_reason IS DISTINCT FROM OLD.superseded_reason) THEN
    RAISE EXCEPTION
      'claim_death_certificate_reviews supersession is one-way — a superseded review is never revived or re-stamped (Story 6.21a D1)'
      USING ERRCODE = 'integrity_constraint_violation';
  END IF;
  RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER claim_death_certificate_reviews_supersession_one_way
  BEFORE UPDATE ON claim_death_certificate_reviews
  FOR EACH ROW EXECUTE FUNCTION claim_death_certificate_reviews_supersession_one_way();
--> statement-breakpoint

-- ══ nominee_determinations.death_certificate_review_id (D8) ═══════════════════════════════════════
-- The accepted review whose date the determination used as its as-at-death cutoff. Set at INSERT by
-- `recordNomineeDetermination` and ⛔ never updated by a writer (no UPDATE grant on it). NULLABLE because
-- 0119-era determinations exist in dev and test databases (⛔ no backfill): a NULL is `determination_stale`
-- at the approval gate (D7), never a pass. ON DELETE SET NULL is the only other change it ever sees.
ALTER TABLE "nominee_determinations" ADD COLUMN "death_certificate_review_id" uuid;--> statement-breakpoint
ALTER TABLE "nominee_determinations" ADD CONSTRAINT "nominee_determinations_death_certificate_review_id_fk" FOREIGN KEY ("death_certificate_review_id") REFERENCES "public"."claim_death_certificate_reviews"("review_id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "nominee_determinations_death_certificate_review_id_idx" ON "nominee_determinations" USING btree ("death_certificate_review_id");
