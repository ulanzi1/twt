// Story 1.5 AC-3: Tier-2 blind-index unit tests. No DB.

import { randomBytes } from 'node:crypto';

import { beforeAll, describe, expect, it } from 'vitest';

import {
  blindIndex,
  createFakeKmsProvider,
  type KmsKeyRef,
  type KmsProvider,
} from '../../src/encryption/index.js';

const HMAC_REF: KmsKeyRef = {
  resourceName:
    'projects/twt-dev/locations/asia-south1/keyRings/twt-dev-keyring/cryptoKeys/pii-tier-2-hmac',
};

let kms: KmsProvider;

beforeAll(() => {
  kms = createFakeKmsProvider({
    kekBytes: randomBytes(32),
    hmacKeyBytes: randomBytes(32),
  });
});

const MOBILE = '+919999999999';

describe('blindIndex determinism — equality lookup invariant (architecture §2.7 line 1511)', () => {
  it('same plaintext + context yields the same hash across calls', async () => {
    const h1 = await blindIndex('mobile', MOBILE, { pariwarId: 'A' }, kms, HMAC_REF);
    const h2 = await blindIndex('mobile', MOBILE, { pariwarId: 'A' }, kms, HMAC_REF);
    expect(h1).toBe(h2);
  });

  it('returns lowercase hex', async () => {
    const h = await blindIndex('mobile', MOBILE, { pariwarId: 'A' }, kms, HMAC_REF);
    expect(h).toMatch(/^[0-9a-f]{64}$/);
  });
});

describe('field-class namespacing — no cross-class collision (architecture line 1527-1529)', () => {
  it('same plaintext under different field classes yields different hashes', async () => {
    const mobile = await blindIndex('mobile', '9999999999', { pariwarId: 'A' }, kms, HMAC_REF);
    const ehrms = await blindIndex('ehrms_id', '9999999999', { pariwarId: 'A' }, kms, HMAC_REF);
    expect(mobile).not.toBe(ehrms);
  });

  it('rejects fieldClass with colon (namespace separator)', async () => {
    await expect(
      blindIndex('mob:ile', MOBILE, { pariwarId: 'A' }, kms, HMAC_REF),
    ).rejects.toThrow(/must not contain ":"/);
  });

  it('rejects empty fieldClass', async () => {
    await expect(blindIndex('', MOBILE, { pariwarId: 'A' }, kms, HMAC_REF)).rejects.toThrow(
      /non-empty/,
    );
  });
});

describe('cross-Pariwar separation — no cross-Pariwar correlation (architecture line 1512-1513)', () => {
  it('same plaintext under different pariwarId yields different hashes', async () => {
    const a = await blindIndex('mobile', MOBILE, { pariwarId: 'A' }, kms, HMAC_REF);
    const b = await blindIndex('mobile', MOBILE, { pariwarId: 'B' }, kms, HMAC_REF);
    expect(a).not.toBe(b);
  });
});

describe('equality-only API (architecture §2.7 line 1514)', () => {
  it('blindIndex is a single function — no range / partial-match exports', async () => {
    const mod: Record<string, unknown> = await import('../../src/encryption/blind-index.js');
    expect(typeof mod['blindIndex']).toBe('function');
    expect(mod['rangeIndex']).toBeUndefined();
    expect(mod['prefixIndex']).toBeUndefined();
    expect(mod['partialMatch']).toBeUndefined();
  });
});
