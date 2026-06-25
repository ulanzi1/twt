// Unit tests for the Story 3.2 member-auth pure primitives (no DB).
//
// (1) mobile normalizer/masker — canonical E.164 + last-4 masking.
// (2) mobile blind-index determinism (same mobile → same index; namespace-separated).
// (3) OTP generate/hash determinism (the shared otp.ts helpers).
// (4) refresh-token generation + hash determinism.
// (5) JWT sign/verify + ALGORITHM PINNING (reject `none` + HS256) — §2.4 line 1447.

import { createHmac } from 'node:crypto';

import Fastify from 'fastify';
import { describe, expect, it } from 'vitest';

import { buildEncryptionDeps } from '../../src/deps.js';
import {
  generateEphemeralMemberJwtKeys,
} from '../../src/modules/auth/member/jwt-keys.js';
import { signAccessToken, generateRefreshToken, hashToken } from '../../src/modules/auth/member/tokens.js';
import {
  maskMobile,
  mobileBlindIndex,
  normalizeMobile,
} from '../../src/modules/auth/shared/mobile-index.js';
import { generateOtp, hashOtp } from '../../src/modules/auth/shared/otp.js';
import { registerMemberJwt } from '../../src/plugins/jwt/index.js';

const ENC = buildEncryptionDeps('unit-test-pepper-value');

describe('normalizeMobile', () => {
  it('canonicalises common Indian formats to +91XXXXXXXXXX', () => {
    for (const raw of ['+91 98765 43210', '09876543210', '9876543210', '+919876543210', '(91) 98765-43210']) {
      expect(normalizeMobile(raw)).toBe('+919876543210');
    }
  });

  it('rejects non-Indian-mobile inputs', () => {
    for (const raw of ['12345', '1234567890', '+1 415 555 0100', '00000000000', 'abcdefghij']) {
      expect(normalizeMobile(raw)).toBeNull();
    }
  });

  it('masks to country code + last 4', () => {
    expect(maskMobile('+919876543210')).toBe('+91·····3210');
  });
});

describe('mobileBlindIndex', () => {
  it('is deterministic per mobile + maps equivalent formats to one index', async () => {
    const a = await mobileBlindIndex('9876543210', ENC);
    const b = await mobileBlindIndex('+91 98765 43210', ENC);
    expect(a).not.toBeNull();
    expect(a).toBe(b);
  });

  it('differs across distinct mobiles and returns null for invalid input', async () => {
    const a = await mobileBlindIndex('9876543210', ENC);
    const c = await mobileBlindIndex('9123456780', ENC);
    expect(a).not.toBe(c);
    expect(await mobileBlindIndex('not-a-number', ENC)).toBeNull();
  });
});

describe('OTP primitives', () => {
  it('generateOtp is a 6-digit string (leading zeros preserved)', () => {
    for (let i = 0; i < 200; i++) {
      const otp = generateOtp();
      expect(otp).toMatch(/^\d{6}$/);
    }
  });

  it('hashOtp is deterministic + trims', () => {
    expect(hashOtp('123456')).toBe(hashOtp(' 123456 '));
    expect(hashOtp('123456')).not.toBe(hashOtp('654321'));
  });
});

describe('refresh tokens', () => {
  it('generates unique high-entropy tokens with a deterministic hash', () => {
    const a = generateRefreshToken();
    const b = generateRefreshToken();
    expect(a.token).not.toBe(b.token);
    expect(a.token.length).toBeGreaterThanOrEqual(40);
    expect(a.tokenHash).toBe(hashToken(a.token));
    expect(a.tokenHash).not.toBe(b.tokenHash);
  });
});

describe('member JWT — sign/verify + algorithm pinning', () => {
  function b64url(obj: unknown): string {
    return Buffer.from(JSON.stringify(obj)).toString('base64url');
  }

  it('round-trips an ES256 access token and rejects `none` + HS256', async () => {
    const app = Fastify();
    // registerMemberJwt only reads deps.memberJwt.
    await registerMemberJwt(app, { memberJwt: generateEphemeralMemberJwtKeys() } as never);
    await app.ready();

    const token = signAccessToken(
      app,
      { memberId: '11111111-1111-1111-1111-111111111111', pariwarId: '22222222-2222-2222-2222-222222222222', deviceId: 'dev-1' },
      15 * 60 * 1000,
    );
    const decoded = app.jwt.verify<{ typ: string; sub: string; device_id: string }>(token);
    expect(decoded.typ).toBe('access');
    expect(decoded.device_id).toBe('dev-1');

    // `none` algorithm — structurally rejected (no signature over the public key).
    const noneToken = `${b64url({ alg: 'none', typ: 'JWT' })}.${b64url({ typ: 'access', sub: 'x' })}.`;
    expect(() => app.jwt.verify(noneToken)).toThrow();

    // HS256 (symmetric) — rejected by the ES256 verify allowlist.
    const hsHeader = b64url({ alg: 'HS256', typ: 'JWT' });
    const hsPayload = b64url({ typ: 'access', sub: 'x' });
    const hsSig = createHmac('sha256', 'attacker-secret').update(`${hsHeader}.${hsPayload}`).digest('base64url');
    expect(() => app.jwt.verify(`${hsHeader}.${hsPayload}.${hsSig}`)).toThrow();

    await app.close();
  });
});
