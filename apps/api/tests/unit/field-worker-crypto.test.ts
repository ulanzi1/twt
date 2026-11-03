// Story 13.1 (Task 1, AC13) — the field worker's mobile blind index lives in its OWN hash space. No DB.
//
// `field_workers.mobile_blind_index` is keyed under the class `field_worker_mobile` and the worker's REAL Pariwar; the
// member login key (`member_identities.mobile_blind_index`) is `member_mobile` under `MEMBER_IDENTITY_NAMESPACE`. The same
// number must give DIFFERENT hashes in the two spaces, or a worker row would be joinable to a member's login.

import { randomBytes, randomUUID } from 'node:crypto';

import { encryption } from '@twt/domain';
import { beforeAll, describe, expect, it } from 'vitest';

import {
  FIELD_WORKER_FIELD_CLASS,
  FIELD_WORKER_MOBILE_FIELD_CLASS,
  MEMBER_MOBILE_FIELD_CLASS,
  type EncryptionDeps,
} from '../../src/context.js';
import {
  fieldWorkerMobileIndex,
  sealFieldWorkerIdentity,
} from '../../src/modules/field-worker/field-worker-crypto.js';

const KEK_REF: encryption.KmsKeyRef = { resourceName: 'projects/t/locations/l/keyRings/r/cryptoKeys/kek' };
const HMAC_REF: encryption.KmsKeyRef = { resourceName: 'projects/t/locations/l/keyRings/r/cryptoKeys/hmac' };
const MOBILE = '+919876543210';
const NAME = 'Vikram Recognisable-Name';

let enc: EncryptionDeps;

beforeAll(() => {
  enc = {
    kms: encryption.createFakeKmsProvider({ kekBytes: randomBytes(32), hmacKeyBytes: randomBytes(32) }),
    kekRef: KEK_REF,
    hmacKeyRef: HMAC_REF,
  };
});

describe('field-worker field classes (QE4)', () => {
  it('declares the two classes once in @twt/domain and re-exports them through context.ts', () => {
    expect(FIELD_WORKER_FIELD_CLASS).toBe('field_worker');
    expect(FIELD_WORKER_MOBILE_FIELD_CLASS).toBe('field_worker_mobile');
    expect(encryption.FIELD_WORKER_FIELD_CLASS).toBe(FIELD_WORKER_FIELD_CLASS);
    expect(encryption.FIELD_WORKER_MOBILE_FIELD_CLASS).toBe(FIELD_WORKER_MOBILE_FIELD_CLASS);
    expect(FIELD_WORKER_MOBILE_FIELD_CLASS).not.toBe(MEMBER_MOBILE_FIELD_CLASS);
  });
});

describe('the disjoint hash spaces (AC13)', () => {
  it('the field-worker index of a number differs from the member login index of the SAME number', async () => {
    const pariwarId = randomUUID();
    const worker = await fieldWorkerMobileIndex(MOBILE, pariwarId, enc);
    const memberLogin = await encryption.mobileBlindIndex(MOBILE, enc);
    expect(worker).toMatch(/^[0-9a-f]{64}$/);
    expect(memberLogin).toMatch(/^[0-9a-f]{64}$/);
    expect(worker).not.toBe(memberLogin);
    // Control: the SAME class under the member namespace would still differ only by class — prove the class matters.
    const memberClassUnderTenant = await encryption.blindIndex(
      MEMBER_MOBILE_FIELD_CLASS,
      MOBILE,
      { pariwarId },
      enc.kms,
      enc.hmacKeyRef,
    );
    expect(worker).not.toBe(memberClassUnderTenant);
  });

  it('is deterministic within a Pariwar and differs across Pariwars (the index is per tenant — QE19)', async () => {
    const a = randomUUID();
    const b = randomUUID();
    expect(await fieldWorkerMobileIndex(MOBILE, a, enc)).toBe(await fieldWorkerMobileIndex(MOBILE, a, enc));
    expect(await fieldWorkerMobileIndex(MOBILE, a, enc)).not.toBe(await fieldWorkerMobileIndex(MOBILE, b, enc));
  });
});

describe('sealFieldWorkerIdentity', () => {
  it('returns two Tier-1 envelopes and the field-worker index — no plaintext in any of them', async () => {
    const pariwarId = randomUUID();
    const sealed = await sealFieldWorkerIdentity({ name: NAME, mobileE164: MOBILE }, pariwarId, enc);
    expect(sealed.mobileBlindIndex).toBe(await fieldWorkerMobileIndex(MOBILE, pariwarId, enc));
    for (const value of [sealed.nameCiphertext, sealed.mobileCiphertext, sealed.mobileBlindIndex]) {
      expect(value).not.toContain(NAME);
      expect(value).not.toContain('9876543210');
    }
    // The envelopes decrypt back under the worker's class and Pariwar (proof they were sealed there).
    const name = await encryption.decryptTier1(
      encryption.parseEnvelope(sealed.nameCiphertext),
      { pariwarId, fieldClass: FIELD_WORKER_FIELD_CLASS },
      enc.kms,
      enc.kekRef,
    );
    expect(Buffer.from(name).toString('utf-8')).toBe(NAME);
  });
});
