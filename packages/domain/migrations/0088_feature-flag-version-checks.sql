-- Migration 0088 — feature_flag_versions DB-level shape backstops (Story 10.8, Review Pass 2).
--
-- Adds the CHECK constraints migration 0087 left to the application layer. Every rule below was
-- ALREADY enforced in `validateFlagVersionInput` — and every one of them was reachable around that
-- validator, because 0087's own header establishes that GLOBAL rows are authored by "a service-pool/
-- seed path" that does not call it. An app-layer rule with no DB mirror is a rule that holds only for
-- the callers who happen to go through the app layer.
--
-- Load-bearing-invariant checklist family 5: "app-layer shape validation mirrored by CHECK
-- constraints". The Pass-2 Acceptance Auditor recorded this as a REAL GAP, and it is the gap that
-- made the evaluator's TypeError escape reachable in the first place.
--
-- ⚠ DO NOT REGENERATE THIS FILE with `db:generate`.
-- drizzle-kit skips an already-applied migration by journal `when` (NOT by SQL hash), and the meta/
-- snapshots stop at 0020 (0021+ are hand-authored, snapshot-absent — known drift, NOT gate-blocking).
-- A `db:generate` would diff CURRENT schema against 0020_snapshot.json and wrongly re-emit applied
-- migrations → 42P07. HAND-AUTHORED, carrying ONLY this change. No snapshot emitted.
--
-- ⚠ WHY A SEPARATE MIGRATION rather than editing 0087: 0087 has already been applied to the local
-- test database. drizzle-kit skips by journal `when`, so an in-place edit would silently never run —
-- the constraints would exist in the file and nowhere else, which is worse than not adding them.

-- (1) `version >= 2`. Version 1 is the CODE DEFAULT and owns no row (registry.ts header). A
-- persisted row at version 1 breaks the (pariwar_id, flag_key, version) replay pin outright:
-- `flagVersionForVersion` short-circuits to the code default WITHOUT querying, while
-- `flagVersionInForce` filters on window and scope only and would return that row as governing — so
-- the pin resolves to a different document than the one that actually decided.
ALTER TABLE "feature_flag_versions"
  ADD CONSTRAINT "feature_flag_versions_version_min_ck" CHECK ("version" >= 2);
--> statement-breakpoint

-- (2) The supersession forward-pointer must point FORWARD. 0084's composite self-FK was dropped here
-- (0087 carve-out (c)) because MATCH SIMPLE is vacuous when `pariwar_id` is NULL — true, but that
-- argument only covers the GLOBAL half of the table, and it was dropped for every row. The
-- append-only trigger named as "the real backstop" enforces column IMMUTABILITY, a different
-- property; it never inspects `superseded_by_version` at all. So nothing prevented a tenant-scoped
-- caller from pointing a row at itself, backwards, or at a version that does not exist, silently
-- breaking the chain the inventory renders as provenance. A full existence check still cannot be a
-- constraint here (same NULL-tenant reason), but monotonicity can, and it kills the self-reference
-- and backward-reference cases outright.
ALTER TABLE "feature_flag_versions"
  ADD CONSTRAINT "feature_flag_versions_superseded_forward_ck"
  CHECK ("superseded_by_version" IS NULL OR "superseded_by_version" > "version");
--> statement-breakpoint

-- (3) The effective window must be non-empty. `validateFlagVersionInput` checks this only when the
-- caller supplies BOTH fields; the registry re-checks against the RESOLVED effective_from. Neither
-- helps a writer that bypasses the domain API.
ALTER TABLE "feature_flag_versions"
  ADD CONSTRAINT "feature_flag_versions_window_ck"
  CHECK ("effective_until" IS NULL OR "effective_until" > "effective_from");
--> statement-breakpoint

-- (4) Governance text must actually be present. FR-58C is "flag changes audit-logged with actor +
-- rationale"; an empty rationale satisfies NOT NULL while defeating the requirement entirely. Same
-- for `owner`, which is the lifecycle-accountability signal the quarterly inventory audit reads
-- (architecture.md:4094-4098). Lengths mirror MAX_RATIONALE_LENGTH / MAX_OWNER_LENGTH in registry.ts.
ALTER TABLE "feature_flag_versions"
  ADD CONSTRAINT "feature_flag_versions_rationale_ck"
  CHECK (btrim("rationale") <> '' AND length("rationale") <= 500);
--> statement-breakpoint

ALTER TABLE "feature_flag_versions"
  ADD CONSTRAINT "feature_flag_versions_owner_ck"
  CHECK (btrim("owner") <> '' AND length("owner") <= 64);
--> statement-breakpoint

-- (5) `cohort_definition` must at least be an object carrying a `clauses` ARRAY. This is the one that
-- closes the reachable crash: the evaluator now shape-guards defensively, but a row whose
-- cohort_definition is `{}` or `{"clauses": null}` should never have been storable. Postgres can
-- assert the container shape cheaply; the per-clause interior stays an app-layer concern (a CHECK
-- deep enough to validate every clause would be a rule engine in DDL).
ALTER TABLE "feature_flag_versions"
  ADD CONSTRAINT "feature_flag_versions_cohort_shape_ck"
  CHECK (
    jsonb_typeof("cohort_definition") = 'object'
    AND jsonb_typeof("cohort_definition" -> 'clauses') = 'array'
  );
