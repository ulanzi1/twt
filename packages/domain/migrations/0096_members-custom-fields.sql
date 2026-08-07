-- Migration 0096 — members.custom_fields + the repo's FIRST GIN index (Story 10.12, Task 5; AC6).
--
-- ⚠ DO NOT REGENERATE with `db:generate` (the discipline from 0021 onward): the drizzle snapshot
-- baseline is frozen at 0020_snapshot.json, so a regenerate diffs CURRENT schema against 0020, wrongly
-- re-emits applied migrations and can raise 42P07. HAND-AUTHORED. No snapshot emitted.
--
-- ⚠ DO NOT EDIT ONCE APPLIED. drizzle-kit skips by journal `when`, not by SQL hash — an in-place edit
-- silently never runs. Add a new migration.
--
-- ── §1.8 ONLINE-MIGRATION RULE — `members` IS NAMED THERE AS A HOT TABLE ───────────────────────────
-- Add-defaulted only; NO blocking backfill and no NOT NULL retro-fit pass. On PostgreSQL 11+ an
-- `ADD COLUMN … NOT NULL DEFAULT <constant>` records the default in the catalog and does NOT rewrite
-- the table, so this is a fast metadata-only operation even on a large members table. The default is
-- the SMALLEST valid value (`'{}'`), not the full envelope, for the same reason.
--
-- ── ⭐ NO PROJECTOR GUARD, AND THAT IS CORRECT ─────────────────────────────────────────────────────
-- The migration-0018 `app.member_state_writer` trigger fires ONLY when `state` / `state_event_version`
-- change. A custom-fields write touches neither, so it needs no guard, no session variable and no
-- `member-state-invariant` allowlist entry. `lock_in_days_at_join` (migration for Story 3.6b) is the
-- exact precedent: a plain scoped non-`state` UPDATE. Extending the 0018 trigger to cover this column
-- would put a session variable in the path of every custom-field write to protect an invariant that
-- write cannot violate.

ALTER TABLE "members"
  ADD COLUMN "custom_fields" jsonb DEFAULT '{}'::jsonb NOT NULL;--> statement-breakpoint

-- The app-layer shape rule, mirrored in the DB (migration 0088's doctrine: "an app-layer rule with no
-- DB mirror is a rule that holds only for the callers who happen to go through the app layer"). The
-- envelope is an OBJECT; a bare array or scalar would make every reader's `-> 'values'` return NULL
-- and silently blank a member's custom fields rather than failing.
ALTER TABLE "members"
  ADD CONSTRAINT "members_custom_fields_object_ck"
  CHECK (jsonb_typeof("custom_fields") = 'object');--> statement-breakpoint

-- ─────────────────────────────────────────────────────────────────────────────────────────────────
-- ⚠ THE FIRST GIN INDEX IN THIS REPOSITORY.
--
-- Before this line, `grep -rn "USING gin"` across packages/domain/migrations/*.sql and
-- packages/domain/src/schema/*.ts returned NOTHING. Everything here is btree. That makes the operator
-- characteristics below unfamiliar territory for this codebase, so they are written out rather than
-- assumed.
--
-- ── jsonb_ops vs jsonb_path_ops — the choice, and why ─────────────────────────────────────────────
-- DEFAULT `jsonb_ops` is used deliberately. `jsonb_path_ops` produces a SMALLER, FASTER index but
-- supports ONLY the containment operator `@>`. Architecture §1.7 asks for "arbitrary path queries",
-- and an admin filtering members by custom field needs key-EXISTENCE too (`?`, `?|`, `?&`) — which
-- `jsonb_path_ops` cannot serve at all. It would not be slower; the planner would simply ignore the
-- index and seq-scan `members`, which is the worst of both outcomes: index write cost paid, no read
-- benefit, and nothing in the schema saying why.
--
-- ── The size tradeoff, stated ─────────────────────────────────────────────────────────────────────
-- `jsonb_ops` indexes every KEY and every VALUE as separate entries, so index size scales with the
-- number of distinct key/value pairs across all members, not with row count. For an 8 KiB payload
-- ceiling (CUSTOM_FIELDS_MAX_PAYLOAD_BYTES) and a 32-definition cardinality bound
-- (CUSTOM_FIELD_DEFINITIONS_MAX_PER_PARIWAR), that is bounded by construction — those two limits are
-- what keep this index's growth predictable, which is the real reason they exist.
-- `CUSTOM_FIELDS_GIN_INDEX_BUDGET_BYTES` (256 MiB per Pariwar) is the alarm threshold; it is an
-- OBSERVED signal read from `pg_relation_size` (`ginIndexBytes()` in custom-fields/member-write.ts —
-- [Review][Patch] this comment previously named a nonexistent `custom-fields/gin-budget.ts`), never a
-- write-time check — §1.7's "write-rate limit when approached" is NOT built (recorded as ESCALATION 3).
--
-- ⚠ NOT CONCURRENTLY: drizzle-kit runs each migration statement inside a transaction, and
-- `CREATE INDEX CONCURRENTLY` cannot run in one (25001). On an empty/new column this is a fast build.
-- A production deploy against a large existing members table should build this index out-of-band with
-- CONCURRENTLY first, after which this statement is a no-op-equivalent conflict to resolve manually —
-- recorded here rather than discovered during a deploy.
CREATE INDEX "members_custom_fields_gin_idx" ON "members" USING gin ("custom_fields");
