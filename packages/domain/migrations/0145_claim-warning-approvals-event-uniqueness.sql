-- Migration 0145 — ONE RECORD PER APPROVAL EVENT (Story 6.23b code review, 2026-10-06; decision-needed #2). Hand-authored
-- — ⛔ never regenerate.
--
-- 0144 added three nullable FK columns to `claim_warning_approvals` (`trustee_decision_id`, `r9_vote_id`,
-- `closure_id`) but no uniqueness on them, so nothing stopped two rows from pointing at the SAME decision / vote /
-- closure event. Every current writer (verifier-decision-persist.ts, state-trustee-decision-persist.ts,
-- correction-closure.ts, r9-voting-persist.ts) inserts the record in the SAME transaction as, and immediately after,
-- the decision/vote/closure row it points at — each of those parent rows is freshly created once per approval action,
-- so its id is never reused across approval events. A plain UNIQUE constraint on each column is therefore safe (and
-- correct): Postgres never considers two NULLs equal, so rows for steps that don't use a given column (e.g. the
-- District Admin's two steps, which set none of the three) never collide on it.
--
-- `readR9VoteWarningCoverage` (approval-warnings.ts) already defensively unions keys across rows for the same vote id
-- via a `Set`, as if anticipating duplicates — this migration makes that defense unnecessary rather than removing it.

ALTER TABLE "claim_warning_approvals" ADD CONSTRAINT "claim_warning_approvals_trustee_decision_uq" UNIQUE ("trustee_decision_id");--> statement-breakpoint
ALTER TABLE "claim_warning_approvals" ADD CONSTRAINT "claim_warning_approvals_r9_vote_uq" UNIQUE ("r9_vote_id");--> statement-breakpoint
ALTER TABLE "claim_warning_approvals" ADD CONSTRAINT "claim_warning_approvals_closure_uq" UNIQUE ("closure_id");
