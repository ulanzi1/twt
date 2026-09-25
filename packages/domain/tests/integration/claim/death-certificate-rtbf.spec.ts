// RTBF over the death-certificate REVIEWS — live DB (:5433). Story 6.21a (Task 7; D11, AC6).
//
// Seeds a claim's two reviews on one upload — an ACCEPTED one (date + note) superseded by a REJECTED one (note,
// ⛔ no date) — each with a DISTINCTIVE ciphertext, runs the real `anonymizeMember` on the DECEASED member, and
// asserts that ⛔ neither date nor note survives, while:
//   · the rejected review's date STAYS NULL (the verdict-coherence CHECK — an unconditional scrub would fail
//     the whole erasure);
//   · the governance history is RETAINED (verdicts, reason, attribution, the supersession chain);
//   · ⭐ the CERTIFICATE itself is ⛔ NOT erased — by ruling (`2026-09-25-243`, option C): its upload row and its
//     key are untouched.
// ⚠ The sentinels DECRYPT to the RTBF sentinel under the right field class — real envelopes, ⛔ not garbage.

import { eq } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';

import { decryptTier1, encryptTier1, parseEnvelope, serializeEnvelope } from '../../../src/encryption/envelope.js';
import { createFakeKmsProvider } from '../../../src/encryption/index.js';
import { memberId as toMemberId, claimId as toClaimId } from '../../../src/ids/index.js';
import { ANONYMIZED_SENTINEL, anonymizeMember } from '../../../src/member/anonymize.js';
import * as schema from '../../../src/schema/index.js';
import { getTx, hasDatabase, setupLiveDb } from '../../../src/test-utils/integration-setup.js';
import { PARIWAR_A, enterAppScope, seedClaim, seedDeathCertificate, seedMember } from '../_helpers.js';

const kms = createFakeKmsProvider({ kekBytes: new Uint8Array(32).fill(7), hmacKeyBytes: new Uint8Array(32).fill(9) });
const kekRef = { resourceName: 'fake:rtbf-6-21a-kek' };
const FIELD = 'death_certificate_review';

async function dec(serialized: string): Promise<string> {
  return Buffer.from(await decryptTier1(parseEnvelope(serialized), { pariwarId: PARIWAR_A, fieldClass: FIELD }, kms, kekRef)).toString('utf-8');
}
async function encr(value: string): Promise<string> {
  return serializeEnvelope(await encryptTier1(Buffer.from(value, 'utf-8'), { pariwarId: PARIWAR_A, fieldClass: FIELD }, kms, kekRef));
}

describe.skipIf(!hasDatabase)('Story 6.21a — RTBF over the death-certificate reviews (:5433)', { timeout: 20000 }, () => {
  setupLiveDb();

  it('⭐⭐ ⛔ no review date or note survives an erasure; the rejected date stays NULL; the reviews AND the certificate are retained', async () => {
    const { client, tx } = getTx();
    const mid = await seedMember(tx, PARIWAR_A, { state: 'active' });
    const cid = await seedClaim(tx, PARIWAR_A, { deceasedMemberId: mid, currentState: 'verifier_review' });
    await enterAppScope(client, PARIWAR_A);
    const cert = await seedDeathCertificate(client, { pariwarId: PARIWAR_A, claimCaseId: cid });

    const date = await encr('ZZ-2026-05-01');
    const acceptNote = await encr('ZZ-ACCEPT-NOTE');
    const rejectNote = await encr('ZZ-REJECT-NOTE');
    const base = {
      claimCaseId: toClaimId(cid),
      pariwarId: PARIWAR_A,
      deceasedMemberId: toMemberId(mid),
      uploadId: cert.uploadId as never,
      decidedByActorId: 'd1d1d1d1-d1d1-d1d1-d1d1-d1d1d1d1d1d1',
      decidedByDisplay: 'Anita',
    };
    const [accepted] = await tx
      .insert(schema.claimDeathCertificateReviews)
      .values({ ...base, verdict: 'accepted', acceptedDateCiphertext: date, noteCiphertext: acceptNote })
      .returning();
    await tx
      .update(schema.claimDeathCertificateReviews)
      .set({ supersededAt: new Date(), supersededReason: 're_reviewed' })
      .where(eq(schema.claimDeathCertificateReviews.reviewId, accepted!.reviewId));
    await tx.insert(schema.claimDeathCertificateReviews).values({
      ...base,
      verdict: 'rejected',
      rejectionReason: 'date_of_death_unclear',
      acceptedDateCiphertext: null,
      noteCiphertext: rejectNote,
      supersedesReviewId: accepted!.reviewId,
    });

    await anonymizeMember(tx, { kms, kekRef }, { memberId: toMemberId(mid), pariwarId: PARIWAR_A });

    const dump = JSON.stringify(
      (await client.query('SELECT * FROM claim_death_certificate_reviews WHERE claim_case_id = $1', [cid])).rows,
    );
    for (const ct of [date, acceptNote, rejectNote]) {
      expect(dump.includes(ct), 'an original ciphertext survived the erasure').toBe(false);
    }
    const rows = await tx
      .select()
      .from(schema.claimDeathCertificateReviews)
      .where(eq(schema.claimDeathCertificateReviews.claimCaseId, toClaimId(cid)));
    expect(rows).toHaveLength(2); // ⭐ RETAINED — ⛔ nothing deleted
    const acc = rows.find((r) => r.verdict === 'accepted')!;
    const rej = rows.find((r) => r.verdict === 'rejected')!;
    expect(await dec(acc.acceptedDateCiphertext!)).toBe(ANONYMIZED_SENTINEL);
    expect(await dec(acc.noteCiphertext)).toBe(ANONYMIZED_SENTINEL);
    expect(await dec(rej.noteCiphertext)).toBe(ANONYMIZED_SENTINEL);
    expect(rej.acceptedDateCiphertext).toBeNull(); // the coherence CHECK
    // Governance history kept: the verdicts, the reason, who, and the chain.
    expect(acc.supersededReason).toBe('re_reviewed');
    expect(rej.rejectionReason).toBe('date_of_death_unclear');
    expect(rej.supersedesReviewId).toBe(acc.reviewId);
    expect(rej.decidedByDisplay).toBe('Anita');
    // ⭐ `-243` — the CERTIFICATE is ⛔ not erased: its upload row and object key are untouched.
    const [upload] = await tx
      .select()
      .from(schema.claimDeathCertificateUploads)
      .where(eq(schema.claimDeathCertificateUploads.uploadId, cert.uploadId as never));
    expect(upload!.storageObjectKey).toBe(cert.storageObjectKey);
  });
});
