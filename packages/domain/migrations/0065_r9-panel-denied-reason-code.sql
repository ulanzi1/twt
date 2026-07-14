-- Migration 0065 — add the `r9_panel_denied` value to the state_trustee_reason_code enum (Story 6.14 code
-- review, 2026-07-14; AC0/AC4/D-F).
--
-- `finalizeR9Outcome` (r9-voting-persist.ts) writes a `claim_state_trustee_decisions` `phase='r9_outcome'`
-- row on EVERY finalize, including a panel DENIAL. Every other trustee-decision writer (`decide` /
-- `routeToR9` / `voteOnFrozenClaim`) enforces the D-F "reason code required for denied/routed_to_r9" rule
-- via `assertReasonCode`; the R9 finalize writer originally hardcoded `reasonCode: null` regardless of
-- outcome, silently bypassing that invariant. `r9_panel_denied` is a NEW reason code — distinct from the
-- deny-family codes (those are a single trustee's administrative-review grounds; this is a PANEL VOTE
-- outcome, and the per-voter rationale already lives on each `claim_r9_votes` row, AC3) — added here so the
-- finalize writer can supply a valid, bounded reason code on a denied outcome instead of `null`.
--
-- ⚠ A SEPARATE migration (NOT folded into 0063/0064): both were already applied, and a hand-authored
-- migration is never re-edited after apply (the drizzle journal skips by `when`, not SQL hash —
-- [[project_live_db_test_gotchas]]). ALTER TYPE ... ADD VALUE is permitted inside the migrator's transaction
-- (PG 12+) BECAUSE the new value is only ADDED here, never USED in the same transaction. `IF NOT EXISTS`
-- keeps a re-run a no-op.

ALTER TYPE "public"."state_trustee_reason_code" ADD VALUE IF NOT EXISTS 'r9_panel_denied';
