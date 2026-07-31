// AC5c — flag evaluation cannot suppress its surrounding audit — Story 10.8 (Task 4/11).
//
// `epics.md:3522`: "flag-evaluation code paths cannot disable surrounding audit logging." The
// structural answer is Story 4.8's D5-A (`packages/validity-service/src/cache.ts:22-26`): only the
// COMPUTE CORE is cached, and the audit/access layer sits OUTSIDE it — so it fires on a cache HIT
// exactly as on a miss.
//
// This test is the teeth on that claim. Its failure mode is nasty and specifically worth guarding:
// if the audit were moved INSIDE the memoized lookup, everything would still look correct in
// development and in any test that evaluates a flag once. The bug would only appear in production,
// as a slow silent decay in audit coverage that grows with traffic — the busier the system, the
// more of its flag reads go unrecorded.
//
// A fake `Db` is enough here: the point under test is WHERE the observation sits relative to the
// memoization, not what the query returns.

import { beforeEach, describe, expect, it } from 'vitest';

import {
  FLAG_CACHE_TTL_MS,
  clearFlagCache,
  flagVersionInForceCached,
  resolveFlagAudited,
} from '../../src/feature-flags/cache.js';
import type { Db } from '../../src/db.js';
import type { PariwarId } from '../../src/ids/index.js';

const PARIWAR = '11111111-1111-1111-1111-111111111111' as PariwarId;
const AT = new Date('2026-07-31T00:00:00.000Z');

/** Counts how many times the LOOKUP actually hit the "database". */
let dbSelectCount = 0;

/** A fake Db whose `select()` chain resolves to one global `canary` row with an all-match cohort. */
function fakeDb(): Db {
  const row = {
    id: 'ffffffff-ffff-ffff-ffff-ffffffffffff',
    flagKey: 'kyc_manual_fallback',
    pariwarId: null,
    version: 2,
    cohortDefinition: { clauses: [] },
    state: 'canary',
    fallbackDefault: true,
    owner: 'kyc-desk',
    deadBy: new Date('2027-06-30T00:00:00.000Z'),
    auditId: null,
    effectiveFrom: new Date('2026-01-01T00:00:00.000Z'),
    effectiveUntil: null,
    actorWhoFlipped: null,
    rationale: 'seed',
    supersededByVersion: null,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
  };
  const chain = {
    from: () => chain,
    where: () => chain,
    orderBy: () => chain,
    limit: () => {
      dbSelectCount += 1;
      return Promise.resolve([row]);
    },
  };
  return { select: () => chain } as unknown as Db;
}

beforeEach(() => {
  clearFlagCache();
  dbSelectCount = 0;
});

describe('the cached compute core', () => {
  it('memoizes the lookup — a second read within the TTL does not hit the DB', () => {
    // Establishes that the cache is REAL. Without this, the audit assertions below would be
    // vacuous: an audit trivially "fires on every hit" if there are never any hits.
    const db = fakeDb();
    return (async () => {
      await flagVersionInForceCached(db, 'kyc_manual_fallback', PARIWAR, AT);
      expect(dbSelectCount).toBeGreaterThan(0);
      const afterMiss = dbSelectCount;
      await flagVersionInForceCached(db, 'kyc_manual_fallback', PARIWAR, AT);
      expect(dbSelectCount).toBe(afterMiss);
    })();
  });

  it('reports hit/miss/bypass outcomes, and `bypassCache` always re-reads', async () => {
    const db = fakeDb();
    const outcomes: string[] = [];
    const observe = (o: string): void => void outcomes.push(o);
    await flagVersionInForceCached(db, 'kyc_manual_fallback', PARIWAR, AT, { observe });
    await flagVersionInForceCached(db, 'kyc_manual_fallback', PARIWAR, AT, { observe });
    await flagVersionInForceCached(db, 'kyc_manual_fallback', PARIWAR, AT, { observe, bypassCache: true });
    expect(outcomes).toEqual(['miss', 'hit', 'bypass']);
  });

  it('keys the snapshot by (flag_key, pariwar_id) — one tenant cannot serve another’s cached value', async () => {
    const db = fakeDb();
    const other = '22222222-2222-2222-2222-222222222222' as PariwarId;
    const outcomes: string[] = [];
    const observe = (o: string): void => void outcomes.push(o);
    await flagVersionInForceCached(db, 'kyc_manual_fallback', PARIWAR, AT, { observe });
    await flagVersionInForceCached(db, 'kyc_manual_fallback', other, AT, { observe });
    expect(outcomes).toEqual(['miss', 'miss']);
  });

  it('has a SHORT ttl — the bound on how long a flip takes to become visible', () => {
    expect(FLAG_CACHE_TTL_MS).toBeLessThanOrEqual(30_000);
  });
});

describe('AC5c — the audit fires on a cache HIT exactly as on a miss', () => {
  it('⚠ THE INVARIANT: N resolutions produce N access observations, however many were cache hits', async () => {
    const db = fakeDb();
    const accesses: string[] = [];
    const onAccess = (d: { reason: string }): void => void accesses.push(d.reason);

    for (let i = 0; i < 10; i += 1) {
      await resolveFlagAudited(db, 'kyc_manual_fallback', PARIWAR, {}, AT, true, { onAccess });
    }

    // 10 observations from 1 DB read: the audit is outside the memoization, the lookup is inside it.
    // If someone moves `onAccess` into `flagVersionInForceCached`, this becomes 1 and the test fails.
    expect(accesses).toHaveLength(10);
    expect(dbSelectCount).toBe(1);
  });

  it('the observation carries the same decision on a hit as on a miss', async () => {
    const db = fakeDb();
    const seen: Array<{ enabled: boolean; reason: string; source: string | null }> = [];
    const onAccess = (d: { enabled: boolean; reason: string }, source: string | null): void => {
      seen.push({ enabled: d.enabled, reason: d.reason, source });
    };

    await resolveFlagAudited(db, 'kyc_manual_fallback', PARIWAR, {}, AT, true, { onAccess }); // miss
    await resolveFlagAudited(db, 'kyc_manual_fallback', PARIWAR, {}, AT, true, { onAccess }); // hit

    expect(dbSelectCount).toBe(1);
    expect(seen).toHaveLength(2);
    // A degraded observation on the hit path would be the same bug in a quieter costume.
    expect(seen[0]).toEqual(seen[1]);
  });

  it('fires even when no version is in force (the caller default path is still observed)', async () => {
    const emptyChain = {
      from: () => emptyChain,
      where: () => emptyChain,
      orderBy: () => emptyChain,
      limit: () => Promise.resolve([]),
    };
    const db = { select: () => emptyChain } as unknown as Db;
    const accesses: Array<{ reason: string; source: string | null }> = [];

    // 'not_registered' is unknown to the registry, so the lookup returns null outright.
    const decision = await resolveFlagAudited(db, 'not_registered', PARIWAR, {}, AT, true, {
      onAccess: (d, source) => void accesses.push({ reason: d.reason, source }),
    });

    expect(decision.enabled).toBe(true); // the caller's own default
    expect(decision.reason).toBe('no_version_in_force');
    expect(accesses).toEqual([{ reason: 'no_version_in_force', source: null }]);
  });
});
