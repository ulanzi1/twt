-- Story 5.11b AP-P2: bounded reminder jobs must read only their members' acted events.
-- Hand-authored; preserve the frozen 0020 snapshot baseline. No grant or RLS-policy change.
-- JSON extraction is not leakproof, so RLS keeps JSON expression comparisons out of index conditions.
-- Generated text columns allow normal indexed text equality under twt_app without bypassing RLS.
-- Reversals are selected by referenced confirmation, not declared member. Generated values cannot be forged.
-- Adding stored generated columns rewrites the event table and takes an ACCESS EXCLUSIVE lock; deploy in a maintenance
-- window sized for events_log. All three are NULL outside contribution event types; no independent projection writer.
ALTER TABLE "events_log"
  ADD COLUMN "contribution_pool_id" text GENERATED ALWAYS AS
    (CASE WHEN event_type IN ('contribution.confirmed', 'contribution.utr-attested', 'reconciliation.confirmation-reversed') THEN payload ->> 'poolId' END) STORED,
  ADD COLUMN "contribution_member_id" text GENERATED ALWAYS AS
    (CASE WHEN event_type IN ('contribution.confirmed', 'contribution.utr-attested') THEN payload ->> 'memberId' END) STORED,
  ADD COLUMN "contribution_reversed_event_id" text GENERATED ALWAYS AS
    (CASE WHEN event_type = 'reconciliation.confirmation-reversed' THEN payload ->> 'reversedConfirmedEventId' END) STORED;
--> statement-breakpoint
CREATE INDEX "contribution_acted_pool_member_idx"
  ON "events_log" ("pariwar_id", "contribution_pool_id", "contribution_member_id")
  WHERE event_type IN ('contribution.confirmed', 'contribution.utr-attested');
--> statement-breakpoint
CREATE INDEX "contribution_reversed_pool_reference_idx"
  ON "events_log" ("pariwar_id", "contribution_pool_id", "contribution_reversed_event_id")
  WHERE event_type = 'reconciliation.confirmation-reversed';
