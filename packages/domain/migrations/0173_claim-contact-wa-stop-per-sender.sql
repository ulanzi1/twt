-- Migration 0173 — widen the STOP replay identity to the sender (Story 6.37d code review, R1, 2026-10-20). Hand-authored — ⛔
-- never regenerate (`db:generate` diffs against the 0020 snapshot; the migrator skips by the journal `when`). ⛔ DROP SCHEMA. A
-- FORWARD migration — ⛔ an edit of 0172 (applied — [[project_live_db_test_gotchas]]).
--
-- `claim_contact_wa_stops_event_uq` was `UNIQUE (pariwar_id, inbound_event_id)`. A single Meta webhook payload can batch
-- inbound messages from SEVERAL senders under one `inbound_event_id`; the worker's STOP recorder (`recordClaimContactWaStop`)
-- passes that SAME event id for every sender it sees. With the narrower constraint, the second sender's STOP collided with the
-- first's row and was silently treated as an already-recorded replay — that number never got its STOP. The recipient's own
-- `recipient_number_hash` joins the identity; a TRUE replay of the same event + same sender still dedups (⛔ a second stop), a
-- batched payload's distinct senders no longer collide.
--
-- ⚠ Checked BEFORE this file: no existing row can violate the WIDER constraint (adding a column to a UNIQUE key only relaxes
-- it); `claim_contact_wa_stops` is append-only (SELECT, INSERT only to twt_app) so there is no UPDATE path to audit here.

ALTER TABLE "claim_contact_wa_stops" DROP CONSTRAINT "claim_contact_wa_stops_event_uq";--> statement-breakpoint
ALTER TABLE "claim_contact_wa_stops" ADD CONSTRAINT "claim_contact_wa_stops_event_uq" UNIQUE ("pariwar_id", "inbound_event_id", "recipient_number_hash");
