// Pending-match retry — the once-ever idempotency TTL, against REAL Postgres (Story 9.10, Task 4;
// AC3 — "the once-ever nuance"). Revert-sanity teeth ([[feedback_gate_scope_semantic_coverage]]): this
// test FAILS if `PENDING_MATCH_IDEMPOTENCY_TTL_SECONDS` is ever reverted back down to (or below)
// `DEFAULT_MEMBER_IDEMPOTENCY_TTL_SECONDS` — the exact mistake AC3's Dev Notes warn against.
//
// The mechanics under test (Dev Notes "the once-ever nuance"): a completed idempotency-store row does
// NOT get its `expires_at` extended by `recordResult` — it lapses at whatever TTL it was CLAIMED with,
// and the hourly `purgeExpiredKeys` vacuum deletes it once lapsed, `status` notwithstanding. The sweep
// runs hourly across a ~20-day reconciliation window, so durability comes from claiming with a
// WEEKS-SCALE TTL up front — never from `recordResult` alone. This is exercised against real Postgres
// (the claim/expiry/vacuum interaction is exactly the kind of mechanism a mock cannot prove).

import { randomUUID } from 'node:crypto';

import { idempotency } from '@twt/domain';
import pg from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import {
  DEFAULT_MEMBER_IDEMPOTENCY_TTL_SECONDS,
  PENDING_MATCH_IDEMPOTENCY_TTL_SECONDS,
} from '../src/scheduler/contribution-notify-triggers.js';

const DATABASE_URL = process.env['DATABASE_URL'];
const hasDatabase = Boolean(DATABASE_URL);

describe.skipIf(!hasDatabase)(
  'Story 9.10 AC3 — the pending-match TTL survives across two hourly sweep ticks (live DB, own-committing)',
  () => {
    let pool: pg.Pool;
    const createdKeys: string[] = [];

    function track(key: string): string {
      createdKeys.push(key);
      return key;
    }

    beforeAll(() => {
      pool = new pg.Pool({ connectionString: DATABASE_URL, max: 8, ssl: false, connectionTimeoutMillis: 5000 });
      pool.on('error', (err) => console.error('[pending-match-idempotency-live] idle client error:', err.message));
    });

    afterAll(async () => {
      if (createdKeys.length > 0) {
        await pool.query('DELETE FROM idempotency_keys WHERE key = ANY($1)', [createdKeys]).catch(() => undefined);
      }
      await pool.end();
    });

    it('PENDING_MATCH_IDEMPOTENCY_TTL_SECONDS is weeks-scale and strictly exceeds the 300s day-N default', () => {
      // The literal precondition every assertion below depends on. If a future edit collapses the two
      // constants back to the same value, this line goes red before anything more subtle does.
      expect(PENDING_MATCH_IDEMPOTENCY_TTL_SECONDS).toBeGreaterThan(DEFAULT_MEMBER_IDEMPOTENCY_TTL_SECONDS);
      expect(PENDING_MATCH_IDEMPOTENCY_TTL_SECONDS).toBeGreaterThanOrEqual(7 * 24 * 60 * 60);
    });

    it('tick 1 claims + records; tick 2 (simulated hours later) still sees "already sent" — never a re-nudge', async () => {
      // Inject a clock so "tick 2" can be simulated deterministically, well past the 300s default TTL,
      // without a real multi-hour sleep.
      let now = new Date('2020-01-01T00:00:00.000Z');
      const store = idempotency.createKeyedStore(pool, { clock: () => now });
      const key = track(`contribution.notify:${randomUUID()}:${randomUUID()}:pending_match`);

      // Tick 1 — the sweep's first hourly pass: claim, deliver, record.
      expect(await store.claim(key, PENDING_MATCH_IDEMPOTENCY_TTL_SECONDS)).toBe('acquired');
      await store.recordResult(key, { delivered: true, deliveredChannel: 'push' });

      // Advance the clock past the point where the SHORT (300s) default TTL would already have lapsed —
      // exactly the gap the Dev Notes warn about ("re-nudging the member every hour").
      now = new Date(now.getTime() + (DEFAULT_MEMBER_IDEMPOTENCY_TTL_SECONDS + 60) * 1000);

      // Tick 2 — the NEXT hourly sweep re-submits the SAME member for the SAME tier (the sweep does not
      // itself track who it already sent to; the claim is the only guard).
      expect(await store.claim(key, PENDING_MATCH_IDEMPOTENCY_TTL_SECONDS)).toBe('already_claimed');
      expect(await store.getResult(key)).toEqual({ delivered: true, deliveredChannel: 'push' });
    });

    it('CONTRAST: the same gap against the SHORT 300s TTL — vacuumed, then a THIRD tick genuinely RE-SENDS (why the long TTL is load-bearing)', async () => {
      // No injected clock here: `purgeExpiredKeys` compares against the DB's real `now()`, so the elapsed
      // 300s is simulated by moving `expires_at` directly (the same technique the vacuum test below uses)
      // rather than via a clock the vacuum query does not read.
      const store = idempotency.createKeyedStore(pool);
      const key = track(`contribution.notify:${randomUUID()}:${randomUUID()}:short-ttl-contrast`);

      // Tick 1: claim + record, with the SHORT (300s) default TTL.
      expect(await store.claim(key, DEFAULT_MEMBER_IDEMPOTENCY_TTL_SECONDS)).toBe('acquired');
      await store.recordResult(key, { delivered: true });

      // Simulate the 300s having elapsed.
      await pool.query(`UPDATE idempotency_keys SET expires_at = now() - interval '1 second' WHERE key = $1`, [key]);

      // Tick 2 (before the vacuum runs): claim() still returns 'already_claimed' — a completed row is
      // NEVER reclaimed by `claim` itself (only a still-PENDING expired row is); the once-ever guard
      // does NOT break the instant the TTL lapses.
      expect(await store.claim(key, DEFAULT_MEMBER_IDEMPOTENCY_TTL_SECONDS)).toBe('already_claimed');
      // But the result already reads back as GONE (AC-2 of the 1.12 keyed store is expiry-gated) — the
      // "forgot it already sent" symptom starts here, before the row is even deleted.
      expect(await store.getResult(key)).toBeNull();

      // The hourly vacuum then deletes the lapsed row outright, `status` notwithstanding.
      await idempotency.purgeExpiredKeys(pool);

      // Tick 3: with the row gone, claim() has nothing to conflict with — a FRESH insert succeeds, and
      // the sweep would genuinely RE-SEND the member. This is exactly the "re-nudging every hour" failure
      // AC3's Dev Notes name; PENDING_MATCH_IDEMPOTENCY_TTL_SECONDS (weeks-scale) is what keeps the row —
      // and therefore the once-ever guarantee — alive long enough for the ~20-day reconciliation window.
      expect(await store.claim(key, DEFAULT_MEMBER_IDEMPOTENCY_TTL_SECONDS)).toBe('acquired');
    });

    it('the vacuum leaves a long-TTL pending-match row intact while it deletes an expired short-TTL row', async () => {
      // The REAL clock here (no injection) — `purgeExpiredKeys` compares against the DB's own `now()`
      // (architecture note in keyed-store.ts), so this test simulates elapsed time by moving `expires_at`
      // directly, exactly as it would read once real wall-clock time had actually passed.
      const store = idempotency.createKeyedStore(pool);
      const longKey = track(`contribution.notify:${randomUUID()}:${randomUUID()}:pending_match_escalated`);
      const shortKey = track(`contribution.notify:${randomUUID()}:${randomUUID()}:vacuum-contrast`);

      await store.claim(longKey, PENDING_MATCH_IDEMPOTENCY_TTL_SECONDS);
      await store.recordResult(longKey, { delivered: true });
      await store.claim(shortKey, DEFAULT_MEMBER_IDEMPOTENCY_TTL_SECONDS);
      await store.recordResult(shortKey, { delivered: true });

      // Simulate the short-TTL key's 300s having elapsed (the day-N reminder's real-world timing) while
      // the long-TTL key's real `expires_at` (~30 days out) is untouched — the exact contrast AC3 depends on.
      await pool.query(`UPDATE idempotency_keys SET expires_at = now() - interval '1 second' WHERE key = $1`, [
        shortKey,
      ]);

      await idempotency.purgeExpiredKeys(pool);

      const { rows } = await pool.query<{ key: string }>(
        'SELECT key FROM idempotency_keys WHERE key = ANY($1)',
        [[longKey, shortKey]],
      );
      const remaining = rows.map((r) => r.key);
      expect(remaining).toContain(longKey);
      expect(remaining).not.toContain(shortKey);
    });
  },
);
