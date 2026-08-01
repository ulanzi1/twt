// KYC signup-step unit tests (DB-free) — Story 3.3b (Task 7).
//
// Covers the pure / app-layer pieces that need no live DB: the Tier-1 KYC-field
// encryption round-trip (member field-class, keyed on the real pariwarId), the FR-58C
// manual-fallback seam, and the manual-submit contract validation. The full signup E2E
// (initiate → callback → confirm + manual + RLS) lives in the live-DB integration spec.

import { randomUUID } from 'node:crypto';

import { KycManualSubmitRequest } from '@twt/contracts';
import { featureFlags, type ids } from '@twt/domain';
import { beforeEach, describe, expect, it, vi } from 'vitest';

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
  // ⚠ The flag lookup is MEMOIZED in a module-level snapshot keyed by (flag_key, pariwar_id, ~1s
  // bucket), so without this every case after the first reads the previous case's cached value and
  // never touches its own mock at all — silently passing or failing for the wrong reason. Exposed by
  // the Review Pass 4 additions below, which are the first cases in this file to differ only in what
  // the store returns.
  beforeEach(() => {
    featureFlags.clearFlagCache();
  });

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
    // ⚠ The `onError` spy is what makes this test MEAN anything (Review Pass 4). Both this case and
    // the broken-store case below return `configDefault`, so `resolves.toBe(true)` alone passed
    // identically whether the lookup resolved cleanly OR the mock chain drifted and threw — the two
    // hypotheses were indistinguishable. Asserting the error hook was NOT called pins which path ran.
    const onError = vi.fn();
    await expect(
      isManualFallbackEnabled(depsWith(true), emptyDb(), { pariwarId: PARIWAR, onError }),
    ).resolves.toBe(true);
    expect(onError, 'the empty-store path must NOT go through the error branch').not.toHaveBeenCalled();

    const onError2 = vi.fn();
    await expect(
      isManualFallbackEnabled(depsWith(false), emptyDb(), { pariwarId: PARIWAR, onError: onError2 }),
    ).resolves.toBe(false);
    expect(onError2).not.toHaveBeenCalled();
  });

  it('⚠ FAIL-SAFE: a flag-subsystem failure degrades to the config default, never to "mandatory"', async () => {
    // The load-bearing polarity check. A flag outage must never silently make KYC hard-mandatory and
    // lock members out of joining; the worst case is that manual stays available longer than intended.
    const onError = vi.fn();
    await expect(
      isManualFallbackEnabled(depsWith(true), brokenDb(), { pariwarId: PARIWAR, onError }),
    ).resolves.toBe(true);
    // …and it really was the ERROR path, not a clean resolution that happened to agree.
    expect(onError, 'the broken-store path must be observed, not silently swallowed').toHaveBeenCalledOnce();
  });

  it('⚠ THE INVERSION: a flag that says "cutover ON" HIDES the manual fallback', async () => {
    // The property the seam header calls "the whole point" had ZERO coverage: no test authored a
    // flag row, so deleting the `!` at `return !decision.enabled` left the entire suite green.
    // A row resolving `enabled` (cutover active) must yield `false` (manual hidden) REGARDLESS of
    // the config default — that is what makes the flag authoritative once authored.
    const rowDb = (state: string): never => {
      const row = {
        flagKey: 'kyc_manual_fallback',
        pariwarId: PARIWAR,
        version: 2,
        state,
        cohortDefinition: { clauses: [] },
        fallbackDefault: false,
        owner: 'kyc-desk',
        deadBy: new Date('2027-06-30T00:00:00.000Z'),
        auditId: null,
        effectiveFrom: new Date('2020-01-01T00:00:00.000Z'),
        effectiveUntil: null,
        actorWhoFlipped: null,
        actorDisplay: null,
        rationale: 'seed',
        supersededByVersion: null,
        createdAt: new Date('2020-01-01T00:00:00.000Z'),
      };
      const chain = {
        from: () => chain,
        where: () => chain,
        orderBy: () => chain,
        limit: () => Promise.resolve([row]),
      };
      return { select: () => chain } as never;
    };

    // `full` ⇒ cutover ON for everyone ⇒ manual HIDDEN, even though config says manual is enabled.
    await expect(
      isManualFallbackEnabled(depsWith(true), rowDb('full'), { pariwarId: PARIWAR }),
    ).resolves.toBe(false);

    // ⚠ Clear between the two assertions as well as between tests: they share a (flag, pariwar,
    // ~1s bucket) key, so without this the second call reads the FIRST row's cached decision.
    featureFlags.clearFlagCache();

    // `off` ⇒ cutover NOT active ⇒ manual AVAILABLE, even though config says it is disabled. This is
    // the Review Pass 4 decision: once a row exists, the flag governs — the config default applies
    // only when the flag subsystem says nothing at all.
    await expect(
      isManualFallbackEnabled(depsWith(false), rowDb('off'), { pariwarId: PARIWAR }),
    ).resolves.toBe(true);
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
