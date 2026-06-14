-- Migration 0010 — audit_integrity_checks structural CHECK constraints (Story 1.11a code review).
--
-- ⚠ DO NOT REGENERATE THIS FILE with `db:generate`.
-- These are hand-supplemented CHECK constraints that enforce documented invariants
-- on audit_integrity_checks (migration 0008). drizzle-kit does not emit CHECK DDL
-- from the Drizzle schema layer — the same hand-edit norm as the trigger
-- supplements in migrations 0001/0006/0008. The snapshot at
-- meta/0010_snapshot.json records only the table-shape view; CHECK constraints
-- are invisible to `drizzle-kit check`, matching the trigger hand-supplements.
--
-- ── Why these constraints exist ──────────────────────────────────────────────
-- The schema comment on audit_integrity_checks.ts documents three structural
-- invariants that should be enforced at the DB layer, not just trusted to the
-- application layer:
--
--   1. A PASSING verdict (chain_valid=true) must have no broken row recorded.
--      A bug in `verifyAuditChain` could silently produce chain_valid=true with a
--      non-null first_broken_seq — the DB layer rejects it.
--
--   2. Boundary columns come in pairs: start_seq + start_audit_id are either
--      both NULL (empty-chain run) or both non-null (any non-empty run). Ditto
--      for end_seq + end_audit_id. A half-populated boundary (seq without audit_id
--      or vice-versa) is incoherent and should be structurally rejected.
--
--   3. rows_verified is never negative. Zero is valid (empty-chain run); negative
--      is a writer bug and should be rejected.
--
-- These constraints are additive — they narrow the domain of accepted rows
-- without touching existing rows (all zero of which exist on a fresh DB, and all
-- of which conform to these invariants on the dev/CI DB seeded by this branch).
--
-- Idempotency invariant: re-running this migration is a no-op (drizzle consults
-- __drizzle_migrations by journal entry).

-- (1) A valid chain has no broken-row record.
--     `NOT chain_valid OR (first_broken_seq IS NULL AND first_broken_audit_id IS NULL)`
--     is the logical form: if chain_valid=true, both broken-row columns must be null.
--     Conversely, chain_valid=false does NOT require first_broken_* to be non-null
--     (a head-truncation detected before any rows are verified has rows_verified=0
--     and the broken row IS the new head — first_broken_* is populated in that case,
--     but the constraint only flows one direction: valid → no broken row record).
ALTER TABLE "audit_integrity_checks"
  ADD CONSTRAINT "audit_integrity_checks_valid_no_broken_row"
  CHECK (
    NOT chain_valid
    OR (first_broken_seq IS NULL AND first_broken_audit_id IS NULL)
  );--> statement-breakpoint

-- (2a) start_seq + start_audit_id are co-present.
ALTER TABLE "audit_integrity_checks"
  ADD CONSTRAINT "audit_integrity_checks_start_pair_coherent"
  CHECK ((start_seq IS NULL) = (start_audit_id IS NULL));--> statement-breakpoint

-- (2b) end_seq + end_audit_id are co-present.
ALTER TABLE "audit_integrity_checks"
  ADD CONSTRAINT "audit_integrity_checks_end_pair_coherent"
  CHECK ((end_seq IS NULL) = (end_audit_id IS NULL));--> statement-breakpoint

-- (2c) start and end boundaries are both absent or both present.
--     An empty-chain run: both null. A non-empty run: both populated.
ALTER TABLE "audit_integrity_checks"
  ADD CONSTRAINT "audit_integrity_checks_boundary_pair_coherent"
  CHECK ((start_seq IS NULL) = (end_seq IS NULL));--> statement-breakpoint

-- (3) rows_verified is non-negative. Zero is valid (empty chain run).
ALTER TABLE "audit_integrity_checks"
  ADD CONSTRAINT "audit_integrity_checks_rows_verified_non_negative"
  CHECK (rows_verified >= 0);
