// Migration 0122 — the death-certificate UPLOADS and REVIEWS tables' RLS + DB-level backstops (Story 6.21a,
// Task 1 / AC8(ix); D1, D2, D8; checklist family 5).
//
// ⚠ These assert the CONSTRAINTS DIRECTLY — ⛔ never inferred through the review writer or the OCR job. Each
// backstop the writers reason from in prose ("the index is the truth, the typed error is the interface")
// gets its own red here.
//
// ⭐ The load-bearing ones:
//   · ⛔ NO certificate is ever overwritten or deleted (`2026-09-25-243`, invariant 3): the uploads table is
//     append-only for EVERY role, the table owner included — only an `ON DELETE cascade` passes;
//   · a review's verdict coherence (accepted ⇔ date ⇔ no reason) and the NULL-in-CHECK trap on the reason;
//   · ONE live review per claim (D1) and the ONE-WAY supersession (a superseded rejection is never revived);
//   · the determination's review FK is ON DELETE SET NULL (D8) — a NULL is `determination_stale`, never a pass.
//
// Live DB only (`twt-test-pg :5433`); each test runs in its own rolled-back transaction.

import { randomUUID } from 'node:crypto';

import { eq } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';

import * as schema from '../../../src/schema/index.js';
import { getTx, hasDatabase, setupLiveDb } from '../../../src/test-utils/integration-setup.js';
import {
  PARIWAR_A,
  PARIWAR_B,
  enterAppRoleNoScope,
  enterAppScope,
  seedClaim,
  seedDeathCertificate,
  seedMember,
} from '../_helpers.js';

const TABLES = ['claim_death_certificate_uploads', 'claim_death_certificate_reviews'] as const;

/** A pg error's code, whether surfaced at the top level or wrapped by drizzle under `.cause`. */
function pgCode(err: unknown): string | undefined {
  return (err as { code?: string }).code ?? (err as { cause?: { code?: string } }).cause?.code;
}

/** The violated constraint's NAME — a CHECK leg must be refused by ITS check, ⛔ not a neighbour's. */
function pgConstraint(err: unknown): string | undefined {
  return (err as { constraint?: string }).constraint ?? (err as { cause?: { constraint?: string } }).cause?.constraint;
}

/** Seed a member + a claim + a current certificate (as the superuser), then enter PARIWAR_A's app scope. */
async function seedClaimWithCertificate() {
  const { tx, client } = getTx();
  const memberId = await seedMember(tx, PARIWAR_A, { state: 'active' });
  const claimCaseId = await seedClaim(tx, PARIWAR_A, {
    deceasedMemberId: memberId,
    currentState: 'verification_in_progress',
  });
  await enterAppScope(client, PARIWAR_A);
  const cert = await seedDeathCertificate(client, { pariwarId: PARIWAR_A, claimCaseId });
  return { tx, client, memberId, claimCaseId, ...cert };
}

function review(
  claimCaseId: string,
  memberId: string,
  uploadId: string,
  over: Partial<schema.ClaimDeathCertificateReviewInsert> = {},
): schema.ClaimDeathCertificateReviewInsert {
  return {
    claimCaseId: claimCaseId as never,
    pariwarId: PARIWAR_A,
    deceasedMemberId: memberId as never,
    uploadId: uploadId as never,
    verdict: 'accepted',
    rejectionReason: null,
    acceptedDateCiphertext: 'enc:v1:date',
    noteCiphertext: 'enc:v1:note',
    decidedByActorId: randomUUID(),
    decidedByDisplay: 'Test District Admin',
    ...over,
  };
}

function upload(
  claimCaseId: string,
  memberId: string,
  claimDocumentId: string,
  over: Partial<schema.ClaimDeathCertificateUploadInsert> = {},
): schema.ClaimDeathCertificateUploadInsert {
  const uploadId = randomUUID();
  return {
    uploadId: uploadId as never,
    claimCaseId: claimCaseId as never,
    pariwarId: PARIWAR_A,
    deceasedMemberId: memberId as never,
    claimDocumentId: claimDocumentId as never,
    storageObjectKey: `k/${uploadId}`,
    contentType: 'application/pdf',
    byteSize: 10,
    channel: 'helpline',
    uploadedByActorId: null,
    uploadedAt: new Date(),
    parityOutcome: 'match',
    parityFlags: {},
    ocrConfidence: 0.9,
    ...over,
  };
}

const rejected = { verdict: 'rejected' as const, acceptedDateCiphertext: null, rejectionReason: 'no_date_of_death' as const };

describe.skipIf(!hasDatabase)('migration 0122 — death-certificate uploads + reviews: RLS + DB backstops', { timeout: 20000 }, () => {
  setupLiveDb();

  it('FORCE ROW LEVEL SECURITY is enabled on both tables (the catalog guard)', async () => {
    const { client } = getTx();
    const rls = await client.query<{ relname: string; relrowsecurity: boolean; relforcerowsecurity: boolean }>(
      `SELECT relname, relrowsecurity, relforcerowsecurity FROM pg_class WHERE relname = ANY($1)`,
      [TABLES],
    );
    expect(rls.rows.map((r) => r.relname).sort()).toEqual([...TABLES].sort());
    for (const row of rls.rows) {
      expect(row.relrowsecurity, row.relname).toBe(true);
      expect(row.relforcerowsecurity, row.relname).toBe(true);
    }
  });

  it('⛔ no FOR ALL / DELETE policy; exactly the declared legs PER TABLE', async () => {
    const { client } = getTx();
    const pols = await client.query<{ tablename: string; cmd: string }>(
      `SELECT tablename, cmd FROM pg_policies WHERE tablename = ANY($1)`,
      [TABLES],
    );
    const byTable = new Map<string, string[]>();
    for (const p of pols.rows) byTable.set(p.tablename, [...(byTable.get(p.tablename) ?? []), p.cmd].sort());
    expect(Object.fromEntries(byTable)).toEqual({
      claim_death_certificate_uploads: ['INSERT', 'SELECT'],
      claim_death_certificate_reviews: ['INSERT', 'SELECT', 'UPDATE'],
    });
  });

  it('⭐ family 5 — both tables: visible in-scope, ZERO rows cross-tenant, ZERO rows with an unset scope', async () => {
    const { tx, client, claimCaseId, memberId, uploadId } = await seedClaimWithCertificate();
    await tx.insert(schema.claimDeathCertificateReviews).values(review(claimCaseId, memberId, uploadId));
    const counts = async () => {
      const q = (t: string) =>
        client.query<{ n: number }>(`SELECT count(*) AS n FROM ${t} WHERE claim_case_id = $1`, [claimCaseId]).then((r) => Number(r.rows[0]!.n));
      return { uploads: await q('claim_death_certificate_uploads'), reviews: await q('claim_death_certificate_reviews') };
    };
    expect(await counts()).toEqual({ uploads: 1, reviews: 1 });
    await enterAppScope(client, PARIWAR_B);
    expect(await counts()).toEqual({ uploads: 0, reviews: 0 });
    await enterAppRoleNoScope(client);
    await client.query("SET LOCAL app.pariwar_id = ''");
    expect(await counts()).toEqual({ uploads: 0, reviews: 0 });
  });

  it("⛔ a row stamped with ANOTHER Pariwar's id is refused by the WITH CHECK on both tables (42501)", async () => {
    const { tx, client, claimCaseId, memberId, uploadId, claimDocumentId } = await seedClaimWithCertificate();
    await client.query('SAVEPOINT a');
    await expect(
      tx.insert(schema.claimDeathCertificateUploads).values(upload(claimCaseId, memberId, claimDocumentId, { pariwarId: PARIWAR_B })),
    ).rejects.toSatisfy((err: unknown) => pgCode(err) === '42501');
    await client.query('ROLLBACK TO SAVEPOINT a');
    await expect(
      tx.insert(schema.claimDeathCertificateReviews).values(review(claimCaseId, memberId, uploadId, { pariwarId: PARIWAR_B })),
    ).rejects.toSatisfy((err: unknown) => pgCode(err) === '42501');
  });

  it('⭐ family 5 — every FOREIGN KEY refuses an orphan (23503)', async () => {
    const { tx, client, claimCaseId, memberId, uploadId, claimDocumentId } = await seedClaimWithCertificate();
    const ghost = randomUUID();
    const attempts: [string, () => Promise<unknown>][] = [
      ['upload → claim', () => tx.insert(schema.claimDeathCertificateUploads).values(upload(ghost, memberId, claimDocumentId))],
      ['upload → claim document', () => tx.insert(schema.claimDeathCertificateUploads).values(upload(claimCaseId, memberId, ghost))],
      ['review → claim', () => tx.insert(schema.claimDeathCertificateReviews).values(review(ghost, memberId, uploadId))],
      ['review → upload', () => tx.insert(schema.claimDeathCertificateReviews).values(review(claimCaseId, memberId, ghost))],
      [
        'review → superseded review',
        () =>
          tx.insert(schema.claimDeathCertificateReviews).values(
            review(claimCaseId, memberId, uploadId, { supersedesReviewId: ghost as never }),
          ),
      ],
      [
        'determination → review',
        () =>
          tx.insert(schema.nomineeDeterminations).values({
            claimCaseId: claimCaseId as never,
            pariwarId: PARIWAR_A,
            deceasedMemberId: memberId as never,
            certificateDateCiphertext: 'enc:v1:date',
            noteCiphertext: 'enc:v1:note',
            decidedByActorId: randomUUID(),
            decidedByDisplay: 'Test District Admin',
            deathCertificateReviewId: ghost as never,
          }),
      ],
    ];
    for (const [label, attempt] of attempts) {
      await client.query('SAVEPOINT fk');
      const err = await attempt().then(
        () => undefined,
        (e: unknown) => e,
      );
      expect(pgCode(err), label).toBe('23503');
      await client.query('ROLLBACK TO SAVEPOINT fk');
    }
  });

  it('⭐ family 5 — every CHECK refuses by its OWN name (23514), including the NULL-in-CHECK trap on the reason', async () => {
    const { tx, client, claimCaseId, memberId, uploadId, claimDocumentId } = await seedClaimWithCertificate();
    const r = (over: Partial<schema.ClaimDeathCertificateReviewInsert>) =>
      tx.insert(schema.claimDeathCertificateReviews).values(review(claimCaseId, memberId, uploadId, over));
    const attempts: [string, string, () => Promise<unknown>][] = [
      ['upload channel', 'claim_death_certificate_uploads_channel_check', () => tx.insert(schema.claimDeathCertificateUploads).values(upload(claimCaseId, memberId, claimDocumentId, { channel: 'email' as never }))],
      ['upload byte size', 'claim_death_certificate_uploads_byte_size_check', () => tx.insert(schema.claimDeathCertificateUploads).values(upload(claimCaseId, memberId, claimDocumentId, { byteSize: -1 }))],
      // `2026-09-26-245` §1 (0123) — an upload's parity verdict is all three columns or none.
      ['verdict: no flags', 'claim_death_certificate_uploads_parity_verdict_check', () => tx.insert(schema.claimDeathCertificateUploads).values(upload(claimCaseId, memberId, claimDocumentId, { parityFlags: null }))],
      ['verdict: no confidence', 'claim_death_certificate_uploads_parity_verdict_check', () => tx.insert(schema.claimDeathCertificateUploads).values(upload(claimCaseId, memberId, claimDocumentId, { ocrConfidence: null }))],
      // `2026-09-26-246` §4 — a NEW row with ⛔ no verdict at all is refused (the `NOT VALID` CHECK).
      ['verdict: none at all', 'claim_death_certificate_uploads_parity_verdict_required_check', () => tx.insert(schema.claimDeathCertificateUploads).values(upload(claimCaseId, memberId, claimDocumentId, { parityOutcome: null, parityFlags: null, ocrConfidence: null }))],
      ['blank display', 'claim_death_certificate_reviews_display_check', () => r({ decidedByDisplay: '   ' })],
      ['accepted without a date', 'claim_death_certificate_reviews_verdict_coherence_check', () => r({ acceptedDateCiphertext: null })],
      ['accepted with a reason', 'claim_death_certificate_reviews_verdict_coherence_check', () => r({ rejectionReason: 'no_date_of_death' })],
      ['rejected without a reason', 'claim_death_certificate_reviews_verdict_coherence_check', () => r({ ...rejected, rejectionReason: null })],
      ['rejected with a date', 'claim_death_certificate_reviews_verdict_coherence_check', () => r({ ...rejected, acceptedDateCiphertext: 'enc:v1:date' })],
      ['rejected with an unknown reason', 'claim_death_certificate_reviews_verdict_coherence_check', () => r({ ...rejected, rejectionReason: 'looks_fake' as never })],
      ['superseded without a reason', 'claim_death_certificate_reviews_supersession_coherence_check', () => r({ supersededAt: new Date() })],
      ['a reason without superseded_at', 'claim_death_certificate_reviews_supersession_coherence_check', () => r({ supersededReason: 're_reviewed' })],
      ['an unknown supersession reason', 'claim_death_certificate_reviews_supersession_coherence_check', () => r({ supersededAt: new Date(), supersededReason: 'expired' as never })],
    ];
    for (const [label, name, attempt] of attempts) {
      await client.query('SAVEPOINT ck');
      const err = await attempt().then(
        () => undefined,
        (e: unknown) => e,
      );
      expect(pgCode(err), label).toBe('23514');
      expect(pgConstraint(err), label).toBe(name);
      await client.query('ROLLBACK TO SAVEPOINT ck');
    }
    // ⚠ `verdict_check` is NOT constructible alone by an insert (the coherence CHECK enumerates both legal
    // verdicts, and sorts first) — the refusal is proven, and the catalog proves the check's exact value set.
    await client.query('SAVEPOINT v');
    const vErr = await r({ verdict: 'maybe' as never }).then(
      () => undefined,
      (e: unknown) => e,
    );
    expect(pgCode(vErr)).toBe('23514');
    await client.query('ROLLBACK TO SAVEPOINT v');
    const def = await client.query<{ d: string }>(
      `SELECT pg_get_constraintdef(oid) AS d FROM pg_constraint
        WHERE conname = 'claim_death_certificate_reviews_verdict_check' AND conrelid = 'public.claim_death_certificate_reviews'::regclass`,
    );
    expect(def.rows).toHaveLength(1);
    expect([...def.rows[0]!.d.matchAll(/'([a-z_]+)'::text/g)].map((m) => m[1]).sort()).toEqual(['accepted', 'rejected']);
    // `-246` §4 — the "verdict required" CHECK is `NOT VALID` BY DESIGN: enforced for new rows, ⛔ never validated
    // against rows written before 0123 (⛔ no backfill). A `VALIDATE` would fail on them — the catalog pins it.
    const req = await client.query<{ v: boolean }>(
      `SELECT convalidated AS v FROM pg_constraint
        WHERE conname = 'claim_death_certificate_uploads_parity_verdict_required_check' AND conrelid = 'public.claim_death_certificate_uploads'::regclass`,
    );
    expect(req.rows).toEqual([{ v: false }]);
  });

  it('a well-formed REJECTED review (each of the three reasons) is accepted', async () => {
    const { tx, client, claimCaseId, memberId, uploadId } = await seedClaimWithCertificate();
    for (const reason of schema.DEATH_CERTIFICATE_REJECTION_REASONS) {
      await client.query('SAVEPOINT ok');
      await tx.insert(schema.claimDeathCertificateReviews).values(review(claimCaseId, memberId, uploadId, { ...rejected, rejectionReason: reason }));
      await client.query('ROLLBACK TO SAVEPOINT ok');
    }
  });

  it('⭐ D1 — at most ONE live review per claim (23505)', async () => {
    const { tx, claimCaseId, memberId, uploadId } = await seedClaimWithCertificate();
    await tx.insert(schema.claimDeathCertificateReviews).values(review(claimCaseId, memberId, uploadId, rejected));
    await expect(tx.insert(schema.claimDeathCertificateReviews).values(review(claimCaseId, memberId, uploadId))).rejects.toSatisfy(
      (err: unknown) => pgCode(err) === '23505',
    );
  });

  it('a live review may be superseded, and a new live review then inserted (the writer’s path)', async () => {
    const { tx, claimCaseId, memberId, uploadId } = await seedClaimWithCertificate();
    const [first] = await tx.insert(schema.claimDeathCertificateReviews).values(review(claimCaseId, memberId, uploadId, rejected)).returning();
    await tx
      .update(schema.claimDeathCertificateReviews)
      .set({ supersededAt: new Date(), supersededReason: 're_reviewed' })
      .where(eq(schema.claimDeathCertificateReviews.reviewId, first!.reviewId));
    const [second] = await tx
      .insert(schema.claimDeathCertificateReviews)
      .values(review(claimCaseId, memberId, uploadId, { supersedesReviewId: first!.reviewId }))
      .returning();
    expect(second!.supersedesReviewId).toBe(first!.reviewId);
  });

  it('⭐ a storage key names exactly ONE upload (23505)', async () => {
    const { tx, claimCaseId, memberId, claimDocumentId, storageObjectKey } = await seedClaimWithCertificate();
    await expect(
      tx.insert(schema.claimDeathCertificateUploads).values(upload(claimCaseId, memberId, claimDocumentId, { storageObjectKey })),
    ).rejects.toSatisfy((err: unknown) => pgCode(err) === '23505');
  });

  it('⭐⭐ supersession is ONE-WAY: a superseded review is never revived or re-stamped (23000); the RTBF scrub still works', async () => {
    const { tx, client, claimCaseId, memberId, uploadId } = await seedClaimWithCertificate();
    const [r] = await tx.insert(schema.claimDeathCertificateReviews).values(review(claimCaseId, memberId, uploadId, rejected)).returning();
    const byId = eq(schema.claimDeathCertificateReviews.reviewId, r!.reviewId);
    await tx.update(schema.claimDeathCertificateReviews).set({ supersededAt: new Date(), supersededReason: 'replaced' }).where(byId);
    for (const [label, set] of [
      ['revived', { supersededAt: null, supersededReason: null }],
      ['re-stamped reason', { supersededReason: 're_reviewed' as const }],
      ['re-stamped instant', { supersededAt: new Date(Date.now() + 86_400_000) }],
    ] as const) {
      await client.query('SAVEPOINT ow');
      const err = await tx
        .update(schema.claimDeathCertificateReviews)
        .set(set as never)
        .where(byId)
        .then(
          () => undefined,
          (e: unknown) => e,
        );
      expect(pgCode(err), label).toBe('23000');
      await client.query('ROLLBACK TO SAVEPOINT ow');
    }
    await tx.update(schema.claimDeathCertificateReviews).set({ noteCiphertext: '[anonymized]' }).where(byId);
    const [row] = await tx.select().from(schema.claimDeathCertificateReviews).where(byId);
    expect(row!.noteCiphertext).toBe('[anonymized]');
    expect(row!.supersededReason).toBe('replaced');
  });

  it('⛔ twt_app cannot UPDATE an ungranted review column, nor ANY upload column (column-level grants, 42501)', async () => {
    const { tx, client, claimCaseId, memberId, uploadId } = await seedClaimWithCertificate();
    const [r] = await tx.insert(schema.claimDeathCertificateReviews).values(review(claimCaseId, memberId, uploadId, rejected)).returning();
    const legs: [string, () => Promise<unknown>][] = [
      ['review verdict', () => tx.update(schema.claimDeathCertificateReviews).set({ verdict: 'accepted' }).where(eq(schema.claimDeathCertificateReviews.reviewId, r!.reviewId))],
      ['review upload', () => tx.update(schema.claimDeathCertificateReviews).set({ uploadId: randomUUID() as never }).where(eq(schema.claimDeathCertificateReviews.reviewId, r!.reviewId))],
      ['review decided_by', () => tx.update(schema.claimDeathCertificateReviews).set({ decidedByDisplay: 'Someone Else' }).where(eq(schema.claimDeathCertificateReviews.reviewId, r!.reviewId))],
      ['upload key', () => tx.update(schema.claimDeathCertificateUploads).set({ storageObjectKey: 'k/other' }).where(eq(schema.claimDeathCertificateUploads.uploadId, uploadId as never))],
      ['upload uploaded_at', () => tx.update(schema.claimDeathCertificateUploads).set({ uploadedAt: new Date(0) }).where(eq(schema.claimDeathCertificateUploads.uploadId, uploadId as never))],
      // `-245` §1 — the kept verdict is written once, ⛔ never rewritten.
      ['upload parity verdict', () => tx.update(schema.claimDeathCertificateUploads).set({ parityOutcome: 'mismatch' }).where(eq(schema.claimDeathCertificateUploads.uploadId, uploadId as never))],
    ];
    for (const [label, attempt] of legs) {
      await client.query('SAVEPOINT g');
      const err = await attempt().then(
        () => undefined,
        (e: unknown) => e,
      );
      expect(pgCode(err), label).toBe('42501');
      await client.query('ROLLBACK TO SAVEPOINT g');
    }
  });

  it('twt_app CAN scrub the two review ciphertexts (the DPDPA-RTBF leg, D11)', async () => {
    const { tx, claimCaseId, memberId, uploadId } = await seedClaimWithCertificate();
    const [r] = await tx.insert(schema.claimDeathCertificateReviews).values(review(claimCaseId, memberId, uploadId)).returning();
    const byId = eq(schema.claimDeathCertificateReviews.reviewId, r!.reviewId);
    await tx.update(schema.claimDeathCertificateReviews).set({ acceptedDateCiphertext: '[anonymized]', noteCiphertext: '[anonymized]' }).where(byId);
    const [row] = await tx.select().from(schema.claimDeathCertificateReviews).where(byId);
    expect(row!.acceptedDateCiphertext).toBe('[anonymized]');
    expect(row!.noteCiphertext).toBe('[anonymized]');
  });

  it('⛔ twt_app holds no DELETE on either table (42501)', async () => {
    const { tx, client, claimCaseId, memberId, uploadId } = await seedClaimWithCertificate();
    const [r] = await tx.insert(schema.claimDeathCertificateReviews).values(review(claimCaseId, memberId, uploadId)).returning();
    await client.query('SAVEPOINT d');
    await expect(
      tx.delete(schema.claimDeathCertificateReviews).where(eq(schema.claimDeathCertificateReviews.reviewId, r!.reviewId)),
    ).rejects.toSatisfy((err: unknown) => pgCode(err) === '42501');
    await client.query('ROLLBACK TO SAVEPOINT d');
    await expect(
      tx.delete(schema.claimDeathCertificateUploads).where(eq(schema.claimDeathCertificateUploads.uploadId, uploadId as never)),
    ).rejects.toSatisfy((err: unknown) => pgCode(err) === '42501');
  });

  it('⭐⭐ the append-only TRIGGERS refuse the table OWNER too — ⛔ no certificate is overwritten or deleted (23000)', async () => {
    const { tx, client, claimCaseId, memberId, uploadId } = await seedClaimWithCertificate();
    const [r] = await tx.insert(schema.claimDeathCertificateReviews).values(review(claimCaseId, memberId, uploadId)).returning();
    await client.query('RESET ROLE'); // the Docker superuser — grants no longer protect the tables
    const legs: [string, string, unknown[]][] = [
      ['upload DELETE', 'DELETE FROM claim_death_certificate_uploads WHERE upload_id = $1', [uploadId]],
      ['upload UPDATE (the overwrite)', "UPDATE claim_death_certificate_uploads SET storage_object_key = 'k/overwritten' WHERE upload_id = $1", [uploadId]],
      ['review DELETE', 'DELETE FROM claim_death_certificate_reviews WHERE review_id = $1', [r!.reviewId]],
      ['review UPDATE verdict', "UPDATE claim_death_certificate_reviews SET verdict = 'rejected', rejection_reason = 'no_date_of_death', accepted_date_ciphertext = NULL WHERE review_id = $1", [r!.reviewId]],
      ['review UPDATE decided_at', "UPDATE claim_death_certificate_reviews SET decided_at = decided_at - interval '1 day' WHERE review_id = $1", [r!.reviewId]],
    ];
    for (const [label, text, args] of legs) {
      await client.query('SAVEPOINT t');
      const err = await client.query(text, args).then(
        () => undefined,
        (e: unknown) => e,
      );
      expect(pgCode(err), label).toBe('23000');
      await client.query('ROLLBACK TO SAVEPOINT t');
    }
  });

  it('⛔ TRUNCATE is refused on both tables (23000)', async () => {
    const { client } = getTx();
    for (const t of TABLES) {
      await client.query('SAVEPOINT tr');
      const err = await client.query(`TRUNCATE ${t} CASCADE`).then(
        () => undefined,
        (e: unknown) => e,
      );
      expect(pgCode(err), t).toBe('23000');
      await client.query('ROLLBACK TO SAVEPOINT tr');
    }
  });

  it('the `claims` ON DELETE cascade still removes both tables’ rows (pg_trigger_depth > 1 — the spec-cleanup path)', async () => {
    const { tx, client, claimCaseId, memberId, uploadId } = await seedClaimWithCertificate();
    await tx.insert(schema.claimDeathCertificateReviews).values(review(claimCaseId, memberId, uploadId));
    await client.query('RESET ROLE');
    await client.query('DELETE FROM claims WHERE claim_case_id = $1', [claimCaseId]);
    for (const t of TABLES) {
      const left = await client.query(`SELECT 1 FROM ${t} WHERE claim_case_id = $1`, [claimCaseId]);
      expect(left.rows, t).toEqual([]);
    }
  });

  it('⭐ D8 — the determination’s review FK is ON DELETE SET NULL (a cascade from the certificate row)', async () => {
    const { tx, client, claimCaseId, memberId, uploadId, claimDocumentId } = await seedClaimWithCertificate();
    const [r] = await tx.insert(schema.claimDeathCertificateReviews).values(review(claimCaseId, memberId, uploadId)).returning();
    const [d] = await tx
      .insert(schema.nomineeDeterminations)
      .values({
        claimCaseId: claimCaseId as never,
        pariwarId: PARIWAR_A,
        deceasedMemberId: memberId as never,
        certificateDateCiphertext: 'enc:v1:date',
        noteCiphertext: 'enc:v1:note',
        decidedByActorId: randomUUID(),
        decidedByDisplay: 'Test District Admin',
        deathCertificateReviewId: r!.reviewId,
      })
      .returning();
    expect(d!.deathCertificateReviewId).toBe(r!.reviewId);
    await client.query('RESET ROLE');
    await client.query('DELETE FROM claim_documents WHERE claim_document_id = $1', [claimDocumentId]);
    const after = await client.query<{ id: string | null }>(
      'SELECT death_certificate_review_id AS id FROM nominee_determinations WHERE determination_id = $1',
      [d!.determinationId],
    );
    expect(after.rows).toEqual([{ id: null }]);
  });

  it('⛔ twt_app cannot rewrite a determination’s review link (no UPDATE grant on it, 42501)', async () => {
    const { tx, claimCaseId, memberId, uploadId } = await seedClaimWithCertificate();
    const [r] = await tx.insert(schema.claimDeathCertificateReviews).values(review(claimCaseId, memberId, uploadId)).returning();
    const [d] = await tx
      .insert(schema.nomineeDeterminations)
      .values({
        claimCaseId: claimCaseId as never,
        pariwarId: PARIWAR_A,
        deceasedMemberId: memberId as never,
        certificateDateCiphertext: 'enc:v1:date',
        noteCiphertext: 'enc:v1:note',
        decidedByActorId: randomUUID(),
        decidedByDisplay: 'Test District Admin',
      })
      .returning();
    await expect(
      tx
        .update(schema.nomineeDeterminations)
        .set({ deathCertificateReviewId: r!.reviewId })
        .where(eq(schema.nomineeDeterminations.determinationId, d!.determinationId)),
    ).rejects.toSatisfy((err: unknown) => pgCode(err) === '42501');
  });
});
