-- Migration 0218 — `member_identity_validations`, staff checking a typed-in identity while the member is alive (Story
-- 3.13, Task 1; DL1; AC2; author-commit `2026-11-25-501`, amended by `2026-11-25-503`).
--
-- The rulings: `2026-11-25-502` (Trustee-ratified, DR + KB) Q1 A — the member shows an original government photo ID,
-- in person or on a video call, and staff check the name, date of birth and photo against what was typed in;
-- *"nothing is copied or kept"*. ONE recorded staff act per attempt: a LIVE row per member; a later act supersedes it.
-- `confirmed` also sets `member_kyc_profiles.trustee_verified = true` in the same transaction (DL2 — the writer, ⛔ here).
--
-- ⛔ THE TABLE STORES ⛔ DOCUMENT NUMBER and ⛔ COPY (N5): staff record WHAT KIND of document they saw, ⛔ its number,
-- ⛔ an image. Aadhaar Act s.8A(4)(b) bars storing the full number "for any purpose".
--
-- ⚠ DO NOT REGENERATE with `db:generate` (the 0021+ discipline): the drizzle snapshot is frozen at 0020. HAND-AUTHORED
-- WHOLE in 0212's statement order — table, FKs, CHECKs, grants, ENABLE / FORCE RLS, policies (mirroring
-- `src/policies/member-identity-validation-rls.ts`), indexes, triggers. No snapshot file. The roles exist since 0002.
--
-- ── Hand-supplements (0212's live-row mechanism, mirrored exactly — DL1, F10a) ───────────────────────────────────────
--   1. GRANT SELECT, INSERT + a COLUMN-LEVEL GRANT UPDATE ("superseded_at", "superseded_reason", "note_ciphertext") to
--      twt_app AT BIRTH: the supersession (the writer) and the DPDPA-RTBF scrub of the note (DL14). ⛔ Other column is
--      updatable. A per-command UPDATE policy: without it the scrub matches 0 rows under FORCE (6.23a).
--   2. The append-only guard AT BIRTH, naming EVERY frozen column — all but the three granted ones
--      ([[project_append_only_guard_names_erasure_columns]]): `note_ciphertext` is deliberately OUT of the list, so the
--      scrub is writable and ⛔ later REPLACE of the guard is needed.
--   3. Supersession is ONE-WAY (0212's `claim_membership_checks_supersession_one_way`, copied).
-- ⛔ NO DELETE: ⛔ grant, ⛔ policy leg, ⛔ writer. Only an `ON DELETE cascade` from `members` removes a row.
--
-- ⚠ "Latest" is the LIVE row (`superseded_at IS NULL`) — ⛔ ordered by `decided_at` alone: two acts in one transaction
-- share `now()` ([[project_db_clock_ordering_tests_tie]]).

CREATE TABLE "member_identity_validations" (
	"validation_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"pariwar_id" uuid NOT NULL,
	"member_id" uuid NOT NULL,
	"outcome" text NOT NULL,
	"evidence_kind" text,
	"document_kind" text,
	"not_confirmed_reason" text,
	"note_ciphertext" text,
	"kyc_profile_updated_at" timestamp with time zone NOT NULL,
	"decided_by_actor_id" text NOT NULL,
	"decided_by_display" text NOT NULL,
	"decided_at" timestamp with time zone DEFAULT now() NOT NULL,
	"superseded_at" timestamp with time zone,
	"superseded_reason" text
);--> statement-breakpoint
ALTER TABLE "member_identity_validations" ADD CONSTRAINT "member_identity_validations_member_id_members_member_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("member_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
-- ⚠ LOCKSTEP with `IDENTITY_VALIDATION_OUTCOMES` / `…_EVIDENCE_KINDS` / `…_DOCUMENT_KINDS` / `…_NOT_CONFIRMED_REASONS`
-- / `…_SUPERSESSION_REASONS` (schema/member_identity_validations.ts) and their `@twt/contracts` mirrors.
ALTER TABLE "member_identity_validations" ADD CONSTRAINT "member_identity_validations_outcome_check" CHECK ("outcome" IN ('confirmed', 'not_confirmed'));--> statement-breakpoint
-- ⚠ THE NULL TRAP (0119): every `IN` over a NULLABLE column is guarded by `IS NOT NULL` — `NULL IN (…)` is NULL, and a
-- CHECK passes on NULL.
ALTER TABLE "member_identity_validations" ADD CONSTRAINT "member_identity_validations_evidence_kind_check" CHECK ("evidence_kind" IS NULL OR "evidence_kind" IN ('photo_id_in_person', 'photo_id_video_call'));--> statement-breakpoint
ALTER TABLE "member_identity_validations" ADD CONSTRAINT "member_identity_validations_document_kind_check" CHECK ("document_kind" IS NULL OR "document_kind" IN ('aadhaar_card', 'pan_card', 'voter_id', 'driving_licence', 'passport', 'government_service_id'));--> statement-breakpoint
ALTER TABLE "member_identity_validations" ADD CONSTRAINT "member_identity_validations_display_check" CHECK (length(btrim("decided_by_display")) > 0);--> statement-breakpoint
-- DL1 / DL7 / DL9 — what each outcome carries:
--   · `confirmed`      — how the ID was shown AND which ID; ⛔ reason (a note stays optional).
--   · `not_confirmed`  — one of the four reasons AND a note (required — the staff member says what happened). What was
--                        seen follows the reason: a mismatch was judged FROM a document (both kinds set); "no ID was
--                        shown" had a meeting but ⛔ document; "could not reach the member" had ⛔ meeting at all.
ALTER TABLE "member_identity_validations" ADD CONSTRAINT "member_identity_validations_outcome_coherence_check" CHECK (
	(
		"outcome" = 'confirmed'
		AND "evidence_kind" IS NOT NULL
		AND "document_kind" IS NOT NULL
		AND "not_confirmed_reason" IS NULL
	) OR (
		"outcome" = 'not_confirmed'
		AND "not_confirmed_reason" IS NOT NULL
		AND "note_ciphertext" IS NOT NULL
		AND (
			("not_confirmed_reason" IN ('details_do_not_match', 'photo_does_not_match')
				AND "evidence_kind" IS NOT NULL AND "document_kind" IS NOT NULL)
			OR ("not_confirmed_reason" = 'no_document_shown'
				AND "evidence_kind" IS NOT NULL AND "document_kind" IS NULL)
			OR ("not_confirmed_reason" = 'member_not_reached'
				AND "evidence_kind" IS NULL AND "document_kind" IS NULL)
		)
	)
);--> statement-breakpoint
-- Live, or superseded WITH a reason — never one without the other.
ALTER TABLE "member_identity_validations" ADD CONSTRAINT "member_identity_validations_supersession_coherence_check" CHECK (
	("superseded_at" IS NULL AND "superseded_reason" IS NULL)
	OR ("superseded_at" IS NOT NULL AND "superseded_reason" IS NOT NULL AND "superseded_reason" IN ('re_checked'))
);--> statement-breakpoint
GRANT SELECT, INSERT ON "member_identity_validations" TO twt_app;--> statement-breakpoint
-- The supersession (DL1) and the DPDPA-RTBF scrub of the note (DL14). ⛔ No other column is writable.
GRANT UPDATE ("superseded_at", "superseded_reason", "note_ciphertext") ON "member_identity_validations" TO twt_app;--> statement-breakpoint
ALTER TABLE "member_identity_validations" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "member_identity_validations" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "member_identity_validations_tenant_isolation_select" ON "member_identity_validations" AS PERMISSIVE FOR SELECT TO "twt_app" USING (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "member_identity_validations_tenant_isolation_insert" ON "member_identity_validations" AS PERMISSIVE FOR INSERT TO "twt_app" WITH CHECK (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "member_identity_validations_tenant_isolation_update" ON "member_identity_validations" AS PERMISSIVE FOR UPDATE TO "twt_app" USING (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid) WITH CHECK (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid);--> statement-breakpoint
CREATE INDEX "member_identity_validations_pariwar_id_idx" ON "member_identity_validations" USING btree ("pariwar_id");--> statement-breakpoint
CREATE INDEX "member_identity_validations_member_idx" ON "member_identity_validations" USING btree ("pariwar_id", "member_id");--> statement-breakpoint
-- ⭐ DL1 — at most ONE live act per member. The writer's conditional UPDATE is the interface; this index is the
-- truth, and a supersession race hits 23505.
CREATE UNIQUE INDEX "member_identity_validations_one_live_per_member_uq" ON "member_identity_validations" USING btree ("member_id") WHERE superseded_at IS NULL;--> statement-breakpoint

-- Append-only, structurally and COLUMN-AWARE (the 0122 / 0212 idiom):
--   · UPDATE   — refused unless ONLY the granted columns changed: the two supersession columns (the writer) and
--                `note_ciphertext` (the RTBF scrub — deliberately absent from the list below).
--   · DELETE   — refused, EXCEPT an `ON DELETE cascade` (depth > 1).
--   · TRUNCATE — refused.
CREATE FUNCTION member_identity_validations_reject_mutation()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    IF NEW.validation_id IS DISTINCT FROM OLD.validation_id
       OR NEW.pariwar_id IS DISTINCT FROM OLD.pariwar_id
       OR NEW.member_id IS DISTINCT FROM OLD.member_id
       OR NEW.outcome IS DISTINCT FROM OLD.outcome
       OR NEW.evidence_kind IS DISTINCT FROM OLD.evidence_kind
       OR NEW.document_kind IS DISTINCT FROM OLD.document_kind
       OR NEW.not_confirmed_reason IS DISTINCT FROM OLD.not_confirmed_reason
       OR NEW.kyc_profile_updated_at IS DISTINCT FROM OLD.kyc_profile_updated_at
       OR NEW.decided_by_actor_id IS DISTINCT FROM OLD.decided_by_actor_id
       OR NEW.decided_by_display IS DISTINCT FROM OLD.decided_by_display
       OR NEW.decided_at IS DISTINCT FROM OLD.decided_at THEN
      RAISE EXCEPTION
        'member_identity_validations is append-only — only the supersession stamp and the RTBF scrub of the note may update an identity check (Story 3.13 DL1)'
        USING ERRCODE = 'integrity_constraint_violation';
    END IF;
    RETURN NEW;
  END IF;
  IF TG_OP = 'DELETE' AND pg_trigger_depth() > 1 THEN
    RETURN OLD;
  END IF;
  RAISE EXCEPTION
    'member_identity_validations is append-only — an identity check is never deleted; a later check supersedes it (Story 3.13 DL1)'
    USING ERRCODE = 'integrity_constraint_violation';
END;
$$;
--> statement-breakpoint
CREATE TRIGGER member_identity_validations_no_update
  BEFORE UPDATE ON member_identity_validations
  FOR EACH ROW EXECUTE FUNCTION member_identity_validations_reject_mutation();
--> statement-breakpoint
CREATE TRIGGER member_identity_validations_no_delete
  BEFORE DELETE ON member_identity_validations
  FOR EACH ROW EXECUTE FUNCTION member_identity_validations_reject_mutation();
--> statement-breakpoint
CREATE TRIGGER member_identity_validations_no_truncate
  BEFORE TRUNCATE ON member_identity_validations
  EXECUTE FUNCTION member_identity_validations_reject_mutation();
--> statement-breakpoint

-- Supersession is ONE-WAY (a copy of 0212's `claim_membership_checks_supersession_one_way`): a LIVE row may be
-- superseded (both columns together — the CHECK); a SUPERSEDED row's stamp can ⛔ never change again, so a superseded
-- act — above all a superseded `confirmed` — can ⛔ never be revived. The note scrub is untouched by this rule.
CREATE FUNCTION member_identity_validations_supersession_one_way()
  RETURNS trigger
  LANGUAGE plpgsql
AS $$
BEGIN
  IF OLD.superseded_at IS NOT NULL
     AND (NEW.superseded_at IS DISTINCT FROM OLD.superseded_at
          OR NEW.superseded_reason IS DISTINCT FROM OLD.superseded_reason) THEN
    RAISE EXCEPTION
      'member_identity_validations supersession is one-way — a superseded identity check is never revived or re-stamped (Story 3.13 DL1)'
      USING ERRCODE = 'integrity_constraint_violation';
  END IF;
  RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER member_identity_validations_supersession_one_way
  BEFORE UPDATE ON member_identity_validations
  FOR EACH ROW EXECUTE FUNCTION member_identity_validations_supersession_one_way();
