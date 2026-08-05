-- Migration 0094 — the contribution-projection COVERAGE WATERMARK (Story 10.24 round-2 review, D2).
--
-- ⚠ DO NOT REGENERATE THIS FILE with `db:generate` (same discipline as 0021–0093, stated verbatim in
-- the 0081 and 0093 headers). The drizzle snapshot baseline is frozen at 0020; a regenerate emits a
-- bloated catch-up migration, and drizzle-kit skips an already-applied migration by journal `when` (NOT
-- by SQL hash), so a regenerate-after-apply silently drops hand-supplements and can raise 42P07.
--
-- ── The defect this closes ───────────────────────────────────────────────────────────────────────────
-- Migration 0093 shipped two projections and a producer that reads them, but the producer had NO WAY to
-- tell "no rows because nothing happened" from "no rows because nothing was projected". Every `null`
-- branch in `deriveContributionFacts` was a structural impossibility given the SQL feeding it (a
-- `count(*)` is never negative; a `max(confirmed_at)` under `confirmed_at <= at` is never in the
-- future), so the `producer_unavailable` sentinel — the whole point of D6, and of [[CR-4.4-D3]]'s "an
-- absent fact must be distinguishable from a clean-record member" — was DEAD CODE on the production
-- path. An empty ledger (backfill never run, or run partially) therefore rendered as an affirmative
-- CLEAN RECORD for every member in the Pariwar, on the surface that feeds suspension decisions.
--
-- ⚖ Ratified 2026-08-05 by BigDev: "Unknown projection state must never fabricate a clean member."
--
-- ── The mechanism ────────────────────────────────────────────────────────────────────────────────────
-- One row per Pariwar, written by the BACKFILL. Its EXISTENCE is the claim "this Pariwar's contribution
-- history has been projected"; `covered_from` is the instant from which that claim holds.
--
--   · No row            → `deriveContributionFacts` returns null → `producer_unavailable`. This is the
--                         load-bearing case: it makes the backfill a PRECONDITION for supplying facts
--                         rather than an optional repair path, so forgetting to run it degrades
--                         honestly instead of fabricating a clean membership.
--   · `at < covered_from` → likewise the sentinel: the projection makes no claim about that instant.
--   · Otherwise         → facts are derivable. Coverage needs no upper bound: 0093's AFTER-INSERT
--                         trigger maintains the ledger live from the moment it was created, and the
--                         backfill (which runs after) closes everything before it. The two meet with
--                         no hole, which is precisely why `covered_from` is a lower bound only.
--
-- Deliberately NOT an event-derived-state primitive and NOT a cache: it is operational provenance about
-- a projection, with a single writer (the backfill) and no lifecycle. Mirrors the plain-append posture
-- of the 0093 tables rather than the `member_validity_cache` posture.

CREATE TABLE "contribution_projection_coverage" (
	-- One row per tenant. PK = the scope; there is no separate surrogate id.
	"pariwar_id" uuid PRIMARY KEY NOT NULL,
	-- The instant from which the projection is AUTHORITATIVE. The backfill sets it to the Pariwar's
	-- earliest `events_log.occurred_at` (its genesis), so historical replay — `getValidityAt(..., an
	-- already-frozen committed_at)` on the assignable-roster path — keeps working rather than degrading
	-- every past cycle to the sentinel. When the Pariwar has no events at all it is the backfill instant.
	"covered_from" timestamp with time zone NOT NULL,
	-- Provenance: when the backfill last refreshed this claim. Never read by the derivation; it exists so
	-- an operator can tell a fresh backfill from one that ran months ago.
	"backfilled_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint

-- GRANTs: SELECT for the read path, INSERT/UPDATE for the backfill's idempotent upsert. NO DELETE —
-- coverage is only ever advanced or refreshed, never retracted; withdrawing a coverage claim would
-- silently darken a Pariwar's whole trustee section and must be a deliberate operator act, not an
-- app-reachable one. (0093's projections take the same no-DELETE posture, pinned by a 42501 test.)
GRANT SELECT, INSERT, UPDATE ON "contribution_projection_coverage" TO twt_app;--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE ON "contribution_projection_coverage" TO twt_service;--> statement-breakpoint

ALTER TABLE "contribution_projection_coverage" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "contribution_projection_coverage" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "contribution_projection_coverage_tenant_isolation_select" ON "contribution_projection_coverage" AS PERMISSIVE FOR SELECT TO "twt_app" USING (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "contribution_projection_coverage_tenant_isolation_write" ON "contribution_projection_coverage" AS PERMISSIVE FOR ALL TO "twt_app" USING (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid) WITH CHECK (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid);
