// Unit tests for the pure auth primitives (Story 1.9, Task 8.1) — no DB.
// Argon2id+pepper, recovery codes, signed links, blind index, OTP generation.

import { describe, expect, it } from 'vitest';

import { buildEncryptionDeps } from '../../src/deps.js';
import { emailBlindIndex, encryptEmail, decryptEmail } from '../../src/modules/auth/shared/email-index.js';
import { hashPassword, verifyPassword } from '../../src/modules/auth/shared/password.js';
import {
  generateRecoveryCodes,
  hashRecoveryCode,
  normalizeRecoveryCode,
} from '../../src/modules/auth/shared/recovery.js';
import { mintSignedLink, verifySignedLink } from '../../src/modules/auth/shared/signed-link.js';
import { generateOtp, hashOtp } from '../../src/modules/step-up/step-up.service.js';

const PARAMS = { memoryCost: 8192, timeCost: 2, parallelism: 1 };
const PEPPER = Buffer.from('unit-test-pepper-value');
const ENC = buildEncryptionDeps('unit-test-pepper-value');

describe('password (Argon2id + pepper)', () => {
  it('hashes with the argon2id algorithm', async () => {
    const h = await hashPassword('hunter2', PEPPER, PARAMS);
    expect(h.startsWith('$argon2id$')).toBe(true);
  });

  it('verifies the correct password and rejects a wrong one', async () => {
    const h = await hashPassword('hunter2', PEPPER, PARAMS);
    expect(await verifyPassword(h, 'hunter2', PEPPER)).toBe(true);
    expect(await verifyPassword(h, 'wrong', PEPPER)).toBe(false);
  });

  it('the pepper is load-bearing — a different pepper fails verification', async () => {
    const h = await hashPassword('hunter2', PEPPER, PARAMS);
    expect(await verifyPassword(h, 'hunter2', Buffer.from('different-pepper'))).toBe(false);
  });

  it('a malformed stored hash is a denial, not a throw', async () => {
    expect(await verifyPassword('not-a-hash', 'x', PEPPER)).toBe(false);
  });
});

describe('recovery codes', () => {
  it('generates 10 distinct codes + matching hashes', () => {
    const { codes, hashes } = generateRecoveryCodes();
    expect(codes).toHaveLength(10);
    expect(hashes).toHaveLength(10);
    expect(new Set(codes).size).toBe(10);
    expect(hashRecoveryCode(codes[0]!)).toBe(hashes[0]);
  });

  it('normalizes formatting/case before hashing (a typed dash/lowercase still matches)', () => {
    const { codes, hashes } = generateRecoveryCodes();
    const messy = codes[0]!.toLowerCase().replace(/-/g, ' ');
    expect(hashRecoveryCode(messy)).toBe(hashes[0]);
    expect(normalizeRecoveryCode(messy)).toBe(normalizeRecoveryCode(codes[0]!));
  });
});

describe('signed links', () => {
  const secret = 'a-signing-secret-at-least-32-chars-long';
  const now = 1_000_000;

  it('round-trips a valid token', () => {
    const token = mintSignedLink({ sub: 'u1', purpose: 'password_reset', exp: now + 1000 }, secret);
    const payload = verifySignedLink(token, secret, now);
    expect(payload?.sub).toBe('u1');
    expect(payload?.purpose).toBe('password_reset');
  });

  it('rejects a tampered payload', () => {
    const token = mintSignedLink({ sub: 'u1', purpose: 'password_reset', exp: now + 1000 }, secret);
    const tampered = token.replace(/^./, (c) => (c === 'a' ? 'b' : 'a'));
    expect(verifySignedLink(tampered, secret, now)).toBeNull();
  });

  it('rejects an expired token + a wrong secret', () => {
    const token = mintSignedLink({ sub: 'u1', purpose: 'password_reset', exp: now - 1 }, secret);
    expect(verifySignedLink(token, secret, now)).toBeNull();
    const fresh = mintSignedLink({ sub: 'u1', purpose: 'password_reset', exp: now + 1000 }, secret);
    expect(verifySignedLink(fresh, 'wrong-secret-also-32-chars-long-xx', now)).toBeNull();
  });
});

describe('admin email — blind index + Tier-1 envelope', () => {
  it('blind index is deterministic + email-normalized (case/space-insensitive)', async () => {
    const a = await emailBlindIndex('Admin@Example.COM', ENC);
    const b = await emailBlindIndex('  admin@example.com ', ENC);
    expect(a).toBe(b);
  });

  it('different emails produce different blind indexes', async () => {
    const a = await emailBlindIndex('a@example.com', ENC);
    const b = await emailBlindIndex('b@example.com', ENC);
    expect(a).not.toBe(b);
  });

  it('Tier-1 envelope round-trips + is non-deterministic ciphertext', async () => {
    const c1 = await encryptEmail('admin@example.com', ENC);
    const c2 = await encryptEmail('admin@example.com', ENC);
    expect(c1.startsWith('enc:v1:')).toBe(true);
    expect(c1).not.toBe(c2); // per-row DEK → non-deterministic (why the blind index exists)
    expect(await decryptEmail(c1, ENC)).toBe('admin@example.com');
  });
});

describe('step-up OTP generation', () => {
  it('generates a 6-digit numeric code', () => {
    for (let i = 0; i < 20; i++) {
      expect(generateOtp()).toMatch(/^\d{6}$/);
    }
  });

  it('hashOtp is deterministic and not the plaintext', () => {
    expect(hashOtp('123456')).toBe(hashOtp('123456'));
    expect(hashOtp('123456')).not.toBe('123456');
  });
});
