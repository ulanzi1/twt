-- Migration 0174 — bind the claim's agreement to WHO it was given by (Story 6.37d code review, R3, 2026-10-20). Hand-authored
-- — ⛔ never regenerate (`db:generate` diffs against the 0020 snapshot; the migrator skips by the journal `when`). ⛔ DROP
-- SCHEMA. A FORWARD migration — ⛔ an edit of 0125 or any migration before it (applied —
-- [[project_live_db_test_gotchas]]).
--
-- `claim_contacts.agreement_consent_id` is PER CLAIM, ⛔ per claimant: the claimant side (W6) can be swapped onto a
-- different nominee or a different block — in a FULL (non-add-only) write, WITHOUT a fresh `agreed` tick (W8 only records a
-- fresh agreement when the write carries `agreed: true`). The WhatsApp basis reader (`claim-contact-whatsapp-basis.ts`) read
-- only "is there a live, WhatsApp-naming agreement on the claim" — so a replacement claimant inherited the FORMER
-- claimant's explicit affirmative agreement.
--
-- `claimant_generation` bumps by ONE on every write that sets the claimant side (W6's `writeSide`) — a nominee swap or a
-- block-content change alike (two different claimant BLOCKs never differ by "kind", only by content, so the generation is
-- the only signal that survives a block→block replacement). `agreement_claimant_generation` is stamped to the claimant
-- generation CURRENT AT THAT SAME WRITE whenever a fresh agreement is recorded (W8's `recordFresh`). The two numbers equal
-- ⇒ the live agreement covers the current claimant; behind ⇒ it does not, and the WhatsApp basis fails until a fresh
-- affirmative agreement catches it up. Both default to 1 (every existing row's agreement was given by its own, one and only,
-- claimant so far — the backfill is exact, ⛔ a guess).
--
-- ⚠ Checked BEFORE this file: `claim_contacts` already grants `twt_app` unrestricted UPDATE (0125) — no new GRANT; no
-- existing row can fail either CHECK (both default to 1, 1 <= 1).

ALTER TABLE "claim_contacts" ADD COLUMN "claimant_generation" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "claim_contacts" ADD COLUMN "agreement_claimant_generation" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "claim_contacts" ADD CONSTRAINT "claim_contacts_claimant_generation_check" CHECK ("claimant_generation" >= 1);--> statement-breakpoint
ALTER TABLE "claim_contacts" ADD CONSTRAINT "claim_contacts_agreement_claimant_generation_check" CHECK ("agreement_claimant_generation" >= 1 AND "agreement_claimant_generation" <= "claimant_generation");
