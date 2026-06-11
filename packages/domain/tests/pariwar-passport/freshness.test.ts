// Pariwar-Passport 60s freshness-contract unit tests — Story 1.7 (AC-3).
//
// Exercises the cache-aside TTL + invalidate-on-write seam WITHOUT a live DB by
// driving readThroughBrandingCache with a counting fetcher + a controllable
// clock. Asserts: (1) the staleness ceiling is exactly 60_000ms; (2) reads within
// the ceiling are served from cache (no re-fetch); (3) reads past the ceiling
// re-fetch; (4) the TTL boundary is exclusive; (5) invalidation forces an
// immediate re-fetch (the trustee-write path).

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { pariwarId } from '../../src/ids/index.js';
import {
  BRANDING_BUNDLE_MAX_STALENESS_MS,
  clearPariwarPassportCache,
  invalidatePariwarPassport,
  readThroughBrandingCache,
} from '../../src/pariwar-passport/read.js';
import type { PariwarPassportRow } from '../../src/schema/pariwar_passport.js';

const ID = pariwarId('11111111-1111-1111-1111-111111111111');

/** Minimal stand-in row — only identity matters for cache-contract assertions. */
function rowFor(name: string): PariwarPassportRow {
  return {
    pariwarId: ID,
    displayNameEn: name,
    displayNameHi: name,
    legalName: name,
    trustRegistrationId: null,
    brandingBundle: { logo_url: 'x', primary_color: '#000000', secondary_color: '#ffffff' },
    localeDefault: 'en',
    createdAt: new Date(0),
    createdBy: null,
    updatedAt: new Date(0),
  };
}

describe('branding cache freshness contract (AC-3)', () => {
  beforeEach(() => clearPariwarPassportCache());
  afterEach(() => clearPariwarPassportCache());

  it('staleness ceiling is exactly 60_000ms', () => {
    expect(BRANDING_BUNDLE_MAX_STALENESS_MS).toBe(60_000);
  });

  it('first read fetches; second read within the ceiling is served from cache', async () => {
    let calls = 0;
    const fetch = async (): Promise<PariwarPassportRow> => {
      calls += 1;
      return rowFor(`v${calls}`);
    };
    let clock = 1_000;
    const now = (): number => clock;

    const first = await readThroughBrandingCache(ID, fetch, now);
    expect(first?.displayNameEn).toBe('v1');
    expect(calls).toBe(1);

    clock += 59_999; // still strictly under the 60s ceiling
    const second = await readThroughBrandingCache(ID, fetch, now);
    expect(calls).toBe(1); // NOT re-fetched
    expect(second?.displayNameEn).toBe('v1'); // same cached value
  });

  it('a read AT the ceiling re-fetches (boundary is exclusive)', async () => {
    let calls = 0;
    const fetch = async (): Promise<PariwarPassportRow> => {
      calls += 1;
      return rowFor(`v${calls}`);
    };
    let clock = 0;
    const now = (): number => clock;

    await readThroughBrandingCache(ID, fetch, now); // calls=1, fetchedAt=0
    clock = BRANDING_BUNDLE_MAX_STALENESS_MS; // now - fetchedAt === 60_000, NOT < 60_000
    const again = await readThroughBrandingCache(ID, fetch, now);
    expect(calls).toBe(2);
    expect(again?.displayNameEn).toBe('v2');
  });

  it('a read past the ceiling re-fetches fresh', async () => {
    let calls = 0;
    const fetch = async (): Promise<PariwarPassportRow> => {
      calls += 1;
      return rowFor(`v${calls}`);
    };
    let clock = 0;
    const now = (): number => clock;

    await readThroughBrandingCache(ID, fetch, now);
    clock = 60_001;
    const fresh = await readThroughBrandingCache(ID, fetch, now);
    expect(calls).toBe(2);
    expect(fresh?.displayNameEn).toBe('v2');
  });

  it('invalidation forces an immediate re-fetch (trustee-write reflects at once)', async () => {
    let calls = 0;
    const fetch = async (): Promise<PariwarPassportRow> => {
      calls += 1;
      return rowFor(`v${calls}`);
    };
    const clock = 5_000;
    const now = (): number => clock; // clock frozen — only invalidation can refresh

    await readThroughBrandingCache(ID, fetch, now);
    expect(calls).toBe(1);

    invalidatePariwarPassport(ID); // simulate a write
    const afterWrite = await readThroughBrandingCache(ID, fetch, now);
    expect(calls).toBe(2); // re-fetched despite the clock not advancing
    expect(afterWrite?.displayNameEn).toBe('v2');
  });

  it('caches a null (passport-not-found) result within the ceiling', async () => {
    let calls = 0;
    const fetch = async (): Promise<PariwarPassportRow | null> => {
      calls += 1;
      return null;
    };
    const now = (): number => 0;

    expect(await readThroughBrandingCache(ID, fetch, now)).toBeNull();
    expect(await readThroughBrandingCache(ID, fetch, now)).toBeNull();
    expect(calls).toBe(1); // the null was cached, not re-fetched
  });
});
