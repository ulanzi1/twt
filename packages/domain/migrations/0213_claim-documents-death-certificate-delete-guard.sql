-- Migration 0213 — a death certificate's `claim_documents` row is never deleted on its own, retyped or moved to
-- another claim (Story 6.22b, Task 1.1; DL5 A; author-commits `2026-11-02-440`, `2026-11-21-481`). After 0212.
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
-- narrowed by these guards: a certificate's row now goes only with its claim (or a trigger-issued delete — below), so
-- the uploads do too. (0122 is an applied migration and is ⛔ edited; the schema headers carry the correction.)
--
-- ── The guard ────────────────────────────────────────────────────────────────────────────────────────────────────────
-- A `BEFORE DELETE` ROW trigger. It refuses deleting a row whose `document_type` is `death_certificate`, for every role
-- (the table owner and a superuser included) while triggers fire, with SQLSTATE 23000 — the 0122 / 0197 / 0212 guards'
-- code, so its MESSAGE is what identifies it. Two things pass:
--   · any other document type (`ground_inspection_photo`, `hospital_record`) — `-243` rules on certificates only;
--   · a delete issued from inside another trigger (`pg_trigger_depth() > 1`) — the `ON DELETE cascade` from `claims`,
--     which the RI trigger runs. This is the house's cascade exception (0119, 0122, 0142–0144, 0149, 0160, 0197, 0212);
--     it admits ANY trigger-issued delete, the accepted residual of that pattern (a role that may DELETE can fire one
--     from a temp-table trigger — the D8 policy-regression test does exactly that). RE-EXAMINE it when any new role,
--     job or SECURITY DEFINER function is granted DELETE on `claim_documents`, and at row `6-22e`'s build if any of its
--     `-240` cl. 1 scrub is ever a trigger-issued delete.
-- What it CANNOT stop (the same for every trigger guard in the house): a superuser or the owner switching triggers off
-- — `session_replication_role = replica` (test teardowns do this), `ALTER TABLE … DISABLE TRIGGER`, `DROP TRIGGER`.
-- The guard stops an accidental or code-path delete, ⛔ a deliberate superuser.
--
-- ── The second guard: ⛔ retype, ⛔ move (code review Decision 1; author-commit `2026-11-21-481`) ───────────────────────
-- A `BEFORE UPDATE OF document_type, claim_case_id` ROW trigger. Without it the DELETE guard is side-stepped in two steps,
-- because it keys on `OLD.document_type` and `twt_app` holds table-wide UPDATE (0053):
--   · `UPDATE … SET document_type = 'hospital_record'`, then `DELETE` — the delete guard waves the row through and the
--     cascade takes every kept upload, review and membership check;
--   · `UPDATE … SET claim_case_id = <another claim>` — deleting THAT claim later takes the certificate row and, through
--     the uploads' `claim_document_id` FK, the ORIGINAL claim's uploads and reviews, while the original claim survives.
-- It refuses either change on a row whose `OLD.document_type` is `death_certificate` (`IS DISTINCT FROM` — a SET that
-- names the column with its old value passes), every role, 23000 with its own message. ⛔ depth exception: no cascade
-- updates either column (`claim_documents_claim_case_id_claims_claim_case_id_fk` and the uploads FK are both
-- `ON UPDATE no action`).
-- ⛔ guard on an UPDATE of any OTHER column, ⛔ TRUNCATE guard here:
--   · the OCR job upserts this row (`insert … on conflict do update`), rewriting the OCR columns and moving
--     `storage_object_key` forward on a replacement — its SET list names neither guarded column, so an `UPDATE OF`
--     trigger does not fire for it (`-440` item 5's "DELETE only", amended by `-481` to this column scope);
--   · TRUNCATE is already refused one step removed: the uploads FK forces `TRUNCATE claim_documents CASCADE`, and
--     `claim_death_certificate_uploads_no_truncate` (0122) raises 23000 (pinned by the guard spec's catalog leg).
-- No grant changes: `twt_app` still has no DELETE on `claim_documents` (0053) — for it the delete guard is the second
-- wall; it DOES hold UPDATE, so for it the retype guard is the first.
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
--> statement-breakpoint
CREATE FUNCTION claim_documents_reject_death_certificate_retype()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF OLD.document_type <> 'death_certificate' THEN
    RETURN NEW;
  END IF;
  IF NEW.document_type IS DISTINCT FROM OLD.document_type OR NEW.claim_case_id IS DISTINCT FROM OLD.claim_case_id THEN
    RAISE EXCEPTION
      'claim_documents — a death certificate row is never retyped or moved to another claim (Story 6.22b DL5; 2026-11-21-481)'
      USING ERRCODE = 'integrity_constraint_violation';
  END IF;
  RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER claim_documents_no_death_certificate_retype
  BEFORE UPDATE OF document_type, claim_case_id ON claim_documents
  FOR EACH ROW EXECUTE FUNCTION claim_documents_reject_death_certificate_retype();
