-- 0114 — `pools.public_token`: the POOL'S PUBLIC ADDRESS TOKEN.
--
-- Story 11b.10 (Task 1; AC1, AC2). Governance of record: `2026-09-03-184` (Trustee-ratified) —
-- **(A)** a `live` drive SHOULD be publicly reachable, **(B)** the public address must be
-- UNGUESSABLE — as corrected and widened by `2026-09-04-185` cl.3 (all three visible states).
-- D1 (open link) / D2 (random · stored · rotatable) ruled 2026-09-04.
--
-- ── ⛔⛔ WHY A COLUMN EXISTS AT ALL: THE ADDRESS WAS COUNTABLE ──────────────────────────────────
-- `/sahyog-vivran/[…]` was addressed by `pool_canonical_identifier` — `P-YYYY-MM-###`, whose
-- `sequence` is a MONOTONIC per-(pariwar, month) counter (`-185`). ⇒ the whole surface could be
-- WALKED by counting. Since Story 11b.3a that walk reaches FOUR DECRYPTED TIER-1 BANK FIELDS,
-- rendered in FULL for every Pariwar until the Trust configures a masking window (`D8-default`
-- FAIL-OPEN, `2026-09-02-179` cl.1). `limits.search` was the only bound, and a rate limit bounds the
-- RATE of a walk, never its POSSIBILITY.
--
-- ── ⛔ AN ADDITION, ⛔ NEVER A REPLACEMENT (`-184` cl.2) ────────────────────────────────────────
-- `pool_canonical_identifier` is RETAINED, unchanged, NOT NULL, and keeps its per-Pariwar unique
-- index. Story 7.1's index, every audit line, the abuse `resource_locator` and the entire
-- operator-facing vocabulary key on it, and the public page still RENDERS it. ⛔ What it may not be
-- any more is independently ADDRESSABLE: a route accepting EITHER form has not closed the walk, it
-- has added a lock beside an open door.
--
-- ── ⛔ RANDOM, ⛔ NEVER DERIVED (D2) ───────────────────────────────────────────────────────────
-- ⛔ Not from `pool_id`, ⛔ not from the identifier, ⛔ not from any pool fact. Story 7.3's spawn
-- saga mints a DETERMINISTIC UUIDv5 `pool_id`, and "keep spawn reproducible" is exactly how the
-- guessability this story removes gets re-created. A derived token is also UNROTATABLE per drive.
-- ⭐ ROTATABILITY IS WHAT DECIDED IT, and only because D1 went the way it did: under an open-link
-- rule the sole remedy for a link that spread too far is to invalidate THAT ONE DRIVE'S address.
--
-- ── ⛔⛔ THE BACKFILL IS NOT OPTIONAL AND NOT A DETAIL ─────────────────────────────────────────
-- A VISIBLE POOL WITH A NULL TOKEN IS A DRIVE WHOSE PUBLIC PAGE 404s. ⇒ this migration fills EVERY
-- pre-existing row and THEN sets NOT NULL, in that order, in one transaction. A nullable column
-- left nullable would make the story's "zero NULL tokens" assertion a SNAPSHOT rather than a
-- structural truth — it would pass today and ship a broken archive the first time any spawn path
-- missed the mint.
--
-- ── ⚠ THE BACKFILL'S ENTROPY SOURCE, STATED RATHER THAN ASSUMED ───────────────────────────────
-- `pgcrypto` is NOT installed in this database (no migration enables it), so `gen_random_bytes` is
-- unavailable. `gen_random_uuid()` IS core PostgreSQL (13+) and draws from `pg_strong_random` — the
-- server's CSPRNG — so it is the correct source here, ⛔ not `random()`, which is a seeded PRNG and
-- would make backfilled addresses PREDICTABLE, i.e. the exact defect this migration exists to close.
-- ⭐ A v4 UUID's 32 hex characters are NOT all random: position 13 is the fixed version nibble and
-- position 17 carries the fixed variant bits. ⇒ the expression below takes ONLY fully-random hex
-- runs — 12 + 3 + 15 + 2 = 32 hex chars = 128 bits — from four independent `gen_random_uuid()`
-- calls, then renders those 16 bytes base64url (22 chars, no padding). ⛔ Do not "simplify" it to
-- `substr(gen_random_uuid()::text, 1, 22)`: that would splice the fixed nibbles into the token and
-- silently reduce its entropy.
-- ⚠ `gen_random_uuid()` is VOLATILE ⇒ it is re-evaluated PER ROW. ⛔ Do NOT rewrite this as an
-- uncorrelated scalar sub-SELECT: the planner would hoist it to an InitPlan, evaluate it ONCE, and
-- give EVERY pre-existing drive the SAME public address — which the unique index below would then
-- reject, but only after the code had shipped looking correct.
--
-- ⚠ DO NOT REGENERATE THIS FILE with `db:generate` (same discipline as 0021-0113): the drizzle
-- snapshot baseline is frozen at 0020. HAND-AUTHORED. No snapshot file. And ⛔ never re-run an
-- applied migration (42P07).
--
-- ⚠ NO NEW GRANT / RLS / POLICY STATEMENTS: this adds a column to an EXISTING table that already
-- has its privileges (0071: SELECT/INSERT/UPDATE, no DELETE), RLS enabled + FORCED, and both tenant
-- policies. ⛔ Re-declaring any of them here would be a second, drifting copy.
--
-- ⚠ THE 0071 STATE-WRITER TRIGGER IS NOT ENGAGED BY THIS COLUMN. It guards writes touching
-- `current_state` / `state_event_version` and its own header states that "writes touching NEITHER
-- column are unaffected" ⇒ the backfill below and every later ROTATION are ordinary UPDATEs and
-- need ⛔ no `app.pool_state_writer` guard. ⛔ Do not add one — it would falsely imply this column
-- is part of the replay-derived state cache. It is not: it is an ADDRESS, written once at spawn and
-- changed only by an explicit rotation.

-- (1) Add it NULLABLE — there is no honest DEFAULT for a per-row random value, and a constant
--     default would give every row the same address.
ALTER TABLE "pools" ADD COLUMN "public_token" text;--> statement-breakpoint

-- (2) BACKFILL EVERY EXISTING ROW. See the header for the entropy source and the InitPlan trap.
UPDATE "pools" SET "public_token" = rtrim(
  translate(
    encode(
      decode(
           substr(replace(gen_random_uuid()::text, '-', ''),  1, 12)
        || substr(replace(gen_random_uuid()::text, '-', ''), 14,  3)
        || substr(replace(gen_random_uuid()::text, '-', ''), 18, 15)
        || substr(replace(gen_random_uuid()::text, '-', ''),  1,  2),
        'hex'
      ),
      'base64'
    ),
    '+/', '-_'
  ),
  '='
) WHERE "public_token" IS NULL;--> statement-breakpoint

-- (3) ⛔ ONLY NOW is NOT NULL structural rather than aspirational.
ALTER TABLE "pools" ALTER COLUMN "public_token" SET NOT NULL;--> statement-breakpoint

-- (4) The public-address lookup key + the mint-collision guard. GLOBAL, ⛔ deliberately NOT scoped
--     by `pariwar_id` (unlike `pools_pariwar_canonical_identifier_uq`): an ADDRESS must name at most
--     ONE thing without a second value to disambiguate it. It is also what makes a colliding mint
--     fail LOUDLY (23505) instead of silently re-pointing one drive's public address at another's.
CREATE UNIQUE INDEX "pools_public_token_uq" ON "pools" USING btree ("public_token");
