// The claim-correction sweep's and child's CONTROL paths, DB-free (Story 6.19b, fourth-pass review): the keyset
// paging past page 1 + the hard run bound + its probe, the wall-clock budget, the refused EMPTY allowlist, D26's
// `limit + 1` probe, the stale child's own-row expiry (J8), the child's `CorrectionNumberHashUnavailableError` →
// transient, and the sweep job's stated pg-boss expiry. ⭐ The domain is MOCKED at the seams the sweep and the child
// call (`withPariwarScope` runs the callback on a fake client; the claim helpers are spies) — the SQL is the real
// module's, answered by a fake pool keyed on the statement. The live suite covers the same paths against Postgres.

import { beforeEach, describe, expect, it, vi } from 'vitest';

const h = vi.hoisted(() => ({
  withPariwarScope: vi.fn(),
  acquireCorrectionChaseLock: vi.fn(),
  readCorrectionRun: vi.fn(),
  readCorrectionReminder: vi.fn(),
  expireOwnCorrectionReminder: vi.fn(),
  skipCorrectionReminder: vi.fn(),
  beginCorrectionFamilySend: vi.fn(),
}));

vi.mock('@twt/domain', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@twt/domain')>();
  return {
    ...actual,
    withPariwarScope: h.withPariwarScope,
    claim: {
      ...actual.claim,
      acquireCorrectionChaseLock: h.acquireCorrectionChaseLock,
      readCorrectionRun: h.readCorrectionRun,
      readCorrectionReminder: h.readCorrectionReminder,
      expireOwnCorrectionReminder: h.expireOwnCorrectionReminder,
      skipCorrectionReminder: h.skipCorrectionReminder,
      beginCorrectionFamilySend: h.beginCorrectionFamilySend,
    },
  };
});

// Imported AFTER vi.mock so the module wires against the mocked surface above.
import { claim } from '@twt/domain';
import { QUEUE_NAMES, type JobEnvelope } from '@twt/queue';
import type pg from 'pg';

import {
  CLAIM_CORRECTION_TZ,
  CORRECTION_SWEEP_EXPIRE_SECONDS,
  CORRECTION_SWEEP_RETRY,
  ClaimCorrectionTransientError,
  DEFAULT_CORRECTION_SWEEP_BUDGET_MS,
  registerClaimCorrectionReminderWorkers,
  runCorrectionFamilySmsChild,
  runCorrectionReminderSweep,
  type ClaimCorrectionReminderDeps,
  type CorrectionFamilySmsPayload,
} from '../src/scheduler/claim-correction-reminders.js';

const PARIWAR = '11111111-1111-4111-8111-111111111111';
const CLAIM = '22222222-2222-4222-8222-222222222222';
const RUN = '33333333-3333-4333-8333-333333333333';

interface FakeRun {
  readonly run_id: string;
  readonly claim_case_id: string;
  readonly pariwar_id: string;
}

const runs = (n: number): FakeRun[] =>
  Array.from({ length: n }, (_, i) => ({
    run_id: `00000000-0000-4000-8000-${String(i + 1).padStart(12, '0')}`,
    claim_case_id: `aaaaaaaa-0000-4000-8000-${String(i + 1).padStart(12, '0')}`,
    pariwar_id: PARIWAR,
  }));

/** A fake BYPASSRLS pool: the sweep's four raw statements, answered by their text. Records every call. */
function fakePool(open: readonly FakeRun[], markChanged: readonly FakeRun[] = []) {
  const calls: { sql: string; params: readonly unknown[] }[] = [];
  const query = vi.fn((sql: string, params: readonly unknown[] = []) => {
    calls.push({ sql, params });
    if (sql.includes('UPDATE claim_correction_reminders')) return Promise.resolve({ rows: [] });
    if (sql.includes('count(*)::int AS n')) return Promise.resolve({ rows: [{ n: 0 }] });
    if (sql.includes("end_reason = 'mark_changed'")) {
      return Promise.resolve({ rows: markChanged.slice(0, params[1] as number) });
    }
    if (sql.includes('FROM claim_correction_runs r')) {
      // The keyset: the page after the cursor RUN ID (the server compares its `opened_at`; here the array order is it).
      const after = params[0] as string | null;
      const size = params[1] as number;
      const from = after === null ? 0 : open.findIndex((r) => r.run_id === after) + 1;
      return Promise.resolve({ rows: open.slice(from, from + size) });
    }
    return Promise.reject(new Error(`unexpected statement: ${sql}`));
  });
  return { pool: { query } as unknown as pg.Pool, calls, query };
}

function deps(pool: pg.Pool, overrides: Partial<ClaimCorrectionReminderDeps> = {}) {
  const alarms: string[] = [];
  const d: ClaimCorrectionReminderDeps = {
    pool,
    encryption: {} as never,
    smsAppClient: {
      isConfigured: () => true,
      messaging: () => {
        throw new Error('the gateway must not be reached on these paths');
      },
    },
    resolveConfig: () => Promise.reject(new Error('config must not be read on these paths')),
    push: { audit: () => Promise.resolve(), hashRendered: () => Promise.resolve('a'.repeat(64)) },
    now: () => new Date('2026-10-05T04:30:00.000Z'), // 10:00 IST
    onAlarm: (m) => alarms.push(m),
    ...overrides,
  };
  return { deps: d, alarms };
}

const boss = { send: vi.fn(() => Promise.resolve('job')) } as unknown as Parameters<typeof runCorrectionReminderSweep>[1];

/** The claim ids planRun locked — ONE per run planned (the D26 marker path takes ⛔ no lock). */
const planned = (): string[] => h.acquireCorrectionChaseLock.mock.calls.map((c) => c[2] as string);

beforeEach(() => {
  vi.clearAllMocks();
  h.withPariwarScope.mockImplementation((_pool: unknown, _pid: string, fn: (db: unknown, client: unknown) => unknown) =>
    Promise.resolve(fn({}, { query: () => Promise.resolve({ rows: [] }) })),
  );
  h.acquireCorrectionChaseLock.mockResolvedValue(undefined);
  h.readCorrectionRun.mockResolvedValue(null); // ⇒ planRun returns idle after the lock
});

describe('the sweep — keyset paging, the hard bound, the budget', () => {
  it('⭐ runLimit 2, maxRuns 3, FIVE open runs: the first three planned ONCE each, the bound ALARMED (probe)', async () => {
    const open = runs(5);
    const { pool, calls } = fakePool(open);
    const { deps: d, alarms } = deps(pool, { runLimit: 2, maxRuns: 3 });
    const result = await runCorrectionReminderSweep(d, boss);
    expect(result.scannedRuns).toBe(3);
    expect(planned()).toEqual(open.slice(0, 3).map((r) => r.claim_case_id));
    const pages = calls.filter((c) => c.sql.includes('FROM claim_correction_runs r'));
    // Page 1 (no cursor, 2), page 2 (after run 2, the 1 left under the bound), then the 1-row probe after run 3.
    expect(pages.map((c) => [c.params[0], c.params[1]])).toEqual([
      [null, 2],
      [open[1]!.run_id, 1],
      [open[2]!.run_id, 1],
    ]);
    expect(alarms.filter((a) => a.includes('hard bound of 3'))).toHaveLength(1);
  });

  it('⭐ runLimit 2, ample bound: EVERY run planned exactly once across pages, ⛔ no alarm', async () => {
    const open = runs(5);
    const { pool } = fakePool(open);
    const { deps: d, alarms } = deps(pool, { runLimit: 2, maxRuns: 100 });
    expect((await runCorrectionReminderSweep(d, boss)).scannedRuns).toBe(5);
    expect(planned()).toEqual(open.map((r) => r.claim_case_id));
    expect(alarms).toEqual([]);
  });

  it('⭐ the keyset cursor is compared SERVER-SIDE — ⛔ no `opened_at::text` round-trip', async () => {
    const { pool, calls } = fakePool(runs(3));
    await runCorrectionReminderSweep(deps(pool, { runLimit: 2 }).deps, boss);
    const page = calls.find((c) => c.sql.includes('FROM claim_correction_runs r'))!.sql;
    expect(page).not.toContain('::text');
    expect(page).toContain('(SELECT c.opened_at, c.run_id FROM claim_correction_runs c WHERE c.run_id = $1::uuid)');
  });

  it('⭐ the WALL-CLOCK budget stops paging between runs and ALARMS (⛔ the bound probe then)', async () => {
    const open = runs(5);
    const { pool, calls } = fakePool(open);
    let t = 0;
    const { deps: d, alarms } = deps(pool, {
      runLimit: 2,
      maxRuns: 100,
      sweepBudgetMs: 25,
      elapsedClockMs: () => (t += 10), // start = 10; the checks see 10, 20, 30 ms elapsed
    });
    const result = await runCorrectionReminderSweep(d, boss);
    expect(result).toMatchObject({ scannedRuns: 2, budgetExhausted: true });
    expect(planned()).toEqual(open.slice(0, 2).map((r) => r.claim_case_id));
    expect(alarms.filter((a) => a.includes('budget'))).toHaveLength(1);
    expect(alarms.some((a) => a.includes('hard bound'))).toBe(false);
    // ⛔ No probe page after a budget stop (page 1, then page 2 whose first run tripped the budget).
    expect(calls.filter((c) => c.sql.includes('FROM claim_correction_runs r'))).toHaveLength(2);
  });

  it('the default budget sits UNDER the job\'s pg-boss expiry (a long tick is ⛔ never expired while it runs)', () => {
    expect(DEFAULT_CORRECTION_SWEEP_BUDGET_MS).toBeLessThan(CORRECTION_SWEEP_EXPIRE_SECONDS * 1000);
    expect(CORRECTION_SWEEP_EXPIRE_SECONDS).toBeGreaterThan(15 * 60); // ⛔ pg-boss's 15-minute default
    expect(CORRECTION_SWEEP_EXPIRE_SECONDS).toBeLessThan(24 * 60 * 60); // pg-boss refuses ≥ 24 h
  });

  it('⛔ an EMPTY `pariwarAllowlist` is REFUSED — ⛔ no statement runs, and it alarms', async () => {
    const { pool, query } = fakePool(runs(2));
    const { deps: d, alarms } = deps(pool, { pariwarAllowlist: [] });
    expect(await runCorrectionReminderSweep(d, boss)).toMatchObject({ scannedRuns: 0, finalisedStuck: 0 });
    expect(query).not.toHaveBeenCalled();
    expect(alarms).toEqual([expect.stringContaining('REFUSED')]);
  });
});

describe('the sweep — D26\'s marker scan probe (`LIMIT limit + 1`)', () => {
  it('exactly `limit` mark-changed runs ⇒ all processed, ⛔ no alarm', async () => {
    const { pool, calls } = fakePool([], runs(2));
    const { deps: d, alarms } = deps(pool, { runLimit: 2 });
    await runCorrectionReminderSweep(d, boss);
    expect(calls.find((c) => c.sql.includes("end_reason = 'mark_changed'"))!.params[1]).toBe(3);
    expect(h.readCorrectionRun).toHaveBeenCalledTimes(2);
    expect(alarms.some((a) => a.includes('D26'))).toBe(false);
  });

  it('`limit + 1` ⇒ only `limit` processed (the extra row is a probe) and the cap ALARMED', async () => {
    const { pool } = fakePool([], runs(3));
    const { deps: d, alarms } = deps(pool, { runLimit: 2 });
    await runCorrectionReminderSweep(d, boss);
    expect(h.readCorrectionRun).toHaveBeenCalledTimes(2);
    expect(alarms.filter((a) => a.includes('D26 marker scan hit'))).toHaveLength(1);
  });
});

describe('the child — the stale path (J8) and the re-check\'s hash failure', () => {
  const envelope = (sentOn: string): JobEnvelope<CorrectionFamilySmsPayload> => ({
    pariwarId: PARIWAR,
    requestId: 'r',
    actorId: null,
    traceId: 't',
    payload: { runId: RUN, claimCaseId: CLAIM, slotDay: 4, personKey: 'nominee:1', sentOn, late: false },
  });

  it('⭐ J8 — THIS job\'s own `attempting` row from an earlier IST day ⇒ expired `error` (exhausted:crossed_midnight) + alarm, ⛔ never `skipped_superseded`, ⛔ no send', async () => {
    h.readCorrectionReminder.mockResolvedValue({ reminderId: 'rem-1', outcome: 'attempting', claimedByJob: 'job-1' });
    h.expireOwnCorrectionReminder.mockResolvedValue(true);
    const { deps: d, alarms } = deps(fakePool([]).pool);
    expect(await runCorrectionFamilySmsChild(d, envelope('2026-10-04'), 'job-1')).toEqual({ status: 'skipped', reason: 'stale_slot' });
    expect(h.expireOwnCorrectionReminder).toHaveBeenCalledWith(expect.anything(), {
      pariwarId: PARIWAR,
      reminderId: 'rem-1',
      jobId: 'job-1',
      detail: 'exhausted:crossed_midnight',
    });
    expect(h.skipCorrectionReminder).not.toHaveBeenCalled();
    expect(h.beginCorrectionFamilySend).not.toHaveBeenCalled();
    expect(alarms).toEqual([expect.stringContaining('exhausted:crossed_midnight')]);
    expect(alarms[0]).toContain(RUN);
  });

  it('a stale child whose slot row is ANOTHER job\'s (or none) touches ⛔ nothing and ⛔ never alarms', async () => {
    const { deps: d, alarms } = deps(fakePool([]).pool);
    h.readCorrectionReminder.mockResolvedValueOnce({ reminderId: 'rem-1', outcome: 'attempting', claimedByJob: 'job-2' });
    expect(await runCorrectionFamilySmsChild(d, envelope('2026-10-04'), 'job-1')).toEqual({ status: 'skipped', reason: 'stale_slot' });
    h.readCorrectionReminder.mockResolvedValueOnce(null);
    expect(await runCorrectionFamilySmsChild(d, envelope('2026-10-04'), 'job-1')).toEqual({ status: 'skipped', reason: 'stale_slot' });
    expect(h.expireOwnCorrectionReminder).not.toHaveBeenCalled();
    expect(h.skipCorrectionReminder).not.toHaveBeenCalled();
    expect(alarms).toEqual([]);
  });

  it('⭐ the re-check could ⛔ not hash the current number (`CorrectionNumberHashUnavailableError`) ⇒ TRANSIENT + alarm, ⛔ no send', async () => {
    h.beginCorrectionFamilySend.mockRejectedValue(new claim.CorrectionNumberHashUnavailableError(CLAIM, RUN));
    const { deps: d, alarms } = deps(fakePool([]).pool);
    await expect(runCorrectionFamilySmsChild(d, envelope('2026-10-05'), 'job-1')).rejects.toBeInstanceOf(
      ClaimCorrectionTransientError,
    );
    expect(alarms).toEqual([expect.stringContaining('could not be hashed')]);
    // The begin ran ONCE (one scope tx), and ⛔ nothing after it did.
    expect(h.withPariwarScope).toHaveBeenCalledTimes(1);
  });

  it('any OTHER begin failure propagates as-is (⛔ never relabelled transient)', async () => {
    const boom = new Error('db down');
    h.beginCorrectionFamilySend.mockRejectedValue(boom);
    const { deps: d, alarms } = deps(fakePool([]).pool);
    await expect(runCorrectionFamilySmsChild(d, envelope('2026-10-05'), 'job-1')).rejects.toBe(boom);
    expect(alarms).toEqual([]);
  });
});

describe('registration — the sweep job\'s stated pg-boss options', () => {
  it('⭐ the sweep queue AND its schedule carry the explicit expiry (the schedule\'s options reach an existing queue)', async () => {
    const createQueue = vi.fn(() => Promise.resolve());
    const schedule = vi.fn(() => Promise.resolve());
    const fakeBoss = { createQueue, schedule, work: vi.fn(() => Promise.resolve('w')) };
    await registerClaimCorrectionReminderWorkers(fakeBoss as never, deps(fakePool([]).pool).deps);
    expect(createQueue).toHaveBeenCalledWith(QUEUE_NAMES.CLAIM_CORRECTION_REMINDER_SWEEP, {
      expireInSeconds: CORRECTION_SWEEP_EXPIRE_SECONDS,
    });
    expect(schedule).toHaveBeenCalledWith(QUEUE_NAMES.CLAIM_CORRECTION_REMINDER_SWEEP, expect.any(String), {}, {
      tz: CLAIM_CORRECTION_TZ,
      ...CORRECTION_SWEEP_RETRY,
      expireInSeconds: CORRECTION_SWEEP_EXPIRE_SECONDS,
    });
  });
});
