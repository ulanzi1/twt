// Story 1.5 AC-3: fake-KMS provider byte-level correctness. No DB.

import { randomBytes } from 'node:crypto';

import { describe, expect, it } from 'vitest';

import {
  createFakeKmsProvider,
  type KmsKeyRef,
} from '../../src/encryption/index.js';

const KEK_REF: KmsKeyRef = { resourceName: 'fake-kek' };
const HMAC_REF: KmsKeyRef = { resourceName: 'fake-hmac' };

const kekBytes = randomBytes(32);
const hmacKeyBytes = randomBytes(32);

describe('createFakeKmsProvider constructor', () => {
  it('rejects non-32-byte KEK', () => {
    expect(() =>
      createFakeKmsProvider({ kekBytes: randomBytes(16), hmacKeyBytes }),
    ).toThrow(/32 bytes/);
  });

  it('rejects non-32-byte HMAC key', () => {
    expect(() =>
      createFakeKmsProvider({ kekBytes, hmacKeyBytes: randomBytes(16) }),
    ).toThrow(/32 bytes/);
  });
});

describe('encryptDek + decryptDek round-trip', () => {
  it('round-trips a 32-byte DEK with AAD binding', async () => {
    const kms = createFakeKmsProvider({ kekBytes, hmacKeyBytes });
    const dek = randomBytes(32);
    const aad = Buffer.from('aad-test', 'utf-8');
    const encrypted = await kms.encryptDek(dek, KEK_REF, aad);
    expect(encrypted.length).toBe(60); // 12 iv + 16 tag + 32 ct
    const decrypted = await kms.decryptDek(encrypted, KEK_REF, aad);
    expect(Buffer.from(decrypted).equals(dek)).toBe(true);
  });

  it('decrypt fails when AAD differs', async () => {
    const kms = createFakeKmsProvider({ kekBytes, hmacKeyBytes });
    const dek = randomBytes(32);
    const encrypted = await kms.encryptDek(dek, KEK_REF, Buffer.from('aad-a'));
    await expect(kms.decryptDek(encrypted, KEK_REF, Buffer.from('aad-b'))).rejects.toThrow();
  });

  it('encryptDek rejects non-32-byte DEK', async () => {
    const kms = createFakeKmsProvider({ kekBytes, hmacKeyBytes });
    await expect(
      kms.encryptDek(randomBytes(16), KEK_REF, Buffer.from('aad')),
    ).rejects.toThrow(/32 bytes/);
  });

  it('decryptDek rejects malformed encryptedDek length', async () => {
    const kms = createFakeKmsProvider({ kekBytes, hmacKeyBytes });
    await expect(
      kms.decryptDek(randomBytes(40), KEK_REF, Buffer.from('aad')),
    ).rejects.toThrow(/60 bytes/);
  });
});

describe('computeHmac determinism + context binding', () => {
  it('returns 32-byte HMAC-SHA-256 output', async () => {
    const kms = createFakeKmsProvider({ kekBytes, hmacKeyBytes });
    const out = await kms.computeHmac(HMAC_REF, Buffer.from('input', 'utf-8'), {
      pariwarId: 'A',
    });
    expect(out.length).toBe(32);
  });

  it('same input + context yields the same output', async () => {
    const kms = createFakeKmsProvider({ kekBytes, hmacKeyBytes });
    const ctx = { pariwarId: 'A' };
    const input = Buffer.from('input', 'utf-8');
    const a = await kms.computeHmac(HMAC_REF, input, ctx);
    const b = await kms.computeHmac(HMAC_REF, input, ctx);
    expect(a.equals(b)).toBe(true);
  });

  it('different pariwarId yields different output for the same raw input', async () => {
    const kms = createFakeKmsProvider({ kekBytes, hmacKeyBytes });
    const input = Buffer.from('input', 'utf-8');
    const a = await kms.computeHmac(HMAC_REF, input, { pariwarId: 'A' });
    const b = await kms.computeHmac(HMAC_REF, input, { pariwarId: 'B' });
    expect(a.equals(b)).toBe(false);
  });
});
