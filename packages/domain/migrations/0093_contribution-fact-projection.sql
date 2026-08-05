-- Migration 0093 — the contribution-fact projection (Story 10.24, Tasks 2/7; D1, D3, AC6a).
--
-- Story 4.2 deferred the `contribution.*` fact PRODUCER to "Epic 8/9". Both epics closed `done` and
-- nothing was built: the `contribution.confirmed` EVENT producer shipped (Story 9.4), but nothing ever
-- mapped those events onto the seven `contribution.*` fact keys the R7 ladder reads. This migration is
-- the substrate that closes that gap — two narrow, AS-OF-CORRECT projections, plus the trigger that
-- keeps the first of them in step with the event log.
--
-- ⚠ DO NOT REGENERATE THIS FILE with `db:generate` (same discipline as 0021–0092, stated verbatim in
-- the 0081 header). The drizzle snapshot baseline is frozen at 0020; a regenerate emits a bloated
-- catch-up migration, and drizzle-kit skips an already-applied migration by journal `when` (NOT by SQL
-- hash), so a regenerate-after-apply silently drops hand-supplements and can raise 42P07. HAND-AUTHORED.
--
-- ── Why TWO tables, and why row-level rather than one aggregate row per member (D1) ──────────────────
-- The five facts must be answerable AT ANY INSTANT, cheaply. An aggregate-per-member table can only
-- answer "now": it would make `getValidityAt(historical)` silently disagree with `getValidity()`, break
-- replay for `apps/jobs/src/assignable-roster.ts` (which calls `getValidityAt(..., committedAt)` for
-- every member of every spawning cycle), and put an un-versioned staleness watermark on the correctness
-- path — on the surface that feeds a SUSPENSION decision. Row-level + indexed aggregate is BOTH faster
-- than the events_log JSONB scan AND replay-correct. Each row carries the time-bearing `reversed_at`
-- precisely so a reversal that happened AFTER `at` does not apply AT `at`.
--
-- ── Two maintenance MECHANISMS, one contract (D3) ────────────────────────────────────────────────────
-- The ledger is trigger-maintained (below); `member_pool_assignments` is written by an EXPLICIT domain
-- writer beside `db.insert(poolSnapshots)` in `pool/spawn.ts` — a trigger on `pool_snapshots` would
-- expand a JSONB array of up to 4L/N member ids inside the spawn transaction, un-instrumented, inside
-- Story 7.9's <60s envelope. The mechanism is an implementation detail; the PROJECTED STATE is the
-- contract, and the two are held observationally equivalent (atomicity · idempotency · replay
-- equivalence · ordering-independence) by ONE shared invariant test body run against BOTH paths
-- (packages/domain/tests/integration/contribution/projection-equivalence.spec.ts).

-- ── member_contribution_ledger — one row per confirmation, its reversal folded in (D1) ───────────────
CREATE TABLE "member_contribution_ledger" (
	-- PK = the `contribution.confirmed` event id. Idempotent BY CONSTRUCTION: a replayed/retried append
	-- or a re-run backfill collides on this key and is a no-op (ON CONFLICT DO NOTHING).
	"confirmed_event_id" uuid PRIMARY KEY NOT NULL,
	-- Multi-tenant scope (architecture §1.2). RLS predicate column. unFK'd (the pool-substrate posture).
	"pariwar_id" uuid NOT NULL,
	-- From `payload->>'memberId'` (the CONFIRMED_PAYLOAD_MEMBER_KEY forward contract, read.ts).
	"member_id" uuid NOT NULL,
	-- From `payload->>'poolId'` (CONFIRMED_PAYLOAD_POOL_KEY). unFK'd — the ledger must project an event
	-- even if the pool row is later archived to the cold tier.
	"pool_id" uuid NOT NULL,
	-- The confirmation's `occurred_at` — the as-of anchor for `confirmed_at <= at`.
	"confirmed_at" timestamp with time zone NOT NULL,
	-- The `reconciliation.confirmation-reversed` `occurred_at`, or NULL. NULLABLE AND TIME-BEARING: a
	-- reversal that happened after `at` must NOT apply at `at`, so this is never a boolean flag.
	"reversed_at" timestamp with time zone,
	-- Provenance: which reversal event walked this confirmation back.
	"reversed_by_event_id" uuid
);
--> statement-breakpoint
-- The load-bearing read index: `total_count(at)` (COUNT) and `months_since_last(at)` (MAX) are both
-- member-scoped aggregates over `confirmed_at`. DESC matches the MAX probe.
CREATE INDEX "member_contribution_ledger_member_idx" ON "member_contribution_ledger" ("pariwar_id", "member_id", "confirmed_at" DESC);--> statement-breakpoint
-- The `skips_current_year` join key: "does this member hold a live confirmation for THIS pool at `at`?"
CREATE INDEX "member_contribution_ledger_member_pool_idx" ON "member_contribution_ledger" ("pariwar_id", "member_id", "pool_id");--> statement-breakpoint
-- The reversal arm's lookup key is the PK (`confirmed_event_id`) — no extra index needed.

-- GRANTs: SELECT/INSERT/UPDATE. UPDATE is the reversal arm (`reversed_at`); there is deliberately NO
-- DELETE — the ledger is an append projection and its repair path is the idempotent backfill
-- (INSERT … ON CONFLICT DO NOTHING), never a truncate-and-rebuild. twt_service gets the same set (the
-- 0013 forward-safety precedent) so a future BYPASSRLS repair job is not privilege-blocked.
GRANT SELECT, INSERT, UPDATE ON "member_contribution_ledger" TO twt_app;--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE ON "member_contribution_ledger" TO twt_service;--> statement-breakpoint
ALTER TABLE "member_contribution_ledger" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "member_contribution_ledger" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
-- Tenant isolation (mirror member_validity_cache). Story 1.6 closed-failure construct: unset scope →
-- '' → nullif → NULL → 0 rows (quiet fail-closed on read; a fail-LOUD WITH CHECK on write).
CREATE POLICY "member_contribution_ledger_tenant_isolation_select" ON "member_contribution_ledger" AS PERMISSIVE FOR SELECT TO "twt_app" USING (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "member_contribution_ledger_tenant_isolation_write" ON "member_contribution_ledger" AS PERMISSIVE FOR ALL TO "twt_app" USING (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid) WITH CHECK (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid);--> statement-breakpoint

-- ── member_pool_assignments — one row per (member, pool) at freeze (D1) ──────────────────────────────
CREATE TABLE "member_pool_assignments" (
	-- PK (pool_id, member_id): a member is assigned to a pool at most once. Idempotent BY CONSTRUCTION
	-- under a re-spawn (ON CONFLICT DO NOTHING), exactly like the ledger's event-id PK.
	"pool_id" uuid NOT NULL,
	"member_id" uuid NOT NULL,
	"pariwar_id" uuid NOT NULL,
	-- The CycleFreezeCommitId. unFK'd — the pool substrate's posture ([[project_pool_primitive_substrate]]).
	-- Joined to `alerts.cycle_id` (UNIQUE) to reach the cycle's alert stream for the closed-by-`at` test.
	"cycle_id" uuid NOT NULL,
	-- The cycle-freeze `committed_at` — the assignment INSTANT (never the spawn wall-clock).
	"assigned_at" timestamp with time zone NOT NULL,
	CONSTRAINT "member_pool_assignments_pkey" PRIMARY KEY ("pool_id", "member_id")
);
--> statement-breakpoint
-- The `skips_current_year` driving index: the member's assignments within the IST calendar year of `at`.
CREATE INDEX "member_pool_assignments_member_idx" ON "member_pool_assignments" ("pariwar_id", "member_id", "assigned_at" DESC);--> statement-breakpoint
-- The backfill / per-cycle repair key.
CREATE INDEX "member_pool_assignments_cycle_idx" ON "member_pool_assignments" ("pariwar_id", "cycle_id");--> statement-breakpoint
-- SELECT/INSERT only — an assignment at freeze is immutable; there is nothing to update and (as with
-- the ledger) no DELETE, so a rebuild is always the idempotent re-insert.
GRANT SELECT, INSERT ON "member_pool_assignments" TO twt_app;--> statement-breakpoint
GRANT SELECT, INSERT ON "member_pool_assignments" TO twt_service;--> statement-breakpoint
ALTER TABLE "member_pool_assignments" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "member_pool_assignments" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "member_pool_assignments_tenant_isolation_select" ON "member_pool_assignments" AS PERMISSIVE FOR SELECT TO "twt_app" USING (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "member_pool_assignments_tenant_isolation_write" ON "member_pool_assignments" AS PERMISSIVE FOR ALL TO "twt_app" USING (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid) WITH CHECK (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid);--> statement-breakpoint

-- ── D3: the ledger-maintenance trigger on events_log ─────────────────────────────────────────────────
--
-- AFTER INSERT so the projection rides the SAME tx as the event append: a rolled-back append rolls back
-- the projection, and there is no ordering to get right. Precedent: migration 0036:85-107.
--
-- Why a trigger rather than a call inside the two domain append writers (`appendConfirmedContribution` /
-- `appendConfirmationReversed`) — the alternative is REAL, not a strawman, since both are single-point
-- today. The trigger wins on three counts the writer route cannot match: it is ATOMIC with the append;
-- it covers ANY future writer including the backfill and any replay/repair path; and the failure this
-- whole story exists to fix is "a producer nobody owned" — here, a mechanism that cannot be forgotten
-- is worth more than elsewhere.
--
-- SECURITY INVOKER (the default) is deliberate: the row is written under the appending session's own
-- scope, so a tenant-mismatched append fails LOUDLY at the WITH CHECK rather than silently projecting
-- into another tenant. Both live callers append inside `withPariwarScope(...)` with the same
-- `pariwar_id` they stamp on the event, so the check passes; a future unscoped writer fails the append
-- instead of leaving a confirmation unprojected, which is the correct direction to fail.
--
-- Both arms are single indexed statements (PK insert / PK update) — cheap enough per event INSERT, the
-- same argument 0036 makes for its DELETE.
CREATE FUNCTION member_contribution_ledger_project()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.event_type = 'contribution.confirmed' THEN
    -- A malformed event — memberId/poolId missing, OR present but not UUID-shaped — can never resolve to
    -- a real (member, pool). It is skipped rather than written as a NULL-keyed row (the
    -- `listMemberContributionHistory` malformed-row discipline) — and, deliberately, rather than blindly
    -- casting to ::uuid: a non-UUID-shaped string would raise INSIDE this AFTER-INSERT trigger and abort
    -- the whole event append, turning one malformed event into a hard outage for every writer. The format
    -- check (not just presence) is what keeps the skip a skip. RAISE WARNING makes a silently-skipped
    -- confirmation discoverable in the Postgres log rather than only via manual count reconciliation
    -- (code review, 2026-08-05).
    IF NEW.payload ->> 'memberId' IS NOT NULL AND NEW.payload ->> 'poolId' IS NOT NULL
       AND (NEW.payload ->> 'memberId') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
       AND (NEW.payload ->> 'poolId') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    THEN
      INSERT INTO member_contribution_ledger
        (confirmed_event_id, pariwar_id, member_id, pool_id, confirmed_at)
      VALUES
        (NEW.event_id, NEW.pariwar_id, (NEW.payload ->> 'memberId')::uuid,
         (NEW.payload ->> 'poolId')::uuid, NEW.occurred_at)
      ON CONFLICT (confirmed_event_id) DO NOTHING;
    ELSE
      RAISE WARNING 'member_contribution_ledger_project: skipped contribution.confirmed event_id=% (pariwar_id=%) — memberId/poolId missing or not UUID-shaped', NEW.event_id, NEW.pariwar_id;
    END IF;
  ELSIF NEW.event_type = 'reconciliation.confirmation-reversed' THEN
    -- Same malformed-vs-missing discipline as above, for the reversal's back-reference.
    IF NEW.payload ->> 'reversedConfirmedEventId' IS NOT NULL
       AND (NEW.payload ->> 'reversedConfirmedEventId') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    THEN
      -- ORDERING-INDEPENDENCE: a reversal that arrives BEFORE its confirmation updates zero rows here,
      -- and the confirmation's own INSERT below would then leave `reversed_at` NULL — so the reversal is
      -- also re-applied from the backfill's set-based pass. In the live system the confirmation always
      -- precedes its reversal (the reversal names the confirmation's event id), and the invariant test
      -- pins the converging behaviour explicitly rather than assuming it.
      UPDATE member_contribution_ledger
         SET reversed_at = NEW.occurred_at,
             reversed_by_event_id = NEW.event_id
       WHERE confirmed_event_id = (NEW.payload ->> 'reversedConfirmedEventId')::uuid
         AND pariwar_id = NEW.pariwar_id
         -- Idempotent + monotonic: the FIRST reversal wins, a replayed reversal is a no-op.
         AND reversed_at IS NULL;
    ELSE
      RAISE WARNING 'member_contribution_ledger_project: skipped reconciliation.confirmation-reversed event_id=% (pariwar_id=%) — reversedConfirmedEventId missing or not UUID-shaped', NEW.event_id, NEW.pariwar_id;
    END IF;
  END IF;
  RETURN NULL; -- AFTER trigger: return value ignored.
END;
$$;
--> statement-breakpoint
CREATE TRIGGER member_contribution_ledger_project_on_event
  AFTER INSERT ON events_log
  FOR EACH ROW
  WHEN (NEW.event_type IN ('contribution.confirmed', 'reconciliation.confirmation-reversed'))
  EXECUTE FUNCTION member_contribution_ledger_project();
--> statement-breakpoint

-- ── AC6(a): the Story 4.8 cache-epoch obligation migration 0036 wrote down, DISCHARGED here ──────────
--
-- 0036:88-90 states, in its own comment:
--   "FUTURE validity-relevant event families (claim.*, contribution.* — Epic 6/8/9 producers) MUST
--    extend this WHEN scope when they land."
-- That obligation lands with this story, and it CANNOT be discharged by widening 0036's WHEN clause:
-- that trigger keys on `member_id = NEW.stream_id`, and a `contribution.confirmed` rides the ALERT
-- stream — the stream id is the alert, not the member. So this is a SECOND trigger keyed on
-- `payload->>'memberId'` instead.
--
-- Why it matters: the 4.8 cache key is (member_id, member_state_hash, rule_registry_version,
-- cohort_epoch), and `member_state_hash` is the max event_version on the member's OWN stream — so a
-- confirmation does not shift the key at all. Without this trigger, freshness after a confirmation
-- would rest ENTIRELY on the 60s TTL. (That does still satisfy FR-12A's ≤60s freshness; this trigger
-- makes it immediate, and discharges the recorded obligation.)
--
-- ⚠ EXPLICITLY REJECTED, do not re-open: adding a payload-shape/version component to the frozen 4.8
-- cache key. Story 10.17 D5 rejected exactly that, by name, for exactly this transient.
-- ⚠ The UUID-SHAPE GUARD is as load-bearing here as in the ledger trigger above, and this arm is the
-- WIDER of the two: its WHEN clause covers FOUR event types, including `contribution.utr-attested` and
-- `contribution.reconciliation-mismatch`, whose payload contracts belong to Stories 8.4 and 9.4 rather
-- than to this one. A present-but-malformed `memberId` (an empty string after a trim, a masked id, a
-- future payload revision) would raise 22P02 INSIDE this AFTER-INSERT trigger and abort the entire
-- event append — turning one malformed event into a hard outage for every writer on four event
-- families, including the attestation path. Skip loudly, never throw (code review 2026-08-05, round 2:
-- the round-1 patch added this guard to the ledger trigger's two arms and left this sibling unguarded).
CREATE FUNCTION member_validity_cache_invalidate_contribution()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.payload ->> 'memberId' IS NOT NULL
     AND (NEW.payload ->> 'memberId') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  THEN
    DELETE FROM member_validity_cache
     WHERE member_id = (NEW.payload ->> 'memberId')::uuid
       AND pariwar_id = NEW.pariwar_id;
  ELSIF NEW.payload ->> 'memberId' IS NOT NULL THEN
    -- Present but malformed. The cache row (if any) survives and expires on the 60s TTL, so freshness
    -- degrades to the FR-12A bound rather than breaking; the append succeeds either way.
    RAISE WARNING 'member_validity_cache_invalidate_contribution: skipped % event_id=% (pariwar_id=%) — memberId present but not UUID-shaped', NEW.event_type, NEW.event_id, NEW.pariwar_id;
  END IF;
  RETURN NULL; -- AFTER trigger: return value ignored.
END;
$$;
--> statement-breakpoint
CREATE TRIGGER member_validity_cache_invalidate_on_contribution_event
  AFTER INSERT ON events_log
  FOR EACH ROW
  WHEN (NEW.event_type IN ('contribution.confirmed', 'contribution.reconciliation-mismatch', 'contribution.utr-attested', 'reconciliation.confirmation-reversed'))
  EXECUTE FUNCTION member_validity_cache_invalidate_contribution();
--> statement-breakpoint

-- ── AC8: the sentinel rename 10.11 owed forward — 'epic-8-9' → 'story-10-24' ─────────────────────────
-- The admin member-search compound read model (Story 4.7) stores the contribution sentinel as a column
-- DEFAULT (migration 0035:34). After this story, `epic-8-9` names a producer that does not exist as a
-- unit of work; `story-10-24` names the story that built it. Both the DEFAULT and the already-written
-- rows are corrected — a default-only change would leave every existing row lying.
--
-- ⚠ This re-points the LABEL only. Populating `contribution_section` with REAL facts is DEFERRED and
-- recorded in `deferred-work.md` — the admin search projection keeps its sentinel.
--
-- ⚠ The row UPDATE must arm `app.member_search_projection_writer` (migration 0035:84-99): the table
-- carries a BEFORE INSERT OR UPDATE write-rejection trigger that admits ONLY the event-replay projector
-- (Story 4.7 D1). A migration correcting a stored LABEL is a legitimate projector-class write, so it
-- arms the guard explicitly for the statement rather than being weakened — `SET LOCAL` scopes it to
-- this migration's transaction and it reverts on commit, so nothing after inherits the exemption.
ALTER TABLE "member_search_projection" ALTER COLUMN "contribution_section" SET DEFAULT '{"status":"producer_unavailable","producer":"story-10-24"}'::jsonb;--> statement-breakpoint
SET LOCAL app.member_search_projection_writer = 'on';--> statement-breakpoint
UPDATE "member_search_projection"
   SET "contribution_section" = '{"status":"producer_unavailable","producer":"story-10-24"}'::jsonb
 WHERE "contribution_section" ->> 'producer' = 'epic-8-9';--> statement-breakpoint
SET LOCAL app.member_search_projection_writer = 'off';
