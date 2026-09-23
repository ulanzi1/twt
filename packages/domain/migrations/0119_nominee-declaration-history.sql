-- Migration 0119 — the nominee declaration HISTORY, the District Admin's DETERMINATION, the genuine-
-- mistake CORRECTION and the Story 6-22 FINDINGS this story consumes (Story 6.20, Task 1; D1, D4, D7,
-- D13, D17; AC1, AC2, AC4, AC7).
--
-- The rulings: `2026-09-20-233` → `-236` (Trustee-ratified), `2026-09-21-237` → `-240`, and this story's
-- author-commit `2026-09-21-241`. Hand-authored. ⛔ NOT generated: the drizzle-kit snapshots stop at 0020,
-- and regenerating an applied migration is the 42P07 footgun (memory: project_live_db_test_gotchas).
--
-- ⛔ NO BACKFILL, ⛔ NOTHING FABRICATED (`-232`: "code is not in production"). This migration creates no
-- version. The first version is written by the first declare after it; the effective accessor FAILS
-- CLOSED on a `member_nominees` row that has no version. A dev database holding old rows is RESET, not
-- back-filled.
--
-- Statement order per table: CREATE → FKs → CHECKs → GRANT → ENABLE → FORCE → POLICY → indexes (the 0030
-- order: GRANT → ENABLE → FORCE → POLICY). Policies are per-command; ⛔ never `FOR ALL` (a DELETE leg).

-- ══ member_nominee_versions (D1) ═══════════════════════════════════════════════════════════════════
CREATE TABLE "member_nominee_versions" (
	"version_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"member_id" uuid NOT NULL,
	"pariwar_id" uuid NOT NULL,
	"rank" smallint NOT NULL,
	"version_no" integer NOT NULL,
	"declaration_id" uuid NOT NULL,
	"kind" text NOT NULL,
	"source" text NOT NULL,
	"name_ciphertext" text,
	"relationship" text,
	"mobile_ciphertext" text,
	"address_ciphertext" text,
	"split_pct" smallint,
	"recorded_at" timestamp with time zone NOT NULL,
	"effective_at" timestamp with time zone NOT NULL,
	"event_version" bigint,
	"corrects_version_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint
ALTER TABLE "member_nominee_versions" ADD CONSTRAINT "member_nominee_versions_member_id_members_member_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("member_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "member_nominee_versions" ADD CONSTRAINT "member_nominee_versions_corrects_version_id_fk" FOREIGN KEY ("corrects_version_id") REFERENCES "public"."member_nominee_versions"("version_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "member_nominee_versions" ADD CONSTRAINT "member_nominee_versions_rank_check" CHECK ("rank" IN (1, 2));--> statement-breakpoint
ALTER TABLE "member_nominee_versions" ADD CONSTRAINT "member_nominee_versions_version_no_check" CHECK ("version_no" >= 1);--> statement-breakpoint
ALTER TABLE "member_nominee_versions" ADD CONSTRAINT "member_nominee_versions_kind_check" CHECK ("kind" IN ('declared', 'vacated'));--> statement-breakpoint
ALTER TABLE "member_nominee_versions" ADD CONSTRAINT "member_nominee_versions_source_check" CHECK ("source" IN ('member', 'correction'));--> statement-breakpoint
ALTER TABLE "member_nominee_versions" ADD CONSTRAINT "member_nominee_versions_split_check" CHECK ("split_pct" IS NULL OR "split_pct" IN (100, 75, 25));--> statement-breakpoint
-- A DECLARED version names a nominee (name, relationship, mobile, split all present; address optional).
-- A VACATED tombstone (T9) carries ⛔ nothing — so `mobilePresent` can never be claimed for it (T4).
ALTER TABLE "member_nominee_versions" ADD CONSTRAINT "member_nominee_versions_kind_coherence_check" CHECK (
	(
		"kind" = 'declared'
		AND "name_ciphertext" IS NOT NULL
		AND "relationship" IS NOT NULL
		AND "mobile_ciphertext" IS NOT NULL
		AND "split_pct" IS NOT NULL
	) OR (
		"kind" = 'vacated'
		AND "name_ciphertext" IS NULL
		AND "relationship" IS NULL
		AND "mobile_ciphertext" IS NULL
		AND "address_ciphertext" IS NULL
		AND "split_pct" IS NULL
	)
);--> statement-breakpoint
-- A correction always names the version it corrects and always names a nominee (a correction ⛔ never
-- vacates a rank); a member's own version never points at another.
ALTER TABLE "member_nominee_versions" ADD CONSTRAINT "member_nominee_versions_correction_coherence_check" CHECK (
	("source" = 'correction' AND "corrects_version_id" IS NOT NULL AND "kind" = 'declared')
	OR ("source" = 'member' AND "corrects_version_id" IS NULL)
);--> statement-breakpoint
-- A member's own change: effective_at = recorded_at. A correction inherits an EARLIER position (invariant 5).
ALTER TABLE "member_nominee_versions" ADD CONSTRAINT "member_nominee_versions_effective_not_after_recorded_check" CHECK (
	"effective_at" <= "recorded_at" AND ("source" = 'correction' OR "effective_at" = "recorded_at")
);--> statement-breakpoint
GRANT SELECT, INSERT ON "member_nominee_versions" TO twt_app;--> statement-breakpoint
-- The DPDPA-RTBF scrub ONLY (D11) — ⛔ not a correction path (a correction is a NEW version).
GRANT UPDATE ("name_ciphertext", "mobile_ciphertext", "address_ciphertext") ON "member_nominee_versions" TO twt_app;--> statement-breakpoint
ALTER TABLE "member_nominee_versions" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "member_nominee_versions" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "member_nominee_versions_tenant_isolation_select" ON "member_nominee_versions" AS PERMISSIVE FOR SELECT TO "twt_app" USING (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "member_nominee_versions_tenant_isolation_insert" ON "member_nominee_versions" AS PERMISSIVE FOR INSERT TO "twt_app" WITH CHECK (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "member_nominee_versions_tenant_isolation_update" ON "member_nominee_versions" AS PERMISSIVE FOR UPDATE TO "twt_app" USING (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid) WITH CHECK (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid);--> statement-breakpoint
CREATE UNIQUE INDEX "member_nominee_versions_member_rank_version_uq" ON "member_nominee_versions" USING btree ("member_id", "rank", "version_no");--> statement-breakpoint
CREATE INDEX "member_nominee_versions_pariwar_member_idx" ON "member_nominee_versions" USING btree ("pariwar_id", "member_id");--> statement-breakpoint
CREATE INDEX "member_nominee_versions_declaration_id_idx" ON "member_nominee_versions" USING btree ("declaration_id");--> statement-breakpoint

-- Append-only, structurally (the 0001 idiom, made COLUMN-AWARE). The grant above already denies
-- `twt_app` everything but the three ciphertext columns; this trigger holds the same line for every
-- role, the table owner included:
--   · UPDATE — refused unless ONLY the three ciphertext columns changed (the RTBF scrub).
--   · DELETE — refused, EXCEPT the `ON DELETE cascade` from `members` (a hard delete of the member).
--     A cascaded delete runs from inside the RI trigger, so `pg_trigger_depth()` is > 1 there; a direct
--     `DELETE FROM member_nominee_versions` runs at depth 1 and is refused.
--   · TRUNCATE — refused.
CREATE FUNCTION member_nominee_versions_reject_mutation()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    IF NEW.version_id IS DISTINCT FROM OLD.version_id
       OR NEW.member_id IS DISTINCT FROM OLD.member_id
       OR NEW.pariwar_id IS DISTINCT FROM OLD.pariwar_id
       OR NEW.rank IS DISTINCT FROM OLD.rank
       OR NEW.version_no IS DISTINCT FROM OLD.version_no
       OR NEW.declaration_id IS DISTINCT FROM OLD.declaration_id
       OR NEW.kind IS DISTINCT FROM OLD.kind
       OR NEW.source IS DISTINCT FROM OLD.source
       OR NEW.relationship IS DISTINCT FROM OLD.relationship
       OR NEW.split_pct IS DISTINCT FROM OLD.split_pct
       OR NEW.recorded_at IS DISTINCT FROM OLD.recorded_at
       OR NEW.effective_at IS DISTINCT FROM OLD.effective_at
       OR NEW.event_version IS DISTINCT FROM OLD.event_version
       OR NEW.corrects_version_id IS DISTINCT FROM OLD.corrects_version_id
       OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
      RAISE EXCEPTION
        'member_nominee_versions is append-only — only the RTBF ciphertext scrub may update a version (Story 6.20 D1)'
        USING ERRCODE = 'integrity_constraint_violation';
    END IF;
    RETURN NEW;
  END IF;
  IF TG_OP = 'DELETE' AND pg_trigger_depth() > 1 THEN
    RETURN OLD;
  END IF;
  RAISE EXCEPTION
    'member_nominee_versions is append-only — a version is never deleted; a discard is a determination record (Story 6.20 invariant 2)'
    USING ERRCODE = 'integrity_constraint_violation';
END;
$$;
--> statement-breakpoint
CREATE TRIGGER member_nominee_versions_no_update
  BEFORE UPDATE ON member_nominee_versions
  FOR EACH ROW EXECUTE FUNCTION member_nominee_versions_reject_mutation();
--> statement-breakpoint
CREATE TRIGGER member_nominee_versions_no_delete
  BEFORE DELETE ON member_nominee_versions
  FOR EACH ROW EXECUTE FUNCTION member_nominee_versions_reject_mutation();
--> statement-breakpoint
CREATE TRIGGER member_nominee_versions_no_truncate
  BEFORE TRUNCATE ON member_nominee_versions
  EXECUTE FUNCTION member_nominee_versions_reject_mutation();
--> statement-breakpoint

-- ══ nominee_determinations + nominee_determination_items (D4, D17) ════════════════════════════════
CREATE TABLE "nominee_determinations" (
	"determination_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"claim_case_id" uuid NOT NULL,
	"pariwar_id" uuid NOT NULL,
	"deceased_member_id" uuid NOT NULL,
	"certificate_date_ciphertext" text NOT NULL,
	"note_ciphertext" text NOT NULL,
	"watermark_rank1_version_no" integer,
	"watermark_rank2_version_no" integer,
	"decided_by_actor_id" text NOT NULL,
	"decided_by_display" text NOT NULL,
	"decided_at" timestamp with time zone DEFAULT now() NOT NULL,
	"superseded_at" timestamp with time zone,
	"superseded_reason" text,
	"supersedes_determination_id" uuid
);--> statement-breakpoint
ALTER TABLE "nominee_determinations" ADD CONSTRAINT "nominee_determinations_claim_case_id_claims_claim_case_id_fk" FOREIGN KEY ("claim_case_id") REFERENCES "public"."claims"("claim_case_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "nominee_determinations" ADD CONSTRAINT "nominee_determinations_supersedes_fk" FOREIGN KEY ("supersedes_determination_id") REFERENCES "public"."nominee_determinations"("determination_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "nominee_determinations" ADD CONSTRAINT "nominee_determinations_display_check" CHECK (length(btrim("decided_by_display")) > 0);--> statement-breakpoint
-- Live, or superseded WITH a reason — never one without the other.
-- ⚠ THE NULL TRAP, found by this migration's own policy spec: `x IN (...)` with x NULL is NULL, and a CHECK
-- treats NULL as PASSING. Every `IN` over a NULLABLE column below is therefore guarded by `IS NOT NULL`.
ALTER TABLE "nominee_determinations" ADD CONSTRAINT "nominee_determinations_supersession_coherence_check" CHECK (
	("superseded_at" IS NULL AND "superseded_reason" IS NULL)
	OR ("superseded_at" IS NOT NULL AND "superseded_reason" IS NOT NULL AND "superseded_reason" IN ('redetermined', 'correction_applied'))
);--> statement-breakpoint
GRANT SELECT, INSERT ON "nominee_determinations" TO twt_app;--> statement-breakpoint
-- The supersession (D4 / D7) and the DPDPA-RTBF scrub (D11). ⛔ No other column is writable.
GRANT UPDATE ("superseded_at", "superseded_reason", "certificate_date_ciphertext", "note_ciphertext") ON "nominee_determinations" TO twt_app;--> statement-breakpoint
ALTER TABLE "nominee_determinations" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "nominee_determinations" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "nominee_determinations_tenant_isolation_select" ON "nominee_determinations" AS PERMISSIVE FOR SELECT TO "twt_app" USING (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "nominee_determinations_tenant_isolation_insert" ON "nominee_determinations" AS PERMISSIVE FOR INSERT TO "twt_app" WITH CHECK (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "nominee_determinations_tenant_isolation_update" ON "nominee_determinations" AS PERMISSIVE FOR UPDATE TO "twt_app" USING (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid) WITH CHECK (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid);--> statement-breakpoint
CREATE INDEX "nominee_determinations_pariwar_id_idx" ON "nominee_determinations" USING btree ("pariwar_id");--> statement-breakpoint
CREATE INDEX "nominee_determinations_claim_case_id_idx" ON "nominee_determinations" USING btree ("claim_case_id");--> statement-breakpoint
CREATE INDEX "nominee_determinations_deceased_member_idx" ON "nominee_determinations" USING btree ("pariwar_id", "deceased_member_id");--> statement-breakpoint
-- ⭐ D4 — at most ONE live determination per claim. The writer's conditional UPDATE is the interface;
-- this index is the truth, and a supersession race hits 23505.
CREATE UNIQUE INDEX "nominee_determinations_one_live_per_claim_uq" ON "nominee_determinations" USING btree ("claim_case_id") WHERE superseded_at IS NULL;--> statement-breakpoint

CREATE TABLE "nominee_determination_items" (
	"determination_id" uuid NOT NULL,
	"version_id" uuid NOT NULL,
	"pariwar_id" uuid NOT NULL,
	"mark" text NOT NULL,
	CONSTRAINT "nominee_determination_items_determination_id_version_id_pk" PRIMARY KEY("determination_id","version_id")
);--> statement-breakpoint
ALTER TABLE "nominee_determination_items" ADD CONSTRAINT "nominee_determination_items_determination_id_fk" FOREIGN KEY ("determination_id") REFERENCES "public"."nominee_determinations"("determination_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "nominee_determination_items" ADD CONSTRAINT "nominee_determination_items_version_id_fk" FOREIGN KEY ("version_id") REFERENCES "public"."member_nominee_versions"("version_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "nominee_determination_items" ADD CONSTRAINT "nominee_determination_items_mark_check" CHECK ("mark" IN ('stands', 'discarded'));--> statement-breakpoint
GRANT SELECT, INSERT ON "nominee_determination_items" TO twt_app;--> statement-breakpoint
ALTER TABLE "nominee_determination_items" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "nominee_determination_items" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "nominee_determination_items_tenant_isolation_select" ON "nominee_determination_items" AS PERMISSIVE FOR SELECT TO "twt_app" USING (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "nominee_determination_items_tenant_isolation_insert" ON "nominee_determination_items" AS PERMISSIVE FOR INSERT TO "twt_app" WITH CHECK (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid);--> statement-breakpoint
CREATE INDEX "nominee_determination_items_version_id_idx" ON "nominee_determination_items" USING btree ("version_id");--> statement-breakpoint

-- ══ nominee_corrections (D7) ═══════════════════════════════════════════════════════════════════════
CREATE TABLE "nominee_corrections" (
	"correction_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"claim_case_id" uuid NOT NULL,
	"pariwar_id" uuid NOT NULL,
	"member_id" uuid NOT NULL,
	"rank" smallint NOT NULL,
	"target_version_id" uuid NOT NULL,
	"proposed_name_ciphertext" text NOT NULL,
	"proposed_relationship" text NOT NULL,
	"proposed_mobile_ciphertext" text NOT NULL,
	"proposed_address_ciphertext" text,
	"raised_via" text NOT NULL,
	"raised_by_actor_id" text NOT NULL,
	"raise_note_ciphertext" text NOT NULL,
	"raised_at" timestamp with time zone DEFAULT now() NOT NULL,
	"step" text NOT NULL,
	"da_actor_id" text,
	"da_display" text,
	"da_note_ciphertext" text,
	"da_decided_at" timestamp with time zone,
	"pa_actor_id" text,
	"pa_display" text,
	"pa_note_ciphertext" text,
	"pa_decided_at" timestamp with time zone,
	"declined_at_step" text,
	"applied_version_id" uuid
);--> statement-breakpoint
ALTER TABLE "nominee_corrections" ADD CONSTRAINT "nominee_corrections_claim_case_id_claims_claim_case_id_fk" FOREIGN KEY ("claim_case_id") REFERENCES "public"."claims"("claim_case_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "nominee_corrections" ADD CONSTRAINT "nominee_corrections_member_id_members_member_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("member_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "nominee_corrections" ADD CONSTRAINT "nominee_corrections_target_version_id_fk" FOREIGN KEY ("target_version_id") REFERENCES "public"."member_nominee_versions"("version_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "nominee_corrections" ADD CONSTRAINT "nominee_corrections_applied_version_id_fk" FOREIGN KEY ("applied_version_id") REFERENCES "public"."member_nominee_versions"("version_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "nominee_corrections" ADD CONSTRAINT "nominee_corrections_rank_check" CHECK ("rank" IN (1, 2));--> statement-breakpoint
ALTER TABLE "nominee_corrections" ADD CONSTRAINT "nominee_corrections_step_check" CHECK ("step" IN ('da_pending', 'pa_pending', 'applied', 'declined'));--> statement-breakpoint
ALTER TABLE "nominee_corrections" ADD CONSTRAINT "nominee_corrections_raised_via_check" CHECK ("raised_via" IN ('helpline', 'member_app'));--> statement-breakpoint
-- `-237` cl.2 — a correction's subject must carry a KNOWN relationship; `other` forecloses it. The writer
-- refuses at the RAISE step with a typed 409; this is the backstop for the proposed side.
ALTER TABLE "nominee_corrections" ADD CONSTRAINT "nominee_corrections_proposed_relationship_known_check" CHECK ("proposed_relationship" <> 'other');--> statement-breakpoint
-- D7 — the two approvers are DIFFERENT people. The writer refuses first; this is the backstop.
ALTER TABLE "nominee_corrections" ADD CONSTRAINT "nominee_corrections_distinct_approvers_check" CHECK ("pa_actor_id" IS NULL OR "da_actor_id" IS NULL OR "pa_actor_id" <> "da_actor_id");--> statement-breakpoint
-- The step is coherent with the decision columns: each decided step carries its actor, display, note
-- and instant (CC3 — a note at EACH approval), and an APPLIED correction names the version it wrote.
ALTER TABLE "nominee_corrections" ADD CONSTRAINT "nominee_corrections_step_coherence_check" CHECK (
	(
		"step" = 'da_pending'
		AND "da_actor_id" IS NULL AND "da_display" IS NULL AND "da_note_ciphertext" IS NULL AND "da_decided_at" IS NULL
		AND "pa_actor_id" IS NULL AND "pa_display" IS NULL AND "pa_note_ciphertext" IS NULL AND "pa_decided_at" IS NULL
		AND "declined_at_step" IS NULL AND "applied_version_id" IS NULL
	) OR (
		"step" = 'pa_pending'
		AND "da_actor_id" IS NOT NULL AND "da_display" IS NOT NULL AND "da_note_ciphertext" IS NOT NULL AND "da_decided_at" IS NOT NULL
		AND "pa_actor_id" IS NULL AND "pa_display" IS NULL AND "pa_note_ciphertext" IS NULL AND "pa_decided_at" IS NULL
		AND "declined_at_step" IS NULL AND "applied_version_id" IS NULL
	) OR (
		"step" = 'applied'
		AND "da_actor_id" IS NOT NULL AND "da_display" IS NOT NULL AND "da_note_ciphertext" IS NOT NULL AND "da_decided_at" IS NOT NULL
		AND "pa_actor_id" IS NOT NULL AND "pa_display" IS NOT NULL AND "pa_note_ciphertext" IS NOT NULL AND "pa_decided_at" IS NOT NULL
		AND "declined_at_step" IS NULL AND "applied_version_id" IS NOT NULL
	) OR (
		"step" = 'declined'
		AND "applied_version_id" IS NULL
		AND "declined_at_step" IS NOT NULL
		AND (
			(
				"declined_at_step" = 'district_admin'
				AND "da_actor_id" IS NOT NULL AND "da_display" IS NOT NULL AND "da_note_ciphertext" IS NOT NULL AND "da_decided_at" IS NOT NULL
				AND "pa_actor_id" IS NULL AND "pa_display" IS NULL AND "pa_note_ciphertext" IS NULL AND "pa_decided_at" IS NULL
			) OR (
				"declined_at_step" = 'pariwar_admin'
				AND "da_actor_id" IS NOT NULL AND "da_display" IS NOT NULL AND "da_note_ciphertext" IS NOT NULL AND "da_decided_at" IS NOT NULL
				AND "pa_actor_id" IS NOT NULL AND "pa_display" IS NOT NULL AND "pa_note_ciphertext" IS NOT NULL AND "pa_decided_at" IS NOT NULL
			)
		)
	)
);--> statement-breakpoint
GRANT SELECT, INSERT ON "nominee_corrections" TO twt_app;--> statement-breakpoint
-- The step writes (D7) and the DPDPA-RTBF scrub (D11). ⛔ The raise itself — its claim, member, rank,
-- target, proposal, channel and raiser — is immutable by attribute privilege.
GRANT UPDATE ("step", "da_actor_id", "da_display", "da_note_ciphertext", "da_decided_at", "pa_actor_id", "pa_display", "pa_note_ciphertext", "pa_decided_at", "declined_at_step", "applied_version_id", "proposed_name_ciphertext", "proposed_mobile_ciphertext", "proposed_address_ciphertext", "raise_note_ciphertext") ON "nominee_corrections" TO twt_app;--> statement-breakpoint
ALTER TABLE "nominee_corrections" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "nominee_corrections" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "nominee_corrections_tenant_isolation_select" ON "nominee_corrections" AS PERMISSIVE FOR SELECT TO "twt_app" USING (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "nominee_corrections_tenant_isolation_insert" ON "nominee_corrections" AS PERMISSIVE FOR INSERT TO "twt_app" WITH CHECK (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "nominee_corrections_tenant_isolation_update" ON "nominee_corrections" AS PERMISSIVE FOR UPDATE TO "twt_app" USING (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid) WITH CHECK (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid);--> statement-breakpoint
CREATE INDEX "nominee_corrections_pariwar_id_idx" ON "nominee_corrections" USING btree ("pariwar_id");--> statement-breakpoint
CREATE INDEX "nominee_corrections_claim_case_id_idx" ON "nominee_corrections" USING btree ("claim_case_id");--> statement-breakpoint
CREATE INDEX "nominee_corrections_member_idx" ON "nominee_corrections" USING btree ("pariwar_id", "member_id");--> statement-breakpoint
CREATE UNIQUE INDEX "nominee_corrections_one_open_per_claim_rank_uq" ON "nominee_corrections" USING btree ("claim_case_id", "rank") WHERE step IN ('da_pending', 'pa_pending');--> statement-breakpoint

-- ══ claim_nominee_findings (AC2 release, D17(c)) — Story 6-22's findings, consumed here ═══════════
-- ⚠ ⛔ No production writer until row 6-22 lands (`2026-09-21-241` §6).
CREATE TABLE "claim_nominee_findings" (
	"finding_id" uuid PRIMARY KEY NOT NULL,
	"claim_case_id" uuid NOT NULL,
	"pariwar_id" uuid NOT NULL,
	"kind" text NOT NULL,
	"rank" smallint,
	"recorded_by_actor_id" text NOT NULL,
	"recorded_by_display" text NOT NULL,
	"recorded_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint
ALTER TABLE "claim_nominee_findings" ADD CONSTRAINT "claim_nominee_findings_claim_case_id_claims_claim_case_id_fk" FOREIGN KEY ("claim_case_id") REFERENCES "public"."claims"("claim_case_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "claim_nominee_findings" ADD CONSTRAINT "claim_nominee_findings_kind_check" CHECK ("kind" IN ('member_found_innocent', 'nominee_disqualified'));--> statement-breakpoint
ALTER TABLE "claim_nominee_findings" ADD CONSTRAINT "claim_nominee_findings_rank_coherence_check" CHECK (
	("kind" = 'member_found_innocent' AND "rank" IS NULL)
	OR ("kind" = 'nominee_disqualified' AND "rank" IS NOT NULL AND "rank" IN (1, 2))
);--> statement-breakpoint
GRANT SELECT, INSERT ON "claim_nominee_findings" TO twt_app;--> statement-breakpoint
ALTER TABLE "claim_nominee_findings" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "claim_nominee_findings" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "claim_nominee_findings_tenant_isolation_select" ON "claim_nominee_findings" AS PERMISSIVE FOR SELECT TO "twt_app" USING (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "claim_nominee_findings_tenant_isolation_insert" ON "claim_nominee_findings" AS PERMISSIVE FOR INSERT TO "twt_app" WITH CHECK (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid);--> statement-breakpoint
CREATE INDEX "claim_nominee_findings_pariwar_id_idx" ON "claim_nominee_findings" USING btree ("pariwar_id");--> statement-breakpoint
CREATE INDEX "claim_nominee_findings_claim_case_id_idx" ON "claim_nominee_findings" USING btree ("claim_case_id");--> statement-breakpoint
CREATE UNIQUE INDEX "claim_nominee_findings_one_innocence_per_claim_uq" ON "claim_nominee_findings" USING btree ("claim_case_id") WHERE kind = 'member_found_innocent';--> statement-breakpoint
CREATE UNIQUE INDEX "claim_nominee_findings_one_disqualification_per_rank_uq" ON "claim_nominee_findings" USING btree ("claim_case_id", "rank") WHERE kind = 'nominee_disqualified';
