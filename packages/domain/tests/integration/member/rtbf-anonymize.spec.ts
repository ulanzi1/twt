// RTBF anonymization — live-DB integration (Story 3.12, Task 7; AC1/AC2/AC4).
//
// Drives `anonymizeMember` + the `member.rtbf_anonymized` projection against real Postgres inside the
// per-test BEGIN/ROLLBACK envelope, on a member seeded to `withdrawn` with a FULL PII footprint. Covers:
//   · at-rest anonymization — every Tier-1 PII column reads back as the sentinel (decrypt-and-assert:
//     never the original plaintext) or NULL (the nullable columns).
//   · AC4 rejoin-key survival — `member_identities.mobile_blind_index` is UNCHANGED, and the
//     `member_withdrawals` rejoin columns (rejoin_permitted_at / withdrawn_at) + non-PII reason_code
//     survive. Clearing the blind index would silently break the 12-month rejoin lock.
//   · retained non-PII / history — member_postings.district, the payment receipt, and the consent row
//     are UNCHANGED (soft-delete: history survives).
//   · the state move — `member.rtbf_anonymized` is APPENDED (event_version = head+1) and
//     members.state = 'anonymized'.
//   · cross-tenant RLS — a PARIWAR_B member's identity row is invisible under PARIWAR_A scope.
// Assert MEMBERSHIP / explicit values, never DROP SCHEMA; per [[project_live_db_test_gotchas]].
//
// The full signup-403-after-anonymization rejoin regression lives in the API layer
// (apps/api .../signup/signup-create.spec.ts — it needs the real resolveMembersByMobile + handler); the
// blind-index/rejoin-column survival asserted HERE is the DB-level guarantee that lock keeps firing.

import { randomUUID } from 'node:crypto';

import { and, eq } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';

import {
  createFakeKmsProvider,
  decryptTier1,
  encryptTier1,
  parseEnvelope,
  serializeEnvelope,
} from '../../../src/encryption/index.js';
import type { KmsKeyRef, KmsProvider } from '../../../src/encryption/kms-provider.js';
import { clauseVersionId as toClauseVersionId, memberId as toMemberId } from '../../../src/ids/index.js';
import { anonymizeMember, getMemberStateAt, projectMemberState } from '../../../src/member/index.js';
import * as schema from '../../../src/schema/index.js';
import { getTx, hasDatabase, setupLiveDb } from '../../../src/test-utils/integration-setup.js';
import { PARIWAR_A, PARIWAR_B, enterAppScope, seedMember } from '../_helpers.js';

// The fixed namespace the member mobile Tier-1 envelope keys on (login runs pre-scope). Duplicated by
// value from anonymize.ts / apps/api context.ts.
const MEMBER_IDENTITY_NAMESPACE = '00000000-0000-0000-0000-000000000001';

const MOBILE_PT = '+919812345678';
const KYC_NAME_PT = 'Asha Devi';
const ADDRESS_PT = '12 Gandhi Marg, Patna';
const NOMINEE_NAME_PT = 'Ravi Kumar';
const MEDICAL_PT = '["diabetes"]';
const REASON_PT = 'moving-abroad-permanently';
const BLIND_INDEX = 'blind-index-fixed-abc123';

function fakeKms(): { kms: KmsProvider; kekRef: KmsKeyRef } {
  const kms = createFakeKmsProvider({
    kekBytes: new Uint8Array(32).fill(7),
    hmacKeyBytes: new Uint8Array(32).fill(9),
  });
  return { kms, kekRef: { resourceName: 'fake:rtbf-integration-kek' } };
}

const audit = (
  from: string | null,
  to: string,
  trigger: string,
  actor: 'member' | 'system' | 'trustee',
  extra: Record<string, unknown> = {},
): Record<string, unknown> => ({ from_state: from, to_state: to, trigger, actor, ...extra });

describe.skipIf(!hasDatabase)('RTBF anonymization — soft-delete + retain + RLS (:5433)', () => {
  setupLiveDb();

  const { kms, kekRef } = fakeKms();

  const enc = async (pariwarId: string, fieldClass: string, value: string): Promise<string> =>
    serializeEnvelope(
      await encryptTier1(Buffer.from(value, 'utf-8'), { pariwarId, fieldClass }, kms, kekRef),
    );
  const dec = async (serialized: string, pariwarId: string, fieldClass: string): Promise<string> =>
    Buffer.from(
      await decryptTier1(parseEnvelope(serialized), { pariwarId, fieldClass }, kms, kekRef),
    ).toString('utf-8');

  it('anonymizes every PII column at rest; retains blind-index + history; projects anonymized', async () => {
    const { client, tx } = getTx();
    await enterAppScope(client, PARIWAR_A);
    const mid = toMemberId(randomUUID());

    // ── Drive the event stream to `withdrawn` via the projector (real replay). ────────────────────────
    const project = (type: string, payload: Record<string, unknown>) =>
      projectMemberState(client, {
        memberId: mid,
        pariwarId: PARIWAR_A,
        eventType: type as Parameters<typeof projectMemberState>[1]['eventType'],
        payload,
        actorId: null,
      });
    await project('member.signup_initiated', audit(null, 'pending-kyc', 'signup', 'member'));
    await project('member.kyc_completed', audit('pending-kyc', 'pending-fee', 'kyc', 'system'));
    await project(
      'member.vyawastha_shulk_paid',
      audit('pending-fee', 'lock-in', 'fee', 'member', { utr: 'UTR1', amount_inr: 110 }),
    );
    await project(
      'member.lock_in_expired',
      audit('lock-in', 'active', 'lock_in_expired', 'system', { kyc_verified: true }),
    );
    const withdrawn = await project(
      'member.withdrawal_completed',
      audit('active', 'withdrawn', 'voluntary_withdrawal', 'member'),
    );
    expect(withdrawn.state).toBe('withdrawn');

    // ── Seed a FULL PII footprint (in-scope, so RLS WITH CHECK passes). ───────────────────────────────
    await tx.insert(schema.memberIdentities).values({
      memberId: mid,
      pariwarId: PARIWAR_A,
      mobileCiphertext: await enc(MEMBER_IDENTITY_NAMESPACE, 'member_mobile', MOBILE_PT),
      mobileBlindIndex: BLIND_INDEX,
    });
    await tx.insert(schema.memberKycProfiles).values({
      memberId: mid,
      pariwarId: PARIWAR_A,
      nameCiphertext: await enc(PARIWAR_A, 'member_kyc', KYC_NAME_PT),
      dobCiphertext: await enc(PARIWAR_A, 'member_kyc', '1990-01-15'),
      photoCiphertext: await enc(PARIWAR_A, 'member_kyc', 'data:image/jpeg;base64,xxx'),
      aadhaarMaskedId: 'XXXX1234',
      verificationStrength: 'aadhaar_kyc',
      source: 'digilocker',
    });
    await tx.insert(schema.memberAddresses).values({
      memberId: mid,
      pariwarId: PARIWAR_A,
      addressLineCiphertext: await enc(PARIWAR_A, 'member_address', ADDRESS_PT),
      locale: 'en',
    });
    await tx.insert(schema.memberNominees).values({
      memberId: mid,
      pariwarId: PARIWAR_A,
      rank: 1,
      nameCiphertext: await enc(PARIWAR_A, 'member_nominee', NOMINEE_NAME_PT),
      relationship: 'spouse',
      mobileCiphertext: await enc(PARIWAR_A, 'member_nominee', '+919800000000'),
      addressCiphertext: await enc(PARIWAR_A, 'member_nominee', 'nominee address'),
      splitPct: 100,
    });
    // A consent row — the RETAIN target AND the FK the medical disclosure needs.
    const [consent] = await tx
      .insert(schema.consentRecords)
      .values({
        subjectId: mid,
        pariwarId: PARIWAR_A,
        consentType: 'marketing',
        grantedViaActor: 'member_self',
        consentPayload: {},
      })
      .returning();
    await tx.insert(schema.memberMedicalDisclosures).values({
      memberId: mid,
      pariwarId: PARIWAR_A,
      imaListVersion: 'ima-v1',
      disclosedConditionsCiphertext: await enc(PARIWAR_A, 'member_medical', MEDICAL_PT),
      additionalContextCiphertext: await enc(PARIWAR_A, 'member_medical', 'extra context'),
      conditionCount: 1,
      acknowledgmentTextLocale: 'en',
      clauseVersionId: toClauseVersionId(randomUUID()),
      consentId: consent!.consentId,
    });
    const rejoinAt = new Date('2027-01-15T00:00:00Z');
    const withdrawnAt = new Date('2026-01-15T00:00:00Z');
    await tx.insert(schema.memberWithdrawals).values({
      memberId: mid,
      pariwarId: PARIWAR_A,
      reasonCode: 'financial',
      reasonTextCiphertext: await enc(PARIWAR_A, 'member_withdrawal', REASON_PT),
      withdrawnAt,
      rejoinPermittedAt: rejoinAt,
    });
    await tx.insert(schema.memberPostings).values({
      memberId: mid,
      pariwarId: PARIWAR_A,
      district: 'Patna',
    });
    await tx.insert(schema.vyawasthaShulkReceipts).values({
      memberId: mid,
      pariwarId: PARIWAR_A,
      tr: 'TR-1',
      utr: 'UTR-RETAINED',
      amountInr: 110,
      paymentMethod: 'upi',
      validThrough: new Date('2027-01-01T00:00:00Z'),
    });

    // ── RTBF: anonymize + project the terminal transition (mirrors the handler order). ────────────────
    await anonymizeMember(tx, { kms, kekRef }, { memberId: mid, pariwarId: PARIWAR_A });
    const anonymized = await projectMemberState(client, {
      memberId: mid,
      pariwarId: PARIWAR_A,
      eventType: 'member.rtbf_anonymized',
      payload: audit('withdrawn', 'anonymized', 'rtbf_request', 'member'),
      actorId: mid,
    });

    // The state moved to anonymized; the event was APPENDED at head+1 (never mutating the stream).
    expect(anonymized.state).toBe('anonymized');
    expect(anonymized.eventVersion).toBe(withdrawn.eventVersion + 1);
    expect(await getMemberStateAt(tx, mid, new Date())).toBe('anonymized');

    // ── AC1 — every Tier-1 PII column reads back as the sentinel / NULL (never the original). ─────────
    const idRow = (
      await tx.select().from(schema.memberIdentities).where(eq(schema.memberIdentities.memberId, mid))
    )[0]!;
    expect(await dec(idRow.mobileCiphertext, MEMBER_IDENTITY_NAMESPACE, 'member_mobile')).toBe(
      '[anonymized]',
    );
    expect(idRow.mobileCiphertext).not.toContain(MOBILE_PT);
    // AC4 — the rejoin-lock key is UNCHANGED.
    expect(idRow.mobileBlindIndex).toBe(BLIND_INDEX);

    const kycRow = (
      await tx.select().from(schema.memberKycProfiles).where(eq(schema.memberKycProfiles.memberId, mid))
    )[0]!;
    expect(await dec(kycRow.nameCiphertext, PARIWAR_A, 'member_kyc')).toBe('[anonymized]');
    expect(await dec(kycRow.dobCiphertext, PARIWAR_A, 'member_kyc')).toBe('[anonymized]');
    expect(kycRow.nameCiphertext).not.toContain(KYC_NAME_PT);
    expect(kycRow.photoCiphertext).toBeNull();
    expect(kycRow.aadhaarMaskedId).toBeNull();

    const addrRow = (
      await tx.select().from(schema.memberAddresses).where(eq(schema.memberAddresses.memberId, mid))
    )[0]!;
    expect(await dec(addrRow.addressLineCiphertext, PARIWAR_A, 'member_address')).toBe('[anonymized]');

    const nomRow = (
      await tx.select().from(schema.memberNominees).where(eq(schema.memberNominees.memberId, mid))
    )[0]!;
    expect(await dec(nomRow.nameCiphertext, PARIWAR_A, 'member_nominee')).toBe('[anonymized]');
    expect(await dec(nomRow.mobileCiphertext, PARIWAR_A, 'member_nominee')).toBe('[anonymized]');
    expect(nomRow.addressCiphertext).toBeNull();

    const medRow = (
      await tx
        .select()
        .from(schema.memberMedicalDisclosures)
        .where(eq(schema.memberMedicalDisclosures.memberId, mid))
    )[0]!;
    expect(await dec(medRow.disclosedConditionsCiphertext, PARIWAR_A, 'member_medical')).toBe(
      '[anonymized]',
    );
    expect(medRow.additionalContextCiphertext).toBeNull();

    const wRow = (
      await tx.select().from(schema.memberWithdrawals).where(eq(schema.memberWithdrawals.memberId, mid))
    )[0]!;
    expect(wRow.reasonTextCiphertext).toBeNull();
    // AC4 — reason_code + rejoin columns survive (non-PII / the lock keys).
    expect(wRow.reasonCode).toBe('financial');
    expect(wRow.rejoinPermittedAt.toISOString()).toBe(rejoinAt.toISOString());
    expect(wRow.withdrawnAt.toISOString()).toBe(withdrawnAt.toISOString());

    // ── Retained non-PII / history — UNCHANGED. ──────────────────────────────────────────────────────
    const postRow = (
      await tx.select().from(schema.memberPostings).where(eq(schema.memberPostings.memberId, mid))
    )[0]!;
    expect(postRow.district).toBe('Patna');
    const rcptRow = (
      await tx
        .select()
        .from(schema.vyawasthaShulkReceipts)
        .where(eq(schema.vyawasthaShulkReceipts.memberId, mid))
    )[0]!;
    expect(rcptRow.utr).toBe('UTR-RETAINED');
    const consentRow = (
      await tx
        .select()
        .from(schema.consentRecords)
        .where(and(eq(schema.consentRecords.subjectId, mid), eq(schema.consentRecords.pariwarId, PARIWAR_A)))
    )[0]!;
    expect(consentRow.consentType).toBe('marketing');
  });

  it('cross-tenant RLS: a PARIWAR_B member identity is invisible under PARIWAR_A scope', async () => {
    const { client, tx } = getTx();
    const midB = randomUUID();
    await seedMember(tx, PARIWAR_B, { memberId: midB });
    await tx.insert(schema.memberIdentities).values({
      memberId: toMemberId(midB),
      pariwarId: PARIWAR_B,
      mobileCiphertext: 'enc:v1:b-mobile',
      mobileBlindIndex: 'blind-b',
    });

    await enterAppScope(client, PARIWAR_A);
    const rows = await tx.select().from(schema.memberIdentities);
    expect(rows.every((r) => r.pariwarId === PARIWAR_A)).toBe(true);
  });

  it('cross-tenant UPDATE: anonymizeMember under PARIWAR_A scope leaves PARIWAR_B identity rows unchanged', async () => {
    const { client, tx } = getTx();

    // Seed PARIWAR_A member + identity (superuser context — no scope set yet)
    const midA = toMemberId(randomUUID());
    await seedMember(tx, PARIWAR_A, { memberId: midA });
    await tx.insert(schema.memberIdentities).values({
      memberId: midA,
      pariwarId: PARIWAR_A,
      mobileCiphertext: 'enc:v1:a-original',
      mobileBlindIndex: 'blind-a-upd',
    });

    // Seed PARIWAR_B member + identity (superuser context)
    const midB = toMemberId(randomUUID());
    await seedMember(tx, PARIWAR_B, { memberId: midB });
    await tx.insert(schema.memberIdentities).values({
      memberId: midB,
      pariwarId: PARIWAR_B,
      mobileCiphertext: 'enc:v1:b-original',
      mobileBlindIndex: 'blind-b-upd',
    });

    // Enter PARIWAR_A scope + anonymize PARIWAR_A's member
    await enterAppScope(client, PARIWAR_A);
    await anonymizeMember(tx, { kms, kekRef }, { memberId: midA, pariwarId: PARIWAR_A });

    // PARIWAR_A identity: ciphertext must be overwritten by anonymizeMember
    const aRow = (
      await tx.select().from(schema.memberIdentities).where(eq(schema.memberIdentities.memberId, midA))
    )[0]!;
    expect(aRow.mobileCiphertext).not.toBe('enc:v1:a-original');

    // Switch to PARIWAR_B scope — PARIWAR_B identity must be completely untouched
    await enterAppScope(client, PARIWAR_B);
    const bRow = (
      await tx.select().from(schema.memberIdentities).where(eq(schema.memberIdentities.memberId, midB))
    )[0]!;
    expect(bRow.mobileCiphertext).toBe('enc:v1:b-original');
  });
});
