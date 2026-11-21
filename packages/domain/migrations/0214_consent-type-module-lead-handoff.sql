-- Migration 0214 — consent_type ADD VALUE 'module_lead_handoff' (Story 12.5, Task 1.1; AC1; Decision `2026-11-21-483` QE2 (A)).
-- The member's agreement that the details they confirmed on a partner offer's form may be passed to that partner — ONE consent
-- per lead: `consent_artifact_ref` = the lead's `lead_id`, and `marketplace_lead_handoffs.consent_id` (migration 0215) names
-- the row. ⭐ Read ONLY through that column and the artifact ref, ⛔ never by subject (the `claim_contact_agreement` precedent,
-- `-261` C3): a per-subject check would let one offer's consent keep another offer's lead alive (G6).
-- ⚠ `-483` QE2 (A) AMENDS `2026-10-31-427` QE10 ("is 12.3's to add"): 12.5 mints the value so its consent leg is typed and
-- tested; 12.5 writes ⛔ row of it (its tests do). The writer is 12.3's lead route (K-1).
--
-- ⚠ Its OWN file (the 0048 / 0124 precedent): drizzle's migrator applies every pending file in ONE transaction, and a value added
-- in a transaction cannot be USED until it commits (55P04) — so 0215 never names the literal (TR1). `IF NOT EXISTS` makes it
-- re-apply-safe. Hand-authored; ⛔ never regenerate (the journal `when`, not the SQL, decides what runs). ⛔ Never reset via
-- DROP SCHEMA (it strips twt_app USAGE).

ALTER TYPE "consent_type" ADD VALUE IF NOT EXISTS 'module_lead_handoff';
