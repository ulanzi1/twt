-- Migration 0213 — a death certificate's `claim_documents` row is never deleted on its own (Story 6.22b, Task 1.1;
-- DL5 A; author-commit `2026-11-02-440`). After 0212.
--
-- `2026-09-25-243` cl. 2 (Trustee-ratified, option C): every death certificate is kept for as long as claim records
-- are kept — "Nothing is deleted at closure". Until now that held only because no code path deletes the row:
--   · `claim_documents` had NO trigger (0053: "NO … write-rejection trigger") and `twt_app` has no DELETE grant on it,
--     so a superuser, a migration or an owner-role job could still delete the row;
--   · the row carries the certificate's OCR ciphertexts (`-243` Consequence 2 keeps them), and
--     `claim_death_certificate_uploads_claim_document_id_fk` is `ON DELETE cascade` (0122) — so deleting the row either
--     CASCADES into every kept upload, each upload's reviews (0122) and each review's membership checks (0212), or
--     ABORTS when a ground inspection names an upload (0147 / 0148 — both NO ACTION).
-- 0122's header sentence "The ONLY rows that ever go are the `ON DELETE cascade` from `claims` OR `claim_documents`" is
-- narrowed by this guard: a certificate's row now goes only with its CLAIM, so the uploads do too. (0122 is an applied
-- migration and is ⛔ edited; the schema headers carry the correction.)
--
-- ── The guard ────────────────────────────────────────────────────────────────────────────────────────────────────────
-- A `BEFORE DELETE` ROW trigger. It refuses deleting a row whose `document_type` is `death_certificate`, for EVERY role
-- (the table owner and a superuser included), with SQLSTATE 23000 — the 0122 / 0197 / 0212 guards' code, so its MESSAGE
-- is what identifies it. Two things pass:
--   · any other document type (`ground_inspection_photo`, `hospital_record`) — `-243` rules on certificates only;
--   · a delete issued from inside another trigger (`pg_trigger_depth() > 1`) — the `ON DELETE cascade` from `claims`,
--     which the RI trigger runs. This is the house's cascade exception (0119, 0122, 0142–0144, 0149, 0160, 0197, 0212);
--     it admits ANY trigger-issued delete, the accepted residual of that pattern.
-- ⛔ DELETE only — ⛔ UPDATE, ⛔ TRUNCATE:
--   · the OCR job upserts this row (`insert … on conflict do update`) and moves its key forward on a replacement; a
--     guard on UPDATE would break both;
--   · TRUNCATE is already refused one step removed: the uploads FK forces `TRUNCATE claim_documents CASCADE`, and
--     `claim_death_certificate_uploads_no_truncate` (0122) raises 23000.
-- No grant changes: `twt_app` still has no DELETE on `claim_documents` (0053) — for it the guard is the second wall.
--
-- ⚠ DO NOT REGENERATE with `db:generate` (the 0021+ discipline): the drizzle snapshot is frozen at 0020, and a trigger
-- is invisible to drizzle. HAND-AUTHORED WHOLE. No snapshot file.

CREATE FUNCTION claim_documents_reject_death_certificate_delete()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF OLD.document_type <> 'death_certificate' THEN
    RETURN OLD;
  END IF;
  IF pg_trigger_depth() > 1 THEN
    RETURN OLD;
  END IF;
  RAISE EXCEPTION
    'claim_documents — a death certificate row is never deleted on its own, only with its claim (Story 6.22b DL5; 2026-09-25-243)'
    USING ERRCODE = 'integrity_constraint_violation';
END;
$$;
--> statement-breakpoint
CREATE TRIGGER claim_documents_no_death_certificate_delete
  BEFORE DELETE ON claim_documents
  FOR EACH ROW EXECUTE FUNCTION claim_documents_reject_death_certificate_delete();
