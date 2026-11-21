// Migration 0213 — a death certificate's `claim_documents` row is never deleted on its own (Story 6.22b, Task 1.3;
// DL5 A; AC4 (a)–(e); N3). `2026-09-25-243` cl. 2 keeps every certificate; before 0213 only the ABSENCE of a code path
// kept this row, and its delete cascades into the kept uploads, reviews and membership checks (0122, 0212).
//
// Live DB; per-test ROLLBACK; triggers ON (⛔ `session_replication_role = 'replica'`, which would switch the guard off
// and prove nothing — TR2). Each refusal runs under a SAVEPOINT.
//   · (a) a direct DELETE of the certificate's row as the SUPERUSER ⇒ 23000 AND the guard's OWN message — 23000 alone
//     is also what the 0122 / 0197 / 0212 guards raise, so the code does not say WHICH guard refused;
//   · (b) the same as `twt_app` ⇒ 42501 (no DELETE grant since 0053 — the guard is the second wall);
//   · (c) deleting the CLAIM ⇒ the claim, the document, the upload, the review and the membership check all go (the
//     guard's depth > 1 exception — the `ON DELETE cascade` the RI trigger runs);
//   · (d) a `hospital_record` row is still deletable (the guard is death-certificate-only);
//   · (e) the row's OCR columns still UPDATE — a plain UPDATE and the OCR job's `insert … on conflict do update`
//     (the trigger is DELETE-only — TR3).
// ⛔ No "the rows are still there" check after a `ROLLBACK TO SAVEPOINT` — it cannot fail whatever the guard does.
// The proof that the guard is what refuses is (a)'s message; (c) and (d) are the controls that must SUCCEED.
// Mutation checks (run by hand, recorded in the story's Debug Log): drop the depth exception ⇒ (c) fails; drop the
// document-type test ⇒ (d) fails.

import { randomUUID } from 'node:crypto';

import { eq } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';

import * as schema from '../../../src/schema/index.js';
import { getTx, hasDatabase, setupLiveDb } from '../../../src/test-utils/integration-setup.js';
import { PARIWAR_A, enterAppScope, seedClaim, seedDeathCertificate, seedMember, seedMembershipCheck } from '../_helpers.js';

type Client = ReturnType<typeof getTx>['client'];

/** The guard's own words (migration 0213) — what tells it apart from every other 23000 guard. */
const GUARD_MESSAGE = /^claim_documents — a death certificate row is never deleted on its own, only with its claim/;

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

/** A second document on the claim — a `hospital_record`, inserted directly (there is no writer for one). */
async function insertHospitalRecord(client: Client, claimCaseId: string): Promise<string> {
  const claimDocumentId = randomUUID();
  await client.query(
    `INSERT INTO claim_documents (claim_document_id, claim_case_id, pariwar_id, document_type, storage_object_key, content_type,
       byte_size, parity_outcome, parity_flags, ocr_confidence, verifier_review_required)
     VALUES ($1, $2, $3, 'hospital_record', $4, 'application/pdf', 1024, 'ambiguous', '{}'::jsonb, 0, true)`,
    [claimDocumentId, claimCaseId, PARIWAR_A, `pariwar/${PARIWAR_A}/claim/${claimCaseId}/hospital_record/${claimDocumentId}`],
  );
  return claimDocumentId;
}

const DELETE_DOCUMENT = 'DELETE FROM claim_documents WHERE claim_document_id = $1';

describe.skipIf(!hasDatabase)('migration 0213 — a death certificate’s claim_documents row is never deleted on its own', { timeout: 20000 }, () => {
  setupLiveDb();

  it('the guard is ONE BEFORE DELETE row trigger on claim_documents — ⛔ UPDATE, ⛔ INSERT, ⛔ TRUNCATE (the catalog)', async () => {
    const { client } = getTx();
    const triggers = await client.query<{ tgname: string; tgtype: number; fn: string; tgenabled: string }>(
      `SELECT t.tgname, t.tgtype::int AS tgtype, p.proname AS fn, t.tgenabled
         FROM pg_trigger t JOIN pg_proc p ON p.oid = t.tgfoid
        WHERE t.tgrelid = 'public.claim_documents'::regclass AND NOT t.tgisinternal`,
    );
    // `tgtype` bits: ROW = 1, BEFORE = 2, DELETE = 8 ⇒ 11. An UPDATE bit (16) here would break the OCR job's upsert (TR3).
    expect(triggers.rows).toEqual([
      {
        tgname: 'claim_documents_no_death_certificate_delete',
        tgtype: 11,
        fn: 'claim_documents_reject_death_certificate_delete',
        tgenabled: 'O',
      },
    ]);
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

  it('⭐ (d) a hospital_record row on the same claim is still deletable — the guard is death-certificate-only', async () => {
    const { client, claimCaseId, claimDocumentId } = await seedCertifiedClaim();
    await client.query('RESET ROLE');
    const hospitalRecordId = await insertHospitalRecord(client, claimCaseId);
    const deleted = await client.query(DELETE_DOCUMENT, [hospitalRecordId]);
    expect(deleted.rowCount).toBe(1);
    // …and the certificate's row, beside it, is untouched by that delete.
    const left = await client.query<{ id: string; t: string }>(
      'SELECT claim_document_id AS id, document_type AS t FROM claim_documents WHERE claim_case_id = $1',
      [claimCaseId],
    );
    expect(left.rows).toEqual([{ id: claimDocumentId, t: 'death_certificate' }]);
  });

  it('(e) the OCR columns still UPDATE — a plain UPDATE and the OCR job’s upsert (the trigger is DELETE-only)', async () => {
    const { tx, client, claimCaseId, claimDocumentId, storageObjectKey } = await seedCertifiedClaim();
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
      })
      .from(schema.claimDocuments)
      .where(eq(schema.claimDocuments.claimDocumentId, claimDocumentId as never));
    expect(row).toEqual({ name: 'enc:v1:name-1', dod: 'enc:v1:dod-2', number: 'enc:v1:number-2', byteSize: 2048, parityOutcome: 'mismatch' });
  });
});
