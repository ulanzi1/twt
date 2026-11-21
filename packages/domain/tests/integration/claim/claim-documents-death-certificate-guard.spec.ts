// Migration 0213 — a death certificate's `claim_documents` row is never deleted on its own, retyped or moved to another
// claim (Story 6.22b, Task 1.3; DL5 A; AC4 (a)–(e); N3; the code review's Decision 1 — `2026-11-21-481` — adds (f)–(g)).
// `2026-09-25-243` cl. 2 keeps every certificate; before 0213 only the ABSENCE of a code path kept this row, and its
// delete cascades into the kept uploads, reviews and membership checks (0122, 0212).
//
// Live DB; per-test ROLLBACK; triggers ON (⛔ `session_replication_role = 'replica'`, which would switch the guards off
// and prove nothing — TR2). Each refusal runs under a SAVEPOINT.
//   · the catalog: exactly the two guards, their timing / events / columns; and the TRUNCATE backstop 0213 relies on
//     (0122's uploads FK + `claim_death_certificate_uploads_no_truncate`) still in place — a catalog check, ⛔ a live
//     TRUNCATE (it would lock every table the CASCADE reaches — the FK + TRUNCATE lock-order deadlock);
//   · (a) a direct DELETE of the certificate's row as the SUPERUSER ⇒ 23000 AND the guard's OWN message — 23000 alone
//     is also what the 0122 / 0197 / 0212 guards raise, so the code does not say WHICH guard refused;
//   · (b) the same as `twt_app` ⇒ 42501 (no DELETE grant since 0053 — the guard is the second wall);
//   · (c) deleting the CLAIM ⇒ the claim, the document, the upload, the review and the membership check all go (the
//     guard's depth > 1 exception — the `ON DELETE cascade` the RI trigger runs);
//   · (d) a `hospital_record` and a `ground_inspection_photo` row are still deletable (the guard is
//     death-certificate-only);
//   · (e) the row's OCR columns and `storage_object_key` still UPDATE — a plain UPDATE and the OCR job's
//     `insert … on conflict do update` with its real SET list (the retype guard is column-scoped — TR3);
//   · (f) retyping the certificate's row ⇒ 23000 with the retype guard's message, as the superuser AND as `twt_app`
//     (which holds UPDATE — for it this guard is the first wall); a SET naming the column with its OLD value passes;
//   · (g) moving it to another claim ⇒ the same; a `hospital_record` row may still be moved (the control).
// ⛔ No "the rows are still there" check after a `ROLLBACK TO SAVEPOINT` — it cannot fail whatever the guard does.
// The proof that a guard is what refuses is its message; (c), (d), (e) and the controls in (f) / (g) must SUCCEED.
// Mutation checks (run by hand, recorded in the story's Debug Log): drop the depth exception ⇒ (c) fails; drop the
// document-type test ⇒ (d) fails; drop the retype trigger ⇒ (f) and (g) fail; refuse without `IS DISTINCT FROM` ⇒
// (f)'s same-value control fails.

import { randomUUID } from 'node:crypto';

import { eq } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';

import * as schema from '../../../src/schema/index.js';
import { getTx, hasDatabase, setupLiveDb } from '../../../src/test-utils/integration-setup.js';
import { PARIWAR_A, enterAppScope, seedClaim, seedDeathCertificate, seedMember, seedMembershipCheck } from '../_helpers.js';

type Client = ReturnType<typeof getTx>['client'];

/** The guards' own words (migration 0213) — what tells them apart from every other 23000 guard. */
const GUARD_MESSAGE = /^claim_documents — a death certificate row is never deleted on its own, only with its claim/;
const RETYPE_MESSAGE = /^claim_documents — a death certificate row is never retyped or moved to another claim/;

/** Run a statement that must be refused, under a SAVEPOINT, and match the pg error (top level or under `.cause`). */
async function expectPgError(client: Client, run: () => Promise<unknown>, expected: Record<string, unknown>): Promise<void> {
  await client.query('SAVEPOINT expect_pg_error');
  const err = await run().then(
    () => undefined,
    (e: unknown) => e,
  );
  const pgErr = (err as { cause?: unknown } | undefined)?.cause ?? err;
  expect(pgErr).toMatchObject(expected);
  await client.query('ROLLBACK TO SAVEPOINT expect_pg_error');
}

/**
 * A claim with its CURRENT death certificate (the `claim_documents` row + one upload) and an accepted review of it —
 * seeded as `twt_app` in PARIWAR_A's scope, which the session is LEFT in (a test that needs the superuser says
 * `RESET ROLE`).
 */
async function seedCertifiedClaim() {
  const { tx, client } = getTx();
  const memberId = await seedMember(tx, PARIWAR_A, { state: 'active' });
  const claimCaseId = await seedClaim(tx, PARIWAR_A, { deceasedMemberId: memberId, currentState: 'verification_in_progress' });
  await enterAppScope(client, PARIWAR_A);
  const cert = await seedDeathCertificate(client, { pariwarId: PARIWAR_A, claimCaseId });
  const [review] = await tx
    .insert(schema.claimDeathCertificateReviews)
    .values({
      claimCaseId: claimCaseId as never,
      pariwarId: PARIWAR_A,
      deceasedMemberId: memberId as never,
      uploadId: cert.uploadId as never,
      verdict: 'accepted',
      rejectionReason: null,
      acceptedDateCiphertext: 'enc:v1:date',
      noteCiphertext: 'enc:v1:note',
      decidedByActorId: randomUUID(),
      decidedByDisplay: 'Test District Admin',
    })
    .returning({ reviewId: schema.claimDeathCertificateReviews.reviewId });
  return { tx, client, memberId, claimCaseId, reviewId: review!.reviewId as string, ...cert };
}

/** Another document on the claim, inserted directly (there is no writer for either type). */
async function insertOtherDocument(
  client: Client,
  claimCaseId: string,
  documentType: 'hospital_record' | 'ground_inspection_photo',
): Promise<string> {
  const claimDocumentId = randomUUID();
  await client.query(
    `INSERT INTO claim_documents (claim_document_id, claim_case_id, pariwar_id, document_type, storage_object_key, content_type,
       byte_size, parity_outcome, parity_flags, ocr_confidence, verifier_review_required)
     VALUES ($1, $2, $3, $4, $5, 'application/pdf', 1024, 'ambiguous', '{}'::jsonb, 0, true)`,
    [claimDocumentId, claimCaseId, PARIWAR_A, documentType, `pariwar/${PARIWAR_A}/claim/${claimCaseId}/${documentType}/${claimDocumentId}`],
  );
  return claimDocumentId;
}

/** A second claim in PARIWAR_A (its own deceased member), seeded as the superuser; the caller's role is restored. */
async function seedSecondClaim(): Promise<string> {
  const { tx, client } = getTx();
  await client.query('RESET ROLE');
  const otherMemberId = await seedMember(tx, PARIWAR_A, { state: 'active' });
  return seedClaim(tx, PARIWAR_A, { deceasedMemberId: otherMemberId, currentState: 'verification_in_progress' });
}

const DELETE_DOCUMENT = 'DELETE FROM claim_documents WHERE claim_document_id = $1';

describe.skipIf(!hasDatabase)('migration 0213 — a death certificate’s claim_documents row is never deleted on its own', { timeout: 20000 }, () => {
  setupLiveDb();

  it('the guards are TWO row triggers on claim_documents — BEFORE DELETE, and BEFORE UPDATE OF document_type, claim_case_id (the catalog)', async () => {
    const { client } = getTx();
    const triggers = await client.query<{ tgname: string; tgtype: number; fn: string; tgenabled: string; cols: string[] }>(
      `SELECT t.tgname, t.tgtype::int AS tgtype, p.proname AS fn, t.tgenabled,
              ARRAY(SELECT a.attname::text FROM unnest(t.tgattr::int2[]) AS k(attnum)
                      JOIN pg_attribute a ON a.attrelid = t.tgrelid AND a.attnum = k.attnum
                     ORDER BY a.attname) AS cols
         FROM pg_trigger t JOIN pg_proc p ON p.oid = t.tgfoid
        WHERE t.tgrelid = 'public.claim_documents'::regclass AND NOT t.tgisinternal
        ORDER BY t.tgname`,
    );
    // `tgtype` bits: ROW = 1, BEFORE = 2, DELETE = 8, UPDATE = 16. DELETE ⇒ 11; UPDATE ⇒ 19, and ONLY for the two named
    // columns — a whole-row UPDATE trigger (empty column list) would fire on the OCR job's upsert (TR3).
    expect(triggers.rows).toEqual([
      {
        tgname: 'claim_documents_no_death_certificate_delete',
        tgtype: 11,
        fn: 'claim_documents_reject_death_certificate_delete',
        tgenabled: 'O',
        cols: [],
      },
      {
        tgname: 'claim_documents_no_death_certificate_retype',
        tgtype: 19,
        fn: 'claim_documents_reject_death_certificate_retype',
        tgenabled: 'O',
        cols: ['claim_case_id', 'document_type'],
      },
    ]);
  });

  it('the TRUNCATE backstop 0213 relies on is still in place — 0122’s uploads FK cascades from claim_documents, and the uploads refuse TRUNCATE (the catalog)', async () => {
    const { client } = getTx();
    // `TRUNCATE claim_documents` is refused only because this FK forces CASCADE into the uploads, whose own BEFORE
    // TRUNCATE trigger raises 23000. If either goes, certificates become truncatable — this leg turns red first.
    const fk = await client.query<{ conname: string; confdeltype: string; target: string }>(
      `SELECT c.conname, c.confdeltype, c.confrelid::regclass::text AS target
         FROM pg_constraint c
        WHERE c.conrelid = 'public.claim_death_certificate_uploads'::regclass AND c.contype = 'f'
          AND c.confrelid = 'public.claim_documents'::regclass`,
    );
    expect(fk.rows).toEqual([{ conname: 'claim_death_certificate_uploads_claim_document_id_fk', confdeltype: 'c', target: 'claim_documents' }]);
    const truncateGuard = await client.query<{ tgtype: number; tgenabled: string }>(
      `SELECT t.tgtype::int AS tgtype, t.tgenabled FROM pg_trigger t
        WHERE t.tgrelid = 'public.claim_death_certificate_uploads'::regclass
          AND t.tgname = 'claim_death_certificate_uploads_no_truncate'`,
    );
    // BEFORE = 2, TRUNCATE = 32 ⇒ 34 (statement-level).
    expect(truncateGuard.rows).toEqual([{ tgtype: 34, tgenabled: 'O' }]);
  });

  it('⭐ (a) the SUPERUSER cannot delete a death certificate’s row — 23000 with the guard’s own message', async () => {
    const { client, claimDocumentId } = await seedCertifiedClaim();
    await client.query('RESET ROLE');
    await expectPgError(client, () => client.query(DELETE_DOCUMENT, [claimDocumentId]), {
      code: '23000',
      message: expect.stringMatching(GUARD_MESSAGE),
    });
  });

  it('(a) …and a certificate row with NO upload (the OCR reading alone) is refused the same way', async () => {
    const { tx, client } = getTx();
    const memberId = await seedMember(tx, PARIWAR_A, { state: 'active' });
    const claimCaseId = await seedClaim(tx, PARIWAR_A, { deceasedMemberId: memberId, currentState: 'verification_in_progress' });
    const claimDocumentId = randomUUID();
    await client.query(
      `INSERT INTO claim_documents (claim_document_id, claim_case_id, pariwar_id, document_type, storage_object_key, content_type,
         byte_size, date_of_death_ciphertext, parity_outcome, parity_flags, ocr_confidence, verifier_review_required)
       VALUES ($1, $2, $3, 'death_certificate', $4, 'application/pdf', 1024, 'enc:v1:ocr-date', 'match', '{}'::jsonb, 0.9, false)`,
      [claimDocumentId, claimCaseId, PARIWAR_A, `pariwar/${PARIWAR_A}/claim/${claimCaseId}/death_certificate/${claimDocumentId}`],
    );
    await expectPgError(client, () => client.query(DELETE_DOCUMENT, [claimDocumentId]), {
      code: '23000',
      message: expect.stringMatching(GUARD_MESSAGE),
    });
  });

  it('(b) twt_app cannot delete it either — 42501, no DELETE grant (the guard is the second wall)', async () => {
    const { client, claimDocumentId } = await seedCertifiedClaim();
    await expectPgError(client, () => client.query(DELETE_DOCUMENT, [claimDocumentId]), { code: '42501' });
  });

  it('⭐ (c) deleting the CLAIM still removes the document, the upload, the review and the membership check (depth > 1)', async () => {
    const { tx, client, memberId, claimCaseId, reviewId } = await seedCertifiedClaim();
    await seedMembershipCheck(tx, { pariwarId: PARIWAR_A, claimCaseId, deceasedMemberId: memberId, reviewId });
    await client.query('RESET ROLE');
    const tables = [
      'claims',
      'claim_documents',
      'claim_death_certificate_uploads',
      'claim_death_certificate_reviews',
      'claim_membership_checks',
    ] as const;
    const counts = async () => {
      const out: Record<string, number> = {};
      for (const t of tables) {
        const { rows } = await client.query<{ n: number }>(`SELECT count(*)::int AS n FROM ${t} WHERE claim_case_id = $1`, [claimCaseId]);
        out[t] = rows[0]!.n;
      }
      return out;
    };
    // Every table holds a row BEFORE the delete — else "all gone" below would say nothing.
    expect(await counts()).toEqual(Object.fromEntries(tables.map((t) => [t, 1])));
    const deleted = await client.query('DELETE FROM claims WHERE claim_case_id = $1', [claimCaseId]);
    expect(deleted.rowCount).toBe(1);
    expect(await counts()).toEqual(Object.fromEntries(tables.map((t) => [t, 0])));
  });

  it('⭐ (d) a hospital_record and a ground_inspection_photo row on the same claim are still deletable — the guard is death-certificate-only', async () => {
    const { client, claimCaseId, claimDocumentId } = await seedCertifiedClaim();
    await client.query('RESET ROLE');
    for (const documentType of ['hospital_record', 'ground_inspection_photo'] as const) {
      const otherId = await insertOtherDocument(client, claimCaseId, documentType);
      const deleted = await client.query(DELETE_DOCUMENT, [otherId]);
      expect(deleted.rowCount, documentType).toBe(1);
    }
    // …and the certificate's row, beside them, is untouched by those deletes.
    const left = await client.query<{ id: string; t: string }>(
      'SELECT claim_document_id AS id, document_type AS t FROM claim_documents WHERE claim_case_id = $1',
      [claimCaseId],
    );
    expect(left.rows).toEqual([{ id: claimDocumentId, t: 'death_certificate' }]);
  });

  it('(e) the OCR columns and the object key still UPDATE — a plain UPDATE and the OCR job’s upsert (the retype guard is column-scoped)', async () => {
    const { tx, client, claimCaseId, claimDocumentId, storageObjectKey } = await seedCertifiedClaim();
    // A replacement upload moves the key forward — the OCR job's SET list writes it (`apps/jobs/src/claim-ocr-parity.ts`).
    const replacementKey = `${storageObjectKey}-replacement`;
    const plain = await client.query(
      `UPDATE claim_documents
          SET deceased_name_ciphertext = 'enc:v1:name-1', date_of_death_ciphertext = 'enc:v1:dod-1', updated_at = now()
        WHERE claim_document_id = $1`,
      [claimDocumentId],
    );
    expect(plain.rowCount).toBe(1);

    // The OCR job's shape (`runClaimOcrParity`): an INSERT with a NEW id that lands on the (claim, document_type)
    // unique index and takes the conflict path — an UPDATE of the SAME row.
    const [upserted] = await tx
      .insert(schema.claimDocuments)
      .values({
        claimDocumentId: randomUUID() as never,
        claimCaseId: claimCaseId as never,
        pariwarId: PARIWAR_A,
        documentType: 'death_certificate',
        storageObjectKey,
        contentType: 'application/pdf',
        byteSize: 2048,
        dateOfDeathCiphertext: 'enc:v1:dod-2',
        certificateNumberCiphertext: 'enc:v1:number-2',
        parityOutcome: 'mismatch',
        parityFlags: {},
        ocrConfidence: 0.5,
        verifierReviewRequired: true,
      })
      .onConflictDoUpdate({
        target: [schema.claimDocuments.claimCaseId, schema.claimDocuments.documentType],
        set: {
          storageObjectKey: replacementKey,
          contentType: 'application/pdf',
          byteSize: 2048,
          dateOfDeathCiphertext: 'enc:v1:dod-2',
          certificateNumberCiphertext: 'enc:v1:number-2',
          parityOutcome: 'mismatch',
          ocrConfidence: 0.5,
          verifierReviewRequired: true,
          updatedAt: new Date(),
        },
      })
      .returning({ claimDocumentId: schema.claimDocuments.claimDocumentId });
    expect(upserted!.claimDocumentId).toBe(claimDocumentId);

    const [row] = await tx
      .select({
        name: schema.claimDocuments.deceasedNameCiphertext,
        dod: schema.claimDocuments.dateOfDeathCiphertext,
        number: schema.claimDocuments.certificateNumberCiphertext,
        byteSize: schema.claimDocuments.byteSize,
        parityOutcome: schema.claimDocuments.parityOutcome,
        key: schema.claimDocuments.storageObjectKey,
      })
      .from(schema.claimDocuments)
      .where(eq(schema.claimDocuments.claimDocumentId, claimDocumentId as never));
    expect(row).toEqual({
      name: 'enc:v1:name-1',
      dod: 'enc:v1:dod-2',
      number: 'enc:v1:number-2',
      byteSize: 2048,
      parityOutcome: 'mismatch',
      key: replacementKey,
    });
  });

  it('⭐ (f) a death certificate’s row cannot be RETYPED — 23000 with the retype guard’s message, as twt_app and as the superuser', async () => {
    const { client, claimDocumentId } = await seedCertifiedClaim();
    const RETYPE = `UPDATE claim_documents SET document_type = 'hospital_record' WHERE claim_document_id = $1`;
    // twt_app (the session is in PARIWAR_A's scope) — it holds UPDATE, so here the retype guard is the first wall.
    await expectPgError(client, () => client.query(RETYPE, [claimDocumentId]), {
      code: '23000',
      message: expect.stringMatching(RETYPE_MESSAGE),
    });
    await client.query('RESET ROLE');
    await expectPgError(client, () => client.query(RETYPE, [claimDocumentId]), {
      code: '23000',
      message: expect.stringMatching(RETYPE_MESSAGE),
    });
    // Control: a SET that names the column with its OLD value fires the trigger and passes (`IS DISTINCT FROM`).
    const same = await client.query(
      `UPDATE claim_documents SET document_type = 'death_certificate', updated_at = now() WHERE claim_document_id = $1`,
      [claimDocumentId],
    );
    expect(same.rowCount).toBe(1);
  });

  it('⭐ (g) a death certificate’s row cannot be MOVED to another claim — 23000 with the retype guard’s message; a hospital_record still may be', async () => {
    const { client, claimCaseId, claimDocumentId } = await seedCertifiedClaim();
    const otherClaimId = await seedSecondClaim();
    const MOVE = 'UPDATE claim_documents SET claim_case_id = $2 WHERE claim_document_id = $1';
    await enterAppScope(client, PARIWAR_A);
    await expectPgError(client, () => client.query(MOVE, [claimDocumentId, otherClaimId]), {
      code: '23000',
      message: expect.stringMatching(RETYPE_MESSAGE),
    });
    await client.query('RESET ROLE');
    await expectPgError(client, () => client.query(MOVE, [claimDocumentId, otherClaimId]), {
      code: '23000',
      message: expect.stringMatching(RETYPE_MESSAGE),
    });
    // Control: the guard is death-certificate-only — another document type moves.
    const hospitalRecordId = await insertOtherDocument(client, claimCaseId, 'hospital_record');
    const moved = await client.query(MOVE, [hospitalRecordId, otherClaimId]);
    expect(moved.rowCount).toBe(1);
  });
});
