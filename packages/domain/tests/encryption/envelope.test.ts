// Story 1.5 AC-3: Tier-1 envelope unit tests. No DB.

import { randomBytes } from 'node:crypto';

import { beforeAll, describe, expect, it } from 'vitest';

import {
  createFakeKmsProvider,
  decryptTier1,
  encryptTier1,
  parseEnvelope,
  serializeEnvelope,
  type EncryptionContext,
  type KmsKeyRef,
  type KmsProvider,
} from '../../src/encryption/index.js';

const KEK_REF: KmsKeyRef = {
  resourceName: 'projects/twt-dev/locations/asia-south1/keyRings/twt-dev-keyring/cryptoKeys/pii-tier-1-kek',
};

let kms: KmsProvider;

beforeAll(() => {
  kms = createFakeKmsProvider({
    kekBytes: randomBytes(32),
    hmacKeyBytes: randomBytes(32),
  });
});

const TEXT = '+919999999999';
const CTX_A: EncryptionContext = { pariwarId: 'A', fieldClass: 'mobile' };
const CTX_B: EncryptionContext = { pariwarId: 'B', fieldClass: 'mobile' };
const CTX_A_EHRMS: EncryptionContext = { pariwarId: 'A', fieldClass: 'ehrms_id' };

describe('encryptTier1 + decryptTier1 round-trip', () => {
  it('returns the original plaintext', async () => {
    const env = await encryptTier1(Buffer.from(TEXT, 'utf-8'), CTX_A, kms, KEK_REF);
    const out = await decryptTier1(env, CTX_A, kms, KEK_REF);
    expect(Buffer.from(out).toString('utf-8')).toBe(TEXT);
  });

  it('round-trip via serialize/parse', async () => {
    const env = await encryptTier1(Buffer.from(TEXT, 'utf-8'), CTX_A, kms, KEK_REF);
    const serialized = serializeEnvelope(env);
    expect(serialized.startsWith('enc:v1:')).toBe(true);
    const reparsed = parseEnvelope(serialized);
    const out = await decryptTier1(reparsed, CTX_A, kms, KEK_REF);
    expect(Buffer.from(out).toString('utf-8')).toBe(TEXT);
  });
});

describe('AAD binding — defense against cross-tenant ciphertext substitution', () => {
  it('decrypt fails when pariwarId differs from encrypt context', async () => {
    const env = await encryptTier1(Buffer.from(TEXT, 'utf-8'), CTX_A, kms, KEK_REF);
    await expect(decryptTier1(env, CTX_B, kms, KEK_REF)).rejects.toThrow();
  });

  it('decrypt fails when fieldClass differs from encrypt context', async () => {
    const env = await encryptTier1(Buffer.from(TEXT, 'utf-8'), CTX_A, kms, KEK_REF);
    await expect(decryptTier1(env, CTX_A_EHRMS, kms, KEK_REF)).rejects.toThrow();
  });
});

describe('DEK uniqueness — per-row DEK invariant per architecture §2.7 line 1504-1505', () => {
  it('100 encryptions of the same plaintext under the same context produce 100 distinct ciphertexts', async () => {
    const seen = new Set<string>();
    for (let i = 0; i < 100; i += 1) {
      const env = await encryptTier1(Buffer.from(TEXT, 'utf-8'), CTX_A, kms, KEK_REF);
      const key = Buffer.from(env.ciphertext).toString('hex') + '|' + Buffer.from(env.iv).toString('hex');
      expect(seen.has(key)).toBe(false);
      seen.add(key);
    }
    expect(seen.size).toBe(100);
  });
});

describe('envelope shape — no debug fields, no plaintext echo', () => {
  it('serialized envelope exposes exactly the canonical six fields', async () => {
    const env = await encryptTier1(Buffer.from(TEXT, 'utf-8'), CTX_A, kms, KEK_REF);
    const serialized = serializeEnvelope(env);
    const jsonStr = Buffer.from(serialized.slice('enc:v1:'.length), 'base64').toString('utf-8');
    const obj = JSON.parse(jsonStr) as Record<string, unknown>;
    expect(Object.keys(obj).sort()).toEqual(
      ['aadShape', 'authTag', 'ciphertext', 'encryptedDek', 'iv', 'kekRef'].sort(),
    );
    expect(obj['aadShape']).toBe('v1');
    expect(jsonStr).not.toContain(TEXT);
  });

  it('parseEnvelope rejects payloads with unexpected extra fields', () => {
    const tampered = Buffer.from(
      JSON.stringify({
        kekRef: 'x',
        encryptedDek: '',
        iv: '',
        ciphertext: '',
        authTag: '',
        aadShape: 'v1',
        debug: 'leak',
      }),
      'utf-8',
    ).toString('base64');
    expect(() => parseEnvelope('enc:v1:' + tampered)).toThrow(/extra/);
  });

  it('parseEnvelope rejects payloads missing required fields', () => {
    const tampered = Buffer.from(
      JSON.stringify({ kekRef: 'x', encryptedDek: '', iv: '', ciphertext: '', aadShape: 'v1' }),
      'utf-8',
    ).toString('base64');
    expect(() => parseEnvelope('enc:v1:' + tampered)).toThrow(/missing field/);
  });

  it('parseEnvelope rejects non-v1 aadShape', () => {
    const tampered = Buffer.from(
      JSON.stringify({
        kekRef: 'x',
        encryptedDek: '',
        iv: '',
        ciphertext: '',
        authTag: '',
        aadShape: 'v2',
      }),
      'utf-8',
    ).toString('base64');
    expect(() => parseEnvelope('enc:v1:' + tampered)).toThrow(/aadShape/);
  });
});
