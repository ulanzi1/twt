-- Migration 0079 — contribution.utr-attested per-`tr` idempotency guard (Story 8.4, Task 1).
--
-- The FIRST Epic-8 WRITE landing: the yellow-pill UTR self-attestation. This adds the DB backstop for
-- the FR-17 "one valid contribution per (member, alert)" guarantee — a PARTIAL UNIQUE index on the
-- deterministic `tr` (`deriveContributionReference({ memberId, alertId })`, Story 7.7) carried in the
-- `contribution.utr-attested` event payload. A re-paste / concurrent retry for the same (member, alert)
-- yields the SAME `tr` → this index rejects the duplicate (23505) → the write primitive treats it as an
-- idempotent no-op (packages/domain/src/contribution/write.ts). `tr` is a version-pinned hash of
-- (member_id, alert_id), so it is GLOBALLY unique per pair — a global partial index is exact, and two
-- distinct (member, alert) pairs never collide.
--
-- ⚠ DO NOT REGENERATE THIS FILE with `db:generate` (same discipline as 0021–0078). The drizzle snapshot
-- baseline is frozen at 0020; a regenerate emits a bloated catch-up migration and drizzle-kit skips an
-- already-applied migration by journal `when` (NOT by SQL hash), so a regenerate-after-apply silently
-- drops hand-supplements and can raise 42P07. This file is HAND-AUTHORED: it carries ONLY the one index.
--
-- The index is a Drizzle EXPRESSION/PARTIAL index (`(payload->>'tr')` WHERE event_type = …); drizzle-kit
-- does not model JSONB-expression partial indexes, so it is hand-authored here rather than declared on the
-- events_log Drizzle table (schema/events_log.ts documents the constraint name in a comment for sync). No
-- new GRANT (events_log already grants INSERT to twt_app, migration 0001) and no snapshot file (baseline
-- frozen at 0020; mirror 0021–0078).

CREATE UNIQUE INDEX "contribution_utr_attested_tr_uq"
	ON "events_log" ((payload ->> 'tr'))
	WHERE event_type = 'contribution.utr-attested';
