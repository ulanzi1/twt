// Story 6.39a (AC11) — RTBF over the bank-date record's note. Live DB, as `twt_app` (the column grant + the per-command
// UPDATE policy — without the policy the scrub matches 0 rows under FORCE RLS, the 6.23a trap; the guard leaves
// `note_ciphertext` out of its frozen list, so the write is allowed).
//
// The record itself — the bank date, the reason, the payment it names, who recorded it and its supersession — is
// governance history, KEPT. The note is REQUIRED, so every row is scrubbed (⛔ a row filter).

import { randomUUID } from 'node:crypto';

import { describe, expect, it } from 'vitest';

import { decryptTier1, encryptTier1, parseEnvelope, serializeEnvelope } from '../../../src/encryption/envelope.js';
import { CLAIM_FEE_BANK_DATE_FIELD_CLASS, createFakeKmsProvider } from '../../../src/encryption/index.js';
import { memberId as toMemberId, type PariwarId } from '../../../src/ids/index.js';
import { ANONYMIZED_SENTINEL, anonymizeMember } from '../../../src/member/anonymize.js';
import * as schema from '../../../src/schema/index.js';
import { getTx, hasDatabase, setupLiveDb } from '../../../src/test-utils/integration-setup.js';
import { PARIWAR_A, enterAppScope, seedMember } from '../_helpers.js';
import { claimAt } from './_one-payment-fixtures.js';

const kms = createFakeKmsProvider({ kekBytes: new Uint8Array(32).fill(7), hmacKeyBytes: new Uint8Array(32).fill(9) });
const kekRef = { resourceName: 'fake:rtbf-6-39a-kek' };
const PID = PARIWAR_A as PariwarId;

const field = { pariwarId: PID, fieldClass: CLAIM_FEE_BANK_DATE_FIELD_CLASS };
async function dec(serialized: string): Promise<string> {
  return Buffer.from(await decryptTier1(parseEnvelope(serialized), field, kms, kekRef)).toString('utf-8');
}
async function encr(value: string): Promise<string> {
  return serializeEnvelope(await encryptTier1(Buffer.from(value, 'utf-8'), field, kms, kekRef));
}

type Client = ReturnType<typeof getTx>['client'];
const recordsOf = async (client: Client, cid: string) =>
  (
    await client.query<Record<string, unknown>>(
      // One transaction ⇒ equal `now()` stamps: order by the bank date, ⛔ by `decided_at` (the clock-tie trap).
      'SELECT *, bank_credit_date::text AS bank_credit_date FROM claim_fee_bank_dates WHERE claim_case_id = $1 ORDER BY claim_fee_bank_dates.bank_credit_date',
      [cid],
    )
  ).rows;

describe.skipIf(!hasDatabase)("Story 6.39a — RTBF over the bank-date record's note (AC11)", { timeout: 20000 }, () => {
  setupLiveDb();

  it('⭐ every note → sentinel as twt_app (rows MATCHED, ⛔ 0); every other column unchanged; another member’s record untouched', async () => {
    const { client, tx } = getTx();
    // The members first, as the superuser (the payment's FK names the member).
    const mid = await seedMember(tx, PID, { state: 'lock-in' });
    const otherMid = await seedMember(tx, PID, { state: 'lock-in' });
    await enterAppScope(client, PID);
    const cid = await claimAt(client, PID, mid, 'verifier_review', { bare: true });
    const [payment] = await tx
      .insert(schema.vyawasthaShulkReceipts)
      .values({
        memberId: mid as never,
        pariwarId: PID,
        tr: `TR-${randomUUID()}`,
        utr: `${Date.now()}`.padStart(12, '7').slice(-12),
        amountInr: 110,
        paymentMethod: 'upi',
        validThrough: new Date('2099-01-01T00:00:00Z'),
      })
      .returning();
    const base = {
      pariwarId: PID,
      claimCaseId: cid as never,
      deceasedMemberId: mid as never,
      feeReceiptId: payment!.receiptId,
      reasonCode: 'recorded_late_by_member' as const,
      decidedByActorId: randomUUID(),
      decidedByDisplay: 'Test Finance Officer',
    };
    const firstNote = await encr('ZZ-NOTE SBI current account, March statement, line 14');
    const secondNote = await encr('ZZ-NOTE the corrected line, line 15 of the same statement');
    await tx.insert(schema.claimFeeBankDates).values({
      ...base,
      bankCreditDate: '2026-03-01',
      noteCiphertext: firstNote,
      supersededAt: new Date(),
      supersededReason: 're_recorded',
    });
    await tx.insert(schema.claimFeeBankDates).values({ ...base, bankCreditDate: '2026-03-02', noteCiphertext: secondNote });

    // A record for ANOTHER deceased member, in the same Pariwar — the control: ⛔ touched.
    const otherCid = await claimAt(client, PID, otherMid, 'verifier_review', { bare: true });
    const otherNote = await encr('ZZ-NOTE a record about someone else');
    await tx.insert(schema.claimFeeBankDates).values({
      ...base,
      claimCaseId: otherCid as never,
      deceasedMemberId: otherMid as never,
      bankCreditDate: '2026-02-01',
      noteCiphertext: otherNote,
    });

    const before = await recordsOf(client, cid);
    expect(before).toHaveLength(2);
    const otherBefore = await recordsOf(client, otherCid);

    // The scrub statement matches the member's rows as twt_app (the 6.23a trap: 0 rows under FORCE without the UPDATE leg).
    const probe = await client.query(`UPDATE claim_fee_bank_dates SET note_ciphertext = note_ciphertext WHERE deceased_member_id = $1`, [mid]);
    expect(probe.rowCount).toBe(2);

    await anonymizeMember(tx, { kms, kekRef }, { memberId: toMemberId(mid), pariwarId: PARIWAR_A });

    const after = await recordsOf(client, cid);
    expect(after).toHaveLength(2); // RETAINED — ⛔ nothing deleted
    const dump = JSON.stringify(after);
    for (const ct of [firstNote, secondNote]) expect(dump.includes(ct), 'an original note ciphertext survived the erasure').toBe(false);
    for (const row of after) expect(await dec(row.note_ciphertext as string)).toBe(ANONYMIZED_SENTINEL);
    const withoutNote = (row: Record<string, unknown>) =>
      Object.fromEntries(Object.entries(row).filter(([column]) => column !== 'note_ciphertext'));
    expect(after.map(withoutNote)).toEqual(before.map(withoutNote));
    expect(after.map((r) => r.bank_credit_date)).toEqual(['2026-03-01', '2026-03-02']);

    expect(await recordsOf(client, otherCid)).toEqual(otherBefore);
  });
});
