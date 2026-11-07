-- Migration 0204 — `field_workers_state_reason_subset` admits `died` on a TERMINATED row (Story 13.1c, Task 2.0; AD11, TR12;
-- decision `2026-11-07-455`). The constraint is DROPPED and re-ADDED under the SAME name (the policy-regression spec lists the
-- CHECK names): the suspended arm is unchanged; the terminated arm gains `died` and compares `state_reason_code::text` — 0203's
-- value cannot be named as an enum literal in the migrator's one transaction. Every existing row holds one of the old values, so
-- the re-added CHECK validates. ⚠ Story 13.6 REPLACES this CHECK again when it adds the labelling values.
-- Hand-authored — ⛔ never regenerate.

ALTER TABLE "field_workers" DROP CONSTRAINT "field_workers_state_reason_subset";--> statement-breakpoint
ALTER TABLE "field_workers" ADD CONSTRAINT "field_workers_state_reason_subset" CHECK (("current_state" <> 'suspended' OR "state_reason_code" IN ('under_review', 'at_worker_request')) AND ("current_state" <> 'terminated' OR "state_reason_code"::text IN ('left_voluntarily', 'inactive', 'registered_in_error', 'died')));
