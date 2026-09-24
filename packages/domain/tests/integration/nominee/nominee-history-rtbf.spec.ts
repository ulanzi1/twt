// RTBF over the nominee declaration HISTORY — live DB (:5433). Story 6.20 (Task 6 / Task 9; D11, AC9,
// AC11, invariant 7).
//
// ⭐ "A history that keeps PII must be erasable." Seeds every PII-bearing row the story adds — declared
// versions (and a tombstone), a determination on the deceased (certificate date + note) and a correction
// with every note filled — each with a DISTINCTIVE ciphertext, runs the real `anonymizeMember`, and asserts
// that ⛔ NOT ONE of those ciphertexts survives anywhere in the three tables, while the governance history
// (the rows, the marks, the steps) is RETAINED. ⚠ The sentinels DECRYPT to the RTBF sentinel — proving the
// scrub wrote real envelopes under the right field classes, ⛔ not garbage.

import { randomUUID } from 'node:crypto';

import { eq } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';

import { decryptTier1, encryptTier1, parseEnvelope, serializeEnvelope } from '../../../src/encryption/envelope.js';
import { createFakeKmsProvider } from '../../../src/encryption/index.js';
import { memberId as toMemberId, claimId as toClaimId } from '../../../src/ids/index.js';
import { ANONYMIZED_SENTINEL, anonymizeMember } from '../../../src/member/anonymize.js';
import * as schema from '../../../src/schema/index.js';
import { getTx, hasDatabase, setupLiveDb } from '../../../src/test-utils/integration-setup.js';
import { PARIWAR_A, enterAppScope, seedClaim, seedMember, seedNomineeDeclaration } from '../_helpers.js';

const kms = createFakeKmsProvider({ kekBytes: new Uint8Array(32).fill(7), hmacKeyBytes: new Uint8Array(32).fill(9) });
const kekRef = { resourceName: 'fake:rtbf-6-20-kek' };

async function dec(serialized: string, fieldClass: string): Promise<string> {
  return Buffer.from(await decryptTier1(parseEnvelope(serialized), { pariwarId: PARIWAR_A, fieldClass }, kms, kekRef)).toString('utf-8');
}
async function encr(value: string, fieldClass: string): Promise<string> {
  return serializeEnvelope(await encryptTier1(Buffer.from(value, 'utf-8'), { pariwarId: PARIWAR_A, fieldClass }, kms, kekRef));
}

describe.skipIf(!hasDatabase)('Story 6.20 — RTBF over the nominee history (:5433)', { timeout: 20000 }, () => {
  setupLiveDb();

  it('⭐⭐ no nominee-history ciphertext survives an erasure; the governance rows are retained', async () => {
    const { client, tx } = getTx();
    const mid = await seedMember(tx, PARIWAR_A, { state: 'active' });
    const cid = await seedClaim(tx, PARIWAR_A, { deceasedMemberId: mid, currentState: 'verification_in_progress' });
    await enterAppScope(client, PARIWAR_A);

    const name = await encr('ZZ-NOMINEE-NAME', 'member_nominee');
    const mobile = await encr('ZZ-NOMINEE-MOBILE', 'member_nominee');
    const address = await encr('ZZ-NOMINEE-ADDRESS', 'member_nominee');
    await seedNomineeDeclaration(tx, PARIWAR_A, mid, {
      nominees: [{ nameCiphertext: name, mobileCiphertext: mobile, addressCiphertext: address }, {}],
      ensureMember: false,
    });
    await seedNomineeDeclaration(tx, PARIWAR_A, mid, { ensureMember: false }); // 2 → 1: a TOMBSTONE for rank 2
    const versions = await tx.select().from(schema.memberNomineeVersions).where(eq(schema.memberNomineeVersions.memberId, toMemberId(mid)));
    const target = versions.find((v) => v.rank === 1 && v.versionNo === 1)!;

    const date = await encr('ZZ-2026-05-01', 'nominee_determination');
    const note = await encr('ZZ-DETERMINATION-NOTE', 'nominee_determination');
    await tx.insert(schema.nomineeDeterminations).values({
      claimCaseId: toClaimId(cid),
      pariwarId: PARIWAR_A,
      deceasedMemberId: toMemberId(mid),
      certificateDateCiphertext: date,
      noteCiphertext: note,
      decidedByActorId: randomUUID(),
      decidedByDisplay: 'Anita',
    });
    const raiseNote = await encr('ZZ-RAISE-NOTE', 'nominee_correction');
    const daNote = await encr('ZZ-DA-NOTE', 'nominee_correction');
    const pName = await encr('ZZ-PROPOSED-NAME', 'member_nominee');
    const pMobile = await encr('ZZ-PROPOSED-MOBILE', 'member_nominee');
    const pAddress = await encr('ZZ-PROPOSED-ADDRESS', 'member_nominee');
    await tx.insert(schema.nomineeCorrections).values({
      claimCaseId: toClaimId(cid),
      pariwarId: PARIWAR_A,
      memberId: toMemberId(mid),
      rank: 1,
      targetVersionId: target.versionId,
      proposedNameCiphertext: pName,
      proposedRelationship: 'spouse',
      proposedMobileCiphertext: pMobile,
      proposedAddressCiphertext: pAddress,
      raisedVia: 'helpline',
      raisedByActorId: randomUUID(),
      raiseNoteCiphertext: raiseNote,
      step: 'pa_pending', // DA decided, PA not yet — the PA note must STAY null
      daActorId: randomUUID(),
      daDisplay: 'Anita',
      daNoteCiphertext: daNote,
      daDecidedAt: new Date(),
    });

    await anonymizeMember(tx, { kms, kekRef }, { memberId: toMemberId(mid), pariwarId: PARIWAR_A });

    const dump = JSON.stringify(
      await client.query(
        `SELECT v.*, d.*, c.* FROM member_nominee_versions v
           LEFT JOIN nominee_determinations d ON d.deceased_member_id = v.member_id
           LEFT JOIN nominee_corrections c ON c.member_id = v.member_id
          WHERE v.member_id = $1`,
        [mid],
      ).then((r) => r.rows),
    );
    for (const ct of [name, mobile, address, date, note, raiseNote, daNote, pName, pMobile, pAddress]) {
      expect(dump.includes(ct), 'an original ciphertext survived the erasure').toBe(false);
    }

    const after = await tx.select().from(schema.memberNomineeVersions).where(eq(schema.memberNomineeVersions.memberId, toMemberId(mid)));
    // ⭐ RETAINED: every version row, tombstone included (⛔ nothing deleted — invariant 2).
    expect(after).toHaveLength(versions.length);
    const tombstone = after.find((v) => v.kind === 'vacated')!;
    expect(tombstone.nameCiphertext).toBeNull(); // untouched — it held nothing
    for (const v of after.filter((x) => x.kind === 'declared')) {
      expect(await dec(v.nameCiphertext!, 'member_nominee')).toBe(ANONYMIZED_SENTINEL);
      expect(await dec(v.mobileCiphertext!, 'member_nominee')).toBe(ANONYMIZED_SENTINEL);
      expect(v.addressCiphertext).toBeNull();
    }
    const [d] = await tx.select().from(schema.nomineeDeterminations).where(eq(schema.nomineeDeterminations.claimCaseId, toClaimId(cid)));
    expect(await dec(d!.certificateDateCiphertext, 'nominee_determination')).toBe(ANONYMIZED_SENTINEL);
    expect(await dec(d!.noteCiphertext, 'nominee_determination')).toBe(ANONYMIZED_SENTINEL);
    const [c] = await tx.select().from(schema.nomineeCorrections).where(eq(schema.nomineeCorrections.claimCaseId, toClaimId(cid)));
    expect(c!.step).toBe('pa_pending'); // governance history kept
    expect(c!.paNoteCiphertext).toBeNull(); // an undecided step's note stays null (the coherence CHECK)
    expect(await dec(c!.daNoteCiphertext!, 'nominee_correction')).toBe(ANONYMIZED_SENTINEL);
    expect(await dec(c!.proposedNameCiphertext, 'member_nominee')).toBe(ANONYMIZED_SENTINEL);
    expect(await dec(c!.proposedMobileCiphertext, 'member_nominee')).toBe(ANONYMIZED_SENTINEL);
    expect(c!.proposedAddressCiphertext).toBeNull();
    expect(await dec(c!.raiseNoteCiphertext, 'nominee_correction')).toBe(ANONYMIZED_SENTINEL);
  });

  it('⭐ an APPLIED correction is erased too: its decided Pariwar Admin note and the `correction`-sourced version it wrote', async () => {
    const { client, tx } = getTx();
    const mid = await seedMember(tx, PARIWAR_A, { state: 'active' });
    const cid = await seedClaim(tx, PARIWAR_A, { deceasedMemberId: mid, currentState: 'verification_in_progress' });
    await enterAppScope(client, PARIWAR_A);
    await seedNomineeDeclaration(tx, PARIWAR_A, mid, { ensureMember: false });
    const [target] = await tx.select().from(schema.memberNomineeVersions).where(eq(schema.memberNomineeVersions.memberId, toMemberId(mid)));

    // The version a Pariwar Admin's approval wrote (source = correction, inheriting the target's position).
    const cName = await encr('ZZ-CORRECTED-NAME', 'member_nominee');
    const cMobile = await encr('ZZ-CORRECTED-MOBILE', 'member_nominee');
    const cAddress = await encr('ZZ-CORRECTED-ADDRESS', 'member_nominee');
    const [applied] = await tx
      .insert(schema.memberNomineeVersions)
      .values({
        memberId: toMemberId(mid),
        pariwarId: PARIWAR_A,
        rank: 1,
        versionNo: 2,
        declarationId: randomUUID(),
        kind: 'declared',
        source: 'correction',
        nameCiphertext: cName,
        relationship: 'spouse',
        mobileCiphertext: cMobile,
        addressCiphertext: cAddress,
        splitPct: target!.splitPct,
        recordedAt: new Date(target!.recordedAt.getTime() + 86_400_000),
        effectiveAt: target!.effectiveAt,
        correctsVersionId: target!.versionId,
      })
      .returning();
    const paNote = await encr('ZZ-PA-NOTE', 'nominee_correction');
    const daNote = await encr('ZZ-DA-NOTE-2', 'nominee_correction');
    const raiseNote2 = await encr('ZZ-RAISE-2', 'nominee_correction');
    await tx.insert(schema.nomineeCorrections).values({
      claimCaseId: toClaimId(cid),
      pariwarId: PARIWAR_A,
      memberId: toMemberId(mid),
      rank: 1,
      targetVersionId: target!.versionId,
      proposedNameCiphertext: cName,
      proposedRelationship: 'spouse',
      proposedMobileCiphertext: cMobile,
      proposedAddressCiphertext: cAddress,
      raisedVia: 'member_app',
      raisedByActorId: randomUUID(),
      raiseNoteCiphertext: raiseNote2,
      step: 'applied',
      daActorId: randomUUID(),
      daDisplay: 'Anita',
      daNoteCiphertext: daNote,
      daDecidedAt: new Date(),
      paActorId: randomUUID(),
      paDisplay: 'Kalpana',
      paNoteCiphertext: paNote,
      paDecidedAt: new Date(),
      appliedVersionId: applied!.versionId,
    });

    const dumpNow = async () =>
      JSON.stringify(
        await client
          .query('SELECT v.*, c.* FROM member_nominee_versions v LEFT JOIN nominee_corrections c ON c.member_id = v.member_id WHERE v.member_id = $1', [mid])
          .then((r) => r.rows),
      );
    // ⭐ POSITIVE CONTROL for the raw sweep below (review 2026-09-24c): BEFORE the scrub every ciphertext IS in
    // the dump — so its absence afterwards is the scrub, ⛔ not a column the dump never carried.
    const before = await dumpNow();
    for (const ct of [cName, cMobile, cAddress, paNote, daNote, raiseNote2]) expect(before.includes(ct)).toBe(true);

    await anonymizeMember(tx, { kms, kekRef }, { memberId: toMemberId(mid), pariwarId: PARIWAR_A });

    const [v] = await tx.select().from(schema.memberNomineeVersions).where(eq(schema.memberNomineeVersions.versionId, applied!.versionId));
    expect(v!.source).toBe('correction'); // the row is RETAINED …
    expect(await dec(v!.nameCiphertext!, 'member_nominee')).toBe(ANONYMIZED_SENTINEL); // … its PII is not
    expect(await dec(v!.mobileCiphertext!, 'member_nominee')).toBe(ANONYMIZED_SENTINEL);
    expect(v!.addressCiphertext).toBeNull();
    const [c] = await tx.select().from(schema.nomineeCorrections).where(eq(schema.nomineeCorrections.claimCaseId, toClaimId(cid)));
    expect(c!.step).toBe('applied');
    // ⭐ The CASE branch for a DECIDED Pariwar Admin note — ⛔ never reached by an undecided fixture.
    expect(await dec(c!.paNoteCiphertext!, 'nominee_correction')).toBe(ANONYMIZED_SENTINEL);
    expect(await dec(c!.daNoteCiphertext!, 'nominee_correction')).toBe(ANONYMIZED_SENTINEL);
    // ⭐ …and the APPLIED row's raise note (code review 2026-09-24b: `ZZ-RAISE-2` was seeded, never checked).
    expect(await dec(c!.raiseNoteCiphertext, 'nominee_correction')).toBe(ANONYMIZED_SENTINEL);
    const dump = await dumpNow();
    // ⭐ The raise note too — decrypt-checked above AND swept raw here (adversarial review 2026-09-24b).
    for (const ct of [cName, cMobile, cAddress, paNote, daNote, raiseNote2]) expect(dump.includes(ct)).toBe(false);
  });
});
