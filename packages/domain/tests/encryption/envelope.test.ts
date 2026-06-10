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
  type Tier1Ciphertext,
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
    await expect(decryptTier1(env, CTX_B, kms, KEK_REF)).rejects.toThrow(
      /unable to authenticate/,
    );
  });

  it('decrypt fails when fieldClass differs from encrypt context', async () => {
    const env = await encryptTier1(Buffer.from(TEXT, 'utf-8'), CTX_A, kms, KEK_REF);
    await expect(decryptTier1(env, CTX_A_EHRMS, kms, KEK_REF)).rejects.toThrow(
      /unable to authenticate/,
    );
  });
});

describe('DEK uniqueness — per-row DEK invariant per architecture §2.7 line 1504-1505', () => {
  it('100 encryptions produce 100 distinct ciphertexts and 100 distinct IVs', async () => {
    const seen = new Set<string>();
    const ivSeen = new Set<string>();
    for (let i = 0; i < 100; i += 1) {
      const env = await encryptTier1(Buffer.from(TEXT, 'utf-8'), CTX_A, kms, KEK_REF);
      const key = Buffer.from(env.ciphertext).toString('hex') + '|' + Buffer.from(env.iv).toString('hex');
      const ivHex = Buffer.from(env.iv).toString('hex');
      expect(seen.has(key)).toBe(false);
      expect(ivSeen.has(ivHex)).toBe(false);
      seen.add(key);
      ivSeen.add(ivHex);
    }
    expect(seen.size).toBe(100);
    expect(ivSeen.size).toBe(100);
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

  it('parseEnvelope rejects input without enc:v1: prefix', () => {
    expect(() => parseEnvelope('enc:v2:abc')).toThrow(/enc:v1: prefix/);
    expect(() => parseEnvelope('plain:abc')).toThrow(/enc:v1: prefix/);
  });

  it('parseEnvelope rejects non-object JSON payloads', () => {
    const str64 = Buffer.from('"hello"', 'utf-8').toString('base64');
    expect(() => parseEnvelope('enc:v1:' + str64)).toThrow(/not an object/);
    const num64 = Buffer.from('42', 'utf-8').toString('base64');
    expect(() => parseEnvelope('enc:v1:' + num64)).toThrow(/not an object/);
  });

  it('parseEnvelope rejects non-string field values', () => {
    const tampered = Buffer.from(
      JSON.stringify({ kekRef: 'x', encryptedDek: '', iv: 42, ciphertext: '', authTag: '', aadShape: 'v1' }),
      'utf-8',
    ).toString('base64');
    expect(() => parseEnvelope('enc:v1:' + tampered)).toThrow(/"iv" must be a string/);
  });

  it('parseEnvelope rejects IV that does not decode to 12 bytes', () => {
    const tampered = Buffer.from(
      JSON.stringify({
        kekRef: 'x',
        encryptedDek: Buffer.alloc(60).toString('base64'),
        iv: Buffer.alloc(8).toString('base64'),
        ciphertext: '',
        authTag: Buffer.alloc(16).toString('base64'),
        aadShape: 'v1',
      }),
      'utf-8',
    ).toString('base64');
    expect(() => parseEnvelope('enc:v1:' + tampered)).toThrow(/iv must be 12 bytes/);
  });

  it('parseEnvelope rejects authTag that does not decode to 16 bytes', () => {
    const tampered = Buffer.from(
      JSON.stringify({
        kekRef: 'x',
        encryptedDek: Buffer.alloc(60).toString('base64'),
        iv: Buffer.alloc(12).toString('base64'),
        ciphertext: '',
        authTag: Buffer.alloc(8).toString('base64'),
        aadShape: 'v1',
      }),
      'utf-8',
    ).toString('base64');
    expect(() => parseEnvelope('enc:v1:' + tampered)).toThrow(/authTag must be 16 bytes/);
  });
});

describe('decryptTier1 input validation', () => {
  it('rejects unsupported aadShape', async () => {
    const env = await encryptTier1(Buffer.from(TEXT, 'utf-8'), CTX_A, kms, KEK_REF);
    const tampered = { ...env, aadShape: 'v2' } as unknown as Tier1Ciphertext;
    await expect(decryptTier1(tampered, CTX_A, kms, KEK_REF)).rejects.toThrow(/unsupported aadShape/);
  });
});
