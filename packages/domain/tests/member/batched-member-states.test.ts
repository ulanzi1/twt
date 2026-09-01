// `getCurrentMemberStates` — the BATCHED lifecycle resolver. Story 11b.2a (Task 1; AC2). DB-FREE.
//
// ⭐ WHAT THIS FILE EXISTS TO PROVE, and both halves are load-bearing:
//
//   (1) ROUND TRIPS ARE O(1) IN THE MEMBER COUNT, ⛔ never O(n). The naive fix for 11b.2a's RTBF
//       defect — calling `getMemberStateAt`/`getCurrentMemberState` per contributor row — adds one
//       FULL event-stream replay per row, which is strictly worse than the KMS decrypt AC3 exists to
//       bound (11b.2a Trap 1). `mapWithConcurrency` does not make that acceptable.
//
//   (2) ⛔⛔ THE SQL CARRIES NO `occurred_at` UPPER BOUND. This is the CLOCK-DOMAIN constraint, and
//       it is the difference between fixing 11b.2a's defect and silently re-creating it. `occurred_at`
//       is DB-generated; any `atTimestamp` a caller holds is the injected APP clock. If a later
//       "consistency" refactor bounds this replay by an app clock that LAGS the DB clock, the
//       `member.rtbf_anonymized` event falls OUTSIDE the window, the member resolves `active`, and
//       THE ERASED MEMBER'S REAL NAME RENDERS on the contributor list. This test makes that refactor
//       fail LOUDLY instead of un-erasing a member in silence (Decision 2026-08-30-169 cl.4).
//
// The fake `pg` client below is the whole mechanism: `drizzle()` accepts any object with `.query()`,
// so we get the REAL emitted SQL and the REAL round-trip count without a database.

import { drizzle } from 'drizzle-orm/node-postgres';
import { describe, expect, it } from 'vitest';

import type { Db } from '../../src/db.js';
import { memberId as toMemberId } from '../../src/ids/index.js';
import {
  MEMBER_STATE_REPLAY_CHUNK_SIZE,
  getCurrentMemberStates,
} from '../../src/member/read.js';
import * as schema from '../../src/schema/index.js';

interface Recorded {
  sql: string;
  params: readonly unknown[];
}

/** The `events_log` column order Drizzle's `select()` emits — the fake must answer in THIS order. */
const EVENTS_LOG_SELECT_ORDER = [
  'eventId',
  'streamId',
  'eventType',
  'payload',
  'eventVersion',
  'occurredAt',
  'actorId',
  'pariwarId',
] as const;

/**
 * A Drizzle handle over a fake pg client that RECORDS every statement and replays canned rows.
 * ⛔ Not a mock of the resolver — the query builder, the parameter binding and the SQL text are all
 * real, which is what lets the clock-domain assertions bite on the ACTUAL emitted predicate.
 *
 * ⚠ Drizzle drives node-postgres with `rowMode: 'array'`, so rows come back POSITIONALLY. The fake
 * answers in `EVENTS_LOG_SELECT_ORDER` for that reason — an object-shaped row would silently decode
 * into the wrong columns and make every assertion below meaningless.
 */
function fakeDb(rows: readonly Record<string, unknown>[] = []): { db: Db; calls: Recorded[] } {
  const calls: Recorded[] = [];
  const positional = rows.map((r) => EVENTS_LOG_SELECT_ORDER.map((k) => r[k]));
  const client = {
    query: async (
      config: string | { text: string },
      params: readonly unknown[] = [],
    ) => {
      calls.push({ sql: typeof config === 'string' ? config : config.text, params });
      return { rows: positional, fields: [] };
    },
  };
  const db = drizzle(client as never, { schema }) as unknown as Db;
  return { db, calls };
}

/** A minimal `events_log` row. Only the three fields the replay actually folds are meaningful. */
function eventRow(streamId: string, version: number, eventType: string): Record<string, unknown> {
  return {
    eventId: `evt-${streamId}-${version}`,
    streamId,
    eventType,
    payload: {},
    eventVersion: version,
    occurredAt: new Date('2026-01-01T00:00:00.000Z'),
    actorId: null,
    pariwarId: '00000000-0000-4000-8000-000000000001',
  };
}

const M1 = toMemberId('11111111-1111-4111-8111-111111111111');
const M2 = toMemberId('22222222-2222-4222-8222-222222222222');

describe('getCurrentMemberStates — the batched lifecycle resolver (AC2)', () => {
  it('resolves EVERY requested member, grouped and replayed per stream', async () => {
    const { db } = fakeDb([
      eventRow(M1, 1, 'member.signup_initiated'),
      eventRow(M1, 2, 'member.kyc_completed'),
      eventRow(M2, 1, 'member.signup_initiated'),
      eventRow(M2, 2, 'member.kyc_completed'),
      eventRow(M2, 3, 'member.rtbf_anonymized'),
    ]);

    const states = await getCurrentMemberStates(db, [M1, M2]);

    expect(states.get(M2)).toBe('anonymized');
    // M1 is untouched by M2's erasure — the grouping is per stream, not a single fold.
    expect(states.get(M1)).not.toBe('anonymized');
    expect(states.size).toBe(2);
  });

  it('a member with NO events resolves to the machine initial state — never absent, never a throw', async () => {
    // The contributor loop reads this map for EVERY confirmed contributor. A missing key that the
    // caller had to `?? 'active'` would put the erasure decision in the caller's default.
    const { db } = fakeDb([eventRow(M1, 1, 'member.signup_initiated')]);
    const states = await getCurrentMemberStates(db, [M1, M2]);
    expect(states.has(M2)).toBe(true);
    expect(states.get(M2)).toBe('pending-kyc');
  });

  it('an EMPTY member set issues ZERO queries', async () => {
    const { db, calls } = fakeDb();
    const states = await getCurrentMemberStates(db, []);
    expect(states.size).toBe(0);
    expect(calls).toHaveLength(0);
  });

  it('de-duplicates the requested set — a repeated id does not repeat a stream', async () => {
    const { db, calls } = fakeDb([eventRow(M1, 1, 'member.signup_initiated')]);
    await getCurrentMemberStates(db, [M1, M1, M1]);
    expect(calls).toHaveLength(1);
    const idParams = calls[0]!.params.filter((p) => p === M1);
    expect(idParams).toHaveLength(1);
  });

  describe('⭐ ROUND TRIPS ARE O(1) IN THE MEMBER COUNT (AC2) — ⛔ never one replay per row', () => {
    it('50 members cost ONE query, not fifty', async () => {
      const ids = Array.from({ length: 50 }, (_, i) =>
        toMemberId(`00000000-0000-4000-8000-${String(i).padStart(12, '0')}`),
      );
      const { db, calls } = fakeDb();
      await getCurrentMemberStates(db, ids);
      expect(calls).toHaveLength(1);
    });

    it('the round-trip count is ceil(n / CHUNK) — it grows with the CHUNK, ⛔ not with n', async () => {
      const n = MEMBER_STATE_REPLAY_CHUNK_SIZE * 2 + 1;
      const ids = Array.from({ length: n }, (_, i) =>
        toMemberId(`00000000-0000-4000-8000-${String(i).padStart(12, '0')}`),
      );
      const { db, calls } = fakeDb();
      await getCurrentMemberStates(db, ids);
      expect(calls).toHaveLength(3);
      // The point of the assertion: 3 ≪ n. A per-row implementation would be `n`.
      expect(calls.length).toBeLessThan(n);
    });

    it('the chunk size is a NAMED constant, ⛔ not an inline literal — and ⛔ not the decrypt bound', () => {
      // A chunk size and a KMS concurrency bound are DIFFERENT quantities, deliberately decoupled
      // (@twt/domain must never depend on apps/api, so this file cannot import
      // `DIRECTORY_DECRYPT_CONCURRENCY` to compare directly — that is the point, not a gap: reusing it
      // here would silently turn a roster of 50 into 7 round trips and couple two unrelated capacity
      // decisions). `KNOWN_DECRYPT_CONCURRENCY_AT_TIME_OF_WRITING` mirrors apps/api's current value so
      // this assertion states what it actually depends on instead of a bare, unexplained `8` — if
      // `DIRECTORY_DECRYPT_CONCURRENCY` ever changes, this constant needs a matching manual update
      // (Review fix: the prior bare-literal form gave no signal that a sync was ever owed).
      const KNOWN_DECRYPT_CONCURRENCY_AT_TIME_OF_WRITING = 8;
      expect(typeof MEMBER_STATE_REPLAY_CHUNK_SIZE).toBe('number');
      expect(Number.isInteger(MEMBER_STATE_REPLAY_CHUNK_SIZE)).toBe(true);
      // ⚠ `> 8` was NOT the property (second review pass): setting the chunk size to 9 collapsed the
      //   very distinction this test is named after and still passed. What actually separates the two
      //   quantities is ORDER OF MAGNITUDE. A statement-planning bound is in the hundreds — the whole
      //   point is to put many ids in ONE statement; an in-flight bound against a quota-limited
      //   external service is single- or low-double-digit. 100 is the floor below which this constant
      //   would have stopped being a chunk size and started being a fan-out bound.
      expect(MEMBER_STATE_REPLAY_CHUNK_SIZE).toBeGreaterThanOrEqual(100);
      expect(MEMBER_STATE_REPLAY_CHUNK_SIZE).not.toBe(KNOWN_DECRYPT_CONCURRENCY_AT_TIME_OF_WRITING);
    });
  });

  describe('⛔⛔ THE CLOCK DOMAIN — the SQL carries NO `occurred_at` upper bound (AC2)', () => {
    it('emits no `occurred_at <=` predicate, so a DB-stamped rtbf event can never fall outside the window', async () => {
      const { db, calls } = fakeDb();
      await getCurrentMemberStates(db, [M1, M2]);
      const sql = calls[0]!.sql;
      expect(sql).not.toMatch(/occurred_at\s*<=?/i);
      expect(sql).not.toMatch(/occurred_at\s*</i);
    });

    it('binds NO timestamp parameter at all — the signature takes no `atTimestamp` to bind', async () => {
      const { db, calls } = fakeDb();
      await getCurrentMemberStates(db, [M1, M2]);
      expect(calls[0]!.params.some((p) => p instanceof Date)).toBe(false);
      expect(calls[0]!.params).toEqual([M1, M2]);
    });

    it('orders by `event_version`, ⛔ never by `occurred_at` — occurred_at can tie inside one tx', async () => {
      const { db, calls } = fakeDb();
      await getCurrentMemberStates(db, [M1]);
      const sql = calls[0]!.sql;
      expect(sql).toMatch(/order by[\s\S]*event_version/i);
      expect(sql).not.toMatch(/order by[\s\S]*occurred_at/i);
    });

    it('⛔ takes NO `.limit()` — a truncated replay is a WRONG state, not a slow one', async () => {
      const { db, calls } = fakeDb();
      await getCurrentMemberStates(db, [M1, M2]);
      expect(calls[0]!.sql).not.toMatch(/\blimit\b/i);
    });
  });

  describe('⛔ STATE ONLY — the read does not grow into a profile loader', () => {
    it('touches `events_log` alone — ⛔ no KYC join, ⛔ no members join, ⛔ no overlay', async () => {
      const { db, calls } = fakeDb();
      await getCurrentMemberStates(db, [M1]);
      const sql = calls[0]!.sql.toLowerCase();
      expect(sql).toContain('events_log');
      expect(sql).not.toContain('member_kyc_profiles');
      expect(sql).not.toContain('join');
      // Death is an overlay, NOT a lifecycle label — a contributor read that grew a death conjunct
      // would DELETE dead contributors from the historical record ("the right conjunct in the wrong
      // read", 2026-08-24-159 cl.11). The blindness here is correct BY CONSTRUCTION.
      expect(sql).not.toContain('account_frozen');
      expect(sql).not.toContain('claim');
    });
  });
});
