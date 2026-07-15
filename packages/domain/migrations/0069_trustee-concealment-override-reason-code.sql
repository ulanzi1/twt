-- Migration 0069 — add the `concealment_override` value to the state_trustee_reason_code enum (Story 6.15,
-- Task 1/Task 7; AC2/AC3).
--
-- The State Trustee (Story 6.13, the SOLE concealment-decision authority — D-B) decides a concealment-flagged
-- claim in BOTH directions on the cycle-freeze surface: UPHOLD → deny (`concealment_upheld`, already exists,
-- migration 0063 baseline) or OVERRIDE → approve. An override APPROVES with a mandatory free-text rationale;
-- `concealment_override` is a NEW trustee-owned reason code valid for `approved` (see
-- TRUSTEE_REASON_CODE_OUTCOME_COMPAT: `concealment_override: ['approved']`). It is the ONLY code pinned to
-- `approved` — an ordinary approve still requires NO reason code (the D-F presence rule is unchanged:
-- `trusteeReasonCodeRequiredForOutcome('approved')` stays false). Scoped to the trustee enum ONLY (D-B — no
-- verifier / R9 code, no R14 resolution metadata on the R9 path).
--
-- ⚠ A SEPARATE migration (NOT folded into 0068): 0068 CREATEs / ALTERs the concealment tables + column but
-- must not also ADD VALUE to an enum it (or a later statement) then USES — ALTER TYPE ... ADD VALUE is never
-- mixed with usage (the 6.14 0064/0065 lesson; [[project_live_db_test_gotchas]] — a hand-authored migration
-- is never re-edited after apply, and the journal skips by `when`, not SQL hash). ADD VALUE is permitted
-- inside the migrator's transaction (PG 12+) BECAUSE the new value is only ADDED here, never USED in the same
-- transaction. `IF NOT EXISTS` keeps a re-run a no-op.

ALTER TYPE "public"."state_trustee_reason_code" ADD VALUE IF NOT EXISTS 'concealment_override';
