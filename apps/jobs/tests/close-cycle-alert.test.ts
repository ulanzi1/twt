// Close-of-cycle sweep — the DB-free half (Story 8.14, Tasks 3/6; AC2, AC3, AC5).
//
// The live-DB gate (`close-cycle-alert-live.test.ts`) proves the real path closes a real cycle. This
// suite drives the sweep against a FAKE pool (the `cycle-open-alert.ts` "drive it in isolation"
// contract) to pin the things a happy-path E2E cannot show:
//   · the batch bound is real, a misconfigured bound is clamped, and a full batch ALARMS rather than
//     silently capping (AC2);
//   · the scan is PREFILTERED by `now − CYCLE_WINDOW_DAYS` — from the ONE `@twt/contracts` constant,
//     bound as a parameter, never a second hardcoded 15 in SQL (AC3);
//   · a candidate with an unreadable `cycle.frozen` anchor is REFUSED and alarmed, never closed on a
//     guess (D3);
//   · the sweep is calendar-BLIND: the Story 8.9 reconciliation tail never touches the close instant
//     (AC5 — re-opening that would undo the exact rescope 8.9 ratified shut).

import { CYCLE_WINDOW_DAYS } from '@twt/contracts';
import { QUEUE_NAMES, type Job, type QueueClient } from '@twt/queue';
import type pg from 'pg';
import { describe, expect, it, vi } from 'vitest';

import {
  DEFAULT_CLOSE_CYCLE_ALERT_SWEEP_CRON,
  DEFAULT_CLOSE_CYCLE_ALERT_SWEEP_LIMIT,
  CLOSE_CYCLE_ALERT_SWEEP_TZ,
  registerCloseCycleAlertWorkers,
  runCloseCycleAlertSweep,
} from '../src/scheduler/close-cycle-alert.js';

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const NOW = new Date('2026-08-08T12:00:00Z');

interface Captured {
  readonly sql: string;
  readonly params: readonly unknown[];
}

/** A pool double that records the scan query and returns a fixed candidate set. `connect()` is never
 *  reached in these cases (every candidate is filtered out before a tenant transaction opens), so it
 *  throws loudly rather than returning a silent stub that would hide a real write attempt. */
function fakePool(rows: Record<string, unknown>[], captured: Captured[]): pg.Pool {
  return {
    query: (sql: string, params: unknown[]) => {
      captured.push({ sql, params });
      return Promise.resolve({ rows });
    },
    connect: () => {
      throw new Error('[test] the sweep opened a tenant transaction for a candidate it should have skipped');
    },
  } as unknown as pg.Pool;
}

function candidate(committedAt: string | null): Record<string, unknown> {
  return {
    alert_id: '11111111-1111-1111-1111-111111111111',
    cycle_id: '22222222-2222-2222-2222-222222222222',
    pariwar_id: '33333333-3333-3333-3333-333333333333',
    committed_at: committedAt,
  };
}

describe('runCloseCycleAlertSweep — bounding, prefilter and anchor refusal (no DB)', () => {
  it('AC3: the scan is prefiltered by `now − CYCLE_WINDOW_DAYS`, bound as a PARAMETER', async () => {
    const captured: Captured[] = [];
    await runCloseCycleAlertSweep({ pool: fakePool([], captured), now: () => NOW });

    expect(captured).toHaveLength(1);
    const [scan] = captured;
    // The window length reaches SQL as a bound PARAMETER derived from the contracts constant — never
    // an `interval '15 days'` (or any other) literal that could drift from `CYCLE_WINDOW_DAYS`. A
    // structural check on the SQL text (no `interval '...'` literal) rather than a digit-matching regex
    // — the latter would spuriously pass or fail on unrelated tokens (e.g. a future column named
    // `pool_index` containing no "15" at all, or a coincidental "15" elsewhere in the query).
    expect(scan!.sql.toLowerCase()).not.toMatch(/interval\s*'/);
    // The value itself is sourced from CYCLE_WINDOW_DAYS, not a second hardcoded copy.
    expect(scan!.params[0]).toEqual(new Date(NOW.getTime() - CYCLE_WINDOW_DAYS * MS_PER_DAY));
    expect(scan!.params[1]).toBe(DEFAULT_CLOSE_CYCLE_ALERT_SWEEP_LIMIT);
    // The authoritative anchor is read off the cycle.frozen PAYLOAD; the column is only the join/filter.
    expect(scan!.sql).toContain("payload->'attestation'->>'committed_at'");
    expect(scan!.sql).toContain("a.current_state = 'live'");
  });

  it('AC2: a misconfigured sweepLimit is clamped to a sane bound, never passed through raw', async () => {
    for (const bad of [0, -5]) {
      const captured: Captured[] = [];
      await runCloseCycleAlertSweep({ pool: fakePool([], captured), now: () => NOW, sweepLimit: bad });
      expect(captured[0]!.params[1]).toBe(1);
    }
  });

  it('AC2: a FULL batch alarms — the cap is never silent', async () => {
    const alarms: string[] = [];
    const captured: Captured[] = [];
    // One row, limit one ⇒ the batch is full. The row is far from due, so nothing is written.
    const notDueYet = new Date(NOW.getTime() - 1 * MS_PER_DAY).toISOString();
    const result = await runCloseCycleAlertSweep({
      pool: fakePool([candidate(notDueYet)], captured),
      now: () => NOW,
      sweepLimit: 1,
      onAlarm: (m) => alarms.push(m),
    });

    expect(result.scanned).toBe(1);
    expect(result.notDue).toBe(1);
    expect(result.closed).toBe(0);
    expect(alarms.some((m) => m.includes('batch cap'))).toBe(true);
  });

  it('D3: a candidate with an unreadable freeze anchor is REFUSED and alarmed, never closed on a guess', async () => {
    for (const anchor of [null, 'not-a-timestamp']) {
      const alarms: string[] = [];
      const result = await runCloseCycleAlertSweep({
        pool: fakePool([candidate(anchor)], []),
        now: () => NOW,
        onAlarm: (m) => alarms.push(m),
      });
      expect(result.closed).toBe(0);
      expect(result.failed).toBe(1);
      expect(alarms.some((m) => m.includes('unresolvable anchor'))).toBe(true);
    }
  });

  it('AC5: the sweep is calendar-BLIND — no reconciliation-tail resolver touches the close instant', async () => {
    // ⚠ Story 8.9's holiday calendar governs POST-CLOSE reconciliation timing only. Applying
    // `reconciliationTailDeadline` here would extend a member's contribution deadline for a holiday —
    // re-opening the exact rescope 8.9 ratified shut and contradicting FR-22's hard Day-15 close.
    // A candidate exactly one millisecond short of its payload boundary must stay open, with no
    // calendar adjustment available to soften it.
    const committedAt = new Date(NOW.getTime() - CYCLE_WINDOW_DAYS * MS_PER_DAY + 1).toISOString();
    const result = await runCloseCycleAlertSweep({
      pool: fakePool([candidate(committedAt)], []),
      now: () => NOW,
    });
    expect(result.notDue).toBe(1);
    expect(result.closed).toBe(0);
    expect(result.failed).toBe(0);
  });

  it('AC2: the cron is IST and offset from the sibling sweeps', () => {
    expect(CLOSE_CYCLE_ALERT_SWEEP_TZ).toBe('Asia/Kolkata');
    // Hourly — this is the PRODUCER, so the cadence bounds how long a cycle sits `live` past its
    // deadline. A daily cadence here would be a member-facing regression, not a tuning choice.
    expect(DEFAULT_CLOSE_CYCLE_ALERT_SWEEP_CRON).toBe('10 * * * *');
  });
});

describe('registerCloseCycleAlertWorkers — the actual pg-boss wiring (Review Finding)', () => {
  // The story's whole thesis is "an unwired registration function is invisible and never runs" — so
  // this suite exercises `registerCloseCycleAlertWorkers` itself, not just `runCloseCycleAlertSweep`
  // directly. Nothing here proves `boot.ts` calls it; that remains a manual-inspection guarantee.
  function makeFakeBoss(): QueueClient {
    return {
      createQueue: vi.fn().mockResolvedValue(undefined),
      work: vi.fn().mockResolvedValue('sub'),
      schedule: vi.fn().mockResolvedValue(undefined),
    } as unknown as QueueClient;
  }

  it('creates the queue and schedules the sweep cron with the default cron + tz', async () => {
    const boss = makeFakeBoss();

    await registerCloseCycleAlertWorkers(boss, { pool: fakePool([], []) });

    expect(boss.createQueue).toHaveBeenCalledWith(QUEUE_NAMES.CLOSE_CYCLE_ALERT_SWEEP);
    expect(boss.work).toHaveBeenCalledWith(QUEUE_NAMES.CLOSE_CYCLE_ALERT_SWEEP, expect.any(Function));
    expect(boss.schedule).toHaveBeenCalledWith(
      QUEUE_NAMES.CLOSE_CYCLE_ALERT_SWEEP,
      DEFAULT_CLOSE_CYCLE_ALERT_SWEEP_CRON,
      {},
      { tz: CLOSE_CYCLE_ALERT_SWEEP_TZ },
    );
  });

  it('an env-overridden cron/tz reaches `boss.schedule` verbatim — the boot.ts override seam', async () => {
    const boss = makeFakeBoss();

    await registerCloseCycleAlertWorkers(
      boss,
      { pool: fakePool([], []) },
      { sweepCron: '*/5 * * * *', sweepTz: 'UTC' },
    );

    expect(boss.schedule).toHaveBeenCalledWith(
      QUEUE_NAMES.CLOSE_CYCLE_ALERT_SWEEP,
      '*/5 * * * *',
      {},
      { tz: 'UTC' },
    );
  });

  it('the registered worker actually invokes `runCloseCycleAlertSweep` and returns its result', async () => {
    const boss = makeFakeBoss();
    const captured: Captured[] = [];

    await registerCloseCycleAlertWorkers(boss, { pool: fakePool([], captured) });

    // `boss.work`'s second argument is the handler pg-boss invokes per batch — call it directly rather
    // than standing up a real pg-boss instance, the same "drive it in isolation" contract the sibling
    // cycle-open sweep's tests use.
    const handler = (boss.work as ReturnType<typeof vi.fn>).mock.calls[0]![1] as (
      jobs: Job[],
    ) => Promise<unknown>;
    const result = await handler([{ id: 'job-1', data: {} } as Job]);

    // Proves the handler is wired to the REAL sweep, not a stub: the fake pool's scan query ran.
    expect(captured).toHaveLength(1);
    expect(result).toMatchObject({ scanned: 0, closed: 0, notDue: 0, alreadyClosed: 0, failed: 0 });
  });
});
