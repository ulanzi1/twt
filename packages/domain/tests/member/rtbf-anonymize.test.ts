// anonymizeMember unit tests — Story 3.12 (Task 6; AC1/AC4). DB-FREE.
//
// The reducer transitions (`withdrawn → anonymized`, identity no-ops from `anonymized` + non-withdrawn
// states) are ALREADY covered in state.test.ts:83-93 + withdrawal.test.ts:76-79 — NOT duplicated here.
// These tests exercise the `anonymizeMember` WRITE core itself: a mocked Drizzle `client` captures every
// `.update(table).set(obj)` call, and a REAL fake-KMS round-trip proves each NOT-NULL column got the
// anonymized sentinel while each nullable column got NULL. The load-bearing AC4 guard is asserted at the
// unit level: `mobile_blind_index` is NEVER written (only `mobile_ciphertext` is).

import { randomUUID } from 'node:crypto';

import { describe, expect, it } from 'vitest';

import type { Db } from '../../src/db.js';
import { createFakeKmsProvider } from '../../src/encryption/index.js';
import { decryptTier1, parseEnvelope } from '../../src/encryption/envelope.js';
import type { KmsKeyRef, KmsProvider } from '../../src/encryption/kms-provider.js';
import { ANONYMIZED_SENTINEL, anonymizeMember } from '../../src/member/anonymize.js';
import { memberId as toMemberId, pariwarId as toPariwarId } from '../../src/ids/index.js';
import {
  memberAddresses,
  memberIdentities,
  memberKycProfiles,
  memberMedicalDisclosures,
  memberModerationActions,
  memberNominees,
  memberWithdrawals,
} from '../../src/schema/index.js';

// The fixed namespace the member mobile Tier-1 envelope keys on (login runs pre-scope). Duplicated by
// value from anonymize.ts / apps/api context.ts — see anonymize.ts header.
const MEMBER_IDENTITY_NAMESPACE = '00000000-0000-0000-0000-000000000001';

function fakeKms(): { kms: KmsProvider; kekRef: KmsKeyRef } {
  const kms = createFakeKmsProvider({
    kekBytes: new Uint8Array(32).fill(7),
    hmacKeyBytes: new Uint8Array(32).fill(9),
  });
  return { kms, kekRef: { resourceName: 'fake:rtbf-unit-test-kek' } };
}

interface Captured {
  table: unknown;
  set: Record<string, unknown>;
}

/** A mock Drizzle client that records every `update(table).set(obj).where(cond)` chain (DB-free). */
function mockClient(captured: Captured[]): Db {
  return {
    update(table: unknown) {
      return {
        set(obj: Record<string, unknown>) {
          captured.push({ table, set: obj });
          return { where: () => Promise.resolve() };
        },
      };
    },
  } as unknown as Db;
}

describe('anonymizeMember — field-level PII overwrite (DB-free)', () => {
  const { kms, kekRef } = fakeKms();

  /** Decrypt a captured sentinel envelope with its field-class context → plaintext. */
  async function dec(serialized: unknown, pariwarId: string, fieldClass: string): Promise<string> {
    const ct = parseEnvelope(serialized as string);
    const bytes = await decryptTier1(ct, { pariwarId, fieldClass }, kms, kekRef);
    return Buffer.from(bytes).toString('utf-8');
  }

  async function run(): Promise<{ captured: Captured[]; pariwar: string }> {
    const captured: Captured[] = [];
    const memberId = toMemberId(randomUUID());
    const pariwar = randomUUID();
    await anonymizeMember(mockClient(captured), { kms, kekRef }, {
      memberId,
      pariwarId: toPariwarId(pariwar),
    });
    return { captured, pariwar };
  }

  function setFor(captured: Captured[], table: unknown): Record<string, unknown> {
    const found = captured.find((c) => c.table === table);
    if (!found) throw new Error('no update captured for table');
    return found.set;
  }

  it('updates exactly the seven member-PII tables, once each', async () => {
    // Seven since Story 10.10's review pass added `member_moderation_actions`. This count is the
    // completeness check for the RTBF surface — a new Tier-1 column landing in a table absent from
    // this list is exactly how the moderation rationale came to survive an erasure request.
    const { captured } = await run();
    expect(captured).toHaveLength(7);
    const tables = captured.map((c) => c.table);
    for (const t of [
      memberIdentities,
      memberKycProfiles,
      memberAddresses,
      memberNominees,
      memberMedicalDisclosures,
      memberWithdrawals,
      memberModerationActions,
    ]) {
      expect(tables).toContain(t);
    }
  });

  it('member_moderation_actions: the admin-authored rationale → sentinel, decision fields untouched', async () => {
    // The rationale is free text NAMING WHAT THE MEMBER ALLEGEDLY DID — the most sensitive free
    // text on their record. The governance FACTS (action, reason_code, actor, timestamps,
    // rejoin_permitted_at) are RETAINED deliberately: FR-6's rejoin lock and the audit trail both
    // depend on the row, and they are bounded non-PII vocabulary. Only the prose goes.
    const { captured, pariwar } = await run();
    const set = setFor(captured, memberModerationActions);
    expect(await dec(set['decisionNoteCiphertext'], pariwar, 'member_moderation')).toBe(
      ANONYMIZED_SENTINEL,
    );
    for (const retained of [
      'action',
      'reasonCode',
      'actorId',
      'actorDisplay',
      'rejoinPermittedAt',
      'actedAt',
    ]) {
      expect(set).not.toHaveProperty(retained);
    }
  });

  it('member_identities: mobile_ciphertext → sentinel; RETAINS mobile_blind_index (AC4)', async () => {
    const { captured } = await run();
    const set = setFor(captured, memberIdentities);
    expect(await dec(set['mobileCiphertext'], MEMBER_IDENTITY_NAMESPACE, 'member_mobile')).toBe(
      ANONYMIZED_SENTINEL,
    );
    // The rejoin-lock key is NEVER touched — clearing it would silently break the 12-month lock (AC4).
    expect(set).not.toHaveProperty('mobileBlindIndex');
  });

  it('member_kyc_profiles: name/dob → sentinel; photo + aadhaar_masked_id → NULL', async () => {
    const { captured, pariwar } = await run();
    const set = setFor(captured, memberKycProfiles);
    expect(await dec(set['nameCiphertext'], pariwar, 'member_kyc')).toBe(ANONYMIZED_SENTINEL);
    expect(await dec(set['dobCiphertext'], pariwar, 'member_kyc')).toBe(ANONYMIZED_SENTINEL);
    expect(set['photoCiphertext']).toBeNull();
    expect(set['aadhaarMaskedId']).toBeNull();
  });

  it('member_addresses: address_line → sentinel', async () => {
    const { captured, pariwar } = await run();
    const set = setFor(captured, memberAddresses);
    expect(await dec(set['addressLineCiphertext'], pariwar, 'member_address')).toBe(
      ANONYMIZED_SENTINEL,
    );
  });

  it('member_nominees: name/mobile → sentinel; address → NULL', async () => {
    const { captured, pariwar } = await run();
    const set = setFor(captured, memberNominees);
    expect(await dec(set['nameCiphertext'], pariwar, 'member_nominee')).toBe(ANONYMIZED_SENTINEL);
    expect(await dec(set['mobileCiphertext'], pariwar, 'member_nominee')).toBe(ANONYMIZED_SENTINEL);
    expect(set['addressCiphertext']).toBeNull();
  });

  it('member_medical_disclosures: conditions → sentinel; additional_context → NULL', async () => {
    const { captured, pariwar } = await run();
    const set = setFor(captured, memberMedicalDisclosures);
    expect(await dec(set['disclosedConditionsCiphertext'], pariwar, 'member_medical')).toBe(
      ANONYMIZED_SENTINEL,
    );
    expect(set['additionalContextCiphertext']).toBeNull();
  });

  it('member_withdrawals: reason_text → NULL; reason_code + rejoin columns NOT touched (AC4)', async () => {
    const { captured } = await run();
    const set = setFor(captured, memberWithdrawals);
    expect(set['reasonTextCiphertext']).toBeNull();
    // The rejoin-lock columns + the non-PII reason_code are never written by anonymization.
    expect(set).not.toHaveProperty('reasonCode');
    expect(set).not.toHaveProperty('rejoinPermittedAt');
    expect(set).not.toHaveProperty('withdrawnAt');
    expect(set).not.toHaveProperty('aadhaarHmac');
  });

  it('sentinel is a fixed non-PII marker (safe past the PII-scrape gate)', () => {
    expect(ANONYMIZED_SENTINEL).toBe('[anonymized]');
  });
});
