-- Migration 0177 — member_wa_opt_in: a member's WhatsApp yes lasts until withdrawn (Story 5.12; Decision 2026-10-19-364,
-- option A, Trustee-ratified; build decision LY4 in Decision 2026-10-21-373). Two database backstops, SQL-only (like 0044's):
--   (i)  `member_wa_opt_in_no_active_expiry` — a BEFORE UPDATE trigger that REFUSES any move INTO `EXPIRED_24H_WINDOW` from a
--        state other than PENDING. An ACTIVE yes never expires (the 24-hour sweep half is deleted in code); REVOKED / BLOCKED_BY_META
--        are terminal and never move again. An update that leaves an EXPIRED row EXPIRED (e.g. a future erasure scrub of a
--        non-state column) passes — the guard fires only when the state CHANGES. RAISE-only ⇒ ⛔ SECURITY DEFINER needed, and
--        RLS (ENABLE + FORCE) is irrelevant to it. INSERTs are untouched (the trigger is UPDATE-only).
--   (ii) `member_wa_opt_in_active_member_uq` — a partial UNIQUE (pariwar_id, member_id) WHERE state = 'ACTIVE': at most ONE
--        standing yes per member, so "the newest row" and "any ACTIVE row" agree (the mint refuses on either). Two ACTIVE rows
--        for one member are ⛔ reachable through the code (a mint needs the newest row ⛔ ACTIVE; activation needs a PENDING; one
--        PENDING per member — 0044) — only hand-seeded data could fail this index, and a failure is a FINDING, ⛔ to be papered over.
-- Idempotent (CREATE OR REPLACE FUNCTION, DROP TRIGGER IF EXISTS / CREATE TRIGGER, CREATE UNIQUE INDEX IF NOT EXISTS) — shown by
-- `psql -f` twice after `db:migrate` (the migrator skips an applied file).
--
-- ⚠ DO NOT REGENERATE THIS FILE with `db:generate` (hand-authored; drizzle-kit expresses neither a trigger nor this partial
-- index — both are named in a comment in schema/member_wa_opt_in.ts). DO NOT reset via DROP SCHEMA (strips twt_app USAGE).

CREATE OR REPLACE FUNCTION member_wa_opt_in_no_active_expiry()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.state = 'EXPIRED_24H_WINDOW' AND OLD.state IS DISTINCT FROM NEW.state AND OLD.state <> 'PENDING' THEN
    RAISE EXCEPTION
      'member_wa_opt_in: % → EXPIRED_24H_WINDOW is refused — a WhatsApp yes lasts until withdrawn; only a PENDING request expires (Story 5.12, Decision 2026-10-19-364)', OLD.state
      USING ERRCODE = 'integrity_constraint_violation';
  END IF;
  RETURN NEW;
END;
$$;--> statement-breakpoint
DROP TRIGGER IF EXISTS member_wa_opt_in_no_active_expiry ON "member_wa_opt_in";--> statement-breakpoint
CREATE TRIGGER member_wa_opt_in_no_active_expiry
  BEFORE UPDATE ON "member_wa_opt_in"
  FOR EACH ROW EXECUTE FUNCTION member_wa_opt_in_no_active_expiry();--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "member_wa_opt_in_active_member_uq" ON "member_wa_opt_in" ("pariwar_id", "member_id") WHERE "state" = 'ACTIVE';
