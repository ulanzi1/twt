-- Migration 0216 — the offer's ROUTE marker (Story 12.5b, Task 1; Decision `2026-11-22-489` QE1, QE4 (e), QE6; carrying out
-- `2026-11-21-484` Q1 C and `2026-11-22-486` R1 A). Hand-authored — ⛔ never regenerate (`db:generate` diffs against the 0020
-- snapshot; the migrator skips by the journal `when`, which sits above every sibling's — [[project_sibling_migration_when_order_shared_db]]).
--
-- ⭐ WHAT IT IS. A partner offer works one of two ways (`-484` Q1 C): `trust_sends` (Story 12.5 — the Trust sends the member's four
-- details to the partner) or `partner_form` (this story — the member opens the partner's own page in the phone's own browser and the
-- Trust sends NOTHING about the member). The route is part of the IMMUTABLE manifest (manifest schema v2; ADR-0044 D3's pivot path):
--   (1) `marketplace_modules.lead_route` (NEW pgEnum) + `partner_form_url`; the two lead columns become nullable; the v1 CHECK is
--       REPLACED by `IN (1, 2)` + "a v1 row is trust_sends"; ONE pairing CHECK says which columns each route carries.
--   (2) `marketplace_modules_pariwar_module_route_unique (pariwar_id, module_id, lead_route)` — the target of (3)'s FK. ⛔ row change.
--   (3) `marketplace_module_publications.lead_route` — the PUBLISHER's choice (R1 A: "The choice is on the publish record"), tied to the
--       module's own route by a composite FK, so "the publication's route = the module's" is a DATABASE fact (I8).
--   (4) `marketplace_lead_handoffs`: the cancel word `partner_form_route` in the detail grammar (⚠ LOCKSTEP with
--       `LEAD_HANDOFF_DETAIL_PATTERN`), and the BACKSTOP trigger `marketplace_lead_handoffs_route_guard` — a `partner_form` module can
--       never get a handoff row, whatever the commands above it do (I2).
--
-- ⚠ TR2 — ⛔ UPDATE backfill. The 0193 whole-row trigger refuses ANY unguarded UPDATE of `marketplace_modules` (P0001). Every existing
-- row takes `trust_sends` through the column DEFAULT (ADD COLUMN with a constant default is catalogue-only: ⛔ row rewrite, ⛔ row
-- trigger fires), then the DEFAULT is DROPPED so every new INSERT must name the route — a writer that forgets fails loudly (23502).
-- ⚠ G2 — the new columns are IMMUTABLE with ⛔ trigger change: the 0193 guard compares the whole row minus the six projected keys.
-- ⚠ The old `marketplace_module_publications_module_fk (pariwar_id, module_id)` STAYS; the new one is stricter and sits beside it.
-- Every FK here is NO ACTION (0195's reason: an FK action that UPDATEs `marketplace_modules` runs without the writer guard).
-- Locks (stated honestly): the UNIQUE takes ACCESS EXCLUSIVE on `marketplace_modules` and builds an index; each FK takes SHARE ROW
-- EXCLUSIVE on both tables and validates existing rows (every one is `trust_sends` on both sides). Fine pre-production.

CREATE TYPE "public"."marketplace_module_lead_route" AS ENUM('trust_sends', 'partner_form');--> statement-breakpoint
ALTER TABLE "marketplace_modules" ADD COLUMN "lead_route" "marketplace_module_lead_route" DEFAULT 'trust_sends' NOT NULL;--> statement-breakpoint
ALTER TABLE "marketplace_modules" ALTER COLUMN "lead_route" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "marketplace_modules" ADD COLUMN "partner_form_url" text;--> statement-breakpoint
ALTER TABLE "marketplace_modules" ALTER COLUMN "lead_handoff_url" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "marketplace_modules" ALTER COLUMN "lead_handoff_signing_key_secret_name" DROP NOT NULL;--> statement-breakpoint
-- ADR-0044 D3: "a migration that relaxes this CHECK together with a new parser arm and a new genesis payload schema". Swapped BY NAME (TR5).
ALTER TABLE "marketplace_modules" DROP CONSTRAINT "marketplace_modules_manifest_schema_version_v1";--> statement-breakpoint
ALTER TABLE "marketplace_modules" ADD CONSTRAINT "marketplace_modules_manifest_schema_version" CHECK ("manifest_schema_version" IN (1, 2));--> statement-breakpoint
-- A v1 manifest never had a route: it is read as `trust_sends`, and it can never BE anything else (AC2, I7).
ALTER TABLE "marketplace_modules" ADD CONSTRAINT "marketplace_modules_v1_is_trust_sends" CHECK ("manifest_schema_version" = 2 OR "lead_route" = 'trust_sends');--> statement-breakpoint
-- QE1 — which columns each route carries. `partner_form`: the partner's page URL, ⛔ handoff URL, ⛔ signing key, ⛔ places (nothing is
-- sent, so there is nothing to count down). `trust_sends`: exactly the 12.1 shape, ⛔ partner page.
ALTER TABLE "marketplace_modules" ADD CONSTRAINT "marketplace_modules_route_columns" CHECK (("lead_route" = 'trust_sends' AND "lead_handoff_url" IS NOT NULL AND "lead_handoff_signing_key_secret_name" IS NOT NULL AND "partner_form_url" IS NULL) OR ("lead_route" = 'partner_form' AND "partner_form_url" IS NOT NULL AND "lead_handoff_url" IS NULL AND "lead_handoff_signing_key_secret_name" IS NULL AND "slot_capacity" IS NULL));--> statement-breakpoint
-- QE6 — the publication FK's target. ⛔ row change, so the 0193 trigger is untouched.
ALTER TABLE "marketplace_modules" ADD CONSTRAINT "marketplace_modules_pariwar_module_route_unique" UNIQUE("pariwar_id","module_id","lead_route");--> statement-breakpoint
-- QE6 (A) — R1 A: the publisher chooses the route again at publish (⛔ default after this migration); the row stores it.
ALTER TABLE "marketplace_module_publications" ADD COLUMN "lead_route" "marketplace_module_lead_route" DEFAULT 'trust_sends' NOT NULL;--> statement-breakpoint
ALTER TABLE "marketplace_module_publications" ALTER COLUMN "lead_route" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "marketplace_module_publications" ADD CONSTRAINT "marketplace_module_publications_module_route_fk" FOREIGN KEY ("pariwar_id","module_id","lead_route") REFERENCES "public"."marketplace_modules"("pariwar_id","module_id","lead_route") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
-- QE4 / G13 — the cancel word `partner_form_route` (the sweep's S4 and its waiting pass, QE5). ⚠ LOCKSTEP with
-- `LEAD_HANDOFF_DETAIL_PATTERN`; 0215 is applied, so the CHECK is REPLACED here (⛔ edit 0215). Every row 0215 admitted is still admitted.
ALTER TABLE "marketplace_lead_handoffs" DROP CONSTRAINT "marketplace_lead_handoffs_outcome_detail_check";--> statement-breakpoint
ALTER TABLE "marketplace_lead_handoffs" ADD CONSTRAINT "marketplace_lead_handoffs_outcome_detail_check" CHECK ("outcome_detail" IS NULL OR "outcome_detail" ~ '^(delivered:http_2xx:2[0-9]{2}|released:(http_5xx:5[0-9]{2}|http_408|http_429|timeout|network|http_401|http_403|http_404|address_refused)|held:(signing_key|kms|audit|db|dns)_unavailable|lapsed:lease_expired|requeued:manual|failed_delivery:(http_4xx:4[0-9]{2}|http_3xx:3[0-9]{2}|port_refused|url_refused|fields_unreadable|retries_exhausted|outcome_unknown|hold_expired:(signing_key|kms|audit|db|dns))|cancelled:(consent_revoked|member_erased|member_withdrawn|member_terminated|account_frozen|death_reported|module_withdrawn|partner_form_route))$');--> statement-breakpoint
-- QE4 (e) — THE BACKSTOP (I2). A NEW function and trigger; `marketplace_lead_handoffs_guard` (0215) is ⛔ replaced
-- ([[project_append_only_guard_names_erasure_columns]]). It runs AS THE INSERTER (⛔ SECURITY DEFINER). The module row is visible to it for
-- every inserter: for `twt_app` because the handoffs INSERT policy forces `NEW.pariwar_id` to equal the scope GUC, which the modules SELECT
-- policy also keys on; a superuser or BYPASSRLS role sees every row. (The composite FK proves nothing here: an FK check bypasses RLS.)
-- ⛔ row found (an unknown module) ⇒ the INSERT goes on and the composite FK raises its usual 23503 — the existing error stays.
CREATE FUNCTION marketplace_lead_handoffs_reject_partner_form_route()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  route marketplace_module_lead_route;
BEGIN
  SELECT m.lead_route INTO route
    FROM marketplace_modules m
   WHERE m.pariwar_id = NEW.pariwar_id AND m.module_id = NEW.module_id;
  IF route = 'partner_form' THEN
    RAISE EXCEPTION
      'marketplace_lead_handoffs route rejected — a partner_form offer never passes a member on (Story 12.5b, I2); attempted handoff % for module %',
      NEW.lead_id, NEW.module_id
      USING ERRCODE = 'P0001';
  END IF;
  RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER marketplace_lead_handoffs_route_guard
  BEFORE INSERT ON marketplace_lead_handoffs
  FOR EACH ROW EXECUTE FUNCTION marketplace_lead_handoffs_reject_partner_form_route();
