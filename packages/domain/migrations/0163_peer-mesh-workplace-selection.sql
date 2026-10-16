-- Migration 0163 — THE FIVE ARE CHOSEN FROM THE MEMBER'S OWN WORKPLACE (Story 6.36, Task 1; AC1, AC9; 6.36a SW18–SW24, I9;
-- `-310` CF4 A, `-331` SC1 A, `-330`). Hand-authored — ⛔ never regenerate. Number and `when` FIXED by `2026-10-14-332`.
--
--   · claim_peer_mesh_selections gains the `workplace_named_v1` record: where the five came from (`source`), whether the
--     previous workplace counted, the staff line (`recent_change_before_filing`), the deceased's two workplace ids (row
--     6-32 reads them), and the winning group's RANKING (≤ 500 — 6.27c replaces a skipped person from the SAME group).
--     ⚠ The two "must be filled" CHECKs and the prefix trigger are SCOPED to `metric_id = 'workplace_named_v1'` — the shipped
--     `district_cohort_v1` rows (and ten test inserts with other ids) carry NULLs and stay valid. ⛔ No backfill.
--   · claim_peer_mesh_pings gains `source` — set at INSERT, equal to its selection's (a trigger), immutable by grant
--     (0156's column GRANT names ⛔ `source`).
--   · member_postings gains the "who is at workplace W" index (its only index was `(pariwar_id, member_id)`).
--   · The SELECTION table's table-wide UPDATE (0054) is narrowed to the three disposition columns — every writer updates
--     only `outcome`, `response_window_expires_at`, `skip_reason` (`peer-mesh-persist.ts`) ⇒ the new columns (and 6.6's
--     snapshot) are immutable by grant (I9).
-- ⛔ No PII: workplace ids (Tier 3), booleans, member ids — ⛔ never a date of death.

-- ── (1) the selection's new columns ──────────────────────────────────────────────────────────────────────────────────
ALTER TABLE "claim_peer_mesh_selections" ADD COLUMN "source" text;--> statement-breakpoint
ALTER TABLE "claim_peer_mesh_selections" ADD COLUMN "previous_workplace_counted" boolean;--> statement-breakpoint
ALTER TABLE "claim_peer_mesh_selections" ADD COLUMN "recent_change_before_filing" boolean;--> statement-breakpoint
ALTER TABLE "claim_peer_mesh_selections" ADD COLUMN "deceased_workplace_id" uuid;--> statement-breakpoint
ALTER TABLE "claim_peer_mesh_selections" ADD COLUMN "deceased_previous_workplace_id" uuid;--> statement-breakpoint
ALTER TABLE "claim_peer_mesh_selections" ADD COLUMN "ranked_member_ids" uuid[];--> statement-breakpoint
-- ⚠ LOCKSTEP with `PEER_MESH_SOURCES` (`schema/claim_peer_mesh_selections.ts`).
ALTER TABLE "claim_peer_mesh_selections" ADD CONSTRAINT "claim_peer_mesh_selections_source_check" CHECK ("source" IS NULL OR "source" IN ('workplace', 'named_by_member'));--> statement-breakpoint
-- The stored ranking is the winning group's FIRST 500 (`PEER_MESH_RANKED_MAX`) — an office of 600 never fails the job.
ALTER TABLE "claim_peer_mesh_selections" ADD CONSTRAINT "claim_peer_mesh_selections_ranked_max500" CHECK ("ranked_member_ids" IS NULL OR cardinality("ranked_member_ids") <= 500);--> statement-breakpoint
ALTER TABLE "claim_peer_mesh_selections" ADD CONSTRAINT "claim_peer_mesh_selections_workplace_named_filled" CHECK ("metric_id" <> 'workplace_named_v1' OR ("ranked_member_ids" IS NOT NULL AND "previous_workplace_counted" IS NOT NULL AND "recent_change_before_filing" IS NOT NULL));--> statement-breakpoint
-- A source ⇔ somebody was chosen (the zero branch writes `'{}'` and ⛔ source).
ALTER TABLE "claim_peer_mesh_selections" ADD CONSTRAINT "claim_peer_mesh_selections_workplace_named_source" CHECK ("metric_id" <> 'workplace_named_v1' OR (("source" IS NULL) = (cardinality("selected_member_ids") = 0)));--> statement-breakpoint
-- ⚠ Narrow the 0054 table-wide UPDATE to the disposition columns (the ping table's precedent, 0156).
REVOKE UPDATE ON "claim_peer_mesh_selections" FROM twt_app;--> statement-breakpoint
GRANT UPDATE ("outcome", "response_window_expires_at", "skip_reason") ON "claim_peer_mesh_selections" TO twt_app;--> statement-breakpoint

-- ── (2) the ping's source ────────────────────────────────────────────────────────────────────────────────────────────
ALTER TABLE "claim_peer_mesh_pings" ADD COLUMN "source" text;--> statement-breakpoint
ALTER TABLE "claim_peer_mesh_pings" ADD CONSTRAINT "claim_peer_mesh_pings_source_check" CHECK ("source" IS NULL OR "source" IN ('workplace', 'named_by_member'));--> statement-breakpoint

-- ── (3) "who is at workplace W" ──────────────────────────────────────────────────────────────────────────────────────
CREATE INDEX "member_postings_pariwar_workplace_idx" ON "member_postings" USING btree ("pariwar_id", "workplace_id") WHERE "workplace_id" IS NOT NULL;--> statement-breakpoint

-- ── (4) the selected five are the FIRST entries of the ranking (arrays have ⛔ prefix operator in a CHECK) ─────────────
-- Applied ONLY to `workplace_named_v1` (the legacy rows carry a non-empty selection and ⛔ ranking). An empty selection is
-- a valid prefix. A NULL ranking is left to the "filled" CHECK above. On UPDATE too: `twt_app` cannot UPDATE these columns
-- (the grant), but the owner and superuser tests can.
CREATE FUNCTION claim_peer_mesh_selections_prefix_guard()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  n integer;
BEGIN
  IF NEW.metric_id IS DISTINCT FROM 'workplace_named_v1' OR NEW.ranked_member_ids IS NULL THEN
    RETURN NEW;
  END IF;
  n := coalesce(cardinality(NEW.selected_member_ids), 0);
  IF n > cardinality(NEW.ranked_member_ids)
     OR (n > 0 AND NEW.selected_member_ids IS DISTINCT FROM NEW.ranked_member_ids[1:n]) THEN
    RAISE EXCEPTION 'claim_peer_mesh_selections: the selected members are the first entries of the ranking (Story 6.36)'
      USING ERRCODE = 'integrity_constraint_violation';
  END IF;
  RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER "claim_peer_mesh_selections_prefix_guard" BEFORE INSERT OR UPDATE OF "selected_member_ids", "ranked_member_ids", "metric_id" ON "claim_peer_mesh_selections"
  FOR EACH ROW EXECUTE FUNCTION claim_peer_mesh_selections_prefix_guard();
--> statement-breakpoint

-- ── (5) a ping carries ITS selection's source ────────────────────────────────────────────────────────────────────────
-- SECURITY INVOKER: it reads the selection the inserting scope can see. NOT FOUND (absent, or another Pariwar's — RLS)
-- ⇒ `RETURN NEW` and the composite FK (0157) refuses with 23503, as before. FOUND ⇒ the sources must be equal (the
-- shipped inserters write NULL against a NULL-source selection ⇒ they pass).
CREATE FUNCTION claim_peer_mesh_pings_source_guard()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY INVOKER AS $$
DECLARE
  selection_source text;
BEGIN
  SELECT s.source INTO selection_source
    FROM claim_peer_mesh_selections s
   WHERE s.pariwar_id = NEW.pariwar_id AND s.selection_id = NEW.selection_id;
  IF NOT FOUND THEN
    RETURN NEW;
  END IF;
  IF NEW.source IS DISTINCT FROM selection_source THEN
    RAISE EXCEPTION 'claim_peer_mesh_pings: a ping carries its selection''s source (Story 6.36)'
      USING ERRCODE = 'integrity_constraint_violation';
  END IF;
  RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER "claim_peer_mesh_pings_source_guard" BEFORE INSERT ON "claim_peer_mesh_pings"
  FOR EACH ROW EXECUTE FUNCTION claim_peer_mesh_pings_source_guard();
