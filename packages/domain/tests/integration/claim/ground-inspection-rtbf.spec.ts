// Story 6.26a — RTBF over the inspector's record of the date and time of death (Task 6; GI13; AC11). The two Tier-1
// ciphertexts are overwritten with the sentinel and the date's blind index NULLed, AS `twt_app` under the scope, on the
// DECEASED member's claims — and the erasure SUCCEEDS on a claim carrying a COMPLETED inspection (0147's NOT VALID
// completed-row CHECK is re-checked on every row the UPDATE rewrites: it must ⛔ never require the NULLed index).
// ⭐ Story 6.27d (PM17 d's half, AC8) — the inspector's re-ask NOTES are scrubbed in the same block (0160's erasure arm
// admits exactly that), and the showing (⛔ PII) is untouched.

import { randomUUID } from 'node:crypto';

import { eq } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';

import { decryptTier1, parseEnvelope } from '../../../src/encryption/envelope.js';
import { createFakeKmsProvider } from '../../../src/encryption/index.js';
import { claimId as toClaimId, memberId as toMemberId } from '../../../src/ids/index.js';
import { ANONYMIZED_SENTINEL, anonymizeMember } from '../../../src/member/anonymize.js';
import {
  addGroundInspectionPhoto,
  completeGroundInspection,
  recordInspectionDiscrepancyNote,
  recordInspectionDiscrepancyShowing,
  scheduleGroundInspection,
} from '../../../src/claim/index.js';
import { bindScopedDb } from '../../../src/db.js';
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

  it('⭐ Story 6.27d (PM17 d): the re-ask note → sentinel (the 0160 erasure arm admits the scrub); the showing untouched', async () => {
    const { client, tx } = getTx();
    const mid = await seedMember(tx, PARIWAR_A, { state: 'active' });
    await enterAppScope(client, PARIWAR_A);
    const cid = toClaimId(randomUUID());
    await driveClaimTo(client, PARIWAR_A, cid, mid, 'verification_in_progress');
    const { uploadId } = await seedDeathCertificate(client, { pariwarId: PARIWAR_A, claimCaseId: cid });
    const gid = (
      await scheduleGroundInspection(client, {
        claimCaseId: cid, pariwarId: PARIWAR_A, district: 'Patna', inspectionStage: 'initial', inspectionSiteType: 'family_residence',
        inspectorActorId: INSPECTOR, scheduledAt: new Date(), scheduledByActor: INSPECTOR, idempotencyKey: randomUUID(),
      })
    ).groundInspection.groundInspectionId;
    await addGroundInspectionPhoto(client, {
      pariwarId: PARIWAR_A, groundInspectionId: gid, actingActorId: INSPECTOR,
      storageObjectKey: `k-${randomUUID()}`, contentType: 'image/jpeg', byteSize: 1, photoKind: 'original_certificate',
      comparedCertificateUploadId: uploadId,
    });
    await completeGroundInspection(client, {
      pariwarId: PARIWAR_A, groundInspectionId: gid, actingActorId: INSPECTOR, originalCertificateVerdict: 'matches',
      comparedCertificateUploadId: uploadId,
      deathDate: { plaintext: '2026-06-01', ciphertext: 'enc:v1:ZZ-DEATH-DATE', index: 'ZZ-DATE-INDEX', source: 'family_statement' },
    });
    await recordInspectionDiscrepancyShowing(bindScopedDb(client), { pariwarId: PARIWAR_A, groundInspectionId: gid, questionKeys: ['has_died'] });
    await recordInspectionDiscrepancyNote(client, {
      pariwarId: PARIWAR_A, groundInspectionId: gid, actingActorId: INSPECTOR, questionKey: 'has_died',
      noteCiphertext: 'enc:v1:ZZ-RETOLD-ACCOUNT', authorDisplay: 'Inspector One',
    });
    const showing = async () =>
      (await client.query('SELECT question_keys, shown_at FROM claim_ground_inspection_discrepancy_showings WHERE ground_inspection_id = $1', [gid])).rows;
    const before = await showing();

    await anonymizeMember(tx, { kms, kekRef }, { memberId: toMemberId(mid), pariwarId: PARIWAR_A });

    const notes = (await client.query<{ note_ciphertext: string; author_display: string; question_key: string }>(
      'SELECT note_ciphertext, author_display, question_key FROM claim_ground_inspection_discrepancy_notes WHERE ground_inspection_id = $1',
      [gid],
    )).rows;
    expect(notes).toHaveLength(1);
    expect(notes[0]!.note_ciphertext.includes('ZZ-RETOLD-ACCOUNT')).toBe(false);
    expect(await dec(notes[0]!.note_ciphertext)).toBe(ANONYMIZED_SENTINEL);
    // The staff attribution and the key are kept (staff data / ⛔ PII); the showing is untouched.
    expect(notes[0]).toMatchObject({ author_display: 'Inspector One', question_key: 'has_died' });
    expect(await showing()).toEqual(before);
  });

  it('⭐ Story 6.32 (AC9; second review S8): a ③ / ④ showing and its notes are ADMITTED (0188 widened 0160\'s CHECKs), and the erasure scrubs a ③ / ④ note', async () => {
    const { client, tx } = getTx();
    const mid = await seedMember(tx, PARIWAR_A, { state: 'active' });
    await enterAppScope(client, PARIWAR_A);
    const cid = toClaimId(randomUUID());
    await driveClaimTo(client, PARIWAR_A, cid, mid, 'verification_in_progress');
    const { uploadId } = await seedDeathCertificate(client, { pariwarId: PARIWAR_A, claimCaseId: cid });
    const gid = (
      await scheduleGroundInspection(client, {
        claimCaseId: cid, pariwarId: PARIWAR_A, district: 'Patna', inspectionStage: 'initial', inspectionSiteType: 'family_residence',
        inspectorActorId: INSPECTOR, scheduledAt: new Date(), scheduledByActor: INSPECTOR, idempotencyKey: randomUUID(),
      })
    ).groundInspection.groundInspectionId;
    await addGroundInspectionPhoto(client, {
      pariwarId: PARIWAR_A, groundInspectionId: gid, actingActorId: INSPECTOR,
      storageObjectKey: `k-${randomUUID()}`, contentType: 'image/jpeg', byteSize: 1, photoKind: 'original_certificate',
      comparedCertificateUploadId: uploadId,
    });
    await completeGroundInspection(client, {
      pariwarId: PARIWAR_A, groundInspectionId: gid, actingActorId: INSPECTOR, originalCertificateVerdict: 'matches',
      comparedCertificateUploadId: uploadId,
      deathDate: { plaintext: '2026-06-01', ciphertext: 'enc:v1:ZZ-DEATH-DATE', index: 'ZZ-DATE-INDEX', source: 'family_statement' },
    });
    await recordInspectionDiscrepancyShowing(bindScopedDb(client), {
      pariwarId: PARIWAR_A,
      groundInspectionId: gid,
      questionKeys: ['death_cause', 'death_illness'],
    });
    for (const questionKey of ['death_cause', 'death_illness'] as const) {
      await recordInspectionDiscrepancyNote(client, {
        pariwarId: PARIWAR_A, groundInspectionId: gid, actingActorId: INSPECTOR, questionKey,
        noteCiphertext: `enc:v1:ZZ-RETOLD-${questionKey}`, authorDisplay: 'Inspector One',
      });
    }

    await anonymizeMember(tx, { kms, kekRef }, { memberId: toMemberId(mid), pariwarId: PARIWAR_A });

    const notes = (await client.query<{ note_ciphertext: string; question_key: string }>(
      'SELECT note_ciphertext, question_key FROM claim_ground_inspection_discrepancy_notes WHERE ground_inspection_id = $1 ORDER BY question_key',
      [gid],
    )).rows;
    expect(notes.map((n) => n.question_key)).toEqual(['death_cause', 'death_illness']);
    for (const n of notes) {
      expect(n.note_ciphertext.includes('ZZ-RETOLD'), n.question_key).toBe(false);
      expect(await dec(n.note_ciphertext)).toBe(ANONYMIZED_SENTINEL);
    }
  });
});
