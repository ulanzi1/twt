// Tier-1 envelope encryption primitive per architecture §2.7 line 1502-1508:
//   - Per-row DEK (32 bytes, fresh per call via crypto.randomBytes).
//   - DEK encrypts plaintext via AES-256-GCM AEAD (Tink-recommended).
//   - DEK is itself encrypted by the Cloud KMS HSM-backed KEK.
//   - AAD = canonical-JSON of EncryptionContext binds ciphertext to its
//     tenant + field-class + row identity at the AEAD primitive level.
//
// Envelope wire format: `enc:v1:<base64-json>` where <base64-json> is
// base64(JSON.stringify(envelopeWithBase64Fields)). The `enc:v1:` prefix
// allows future migration to `enc:v2:` per ADR-0006 forward-path.

import crypto from 'node:crypto';

import { encryptionContextAad } from './canonical-context.js';
import type { EncryptionContext, KmsKeyRef, KmsProvider } from './kms-provider.js';

const DEK_LEN = 32;
const IV_LEN = 12;
const AUTH_TAG_LEN = 16;

export interface Tier1Ciphertext {
  readonly kekRef: string;
  readonly encryptedDek: Uint8Array;
  readonly iv: Uint8Array;
  readonly ciphertext: Uint8Array;
  readonly authTag: Uint8Array;
  readonly aadShape: 'v1';
}

interface SerializedEnvelope {
  kekRef: string;
  encryptedDek: string;
  iv: string;
  ciphertext: string;
  authTag: string;
  aadShape: 'v1';
}

const ENVELOPE_KEYS = [
  'kekRef',
  'encryptedDek',
  'iv',
  'ciphertext',
  'authTag',
  'aadShape',
] as const;

export async function encryptTier1(
  plaintext: Uint8Array,
  context: EncryptionContext,
  kms: KmsProvider,
  kekRef: KmsKeyRef,
): Promise<Tier1Ciphertext> {
  const dek = crypto.randomBytes(DEK_LEN);
  const iv = crypto.randomBytes(IV_LEN);
  const aad = encryptionContextAad(context);

  const cipher = crypto.createCipheriv('aes-256-gcm', dek, iv);
  cipher.setAAD(aad);
  const ciphertext = Buffer.concat([cipher.update(Buffer.from(plaintext)), cipher.final()]);
  const authTag = cipher.getAuthTag();

  try {
    const encryptedDek = await kms.encryptDek(dek, kekRef, aad);
    kms.auditHook?.('encryptDek', kekRef, context);

    return {
      kekRef: kekRef.resourceName,
      encryptedDek: new Uint8Array(encryptedDek),
      iv: new Uint8Array(iv),
      ciphertext: new Uint8Array(ciphertext),
      authTag: new Uint8Array(authTag),
      aadShape: 'v1',
    };
  } finally {
    // Zero the in-memory DEK — always fires, even if kms.encryptDek rejects.
    dek.fill(0);
  }
}

export async function decryptTier1(
  ct: Tier1Ciphertext,
  context: EncryptionContext,
  kms: KmsProvider,
  kekRef: KmsKeyRef,
): Promise<Uint8Array> {
  if (ct.aadShape !== 'v1') {
    throw new Error(`decryptTier1: unsupported aadShape: ${String(ct.aadShape)}`);
  }
  const aad = encryptionContextAad(context);

  const dekBuf = await kms.decryptDek(ct.encryptedDek, kekRef, aad);
  kms.auditHook?.('decryptDek', kekRef, context);

  try {
    const dec = crypto.createDecipheriv('aes-256-gcm', dekBuf, Buffer.from(ct.iv));
    dec.setAAD(aad);
    dec.setAuthTag(Buffer.from(ct.authTag));
    const out = Buffer.concat([dec.update(Buffer.from(ct.ciphertext)), dec.final()]);
    return new Uint8Array(out);
  } finally {
    // Zero the in-memory DEK — fills the original Uint8Array in place, not a copy.
    dekBuf.fill(0);
  }
}

export function serializeEnvelope(env: Tier1Ciphertext): string {
  const serialized: SerializedEnvelope = {
    kekRef: env.kekRef,
    encryptedDek: Buffer.from(env.encryptedDek).toString('base64'),
    iv: Buffer.from(env.iv).toString('base64'),
    ciphertext: Buffer.from(env.ciphertext).toString('base64'),
    authTag: Buffer.from(env.authTag).toString('base64'),
    aadShape: env.aadShape,
  };
  return 'enc:v1:' + Buffer.from(JSON.stringify(serialized), 'utf-8').toString('base64');
}

export function parseEnvelope(s: string): Tier1Ciphertext {
  if (!s.startsWith('enc:v1:')) {
    throw new Error('parseEnvelope: input does not have enc:v1: prefix');
  }
  const jsonStr = Buffer.from(s.slice('enc:v1:'.length), 'base64').toString('utf-8');
  const parsed: unknown = JSON.parse(jsonStr);
  if (parsed === null || typeof parsed !== 'object') {
    throw new Error('parseEnvelope: payload is not an object');
  }
  const obj = parsed as Record<string, unknown>;
  for (const k of ENVELOPE_KEYS) {
    if (!(k in obj)) throw new Error(`parseEnvelope: missing field: ${k}`);
  }
  const extra = Object.keys(obj).filter(
    (k): k is string => !ENVELOPE_KEYS.includes(k as (typeof ENVELOPE_KEYS)[number]),
  );
  if (extra.length > 0) {
    throw new Error(`parseEnvelope: unexpected extra fields: ${extra.join(',')}`);
  }
  if (obj['aadShape'] !== 'v1') {
    throw new Error(`parseEnvelope: unsupported aadShape: ${String(obj['aadShape'])}`);
  }
  // Validate all fields are strings before base64-decoding — coercing non-strings
  // silently produces garbage bytes that surface as opaque crypto errors later.
  for (const k of ['kekRef', 'encryptedDek', 'iv', 'ciphertext', 'authTag'] as const) {
    if (typeof obj[k] !== 'string') {
      throw new Error(`parseEnvelope: field "${k}" must be a string, got ${typeof obj[k]}`);
    }
  }
  const iv = new Uint8Array(Buffer.from(obj['iv'] as string, 'base64'));
  const authTag = new Uint8Array(Buffer.from(obj['authTag'] as string, 'base64'));
  if (iv.length !== IV_LEN) {
    throw new Error(`parseEnvelope: iv must be ${IV_LEN} bytes after base64 decode, got ${iv.length}`);
  }
  if (authTag.length !== AUTH_TAG_LEN) {
    throw new Error(`parseEnvelope: authTag must be ${AUTH_TAG_LEN} bytes after base64 decode, got ${authTag.length}`);
  }
  return {
    kekRef: obj['kekRef'] as string,
    encryptedDek: new Uint8Array(Buffer.from(obj['encryptedDek'] as string, 'base64')),
    iv,
    ciphertext: new Uint8Array(Buffer.from(obj['ciphertext'] as string, 'base64')),
    authTag,
    aadShape: 'v1',
  };
}
