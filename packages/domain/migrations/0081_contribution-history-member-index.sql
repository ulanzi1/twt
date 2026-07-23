-- Migration 0081 — contribution-history member-scoped supporting index (Story 8.6, Task 1).
--
-- Story 8.6's Yogdaan Bahi lists a member's OWN attested contributions: the read filters
-- `event_type = 'contribution.utr-attested'` AND `payload->>'memberId' = <caller>` scoped to the
-- Pariwar. This is a NEW query-by-`payload->>'memberId'` access pattern — every prior contribution
-- read scopes by `stream_id = alertId` (`hasAttestedContribution`) or `payload->>'poolId'`
-- (`listConfirmedContributorsForPool`); the only existing JSONB-payload index was the partial unique
-- index on `payload->>'tr'` (migration 0079). Without a supporting index a member-history read is a
-- full-tenant sequential scan of `events_log` filtered in-memory, which degrades as the event log
-- grows. This partial expression index makes the member-scoped lookup selective.
--
-- ⚠ DO NOT REGENERATE THIS FILE with `db:generate` (same discipline as 0021–0080). The drizzle
-- snapshot baseline is frozen at 0020; a regenerate emits a bloated catch-up migration and drizzle-kit
-- skips an already-applied migration by journal `when` (NOT by SQL hash), so a regenerate-after-apply
-- silently drops hand-supplements and can raise 42P07. This file is HAND-AUTHORED: it carries ONLY the
-- one index.
--
-- The index is a Drizzle EXPRESSION/PARTIAL index (`(payload->>'memberId')` WHERE event_type = …);
-- drizzle-kit does not model JSONB-expression partial indexes, so it is hand-authored here rather than
-- declared on the events_log Drizzle table (schema/events_log.ts documents the constraint name in a
-- comment for sync). No new GRANT (events_log already grants SELECT to twt_app, migration 0001) and no
-- snapshot file (baseline frozen at 0020; mirror 0021–0080).

CREATE INDEX "contribution_utr_attested_member_idx"
	ON "events_log" ("pariwar_id", (payload ->> 'memberId'))
	WHERE event_type = 'contribution.utr-attested';
