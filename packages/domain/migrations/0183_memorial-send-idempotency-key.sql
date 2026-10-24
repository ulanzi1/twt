-- Migration 0183 — THE MEMORIAL SEND'S IDEMPOTENCY KEY LIVES ON THE SUBMISSION ROW (Story 11b.4, the Y-server round —
-- BigDev 2026-10-24 "Key on the row"; review R31 (a) / W14). Hand-authored — ⛔ never regenerate (`db:generate` diffs
-- against the 0020 snapshot; the migrator skips by the journal `when`). Idempotent: `psql -f` twice succeeds
-- (`ADD COLUMN IF NOT EXISTS`, the CHECK in a `duplicate_object` guard, `CREATE UNIQUE INDEX IF NOT EXISTS`).
--
-- Until now the Send's `Idempotency-Key` was claimed in the shared keyed store (`idempotency_keys`) for 300 s: past that a
-- key the phone kept read as expired and a retry inserted a SECOND version, and a crash between the COMMIT and
-- `recordResult` left the claim pending (a same-key retry answered `409 memorial.idempotency_in_progress`). Now the key is a
-- column of the version itself, written in the SAME transaction as the insert, under the pool's advisory lock:
--   · a retry with the same key finds the row and replays it — at ANY age (⛔ TTL);
--   · a crash rolls the key back WITH the row — ⛔ nothing is ever left pending;
--   · a concurrent duplicate waits on `pg_advisory_xact_lock(hashtext('memorial:' || pool_id))`, then finds the row and
--     replays; the UNIQUE index below is the BACKSTOP an unlocked insert can reach (Trap 12 — 23505 ⇒ re-read and replay).
--
-- `idempotency_key` is NULL for every row written before this migration (⛔ backfill: the old keys lived only in the keyed
-- store and are not recoverable). The writer always supplies it from now on. It is not PII (a random client-minted id), so
-- the RTBF scrub leaves it alone; and it is not a ciphertext column, so the CHECK is safe on the scrub's UPDATE (the key
-- never changes).
--
-- Grants: the table-level `GRANT SELECT, INSERT ... TO twt_app` (0182) already covers a new column — a table privilege
-- applies to every column, present and future. ⛔ No UPDATE grant: the column-level `GRANT UPDATE (body_ciphertext,
-- alt_text_ciphertext)` stays the ONLY update path (MA15), so the key is immutable once written. RLS is unchanged (the
-- policies are row predicates on `pariwar_id`).

ALTER TABLE "memorial_submissions" ADD COLUMN IF NOT EXISTS "idempotency_key" text;--> statement-breakpoint
-- The shape the Send handler admits (`MEMORIAL_SEND_IDEMPOTENCY_KEY_PATTERN`, `memorial/vocab.ts` — ⚠ LOCKSTEP): 1–128
-- characters of `[A-Za-z0-9_-]` (a UUID, a ULID, a nanoid). Non-empty by the `{1,128}` bound; NULL only for older rows.
DO $$ BEGIN
  ALTER TABLE "memorial_submissions" ADD CONSTRAINT "memorial_submissions_idempotency_key_check"
    CHECK (idempotency_key IS NULL OR idempotency_key ~ '^[A-Za-z0-9_-]{1,128}$');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;--> statement-breakpoint
-- ONE version per (pool, key): the replay's lookup and the backstop. Partial — the pre-0183 rows (NULL) never collide.
CREATE UNIQUE INDEX IF NOT EXISTS "memorial_submissions_pool_idempotency_key_uq" ON "memorial_submissions" USING btree ("pool_id", "idempotency_key") WHERE idempotency_key IS NOT NULL;
