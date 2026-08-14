-- Story 10.21 — off-portal DPDPA data-rights provenance on `data_exports` (AC5, off-portal-build half).
--
-- HAND-AUTHORED, not generated. Adds three provenance columns so an export built through the
-- identity-verified administrative process (Niyamavali §8.4) is distinguishable, in the row itself,
-- from a member self-service export. The member path is UNCHANGED and keeps writing 'member_portal'.
--
-- ── ⚠ THESE COLUMNS DELIBERATELY CARRY DB-LEVEL CONSTRAINTS, UNLIKE `status` / `failed_reason` ──────
-- `data_exports.ts` records an app-layer-enum posture for `status` and `failed_reason`: bounded in the
-- contract, NOT in the DB. A reviewer will reasonably expect the new columns to follow suit. They do
-- NOT, and the difference is the point:
--   · `status` / `failed_reason` are DISPLAY values. A wrong one is a cosmetic defect.
--   · `requested_via` gates a PII-DISCLOSURE PATH. An unconstrained column lets a mis-set
--     'member_portal' DISGUISE an off-portal build in every audit query that filters on it — the
--     audit trail would then be confidently wrong about who obtained a member's Tier-1 dossier.
-- So `requested_via` carries a CHECK and `helpdesk_ticket_id` carries an FK. The constraint is the
-- backstop for a column whose whole job is to be trustworthy after the fact.
--
-- ── GRANTS: none needed ────────────────────────────────────────────────────────────────────────────
-- `data_exports` carries a TABLE-LEVEL `GRANT SELECT, INSERT, UPDATE ... TO twt_app` (0033), and a
-- table-level grant DOES extend to columns added later. ⚠ This differs from migration 0099, which had
-- to re-grant BY NAME because `member_moderation_actions` uses COLUMN-LEVEL grants — there, a new
-- column was structurally un-writable until granted, and the failure was silent. Verified here: no
-- re-grant is required. ⛔ Do not copy 0099's re-grant block into this file "for symmetry".
--
-- RLS is unchanged: the existing tenant-isolation SELECT/ALL policies cover the whole row, so the new
-- columns inherit them. No policy edit, no FORCE change.

-- The originating channel. NOT NULL DEFAULT 'member_portal' so every pre-existing row is correctly
-- backfilled as what it actually was — a member self-service export. ⛔ This is NOT a semantic
-- backfill of unknown data: before this story the ONLY way to create a `data_exports` row was the
-- member portal route, so the default states a fact, not a guess.
ALTER TABLE "data_exports" ADD COLUMN "requested_via" text DEFAULT 'member_portal' NOT NULL;--> statement-breakpoint

-- The acting ADMIN for an off-portal build; NULL for every member self-service row. Deliberately
-- un-FK'd to `users`: this is an attribution snapshot, and an actor row disappearing must never make
-- an export's provenance unreadable.
ALTER TABLE "data_exports" ADD COLUMN "requested_by_actor_id" uuid;--> statement-breakpoint

-- The originating helpdesk ticket for an off-portal build; NULL for every member self-service row.
-- PROVENANCE ONLY — it records WHICH REQUEST caused the build, never WHAT the build may see. Every
-- fulfilment read keys on `member_id` (AC4); nothing resolves subject scope through this column.
ALTER TABLE "data_exports" ADD COLUMN "helpdesk_ticket_id" uuid;--> statement-breakpoint

-- CHECK: the two-value union, mirrored from the contract. See the header for why this one is enforced
-- at the DB while `status` is not.
ALTER TABLE "data_exports" ADD CONSTRAINT "data_exports_requested_via_check" CHECK ("requested_via" IN ('member_portal', 'off_portal_admin'));--> statement-breakpoint

-- FK → helpdesk_tickets.ticket_id. ON DELETE SET NULL, deliberately: helpdesk tickets are not deleted
-- in normal operation, and if one ever were, losing the pointer must not cascade into deleting the
-- export's audit row. ⛔ NOT `ON DELETE CASCADE` — that would let ticket cleanup silently destroy a
-- record of a statutory-access fulfilment.
-- ⚠ KNOWN AND ACCEPTED: this FK is TENANCY-BLIND. PostgreSQL referential integrity bypasses RLS, so the
-- constraint alone would not stop a cross-tenant ticket id being referenced. That is a
-- provenance-integrity hole, NOT an access hole — the route resolves the ticket under the caller's
-- scope tx before writing, and the linkage grants no read authority (AC4). A composite-FK precedent
-- exists (0084) and adopting it is a design change, not a correction; recorded here so the choice is
-- visible rather than accidental.
ALTER TABLE "data_exports" ADD CONSTRAINT "data_exports_helpdesk_ticket_id_fk" FOREIGN KEY ("helpdesk_ticket_id") REFERENCES "public"."helpdesk_tickets"("ticket_id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint

-- Partial index on the off-portal rows: the audit question this story exists to answer is "which
-- exports were built through the administrative process, and for whom" — a filtered scan over a small
-- minority of rows. Partial so member-portal rows (the overwhelming majority) cost nothing.
CREATE INDEX "data_exports_off_portal_idx" ON "data_exports" ("member_id", "requested_at") WHERE requested_via = 'off_portal_admin';
