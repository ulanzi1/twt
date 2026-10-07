// Story 6.26a — RTBF over the inspector's record of the date and time of death (Task 6; GI13; AC11). The two Tier-1
// ciphertexts are overwritten with the sentinel and the date's blind index NULLed, AS `twt_app` under the scope, on the
// DECEASED member's claims — and the erasure SUCCEEDS on a claim carrying a COMPLETED inspection (0147's NOT VALID
// completed-row CHECK is re-checked on every row the UPDATE rewrites: it must ⛔ never require the NULLed index).

import { randomUUID } from 'node:crypto';

import { eq } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';

import { decryptTier1, parseEnvelope } from '../../../src/encryption/envelope.js';
import { createFakeKmsProvider } from '../../../src/encryption/index.js';
import { claimId as toClaimId, memberId as toMemberId } from '../../../src/ids/index.js';
import { ANONYMIZED_SENTINEL, anonymizeMember } from '../../../src/member/anonymize.js';
import { addGroundInspectionPhoto, completeGroundInspection, scheduleGroundInspection } from '../../../src/claim/index.js';
import * as schema from '../../../src/schema/index.js';
import { getTx, hasDatabase, setupLiveDb } from '../../../src/test-utils/integration-setup.js';
import { PARIWAR_A, driveClaimTo, enterAppScope, seedDeathCertificate, seedMember } from '../_helpers.js';

const kms = createFakeKmsProvider({ kekBytes: new Uint8Array(32).fill(7), hmacKeyBytes: new Uint8Array(32).fill(9) });
const kekRef = { resourceName: 'fake:rtbf-6-26a-kek' };
const INSPECTOR = '9b9b9b9b-0000-4000-8000-000000000001';

async function dec(serialized: string): Promise<string> {
  return Buffer.from(
    await decryptTier1(parseEnvelope(serialized), { pariwarId: PARIWAR_A, fieldClass: 'ground_inspection' }, kms, kekRef),
  ).toString('utf-8');
}

describe.skipIf(!hasDatabase)('Story 6.26a — RTBF over the inspection\'s date and time of death (:5433)', { timeout: 20000 }, () => {
  setupLiveDb();

  it('⭐⭐ the erasure of a deceased whose claim carries a COMPLETED inspection SUCCEEDS (⛔ 23514); date + time → sentinel, index → NULL; the non-PII record kept; a still-scheduled assignment untouched', async () => {
    const { client, tx } = getTx();
    const mid = await seedMember(tx, PARIWAR_A, { state: 'active' });
    await enterAppScope(client, PARIWAR_A);
    const cid = toClaimId(randomUUID());
    await driveClaimTo(client, PARIWAR_A, cid, mid, 'verification_in_progress');
    const { uploadId } = await seedDeathCertificate(client, { pariwarId: PARIWAR_A, claimCaseId: cid });
    const schedule = () =>
      scheduleGroundInspection(client, {
        claimCaseId: cid, pariwarId: PARIWAR_A, district: 'Patna', inspectionStage: 'initial', inspectionSiteType: 'family_residence',
        inspectorActorId: INSPECTOR, scheduledAt: new Date(), scheduledByActor: INSPECTOR, idempotencyKey: randomUUID(),
      });
    const done = (await schedule()).groundInspection.groundInspectionId;
    const open = (await schedule()).groundInspection.groundInspectionId;
    await addGroundInspectionPhoto(client, {
      pariwarId: PARIWAR_A, groundInspectionId: done, actingActorId: INSPECTOR,
      storageObjectKey: `k-${randomUUID()}`, contentType: 'image/jpeg', byteSize: 1, photoKind: 'original_certificate',
      comparedCertificateUploadId: uploadId,
    });
    await completeGroundInspection(client, {
      pariwarId: PARIWAR_A, groundInspectionId: done, actingActorId: INSPECTOR, originalCertificateVerdict: 'does_not_match',
      comparedCertificateUploadId: uploadId,
      deathDate: { plaintext: '2026-06-01', ciphertext: 'enc:v1:ZZ-DEATH-DATE', index: 'ZZ-DATE-INDEX', source: 'family_statement' },
      deathTime: { plaintext: '14:30', ciphertext: 'enc:v1:ZZ-DEATH-TIME' },
    });

    await anonymizeMember(tx, { kms, kekRef }, { memberId: toMemberId(mid), pariwarId: PARIWAR_A });

    const dump = JSON.stringify((await client.query('SELECT * FROM claim_ground_inspections WHERE claim_case_id = $1', [cid])).rows);
    for (const leaked of ['ZZ-DEATH-DATE', 'ZZ-DEATH-TIME', 'ZZ-DATE-INDEX']) expect(dump.includes(leaked), leaked).toBe(false);
    const rows = await tx.select().from(schema.claimGroundInspections).where(eq(schema.claimGroundInspections.claimCaseId, cid));
    const completed = rows.find((r) => r.groundInspectionId === done)!;
    expect(await dec(completed.deathDateCiphertext!)).toBe(ANONYMIZED_SENTINEL);
    expect(await dec(completed.deathTimeCiphertext!)).toBe(ANONYMIZED_SENTINEL);
    expect(completed).toMatchObject({
      status: 'completed',
      deathDateIndex: null,
      // The non-PII record is governance history, kept.
      originalCertificateVerdict: 'does_not_match',
      comparedCertificateUploadId: uploadId,
      deathDateSource: 'family_statement',
    });
    // A still-scheduled assignment has ⛔ no date — the scrub's `WHERE` never touches it.
    expect(rows.find((r) => r.groundInspectionId === open)).toMatchObject({ status: 'scheduled', deathDateCiphertext: null, deathTimeCiphertext: null });
  });
});
