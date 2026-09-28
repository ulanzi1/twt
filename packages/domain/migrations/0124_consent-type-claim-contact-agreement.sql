-- Migration 0124 — consent_type ADD VALUE 'claim_contact_agreement' (Story 6.19a, Task 1; AC1; shared spec D15, as
-- committed in `2026-09-28-265`).
-- The filer's agreement that the people named on a claim's contact record may be contacted by SMS and by post
-- (`2026-09-27-253` cl.1 — *"The filer confirms — in the form"*). Recorded in `consent_records` (subject = the
-- deceased member) in the SAME transaction as the claim's contact row, which carries its `agreement_consent_id`:
-- ⭐ the agreement is PER CLAIM and is read ONLY through that column, ⛔ never by subject (a refiled claim for the
-- same death gives it again — `2026-09-28-261` C3).
-- ⛔ Added to the pgEnum and `@twt/contracts`' `ConsentTypeSchema` ONLY — ⛔ not to `DpdpaConsentType` and ⛔ not
-- to `CLAIM_TIME_CONSENT_TYPES` (a shipped DPDPA surface; an exact-pinned tuple). ⛔ Not revocable in v1.
--
-- ⚠ Its OWN file (the 0040 / 0048 / 0112 precedent): a newly-added enum value cannot be USED in the transaction
-- that adds it. Nothing here uses it — rows are written at RUNTIME by the 6.19a contact routes. `IF NOT EXISTS`
-- makes it re-apply-safe. ⚠ Hand-authored; ⛔ never regenerate (the journal `when`, not the SQL, decides what
-- runs). ⛔ Never reset via DROP SCHEMA (it strips twt_app USAGE).

ALTER TYPE "consent_type" ADD VALUE IF NOT EXISTS 'claim_contact_agreement';
