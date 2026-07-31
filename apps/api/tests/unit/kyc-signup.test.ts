// KYC signup-step unit tests (DB-free) — Story 3.3b (Task 7).
//
// Covers the pure / app-layer pieces that need no live DB: the Tier-1 KYC-field
// encryption round-trip (member field-class, keyed on the real pariwarId), the FR-58C
// manual-fallback seam, and the manual-submit contract validation. The full signup E2E
// (initiate → callback → confirm + manual + RLS) lives in the live-DB integration spec.

import { randomUUID } from 'node:crypto';

import { KycManualSubmitRequest } from '@twt/contracts';
import type { ids } from '@twt/domain';
import { describe, expect, it } from 'vitest';

import type { AppDeps } from '../../src/context.js';
import { buildEncryptionDeps } from '../../src/deps.js';
import { decryptKycField, encryptKycField } from '../../src/modules/kyc/kyc-crypto.js';
import { isManualFallbackEnabled } from '../../src/modules/kyc/manual-fallback-seam.js';

const ENC = buildEncryptionDeps('kyc-unit-test-pepper-value');

describe('KYC Tier-1 field encryption (member field-class)', () => {
  it('round-trips name/dob/photo under the member pariwarId context', async () => {
    const pariwarId = randomUUID();
    for (const value of ['Asha Devi', '1990-01-01', 'data:image/jpeg;base64,/9j/4AAQ']) {
      const ct = await encryptKycField(value, pariwarId, ENC);
      expect(ct).not.toBe(value); // ciphertext is never the plaintext
      expect(ct.startsWith('enc:')).toBe(true); // serialized envelope marker
      const back = await decryptKycField(ct, pariwarId, ENC);
      expect(back).toBe(value);
    }
  });

  it('is non-deterministic (per-row DEK) — same value encrypts to distinct ciphertext', async () => {
    const pariwarId = randomUUID();
    const a = await encryptKycField('Asha Devi', pariwarId, ENC);
    const b = await encryptKycField('Asha Devi', pariwarId, ENC);
    expect(a).not.toBe(b);
  });

  it('does not decrypt under a DIFFERENT pariwarId context (tenant-bound AAD)', async () => {
    const ct = await encryptKycField('Asha Devi', randomUUID(), ENC);
    await expect(decryptKycField(ct, randomUUID(), ENC)).rejects.toThrow();
  });
});

describe('FR-58C manual-fallback seam (AC3; flag-wired at Story 10.8)', () => {
  const PARIWAR = '11111111-1111-1111-1111-111111111111' as ids.PariwarId;
  const depsWith = (manualFallbackEnabled: boolean): AppDeps =>
    ({
      config: { digilocker: { manualFallbackEnabled } },
      clock: () => new Date('2026-07-31T00:00:00.000Z'),
    }) as unknown as AppDeps;

  /** A Db whose flag lookup finds NO rows — the "no version in force" path. */
  const emptyDb = (): never => {
    const chain = {
      from: () => chain,
      where: () => chain,
      orderBy: () => chain,
      limit: () => Promise.resolve([]),
    };
    return { select: () => chain } as never;
  };

  /** A Db that throws on any read — the flag-subsystem-failure path. */
  const brokenDb = (): never =>
    ({
      select: () => {
        throw new Error('flag store unavailable');
      },
    }) as never;

  it('falls back to the documented config seam when no flag version is in force', async () => {
    await expect(isManualFallbackEnabled(depsWith(true), emptyDb(), { pariwarId: PARIWAR })).resolves.toBe(true);
    await expect(isManualFallbackEnabled(depsWith(false), emptyDb(), { pariwarId: PARIWAR })).resolves.toBe(false);
  });

  it('⚠ FAIL-SAFE: a flag-subsystem failure degrades to the config default, never to "mandatory"', async () => {
    // The load-bearing polarity check. A flag outage must never silently make KYC hard-mandatory and
    // lock members out of joining; the worst case is that manual stays available longer than intended.
    await expect(isManualFallbackEnabled(depsWith(true), brokenDb(), { pariwarId: PARIWAR })).resolves.toBe(true);
  });
});

describe('KycManualSubmitRequest contract validation', () => {
  it('accepts a name + dob (+ optional data-URI photo)', () => {
    expect(KycManualSubmitRequest.safeParse({ name: 'Asha Devi', dob: '1990-01-01' }).success).toBe(
      true,
    );
    expect(
      KycManualSubmitRequest.safeParse({
        name: 'Asha Devi',
        dob: '1990-01-01',
        photo: 'data:image/jpeg;base64,/9j/4AAQ',
      }).success,
    ).toBe(true);
  });

  it('rejects an empty name, an empty dob, a non-data-URI photo, and unknown keys (.strict)', () => {
    expect(KycManualSubmitRequest.safeParse({ name: '', dob: '1990-01-01' }).success).toBe(false);
    expect(KycManualSubmitRequest.safeParse({ name: 'Asha', dob: '' }).success).toBe(false);
    expect(
      KycManualSubmitRequest.safeParse({ name: 'Asha', dob: '1990', photo: 'not-a-data-uri' }).success,
    ).toBe(false);
    expect(
      KycManualSubmitRequest.safeParse({ name: 'Asha', dob: '1990', aadhaar: '1234' }).success,
    ).toBe(false);
  });
});
