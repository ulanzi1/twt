-- Migration 0044 — member_wa_opt_in: DB-enforced one-outstanding-PENDING-per-member (code review follow-up,
-- Story 5.4 review 2026-07-06). createPendingOptIn's "reject a second PENDING for this member" guard was
-- app-level only (a SELECT before the INSERT) — two concurrent mint requests for the same member could both
-- pass the guard and insert two live PENDING rows with distinct phrases. Mirrors the verification-phrase
-- partial-unique-index backstop (migration 0042, member_wa_opt_in_pending_phrase_uq) — same discipline, this
-- time keyed on member instead of phrase. PARTIAL (WHERE state='PENDING') so a member can accumulate multiple
-- terminal/historical rows; only one PENDING may exist at a time.
--
-- ⚠ DO NOT REGENERATE THIS FILE with `db:generate` (mirrors 0042's own warning — hand-authored partial index;
-- drizzle-kit does not express partial unique indexes in the schema DSL, so this is SQL-only, not reflected
-- in member_wa_opt_in.ts).

CREATE UNIQUE INDEX "member_wa_opt_in_pending_member_uq" ON "member_wa_opt_in" ("pariwar_id", "member_id") WHERE "state" = 'PENDING';
