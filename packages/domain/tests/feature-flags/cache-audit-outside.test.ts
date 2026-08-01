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

// ── Review Pass 2 regressions ───────────────────────────────────────────────────────────────────

describe('the cache key includes `at` — a replay read cannot poison live traffic', () => {
  it('⚠ two lookups at DIFFERENT instants are different questions and both hit the DB', async () => {
    // The bug: `cacheKey` was `(flagKey, pariwarId)` while the memoized function is
    // `flagVersionInForce(db, flagKey, pariwarId, AT)` — whose entire job is resolving
    // `effective_from <= at < effective_until`. So the cached value was NOT a function of its key.
    // A replay/audit read at a past instant poisoned the entry for the whole TTL of live member
    // traffic (real requests served a HISTORICAL version, mis-recorded in the access observation),
    // and the reverse ordering reported today's state as history. Every pre-existing test in this
    // file used the same `AT` constant, so the dimension was never exercised.
    const db = fakeDb();
    const historical = new Date('2026-06-01T00:00:00.000Z');

    await flagVersionInForceCached(db, 'kyc_manual_fallback', PARIWAR, AT);
    const afterFirst = dbSelectCount;
    await flagVersionInForceCached(db, 'kyc_manual_fallback', PARIWAR, historical);
    expect(dbSelectCount).toBeGreaterThan(afterFirst);
  });

  it('the SAME instant still memoizes (the fix must not disable caching outright)', async () => {
    // The counterweight: `at` is bucketed to whole seconds, so ordinary now-path traffic — whose
    // millisecond timestamps differ on every request — still shares a key. An unbucketed raw
    // timestamp in the key would make the hit rate 0% and turn the cache into a memory leak.
    const db = fakeDb();
    await flagVersionInForceCached(db, 'kyc_manual_fallback', PARIWAR, new Date(AT.getTime()));
    const afterMiss = dbSelectCount;
    await flagVersionInForceCached(db, 'kyc_manual_fallback', PARIWAR, new Date(AT.getTime() + 200));
    expect(dbSelectCount).toBe(afterMiss);
  });
});

describe('AC5c on the ERROR path', () => {
  /** A Db whose lookup always rejects — the `backend_error` branch. */
  function throwingDb(): Db {
    const chain = {
      from: () => chain,
      where: () => chain,
      orderBy: () => chain,
      limit: () => Promise.reject(new Error('connection reset')),
    };
    return { select: () => chain } as unknown as Db;
  }

  it('⚠ onAccess FIRES when the lookup throws, with reason `lookup_error`', async () => {
    // The arm Pass 1 added and Pass 2 found untested: the 7 pre-existing tests never made the
    // lookup throw, so the fix was one refactor away from silent reintroduction with everything
    // still green. AC5c's guarantee is that the access observation fires on EVERY resolution — a
    // backend failure is a resolution attempt, and it must not be the one case that goes unrecorded.
    const seen: { reason: string; source: string | null }[] = [];
    await expect(
      resolveFlagAudited(
        throwingDb(),
        'kyc_manual_fallback',
        PARIWAR,
        {},
        AT,
        true,
        { onAccess: (d, s) => void seen.push({ reason: d.reason, source: s }) },
      ),
    ).rejects.toThrow('connection reset');

    expect(seen).toHaveLength(1);
    expect(seen[0]?.reason).toBe('lookup_error');
    expect(seen[0]?.source).toBeNull();
  });

  it('⚠ a THROWING onAccess does not replace the original error (the discriminant survives)', async () => {
    // `onAccess` fires immediately before `throw err`. Unwrapped, an observer that threw replaced
    // the original typed backend error with its own, destroying what the caller's catch branches on.
    // `FlagLookupOptions.observe` is documented "Never throws into the caller"; now it is enforced.
    await expect(
      resolveFlagAudited(throwingDb(), 'kyc_manual_fallback', PARIWAR, {}, AT, true, {
        onAccess: () => {
          throw new Error('the observability sink is down');
        },
      }),
    ).rejects.toThrow('connection reset');
  });

  it('⚠ a THROWING onAccess cannot fail a SUCCESSFUL resolution either', async () => {
    const d = await resolveFlagAudited(fakeDb(), 'kyc_manual_fallback', PARIWAR, {}, AT, false, {
      onAccess: () => {
        throw new Error('the observability sink is down');
      },
    });
    expect(d.reason).toBe('cohort_empty'); // the decision is unaffected
  });

  it('⚠ a THROWING observe cannot fail a lookup either', async () => {
    const v = await flagVersionInForceCached(fakeDb(), 'kyc_manual_fallback', PARIWAR, AT, {
      observe: () => {
        throw new Error('metrics sink down');
      },
    });
    expect(v).not.toBeNull();
  });
});
