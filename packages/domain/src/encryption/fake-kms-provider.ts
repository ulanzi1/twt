// Tests-only fake KmsProvider; uses Node 'crypto' AES-256-GCM for DEK
// encryption + HMAC-SHA-256 for blind index. Mirrors Story 1.2's
// useFakeSecretManager pattern + secret-source env-toggle convention.
//
// NEVER use in production. The 'KMS_TEST_MODE' env var defaults to 'fake';
// 'live' switches to the cloud-kms-provider.

import crypto from 'node:crypto';

import type { KmsProvider } from './kms-provider.js';

const FAKE_IV_LEN = 12;
const FAKE_TAG_LEN = 16;
const FAKE_DEK_LEN = 32;
const FAKE_ENCRYPTED_DEK_LEN = FAKE_IV_LEN + FAKE_TAG_LEN + FAKE_DEK_LEN; // 60

export function createFakeKmsProvider(opts: {
  /** Exactly 32 bytes — fake KEK. */
  kekBytes: Uint8Array;
  /** Exactly 32 bytes — fake HMAC key. */
  hmacKeyBytes: Uint8Array;
}): KmsProvider {
  if (opts.kekBytes.length !== 32) throw new Error('fake KEK must be 32 bytes');
  if (opts.hmacKeyBytes.length !== 32) throw new Error('fake HMAC key must be 32 bytes');

  const kekBuf = Buffer.from(opts.kekBytes);
  const hmacBuf = Buffer.from(opts.hmacKeyBytes);

  return {
    async encryptDek(dek, _kekRef, aad) {
      if (dek.length !== FAKE_DEK_LEN) {
        throw new Error(`fake encryptDek: DEK must be ${FAKE_DEK_LEN} bytes`);
      }
      const iv = crypto.randomBytes(FAKE_IV_LEN);
      const cipher = crypto.createCipheriv('aes-256-gcm', kekBuf, iv);
      cipher.setAAD(Buffer.from(aad));
      const ct = Buffer.concat([cipher.update(Buffer.from(dek)), cipher.final()]);
      const tag = cipher.getAuthTag();
      // Packed: iv(12) || tag(16) || ct(32) = 60 bytes
      return Buffer.concat([iv, tag, ct]);
    },
    async decryptDek(encryptedDek, _kekRef, aad) {
      const buf = Buffer.from(encryptedDek);
      if (buf.length !== FAKE_ENCRYPTED_DEK_LEN) {
        throw new Error(
          `fake decryptDek: encryptedDek must be ${FAKE_ENCRYPTED_DEK_LEN} bytes (12 iv + 16 tag + 32 ct)`,
        );
      }
      const iv = buf.subarray(0, FAKE_IV_LEN);
      const tag = buf.subarray(FAKE_IV_LEN, FAKE_IV_LEN + FAKE_TAG_LEN);
      const ct = buf.subarray(FAKE_IV_LEN + FAKE_TAG_LEN);
      const dec = crypto.createDecipheriv('aes-256-gcm', kekBuf, iv);
      dec.setAAD(Buffer.from(aad));
      dec.setAuthTag(tag);
      return Buffer.concat([dec.update(ct), dec.final()]);
    },
    async computeHmac(_hmacKeyRef, input, context) {
      // Per-Pariwar separation: HMAC key context-bound via pariwarId prefix on
      // the HMAC input. Substantive per-Pariwar separate KMS keys deferred to
      // Story 1.6 (D9-1.5); fake provider models Option B architectural intent.
      const h = crypto.createHmac('sha256', hmacBuf);
      h.update(Buffer.from(`pariwar:${context.pariwarId}|`, 'utf-8'));
      h.update(Buffer.from(input));
      return h.digest();
    },
  };
}
