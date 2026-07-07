// SMS rate-bucket live-DB integration tests — Story 5.6 (Task 5/7; Story 1.14).
//
// Proves the atomic INSERT ... ON CONFLICT DO UPDATE bucket counter AGAINST A REAL POSTGRES — the
// concurrency + window-rotation mechanics cannot be exercised by mocks.
//
// ⚠ Own-committing, per-member isolated (mirrors idempotency/keyed-store.spec.ts +
// [[project_live_db_test_gotchas]]): concurrent increments need REAL concurrent statements on separate pool
// clients, and checkAndConsumeSmsBudget commits its own writes. Each test uses a UNIQUE random member_key so
// its counts are deterministic and isolated from rows other suites accumulate in the shared live DB —
// assertions key on OUR member_key's behavior, never on absolute table counts. Cleanup deletes our keys.

import { randomUUID } from 'node:crypto';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { createDb, type CreatedDb } from '../../../src/db.js';
import {
  checkAndConsumeSmsBudget,
  deleteExpiredSmsRateBuckets,
} from '../../../src/sms-rate-limit/index.js';

const DATABASE_URL = process.env['DATABASE_URL'];
const hasDatabase = Boolean(DATABASE_URL);

const WINDOW_MS = 15 * 60 * 1000;
const MAX_PER_WINDOW = 3;

describe.skipIf(!hasDatabase)('sms_rate_buckets (live DB, own-committing)', () => {
  let created: CreatedDb;
  const createdKeys: string[] = [];

  function trackKey(): string {
    const key = `test:sms-bucket:${randomUUID()}`;
    createdKeys.push(key);
    return key;
  }

  beforeAll(() => {
    created = createDb(DATABASE_URL!, { max: 12, logger: false });
    created.pool.on('error', (err) => console.error('[sms-rate-buckets.spec] idle client error:', err.message));
  });

  afterAll(async () => {
    if (createdKeys.length > 0) {
      await created.pool
        .query('DELETE FROM sms_rate_buckets WHERE member_key = ANY($1)', [createdKeys])
        .catch(() => undefined);
    }
    await created.pool.end();
  });

  it('sequential sends increment the member bucket and flip allowed at the ceiling', async () => {
    const memberKey = trackKey();
    const now = new Date('2026-07-06T10:00:00.000Z');

    const decisions = [];
    for (let i = 0; i < MAX_PER_WINDOW + 2; i++) {
      decisions.push(
        await checkAndConsumeSmsBudget(created.db, { memberKey, windowMs: WINDOW_MS, maxPerWindow: MAX_PER_WINDOW, now }),
      );
    }

    // Post-increment counts are 1,2,3,4,5; allowed = count <= 3.
    expect(decisions.map((d) => d.count)).toEqual([1, 2, 3, 4, 5]);
    expect(decisions.map((d) => d.allowed)).toEqual([true, true, true, false, false]);
  });

  it('N concurrent sends → exactly MAX_PER_WINDOW allowed, each count observed exactly once', async () => {
    const memberKey = trackKey();
    const now = new Date('2026-07-06T11:00:00.000Z');
    const N = 8;

    const decisions = await Promise.all(
      Array.from({ length: N }, () =>
        checkAndConsumeSmsBudget(created.db, { memberKey, windowMs: WINDOW_MS, maxPerWindow: MAX_PER_WINDOW, now }),
      ),
    );

    // The atomic increment hands out each count 1..N exactly once (no lost updates under concurrency).
    expect([...decisions.map((d) => d.count)].sort((a, b) => a - b)).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
    // Exactly the first MAX_PER_WINDOW sends are within budget.
    expect(decisions.filter((d) => d.allowed)).toHaveLength(MAX_PER_WINDOW);
  });

  it('a send in a later window rotates to a fresh bucket (independent budget)', async () => {
    const memberKey = trackKey();
    const first = new Date('2026-07-06T12:00:00.000Z');
    const later = new Date('2026-07-06T13:00:00.000Z'); // > WINDOW_MS later → a different bucket epoch

    const a = await checkAndConsumeSmsBudget(created.db, { memberKey, windowMs: WINDOW_MS, maxPerWindow: MAX_PER_WINDOW, now: first });
    const b = await checkAndConsumeSmsBudget(created.db, { memberKey, windowMs: WINDOW_MS, maxPerWindow: MAX_PER_WINDOW, now: later });

    expect(a.bucketEpoch).not.toBe(b.bucketEpoch);
    // Each window starts its own count at 1 — a full earlier window never bleeds into the next.
    expect(a.count).toBe(1);
    expect(b.count).toBe(1);
    expect(b.allowed).toBe(true);
  });

  it('deleteExpiredSmsRateBuckets vacuums rows whose window has fully expired', async () => {
    const memberKey = trackKey();
    const now = new Date('2026-07-06T09:00:00.000Z');
    await checkAndConsumeSmsBudget(created.db, { memberKey, windowMs: WINDOW_MS, maxPerWindow: MAX_PER_WINDOW, now });

    // expires_at is set to (bucket + 2) * windowMs; a cutoff far in the future covers it.
    const farFuture = new Date('2026-07-07T00:00:00.000Z');
    const removed = await deleteExpiredSmsRateBuckets(created.db, farFuture);
    expect(removed).toBeGreaterThanOrEqual(1);

    // Our key's row is gone → the next send starts a fresh count of 1.
    const after = await checkAndConsumeSmsBudget(created.db, { memberKey, windowMs: WINDOW_MS, maxPerWindow: MAX_PER_WINDOW, now });
    expect(after.count).toBe(1);
  });
});
