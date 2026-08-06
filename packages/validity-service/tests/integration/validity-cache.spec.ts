// getValidityCached — live-DB integration (Story 4.8, Task 6; AC2/AC3/AC4; :5433).
//
// Drives the cache-aside wrapper against real Postgres: miss→hit, the AC4a freshness invariant (a member
// event + an amendment both reflect within the read), the AC4b degraded-cache conservative-recompute
// fallback, hit≡recompute, the §1.10 60s-TTL time-drift guard, audit-on-HIT (D5-A), the best-effort
// non-blocking write invariant, poisoned-entry handling, and the GC sweep. Own-committing (NOT setupLiveDb):
// the cache write + idempotency store + audit writer COMMIT their own tx; assertions key on our own rows /
// the observed cache outcome, NEVER global counts ([[project_live_db_test_gotchas]]). Real CI `test (unit)`
// runs with DATABASE_URL UNSET → this skips.

import { randomUUID } from 'node:crypto';

import { bindScopedDb, createDb, ids, idempotency, schema, validityCache, type Db } from '@twt/domain';
import type pg from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import {
  getValidity,
  getValidityCached,
  type ValidityCacheEvent,
  type ValidityCacheObserver,
  type ValidityCaller,
  type ValidityServiceDeps,
} from '../../src/index.js';
import { R12_PAYLOAD } from '../fixtures/r12-clause.js';

const DATABASE_URL = process.env['DATABASE_URL'];
const hasDatabase = Boolean(DATABASE_URL);

describe.skipIf(!hasDatabase)('getValidityCached — cache-aside + conservative-recompute fallback (live DB) (:5433)', () => {
  let db: Db;
  let pool: pg.Pool;
  let deps: ValidityServiceDeps;
  const pariwars: string[] = [];

  function track(pariwarId: string): void {
    pariwars.push(pariwarId);
  }

  /** A capturing observer + its recorded events / write-errors. */
  function makeObserver(): { observer: ValidityCacheObserver; events: ValidityCacheEvent[]; writeErrors: unknown[] } {
    const events: ValidityCacheEvent[] = [];
    const writeErrors: unknown[] = [];
    return {
      events,
      writeErrors,
      observer: {
        onCacheEvent: (e) => events.push(e),
        onCacheWriteError: (err) => writeErrors.push(err),
      },
    };
  }

  async function seedR12(pariwarId: ids.PariwarId): Promise<void> {
    await db.insert(schema.clauseVersions).values({
      clauseVersionId: ids.clauseVersionId(randomUUID()),
      clauseId: ids.clauseId('niy.retirement-coverage.r12'),
      pariwarId,
      version: 1,
      effectiveDate: new Date('2000-01-01T00:00:00Z'),
      payload: { ...R12_PAYLOAD },
      benefitMechanism: 'pool',
    });
  }

  async function seedEvent(
    pariwarId: ids.PariwarId,
    memberId: ids.MemberId,
    version: number,
    eventType: string,
    occurredAt: Date,
    payload: Record<string, unknown> = {},
  ): Promise<void> {
    await db.insert(schema.eventsLog).values({
      streamId: memberId,
      eventType,
      payload,
      eventVersion: version,
      actorId: null,
      pariwarId,
      occurredAt,
    });
  }

  /** Event chain that replays to `active` (mirror validity-service.spec seedActiveMember — the
   *  lock_in_expired payload MUST carry kyc_verified:true, else the reducer keeps the member at lock-in). */
  async function seedActiveMember(pariwarId: ids.PariwarId, memberId: ids.MemberId, joinedAt: Date): Promise<void> {
    const at = (n: number): Date => new Date(joinedAt.getTime() + n * 1000);
    await seedEvent(pariwarId, memberId, 1, 'member.signup_initiated', joinedAt);
    await seedEvent(pariwarId, memberId, 2, 'member.kyc_completed', at(2));
    await seedEvent(pariwarId, memberId, 3, 'member.vyawastha_shulk_paid', at(3));
    await seedEvent(pariwarId, memberId, 4, 'member.lock_in_expired', at(4), { kyc_verified: true });
  }

  async function countValidityAudits(memberId: ids.MemberId): Promise<number> {
    const res = await pool.query<{ n: number }>(
      `SELECT count(*)::int AS n FROM audit_log_entries WHERE action = 'validity.evaluate' AND resource_locator = $1`,
      [`member/${memberId}`],
    );
    return res.rows[0]?.n ?? 0;
  }

  async function cacheRowCount(memberId: ids.MemberId): Promise<number> {
    const res = await pool.query<{ n: number }>(
      `SELECT count(*)::int AS n FROM member_validity_cache WHERE member_id = $1`,
      [memberId],
    );
    return res.rows[0]?.n ?? 0;
  }

  function adminCaller(pariwarId: string): ValidityCaller {
    return {
      actorId: randomUUID(),
      grants: [{ pariwarId, role: 'super_admin', scopeDimension: 'global', scopeValue: null }],
      resource: { dimension: 'pariwar', value: pariwarId, pariwarId },
      isSelf: false,
    };
  }

  function selfCaller(pariwarId: string, memberId: string): ValidityCaller {
    return { actorId: memberId, grants: [], resource: { dimension: 'self', value: memberId, pariwarId }, isSelf: true };
  }

  /**
   * A deps whose cache-table INSERT throws AT THE SQL LAYER (a real Postgres-bound `client.query`, not
   * just a JS-level pre-throw) — the write now runs on `deps.servicePool` (code review 2026-07-05:
   * `writeCacheRowIsolated`'s own connection), so the injection point moves from `db.insert` to
   * `servicePool.connect().query`. Every OTHER db op (reads, recompute) still works.
   */
  function brokenServicePool(): pg.Pool {
    return {
      connect: async () => {
        const client = await pool.connect();
        return new Proxy(client, {
          get(target, prop) {
            if (prop === 'query') {
              // Async wrapper — a real `client.query()` always returns a promise; a synchronous throw here
              // (instead of a rejection) confused pg's internal in-flight-query bookkeeping and surfaced a
              // spurious "client.query() called while already executing" deprecation warning.
              return async (...args: unknown[]) => {
                const first = args[0];
                const text = typeof first === 'string' ? first : (first as { text?: string } | undefined)?.text;
                if (typeof text === 'string' && text.includes('member_validity_cache') && /insert/i.test(text)) {
                  throw new Error('injected cache write failure');
                }
                return (target.query as (...a: unknown[]) => unknown).apply(target, args);
              };
            }
            const value = (target as unknown as Record<string | symbol, unknown>)[prop];
            return typeof value === 'function' ? (value as (...a: unknown[]) => unknown).bind(target) : value;
          },
        }) as unknown as pg.PoolClient;
      },
    } as unknown as pg.Pool;
  }

  function brokenWriteDeps(): ValidityServiceDeps {
    return { ...deps, servicePool: brokenServicePool() };
  }

  const lastOutcome = (events: ValidityCacheEvent[]): ValidityCacheEvent['outcome'] | undefined =>
    events.at(-1)?.outcome;

  beforeAll(() => {
    if (!hasDatabase) return;
    const created = createDb(DATABASE_URL!, { ssl: false, max: 8 });
    db = created.db;
    pool = created.pool;
    deps = { db, keyedStore: idempotency.createKeyedStore(pool), servicePool: pool };
  });

  afterAll(async () => {
    if (!hasDatabase) return;
    if (pariwars.length > 0) {
      for (const t of [
        'member_validity_cache',
        'cohort_invalidation_epochs',
        'clause_versions',
        'members',
        'events_log',
      ]) {
        await pool.query(`DELETE FROM ${t} WHERE pariwar_id::text = ANY($1)`, [pariwars]).catch(() => undefined);
      }
    }
    await pool.end();
  });

  it('misses cold, then HITS warm — and a hit is byte-identical to the recompute (hit≡recompute)', async () => {
    const pariwarId = ids.pariwarId(randomUUID());
    const memberId = ids.memberId(randomUUID());
    track(pariwarId);
    await seedActiveMember(pariwarId, memberId, new Date('2012-06-01T00:00:00Z'));
    await seedR12(pariwarId);

    const { observer, events } = makeObserver();
    const first = await getValidityCached(deps, { pariwarId, memberId }, { internal: true, observer });
    expect(lastOutcome(events)).toEqual({ kind: 'miss' });

    const second = await getValidityCached(deps, { pariwarId, memberId }, { internal: true, observer });
    expect(lastOutcome(events)).toEqual({ kind: 'hit' });
    expect(second.validityPayloadHash).toBe(first.validityPayloadHash);

    // A hit is byte-identical to a fresh direct recompute for the same member.
    const direct = await getValidity(deps, { pariwarId, memberId }, { internal: true });
    expect(second.validityPayloadHash).toBe(direct.validityPayloadHash);
    expect(await cacheRowCount(memberId)).toBe(1);
  });

  it('AC4a — freshness invariant: a member-state event is reflected within the read (never stale)', async () => {
    const pariwarId = ids.pariwarId(randomUUID());
    const memberId = ids.memberId(randomUUID());
    track(pariwarId);
    await seedActiveMember(pariwarId, memberId, new Date('2012-06-01T00:00:00Z'));
    await seedR12(pariwarId);

    const { observer, events } = makeObserver();
    const warm = await getValidityCached(deps, { pariwarId, memberId }, { internal: true, observer });
    expect(warm.isValid).toBe(true); // active
    await getValidityCached(deps, { pariwarId, memberId }, { internal: true, observer }); // hit (cache warm)
    expect(lastOutcome(events)).toEqual({ kind: 'hit' });

    // A member.% state change: active → active-in-grace → lapsed-unpaid (is_valid flips to false). The D3-A
    // trigger DELETEs the warm row AND the watermark advances → the next read MUST miss + reflect lapsed.
    // Dated in the PAST (well after the 2012 seed, before DB now()) so the replay-at-now() applies them —
    // in production these carry occurred_at = append-time now(), never a future instant.
    await seedEvent(pariwarId, memberId, 5, 'member.grace_entered', new Date('2025-01-01T00:00:00Z'));
    await seedEvent(pariwarId, memberId, 6, 'member.grace_expired', new Date('2025-06-01T00:00:00Z'));

    const afterChange = await getValidityCached(deps, { pariwarId, memberId }, { internal: true, observer });
    expect(lastOutcome(events)).toEqual({ kind: 'miss' }); // invalidated → recompute, not a stale hit
    expect(afterChange.isValid).toBe(false); // reflects lapsed-unpaid immediately (no ≤60s stale window)
  });

  // ── ⭐ Story 10.26 AC8(b) — the cache invalidation is ALREADY WIRED; PROVE it, do not build it ───
  //
  // This is the strongest single argument for D2's namespace choice, so it is pinned rather than
  // asserted in a comment. Migration `0036_member-validity-cache.sql:103-107` installs an AFTER-INSERT
  // trigger on `events_log` gated `WHEN (NEW.event_type LIKE 'member.%')`, keyed
  // `member_id = NEW.stream_id`. Because Story 10.26 puts the assertion in the `member.*` namespace ON
  // THE MEMBER'S OWN STREAM, an assertion evicts that member's validity-cache row automatically:
  //
  //   · NO third trigger (migration `0093`'s contribution trigger covers only four
  //     `contribution.*`/`reconciliation.*` types and is IRRELEVANT here);
  //   · NO migration at all (D7 — the story ships no schema change);
  //   · NO payload-shape component added to the frozen Story 4.8 cache key (10.17 D5 rejected that by
  //     name, and 10.24/10.25 re-rejected it).
  //
  // Choose any other namespace and this story owes a hand-authored migration in a subsystem where
  // [[project_live_db_test_gotchas]] applies. Choose `member.*` and the freshness guarantee is already
  // installed — it only needed proving.
  it('AC8(b) — a member.personal_event_asserted append EVICTS the warm cache row (migration 0036 trigger)', async () => {
    const pariwarId = ids.pariwarId(randomUUID());
    const memberId = ids.memberId(randomUUID());
    track(pariwarId);
    await seedActiveMember(pariwarId, memberId, new Date('2012-06-01T00:00:00Z'));
    await seedR12(pariwarId);

    const { observer, events } = makeObserver();
    await getValidityCached(deps, { pariwarId, memberId }, { internal: true, observer }); // miss → warm
    await getValidityCached(deps, { pariwarId, memberId }, { internal: true, observer }); // hit
    expect(lastOutcome(events)).toEqual({ kind: 'hit' });
    expect(await cacheRowCount(memberId)).toBe(1);

    // THE ASSERTION — Story 10.26's event, on the member's own stream, in the `member.*` namespace.
    await seedEvent(pariwarId, memberId, 5, 'member.personal_event_asserted', new Date('2025-02-01T00:00:00Z'), {
      from_state: 'active',
      to_state: 'active',
      trigger: 'member.personal_event_asserted',
      actor: 'member',
      kind: 'bereavement',
    });

    // ⭐ The row is GONE — evicted by the trigger, with no code in this story doing the eviction.
    expect(await cacheRowCount(memberId)).toBe(0);

    // ...and the next read therefore MISSES and recomputes, rather than serving a stale payload that
    // is missing the seventh fact. The member's standing is UNCHANGED, which is the whole point of
    // R7(G): the assertion moves the payload's facts, never the member's eligibility.
    const afterAssertion = await getValidityCached(deps, { pariwarId, memberId }, { internal: true, observer });
    expect(lastOutcome(events)).toEqual({ kind: 'miss' });
    expect(afterAssertion.isValid).toBe(true);
  });

  it('AC4a — freshness invariant: an amendment epoch bump forces a miss (synchronous rule freshness)', async () => {
    const pariwarId = ids.pariwarId(randomUUID());
    const memberId = ids.memberId(randomUUID());
    track(pariwarId);
    await seedActiveMember(pariwarId, memberId, new Date('2012-06-01T00:00:00Z'));
    await seedR12(pariwarId);

    const { observer, events } = makeObserver();
    await getValidityCached(deps, { pariwarId, memberId }, { internal: true, observer }); // miss (populate)
    await getValidityCached(deps, { pariwarId, memberId }, { internal: true, observer }); // hit
    expect(lastOutcome(events)).toEqual({ kind: 'hit' });

    // Simulate an amendment publish: bump the cohort epoch (as amendClause does in the publish tx).
    await validityCache.bumpCohortEpoch(db, pariwarId);

    await getValidityCached(deps, { pariwarId, memberId }, { internal: true, observer });
    expect(lastOutcome(events)).toEqual({ kind: 'miss' }); // new epoch → new key → guaranteed miss
  });

  it('§1.10 TTL: an aged (>60s) row is NOT served — the time-drift guard forces a fresh recompute', async () => {
    const pariwarId = ids.pariwarId(randomUUID());
    const memberId = ids.memberId(randomUUID());
    track(pariwarId);
    await seedActiveMember(pariwarId, memberId, new Date('2012-06-01T00:00:00Z'));
    await seedR12(pariwarId);

    const { observer, events } = makeObserver();
    await getValidityCached(deps, { pariwarId, memberId }, { internal: true, observer }); // miss (populate)
    await getValidityCached(deps, { pariwarId, memberId }, { internal: true, observer }); // hit
    expect(lastOutcome(events)).toEqual({ kind: 'hit' });

    // Age the row past the 60s TTL (simulates pure time passage with NO event — the vector key-based
    // invalidation can't catch). This is why the TTL is load-bearing, not decorative.
    await pool.query(
      `UPDATE member_validity_cache SET computed_at = now() - interval '120 seconds' WHERE member_id = $1`,
      [memberId],
    );
    await getValidityCached(deps, { pariwarId, memberId }, { internal: true, observer });
    expect(lastOutcome(events)).toEqual({ kind: 'miss' }); // expired ≡ miss → fresh recompute
  });

  it('AC4b — degraded/uncertain freshness: EVERY call falls back to recompute (fresh, no cached value, logged)', async () => {
    const pariwarId = ids.pariwarId(randomUUID());
    const memberId = ids.memberId(randomUUID()); // a member with NO stream events → key unresolvable
    track(pariwarId);
    await seedR12(pariwarId);

    const { observer, events } = makeObserver();
    const p1 = await getValidityCached(deps, { pariwarId, memberId }, { internal: true, observer });
    const p2 = await getValidityCached(deps, { pariwarId, memberId }, { internal: true, observer });

    // Both calls fell back (never a hit), returned a fresh payload, and NO cached value was written.
    for (const ev of events) expect(ev.outcome.kind).toBe('fallback');
    const fb = events.at(-1)?.outcome;
    expect(fb && fb.kind === 'fallback' ? fb.reason : null).toBe('scope_low_confidence');
    expect(p1.validityPayloadHash).toBe(p2.validityPayloadHash); // deterministic fresh recompute
    expect(await cacheRowCount(memberId)).toBe(0); // never serve/store an unverifiable value
  });

  it('poisoned entry: a stored-hash mismatch → recompute + overwrite (never a failed request)', async () => {
    const pariwarId = ids.pariwarId(randomUUID());
    const memberId = ids.memberId(randomUUID());
    track(pariwarId);
    await seedActiveMember(pariwarId, memberId, new Date('2012-06-01T00:00:00Z'));
    await seedR12(pariwarId);

    const { observer, events } = makeObserver();
    await getValidityCached(deps, { pariwarId, memberId }, { internal: true, observer }); // populate
    // Poison the integrity column (disagree with the embedded payload hash) WITHOUT touching the payload.
    await pool.query(`UPDATE member_validity_cache SET validity_payload_hash = 'poisoned' WHERE member_id = $1`, [
      memberId,
    ]);

    const result = await getValidityCached(deps, { pariwarId, memberId }, { internal: true, observer });
    expect(lastOutcome(events)).toEqual({ kind: 'poisoned' });
    const direct = await getValidity(deps, { pariwarId, memberId }, { internal: true });
    expect(result.validityPayloadHash).toBe(direct.validityPayloadHash); // correct payload returned
    // The entry was overwritten — its column now agrees with the payload again.
    const fixed = await pool.query<{ h: string }>(
      `SELECT validity_payload_hash AS h FROM member_validity_cache WHERE member_id = $1`,
      [memberId],
    );
    expect(fixed.rows[0]?.h).toBe(result.validityPayloadHash);
  });

  it('best-effort write: a cache-write failure is swallowed — the request returns the correct payload', async () => {
    const pariwarId = ids.pariwarId(randomUUID());
    const memberId = ids.memberId(randomUUID());
    track(pariwarId);
    await seedActiveMember(pariwarId, memberId, new Date('2012-06-01T00:00:00Z'));
    await seedR12(pariwarId);

    const { observer, events, writeErrors } = makeObserver();
    const result = await getValidityCached(brokenWriteDeps(), { pariwarId, memberId }, { internal: true, observer });

    // The write threw and was swallowed; the request STILL succeeded with the correct freshly-computed payload.
    const direct = await getValidity(deps, { pariwarId, memberId }, { internal: true });
    expect(result.validityPayloadHash).toBe(direct.validityPayloadHash);
    expect(lastOutcome(events)).toEqual({ kind: 'miss' });
    expect(writeErrors).toHaveLength(1);
    expect(await cacheRowCount(memberId)).toBe(0); // nothing persisted (the write failed), but no error surfaced
  });

  it('a real cache-write SQL failure runs on an ISOLATED connection — it cannot poison the caller\'s own request-scoped transaction', async () => {
    // Regression test for the code-review fix (2026-07-05): the cache write used to run on the caller's
    // own `db` — a real Postgres-level throw there (not just a JS mock) would abort the WHOLE surrounding
    // transaction, silently downgrading a later COMMIT to a no-op ROLLBACK. Proves the fix: the caller's
    // OWN transaction survives a broken cache write, and other work sharing that transaction still commits.
    const pariwarId = ids.pariwarId(randomUUID());
    const memberId = ids.memberId(randomUUID());
    track(pariwarId);
    await seedActiveMember(pariwarId, memberId, new Date('2012-06-01T00:00:00Z'));
    await seedR12(pariwarId);

    const otherMemberId = ids.memberId(randomUUID());
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const scopedDb = bindScopedDb(client);
      // Other work sharing the SAME caller transaction as the (about-to-fail) cache write.
      await scopedDb.insert(schema.eventsLog).values({
        streamId: otherMemberId,
        eventType: 'test.created',
        payload: {},
        eventVersion: 1,
        actorId: null,
        pariwarId,
      });

      const { observer, writeErrors } = makeObserver();
      const result = await getValidityCached(
        { ...deps, db: scopedDb, servicePool: brokenServicePool() },
        { pariwarId, memberId },
        { internal: true, observer },
      );
      expect(writeErrors).toHaveLength(1); // the isolated cache write failed and was swallowed
      const direct = await getValidity(deps, { pariwarId, memberId }, { internal: true });
      expect(result.validityPayloadHash).toBe(direct.validityPayloadHash); // request still succeeded

      // The caller's OWN transaction is unharmed by the isolated failure — it commits normally.
      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK').catch(() => undefined);
      throw err;
    } finally {
      client.release();
    }

    // Proof the COMMIT above was real (not a silently-downgraded ROLLBACK): the other work is persisted.
    const check = await pool.query('SELECT 1 FROM events_log WHERE stream_id = $1', [otherMemberId]);
    expect(check.rowCount).toBe(1);
    expect(await cacheRowCount(memberId)).toBe(0); // the cache write itself never landed
  });

  it('D5-A audit-on-access: an ADMIN read audits on a HIT; a self read never audits', async () => {
    const pariwarId = ids.pariwarId(randomUUID());
    const memberId = ids.memberId(randomUUID());
    track(pariwarId);
    await seedActiveMember(pariwarId, memberId, new Date('2012-06-01T00:00:00Z'));
    await seedR12(pariwarId);

    const { observer, events } = makeObserver();
    await getValidityCached(deps, { pariwarId, memberId }, { internal: true, observer }); // warm the cache

    // A self read HITS the warm cache and does NOT audit (PRD FR-12A).
    const before = await countValidityAudits(memberId);
    await getValidityCached(deps, { pariwarId, memberId }, { caller: selfCaller(pariwarId, memberId), observer });
    expect(lastOutcome(events)).toEqual({ kind: 'hit' });
    expect((await countValidityAudits(memberId)) - before).toBe(0);

    // An ADMIN read ALSO hits the warm cache but MUST still write the access-audit line (audit-on-hit).
    await getValidityCached(deps, { pariwarId, memberId }, { caller: adminCaller(pariwarId), observer });
    expect(lastOutcome(events)).toEqual({ kind: 'hit' });
    expect((await countValidityAudits(memberId)) - before).toBe(1);
  });

  it('GC sweep: purges rows older than the threshold, keeps fresh ones (storage hygiene)', async () => {
    const pariwarId = ids.pariwarId(randomUUID());
    const staleMember = ids.memberId(randomUUID());
    const freshMember = ids.memberId(randomUUID());
    track(pariwarId);

    // Two rows: one aged well past the GC threshold, one fresh.
    await db.insert(schema.memberValidityCache).values([
      {
        memberId: staleMember,
        memberStateHash: 'h',
        ruleRegistryVersion: validityCache.CURRENT_NIYAMAVALI_VERSION,
        cohortInvalidationEpoch: 0,
        pariwarId,
        payload: {},
        validityPayloadHash: 'h',
        computedAt: new Date(Date.now() - 20 * 60 * 1000),
      },
      {
        memberId: freshMember,
        memberStateHash: 'h',
        ruleRegistryVersion: validityCache.CURRENT_NIYAMAVALI_VERSION,
        cohortInvalidationEpoch: 0,
        pariwarId,
        payload: {},
        validityPayloadHash: 'h',
      },
    ]);

    const deleted = await validityCache.purgeExpiredValidityCache(pool, validityCache.VALIDITY_CACHE_GC_MAX_AGE_SECONDS);
    expect(deleted).toBeGreaterThanOrEqual(1);
    expect(await cacheRowCount(staleMember)).toBe(0); // reclaimed
    expect(await cacheRowCount(freshMember)).toBe(1); // kept
  });
});
